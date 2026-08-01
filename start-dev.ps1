# ────────────────────────────────────────────────────────────
# eddysonaromin — local dev launcher (Windows PowerShell)
# Starts the Laravel API (port 8000) and the Vite frontend
# (port 5173) side-by-side. Open http://localhost:5173
# ────────────────────────────────────────────────────────────

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root 'backend'
$Frontend = Join-Path $Root 'frontend'

# ── 1. Laravel API ─────────────────────────────────────────
Write-Host "`n[1/2] Starting Laravel API on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
$php = Get-Command php -ErrorAction SilentlyContinue
if (-not $php) { Write-Host 'PHP not found. Install PHP 8.2+ and retry.' -ForegroundColor Red; exit 1 }

if (-not (Test-Path (Join-Path $Backend '.env'))) {
    Write-Host 'Missing backend/.env — copying from example and generating key...' -ForegroundColor Yellow
    Copy-Item (Join-Path $Backend '.env.example') (Join-Path $Backend '.env')
    Push-Location $Backend
    php artisan key:generate
    Pop-Location
}

if (-not (Test-Path (Join-Path $Backend 'database\database.sqlite'))) {
    Write-Host 'Database not found — running migrations + seeders...' -ForegroundColor Yellow
    Push-Location $Backend
    php artisan migrate --seed
    Pop-Location
}

Start-Process -FilePath 'php' -ArgumentList 'artisan serve --port=8000' -WorkingDirectory $Backend -WindowStyle Hidden

# ── 2. Frontend (Vite) ─────────────────────────────────────
Write-Host '[2/2] Starting Vite dev server on http://localhost:5173 ...' -ForegroundColor Cyan
Start-Process -FilePath 'npm' -ArgumentList 'run','dev' -WorkingDirectory $Frontend -WindowStyle Hidden

Start-Sleep 4
Write-Host "`n  Site:   http://localhost:5173" -ForegroundColor Green
Write-Host "  API:    http://127.0.0.1:8000/api/v1" -ForegroundColor Green
Write-Host '  Servers are running in the background.`n' -ForegroundColor Green
