Write-Host "=== BACKEND: Laravel API on http://127.0.0.1:8000 ===" -ForegroundColor Cyan
Set-Location 'C:\Triz\TCode\eddysonaromin\backend'
$env:PHP_CLI_SERVER_WORKERS = '8'
php artisan serve --port=8000
