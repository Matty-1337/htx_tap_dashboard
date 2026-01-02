# Local FastAPI Backend Run Guide

## Quick Start

### 1. Start the Backend Server

```powershell
.\scripts\run_backend.ps1
```

**Or manually:**
```powershell
cd C:\Users\matt\Github_Vercel_Railway
uvicorn main:app --reload --port 8000 --host 127.0.0.1
```

### 2. Verify Server is Running

Open in browser: http://127.0.0.1:8000/docs

Or test health endpoint:
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -Method GET
```

### 3. Test Step 5 Charts

```powershell
.\scripts\test_step5_charts.ps1
```

## FastAPI Entrypoint

- **File**: `main.py` (root directory)
- **FastAPI instance**: `app = FastAPI()`
- **Uvicorn command**: `uvicorn main:app --reload --port 8000`

## /run Endpoint

- **Method**: `POST` (not GET)
- **URL**: `http://127.0.0.1:8000/run`
- **Content-Type**: `application/json`

### Request Body Format

```json
{
  "clientId": "fancy",
  "params": {
    "dateRange": {
      "preset": "30d"
    }
  }
}
```

### Test with PowerShell

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

### Test with curl

```bash
curl -X POST http://127.0.0.1:8000/run \
  -H "Content-Type: application/json" \
  -d '{"clientId":"fancy","params":{"dateRange":{"preset":"30d"}}}'
```

## Step 5 Chart Validation

The `/run` endpoint should return charts with this structure:

```json
{
  "charts": {
    "hour_of_day": [
      { "Hour": 0, "Net Price": 1234.56, "Order Id": 98 },
      { "Hour": 1, "Net Price": 0, "Order Id": 0 },
      ...
      { "Hour": 23, "Net Price": 0, "Order Id": 0 }
    ],
    "day_of_week": [
      { "Day": "Monday", "Net Price": 1234.56, "Order Id": 98 },
      { "Day": "Tuesday", "Net Price": 0, "Order Id": 0 },
      ...
      { "Day": "Sunday", "Net Price": 0, "Order Id": 0 }
    ],
    "hourly_revenue": [...]  // Legacy compatibility
  }
}
```

### Validation Checklist

- [ ] `charts.hour_of_day` exists (or `charts.hourly_revenue` for legacy)
- [ ] `hour_of_day` has exactly 24 rows (Hour 0-23)
- [ ] `hour_of_day` keys: `Hour`, `Net Price`, `Order Id`
- [ ] `charts.day_of_week` exists
- [ ] `day_of_week` has exactly 7 rows (Monday-Sunday)
- [ ] `day_of_week` keys: `Day`, `Net Price`, `Order Id`
- [ ] All hours 0-23 present (missing hours filled with 0)
- [ ] All days Monday-Sunday present (missing days filled with 0)

## Requirements

### Environment Variables (.env file)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_BUCKET=client-data
```

### Python Dependencies

Install from `requirements.txt`:
```powershell
pip install -r requirements.txt
```

Key dependencies:
- `fastapi>=0.104.0`
- `uvicorn[standard]>=0.24.0`
- `pandas>=2.0.0`
- `supabase>=2.0.0`

## Troubleshooting

### "Could not import module app"

**Solution**: Use `main:app` not `app:app`
```powershell
uvicorn main:app --reload --port 8000
```

### "405 Method Not Allowed" on GET /run

**Expected**: The `/run` endpoint is POST only. Use POST method.

### "Missing Supabase configuration"

**Solution**: Create `.env` file in repo root with Supabase credentials.

### Charts missing or empty

**Check**:
1. Supabase credentials are correct
2. Client data files exist in Supabase storage
3. CSV files have "Order Date" column (case-insensitive)
4. Backend logs show successful data loading

## Step 5 Implementation Notes

- **Single Source of Truth**: "Order Date" column is used for all time-based attribution
- **Hour Extraction**: `pd.to_datetime(df["Order Date"]).dt.hour`
- **Day Extraction**: `pd.to_datetime(df["Order Date"]).dt.day_name()`
- **Rationale**: Staffing/ops alignment requires guest-arrival ordering time, not payment time

## Available Scripts

- `scripts/run_backend.ps1` - Start the FastAPI server
- `scripts/test_step5_charts.ps1` - Validate Step 5 chart structure
- `scripts/test_imports.py` - Verify FastAPI app can be imported
