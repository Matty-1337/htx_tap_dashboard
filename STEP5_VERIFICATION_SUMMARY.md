# Step 5 Verification Summary

## ✅ Completed Tasks

### A) FastAPI Entrypoint Identified
- **File**: `main.py` (root directory)
- **FastAPI instance**: `app = FastAPI()`
- **Uvicorn command**: `uvicorn main:app --reload --port 8000`
- **Status**: ✅ Verified - imports successfully

### B) Run Script Created
- **Script**: `scripts/run_backend.ps1`
- **Functionality**:
  - Navigates to repo root
  - Checks for .env file
  - Activates virtual environment if present
  - Starts uvicorn with correct module path
- **Status**: ✅ Created and ready to use

### C) Route Method Confirmed
- **Endpoint**: `/run`
- **Method**: `POST` (not GET)
- **Expected behavior**: GET returns 405 Method Not Allowed (this is correct)
- **Status**: ✅ Confirmed via route inspection

### D) Test Script Created
- **Script**: `scripts/test_step5_charts.ps1`
- **Functionality**:
  - Tests health endpoint
  - Tests /run endpoint with POST
  - Validates Step 5 chart structure:
    - `charts.hour_of_day` (24 rows, Hour 0-23)
    - `charts.day_of_week` (7 rows, Monday-Sunday)
    - Keys: `Hour`/`Day`, `Net Price`, `Order Id`
- **Status**: ✅ Created and ready to use

## 📋 Quick Reference

### Start Backend
```powershell
.\scripts\run_backend.ps1
```

### Test Step 5 Charts
```powershell
.\scripts\test_step5_charts.ps1
```

### Manual Test (PowerShell)
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

### Manual Test (curl)
```bash
curl -X POST http://127.0.0.1:8000/run \
  -H "Content-Type: application/json" \
  -d '{"clientId":"fancy","params":{"dateRange":{"preset":"30d"}}}'
```

## 🔍 Step 5 Chart Structure

### Expected Response Structure
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

### Validation Rules
1. ✅ `hour_of_day` has exactly 24 rows (Hour 0-23)
2. ✅ `day_of_week` has exactly 7 rows (Monday-Sunday)
3. ✅ All hours 0-23 present (missing filled with 0)
4. ✅ All days Monday-Sunday present (missing filled with 0)
5. ✅ Keys: `Hour`/`Day`, `Net Price`, `Order Id`
6. ✅ Uses "Order Date" column (case-insensitive) for attribution

## 📝 Implementation Details

### Backend Changes (analysis_minimal.py)
- `_compute_hourly_revenue()`: Uses "Order Date" specifically
- `_compute_day_of_week()`: Uses "Order Date" specifically
- Hour extraction: `pd.to_datetime(df["Order Date"]).dt.hour`
- Day extraction: `pd.to_datetime(df["Order Date"]).dt.day_name()`
- Includes "Order Id" count via `nunique()` aggregation

### Rationale
- **Single Source of Truth**: "Order Date" for all time-based attribution
- **Staffing Alignment**: Guest-arrival ordering time, not payment time
- **Data Integrity**: All hours/days present (no gaps)

## 🚀 Next Steps

1. **Start backend**: `.\scripts\run_backend.ps1`
2. **Run verification**: `.\scripts\test_step5_charts.ps1`
3. **Review results**: Check console output for validation status
4. **Fix issues**: If validations fail, check:
   - Supabase credentials in .env
   - Client data files in Supabase storage
   - CSV files have "Order Date" column
   - Backend logs for errors

## 📚 Documentation

- **Local Run Guide**: `LOCAL_RUN_GUIDE.md`
- **Scripts README**: `scripts/README.md`
- **Backend Code**: `main.py`, `analysis_minimal.py`

## ⚠️ Requirements

- Python 3.x
- uvicorn installed: `pip install uvicorn[standard]`
- .env file with Supabase credentials:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_BUCKET` (default: "client-data")
