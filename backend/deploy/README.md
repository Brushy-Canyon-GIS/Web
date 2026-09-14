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
