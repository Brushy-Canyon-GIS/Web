"""
Raster tile rendering for the geological mapping layers.

Layers whose feature_layers.render_mode is 'raster' are drawn here and served
as PNG. The browser receives pixels, never coordinates, so the mapping cannot
be reassembled from the tiles. Visual fidelity is unaffected -- tiles are drawn
from the same full-precision geometry the database holds.

The styling reproduces what the frontend does today:

    polygons   fill from the cycle palette at 0.6 opacity
    faults     #B22222 at 2px
    other lines cycle colour at 3px
    points     6px circle, cycle colour, 2px white halo
    unmatched  #CCCCCC

cartography/fan_geology_colors.json is a copy of frontend/src/fanGeology.json.
The manifest endpoint serves it so the frontend can eventually read the palette
from here instead, leaving one source of truth.
"""

from __future__ import annotations

import io
import json
import math
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Iterable, List, Sequence, Tuple

from PIL import Image, ImageDraw

# Tile pixel size. Declared in the manifest as tileSize so the client matches.
TILE_PX = 512

# Web Mercator half-circumference, in metres.
ORIGIN_SHIFT = 20037508.342789244

# Styling, mirroring Map.tsx.
FALLBACK_COLOR = "#CCCCCC"
FILL_OPACITY = 0.6
FAULT_COLOR = "#B22222"
FAULT_WIDTH = 2
LINE_WIDTH = 3
POINT_RADIUS = 6
POINT_HALO_WIDTH = 2
POINT_HALO_COLOR = "#FFFFFF"

# Drawn features may extend past the tile edge; query a margin so strokes and
# markers near the boundary are not clipped away before they are drawn.
EDGE_MARGIN_PX = 16

_PALETTE_PATH = Path(__file__).resolve().parent.parent / "cartography" / "fan_geology_colors.json"


@lru_cache(maxsize=1)
def cycle_palette() -> Dict[str, str]:
    """Cycle -> hex colour, as the frontend uses."""
    with _PALETTE_PATH.open() as fh:
        return json.load(fh)


def tile_bounds_3857(z: int, x: int, y: int) -> Tuple[float, float, float, float]:
    """(minx, miny, maxx, maxy) of an XYZ tile, in Web Mercator metres."""
    span = (ORIGIN_SHIFT * 2) / (2 ** z)
    minx = -ORIGIN_SHIFT + x * span
    maxy = ORIGIN_SHIFT - y * span
    return minx, maxy - span, minx + span, maxy


def tile_is_in_range(z: int, x: int, y: int) -> bool:
    """XYZ coordinates that actually exist at this zoom."""
    if z < 0 or z > 22:
        return False
    limit = 2 ** z
    return 0 <= x < limit and 0 <= y < limit


def pixel_size_metres(z: int) -> float:
    """Ground size of one tile pixel, used as the simplification tolerance."""
    return ((ORIGIN_SHIFT * 2) / (2 ** z)) / TILE_PX


def _hex_to_rgb(value: str) -> Tuple[int, int, int]:
    value = (value or "").lstrip("#")
    if len(value) == 3:
        value = "".join(c * 2 for c in value)
    if len(value) != 6:
        return _hex_to_rgb(FALLBACK_COLOR)
    try:
        return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)
    except ValueError:
        return _hex_to_rgb(FALLBACK_COLOR)


def _feature_color(properties: Dict[str, Any]) -> Tuple[int, int, int]:
    cycle = properties.get("CYCLE")
    if cycle is None:
        return _hex_to_rgb(FALLBACK_COLOR)
    return _hex_to_rgb(cycle_palette().get(str(cycle), FALLBACK_COLOR))


class _Projector:
    """Web Mercator metres -> tile pixel coordinates."""

    __slots__ = ("minx", "maxy", "scale")

    def __init__(self, z: int, x: int, y: int):
        minx, _miny, _maxx, maxy = tile_bounds_3857(z, x, y)
        span = (ORIGIN_SHIFT * 2) / (2 ** z)
        self.minx = minx
        self.maxy = maxy
        self.scale = TILE_PX / span

    def __call__(self, ring: Sequence[Sequence[float]]) -> List[Tuple[float, float]]:
        sx, minx, maxy = self.scale, self.minx, self.maxy
        return [((px - minx) * sx, (maxy - py) * sx) for px, py in ring]


def _iter_polygons(geom: Dict[str, Any]) -> Iterable[List[List[float]]]:
    """Yield exterior rings. Holes are not drawn; none of these layers have them."""
    kind = geom.get("type")
    if kind == "Polygon":
        if geom["coordinates"]:
            yield geom["coordinates"][0]
    elif kind == "MultiPolygon":
        for polygon in geom["coordinates"]:
            if polygon:
                yield polygon[0]
    elif kind == "GeometryCollection":
        for part in geom.get("geometries", []):
            yield from _iter_polygons(part)


def _iter_lines(geom: Dict[str, Any]) -> Iterable[List[List[float]]]:
    kind = geom.get("type")
    if kind == "LineString":
        yield geom["coordinates"]
    elif kind == "MultiLineString":
        yield from geom["coordinates"]
    elif kind == "GeometryCollection":
        for part in geom.get("geometries", []):
            yield from _iter_lines(part)


def _iter_points(geom: Dict[str, Any]) -> Iterable[List[float]]:
    kind = geom.get("type")
    if kind == "Point":
        yield geom["coordinates"]
    elif kind == "MultiPoint":
        yield from geom["coordinates"]
    elif kind == "GeometryCollection":
        for part in geom.get("geometries", []):
            yield from _iter_points(part)


def render_tile(rows: Sequence[Dict[str, Any]], layer_name: str, z: int, x: int, y: int) -> bytes:
    """
    Draw one tile and return PNG bytes.

    rows carry 'geometry' as a parsed GeoJSON dict in EPSG:3857 and 'properties'
    as a dict of the allowlisted style attributes.

    CPU-bound: call this in a thread pool, never directly on the event loop.
    """
    project = _Projector(z, x, y)

    # Fills are drawn opaque on their own layer, then the whole layer's alpha is
    # scaled. Drawing them translucent individually would double-darken overlaps,
    # which is not what fill-opacity does in the browser.
    fills = Image.new("RGBA", (TILE_PX, TILE_PX), (0, 0, 0, 0))
    strokes = Image.new("RGBA", (TILE_PX, TILE_PX), (0, 0, 0, 0))
    fill_draw = ImageDraw.Draw(fills)
    stroke_draw = ImageDraw.Draw(strokes)

    is_faults = layer_name == "faults"

    for row in rows:
        geometry = row.get("geometry")
        if not geometry:
            continue
        properties = row.get("properties") or {}
        rgb = _feature_color(properties)

        for ring in _iter_polygons(geometry):
            points = project(ring)
            if len(points) >= 3:
                fill_draw.polygon(points, fill=rgb + (255,))

        line_color = _hex_to_rgb(FAULT_COLOR) if is_faults else rgb
        line_width = FAULT_WIDTH if is_faults else LINE_WIDTH
        for line in _iter_lines(geometry):
            points = project(line)
            if len(points) >= 2:
                stroke_draw.line(points, fill=line_color + (255,), width=line_width, joint="curve")

        for point in _iter_points(geometry):
            cx, cy = project([point])[0]
            box = (cx - POINT_RADIUS, cy - POINT_RADIUS, cx + POINT_RADIUS, cy + POINT_RADIUS)
            stroke_draw.ellipse(
                box,
                fill=rgb + (255,),
                outline=_hex_to_rgb(POINT_HALO_COLOR) + (255,),
                width=POINT_HALO_WIDTH,
            )

    if FILL_OPACITY < 1.0:
        alpha = fills.getchannel("A").point(lambda a: int(a * FILL_OPACITY))
        fills.putalpha(alpha)

    canvas = Image.alpha_composite(fills, strokes)

    buffer = io.BytesIO()
    canvas.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()


@lru_cache(maxsize=1)
def empty_tile() -> bytes:
    """A fully transparent tile, for tiles with nothing in them."""
    buffer = io.BytesIO()
    Image.new("RGBA", (TILE_PX, TILE_PX), (0, 0, 0, 0)).save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()
