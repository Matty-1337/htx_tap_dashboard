# Vercel Domain Configuration Script
# Adds custom domains to htx-tap-portal project

$PROJECT_ID = "prj_CGLzP4lTltINMbVm4RmHaIcm5VoS"
$TEAM_ID = "team_kgRp7Kzba7eCCsjTGExWvxi6"
$API_BASE = "https://api.vercel.com"

# Domains to add
$DOMAINS = @(
    "htxtap.com",
    "*.htxtap.com",
    "admin.htxtap.com"
)

# Get Vercel token from environment or prompt
$TOKEN = $env:VERCEL_TOKEN
if (-not $TOKEN) {
    Write-Host "VERCEL_TOKEN not found in environment."
    Write-Host "Please set it with: `$env:VERCEL_TOKEN = 'your-token'"
    Write-Host "Or get it from: https://vercel.com/account/tokens"
    exit 1
}

Write-Host "Adding domains to project $PROJECT_ID..." -ForegroundColor Cyan

foreach ($domain in $DOMAINS) {
    Write-Host "`nAdding domain: $domain" -ForegroundColor Yellow
    
    $body = @{
        name = $domain
    } | ConvertTo-Json
    
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
        "Content-Type" = "application/json"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE/v10/projects/$PROJECT_ID/domains" `
            -Method POST `
            -Headers $headers `
            -Body $body `
            -ErrorAction Stop
        
        Write-Host "✓ Successfully added: $domain" -ForegroundColor Green
        Write-Host "  Status: $($response.status)" -ForegroundColor Gray
        Write-Host "  SSL: $($response.ssl.status)" -ForegroundColor Gray
    }
    catch {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($errorDetails) {
            Write-Host "✗ Error adding $domain : $($errorDetails.error.message)" -ForegroundColor Red
        } else {
            Write-Host "✗ Error adding $domain : $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "`nDomain configuration complete!" -ForegroundColor Cyan
Write-Host "Check status in Vercel dashboard: https://vercel.com/mattys-projects-7bbe0a37/htx-tap-portal/settings/domains" -ForegroundColor Cyan
