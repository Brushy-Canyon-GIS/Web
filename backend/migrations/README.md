# Migrations

Plain SQL files, applied in numeric order. There is no migration framework
here on purpose — the schema changes rarely, and a framework would be more
machinery than the problem needs.

Every migration must be **safe to re-run**: `CREATE TABLE IF NOT EXISTS`,
`ON CONFLICT DO NOTHING`, `CREATE INDEX IF NOT EXISTS`. There is no down
migration; to reverse one, write the next one.

## Applying

`DATABASE_URL` lives in `backend/.env` on the instance and points at the
Supabase transaction pooler.

```bash
cd /home/ubuntu/geology-backend
DB="$(grep -m1 '^DATABASE_URL=' backend/.env | cut -d= -f2-)"

psql "$DB" -f backend/migrations/001_assets.sql
```

Check what a migration will touch before running it against production data:

```bash
psql "$DB" -f backend/migrations/001_assets.sql --single-transaction --dry-run  # not supported by psql
```

psql has no dry run. For anything that writes to existing rows, run it inside
an explicit transaction and inspect before committing:

```bash
psql "$DB"
BEGIN;
\i backend/migrations/002_backfill_assets.sql
SELECT count(*) FROM assets;
-- ROLLBACK;  or  COMMIT;
```

## The migrations

| File | What |
|---|---|
| `001_assets.sql` | `feature_layers`, `assets`, `asset_links` — the media schema |

## Notes

`001` creates the schema but moves no data. The existing `photos`,
`features_photos`, and `image_links` tables are left untouched so the running
API keeps working; backfilling them into `assets` is a separate migration, and
they should only be dropped once nothing reads them.

`feature_layers` is the allowlist of map layers, as data. The API's table
allowlist and the tile build should both read from it rather than accepting any
name found in `information_schema`, which is how the generic route currently
exposes every table in the database.
