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
# Includes common Toast POS column names: 'Sent Date', 'Order Date'
CANDIDATE_DATE_COLUMNS = [
    'sent date', 'Sent Date',  # Toast POS common column
    'order date', 'Order Date',  # Toast POS common column
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


def find_date_column(df: pd.DataFrame, schema_datetime_col: Optional[str] = None) -> Optional[str]:
    """
    Find the best date/datetime column in the DataFrame.
    If schema_datetime_col is provided and exists in df, use it (prioritized).
    Otherwise, fall back to candidate matching.
    
    Args:
        df: DataFrame to search
        schema_datetime_col: Optional datetime column name from schema detection
    
    Returns:
        Column name if found, None otherwise
    """
    if df is None or df.empty:
        logger.warning("DataFrame is None or empty, cannot find date column")
        return None
    
    available_columns = list(df.columns)
    
    # Priority 1: Use schema-provided datetime column if available and valid
    if schema_datetime_col and schema_datetime_col in available_columns:
        logger.info(f"Using schema-provided datetime column: '{schema_datetime_col}'")
        return schema_datetime_col
    
    # Priority 2: Fall back to candidate matching
    logger.info(f"Searching for date column in {len(available_columns)} columns")
    
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
    
    if not date_col or date_col not in df.columns:
        logger.warning(f"Date column '{date_col}' not found in DataFrame. Available columns: {list(df.columns)[:10]}")
        return df
    
    original_count = len(df)
    logger.info(f"Date filter: Starting with {original_count} rows, using column '{date_col}'")
    
    try:
        # Parse the date column to timezone-aware pandas datetime
        # Create a copy to avoid modifying original
        df_work = df.copy()
        df_work[date_col] = pd.to_datetime(df_work[date_col], errors='coerce', utc=True)
        
        # Log min/max dates in the DataFrame before filtering
        valid_dates = df_work[date_col].dropna()
        if len(valid_dates) > 0:
            min_date_in_df = valid_dates.min()
            max_date_in_df = valid_dates.max()
            logger.info(f"Date filter: DataFrame date range: {min_date_in_df.date().isoformat()} to {max_date_in_df.date().isoformat()} ({len(valid_dates)} valid dates)")
        else:
            logger.warning(f"Date filter: No valid dates found in column '{date_col}' after parsing")
            return df
        
        # Parse ISO strings to datetime (timezone-aware UTC)
        start_dt = pd.to_datetime(start_iso, utc=True)
        end_dt = pd.to_datetime(end_iso, utc=True)
        
        logger.info(f"Date filter: Filtering range: {start_dt.date().isoformat()} (inclusive) to {end_dt.date().isoformat()} (exclusive)")
        
        # Filter: start <= date < end (end is exclusive)
        mask = (df_work[date_col] >= start_dt) & (df_work[date_col] < end_dt)
        filtered_df = df_work[mask].copy()
        
        filtered_count = len(filtered_df)
        percent_remaining = (filtered_count / original_count * 100) if original_count > 0 else 0
        
        logger.info(f"Date filter: After filtering: {filtered_count} rows ({percent_remaining:.1f}% remaining, {original_count - filtered_count} rows filtered out)")
        
        return filtered_df
        
    except Exception as e:
        logger.error(f"Error applying date filter: {type(e).__name__}: {str(e)}")
        logger.warning("Returning unfiltered DataFrame due to error")
        return df
