-- 002_backfill_assets.sql
--
-- Move the existing photo records into assets/asset_links.
--
-- Source tables are read only. photos, features_photos and image_links are
-- left in place and unchanged so the running API keeps working; they should
-- be dropped only once nothing reads them.
--
-- Two decisions worth knowing about:
--
-- 1. Links come from photo_panels."Hyperlink" = photos.filename, which
--    matches 57 of 57 panels exactly and is the relationship the map
--    actually uses (Map.tsx filters panels on a non-empty Hyperlink).
--
-- 2. features_photos is deliberately NOT imported, but not because it is
--    wrong. Every one of its 1737 rows agrees with the feature's own
--    Hyperlink -- 100%, no exceptions. What it has is duplication: those
--    1737 rows carry only 200 distinct (feature_id, photo_id) pairs, one
--    pair repeated up to 215 times, consistent with an import re-run
--    without a conflict clause.
--
--    It is excluded for two other reasons:
--
--      * Redundant. All 200 distinct pairs are exactly reproducible by
--        joining features.other_props->>'Hyperlink' to photos.filename.
--        The table stores nothing that is not already derivable.
--
--      * Wrong entity space. features.id is a uuid in a derived export
--        table, while asset_links.feature_id is a bigint pointing into a
--        GIS layer. There is no type-compatible mapping, and `features`
--        is not one of the 17 spatial layers.
--
--    The rows stay in place; nothing is lost by not importing them.
--
--    image_links is empty (0 rows) and needs no migration.
--
-- 3. Known gap, worth handling when the bulk media arrives: `features`
--    references 7 hyperlinks that no panel has and no photos row matches.
--    Two of them are comma-separated pairs of filenames in a single
--    Hyperlink value ("BC_Backwall.jpg, BC_Backwall2.jpg"), one is a .cvx
--    virtual-outcrop file rather than an image, and the rest are images
--    with no photos row at all. The join below assumes Hyperlink holds a
--    single filename, which is true for all 57 panels today but will not
--    hold for the incoming data.
--
-- Photos stay in the existing public Supabase bucket. storage_key is the
-- bucket-relative path; the full legacy URL is preserved in metadata.
--
-- Apply:  psql "$DATABASE_URL" -f backend/migrations/002_backfill_assets.sql
-- Safe to re-run.

BEGIN;

-- ---------------------------------------------------------------------------
-- photos -> assets
-- ---------------------------------------------------------------------------

INSERT INTO assets (storage_key, kind, media_type, title, metadata)
SELECT
    'photos/' || p.filename                        AS storage_key,
    'photo'                                        AS kind,
    CASE
        WHEN p.filename ILIKE '%.png'                            THEN 'image/png'
        WHEN p.filename ILIKE '%.jpg' OR p.filename ILIKE '%.jpeg' THEN 'image/jpeg'
        WHEN p.filename ILIKE '%.tif' OR p.filename ILIKE '%.tiff' THEN 'image/tiff'
        WHEN p.filename ILIKE '%.webp'                           THEN 'image/webp'
        ELSE 'application/octet-stream'
    END                                            AS media_type,
    p.filename                                     AS title,
    jsonb_build_object(
        'legacy_url',    p.url,
        'legacy_id',     p.id,
        'source_table',  'photos'
    )                                              AS metadata
FROM photos p
WHERE p.filename IS NOT NULL
  AND btrim(p.filename) <> ''
ON CONFLICT (storage_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- photo_panels -> asset_links
--
-- feature_id is photo_panels."ID", which is what the photos API already
-- treats as the panel identifier.
-- ---------------------------------------------------------------------------

INSERT INTO asset_links (asset_id, feature_layer, feature_id, role)
SELECT
    a.id,
    'photo_panels',
    pp."ID"::bigint,
    'primary'
FROM photo_panels pp
JOIN photos p ON p.filename = pp."Hyperlink"
JOIN assets a ON a.storage_key = 'photos/' || p.filename
WHERE pp."Hyperlink" IS NOT NULL
  AND btrim(CAST(pp."Hyperlink" AS text)) <> ''
  AND pp."ID" IS NOT NULL
ON CONFLICT (asset_id, feature_layer, feature_id) DO NOTHING;

COMMIT;

-- ---------------------------------------------------------------------------
-- Verification. Confirmed against production on 2026-09-14:
--   assets            59   (one per photo with a filename)
--   asset_links       57   (one per panel with a matching hyperlink)
--   unlinked_assets    3   (photos no panel references; 56 assets carry the
--                           57 links, since two panels share one photo)
--   unresolved_panels  0   (every panel hyperlink resolved to an asset)
--
--   SELECT count(*) AS assets FROM assets;
--   SELECT count(*) AS links  FROM asset_links;
--   SELECT count(*) AS unlinked_assets
--     FROM assets a LEFT JOIN asset_links l ON l.asset_id = a.id
--     WHERE l.asset_id IS NULL;
--
--   -- every panel hyperlink resolved to an asset
--   SELECT count(*) AS unresolved_panels
--   FROM photo_panels pp
--   LEFT JOIN assets a ON a.storage_key = 'photos/' || pp."Hyperlink"
--   WHERE pp."Hyperlink" IS NOT NULL
--     AND btrim(CAST(pp."Hyperlink" AS text)) <> ''
--     AND a.id IS NULL;
-- ---------------------------------------------------------------------------
