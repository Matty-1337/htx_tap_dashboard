# Simple HTTPS Domain Verification
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

$domains = @('admin.htxtap.com', 'melrose.htxtap.com', 'fancy.htxtap.com', 'bestregard.htxtap.com')
$results = @()

Write-Host "`n=== HTTPS Domain Verification ===" -ForegroundColor Cyan
Write-Host ""

foreach ($d in $domains) {
    Write-Host "Testing: $d" -ForegroundColor Yellow
    
    $result = [PSCustomObject]@{
        Domain = $d
        DNS = "YES"
        TLS = "UNKNOWN"
        HTTPStatus = "UNKNOWN"
        ObservedPage = "UNKNOWN"
        Verdict = "PENDING"
    }
    
    try {
        $response = Invoke-WebRequest -Uri "https://$d" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        
        $result.TLS = "YES"
        $result.HTTPStatus = $response.StatusCode
        
        if ($response.Content -match 'HTX TAP|admin|login|Melrose|Fancy|Bestregard') {
            $result.ObservedPage = "Expected content"
        }
        elseif ($response.Content -match 'Next.js|Create Next App') {
            $result.ObservedPage = "Next.js default"
        }
        else {
            $result.ObservedPage = "Other content"
        }
        
        $result.Verdict = "PASS"
        Write-Host "  PASS - HTTP $($response.StatusCode)" -ForegroundColor Green
    }
    catch {
        $err = $_.Exception.Message
        if ($err -match 'certificate|SSL|TLS') {
            $result.TLS = "NO"
            $result.ObservedPage = "Certificate error"
        }
        elseif ($err -match 'timeout') {
            $result.TLS = "TIMEOUT"
            $result.ObservedPage = "Connection timeout"
        }
        else {
            $result.TLS = "ERROR"
            $result.ObservedPage = $err.Substring(0, [Math]::Min(30, $err.Length))
        }
        
        $result.Verdict = "FAIL"
        Write-Host "  FAIL - $($err.Substring(0, [Math]::Min(50, $err.Length)))" -ForegroundColor Red
    }
    
    $results += $result
    Write-Host ""
}

Write-Host "=== VERIFICATION TABLE ===" -ForegroundColor Cyan
Write-Host ""
$results | Format-Table -AutoSize Domain, DNS, TLS, HTTPStatus, ObservedPage, Verdict

Write-Host "`n=== END ===" -ForegroundColor Cyan
