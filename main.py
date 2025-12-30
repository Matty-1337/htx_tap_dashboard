"""
FastAPI Backend for HTX TAP Analytics
Deployed on Railway
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
from supabase import create_client
import os
import json
import time
from datetime import datetime
import pandas as pd
import numpy as np
from htx_tap_analytics import run_full_analysis

app = FastAPI(title="HTX TAP Analytics API", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Client Folder Mapping
CLIENT_FOLDER_MAP = {
    "melrose": "Melrose",
    "bestregard": "Bestregard",
    "fancy": "Fancy"
}

def get_supabase_client():
    """Initialize Supabase client from environment variables"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    
    return create_client(url, key)

def get_client_folder(client_id: str) -> str:
    """Map clientId to Supabase Storage folder path"""
    normalized = client_id.lower()
    if normalized not in CLIENT_FOLDER_MAP:
        raise ValueError(f"Unknown clientId: {client_id}. Must be one of: {list(CLIENT_FOLDER_MAP.keys())}")
    return CLIENT_FOLDER_MAP[normalized]

def serialize_for_json(obj: Any, max_rows: int = 500) -> Any:
    """Recursively serialize objects to JSON-compatible types"""
    if isinstance(obj, pd.DataFrame):
        # Limit rows and convert to records
        df_limited = obj.head(max_rows)
        records = df_limited.to_dict(orient="records")
        # Convert numpy types in records
        return {
            "data": [serialize_for_json(record) for record in records],
            "total_rows": len(obj),
            "returned_rows": len(df_limited),
            "columns": list(obj.columns)
        }
    elif isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: serialize_for_json(v, max_rows) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_for_json(item, max_rows) for item in obj]
    elif pd.isna(obj):
        return None
    else:
        return obj

class RunRequest(BaseModel):
    clientId: str
    params: Optional[Dict[str, Any]] = {}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"ok": True, "timestamp": datetime.utcnow().isoformat()}

@app.post("/run")
async def run_analysis(request: RunRequest):
    """Run full analysis for a client"""
    start_time = time.time()
    
    try:
        # Validate clientId
        folder = get_client_folder(request.clientId)
        
        # Get Supabase client
        supabase = get_supabase_client()
        bucket = os.getenv("SUPABASE_BUCKET", "client-data")
        
        # Extract params
        upload_to_db = request.params.get("upload_to_db", False)
        report_period = request.params.get("report_period")
        
        # Run analysis
        results = run_full_analysis(
            supabase,
            bucket,
            folder,
            upload_to_db=upload_to_db,
            report_period=report_period
        )
        
        # Check for errors
        if isinstance(results, dict) and "error" in results:
            raise HTTPException(status_code=400, detail=results["error"])
        
        # Serialize results
        serialized = serialize_for_json(results)
        
        execution_time = time.time() - start_time
        
        # Extract KPIs, charts, and tables from results
        kpis = {}
        charts = {}
        tables = {}
        
        # Extract KPIs from summaries
        if "bottle_summary" in serialized:
            kpis["bottle_conversion_pct"] = serialized["bottle_summary"].get("bottle_pct", 0)
            kpis["bottle_premium"] = serialized["bottle_summary"].get("bottle_premium", 0)
        
        if "attachment_summary" in serialized:
            kpis["food_attachment_rate"] = serialized["attachment_summary"].get("overall_rate", 0)
            kpis["missed_revenue"] = serialized["attachment_summary"].get("total_missed_revenue", 0)
        
        # Extract chart data (hourly analysis for line chart)
        if "hourly_analysis" in serialized and "data" in serialized["hourly_analysis"]:
            charts["hourly_revenue"] = serialized["hourly_analysis"]["data"]
        
        # Extract day of week analysis
        if "dow_analysis" in serialized and "data" in serialized["dow_analysis"]:
            charts["day_of_week"] = serialized["dow_analysis"]["data"]
        
        # Extract tables (waste efficiency, employee performance, etc.)
        if "waste_efficiency" in serialized and "data" in serialized["waste_efficiency"]:
            tables["waste_efficiency"] = serialized["waste_efficiency"]
        
        if "employee_performance" in serialized and "data" in serialized["employee_performance"]:
            tables["employee_performance"] = serialized["employee_performance"]
        
        if "menu_volatility" in serialized and "data" in serialized["menu_volatility"]:
            tables["menu_volatility"] = serialized["menu_volatility"]
        
        return {
            "clientId": request.clientId,
            "generatedAt": datetime.utcnow().isoformat(),
            "kpis": kpis,
            "charts": charts,
            "tables": tables,
            "executionTimeSeconds": round(execution_time, 2),
            "rawResults": serialized  # Include full results for advanced use
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}",
            hint="Check that Supabase credentials are correct and client folder exists"
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
