"""
Tests for raster tile rendering.

These need no database: the renderer takes already-fetched geometry in
Web Mercator and returns PNG bytes, so it can be exercised directly.
"""

import io

import pytest
from PIL import Image

from app.services.tile_renderer import (
    ORIGIN_SHIFT,
    TILE_PX,
    _hex_to_rgb,
    _Projector,
    cycle_palette,
    empty_tile,
    pixel_size_metres,
    render_tile,
    tile_bounds_3857,
    tile_is_in_range,
)

# A tile over the study area; any tile works, the maths is uniform.
Z, X, Y = 12, 845, 1632


@pytest.fixture
def bounds():
    return tile_bounds_3857(Z, X, Y)


def test_zoom_zero_covers_the_world():
    minx, miny, maxx, maxy = tile_bounds_3857(0, 0, 0)
    assert minx == pytest.approx(-ORIGIN_SHIFT)
    assert miny == pytest.approx(-ORIGIN_SHIFT)
    assert maxx == pytest.approx(ORIGIN_SHIFT)
    assert maxy == pytest.approx(ORIGIN_SHIFT)


def test_child_tiles_tile_their_parent():
    parent = tile_bounds_3857(0, 0, 0)
    children = [tile_bounds_3857(1, x, y) for x in (0, 1) for y in (0, 1)]
    assert min(c[0] for c in children) == pytest.approx(parent[0])
    assert max(c[2] for c in children) == pytest.approx(parent[2])
    assert min(c[1] for c in children) == pytest.approx(parent[1])
    assert max(c[3] for c in children) == pytest.approx(parent[3])


def test_pixel_size_halves_each_zoom():
    assert pixel_size_metres(13) == pytest.approx(pixel_size_metres(12) / 2)


@pytest.mark.parametrize(
    "z,x,y,expected",
    [(12, 0, 0, True), (12, 4095, 4095, True), (12, 4096, 0, False), (12, -1, 0, False), (23, 0, 0, False)],
)
def test_tile_range_validation(z, x, y, expected):
    assert tile_is_in_range(z, x, y) is expected


def test_projector_maps_tile_corners_to_pixel_corners(bounds):
    minx, miny, maxx, maxy = bounds
    project = _Projector(Z, X, Y)
    top_left = project([[minx, maxy]])[0]
    bottom_right = project([[maxx, miny]])[0]
    assert top_left == pytest.approx((0.0, 0.0), abs=1e-6)
    assert bottom_right == pytest.approx((TILE_PX, TILE_PX), abs=1e-6)


def test_unknown_colour_falls_back_to_grey():
    assert _hex_to_rgb("#eceded") == (236, 237, 237)
    assert _hex_to_rgb("not-a-colour") == (204, 204, 204)


def test_palette_loads():
    palette = cycle_palette()
    assert palette["1.1"] == "#eceded"
    assert len(palette) > 50


def test_palette_matches_the_frontend_copy():
    """
    The renderer and the browser must colour the same cycle identically.
    Until the frontend reads the palette from /tiles/manifest.json there are
    two copies of this file, and they have to stay in step.
    """
    import json
    from pathlib import Path

    backend_copy = Path(__file__).resolve().parents[1] / "app" / "cartography" / "fan_geology_colors.json"
    frontend_copy = Path(__file__).resolve().parents[2] / "frontend" / "src" / "fanGeology.json"

    if not frontend_copy.exists():  # backend deployed on its own
        pytest.skip("frontend sources not present")

    with backend_copy.open() as fh:
        assert json.load(fh) == json.loads(frontend_copy.read_text())


@pytest.mark.parametrize("cycle", ["3-4", "4-5", "5.0", "6.0", "7.0"])
def test_cycles_mangled_by_excel_have_colours(cycle):
    """
    These five keys reached the palette as '4-Mar', '5-Apr', '5', '6' and '7'
    after a trip through a spreadsheet, so the units they name rendered grey.
    """
    assert cycle in cycle_palette()


def _open(png: bytes) -> Image.Image:
    return Image.open(io.BytesIO(png)).convert("RGBA")


def test_polygon_fill_uses_palette_colour_at_configured_opacity(bounds):
    minx, miny, maxx, maxy = bounds
    mid = (minx + maxx) / 2
    left_half = {
        "type": "Polygon",
        "coordinates": [[[minx, miny], [mid, miny], [mid, maxy], [minx, maxy], [minx, miny]]],
    }
    image = _open(render_tile([{"geometry": left_half, "properties": {"CYCLE": "1.1"}}], "fan_geology", Z, X, Y))

    assert image.size == (TILE_PX, TILE_PX)
    drawn = image.getpixel((100, TILE_PX // 2))
    assert drawn[:3] == (236, 237, 237)
    assert drawn[3] == 153  # 0.6 opacity, matching the frontend
    assert image.getpixel((400, TILE_PX // 2))[3] == 0


def test_overlapping_fills_do_not_double_darken(bounds):
    """fill-opacity in the browser does not compound; neither should this."""
    minx, miny, maxx, maxy = bounds
    mid = (minx + maxx) / 2
    polygon = {
        "type": "Polygon",
        "coordinates": [[[minx, miny], [mid, miny], [mid, maxy], [minx, maxy], [minx, miny]]],
    }
    feature = {"geometry": polygon, "properties": {"CYCLE": "1.1"}}
    image = _open(render_tile([feature, feature], "fan_geology", Z, X, Y))
    assert image.getpixel((100, TILE_PX // 2))[3] == 153


def test_faults_render_in_firebrick(bounds):
    minx, miny, maxx, maxy = bounds
    diagonal = {"type": "LineString", "coordinates": [[minx, miny], [maxx, maxy]]}
    image = _open(render_tile([{"geometry": diagonal, "properties": {}}], "faults", Z, X, Y))
    centre = image.getpixel((TILE_PX // 2, TILE_PX // 2))
    assert centre[:3] == (178, 34, 34)
    assert centre[3] == 255


def test_empty_tile_is_transparent():
    image = _open(empty_tile())
    assert image.size == (TILE_PX, TILE_PX)
    assert image.getpixel((TILE_PX // 2, TILE_PX // 2))[3] == 0


def test_features_without_geometry_are_skipped():
    png = render_tile([{"geometry": None, "properties": {"CYCLE": "1.1"}}], "fan_geology", Z, X, Y)
    assert _open(png).getpixel((TILE_PX // 2, TILE_PX // 2))[3] == 0
