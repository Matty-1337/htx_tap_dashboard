# FastAPI Backend Run Script
# Usage: .\scripts\run_backend.ps1

Write-Host "Starting FastAPI backend..." -ForegroundColor Green

# Get the script directory and navigate to repo root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
Set-Location $repoRoot

Write-Host "Working directory: $repoRoot" -ForegroundColor Cyan

# Check if .env exists
if (Test-Path ".env") {
    Write-Host ".env file found" -ForegroundColor Green
} else {
    Write-Host "WARNING: .env file not found. Supabase credentials required." -ForegroundColor Yellow
    Write-Host "Create .env with: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET" -ForegroundColor Yellow
}

# Check if virtual environment exists (optional)
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Cyan
    & "venv\Scripts\Activate.ps1"
} elseif (Test-Path ".venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Cyan
    & ".venv\Scripts\Activate.ps1"
} else {
    Write-Host "No virtual environment found, using system Python" -ForegroundColor Yellow
}

# Check if uvicorn is installed
try {
    $uvicornVersion = python -m uvicorn --version 2>&1
    Write-Host "Uvicorn found" -ForegroundColor Green
} catch {
    Write-Host "ERROR: uvicorn not found. Install with: pip install uvicorn[standard]" -ForegroundColor Red
    exit 1
}

Write-Host "`nStarting server on http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "API docs: http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host "Health check: http://127.0.0.1:8000/health" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C to stop`n" -ForegroundColor Yellow

# Run uvicorn with main:app (FastAPI instance is in main.py)
python -m uvicorn main:app --reload --port 8000 --host 127.0.0.1
