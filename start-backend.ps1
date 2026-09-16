# LOCALHOST ONLY — Backend terminal (separate window)
# This file is the canonical way to run the Laravel API for vibe coding.
# Do NOT change port, do NOT point to Cloudflare — localhost only.
Write-Host "=== BACKEND: Laravel API on http://127.0.0.1:8000 (LOCALHOST ONLY) ===" -ForegroundColor Cyan
Write-Host "DB: backend/database/database.sqlite  |  CORS: localhost:5173 only" -ForegroundColor Gray
Set-Location 'C:\Triz\TCode\eddysonaromin\backend'
$env:PHP_CLI_SERVER_WORKERS = '8'
php artisan serve --port=8000 --host=127.0.0.1
