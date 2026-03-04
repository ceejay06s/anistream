# Deploy All - AniStream
# Run from repo root. Requires: Node, Firebase CLI (firebase login), EAS CLI (eas login), and env EXPO_PUBLIC_API_URL if needed.

$ErrorActionPreference = "Stop"

Write-Host "=== AniStream Deploy All ===" -ForegroundColor Cyan

# 1. Backend (Render) - trigger via webhook if set
if ($env:RENDER_DEPLOY_HOOK) {
    Write-Host "`n[1/4] Triggering backend deploy (Render)..." -ForegroundColor Yellow
    Invoke-RestMethod -Uri $env:RENDER_DEPLOY_HOOK -Method Post
    Write-Host "Backend deploy triggered." -ForegroundColor Green
} else {
    Write-Host "`n[1/4] Backend (Render): Skipping - set RENDER_DEPLOY_HOOK to trigger. Or push to v2/master or run Backend Deploy workflow in GitHub Actions." -ForegroundColor Gray
}

# 2. Backend build check (optional)
Write-Host "`n[2/4] Verifying backend build..." -ForegroundColor Yellow
try {
    Push-Location backend-hono
    npm run build
    Pop-Location
    Write-Host "Backend build OK." -ForegroundColor Green
} catch {
    Pop-Location -ErrorAction SilentlyContinue
    Write-Host "Backend build skipped or failed (continuing): $_" -ForegroundColor Gray
}

# 3. Firebase (hosting, functions, firestore) + Web build
Write-Host "`n[3/4] Building web and deploying Firebase (hosting, functions, firestore)..." -ForegroundColor Yellow
Push-Location frontend-native
npm run build:web
$fb = firebase deploy 2>&1; $fbExit = $LASTEXITCODE
Pop-Location
if ($fbExit -ne 0) { Write-Host "Firebase deploy had errors (e.g. Blaze plan required for Functions). Fix and run 'firebase deploy' from frontend-native." -ForegroundColor Yellow } else { Write-Host "Firebase deploy done." -ForegroundColor Green }

# 4. EAS production deploy (OTA update)
Write-Host "`n[4/4] EAS deploy (production)..." -ForegroundColor Yellow
Push-Location frontend-native
eas deploy --prod --non-interactive
Pop-Location
Write-Host "EAS deploy done." -ForegroundColor Green

Write-Host "`n=== Deploy All Complete ===" -ForegroundColor Cyan
