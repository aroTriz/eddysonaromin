# LOCALHOST ONLY — Vibe Code Rule

> **ALL vibe code changes for eddysonaromin MUST target localhost.**
> Never deploy to Cloudflare, never push half-baked code to `master`, never touch production D1 directly during development.

## What "localhost only" means

| Layer | URL | Source |
|-------|-----|--------|
| Frontend (Vite) | `http://localhost:5173` | `frontend/` → `npm run dev` → Vite proxy |
| Backend API (Laravel) | `http://127.0.0.1:8000` | `backend/` → `php artisan serve --port=8000` |
| API path | `/api/v1/*` | Proxied by Vite: `/api` → `127.0.0.1:8000` |
| DB | `backend/database/database.sqlite` | Local SQLite, seeded via `php artisan migrate --seed` |

`frontend/src/services/api.ts` uses `const API_BASE = '/api/v1'` (relative). This hits the Vite proxy during dev, which forwards to the local Laravel server. It **never** calls Cloudflare Functions directly in local mode.

`backend/config/cors.php` only allows `http://localhost:5173` and `http://127.0.0.1:5173`.

## How to run (separate terminals — required)

### Option A — Two separate PowerShell windows (recommended for logs)

```powershell
# Terminal 1 — Backend
.\start-backend.ps1
# or manually:
Set-Location backend; $env:PHP_CLI_SERVER_WORKERS='8'; php artisan serve --port=8000

# Terminal 2 — Frontend
.\start-frontend.ps1
# or manually:
Set-Location frontend; npm run dev
```

Open `http://localhost:5173` — this is your single source of truth.

### Option B — One hidden launcher (no visible logs)

```powershell
.\start-dev.ps1
```

### Option C — Visible combined logs in one window

```powershell
.\start-dev-visible.ps1
```

## Rules for Trizai / vibe coding

1. **Every code change is verified at `http://localhost:5173`**, not at `aromin-resume.pages.dev` or any other hosted URL.
2. **Do NOT run `wrangler pages deploy` or `wrangler d1 execute --remote` during vibe coding.** Those touch production.
3. **Do NOT push to `origin/master`** until the feature is verified locally. `master` push triggers `.github/workflows/deploy.yml` → Cloudflare Pages + D1 sync. Use feature branches: `git checkout -b feat/<name>` and push the branch, or keep changes local.
4. **Backend edits**: always `php artisan migrate --seed` stays local. Never sync `backend/database/database.sqlite` to D1 manually during dev.
5. **Frontend edits**: `frontend/src/services/api.ts` must stay as `'/api/v1'` (relative). Never hardcode `https://...` for local.
6. If a change needs Cloudflare Functions (`functions/`), verify the equivalent Laravel endpoint still works locally first — `functions/` is **deploy-only** and not used when running via `php artisan serve`.

## Verify it's localhost-only

```powershell
# API should respond locally
Invoke-WebRequest http://127.0.0.1:8000/api/v1/projects | Select-Object StatusCode

# Frontend should load
Invoke-WebRequest http://localhost:5173 | Select-Object StatusCode

# netstat should show both listeners
netstat -ano | Select-String "8000|5173"
```

If either check fails, restart the two terminals above.

## Emergency: stop everything

```powershell
Get-Process php,node -ErrorAction SilentlyContinue | Stop-Process -Force
```

---
Last enforced: 2026-09-15 — Trizai Build Mode. This file is the binding contract for all eddysonaromin tasks.
