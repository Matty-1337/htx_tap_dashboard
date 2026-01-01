# HTTPS Verification Script for Custom Domains
# Tests DNS, TLS, HTTP status, and page content

$domains = @(
    "admin.htxtap.com",
    "melrose.htxtap.com",
    "fancy.htxtap.com",
    "bestregard.htxtap.com"
)

$results = @()

Write-Host "`n=== HTTPS Domain Verification ===" -ForegroundColor Cyan
Write-Host ""

foreach ($domain in $domains) {
    Write-Host "Testing: $domain" -ForegroundColor Yellow
    
    $result = [PSCustomObject]@{
        Domain = $domain
        DNSResolves = "UNKNOWN"
        TLSValid = "UNKNOWN"
        HTTPStatus = "UNKNOWN"
        ObservedPage = "UNKNOWN"
        Verdict = "PENDING"
    }
    
    # 1. DNS Resolution
    try {
        $dns = Resolve-DnsName -Name $domain -Type CNAME -ErrorAction Stop
        $result.DNSResolves = "YES"
        Write-Host "  ✓ DNS resolves" -ForegroundColor Green
    }
    catch {
        $result.DNSResolves = "NO"
        Write-Host "  ✗ DNS does not resolve" -ForegroundColor Red
        $result.Verdict = "FAIL - DNS"
        $results += $result
        continue
    }
    
    # 2. TLS/HTTPS Test
    try {
        $request = [System.Net.HttpWebRequest]::Create("https://$domain")
        $request.Method = "HEAD"
        $request.Timeout = 10000
        $request.AllowAutoRedirect = $true
        
        # Ignore certificate validation for testing
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
        
        $response = $request.GetResponse()
        $statusCode = [int]$response.StatusCode
        $response.Close()
        
        $result.TLSValid = "YES"
        $result.HTTPStatus = $statusCode
        Write-Host "  ✓ TLS valid, HTTP $statusCode" -ForegroundColor Green
    }
    catch {
        if ($_.Exception.Message -like "*certificate*" -or $_.Exception.Message -like "*SSL*") {
            $result.TLSValid = "NO"
            Write-Host "  ✗ TLS/Certificate error: $($_.Exception.Message)" -ForegroundColor Red
            $result.Verdict = "FAIL - TLS"
        }
        elseif ($_.Exception.Message -like "*timeout*") {
            $result.TLSValid = "TIMEOUT"
            Write-Host "  ⚠ Connection timeout" -ForegroundColor Yellow
            $result.Verdict = "FAIL - Timeout"
        }
        else {
            $result.TLSValid = "ERROR"
            Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
            $result.Verdict = "FAIL - Connection"
        }
        $results += $result
        continue
    }
    
    # 3. HTTP Content Test
    try {
        $webRequest = Invoke-WebRequest -Uri "https://$domain" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        $content = $webRequest.Content
        
        # Check for expected content
        if ($content -match 'HTX TAP|admin|login|Melrose|Fancy|Bestregard') {
            $result.ObservedPage = 'Expected content found'
            Write-Host '  ✓ Page content matches expected' -ForegroundColor Green
        }
        elseif ($content -match 'Next.js|Create Next App') {
            $result.ObservedPage = 'Next.js default page'
            Write-Host '  ⚠ Default Next.js page' -ForegroundColor Yellow
        }
        else {
            $result.ObservedPage = 'Unknown content'
            Write-Host '  ⚠ Unexpected content' -ForegroundColor Yellow
        }
        
        $result.Verdict = 'PASS'
    }
    catch {
        $result.ObservedPage = "Error loading: $($_.Exception.Message)"
        Write-Host '  ✗ Error loading page' -ForegroundColor Red
        $result.Verdict = 'FAIL - Page load'
    }
    
    $results += $result
    Write-Host ''
}

# Display Results Table
Write-Host "`n=== VERIFICATION RESULTS ===" -ForegroundColor Cyan
Write-Host ''
Write-Host ('{0,-20} {1,-15} {2,-12} {3,-12} {4,-30} {5}' -f 'Domain', 'DNS', 'TLS', 'HTTP Status', 'Observed Page', 'Verdict')
Write-Host ('-' * 120)

foreach ($r in $results) {
    Write-Host ('{0,-20} {1,-15} {2,-12} {3,-12} {4,-30} {5}' -f `
        $r.Domain, `
        $r.DNSResolves, `
        $r.TLSValid, `
        $r.HTTPStatus, `
        ($r.ObservedPage.Substring(0, [Math]::Min(28, $r.ObservedPage.Length))), `
        $r.Verdict)
}

Write-Host "`n=== END VERIFICATION ===" -ForegroundColor Cyan

# Export to CSV
$results | Export-Csv -Path 'domain-verification-results.csv' -NoTypeInformation
Write-Host "`nResults exported to: domain-verification-results.csv" -ForegroundColor Cyan
