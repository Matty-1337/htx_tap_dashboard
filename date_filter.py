"""
Date range filtering utilities for DataFrame filtering
"""
import pandas as pd
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Configuration: Candidate date column names (in priority order)
# The first matching column will be used
CANDIDATE_DATE_COLUMNS = [
    'sent date', 'Sent Date',
    'order date', 'Order Date',
    'date',
    'datetime',
    'created_at',
    'opened_at',
    'closed_at',
    'order_date',
    'business_date',
    'Business Date',
    'timestamp',
    'transaction_date',
    'sale_date',
    'Opened',
    'Created',
    'Close Date', 'close date',
    'Check Opened', 'check opened',
    'Check Closed', 'check closed',
]

# Once identified, store the actual column name here (or pass it explicitly)
# This will be set dynamically based on the DataFrame structure
RAW_DATE_COL: Optional[str] = None


def find_date_column(df: pd.DataFrame) -> Optional[str]:
    """
    Find the best date/datetime column in the DataFrame.
    Returns the first matching column name, or None if none found.
    
    Logs available columns (names only, no data) for debugging.
    """
    if df is None or df.empty:
        logger.warning("DataFrame is None or empty, cannot find date column")
        return None
    
    available_columns = list(df.columns)
    logger.info(f"Available columns in DataFrame: {available_columns}")
    
    # Check each candidate column (case-insensitive)
    df_columns_lower = [col.lower() for col in available_columns]
    
    for candidate in CANDIDATE_DATE_COLUMNS:
        candidate_lower = candidate.lower()
        if candidate_lower in df_columns_lower:
            # Find the actual column name (preserve original case)
            idx = df_columns_lower.index(candidate_lower)
            actual_col = available_columns[idx]
            logger.info(f"Found date column: '{actual_col}' (matched candidate: '{candidate}')")
            return actual_col
    
    logger.warning(f"No date column found. Candidates checked: {CANDIDATE_DATE_COLUMNS}")
    return None


def apply_date_range(
    df: pd.DataFrame,
    date_col: str,
    start_iso: str,
    end_iso: str
) -> pd.DataFrame:
    """
    Apply date range filtering to a DataFrame.
    
    Args:
        df: Input DataFrame
        date_col: Name of the date/datetime column to filter on
        start_iso: Start date as ISO string (inclusive)
        end_iso: End date as ISO string (exclusive)
    
    Returns:
        Filtered DataFrame (or original if filtering fails)
    """
    if df is None or df.empty:
        logger.warning("DataFrame is None or empty, returning as-is")
        return df
    
    if date_col not in df.columns:
        logger.warning(f"Date column '{date_col}' not found in DataFrame. Available columns: {list(df.columns)}")
        return df
    
    original_count = len(df)
    logger.info(f"Date filter: Starting with {original_count} rows")
    
    try:
        # Parse the date column to datetime (errors='coerce' converts invalid to NaT)
        df[date_col] = pd.to_datetime(df[date_col], errors='coerce', utc=True)
        
        # Check if all values are NaT (parsing failed)
        if df[date_col].isna().all():
            logger.warning(f"All values in '{date_col}' are NaT after parsing. Returning unfiltered DataFrame.")
            return df
        
        # Parse ISO strings to datetime (naive UTC, matching the parsed column)
        start_dt = pd.to_datetime(start_iso, utc=True)
        end_dt = pd.to_datetime(end_iso, utc=True)
        
        logger.info(f"Date filter: start={start_dt.isoformat()}, end={end_dt.isoformat()}")
        
        # Filter: start <= date < end (end is exclusive)
        mask = (df[date_col] >= start_dt) & (df[date_col] < end_dt)
        filtered_df = df[mask].copy()
        
        filtered_count = len(filtered_df)
        percent_remaining = (filtered_count / original_count * 100) if original_count > 0 else 0
        
        logger.info(f"Date filter: After filtering: {filtered_count} rows ({percent_remaining:.1f}% remaining)")
        
        return filtered_df
        
    except Exception as e:
        logger.error(f"Error applying date filter: {type(e).__name__}: {str(e)}")
        logger.warning("Returning unfiltered DataFrame due to error")
        return df
