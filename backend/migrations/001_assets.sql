-- 001_assets.sql
--
-- One table for every kind of media file, replacing the overlapping
-- photos / features_photos / image_links tables, and able to carry the
-- incoming documents and imagery without a new table per type.
--
-- Two rules keep this flexible without becoming unqueryable:
--   * anything filtered or sorted across ALL assets is a real column
--   * anything specific to one type lives in metadata jsonb
-- Promote a metadata key to a column once it turns out to be universal.
--
-- Bytes are never stored here. assets.storage_key points at object storage;
-- this table records what a file is and what it relates to.
--
-- Apply:  psql "$DATABASE_URL" -f backend/migrations/001_assets.sql
-- Safe to re-run.

BEGIN;

-- ---------------------------------------------------------------------------
-- feature_layers: the allowlist of map layers, as data rather than a hardcoded
-- list. asset_links references it, and the API and tile build should both read
-- their allowlist from here instead of accepting any table name found in
-- information_schema.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS feature_layers (
    layer_name       text PRIMARY KEY,
    display_name     text NOT NULL,
    geometry_type    text,
    -- False for redundant copies and empty tables; the tile build skips these.
    include_in_tiles boolean NOT NULL DEFAULT true,
    notes            text
);

COMMENT ON TABLE feature_layers IS
    'Allowlist of queryable/tileable map layers. Source of truth for the API '
    'table allowlist and the tile build.';

INSERT INTO feature_layers (layer_name, display_name, geometry_type, include_in_tiles, notes) VALUES
    ('fan_geology',                 'Fan Geology',            'GEOMETRY',        true,  NULL),
    ('faults',                      'Faults',                 'GEOMETRY',        true,  NULL),
    ('measured_sections_all_areas', 'Measured Sections',      'GEOMETRY',        true,  NULL),
    ('photo_panels',                'Photo Panels',           'LINESTRING',      true,  'Panels link to assets; midpoints are precomputed at build time'),
    ('cross_sections',              'Cross Sections',         'GEOMETRY',        true,  NULL),
    ('fieldtripstops',              'Field Trip Stops',       'POINT',           true,  NULL),
    ('atlas_maps',                  'Atlas Maps',             'GEOMETRY',        true,  NULL),
    ('ftrip_m',                     'Field Trip Markers',     'POLYGON',         true,  NULL),
    ('cutoffmeasuredsections',      'Cutoff Measured Sections','MULTILINESTRING',true,  NULL),
    ('patterns',                    'Patterns',               'POLYGON',         true,  NULL),
    ('gis_region_small',            'Small GIS Regions',      'POLYGON',         true,  NULL),
    ('gradient_regions',            'Gradient Regions',       'POLYGON',         true,  NULL),
    ('gis_region_large',            'Large GIS Regions',      'POLYGON',         true,  NULL),
    ('fan_delivery_system',         'Fan Delivery System',    'POLYGON',         true,  NULL),
    ('fangeology',                  'Fan Geology (duplicate)','GEOMETRY',        false, 'Same row count as fan_geology; confirm redundant, then drop'),
    ('atlasmaps',                   'Atlas Maps (duplicate)', 'GEOMETRY',        false, 'Same row count as atlas_maps; confirm redundant, then drop'),
    ('geospatial_data',             'Geospatial Data',        'GEOMETRY',        false, 'Empty')
ON CONFLICT (layer_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- assets
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assets (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Object storage key. Unique so re-running an import cannot duplicate rows.
    storage_key   text NOT NULL UNIQUE,

    kind          text NOT NULL
                  CHECK (kind IN ('photo', 'document', 'deck', 'plot', 'model')),
    media_type    text NOT NULL,

    bytes         bigint CHECK (bytes IS NULL OR bytes >= 0),
    -- Content hash. A bulk import of field media will contain duplicates that
    -- differ only by filename.
    checksum      text,

    title         text,
    captured_at   date,

    -- Where the photo was taken, when known. Null for most documents.
    location      geometry(Point, 4326),

    -- Derived files that are safe to serve publicly, as {role: storage_key}:
    -- {"thumb": "...", "web": "...", "pdf": "..."}. The original is never
    -- served directly; only what appears here reaches the CDN.
    derivatives   jsonb NOT NULL DEFAULT '{}'::jsonb,

    -- Type-specific fields: EXIF and camera for a photo, page count and author
    -- for a document, slide count for a deck.
    metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,

    -- Extracted text, for full-text search across the document corpus.
    text_content  tsvector,

    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE assets IS
    'Every media file: photos, documents, decks, rendered plots. Bytes live in '
    'object storage under storage_key; this records what the file is.';
COMMENT ON COLUMN assets.derivatives IS
    'Public derived files as {role: storage_key}. Originals are not served.';
COMMENT ON COLUMN assets.metadata IS
    'Type-specific attributes. Promote a key to a column once it is universal.';

CREATE INDEX IF NOT EXISTS assets_metadata_idx     ON assets USING gin (metadata jsonb_path_ops);
CREATE INDEX IF NOT EXISTS assets_text_content_idx ON assets USING gin (text_content);
CREATE INDEX IF NOT EXISTS assets_location_idx     ON assets USING gist (location);
CREATE INDEX IF NOT EXISTS assets_kind_created_idx ON assets (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS assets_checksum_idx     ON assets (checksum) WHERE checksum IS NOT NULL;

-- ---------------------------------------------------------------------------
-- asset_links: many-to-many between assets and map features.
-- One photo can show several features; one feature has many photos.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS asset_links (
    asset_id      uuid   NOT NULL REFERENCES assets(id) ON DELETE CASCADE,

    -- Polymorphic by necessity: features live in per-layer tables, so Postgres
    -- cannot enforce a foreign key to the row itself. The layer name is
    -- constrained against feature_layers, which is as much integrity as this
    -- shape allows. Unifying features under one table with a surrogate key
    -- would permit a real FK, but that is a larger migration.
    feature_layer text   NOT NULL REFERENCES feature_layers(layer_name),
    feature_id    bigint NOT NULL,

    -- Which image leads a popup, and in what order the rest follow.
    role          text   CHECK (role IS NULL OR role IN
                          ('primary', 'context', 'annotated', 'thin_section')),
    sort_order    int    NOT NULL DEFAULT 0,

    created_at    timestamptz NOT NULL DEFAULT now(),

    PRIMARY KEY (asset_id, feature_layer, feature_id)
);

COMMENT ON TABLE asset_links IS
    'Associates assets with map features. feature_layer is validated against '
    'feature_layers; feature_id cannot be foreign-keyed across per-layer tables.';

CREATE INDEX IF NOT EXISTS asset_links_feature_idx
    ON asset_links (feature_layer, feature_id, sort_order);

-- At most one primary asset per feature.
CREATE UNIQUE INDEX IF NOT EXISTS asset_links_one_primary_idx
    ON asset_links (feature_layer, feature_id)
    WHERE role = 'primary';

-- ---------------------------------------------------------------------------
-- keep updated_at honest
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assets_set_updated_at ON assets;
CREATE TRIGGER assets_set_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
