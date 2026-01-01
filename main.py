from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, PlainTextResponse, Response
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uuid
import logging
import pandas as pd
import os
from pathlib import Path

# Initialize logger first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load .env file for local development (only if not in production)
# Railway provides env vars automatically, so this only affects local/dev
env_file_path = None
env_file_exists = False
if os.getenv("RAILWAY_ENVIRONMENT") is None and os.getenv("VERCEL") is None:
    from dotenv import load_dotenv
    # Use explicit absolute path based on main.py location
    env_file_path = Path(__file__).resolve().parent / ".env"
    env_file_exists = env_file_path.exists()
    if env_file_exists:
        load_dotenv(dotenv_path=env_file_path, override=False)
        logger.info(f"[ENV] .env file exists: True, loaded from: {env_file_path}")
    else:
        logger.info(f"[ENV] .env file exists: False, expected at: {env_file_path}")
else:
    logger.info("[ENV] Running in production (Railway/Vercel), skipping .env load")

# Import date filtering utilities
from date_filter import find_date_column, apply_date_range, RAW_DATE_COL

# Import Supabase Storage utilities
from supabase_storage import load_client_dataframe

# Import analysis pipeline
from analysis_minimal import run_full_analysis

app = FastAPI()

class RunRequest(BaseModel):
    clientId: str
    params: Dict[str, Any] = {}
    
    def get_date_range(self) -> tuple[str | None, str | None]:
        """Extract date range from params if present"""
        date_range = self.params.get('dateRange')
        if not date_range:
            return None, None
        
        start = date_range.get('start')
        end = date_range.get('end')
        # Note: preset is handled in run_full_analysis, not here
        return start, end

@app.get("/debug/list-files")
async def debug_list_files(client: str = "melrose"):
    """
    Debug endpoint to list files in Supabase storage for a client (dev only).
    Returns raw keys separated by prefix source, with NO key reconstruction.
    """
    is_production = os.getenv("RAILWAY_ENVIRONMENT") is not None or os.getenv("VERCEL") is not None
    if is_production:
        return JSONResponse(
            status_code=403,
            content={"error": "Debug endpoint not available in production"}
        )
    
    try:
        from supabase_storage import list_files_raw_by_prefix, SUPABASE_BUCKET
        from urllib.parse import unquote
        
        client_id = client.lower()
        result = list_files_raw_by_prefix(SUPABASE_BUCKET, client_id)
        
        return JSONResponse(
            status_code=200,
            content={
                "bucket": SUPABASE_BUCKET,
                "clientId": client_id,
                "raw_from_prefix_melrose": result["raw_from_prefix_melrose"],
                "raw_from_prefix_Melrose": result["raw_from_prefix_Melrose"],
                "files": result["files"]  # Each entry has: {name, key, source_prefix}
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to list files",
                "details": str(e)
            }
        )

@app.get("/debug/download-key")
async def debug_download_key(bucket: str = "client-data", key: str = None):
    """
    Debug endpoint to download an exact key directly (dev only).
    Key must be URL-encoded in the query parameter.
    """
    is_production = os.getenv("RAILWAY_ENVIRONMENT") is not None or os.getenv("VERCEL") is not None
    if is_production:
        return JSONResponse(
            status_code=403,
            content={"error": "Debug endpoint not available in production"}
        )
    
    if not key:
        return JSONResponse(
            status_code=400,
            content={"error": "key parameter is required"}
        )
    
    try:
        from supabase_storage import download_object_admin
        from urllib.parse import unquote
        
        # Decode the URL-encoded key
        decoded_key = unquote(key)
        
        # Download using exact key (no guardrail, testing raw key)
        file_bytes = download_object_admin(bucket, decoded_key, listed_keys=None)
        
        return JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "bucket": bucket,
                "key": decoded_key,
                "byte_len": len(file_bytes)
            }
        )
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={
                "error": "Download failed",
                "detail": e.detail
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to download file",
                "details": str(e)
            }
        )

@app.get("/debug/try-two")
async def debug_try_two(bucket: str = "client-data", key1: str = None, key2: str = None):
    """
    Debug endpoint to try downloading two keys and return which one succeeds (dev only).
    Keys must be URL-encoded in query parameters.
    """
    is_production = os.getenv("RAILWAY_ENVIRONMENT") is not None or os.getenv("VERCEL") is not None
    if is_production:
        return JSONResponse(
            status_code=403,
            content={"error": "Debug endpoint not available in production"}
        )
    
    if not key1 or not key2:
        return JSONResponse(
            status_code=400,
            content={"error": "key1 and key2 parameters are required"}
        )
    
    try:
        from supabase_storage import download_object_admin
        from urllib.parse import unquote
        
        decoded_key1 = unquote(key1)
        decoded_key2 = unquote(key2)
        
        result = {
            "bucket": bucket,
            "key1": decoded_key1,
            "key2": decoded_key2,
            "key1_status": None,
            "key1_bytes": None,
            "key1_error": None,
            "key2_status": None,
            "key2_bytes": None,
            "key2_error": None,
            "winner": None
        }
        
        # Try key1
        try:
            bytes1 = download_object_admin(bucket, decoded_key1, listed_keys=None)
            result["key1_status"] = "success"
            result["key1_bytes"] = len(bytes1)
            result["winner"] = "key1"
        except HTTPException as e:
            result["key1_status"] = f"http_{e.status_code}"
            result["key1_error"] = str(e.detail)
        except Exception as e:
            result["key1_status"] = "error"
            result["key1_error"] = str(e)
        
        # Try key2
        try:
            bytes2 = download_object_admin(bucket, decoded_key2, listed_keys=None)
            result["key2_status"] = "success"
            result["key2_bytes"] = len(bytes2)
            if not result["winner"]:
                result["winner"] = "key2"
        except HTTPException as e:
            result["key2_status"] = f"http_{e.status_code}"
            result["key2_error"] = str(e.detail)
        except Exception as e:
            result["key2_status"] = "error"
            result["key2_error"] = str(e)
        
        return JSONResponse(
            status_code=200,
            content=result
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to test keys",
                "details": str(e)
            }
        )

@app.get("/debug/download-one")
async def debug_download_one(client: str = "melrose"):
    """
    Smoke test endpoint to download one file (dev only).
    Proves download works independently of /run pipeline.
    """
    is_production = os.getenv("RAILWAY_ENVIRONMENT") is not None or os.getenv("VERCEL") is not None
    if is_production:
        return JSONResponse(
            status_code=403,
            content={"error": "Debug endpoint not available in production"}
        )
    
    try:
        import hashlib
        from supabase_storage import list_files_case_insensitive, download_object_admin, SUPABASE_BUCKET
        
        client_id = client.lower()
        files = list_files_case_insensitive(SUPABASE_BUCKET, client_id)
        
        if not files:
            return JSONResponse(
                status_code=404,
                content={"error": f"No files found for client: {client_id}"}
            )
        
        # Prefer "October_____.csv" if present, otherwise pick first
        # Support both "key" (new format) and "exact_key" (backward compatibility)
        def get_key(file_dict):
            return file_dict.get("key") or file_dict.get("exact_key")
        
        exact_key = None
        for file in files:
            if file.get("name") == "October_____.csv":
                exact_key = get_key(file)
                break
        
        if not exact_key:
            exact_key = get_key(files[0]) if files else None
        
        if not exact_key:
            return JSONResponse(
                status_code=500,
                content={"error": "No valid key found in file list"}
            )
        
        # Get listed keys for guardrail
        listed_keys = {get_key(f) for f in files if get_key(f)}
        
        # Download using exact key
        file_bytes = download_object_admin(SUPABASE_BUCKET, exact_key, listed_keys=listed_keys)
        
        # Calculate SHA1 hash
        sha1_hash = hashlib.sha1(file_bytes).hexdigest()
        
        return JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "key": exact_key,
                "bytes": len(file_bytes),
                "sha1": sha1_hash
            }
        )
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={
                "error": "Download failed",
                "detail": e.detail
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to download file",
                "details": str(e)
            }
        )

@app.get("/health")
async def health_check():
    """
    Health check endpoint that reports environment variable presence (not values).
    """
    # Determine env file path (same logic as startup)
    env_file_info = {"path": None, "exists": False}
    if os.getenv("RAILWAY_ENVIRONMENT") is None and os.getenv("VERCEL") is None:
        env_file_path = Path(__file__).resolve().parent / ".env"
        env_file_info["path"] = str(env_file_path)
        env_file_info["exists"] = env_file_path.exists()
    
    return JSONResponse(
        status_code=200,
        content={
            "ok": True,
            "cwd": os.getcwd(),
            "env_file": env_file_info,
            "env": {
                "SUPABASE_URL": bool(os.getenv("SUPABASE_URL")),
                "SUPABASE_SERVICE_ROLE_KEY": bool(os.getenv("SUPABASE_SERVICE_ROLE_KEY")),
                "SUPABASE_BUCKET": bool(os.getenv("SUPABASE_BUCKET")),
            }
        }
    )

@app.post("/run")
async def run_handler(request: RunRequest):
    # STEP 2: FIRST-LINE logging + request echo (safe)
    request_id = str(uuid.uuid4())
    logger.info("RUN_START")
    logger.info(f"request_id={request_id}, clientId={request.clientId}, params_keys={list(request.params.keys())}")
    
    # Extract date range if present
    date_start, date_end = request.get_date_range()
    if date_start and date_end:
        logger.info(f"Date range: {date_start} to {date_end}")
    
    # STEP 3: Force error switch to prove bodies return
    if request.params.get("__force_error") == True:
        return JSONResponse(
            status_code=400,
            content={
                "error": "ForcedError",
                "request_id": request_id,
                "clientId": request.clientId,
                "note": "force error triggered"
            }
        )
    
    # STEP 5: Wrap entire body in try/except with guaranteed JSONResponse
    try:
        # ============================================================
        # DATA LOADING SECTION
        # ============================================================
        # Load client data from Supabase Storage
        raw_df, load_metadata = load_client_dataframe(request.clientId)
        
        # Log safe metadata (no secrets, no raw data)
        logger.info(f"Data loaded for client: {load_metadata['clientId']}")
        logger.info(f"Selected file: {load_metadata['path']}")
        logger.info(f"File format: {load_metadata['format']}")
        logger.info(f"DataFrame shape: {load_metadata['rows']} rows, {load_metadata['cols']} columns")
        logger.info(f"Column names: {load_metadata['column_names']}")
        
        # ============================================================
        # ANALYSIS SECTION
        # ============================================================
        # Run full analysis pipeline (includes date filtering internally)
        # Pass params dict which may include dateRange
        analysis_result = run_full_analysis(raw_df, request.clientId, request.params)
        
        # Return analysis result (already matches frontend structure)
        return JSONResponse(
            status_code=200,
            content=analysis_result
        )
        
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={
                "error": "HTTPException",
                "detail": e.detail if hasattr(e, 'detail') else str(e),
                "request_id": request_id
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Unhandled",
                "details": f"{type(e).__name__}: {str(e)}",
                "request_id": request_id
            }
        )
