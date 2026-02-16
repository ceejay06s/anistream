# PowerShell script to encode service account key to base64
# Run this script to get the base64 string for Render environment variable

$serviceAccountPath = "src\config\aniwatch-76fd3-firebase-adminsdk-fbsvc-b7138dfdd6.json"

if (-not (Test-Path $serviceAccountPath)) {
    Write-Host "Error: Service account file not found at $serviceAccountPath" -ForegroundColor Red
    exit 1
}

Write-Host "Reading service account file..." -ForegroundColor Green
$content = Get-Content $serviceAccountPath -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
$base64 = [Convert]::ToBase64String($bytes)

Write-Host "`n=== Base64 Encoded Service Account ===" -ForegroundColor Yellow
Write-Host $base64
Write-Host "`n=== Copy the above string ===" -ForegroundColor Yellow
Write-Host "Paste it as the value for FIREBASE_SERVICE_ACCOUNT in Render Dashboard" -ForegroundColor Cyan

# Save to file for easy copying
$base64 | Out-File -FilePath "serviceAccountKey.base64.txt" -Encoding ASCII -NoNewline
Write-Host "`nAlso saved to: serviceAccountKey.base64.txt" -ForegroundColor Green
