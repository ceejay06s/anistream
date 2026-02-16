# PowerShell script to set up .env file from service account JSON
# This creates/updates .env with the service account in base64 format

$serviceAccountPath = "src\config\aniwatch-76fd3-firebase-adminsdk-fbsvc-b7138dfdd6.json"
$envPath = ".env"

if (-not (Test-Path $serviceAccountPath)) {
    Write-Host "Error: Service account file not found at $serviceAccountPath" -ForegroundColor Red
    exit 1
}

Write-Host "Reading service account file..." -ForegroundColor Green
$content = Get-Content $serviceAccountPath -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
$base64 = [Convert]::ToBase64String($bytes)

# Generate a random secret token
$secretToken = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Create .env file
$envContent = @"
# Firebase Service Account (Base64 encoded)
FIREBASE_SERVICE_ACCOUNT=$base64

# Secret token for anime update endpoint
ANIME_UPDATE_SECRET_TOKEN=$secretToken

# Node environment
NODE_ENV=development
"@

$envContent | Out-File -FilePath $envPath -Encoding UTF8

Write-Host "`n✅ Created .env file successfully!" -ForegroundColor Green
Write-Host "Location: $envPath" -ForegroundColor Cyan
Write-Host "`n⚠️  Make sure .env is in .gitignore (it should be)" -ForegroundColor Yellow
