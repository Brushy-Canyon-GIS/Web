-- 003_layer_render_mode.sql
--
-- Record how each layer is published, so the tile build and the frontend read
-- it from the database instead of a hardcoded list.
--
-- Why two modes:
--
--   raster  The layer is drawn on the server and served as map images. The
--           browser receives pixels, never coordinates, so the mapping cannot
--           be lifted out of the tiles. Visual accuracy is unaffected -- the
--           images are rendered from full-precision geometry. Raster drapes
--           over terrain in a 3D view exactly as satellite imagery does.
--
--   vector  The layer is served as geometry. Needed wherever the client has
--           to interact with features directly: clickable markers, photo
--           panels hung in a 3D scene, anything measured or queried.
--
-- The split is by sensitivity, not by convenience. The geological mapping is
-- the research product and goes out as raster. Layers that are small, coarse,
-- or already public in substance go out as vector so the map stays fully
-- interactive.
--
-- This is a starting point, not a permanent decision -- it is data, and a
-- layer can be moved between modes with an UPDATE.
--
-- Apply:  psql "$DATABASE_URL" -f backend/migrations/003_layer_render_mode.sql
-- Safe to re-run.

BEGIN;

ALTER TABLE feature_layers
    ADD COLUMN IF NOT EXISTS render_mode text NOT NULL DEFAULT 'vector';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'feature_layers_render_mode_check'
    ) THEN
        ALTER TABLE feature_layers
            ADD CONSTRAINT feature_layers_render_mode_check
            CHECK (render_mode IN ('raster', 'vector'));
    END IF;
END $$;

COMMENT ON COLUMN feature_layers.render_mode IS
    'raster = drawn server-side, browser receives images only (protects the '
    'mapping); vector = geometry sent to the client (needed for interaction).';

-- The geological mapping: the research product.
UPDATE feature_layers
   SET render_mode = 'raster'
 WHERE layer_name IN (
    'fan_geology',
    'faults',
    'cross_sections',
    'patterns'
 );

-- Everything else stays vector so the map remains interactive:
--   photo_panels                 image panels, hung in space in a 3D view
--   fieldtripstops               clickable markers
--   measured_sections_all_areas  clickable, opens a crossplot
--   cutoffmeasuredsections       section traces
--   atlas_maps, ftrip_m          sheet and marker boundaries
--   gis_region_*, gradient_regions, fan_delivery_system
--                                coarse boxes, nothing to protect

COMMIT;

-- ---------------------------------------------------------------------------
--   SELECT render_mode, include_in_tiles, count(*), string_agg(layer_name, ', ' ORDER BY layer_name)
--     FROM feature_layers GROUP BY 1, 2 ORDER BY 1, 2;
-- ---------------------------------------------------------------------------
