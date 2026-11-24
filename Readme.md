# GAIA Platform / Outcrop Analog - Web

This repository has three parts:

1. **backend/** - FastAPI (Python) API that serves geologic data as GeoJSON.
2. **frontend/** - React + Vite (TypeScript) web app with the Mapbox map.
3. **supabase/** - local Supabase (Postgres + PostGIS) configuration and migrations, run through the Supabase CLI and Docker.

---

## Local development setup (Windows)

These steps were worked out on Windows using PowerShell and VS Code. Everything runs natively on Windows. You do not need a Linux shell.

### What you need first

- **Git**
- **Docker Desktop**, installed and **running** (give it about 4 GB of RAM or more)
- **Node.js 20 or later** (`node -v`)
- **Python 3** (`py --version`). 3.12 or 3.13 is the smoothest. 3.14 works with the pygame workaround in step 5.
- A copy of **`seed.sql`**, the database dump. It is not in git (large, and it will eventually hold private data). Get it from the shared team folder. Never commit it.

### 1. Get the code and the seed file

Clone the repo and check out your branch. Put `seed.sql` in the `supabase\` folder (`supabase\seed.sql`). It is already gitignored.

Open `supabase\seed.sql`, go to **line 27**, and change

```sql
CREATE SCHEMA public;
```

to

```sql
CREATE SCHEMA IF NOT EXISTS public;
```

The local database already has a `public` schema, so without this change `db reset` stops with `schema "public" already exists`.

### 2. Supabase configuration

`supabase\config.toml` and `supabase\migrations\` are in the repo. The migrations enable PostGIS (`..._setup_postgis.sql`) and create the user and role tables (`..._rbac_roles.sql`).

On Windows, the Supabase Analytics container needs Docker's TCP socket exposed. The simple fix is to turn analytics off. In `supabase\config.toml`, under `[analytics]`, set:

```toml
enabled = false
```

### 3. Start the local database

Run these from the repo root (the folder that contains `supabase\`). Docker Desktop must be running.

```powershell
npx supabase start
npx supabase db reset
npx supabase status
```

- `start` downloads images the first time (several minutes) and then prints the local URLs and keys.
- `db reset` runs the migrations and then loads `seed.sql`.
- `status` prints the URLs and the **Publishable key** again whenever you need them.

Check it worked: open Studio at http://127.0.0.1:54323, go to **Table Editor**, and look at the `public` tables. You should see about 26 data tables (for example `fan_geology`, `profiles`, and `user_entitlements`).

### 4. Backend

Create `backend\.env` (gitignored):

```powershell
Set-Content -Path backend\.env -Encoding ascii -Value "DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres","ENABLE_CORS=1"
```

`ENABLE_CORS=1` is needed for local development. In production nginx adds the CORS headers, and the app's own CORS middleware is off so the browser does not get the header twice. Locally there is no nginx, so this flag turns the middleware on.

Then, from `backend\`:

```powershell
py -m venv venv
venv\Scripts\activate
pip install -r ..\requirements.txt
uvicorn app.main:app --reload
```

The API is at http://localhost:8000 and the interactive docs are at http://localhost:8000/docs. If you change `backend\.env`, stop uvicorn with Ctrl+C and start it again if needed.

### 5. If pip fails on pygame

`requirements.txt` lists `pygame==2.6.1`, but nothing in the code imports it. On Python 3.14 there is no prebuilt wheel, so pip tries to compile it and fails. Install everything else:

```powershell
(Get-Content ..\requirements.txt) -notmatch '^pygame' | Set-Content $env:TEMP\req-nopygame.txt
pip install -r $env:TEMP\req-nopygame.txt
```

### 6. Frontend

Create `frontend\.env.local` (gitignored) next to `package.json`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<the Publishable key printed by `npx supabase status`>
VITE_MAPBOX_TOKEN=<a Mapbox public token, starts with pk.>
VITE_MAPBOX_STYLE=mapbox://styles/mapbox/streets-v11
```

`frontend\.env.development` already sets `VITE_API_URL` for the local backend, so leave it alone. Then, from `frontend\`:

```powershell
npm install
npm run dev
```

Open the address Vite prints (usually http://localhost:5173). Restart `npm run dev` after any change to an env file. Vite only reads them at startup.

**Mapbox token and basemap style.** The map needs a public (`pk.`) token in `VITE_MAPBOX_TOKEN`. By default `Map.tsx` uses the production style, `mapbox://styles/mapbox/standard-satellite`, which is made of satellite image (raster) tiles. A free Mapbox trial account's default public token is usage-limited, and Mapbox answers its raster-tile requests with `429 Too Many Requests` (a direct `curl` request for a satellite tile returns 429 even outside the app), so the satellite imagery never loads. Vector styles still work with the same token.

To develop without the production token, keep the optional `VITE_MAPBOX_STYLE` line in `frontend\.env.local` (shown above):

```
VITE_MAPBOX_STYLE=mapbox://styles/mapbox/streets-v12
```

`Map.tsx` reads it as `import.meta.env.VITE_MAPBOX_STYLE ?? "mapbox://styles/mapbox/standard-satellite"`. When the variable is not set, which is the case for the production build and for anyone with the production token, the satellite style is used. Do not set it to an empty value, because an empty string does not trigger the fallback; delete the line instead. `streets-v11` also works.

If you have the production Mapbox token, put it in `VITE_MAPBOX_TOKEN` and leave `VITE_MAPBOX_STYLE` out. Ask whoever builds the production frontend for it, and if it is restricted to the production URL, `localhost` must be added to its allowed URLs. The production build environment must never set `VITE_MAPBOX_STYLE`.

### 7. Check that everything works

1. http://localhost:8000/docs loads.
2. The map appears at http://localhost:5173.
3. Tick a layer such as `fan_geology` in the nav bar. Features should draw. In the browser's Network tab, the request to `localhost:8000/api/v1/geologic/fan_geology` should be `200`.

### Day to day

```powershell
npx supabase stop               # stop the containers, keep your data
npx supabase start              # start them again
npx supabase db reset           # rebuild the database from migrations and seed.sql
npx supabase stop --no-backup   # stop and delete the local data
```

| Service | Address |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend (FastAPI) | http://localhost:8000 |
| Supabase API | http://127.0.0.1:54321 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Supabase Studio | http://127.0.0.1:54323 |

### Branch notes

- Commit `aa72fa9` ("Basic Admin panel draft", on `feature/rbac-roles`) removed the `<Map ... />` element from `MapWorkspace` in `frontend/src/App.tsx`, so branches built on it show an empty map area. The block to restore inside `<div className="map-container">` is:

  ```tsx
  <Map
    geojson={geojson}
    onFeatureClick={setSelectedFeature}
    showPhotoPanels={selectedLayers.includes("photo_panels")}
    showCrossPlots={selectedLayers.includes("measured_sections_all_areas")}
  />
  ```

  Delete this note once the fix is merged.

---

## Running the project (reference)

**Backend** (from `backend\`):

- Mac/Linux: `source venv/bin/activate`, then `uvicorn app.main:app --reload`
- Windows: `venv\Scripts\activate`, then `uvicorn app.main:app --reload`

The backend is at http://localhost:8000 and the API docs are at http://localhost:8000/docs.

If you point `DATABASE_URL` at the hosted Supabase database instead of the local one, it is not reachable on the Mines wifi, so use a personal hotspot.

**Unit tests:**

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python -m pytest tests/ -v
```

**Frontend** (from `frontend\`): `npm run dev`

The data comes from the Supabase database. Right now only the Atlas maps JSON is stored there, and the rest will be added over time. Authentication is provided by Supabase, so there is no need to build the sign-in flow manually.
