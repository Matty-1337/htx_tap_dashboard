# Railway Backend Plan - FastAPI Wrapper

## Overview
Create a thin FastAPI wrapper around the existing `run_full_analysis()` function to enable Next.js frontend integration.

## Architecture

### FastAPI Application Structure
```
main.py (FastAPI app)
├── /health (GET) - Health check endpoint
├── /run (POST) - Execute analysis for a client
└── Dependencies:
    ├── htx_tap_analytics.run_full_analysis()
    ├── supabase client initialization
    └── CORS middleware for Next.js
```

## Endpoint Specifications

### GET /health
**Purpose**: Health check for Railway monitoring

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

### POST /run
**Purpose**: Execute full analysis for a client

**Request Body**:
```json
{
  "clientId": "melrose",
  "params": {
    "upload_to_db": false,
    "report_period": "2025-01"
  }
}
```

**Response**:
```json
{
  "success": true,
  "clientId": "melrose",
  "results": {
    "waste_efficiency": [...],
    "bottle_conversion": [...],
    "menu_volatility": [...],
    // ... all analysis results
  },
  "metadata": {
    "execution_time_seconds": 45.2,
    "timestamp": "2025-01-01T12:00:00Z"
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "No sales data found",
  "clientId": "melrose"
}
```

## Client Folder Selection Logic

### Mapping Strategy
```python
CLIENT_FOLDER_MAP = {
    "melrose": "Melrose",
    "bestregard": "Bestregard",
    "fancy": "Fancy"
}

def get_client_folder(client_id: str) -> str:
    """Map clientId to Supabase Storage folder path."""
    normalized = client_id.lower()
    return CLIENT_FOLDER_MAP.get(normalized, client_id.title())
```

### Supabase Path Construction
- Bucket: From `SUPABASE_BUCKET` env var (default: "client-data")
- Folder: `{clientId}` -> `{folder_name}/` (e.g., "melrose" -> "Melrose/")
- File paths: `{folder_name}/{filename}.csv`

## Caching Strategy (Optional)

### JSON Results Cache
Store analysis results in Supabase Storage for quick retrieval:

**Path Pattern**: `{clientId}/outputs/latest.json`

**Implementation**:
```python
def cache_results(client, bucket, client_id, results):
    """Write results to Supabase Storage as JSON."""
    cache_path = f"{client_id}/outputs/latest.json"
    results_json = json.dumps(results, default=str, indent=2)
    
    client.storage.from_(bucket).upload(
        cache_path,
        results_json.encode('utf-8'),
        file_options={"content-type": "application/json"}
    )

def get_cached_results(client, bucket, client_id):
    """Retrieve cached results if available."""
    cache_path = f"{client_id}/outputs/latest.json"
    try:
        response = client.storage.from_(bucket).download(cache_path)
        return json.loads(response.decode('utf-8'))
    except:
        return None
```

**Cache Invalidation**: 
- Option 1: Time-based (e.g., cache expires after 1 hour)
- Option 2: Manual refresh via `?refresh=true` query param
- Option 3: Always regenerate (no cache)

## FastAPI Implementation Sketch

```python
# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client
import os
from htx_tap_analytics import run_full_analysis
import time
import json

app = FastAPI(title="HTX TAP Analytics API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev
        os.getenv("NEXTJS_URL", "https://your-app.vercel.app")  # Production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase Client
def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

# Client Folder Mapping
CLIENT_FOLDER_MAP = {
    "melrose": "Melrose",
    "bestregard": "BestRegard",
    "fancies": "Fancies"
}

def get_client_folder(client_id: str) -> str:
    normalized = client_id.lower()
    return CLIENT_FOLDER_MAP.get(normalized, client_id.title())

@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": time.time()}

@app.post("/run")
async def run_analysis(request: dict):
    client_id = request.get("clientId")
    params = request.get("params", {})
    
    if not client_id:
        raise HTTPException(status_code=400, detail="clientId required")
    
    # Get Supabase client
    supabase = get_supabase_client()
    bucket = os.getenv("SUPABASE_BUCKET", "client-data")
    folder = get_client_folder(client_id)
    
    # Run analysis
    start_time = time.time()
    try:
        results = run_full_analysis(
            supabase,
            bucket,
            folder,
            upload_to_db=params.get("upload_to_db", False),
            report_period=params.get("report_period")
        )
        
        execution_time = time.time() - start_time
        
        # Convert DataFrames to dict for JSON serialization
        serialized_results = {}
        for key, value in results.items():
            if hasattr(value, 'to_dict'):  # DataFrame
                serialized_results[key] = value.to_dict('records')
            elif isinstance(value, dict):
                serialized_results[key] = value
            elif isinstance(value, list):
                serialized_results[key] = value
            else:
                serialized_results[key] = str(value)
        
        return {
            "success": True,
            "clientId": client_id,
            "results": serialized_results,
            "metadata": {
                "execution_time_seconds": round(execution_time, 2),
                "timestamp": time.time()
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "clientId": client_id
        }
```

## Railway Deployment Configuration

### Nixpacks Detection
- Detects Python from `requirements.txt`
- Installs dependencies automatically
- Runs `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Required Files
1. `main.py` - FastAPI application
2. `requirements.txt` - Add: `fastapi>=0.104.0`, `uvicorn[standard]>=0.24.0`
3. `Procfile` (optional): `web: uvicorn main:app --host 0.0.0.0 --port $PORT`

### Environment Variables (Railway)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (redacted in logs)
- `SUPABASE_BUCKET` - Storage bucket name (default: "client-data")
- `PORT` - Railway auto-provides
- `NEXTJS_URL` - Frontend URL for CORS (optional)

## Next Steps

1. **Create `main.py`** with FastAPI wrapper
2. **Update `requirements.txt`** with FastAPI dependencies
3. **Test locally**: `uvicorn main:app --reload`
4. **Deploy to Railway**: Link repo, set env vars, deploy
5. **Verify endpoints**: Test `/health` and `/run` with Postman/curl
6. **Integrate with Next.js**: Add API client in frontend

## Notes

- Analysis may take 30-60 seconds - consider async/background jobs for production
- Results are large - consider pagination or summary endpoints
- Error handling should be comprehensive (network errors, missing data, etc.)
- Add request logging for debugging
- Consider rate limiting for production
