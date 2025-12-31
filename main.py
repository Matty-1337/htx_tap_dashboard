from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, PlainTextResponse, Response
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uuid
import logging

app = FastAPI()
logger = logging.getLogger(__name__)

class RunRequest(BaseModel):
    clientId: str
    params: Dict[str, Any] = {}

@app.post("/run")
async def run_handler(request: RunRequest):
    # STEP 2: FIRST-LINE logging + request echo (safe)
    request_id = str(uuid.uuid4())
    logger.info("RUN_START")
    logger.info(f"request_id={request_id}, clientId={request.clientId}, params_keys={list(request.params.keys())}")
    
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
        # Your existing /run logic here
        # This is where the actual processing would happen
        
        # Example validation that might return 400
        if not request.clientId:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "MissingClientId",
                    "details": "clientId is required",
                    "request_id": request_id
                }
            )
        
        # Example of other validation
        if "invalid_param" in request.params:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "InvalidParameter",
                    "details": "invalid_param is not allowed",
                    "request_id": request_id
                }
            )
        
        # Success case
        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "request_id": request_id,
                "clientId": request.clientId
            }
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
