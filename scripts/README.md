# Backend Scripts

## run_backend.ps1

Starts the FastAPI backend server locally.

**Usage:**
```powershell
.\scripts\run_backend.ps1
```

**What it does:**
- Navigates to repo root
- Checks for .env file (warns if missing)
- Activates virtual environment if present
- Starts uvicorn with: `uvicorn main:app --reload --port 8000`

**Server endpoints:**
- API docs: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health
- Run endpoint: http://127.0.0.1:8000/run (POST)

**Requirements:**
- Python 3.x
- uvicorn installed: `pip install uvicorn[standard]`
- .env file with Supabase credentials (for data loading)

## test_step5_charts.ps1

Tests the `/run` endpoint and validates Step 5 chart structure.

**Usage:**
```powershell
# Test with default client (fancy)
.\scripts\test_step5_charts.ps1

# Test with specific client
.\scripts\test_step5_charts.ps1 -clientId melrose
```

**What it validates:**
- `/run` endpoint responds to POST requests
- `charts.hour_of_day` exists with 24 rows (0-23)
- `charts.day_of_week` exists with 7 rows (Monday-Sunday)
- Keys match: `Hour`/`Day`, `Net Price`, `Order Id`
- All hours/days present (no gaps)

**Requirements:**
- Backend must be running (use `run_backend.ps1` first)
- Supabase credentials configured in .env

## Testing the /run endpoint manually

**Using PowerShell:**
```powershell
$body = @{
    clientId = "fancy"
    params = @{
        dateRange = @{
            preset = "30d"
        }
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://127.0.0.1:8000/run" -Method POST -ContentType "application/json" -Body $body
```

**Using curl:**
```bash
curl -X POST http://127.0.0.1:8000/run \
  -H "Content-Type: application/json" \
  -d '{"clientId":"fancy","params":{"dateRange":{"preset":"30d"}}}'
```

## Notes

- The `/run` endpoint is **POST only** (GET will return 405 Method Not Allowed)
- Backend requires Supabase credentials for data loading
- Charts use "Order Date" as single source of truth for time attribution
