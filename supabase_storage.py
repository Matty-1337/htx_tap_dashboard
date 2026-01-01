"""
Supabase Storage utilities for loading client data files
"""
import os
import logging
from typing import Tuple, Dict, Any, Optional, List
from io import BytesIO
import pandas as pd
import base64
import json
import hashlib
from urllib.parse import urlparse, quote
import httpx
from supabase import create_client, Client
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "client-data")

# Cached client instance
_supabase_client: Optional[Client] = None


def get_supabase_admin_client() -> Client:
    """
    Get or create Supabase client with service role key (shared singleton).
    Validates JWT role in dev mode.
    Raises HTTPException if env vars are missing or role is incorrect.
    """
    global _supabase_client
    
    if _supabase_client is not None:
        return _supabase_client
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        logger.error("Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        raise HTTPException(
            status_code=500,
            detail="Storage access failed: Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file and restart the backend server."
        )
    
    # Dev-only: Decode JWT to verify role (no secret printing)
    is_dev = os.getenv("RAILWAY_ENVIRONMENT") is None and os.getenv("VERCEL") is None
    if is_dev:
        try:
            # JWT format: header.payload.signature
            parts = SUPABASE_SERVICE_ROLE_KEY.split('.')
            if len(parts) >= 2:
                # Decode payload (base64url, but Python's base64 can handle it)
                payload_b64 = parts[1]
                # Add padding if needed
                padding = 4 - len(payload_b64) % 4
                if padding != 4:
                    payload_b64 += '=' * padding
                # Decode
                payload_bytes = base64.urlsafe_b64decode(payload_b64)
                payload = json.loads(payload_bytes)
                role = payload.get('role', 'unknown')
                
                # Extract hostname from URL (safe to log)
                parsed_url = urlparse(SUPABASE_URL)
                hostname = parsed_url.hostname or 'unknown'
                
                logger.info(f"[SUPABASE] Initialized client: hostname={hostname}, key_role={role}")
                
                # Validate role in dev
                if role != 'service_role':
                    error_msg = f"Supabase key role is '{role}', expected 'service_role'. Check SUPABASE_SERVICE_ROLE_KEY env var."
                    logger.error(f"[SUPABASE] {error_msg}")
                    raise HTTPException(
                        status_code=500,
                        detail=error_msg
                    )
        except Exception as e:
            # If JWT decode fails, log but don't block (might be valid key with different format)
            logger.warning(f"[SUPABASE] Could not decode JWT role (non-fatal): {e}")
    
    try:
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        return _supabase_client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        raise HTTPException(
            status_code=502,
            detail="Storage access failed: Could not connect to Supabase"
        )


def list_files_raw_by_prefix(bucket: str, client_id: str) -> Dict[str, Any]:
    """
    List files for a client, returning raw keys exactly as returned by Supabase API.
    Returns separate arrays for each prefix tried, with NO key reconstruction.
    
    Args:
        bucket: Storage bucket name
        client_id: Client identifier (normalized to lowercase)
    
    Returns:
        Dict with:
        - raw_from_prefix_melrose: List of raw key strings from list(prefix="melrose/")
        - raw_from_prefix_Melrose: List of raw key strings from list(prefix="Melrose/")
        - files: List of file objects with {name, key, source_prefix}
    """
    client = get_supabase_admin_client()
    
    # Try lowercase first (most common), then capitalized
    prefixes_to_try = [
        f"{client_id}/",
        f"{client_id.capitalize()}/",
    ]
    
    result = {
        "raw_from_prefix_melrose": [],
        "raw_from_prefix_Melrose": [],
        "files": []
    }
    
    is_dev = os.getenv("RAILWAY_ENVIRONMENT") is None and os.getenv("VERCEL") is None
    if is_dev:
        logger.info(f"[LIST_RAW] Trying prefixes for client '{client_id}': {prefixes_to_try}")
    
    for prefix in prefixes_to_try:
        # Determine which output array to use based on prefix case
        # For "melrose", lowercase prefix -> raw_from_prefix_melrose, capitalized -> raw_from_prefix_Melrose
        if prefix.lower() == f"{client_id}/":
            prefix_key = "raw_from_prefix_melrose"
        elif prefix == f"{client_id.capitalize()}/":
            prefix_key = "raw_from_prefix_Melrose"
        else:
            # Fallback: check if prefix starts with capital
            prefix_key = "raw_from_prefix_Melrose" if prefix[0].isupper() else "raw_from_prefix_melrose"
        raw_keys = []
        
        try:
            response = client.storage.from_(bucket).list(prefix)
            if not response:
                continue
            
            if not isinstance(response, list):
                response = [response] if response else []
            
            for item in response:
                if isinstance(item, dict):
                    name = item.get('name', '')
                    if not name:
                        continue
                    # Supabase list() returns just filenames, so construct key from prefix+name
                    # This IS the raw key - we're using the exact prefix that was queried
                    raw_key = f"{prefix.rstrip('/')}/{name}"
                    raw_keys.append(raw_key)
                    
                    result["files"].append({
                        "name": name,
                        "key": raw_key,
                        "source_prefix": prefix
                    })
                elif isinstance(item, str):
                    # String response - construct key from prefix
                    raw_key = f"{prefix.rstrip('/')}/{item}"
                    raw_keys.append(raw_key)
                    result["files"].append({
                        "name": item,
                        "key": raw_key,
                        "source_prefix": prefix
                    })
            
            result[prefix_key] = raw_keys
            
        except Exception as e:
            if is_dev:
                logger.warning(f"[LIST_RAW] Failed to list prefix '{prefix}': {e}")
            continue
    
    if is_dev:
        logger.info(f"[LIST_RAW] Found {len(result['files'])} files total")
        logger.info(f"[LIST_RAW] Raw keys from melrose/: {len(result['raw_from_prefix_melrose'])}")
        logger.info(f"[LIST_RAW] Raw keys from Melrose/: {len(result['raw_from_prefix_Melrose'])}")
    
    return result


def list_files_case_insensitive(bucket: str, client_id: str) -> List[Dict[str, Any]]:
    """
    List files for a client, trying multiple case variations of the prefix.
    Returns files with their exact object keys as returned by Supabase (zero mutation).
    
    Args:
        bucket: Storage bucket name
        client_id: Client identifier (normalized to lowercase)
    
    Returns:
        List of file objects with exact object keys (exact_key field)
    """
    client = get_supabase_admin_client()
    
    # Try capitalized first (actual stored keys are capitalized), then lowercase as fallback
    # This ensures we construct keys with the correct case that matches what's actually stored
    prefixes_to_try = [
        f"{client_id.capitalize()}/",
        f"{client_id}/",
    ]
    
    all_files = []
    seen_keys = set()
    
    is_dev = os.getenv("RAILWAY_ENVIRONMENT") is None and os.getenv("VERCEL") is None
    if is_dev:
        logger.info(f"[LIST] Trying prefixes for client '{client_id}': {prefixes_to_try}")
    
    for prefix in prefixes_to_try:
        try:
            response = client.storage.from_(bucket).list(prefix)
            if not response:
                continue
            
            if not isinstance(response, list):
                response = [response] if response else []
            
            for item in response:
                if isinstance(item, dict):
                    # Get name from Supabase response (exact, no mutation)
                    name = item.get('name', '')
                    if not name:
                        continue
                    
                    # Construct exact_key: prefix (exact from list) + name (exact from response)
                    # Preserve all characters including underscores, spaces, etc.
                    exact_key = f"{prefix.rstrip('/')}/{name}"
                    
                    if exact_key not in seen_keys:
                        seen_keys.add(exact_key)
                        file_obj = {
                            "key": exact_key,  # EXACT key for download - DO NOT MUTATE (using "key" for consistency)
                            "exact_key": exact_key,  # Keep for backward compatibility
                            "name": name,  # Original filename
                            "metadata": item.get("metadata", {}),
                        }
                        if "updated_at" in item:
                            file_obj["updated_at"] = item["updated_at"]
                        if "created_at" in item:
                            file_obj["created_at"] = item["created_at"]
                        all_files.append(file_obj)
                elif isinstance(item, str):
                    # String response - use as-is
                    exact_key = f"{prefix.rstrip('/')}/{item}"
                    if exact_key not in seen_keys:
                        seen_keys.add(exact_key)
                        all_files.append({
                            "key": exact_key,  # EXACT key for download - DO NOT MUTATE (using "key" for consistency)
                            "exact_key": exact_key,  # Keep for backward compatibility
                            "name": item,  # Original filename
                            "metadata": {}
                        })
        except Exception as e:
            if is_dev:
                logger.warning(f"[LIST] Failed to list prefix '{prefix}': {e}")
            continue
    
    if is_dev:
        file_names = [f["name"] for f in all_files[:5]]
        exact_keys_sample = [f["exact_key"] for f in all_files[:5]]
        logger.info(f"[LIST] Found {len(all_files)} unique files for client '{client_id}': {file_names}")
        logger.info(f"[LIST] Sample exact_keys: {exact_keys_sample}")
    
    return all_files


def list_files(bucket: str, prefix: str, client_id: str = None) -> List[Dict[str, Any]]:
    """
    List all files in a Supabase Storage bucket under the given prefix.
    (Legacy function - use list_files_case_insensitive for new code)
    
    Args:
        bucket: Storage bucket name
        prefix: Folder prefix (e.g., "melrose/")
        client_id: Client identifier (for logging)
    
    Returns:
        List of file objects with metadata (name, updated_at, created_at, etc.)
    """
    client = get_supabase_admin_client()
    
    # Dev-only logging (no secrets)
    is_dev = os.getenv("RAILWAY_ENVIRONMENT") is None and os.getenv("VERCEL") is None
    if is_dev:
        logger.info(f"[LIST] Listing files: bucket={bucket}, prefix={prefix}, clientId={client_id or 'N/A'}")
    
    try:
        # List files in the bucket with the prefix
        response = client.storage.from_(bucket).list(prefix)
        
        if not response:
            if is_dev:
                logger.info(f"[LIST] No files found: bucket={bucket}, prefix={prefix}")
            return []
        
        # Ensure response is a list
        if not isinstance(response, list):
            response = [response] if response else []
        
        # Convert to list of dicts with normalized structure
        files = []
        for item in response:
            if isinstance(item, dict):
                # Normalize: ensure 'name' exists, extract metadata if present
                file_obj = {
                    "name": item.get("name", ""),
                    "metadata": item.get("metadata", {}),
                }
                # Try to extract updated_at/created_at from metadata or top level
                if "updated_at" in item:
                    file_obj["updated_at"] = item["updated_at"]
                elif "updated_at" in file_obj.get("metadata", {}):
                    file_obj["updated_at"] = file_obj["metadata"]["updated_at"]
                
                if "created_at" in item:
                    file_obj["created_at"] = item["created_at"]
                elif "created_at" in file_obj.get("metadata", {}):
                    file_obj["created_at"] = file_obj["metadata"]["created_at"]
                
                files.append(file_obj)
            elif isinstance(item, str):
                # If it's a string (filename), create a dict
                files.append({"name": item, "metadata": {}})
        
        file_names = [f.get("name", str(f)) for f in files[:5]]  # First 5 for logging
        logger.info(f"[LIST] Found {len(files)} files in bucket '{bucket}' with prefix '{prefix}': {file_names}")
        return files
    
    except Exception as e:
        error_detail = f"Storage list failed: bucket={bucket}, prefix={prefix}"
        if client_id:
            error_detail += f", clientId={client_id}"
        logger.error(f"[LIST] Failed: {error_detail}, exception: {e}")
        raise HTTPException(
            status_code=502,
            detail=error_detail
        )


def pick_best_file(files: List[Dict[str, Any]]) -> Optional[str]:
    """
    Select the best file from a list of files based on priority rules.
    Returns the EXACT object key as stored in the file dict (zero mutation).
    
    Priority:
    1. transactions.parquet
    2. transactions.csv
    3. Any .parquet file (newest if multiple)
    4. Any .csv file (newest if multiple)
    
    Args:
        files: List of file objects with 'exact_key' and 'name' fields
    
    Returns:
        Exact object key string (e.g., "melrose/October_____.csv") - UNMODIFIED
        or None if no suitable file found
    """
    if not files:
        return None
    
    # Use "key" field if available (new format), otherwise fall back to "exact_key" (backward compatibility)
    def get_key(file_dict):
        return file_dict.get("key") or file_dict.get("exact_key")
    
    # Collect all keys for guardrail assertion
    all_keys = {get_key(f) for f in files if get_key(f)}
    
    # Priority 1: transactions.parquet
    for file in files:
        name = file.get("name", "")
        if name.lower() == "transactions.parquet":
            key = get_key(file)
            if not key:
                continue
            logger.info(f"[PICK] Selected file (priority 1): key='{key}', name='{name}'")
            return key
    
    # Priority 2: transactions.csv
    for file in files:
        name = file.get("name", "")
        if name.lower() == "transactions.csv":
            key = get_key(file)
            if not key:
                continue
            logger.info(f"[PICK] Selected file (priority 2): key='{key}', name='{name}'")
            return key
    
    # Priority 3: Any .parquet (prefer newest)
    parquet_files = [f for f in files if f.get("name", "").lower().endswith(".parquet") and get_key(f)]
    if parquet_files:
        parquet_files.sort(
            key=lambda x: (
                x.get("updated_at") or x.get("created_at") or "",
                x.get("name", "")
            ),
            reverse=True
        )
        selected = parquet_files[0]
        key = get_key(selected)
        name = selected.get("name", "")
        logger.info(f"[PICK] Selected file (priority 3 - parquet): key='{key}', name='{name}'")
        return key
    
    # Priority 4: Any .csv (prefer newest)
    csv_files = [f for f in files if f.get("name", "").lower().endswith(".csv") and get_key(f)]
    if csv_files:
        csv_files.sort(
            key=lambda x: (
                x.get("updated_at") or x.get("created_at") or "",
                x.get("name", "")
            ),
            reverse=True
        )
        selected = csv_files[0]
        key = get_key(selected)
        name = selected.get("name", "")
        logger.info(f"[PICK] Selected file (priority 4 - csv): key='{key}', name='{name}'")
        return key
    
    # No suitable file found
    return None


def create_signed_url_admin(bucket: str, key: str, expires_in: int = 60) -> str:
    """
    Create a signed URL for a storage object using service_role key.
    Uses the Supabase Python client's create_signed_url method.
    
    Args:
        bucket: Storage bucket name
        key: Object key (exact path as returned by list API)
        expires_in: Expiration time in seconds (default 60)
    
    Returns:
        Signed URL string
    
    Raises:
        HTTPException 404 if object not found
        HTTPException 403 if access blocked
        HTTPException 502 for other errors
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=500,
            detail="Missing Supabase configuration"
        )
    
    is_dev = os.getenv("RAILWAY_ENVIRONMENT") is None and os.getenv("VERCEL") is None
    if is_dev:
        logger.info(f"[SIGN_URL] Creating signed URL for: bucket={bucket}, key={repr(key)}")
    
    try:
        # Use Supabase Python client's create_signed_url method
        client = get_supabase_admin_client()
        response = client.storage.from_(bucket).create_signed_url(key, expires_in=expires_in)
        
        if not response or not response.get("signedURL"):
            # Try alternative response format
            signed_url = response.get("signedUrl") or response.get("url") if isinstance(response, dict) else str(response) if response else None
            if not signed_url:
                logger.error(f"[SIGN_URL] Response missing signedURL: {response}")
                raise HTTPException(
                    status_code=502,
                    detail=f"Signed URL response missing URL field: {response}"
                )
        else:
            signed_url = response["signedURL"]
        
        # Ensure signed_url is absolute
        if signed_url.startswith("/"):
            signed_url = f"{SUPABASE_URL.rstrip('/')}{signed_url}"
        elif not signed_url.startswith("http"):
            signed_url = f"{SUPABASE_URL.rstrip('/')}/{signed_url.lstrip('/')}"
        
        if is_dev:
            logger.info(f"[SIGN_URL] Success: signed_url={signed_url[:100]}...")
        
        return signed_url
    
    except HTTPException:
        raise
    except Exception as e:
        error_str = str(e).lower()
        error_detail = f"Error creating signed URL: bucket={bucket}, key={key}, error={type(e).__name__}: {str(e)[:200]}"
        
        if "not found" in error_str or "404" in error_str:
            logger.warning(f"[SIGN_URL] 404: {error_detail}")
            raise HTTPException(
                status_code=404,
                detail=f"Object not found when creating signed URL: bucket={bucket}, key={key}"
            )
        elif "forbidden" in error_str or "403" in error_str or "policy" in error_str:
            logger.error(f"[SIGN_URL] 403: {error_detail}")
            raise HTTPException(
                status_code=403,
                detail=f"Access blocked when creating signed URL: bucket={bucket}, key={key}"
            )
        else:
            logger.error(f"[SIGN_URL] Exception: {error_detail}")
            raise HTTPException(
                status_code=502,
                detail=error_detail
            )


def download_object_admin(bucket: str, exact_key: str, listed_keys: set = None) -> bytes:
    """
    Download an object from Supabase Storage using the Supabase Python client.
    Uses service role key for authorization. Key is used EXACTLY as provided (zero mutation).
    
    Args:
        bucket: Storage bucket name
        exact_key: EXACT object key from list() (e.g., "melrose/October_____.csv") - DO NOT MUTATE
        listed_keys: Optional set of keys from list() for guardrail assertion
    
    Returns:
        File contents as bytes
    
    Raises:
        HTTPException 404 if object not found
        HTTPException 403 if blocked by policy
        HTTPException 502 for other errors
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=500,
            detail="Missing Supabase configuration"
        )
    
    # GUARDRAIL: Assert exact_key was returned by list()
    if listed_keys is not None and exact_key not in listed_keys:
        error_msg = f"CRITICAL: Attempted to download key '{exact_key}' not returned by list(). Listed keys: {list(listed_keys)[:5]}"
        logger.error(f"[DOWNLOAD_ADMIN] {error_msg}")
        raise HTTPException(
            status_code=500,
            detail=error_msg
        )
    
    # Dev-only logging (no secrets, just proof of exact_key)
    is_dev = os.getenv("RAILWAY_ENVIRONMENT") is None and os.getenv("VERCEL") is None
    if is_dev:
        logger.info(f"[DOWNLOAD] Using exact_key={repr(exact_key)}, len={len(exact_key)}")
    
    try:
        # Step 1: Create signed URL (most reliable method for service_role downloads)
        signed_url = create_signed_url_admin(bucket, exact_key, expires_in=60)
        
        # Step 2: Download from signed URL (no auth headers needed for signed URLs)
        if is_dev:
            logger.info(f"[DOWNLOAD_ADMIN] Downloading from signed URL: {signed_url[:100]}...")
        
        response = httpx.get(
            signed_url,
            headers={"Accept": "application/octet-stream"},
            timeout=30.0,
            follow_redirects=True
        )
        
        if response.status_code == 200:
            if is_dev:
                logger.info(f"[DOWNLOAD_ADMIN] Success via signed URL: bucket={bucket}, exact_key={repr(exact_key)}, bytes={len(response.content)}")
            return response.content
        else:
            error_text = response.text[:500] if response.text else "Unknown error"
            error_detail = f"Download from signed URL failed: bucket={bucket}, exact_key={exact_key}, status={response.status_code}"
            logger.error(f"[DOWNLOAD_ADMIN] {response.status_code}: {error_detail}, response: {error_text}")
            raise HTTPException(
                status_code=502,
                detail=f"{error_detail} (response: {error_text})"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        # Log full exception details for debugging
        error_str = str(e).lower()
        error_repr = repr(e)
        
        if is_dev:
            logger.error(f"[DOWNLOAD_ADMIN] Full exception: type={type(e).__name__}, error={e}, repr={error_repr}")
        
        # Check if it's a Supabase API error with statusCode
        if hasattr(e, 'message') or hasattr(e, 'code'):
            error_dict = {}
            if hasattr(e, 'message'):
                error_dict['message'] = str(e.message)
            if hasattr(e, 'code'):
                error_dict['code'] = str(e.code)
            if hasattr(e, 'details'):
                error_dict['details'] = str(e.details)
            if hasattr(e, 'hint'):
                error_dict['hint'] = str(e.hint)
            
            # Check for 404 statusCode in error details
            error_json_str = str(error_dict).lower()
            if "404" in error_json_str or "not found" in error_json_str:
                error_detail = f"Object not found: bucket={bucket}, exact_key={exact_key}"
                logger.warning(f"[DOWNLOAD_ADMIN] 404: {error_detail}, error_details: {error_dict}")
                raise HTTPException(
                    status_code=404,
                    detail=error_detail
                )
        
        # Check for common error patterns in string representation
        if "not found" in error_str or "404" in error_str:
            error_detail = f"Object not found: bucket={bucket}, exact_key={exact_key}"
            logger.warning(f"[DOWNLOAD_ADMIN] 404: {error_detail}, error: {e}")
            raise HTTPException(
                status_code=404,
                detail=error_detail
            )
        elif "forbidden" in error_str or "403" in error_str or "policy" in error_str:
            error_detail = f"Storage access blocked by policy: bucket={bucket}, exact_key={exact_key}"
            logger.error(f"[DOWNLOAD_ADMIN] 403: {error_detail}, error: {e}")
            raise HTTPException(
                status_code=403,
                detail=error_detail
            )
        else:
            error_detail = f"Storage download error: bucket={bucket}, exact_key={exact_key}, error={type(e).__name__}: {str(e)[:200]}"
            logger.error(f"[DOWNLOAD_ADMIN] Exception: {error_detail}, full_repr: {error_repr}")
            raise HTTPException(
                status_code=502,
                detail=error_detail
            )


def download_file(bucket: str, exact_key: str, client_id: str = None, prefix: str = None, listed_keys: set = None) -> bytes:
    """
    Download a file from Supabase Storage using the exact object key.
    Uses direct HTTP GET to Storage REST API (admin method).
    Key is passed through unchanged (zero mutation).
    
    Args:
        bucket: Storage bucket name
        exact_key: EXACT object key from list() (e.g., "melrose/October_____.csv") - UNMODIFIED
        client_id: Client identifier (unused, kept for compatibility)
        prefix: Optional prefix (unused, kept for compatibility)
        listed_keys: Optional set of keys from list() for guardrail assertion
    
    Returns:
        File contents as bytes
    
    Raises:
        HTTPException 404 if file not found
        HTTPException 403 if blocked by policy
        HTTPException 502 for other errors
    """
    # Pass exact_key through unchanged - zero mutation
    return download_object_admin(bucket, exact_key, listed_keys=listed_keys)


def _check_policy_block(bucket: str, prefix: str, exact_key: str, client_id: str = None):
    """
    Check if a 404 is actually a policy block by verifying the file exists in list().
    Raises 403 if file exists but download failed (policy block).
    """
    try:
        # Try to list files again to see if the key exists
        files = list_files_case_insensitive(bucket, client_id or "")
        for file in files:
            file_key = file.get("key") or file.get("exact_key")
            if file_key == exact_key:
                # File exists but download failed -> policy block
                error_detail = f"Storage read blocked by policy: bucket={bucket}, exact_key={exact_key}"
                if client_id:
                    error_detail += f", clientId={client_id}"
                
                # Get role from JWT for dev logging
                is_dev = os.getenv("RAILWAY_ENVIRONMENT") is None and os.getenv("VERCEL") is None
                role = "unknown"
                if is_dev and SUPABASE_SERVICE_ROLE_KEY:
                    try:
                        parts = SUPABASE_SERVICE_ROLE_KEY.split('.')
                        if len(parts) >= 2:
                            payload_b64 = parts[1]
                            padding = 4 - len(payload_b64) % 4
                            if padding != 4:
                                payload_b64 += '=' * padding
                            payload_bytes = base64.urlsafe_b64decode(payload_b64)
                            payload = json.loads(payload_bytes)
                            role = payload.get('role', 'unknown')
                    except:
                        pass
                
                error_detail += f", attempted with role={role}"
                logger.error(f"[DOWNLOAD] Policy block detected: {error_detail}")
                raise HTTPException(
                    status_code=403,
                    detail=error_detail
                )
    except HTTPException:
        raise
    except Exception:
        # If check fails, let the original 404 propagate
        pass


def check_file_headers_for_raw_columns(bucket: str, exact_key: str, max_bytes: int = 1024) -> bool:
    """
    Check if a file contains raw transaction columns by reading just the header row.
    Returns True if file has both a date column and an id column.
    
    Args:
        bucket: Storage bucket name
        exact_key: Object key
        max_bytes: Maximum bytes to read (default 1KB for header check)
    
    Returns:
        True if file appears to be a raw transaction file, False otherwise
    """
    try:
        # Download just the first few bytes (cheap - headers only)
        signed_url = create_signed_url_admin(bucket, exact_key, expires_in=60)
        import httpx
        response = httpx.get(
            signed_url,
            headers={"Range": f"bytes=0-{max_bytes}", "Accept": "text/csv,application/octet-stream"},
            timeout=10.0,
            follow_redirects=True
        )
        
        if response.status_code != 200 and response.status_code != 206:
            logger.debug(f"[CHECK_HEADERS] Failed to read headers for {exact_key}: status {response.status_code}")
            return False
        
        header_bytes = response.content
        
        # Decode and get first line (header)
        try:
            header_text = header_bytes.decode('utf-8', errors='ignore').split('\n')[0]
        except:
            # Try other encodings
            try:
                header_text = header_bytes.decode('latin-1', errors='ignore').split('\n')[0]
            except:
                logger.debug(f"[CHECK_HEADERS] Failed to decode headers for {exact_key}")
                return False
        
        # Normalize header (case-insensitive, handle quotes/spaces)
        header_lower = header_text.lower()
        
        # Check for date column aliases
        date_aliases = ["sent date", "order date", "business date", "date", "order_date", "business_date", "sent_date"]
        has_date = any(alias in header_lower for alias in date_aliases)
        
        # Check for id column aliases
        id_aliases = ["order id", "check id", "ticket id", "receipt number", "transaction id",
                     "order_id", "check_id", "ticket_id", "receipt_number", "transaction_id"]
        has_id = any(alias in header_lower for alias in id_aliases)
        
        is_raw = has_date and has_id
        
        if is_raw:
            logger.info(f"[CHECK_HEADERS] File '{exact_key}' confirmed as raw transaction file (has date + id columns)")
        else:
            logger.debug(f"[CHECK_HEADERS] File '{exact_key}' not a raw file: has_date={has_date}, has_id={has_id}")
        
        return is_raw
        
    except Exception as e:
        logger.debug(f"[CHECK_HEADERS] Error checking headers for {exact_key}: {e}")
        return False


def is_raw_transaction_file(bucket: str, file_dict: Dict[str, Any]) -> bool:
    """
    Determine if a file is a raw transaction file using filename patterns and/or header checks.
    
    Filename-based filtering (fast):
    - ALLOW if contains: "october", "november", "december", "orders", "checks"
    - DENY if contains: "menu_volatility", "waste_efficiency", "hourly_analysis", "dow_analysis", "attachment", "analysis"
    
    Schema-based filtering (more accurate, but requires header check):
    - Check headers for date + id columns
    
    Args:
        bucket: Storage bucket name
        file_dict: File dictionary with 'name' and 'key'/'exact_key'
    
    Returns:
        True if file is a raw transaction file, False otherwise
    """
    name = file_dict.get("name", "").lower()
    exact_key = file_dict.get("key") or file_dict.get("exact_key")
    
    if not exact_key:
        return False
    
    # Filename-based DENY list (derived/analysis files)
    deny_patterns = [
        "menu_volatility", "waste_efficiency", "hourly_analysis", "dow_analysis",
        "attachment", "analysis", "summary", "report",
        "bottle_conversion", "discount_analysis"
    ]
    if any(pattern in name for pattern in deny_patterns):
        logger.debug(f"[FILTER] Denied '{exact_key}' by filename pattern (contains: {[p for p in deny_patterns if p in name]})")
        return False
    
    # Filename-based ALLOW list (raw exports)
    allow_patterns = ["october", "november", "december", "january", "february", "march",
                     "april", "may", "june", "july", "august", "september",
                     "orders", "checks", "transactions", "export"]
    if any(pattern in name for pattern in allow_patterns):
        logger.info(f"[FILTER] Allowed '{exact_key}' by filename pattern (contains: {[p for p in allow_patterns if p in name]})")
        return True
    
    # Schema-based check (read headers for date + id columns)
    # Only do this if filename didn't match allow/deny patterns
    if check_file_headers_for_raw_columns(bucket, exact_key):
        logger.info(f"[FILTER] Allowed '{exact_key}' by header check (has date + id columns)")
        return True
    
    # Default: deny if no pattern matches
    logger.debug(f"[FILTER] Denied '{exact_key}' (no matching patterns or header columns)")
    return False


def get_months_for_daterange(start_iso: Optional[str], end_iso: Optional[str]) -> set:
    """
    Determine which calendar months (1-12) intersect with the given date range.
    
    Args:
        start_iso: Start date ISO string (inclusive)
        end_iso: End date ISO string (exclusive)
    
    Returns:
        Set of month numbers (1-12) that intersect the range, or empty set if no range provided
    """
    if not start_iso or not end_iso:
        return set()
    
    try:
        start_dt = pd.to_datetime(start_iso, utc=True)
        end_dt = pd.to_datetime(end_iso, utc=True)
        
        months = set()
        current = start_dt.replace(day=1)  # Start of month
        
        while current < end_dt:
            months.add(current.month)
            # Move to next month
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)
        
        return months
    except Exception as e:
        logger.warning(f"Error parsing date range for month selection: {e}")
        return set()


def filename_matches_month(file_name: str, months: set) -> bool:
    """
    Check if a filename contains a month name that matches any month in the set.
    
    Args:
        file_name: Filename to check (case-insensitive)
        months: Set of month numbers (1-12)
    
    Returns:
        True if filename contains a matching month name
    """
    if not months:
        return True  # No month filter - include all
    
    month_names = {
        1: "january", 2: "february", 3: "march", 4: "april", 5: "may", 6: "june",
        7: "july", 8: "august", 9: "september", 10: "october", 11: "november", 12: "december"
    }
    
    file_lower = file_name.lower()
    matching_months = [month_names[m] for m in months if month_names[m] in file_lower]
    
    return len(matching_months) > 0


def filter_raw_input_files(bucket: str, files: List[Dict[str, Any]], date_range: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Filter files to only include raw transaction files.
    If date_range is provided, further filter to only include month files that intersect the range.
    
    Args:
        bucket: Storage bucket name
        files: List of file dictionaries
        date_range: Optional dict with 'start' and 'end' ISO date strings
    
    Returns:
        Filtered list of raw transaction files (month-filtered if date_range provided)
    """
    raw_files = []
    excluded_files = []
    
    # First pass: filter to raw transaction files
    for file in files:
        if is_raw_transaction_file(bucket, file):
            raw_files.append(file)
        else:
            excluded_files.append(file.get("name") or file.get("key") or "unknown")
    
    logger.info(f"[FILTER] Selected {len(raw_files)} raw files (before month filtering), excluded {len(excluded_files)} derived/analysis files")
    
    # Second pass: if date_range provided, filter by month intersection
    if date_range:
        start_iso = date_range.get('start')
        end_iso = date_range.get('end')
        target_months = get_months_for_daterange(start_iso, end_iso)
        
        if target_months:
            month_filtered = []
            for file in raw_files:
                file_name = file.get("name") or file.get("key") or ""
                if filename_matches_month(file_name, target_months):
                    month_filtered.append(file)
                else:
                    logger.debug(f"[FILTER] Excluded '{file_name}' (does not match months {target_months})")
            
            logger.info(f"[FILTER] Month filter: {len(month_filtered)} files match dateRange months {sorted(target_months)} (from {len(raw_files)} raw files)")
            raw_files = month_filtered
        else:
            logger.info(f"[FILTER] No month filtering applied (invalid or missing dateRange)")
    
    if excluded_files:
        logger.info(f"[FILTER] Excluded files: {excluded_files[:10]}{'...' if len(excluded_files) > 10 else ''}")
    if raw_files:
        selected_names = [f.get("name") or f.get("key") or "unknown" for f in raw_files]
        logger.info(f"[FILTER] Selected raw files for loading: {selected_names}")
    
    return raw_files


def load_dataframe_from_bytes(path: str, file_bytes: bytes) -> pd.DataFrame:
    """
    Load a pandas DataFrame from file bytes (parquet or CSV).
    
    Args:
        path: File path (used to determine format)
        file_bytes: File contents as bytes
    
    Returns:
        pandas DataFrame
    
    Raises:
        HTTPException if parsing fails
    """
    path_lower = path.lower()
    
    try:
        if path_lower.endswith(".parquet"):
            df = pd.read_parquet(BytesIO(file_bytes))
            logger.info(f"Loaded parquet file: {len(df)} rows, {len(df.columns)} columns")
            return df
        elif path_lower.endswith(".csv"):
            df = pd.read_csv(BytesIO(file_bytes))
            logger.info(f"Loaded CSV file: {len(df)} rows, {len(df.columns)} columns")
            return df
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Unsupported file format: {path}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to parse file '{path}': {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to parse dataset"
        )


def load_client_dataframe(client_id: str, date_range: Optional[Dict[str, Any]] = None) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Load the client's raw transaction data files from Supabase Storage into a pandas DataFrame.
    Only selects raw order-level exports (excludes derived analysis files).
    If date_range is provided, only loads month files that intersect the requested range.
    Concatenates multiple raw files if present.
    
    Args:
        client_id: Client identifier (e.g., "melrose", "fancy", "bestregard")
        date_range: Optional dict with 'start' and 'end' ISO date strings for month filtering
    
    Returns:
        Tuple of (DataFrame, metadata_dict)
        metadata_dict contains: clientId, paths (list), format, rows, cols, column_names
    
    Raises:
        HTTPException 404 if no data found
        HTTPException 502 if storage access fails
        HTTPException 500 if parsing fails
    """
    # Normalize client_id to lowercase for matching
    client_id = client_id.lower()
    prefix = f"{client_id}/"
    
    if date_range:
        logger.info(f"Loading data for client: {client_id}, bucket: {SUPABASE_BUCKET}, dateRange: {date_range.get('start')} to {date_range.get('end')}")
    else:
        logger.info(f"Loading data for client: {client_id}, bucket: {SUPABASE_BUCKET}")
    
    # List files using case-insensitive matching (returns exact keys)
    files = list_files_case_insensitive(SUPABASE_BUCKET, client_id)
    
    if not files:
        error_detail = f"No data found for client: {client_id}, bucket: {SUPABASE_BUCKET}"
        logger.warning(f"[LOAD] {error_detail}")
        raise HTTPException(
            status_code=404,
            detail=error_detail
        )
    
    # Filter to only raw transaction files (exclude derived/analysis files)
    # Also apply month filtering if date_range is provided
    raw_files = filter_raw_input_files(SUPABASE_BUCKET, files, date_range=date_range)
    
    if not raw_files:
        error_detail = f"No raw transaction files found for client: {client_id}. Found {len(files)} files but none matched raw transaction criteria."
        logger.warning(f"[LOAD] {error_detail}")
        raise HTTPException(
            status_code=404,
            detail=error_detail
        )
    
    # Download and load all raw files, then concatenate
    listed_keys = {f.get("key") or f.get("exact_key") for f in files if f.get("key") or f.get("exact_key")}
    dataframes = []
    selected_paths = []
    
    for file in raw_files:
        exact_key = file.get("key") or file.get("exact_key")
        if not exact_key:
            continue
        
        try:
            # Download file
            file_bytes = download_file(SUPABASE_BUCKET, exact_key, client_id=client_id, prefix=prefix, listed_keys=listed_keys)
            
            # Load into DataFrame
            df = load_dataframe_from_bytes(exact_key, file_bytes)
            
            if df is not None and not df.empty:
                dataframes.append(df)
                selected_paths.append(exact_key)
                logger.info(f"[LOAD] Loaded raw file '{exact_key}': {len(df)} rows, {len(df.columns)} columns")
            else:
                logger.warning(f"[LOAD] File '{exact_key}' loaded but is empty, skipping")
        
        except Exception as e:
            logger.warning(f"[LOAD] Failed to load file '{exact_key}': {e}, continuing with other files")
            continue
    
    if not dataframes:
        error_detail = f"Failed to load any raw transaction files for client: {client_id}"
        logger.error(f"[LOAD] {error_detail}")
        raise HTTPException(
            status_code=500,
            detail=error_detail
        )
    
    # Concatenate all dataframes
    if len(dataframes) == 1:
        df = dataframes[0]
        logger.info(f"[LOAD] Using single file: {selected_paths[0]}")
    else:
        # Concatenate multiple files
        df = pd.concat(dataframes, ignore_index=True)
        logger.info(f"[LOAD] Concatenated {len(dataframes)} files into single DataFrame: {len(df)} total rows")
        logger.info(f"[LOAD] Files concatenated: {selected_paths}")
    
    # Build metadata
    file_format = "csv"  # Mixed format if multiple files, but CSV is most common
    metadata = {
        "clientId": client_id,
        "paths": selected_paths,  # List of paths (changed from single "path")
        "path": selected_paths[0] if selected_paths else None,  # Keep for backward compatibility
        "format": file_format,
        "rows": len(df),
        "cols": len(df.columns),
        "column_names": list(df.columns)  # Safe to log - column names only
    }
    
    logger.info(
        f"Successfully loaded data for client '{client_id}': "
        f"files={len(selected_paths)}, format={file_format}, "
        f"rows={metadata['rows']}, cols={metadata['cols']}"
    )
    logger.info(f"Column names: {metadata['column_names']}")
    
    return df, metadata
