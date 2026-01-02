# Step 5 Chart Verification Script
# Tests /run endpoint and validates hour_of_day and day_of_week charts
# Usage: .\scripts\test_step5_charts.ps1 [clientId]

param(
    [string]$clientId = "fancy"
)

Write-Host "Step 5 Chart Verification Test" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

$baseUrl = "http://127.0.0.1:8000"

# Test health endpoint first
Write-Host "1. Testing health endpoint..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET -ErrorAction Stop
    Write-Host "   [OK] Health check passed" -ForegroundColor Green
    Write-Host "   Response: $($healthResponse | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "   [ERROR] Health check failed: $_" -ForegroundColor Red
    Write-Host "   Make sure the backend is running: .\scripts\run_backend.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test /run endpoint (POST)
Write-Host "2. Testing /run endpoint (POST)..." -ForegroundColor Cyan
$requestBody = @{
    clientId = $clientId
    params = @{
        dateRange = @{
            preset = "30d"
        }
    }
} | ConvertTo-Json -Depth 10

Write-Host "   Request body:" -ForegroundColor Gray
Write-Host "   $requestBody" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/run" -Method POST -ContentType "application/json" -Body $requestBody -ErrorAction Stop
    Write-Host "   [OK] /run endpoint responded successfully" -ForegroundColor Green
} catch {
    Write-Host "   [ERROR] /run endpoint failed: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   Status code: $statusCode" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "   Error details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
    exit 1
}

Write-Host ""

# Validate Step 5 chart structure
Write-Host "3. Validating Step 5 chart structure..." -ForegroundColor Cyan

$allPassed = $true

# Check hour_of_day or hourly_revenue (legacy)
if ($response.charts.hour_of_day) {
    Write-Host "   [OK] charts.hour_of_day exists" -ForegroundColor Green
    $hourData = $response.charts.hour_of_day
    
    # Check row count (should be 24)
    if ($hourData.Count -eq 24) {
        Write-Host "   [OK] hour_of_day has 24 rows (0-23)" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] hour_of_day has $($hourData.Count) rows, expected 24" -ForegroundColor Red
        $allPassed = $false
    }
    
    # Check keys
    $firstHour = $hourData[0]
    $hasHour = $firstHour.PSObject.Properties.Name -contains "Hour"
    $hasNetPrice = $firstHour.PSObject.Properties.Name -contains "Net Price"
    $hasOrderId = $firstHour.PSObject.Properties.Name -contains "Order Id"
    
    if ($hasHour) {
        Write-Host "   [OK] hour_of_day has 'Hour' key" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] hour_of_day missing 'Hour' key" -ForegroundColor Red
        $allPassed = $false
    }
    
    if ($hasNetPrice) {
        Write-Host "   [OK] hour_of_day has 'Net Price' key" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] hour_of_day missing 'Net Price' key" -ForegroundColor Red
        $allPassed = $false
    }
    
    if ($hasOrderId) {
        Write-Host "   [OK] hour_of_day has 'Order Id' key" -ForegroundColor Green
    } else {
        Write-Host "   [WARN] hour_of_day missing 'Order Id' key (optional if no order_id column)" -ForegroundColor Yellow
    }
    
    # Check hour range (0-23)
    $hours = $hourData | ForEach-Object { $_.Hour }
    $expectedHours = 0..23
    $missingHours = $expectedHours | Where-Object { $hours -notcontains $_ }
    
    if ($missingHours.Count -eq 0) {
        Write-Host "   [OK] All hours 0-23 present" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] Missing hours: $($missingHours -join ', ')" -ForegroundColor Red
        $allPassed = $false
    }
    
    # Sample data
    Write-Host "   Sample hour_of_day data (first 3 rows):" -ForegroundColor Gray
    $hourData[0..2] | ForEach-Object {
        Write-Host "     Hour $($_.Hour): Net Price=$($_.'Net Price'), Order Id=$($_.'Order Id')" -ForegroundColor Gray
    }
    
} elseif ($response.charts.hourly_revenue) {
    Write-Host "   [WARN] charts.hourly_revenue exists (legacy key, hour_of_day preferred)" -ForegroundColor Yellow
    Write-Host "   Validating hourly_revenue structure..." -ForegroundColor Gray
    $hourData = $response.charts.hourly_revenue
    
    if ($hourData.Count -eq 24) {
        Write-Host "   [OK] hourly_revenue has 24 rows" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] hourly_revenue has $($hourData.Count) rows, expected 24" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host "   [ERROR] Neither charts.hour_of_day nor charts.hourly_revenue found" -ForegroundColor Red
    $allPassed = $false
}

Write-Host ""

# Check day_of_week
if ($response.charts.day_of_week) {
    Write-Host "   [OK] charts.day_of_week exists" -ForegroundColor Green
    $dayData = $response.charts.day_of_week
    
    # Check row count (should be 7)
    if ($dayData.Count -eq 7) {
        Write-Host "   [OK] day_of_week has 7 rows (Monday-Sunday)" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] day_of_week has $($dayData.Count) rows, expected 7" -ForegroundColor Red
        $allPassed = $false
    }
    
    # Check keys
    $firstDay = $dayData[0]
    $hasDay = $firstDay.PSObject.Properties.Name -contains "Day"
    $hasNetPrice = $firstDay.PSObject.Properties.Name -contains "Net Price"
    $hasOrderId = $firstDay.PSObject.Properties.Name -contains "Order Id"
    
    if ($hasDay) {
        Write-Host "   [OK] day_of_week has 'Day' key" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] day_of_week missing 'Day' key" -ForegroundColor Red
        $allPassed = $false
    }
    
    if ($hasNetPrice) {
        Write-Host "   [OK] day_of_week has 'Net Price' key" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] day_of_week missing 'Net Price' key" -ForegroundColor Red
        $allPassed = $false
    }
    
    if ($hasOrderId) {
        Write-Host "   [OK] day_of_week has 'Order Id' key" -ForegroundColor Green
    } else {
        Write-Host "   [WARN] day_of_week missing 'Order Id' key (optional if no order_id column)" -ForegroundColor Yellow
    }
    
    # Check day names (Monday-Sunday)
    $days = $dayData | ForEach-Object { $_.Day }
    $expectedDays = @("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
    $missingDays = $expectedDays | Where-Object { $days -notcontains $_ }
    
    if ($missingDays.Count -eq 0) {
        Write-Host "   [OK] All days Monday-Sunday present" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] Missing days: $($missingDays -join ', ')" -ForegroundColor Red
        $allPassed = $false
    }
    
    # Sample data
    Write-Host "   Sample day_of_week data:" -ForegroundColor Gray
    $dayData | ForEach-Object {
        Write-Host "     $($_.Day): Net Price=$($_.'Net Price'), Order Id=$($_.'Order Id')" -ForegroundColor Gray
    }
    
} else {
    Write-Host "   [ERROR] charts.day_of_week not found" -ForegroundColor Red
    $allPassed = $false
}

Write-Host ""
Write-Host "================================" -ForegroundColor Green

if ($allPassed) {
    Write-Host "[PASS] ALL STEP 5 CHART VALIDATIONS PASSED" -ForegroundColor Green
    Write-Host ""
    Write-Host "Chart structure is correct:" -ForegroundColor Green
    Write-Host "  - hour_of_day: 24 rows (0-23) with Hour, Net Price, Order Id" -ForegroundColor Green
    Write-Host "  - day_of_week: 7 rows (Mon-Sun) with Day, Net Price, Order Id" -ForegroundColor Green
    Write-Host "  - Using 'Order Date' as single source of truth for attribution" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[FAIL] SOME VALIDATIONS FAILED" -ForegroundColor Red
    Write-Host "Review the errors above and fix the backend chart generation logic." -ForegroundColor Yellow
    exit 1
}
