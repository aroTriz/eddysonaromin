# ────────────────────────────────────────────────────────────
# eddysonaromin — visible dev launcher (Windows PowerShell)
# Runs the Laravel API (8000) + Vite (5173) in THIS window so
# logs stay visible. Press Ctrl+C to stop both.
# ────────────────────────────────────────────────────────────
$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root 'backend'
$Frontend = Join-Path $Root 'frontend'

Write-Host "`n[1/2] Starting Laravel API on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
# Multi-worker PHP built-in server - REQUIRED for live SSE chat (a single
# worker blocks every other request while a stream is open).
$env:PHP_CLI_SERVER_WORKERS = '8'
$api = Start-Job -ScriptBlock {
  Set-Location $using:Backend
  php artisan serve --port=8000
}

Write-Host '[2/2] Starting Vite on http://localhost:5173 ...' -ForegroundColor Cyan
$fe = Start-Job -ScriptBlock {
  Set-Location $using:Frontend
  npm run dev
}

Write-Host "`n  Site:   http://localhost:5173" -ForegroundColor Green
Write-Host "  API:    http://127.0.0.1:8000/api/v1" -ForegroundColor Green
Write-Host '  Ctrl+C to stop.`n' -ForegroundColor Green

try {
  while ($true) {
    Receive-Job $api -Keep
    Receive-Job $fe -Keep
    Start-Sleep 1
  }
} finally {
  Stop-Job $api, $fe -ErrorAction SilentlyContinue
  Remove-Job $api, $fe -Force -ErrorAction SilentlyContinue
}
