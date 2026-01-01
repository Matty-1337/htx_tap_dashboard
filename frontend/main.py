"""
FastAPI Backend for HTX TAP Analytics
Deployed on Railway
"""

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError
from typing import Optional, Dict, Any
import logging
from supabase import create_client
import os
import json
import time
from datetime import datetime
import pandas as pd
import numpy as np
import uuid
from htx_tap_analytics import run_full_analysis

app = FastAPI(title="HTX TAP Analytics API", version="1.0.0")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global exception handler for RequestValidationError (Pydantic validation)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors with detailed JSON response"""
    errors = exc.errors()
    logger.error(f"Validation error: {errors}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "ValidationError",
            "details": errors,
            "message": "Request validation failed"
        }
    )

# Global exception handler for all unhandled exceptions
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions with JSON response"""
    import traceback
    error_trace = traceback.format_exc()
    logger.error(f"Unhandled exception: {exc.__class__.__name__}: {str(exc)}")
    logger.error(f"Traceback: {error_trace}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "details": f"{exc.__class__.__name__}: {str(exc)}",
            "message": "An unexpected error occurred"
        }
    )

# CORS Configuration
# Allow localhost and all Vercel deployments
def is_allowed_origin(origin: str) -> bool:
    if not origin:
        return False
    allowed = [
        "http://localhost:3000",
        "http://localhost:3001",
    ]
    # Allow all Vercel deployments
    if origin.endswith(".vercel.app"):
        return True
    return origin in allowed

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|.*\.vercel\.app)(:\d+)?",
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
    
    # Strip quotes if present (Railway sometimes adds quotes to env vars)
    url = url.strip('"\'')
    key = key.strip('"\'')
    
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
        truncated = len(obj) > max_rows
        return {
            "data": [serialize_for_json(record) for record in records],
            "total_rows": len(obj),
            "returned_rows": len(df_limited),
            "truncated": truncated,
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

@app.get("/debug/ping")
async def debug_ping():
    """Minimal debug endpoint that cannot fail"""
    return {"ok": True, "ts": datetime.utcnow().isoformat()}

@app.get("/debug/version")
async def debug_version():
    """Deployment version marker for verifying latest commit is deployed"""
    git_commit = os.getenv("GIT_COMMIT_SHA", "2f1ba09")  # Fallback to current commit
    return {
        "git_commit": git_commit[:7] if len(git_commit) > 7 else git_commit,
        "deployed_at": datetime.utcnow().isoformat()
    }

@app.post("/debug/echo")
async def debug_echo(request: Request):
    """Echo endpoint to test if requests reach FastAPI"""
    try:
        # Log request details
        content_type = request.headers.get("content-type", "")
        content_length = request.headers.get("content-length", "unknown")
        logger.info(f"DEBUG ECHO: method=POST, path=/debug/echo, content-type={content_type}, content-length={content_length}")
        
        # Get safe headers subset
        safe_headers = {}
        safe_header_names = [
            "content-type", "content-length", "user-agent",
            "x-forwarded-for", "x-forwarded-proto", "x-forwarded-host", "host"
        ]
        for name in safe_header_names:
            value = request.headers.get(name)
            if value:
                safe_headers[name] = value
        
        # Read and parse body
        body_bytes = await request.body()
        
        # Try to parse as JSON
        try:
            body_text = body_bytes.decode('utf-8')
            body_json = json.loads(body_text)
            return {
                "ok": True,
                "headers": safe_headers,
                "json": body_json
            }
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            # Return raw body (first 200 chars) if JSON parse fails
            body_preview = body_bytes[:200].decode('utf-8', errors='replace')
            return {
                "ok": False,
                "raw": body_preview,
                "error": str(e),
                "headers": safe_headers
            }
    except Exception as e:
        logger.error(f"DEBUG ECHO error: {str(e)}")
        return {
            "ok": False,
            "error": str(e),
            "error_type": type(e).__name__
        }

@app.get("/test-supabase")
async def test_supabase():
    """Test Supabase connection"""
    try:
        url = os.getenv("SUPABASE_URL", "").strip('"\'')
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip('"\'')
        bucket = os.getenv("SUPABASE_BUCKET", "client-data").strip('"\'')
        
        # Validate env vars
        if not url:
            return {"ok": False, "error": "SUPABASE_URL is not set", "url_set": bool(url)}
        if not key:
            return {"ok": False, "error": "SUPABASE_SERVICE_ROLE_KEY is not set", "key_set": bool(key)}
        if not bucket:
            return {"ok": False, "error": "SUPABASE_BUCKET is not set", "bucket_set": bool(bucket)}
        
        # Check key format (should be a JWT with 3 parts separated by dots)
        key_parts = key.split('.')
        if len(key_parts) != 3:
            return {
                "ok": False,
                "error": f"Invalid key format: expected JWT with 3 parts, got {len(key_parts)} parts",
                "key_preview": key[:20] + "..." if len(key) > 20 else key
            }
        
        # Debug info
        debug_info = {
            "url_length": len(url),
            "key_length": len(key),
            "bucket": bucket,
            "bucket_length": len(bucket),
            "url_preview": url[:30] + "..." if len(url) > 30 else url
        }
        
        supabase = get_supabase_client()
        # Try to list files in Melrose folder
        folder = "Melrose"
        files = supabase.storage.from_(bucket).list(folder)
        return {
            "ok": True,
            "supabase_connected": True,
            "bucket": bucket,
            "folder": folder,
            "file_count": len(files) if files else 0,
            "files": files[:5] if files else [],  # First 5 files
            "debug": debug_info
        }
    except Exception as e:
        import traceback
        return {
            "ok": False,
            "error": str(e),
            "traceback": traceback.format_exc()[-500:]
        }

@app.post("/run")
async def run_analysis(request: RunRequest):
    """Run full analysis for a client"""
    # Generate unique request ID for correlation
    request_id = str(uuid.uuid4())
    start_time = time.time()
    
    # FIRST-LINE logging with unique marker
    params_keys = list(request.params.keys()) if request.params else []
    logger.info(f"RUN_START request_id={request_id} clientId={request.clientId} params_keys={params_keys}")
    
    # Force error switch to test JSON response bodies
    if request.params.get("__force_error") is True:
        logger.info(f"RUN_START force_error triggered request_id={request_id}")
        return JSONResponse(
            status_code=400,
            content={
                "error": "ForcedError",
                "request_id": request_id,
                "clientId": request.clientId,
                "note": "force error triggered"
            }
        )
    
    try:
        # Validate clientId
        folder = get_client_folder(request.clientId)
        
        # Get Supabase client
        try:
            supabase = get_supabase_client()
        except ValueError as e:
            logger.error(f"Supabase configuration error: {str(e)}")
            error_detail = {
                "error": "ConfigurationError",
                "details": str(e),
                "message": f"{str(e)}. Hint: Check that SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are set"
            }
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_detail
            )
        
        bucket = os.getenv("SUPABASE_BUCKET", "client-data")
        
        # Extract params
        upload_to_db = request.params.get("upload_to_db", False)
        report_period = request.params.get("report_period")
        
        # Run analysis
        try:
            results = run_full_analysis(
                supabase,
                bucket,
                folder,
                upload_to_db=upload_to_db,
                report_period=report_period
            )
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            error_msg = str(e)
            error_type = e.__class__.__name__
            # Log full error for debugging
            logger.error(f"ERROR in run_full_analysis: {error_type}: {error_msg}")
            logger.error(f"TRACEBACK: {error_trace}")
            # Return structured error
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": "RunFailed",
                    "details": f"{error_type}: {error_msg}",
                    "message": f"Analysis execution failed: {error_msg}. Hint: Check that CSV files exist in Supabase Storage folder and data format is correct."
                }
            )
        
        # Check for errors
        if isinstance(results, dict) and "error" in results:
            error_msg = results.get('error', 'Unknown error')
            error_details = results.get('details', error_msg)
            logger.error(f"Analysis returned error: {error_msg}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "AnalysisError",
                    "details": error_details,
                    "message": f"{error_msg}. Hint: Upload CSV files to client-data/{folder}/"
                }
            )
        
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
        
        response_data = {
            "clientId": request.clientId,
            "folder": folder,
            "generatedAt": datetime.utcnow().isoformat(),
            "kpis": kpis,
            "charts": charts,
            "tables": tables,
            "executionTimeSeconds": round(execution_time, 2)
        }
        logger.info(f"Analysis completed successfully for {request.clientId} in {execution_time:.2f}s")
        return response_data
        
    except HTTPException as e:
        # Convert HTTPException to JSONResponse with request_id
        error_detail = e.detail if isinstance(e.detail, dict) else {"message": str(e.detail)}
        error_detail["request_id"] = request_id
        logger.error(f"HTTPException in /run: status={e.status_code} request_id={request_id}")
        return JSONResponse(
            status_code=e.status_code,
            content={
                "error": "HTTPException",
                "detail": error_detail,
                "request_id": request_id
            }
        )
    except ValueError as e:
        logger.error(f"ValueError in /run: {str(e)} request_id={request_id}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "InvalidRequest",
                "details": str(e),
                "message": f"{str(e)}. Hint: clientId must be one of: melrose, bestregard, fancy",
                "request_id": request_id
            }
        )
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        error_msg = str(e)
        error_type = e.__class__.__name__
        logger.error(f"Unhandled exception in /run: {error_type}: {error_msg} request_id={request_id}")
        logger.error(f"Traceback: {error_trace}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Unhandled",
                "details": f"{error_type}: {error_msg}",
                "request_id": request_id
            }
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
