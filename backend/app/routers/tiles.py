"""
Tile endpoints.

    GET /tiles/manifest.json              layers, render modes, palette
    GET /tiles/{v}/r/{layer}/{z}/{x}/{y}.png   rendered raster tile

The version segment is how cache invalidation works: bump TILE_VERSION and
every URL changes, so nginx, browsers and any CDN miss naturally and old
entries expire on their own. No purge, and rollback is bumping it back.

Vector tiles for the interactive layers are a separate endpoint, not yet built.
"""

import json
import logging
import os

from fastapi import APIRouter, HTTPException, Path as PathParam
from fastapi.responses import JSONResponse, Response
from starlette.concurrency import run_in_threadpool

from app.database import database
from app.services.tile_renderer import (
    TILE_PX,
    cycle_palette,
    empty_tile,
    pixel_size_metres,
    render_tile,
    tile_bounds_3857,
    tile_is_in_range,
    EDGE_MARGIN_PX,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tiles", tags=["Tiles"])

# Bump to invalidate every cached tile. Set TILE_VERSION in the environment so
# a data change does not need a code change.
TILE_VERSION = os.getenv("TILE_VERSION", "1")

# Attributes a raster tile is allowed to read. Everything else stays in the
# database -- the tile only needs what the styling uses.
STYLE_ATTRIBUTES = ("CYCLE",)

MIN_ZOOM = 5
MAX_ZOOM = 16

CACHE_FOREVER = "public, max-age=31536000, immutable"


async def _raster_layers() -> dict:
    """Layers that may be rendered, keyed by name. Small table, PK lookup."""
    rows = await database.fetch_all(
        """
        SELECT layer_name, display_name, geometry_type, render_mode
        FROM feature_layers
        WHERE include_in_tiles AND render_mode = 'raster'
        """
    )
    return {row["layer_name"]: dict(row) for row in rows}


@router.get("/manifest.json", summary="Layers, render modes, and palette")
async def manifest():
    """
    What the frontend should read at startup instead of hardcoding its layer
    list. Adding or reclassifying a layer then needs no frontend deploy.
    """
    rows = await database.fetch_all(
        """
        SELECT layer_name, display_name, geometry_type, render_mode
        FROM feature_layers
        WHERE include_in_tiles
        ORDER BY render_mode, layer_name
        """
    )
    layers = [
        {
            "name": row["layer_name"],
            "display_name": row["display_name"],
            "geometry_type": row["geometry_type"],
            "render_mode": row["render_mode"],
            "minzoom": MIN_ZOOM,
            "maxzoom": MAX_ZOOM,
            "tiles": (
                [f"/api/v1/tiles/{TILE_VERSION}/r/{row['layer_name']}/{{z}}/{{x}}/{{y}}.png"]
                if row["render_mode"] == "raster"
                else None
            ),
        }
        for row in rows
    ]
    return JSONResponse(
        {
            "version": TILE_VERSION,
            "tileSize": TILE_PX,
            "layers": layers,
            "palette": cycle_palette(),
        },
        headers={"Cache-Control": "public, max-age=300"},
    )


async def _fetch_geometry_column(table_name: str) -> str:
    row = await database.fetch_one(
        """
        SELECT f_geometry_column
        FROM geometry_columns
        WHERE f_table_schema = 'public' AND f_table_name = :table_name
        LIMIT 1
        """,
        values={"table_name": table_name},
    )
    return row["f_geometry_column"] if row else "geometry"


@router.get(
    "/{version}/r/{layer}/{z}/{x}/{y}.png",
    summary="Rendered raster tile",
    response_description="PNG tile",
)
async def raster_tile(
    version: str,
    layer: str,
    z: int = PathParam(..., ge=0, le=22),
    x: int = PathParam(..., ge=0),
    y: int = PathParam(..., ge=0),
):
    """
    Draw one tile of a raster layer.

    The response carries only pixels: no coordinates reach the client.
    """
    layers = await _raster_layers()
    if layer not in layers:
        # Also the allowlist: only layers registered as raster are renderable.
        raise HTTPException(status_code=404, detail=f"No raster layer '{layer}'")

    if not tile_is_in_range(z, x, y):
        raise HTTPException(status_code=404, detail="Tile out of range for this zoom")

    if z < MIN_ZOOM or z > MAX_ZOOM:
        raise HTTPException(
            status_code=404,
            detail=f"Zoom {z} outside rendered range {MIN_ZOOM}-{MAX_ZOOM}",
        )

    geometry_column = await _fetch_geometry_column(layer)
    minx, miny, maxx, maxy = tile_bounds_3857(z, x, y)
    tolerance = pixel_size_metres(z)
    margin = tolerance * EDGE_MARGIN_PX

    attribute_sql = "".join(f', t."{name}"' for name in STYLE_ATTRIBUTES)

    # Geometry is simplified to one pixel before it leaves Postgres: sub-pixel
    # detail cannot be drawn, and at low zoom this cuts the payload sharply.
    # The tile envelope is compared in 4326 so the existing GIST index is used.
    query = f"""
        WITH env AS (
            SELECT ST_MakeEnvelope(:minx, :miny, :maxx, :maxy, 3857) AS g3857
        ),
        env4326 AS (
            SELECT g3857, ST_Transform(g3857, 4326) AS g4326 FROM env
        )
        SELECT
            ST_AsGeoJSON(
                ST_SimplifyPreserveTopology(
                    ST_Transform(t."{geometry_column}", 3857),
                    :tolerance
                ),
                1
            ) AS geometry{attribute_sql}
        FROM "{layer}" t, env4326 e
        WHERE t."{geometry_column}" && e.g4326
    """

    try:
        rows = await database.fetch_all(
            query,
            values={
                "minx": minx - margin,
                "miny": miny - margin,
                "maxx": maxx + margin,
                "maxy": maxy + margin,
                "tolerance": tolerance,
            },
        )
    except Exception as exc:
        logger.exception("Tile query failed for %s/%s/%s/%s", layer, z, x, y)
        raise HTTPException(status_code=500, detail=f"Tile query failed: {exc}")

    if not rows:
        return Response(
            content=empty_tile(),
            media_type="image/png",
            headers={"Cache-Control": CACHE_FOREVER},
        )

    features = []
    for row in rows:
        raw = row["geometry"]
        if not raw:
            continue
        mapping = dict(row)
        mapping.pop("geometry", None)
        features.append({"geometry": json.loads(raw), "properties": mapping})

    # Drawing is CPU-bound; keep it off the event loop or one tile request
    # stalls every other request on this worker.
    png = await run_in_threadpool(render_tile, features, layer, z, x, y)

    return Response(
        content=png,
        media_type="image/png",
        headers={"Cache-Control": CACHE_FOREVER},
    )


__all__ = ["router"]
