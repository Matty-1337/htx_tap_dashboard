# Check Vercel Domain Status and Attempt Refresh
# Requires VERCEL_TOKEN environment variable

$PROJECT_ID = "prj_CGLzP4lTltINMbVm4RmHaIcm5VoS"
$TEAM_ID = "team_kgRp7Kzba7eCCsjTGExWvxi6"
$API_BASE = "https://api.vercel.com"

# Get Vercel token
$TOKEN = $env:VERCEL_TOKEN
if (-not $TOKEN) {
    Write-Host "VERCEL_TOKEN not found. Cannot check domain status via API." -ForegroundColor Yellow
    Write-Host "Please check domains manually at:" -ForegroundColor Cyan
    Write-Host "https://vercel.com/mattys-projects-7bbe0a37/htx-tap-portal/settings/domains" -ForegroundColor Cyan
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}

Write-Host "Checking domain status for project $PROJECT_ID..." -ForegroundColor Cyan

try {
    # Get project domains
    $response = Invoke-RestMethod -Uri "$API_BASE/v10/projects/$PROJECT_ID/domains?teamId=$TEAM_ID" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Host "`nCurrent Domains:" -ForegroundColor Green
    foreach ($domain in $response.domains) {
        Write-Host "  - $($domain.name)" -ForegroundColor White
        Write-Host "    Status: $($domain.status)" -ForegroundColor Gray
        Write-Host "    SSL: $($domain.ssl.status)" -ForegroundColor Gray
        if ($domain.name -eq "*.htxtap.com") {
            Write-Host "    ⚠️  Wildcard domain found!" -ForegroundColor Yellow
        }
    }
}
catch {
    Write-Host "Error checking domains: $($_.Exception.Message)" -ForegroundColor Red
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($errorDetails) {
        Write-Host "Details: $($errorDetails.error.message)" -ForegroundColor Red
    }
}
