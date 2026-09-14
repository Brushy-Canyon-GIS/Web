# Deploying the backend

Production runs on an EC2 instance in `us-east-2`, fronted by nginx:

```
client → nginx :443 (TLS, CORS, rate limits) → 127.0.0.1:8000
       → gunicorn, 2 × UvicornWorker, under systemd as fastapi.service
       → Supabase Postgres + PostGIS (transaction pooler, :6543)
```

The repo is checked out at `/home/ubuntu/geology-backend`.

## Deploy

```bash
cd /home/ubuntu/geology-backend
./backend/deploy/deploy.sh
```

Do not prefix this with `sudo -v`. The `ubuntu` account has no password set —
authentication is by SSH key — so an interactive sudo prompt cannot be answered.
Sudo is already passwordless via `/etc/sudoers.d/90-cloud-init-users`, and the
script tests for that non-interactively.

The script records the current commit, pulls `production`, reinstalls
dependencies if `requirements.txt` changed, restarts the service, waits for it
to actually serve, and then verifies the deployment from outside. **If any check
fails it resets to the previous commit and restarts**, so a failed deploy does
not stay live.

To verify the running deployment without changing anything:

```bash
./backend/deploy/deploy.sh --check
```

## What is checked, and why

`/health` is not sufficient on its own — it has reported healthy while the site
was broken. Each check corresponds to a failure that actually happened:

| Check | Caught |
|---|---|
| `/health` reports `database: connected` | app up and talking to Postgres |
| layer request returns 200 with no auth header | auth enabled without a key issued, 401ing the frontend |
| exactly one `Access-Control-Allow-Origin` | nginx and `CORSMiddleware` both setting it; browsers reject two |
| largest layer returns ≥ 2000 features | a limit clamp silently truncating responses |
| port 8000 bound to loopback | gunicorn on `0.0.0.0`, reachable unencrypted, bypassing nginx |

`systemctl restart` returns as soon as the unit is active, which is several
seconds before gunicorn has imported pandas and matplotlib and begun serving.
The script polls until the API answers rather than sleeping a fixed interval.

## nginx

`nginx-api.conf` is the site config, tracked here for the same reason as the
unit file. To apply:

```bash
sudo cp backend/deploy/nginx-api.conf /etc/nginx/sites-available/api.outcropanalog.com
sudo ln -sf /etc/nginx/sites-available/api.outcropanalog.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default        # if the stock site is still linked
sudo mkdir -p /var/cache/nginx/tiles && sudo chown -R www-data:www-data /var/cache/nginx
sudo nginx -t && sudo systemctl reload nginx
```

The `ssl_*` lines are managed by Certbot. If a renewal rewrites the live file,
copy the change back here rather than letting the two diverge.

### Tile cache

Tiles are cached on disk, so a tile is rendered once and afterwards served
without waking Python — a cold render is 0.4–0.9s and queries the database, a
cached hit is about a millisecond and does neither. Check which you got:

```bash
curl -sI "https://api.outcropanalog.com/api/v1/tiles/1/r/fan_geology/12/856/1667.png" \
  | grep -i x-tile-cache      # MISS on first fetch, HIT after
```

Cached entries are retired by bumping `TILE_VERSION` in `backend/.env`, which
changes every tile URL. Tiles are served `immutable`, so that bump is the only
thing that retires them — do it whenever the mapping or the palette changes.

`max_size` is set to 400m deliberately: the root volume is 7G and was 83% full
when this was written. Raise it once the volume is grown.

## Service definition

`fastapi.service` here is the source of truth for the systemd unit. To apply it:

```bash
sudo cp backend/deploy/fastapi.service /etc/systemd/system/fastapi.service
sudo systemctl daemon-reload
sudo systemctl restart fastapi
```

Make sure the unit is **enabled**, or it will not come back after a reboot:

```bash
systemctl is-enabled fastapi      # want: enabled
sudo systemctl enable fastapi
```

A reboot with the unit disabled is what took production down on 2026-09-11 —
nginx returned 502 for hours with no upstream running.

## Configuration

`EnvironmentFile` points at `backend/.env` on the instance, which is not in the
repo. It must define `DATABASE_URL`. `API_KEY` is currently unset, and until a
key is issued and the frontend sends it, the routers must not depend on
`require_api_key` — the check accepts any non-empty value while blocking the
frontend, which sends none.

## Rollback

Automatic on a failed deploy. Manually:

```bash
cd /home/ubuntu/geology-backend
git log --oneline -5
git reset --hard <sha>
sudo systemctl restart fastapi
./backend/deploy/deploy.sh --check
```
