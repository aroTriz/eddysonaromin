# LOCALHOST ONLY — Frontend terminal (separate window)
# This file is the canonical way to run the Vite SPA for vibe coding.
# API calls use relative /api/v1 -> proxied to 127.0.0.1:8000 (never Cloudflare).
Write-Host "=== FRONTEND: Vite Dev Server on http://localhost:5173 (LOCALHOST ONLY) ===" -ForegroundColor Cyan
Write-Host "Proxy: /api -> http://127.0.0.1:8000  |  Verify: http://localhost:5173" -ForegroundColor Gray
Set-Location 'C:\Triz\TCode\eddysonaromin\frontend'
npm run dev
