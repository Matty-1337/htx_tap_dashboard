"""
Minimal analysis pipeline that transforms raw DataFrame into frontend-expected structure.
"""
import pandas as pd
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np

from date_filter import find_date_column, apply_date_range
from column_detect import (
    find_amount_col, find_datetime_col, find_employee_col, find_item_col,
    find_category_col, find_void_flag_col, find_discount_amount_col,
    find_removal_flag_or_amount_col, find_reason_col, find_order_id_col,
    detect_schema
)

logger = logging.getLogger(__name__)

# Day name mapping (0=Monday, 6=Sunday)
DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def compute_preset_window(preset: str, max_date: pd.Timestamp) -> Tuple[str, str]:
    """
    Compute start and end dates for a preset relative to max_date (dataset max date).
    
    Args:
        preset: Preset string like "30d", "90d", "7d", "1y"
        max_date: Maximum date from the dataset (pd.Timestamp)
    
    Returns:
        Tuple of (start_iso, end_iso) where end is exclusive
    """
    # Parse preset (e.g., "90d" -> 90 days, "1y" -> 365 days)
    if preset.endswith('d'):
        days = int(preset[:-1])
    elif preset.endswith('y'):
        days = int(preset[:-1]) * 365
    elif preset.endswith('w'):
        days = int(preset[:-1]) * 7
    else:
        logger.warning(f"Unknown preset format: {preset}, defaulting to 30 days")
        days = 30
    
    # End date is max_date + 1 day (to make it exclusive)
    end_date = max_date + pd.Timedelta(days=1)
    # Start date is end_date - days
    start_date = end_date - pd.Timedelta(days=days)
    
    # Convert to ISO strings (date only, no time)
    start_iso = start_date.date().isoformat()
    end_iso = end_date.date().isoformat()
    
    logger.info(f"Preset '{preset}' computed: start={start_iso}, end={end_iso} (relative to max_date={max_date.date().isoformat()})")
    
    return start_iso, end_iso


def get_data_coverage(df: pd.DataFrame, date_col: Optional[str] = None) -> Dict[str, Any]:
    """
    Compute data coverage metadata (minDate, maxDate, rowCount) from DataFrame.
    
    Args:
        df: DataFrame with date data
        date_col: Optional date column name (will be detected if not provided)
    
    Returns:
        Dict with minDate, maxDate (ISO strings), rowCount, dateCol, and columnsSample
    """
    if df is None or df.empty:
        return {
            "minDate": None,
            "maxDate": None,
            "rowCount": 0,
            "dateCol": None,
            "columnsSample": []
        }
    
    # Capture column sample (first 30 columns, safe for debugging)
    columns_sample = list(df.columns)[:30]
    
    # Find date column if not provided - prioritize schema, then fall back to detection
    if not date_col:
        # Note: get_data_coverage doesn't have schema context, so we detect from scratch
        # In practice, date_col should be passed from run_full_analysis
        date_col = find_date_column(df)
        if not date_col:
            date_col = find_datetime_col(df)
    
    # Log detected date column for debugging
    if date_col:
        logger.info(f"Data coverage: Using date column '{date_col}'")
    else:
        logger.warning(f"Data coverage: No date column detected. Available columns: {columns_sample[:10]}")
    
    if not date_col or date_col not in df.columns:
        return {
            "minDate": None,
            "maxDate": None,
            "rowCount": len(df),
            "dateCol": None,
            "columnsSample": columns_sample
        }
    
    try:
        # Parse date column to datetime with robust error handling
        date_series = pd.to_datetime(df[date_col], errors='coerce', utc=True)
        # Drop NaT values
        valid_dates = date_series.dropna()
        
        if len(valid_dates) == 0:
            logger.warning(f"Date column '{date_col}' found but all values are invalid after parsing")
            return {
                "minDate": None,
                "maxDate": None,
                "rowCount": len(df),
                "dateCol": date_col,
                "columnsSample": columns_sample
            }
        
        min_date = valid_dates.min()
        max_date = valid_dates.max()
        
        logger.info(f"Data coverage: Date range {min_date.date()} to {max_date.date()} ({len(valid_dates)} valid dates)")
        
        return {
            "minDate": min_date.date().isoformat() if pd.notna(min_date) else None,
            "maxDate": max_date.date().isoformat() if pd.notna(max_date) else None,
            "rowCount": len(df),
            "dateCol": date_col,
            "columnsSample": columns_sample
        }
    except Exception as e:
        logger.warning(f"Error computing data coverage: {e}")
        return {
            "minDate": None,
            "maxDate": None,
            "rowCount": len(df),
            "dateCol": date_col,
            "columnsSample": columns_sample
        }


def run_full_analysis(df: pd.DataFrame, client_id: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Run full analysis pipeline on DataFrame and return frontend-expected structure.
    
    Args:
        df: pandas DataFrame (raw transactional data)
        client_id: Client identifier
        params: Optional parameters dict (may include dateRange)
    
    Returns:
        Dictionary matching frontend AnalysisData interface:
        {
            "clientId": str,
            "kpis": Dict[str, float],
            "charts": {
                "hourly_revenue": List[Dict],
                "day_of_week": List[Dict]
            },
            "tables": {
                "waste_efficiency": {"columns": List[str], "data": List[Dict]},
                "employee_performance": {"columns": List[str], "data": List[Dict]},
                "menu_volatility": {"columns": List[str], "data": List[Dict]}
            }
        }
    """
    if params is None:
        params = {}
    
    # Log detected schema (safe - column names only)
    schema = detect_schema(df)
    
    # Log column sample for debugging (dev only - first 30 columns)
    columns_sample = list(df.columns)[:30]
    logger.info(f"DataFrame columns sample ({len(columns_sample)} of {len(df.columns)} total): {columns_sample}")
    
    # Find datetime column - prioritize schema-provided column, then fall back to detection
    schema_datetime = schema.get("datetime")
    
    # Use schema datetime if available, otherwise detect
    date_col = find_date_column(df, schema_datetime_col=schema_datetime)
    if not date_col:
        date_col = find_datetime_col(df)
    
    # Log detection result
    if date_col:
        logger.info(f"Date column for filtering: '{date_col}' (from schema: {schema_datetime == date_col})")
    else:
        logger.warning(
            f"No date column detected. Searched for aliases including: "
            f"'Sent Date', 'Order Date', 'Date', 'Business Date', 'Opened', 'Created', "
            f"'Close Date', 'Check Opened', 'Check Closed'. "
            f"Available columns: {columns_sample}"
        )
    
    # Ensure schema datetime matches detected date_col
    if date_col and not schema.get("datetime"):
        schema["datetime"] = date_col
        logger.info(f"Updated schema datetime to detected column: '{date_col}'")
    elif date_col and schema.get("datetime") != date_col:
        # Schema had a different column - update it
        schema["datetime"] = date_col
        logger.info(f"Updated schema datetime from '{schema_datetime}' to '{date_col}'")
    
    # Compute data coverage from original dataset (before filtering)
    data_coverage = get_data_coverage(df, date_col)
    
    # ============================================================
    # STEP 1: Apply dateRange filtering FIRST
    # ============================================================
    date_range = params.get('dateRange', {})
    date_start = date_range.get('start')
    date_end = date_range.get('end')
    preset = date_range.get('preset')
    
    initial_rows = len(df)
    
    # DEFENSIVE GUARD: If both preset and start/end are present, prefer preset-only
    # This handles cases where frontend sends both (temporary compatibility)
    if preset and (date_start or date_end):
        logger.warning(
            f"DateRange has both preset='{preset}' and start/end. "
            f"Ignoring start='{date_start}', end='{date_end}' and using preset-only."
        )
        date_start = None
        date_end = None
    
    # If preset is provided without start/end, compute start/end from dataset max date
    if preset and not (date_start and date_end) and date_col and data_coverage.get('maxDate'):
        try:
            # Use maxDate from data coverage (already computed)
            max_date_str = data_coverage['maxDate']
            max_date = pd.to_datetime(max_date_str, utc=True)
            date_start, date_end = compute_preset_window(preset, max_date)
            logger.info(f"Computed preset '{preset}' window from dataset max date ({max_date_str}): {date_start} to {date_end}")
        except Exception as e:
            logger.warning(f"Error computing preset window: {e}. Proceeding without date filtering.")
    
    # Apply date filtering if we have start/end
    if date_start and date_end and date_col:
        try:
            df = apply_date_range(df, date_col, date_start, date_end)
            filtered_rows = len(df)
            percent_remaining = (filtered_rows / initial_rows * 100) if initial_rows > 0 else 0
            logger.info(
                f"Date filter applied: {initial_rows} -> {filtered_rows} rows "
                f"({percent_remaining:.1f}% remaining)"
            )
        except Exception as e:
            logger.warning(f"Date filtering failed: {e}. Proceeding with unfiltered data.")
    elif date_start and date_end:
        logger.warning("Date range provided but no datetime column found. Proceeding unfiltered.")
    
    if df.empty:
        logger.warning(f"DataFrame is empty after filtering. Returning empty results.")
        return _empty_response(client_id)
    
    # ============================================================
    # STEP 2: Compute KPIs
    # ============================================================
    kpis = _compute_kpis(df, schema)
    
    # ============================================================
    # STEP 3: Generate Charts
    # ============================================================
    # Step 5: Always emit hour_of_day (24 rows) and day_of_week (7 rows)
    hour_of_day_data = _compute_hourly_revenue(df, schema)  # Step 5: Use hour_of_day (Order Date attribution)
    day_of_week_data = _compute_day_of_week(df, schema)     # Step 5: Order Date attribution
    
    # Revenue Heatmap: hour × day grid (168 cells = 24 hours × 7 days)
    revenue_heatmap_data = _compute_revenue_heatmap(df, schema)
    
    charts = {
        "hour_of_day": hour_of_day_data,
        "day_of_week": day_of_week_data,
        # Revenue heatmap with hour AND day breakdown
        "revenue_heatmap": revenue_heatmap_data,
        # Legacy key for backward compatibility - NOW INCLUDES DAY for heatmap rendering
        "hourly_revenue": revenue_heatmap_data
    }
    
    # ============================================================
    # STEP 4: Generate Tables
    # ============================================================
    tables = {
        "waste_efficiency": _compute_waste_efficiency(df, schema),
        "employee_performance": _compute_employee_performance(df, schema),
        "menu_volatility": _compute_menu_volatility(df, schema)
    }
    
    # Log chart keys and lengths (safe, no secrets)
    logger.info(f"CHART_KEYS={list(charts.keys())}")
    logger.info(f"Charts generated: hour_of_day={len(charts['hour_of_day'])} rows, day_of_week={len(charts['day_of_week'])} rows, revenue_heatmap={len(charts['revenue_heatmap'])} cells")
    
    # data_coverage was already computed from original dataset (before filtering)
    # Update rowCount to reflect filtered data
    data_coverage['rowCount'] = len(df)
    
    result = {
        "clientId": client_id,
        "kpis": kpis,
        "charts": charts,
        "tables": tables,
        "dataCoverage": data_coverage
    }
    
    return result


def _empty_response(client_id: str) -> Dict[str, Any]:
    """Return empty response structure."""
    return {
        "clientId": client_id,
        "kpis": {},
        "charts": {
            "hour_of_day": [],
            "day_of_week": [],
            "revenue_heatmap": [],
            "hourly_revenue": []  # Legacy key (now contains hour+day for heatmap)
        },
        "tables": {
            "waste_efficiency": {"columns": ["message"], "data": [{"message": "No data available"}]},
            "employee_performance": {"columns": ["message"], "data": [{"message": "No data available"}]},
            "menu_volatility": {"columns": ["message"], "data": [{"message": "No data available"}]}
        },
        "dataCoverage": {
            "minDate": None,
            "maxDate": None,
            "rowCount": 0,
            "dateCol": None,
            "columnsSample": []
        }
    }


def _compute_kpis(df: pd.DataFrame, schema: Dict[str, Optional[str]]) -> Dict[str, float]:
    """Compute KPIs from DataFrame."""
    kpis = {}
    
    amount_col = schema.get("amount")
    if not amount_col:
        logger.warning("No amount column found. Cannot compute revenue KPIs.")
        return kpis
    
    # Revenue (required)
    revenue = df[amount_col].sum()
    kpis["Revenue"] = float(revenue)

    # Transactions - use order_id if available, otherwise row count
    order_id_col = schema.get("order_id")
    if order_id_col and order_id_col in df.columns:
        transactions = df[order_id_col].nunique()
        kpis["Transactions"] = float(transactions)
        kpis["transactionsLabel"] = "Transactions"  # Actual unique orders
    else:
        transactions = len(df)
        kpis["Transactions"] = float(transactions)
        kpis["transactionsLabel"] = "Line Items"  # Row count, not unique transactions
        logger.info(f"Transactions metric uses row count ({transactions} rows) - no order_id column found")
    
    # Avg Ticket
    if transactions > 0:
        kpis["Avg Ticket"] = float(revenue / transactions)
    else:
        kpis["Avg Ticket"] = 0.0
    
    # Void metrics (if void_flag exists)
    void_flag_col = schema.get("void_flag")
    if void_flag_col and void_flag_col in df.columns:
        # Determine if void_flag is boolean or numeric
        void_mask = df[void_flag_col]
        if void_mask.dtype == 'bool':
            void_mask = void_mask
        else:
            # Treat non-zero as void
            void_mask = (df[void_flag_col] != 0) & (df[void_flag_col].notna())
        
        void_amount = df.loc[void_mask, amount_col].sum()
        kpis["Void $"] = float(void_amount)
        
        if revenue > 0:
            kpis["Void Rate %"] = float((void_amount / revenue) * 100)
        else:
            kpis["Void Rate %"] = 0.0
    
    # Discount metrics (if discount column exists)
    discount_col = schema.get("discount_amount")
    if discount_col and discount_col in df.columns:
        discount_amount = df[discount_col].sum()
        kpis["Discount $"] = float(discount_amount)
        if revenue > 0:
            kpis["Discount Rate %"] = float((discount_amount / revenue) * 100)
        else:
            kpis["Discount Rate %"] = 0.0
    
    # Removal metrics (if removal column exists)
    removal_col = schema.get("removal_flag_or_amount")
    if removal_col and removal_col in df.columns:
        # Try to determine if it's a flag or amount
        if df[removal_col].dtype == 'bool':
            removal_mask = df[removal_col]
            removal_amount = df.loc[removal_mask, amount_col].sum()
        else:
            removal_amount = df[removal_col].sum()
        
        kpis["Removal $"] = float(removal_amount)
        if revenue > 0:
            kpis["Removal Rate %"] = float((removal_amount / revenue) * 100)
        else:
            kpis["Removal Rate %"] = 0.0
    
    return kpis


def _compute_hourly_revenue(df: pd.DataFrame, schema: Dict[str, Optional[str]]) -> List[Dict[str, Any]]:
    """
    Compute hourly revenue chart data.
    
    HARD REQUIREMENT: Uses "Order Date" as the ONLY timestamp for hourly attribution.
    Rationale: staffing/ops alignment requires guest-arrival ordering time, not payment time.
    """
    amount_col = schema.get("amount")
    if not amount_col:
        logger.warning("Hourly revenue chart: No amount column found")
        return []
    
    # HARD REQUIREMENT: Use "Order Date" specifically (single source of truth)
    order_date_col = None
    for col in df.columns:
        if col.lower() == "order date":
            order_date_col = col
            break
    
    if not order_date_col or order_date_col not in df.columns:
        logger.warning(f"Hourly revenue chart: 'Order Date' column not found. Available columns: {list(df.columns)[:10]}")
        return []
    
    # Get order_id column if available
    order_id_col = schema.get("order_id")
    
    try:
        df_copy = df.copy()
        
        # Normalize types safely
        df_copy[order_date_col] = pd.to_datetime(df_copy[order_date_col], errors='coerce')
        df_copy[amount_col] = pd.to_numeric(df_copy[amount_col], errors='coerce').fillna(0)
        
        # Drop rows where Order Date is NaT
        df_copy = df_copy.dropna(subset=[order_date_col])
        
        if df_copy.empty:
            logger.warning(f"Hourly revenue chart: All dates invalid in 'Order Date'")
            return []
        
        # Extract hour: pd.to_datetime(df["Order Date"]).dt.hour
        df_copy['Hour'] = df_copy[order_date_col].dt.hour
        
        logger.info(f"Hourly revenue chart: Extracted hour from 'Order Date' ({len(df_copy)} valid rows)")
        
        # Aggregate by hour: sum Net Price and count unique Order Id
        agg_dict = {amount_col: 'sum'}
        if order_id_col and order_id_col in df_copy.columns:
            agg_dict[order_id_col] = 'nunique'
        
        hourly = df_copy.groupby('Hour', as_index=False).agg(agg_dict)
        
        # Rename columns to match output contract
        hourly.columns = ['Hour', 'Net Price', 'Order Id'] if order_id_col and order_id_col in df_copy.columns else ['Hour', 'Net Price']
        
        # Ensure all hours 0..23 exist (fill missing with 0 revenue + 0 orders)
        all_hours = pd.DataFrame({'Hour': range(24)})
        hourly = all_hours.merge(hourly, on='Hour', how='left').fillna(0)
        
        # Add Order Id column if missing (fill with 0)
        if 'Order Id' not in hourly.columns:
            hourly['Order Id'] = 0
        
        # Ensure types: Hour is int, Net Price is float, Order Id is int
        hourly['Hour'] = hourly['Hour'].astype(int)
        hourly['Net Price'] = hourly['Net Price'].astype(float)
        hourly['Order Id'] = hourly['Order Id'].astype(int)
        
        # Sort ascending by Hour
        hourly = hourly.sort_values('Hour')
        
        # Convert to list of dicts with exact keys: Hour, Net Price, Order Id
        result = hourly.to_dict('records')
        return result
        
    except Exception as e:
        logger.warning(f"Hourly revenue chart: Failed to compute hourly revenue from 'Order Date': {e}")
        return []


def _compute_day_of_week(df: pd.DataFrame, schema: Dict[str, Optional[str]]) -> List[Dict[str, Any]]:
    """
    Compute day-of-week revenue chart data.
    
    HARD REQUIREMENT: Uses "Order Date" as the ONLY timestamp for day-of-week attribution.
    Rationale: staffing/ops alignment requires guest-arrival ordering time, not payment time.
    """
    amount_col = schema.get("amount")
    if not amount_col:
        logger.warning("Day of week chart: No amount column found")
        return []
    
    # HARD REQUIREMENT: Use "Order Date" specifically (single source of truth)
    order_date_col = None
    for col in df.columns:
        if col.lower() == "order date":
            order_date_col = col
            break
    
    if not order_date_col or order_date_col not in df.columns:
        logger.warning(f"Day of week chart: 'Order Date' column not found. Available columns: {list(df.columns)[:10]}")
        return []
    
    # Get order_id column if available
    order_id_col = schema.get("order_id")
    
    try:
        df_copy = df.copy()
        
        # Normalize types safely
        df_copy[order_date_col] = pd.to_datetime(df_copy[order_date_col], errors='coerce')
        df_copy[amount_col] = pd.to_numeric(df_copy[amount_col], errors='coerce').fillna(0)
        
        # Drop rows where Order Date is NaT
        df_copy = df_copy.dropna(subset=[order_date_col])
        
        if df_copy.empty:
            logger.warning(f"Day of week chart: All dates invalid in 'Order Date'")
            return []
        
        logger.info(f"Day of week chart: Parsed 'Order Date' ({len(df_copy)} valid rows)")
        
        # Extract day name (Monday..Sunday)
        df_copy['Day'] = df_copy[order_date_col].dt.day_name()
        
        # Force ordering Monday..Sunday (categorical order)
        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        df_copy['Day'] = pd.Categorical(df_copy['Day'], categories=day_order, ordered=True)
        
        # Aggregate by day: sum Net Price and count unique Order Id
        agg_dict = {amount_col: 'sum'}
        if order_id_col and order_id_col in df_copy.columns:
            agg_dict[order_id_col] = 'nunique'
        
        daily = df_copy.groupby('Day', as_index=False).agg(agg_dict)
        
        # Rename columns to match output contract
        daily.columns = ['Day', 'Net Price', 'Order Id'] if order_id_col and order_id_col in df_copy.columns else ['Day', 'Net Price']
        
        # Fill missing days with 0 (ensure all 7 days exist)
        all_days_df = pd.DataFrame({'Day': day_order})
        daily = all_days_df.merge(daily, on='Day', how='left').fillna(0)
        
        # Add Order Id column if missing (fill with 0)
        if 'Order Id' not in daily.columns:
            daily['Order Id'] = 0
        
        # Ensure types: Day is string, Net Price is float, Order Id is int
        daily['Day'] = daily['Day'].astype(str)
        daily['Net Price'] = daily['Net Price'].astype(float)
        daily['Order Id'] = daily['Order Id'].astype(int)
        
        # Sort by day order (Monday..Sunday)
        daily['Day'] = pd.Categorical(daily['Day'], categories=day_order, ordered=True)
        daily = daily.sort_values('Day')
        
        # Convert to list of dicts with exact keys: Day, Net Price, Order Id
        result = daily.to_dict('records')
        return result
        
    except Exception as e:
        logger.warning(f"Failed to compute day_of_week chart: {e}")
        return []


def _compute_revenue_heatmap(df: pd.DataFrame, schema: Dict[str, Optional[str]]) -> List[Dict[str, Any]]:
    """
    Compute revenue heatmap data with hour AND day breakdown.
    
    Returns: List of dicts with { hour, day, revenue } for each hour-day combination.
    This creates a full 24×7 grid (168 cells) for the heatmap visualization.
    
    HARD REQUIREMENT: Uses "Order Date" as the ONLY timestamp for attribution.
    """
    amount_col = schema.get("amount")
    if not amount_col:
        logger.warning("Revenue heatmap: No amount column found")
        return []
    
    # HARD REQUIREMENT: Use "Order Date" specifically (single source of truth)
    order_date_col = None
    for col in df.columns:
        if col.lower() == "order date":
            order_date_col = col
            break
    
    if not order_date_col or order_date_col not in df.columns:
        logger.warning(f"Revenue heatmap: 'Order Date' column not found. Available columns: {list(df.columns)[:10]}")
        return []
    
    try:
        df_copy = df.copy()
        
        # Normalize types safely
        df_copy[order_date_col] = pd.to_datetime(df_copy[order_date_col], errors='coerce')
        df_copy[amount_col] = pd.to_numeric(df_copy[amount_col], errors='coerce').fillna(0)
        
        # Drop rows where Order Date is NaT
        df_copy = df_copy.dropna(subset=[order_date_col])
        
        if df_copy.empty:
            logger.warning(f"Revenue heatmap: All dates invalid in 'Order Date'")
            return []
        
        # Extract hour and day of week
        df_copy['hour'] = df_copy[order_date_col].dt.hour
        df_copy['day_num'] = df_copy[order_date_col].dt.dayofweek  # 0=Monday, 6=Sunday
        df_copy['day'] = df_copy['day_num'].map(lambda x: DAY_NAMES[x] if 0 <= x <= 6 else 'Mon')
        
        logger.info(f"Revenue heatmap: Extracted hour and day from 'Order Date' ({len(df_copy)} valid rows)")
        
        # Aggregate by hour AND day: sum Net Price
        hourly_daily = df_copy.groupby(['hour', 'day'], as_index=False).agg({amount_col: 'sum'})
        hourly_daily.columns = ['hour', 'day', 'revenue']
        
        # Create full 24×7 grid (all hour-day combinations)
        from itertools import product
        all_combinations = list(product(range(24), DAY_NAMES))
        all_grid = pd.DataFrame(all_combinations, columns=['hour', 'day'])
        
        # Merge with actual data, fill missing with 0
        heatmap = all_grid.merge(hourly_daily, on=['hour', 'day'], how='left').fillna(0)
        
        # Ensure types
        heatmap['hour'] = heatmap['hour'].astype(int)
        heatmap['day'] = heatmap['day'].astype(str)
        heatmap['revenue'] = heatmap['revenue'].astype(float)
        
        # Sort by hour then by day order
        day_order = {day: i for i, day in enumerate(DAY_NAMES)}
        heatmap['day_sort'] = heatmap['day'].map(day_order)
        heatmap = heatmap.sort_values(['hour', 'day_sort']).drop('day_sort', axis=1)
        
        # Convert to list of dicts
        result = heatmap.to_dict('records')
        
        logger.info(f"Revenue heatmap: Generated {len(result)} cells (24 hours × 7 days)")
        return result
        
    except Exception as e:
        logger.warning(f"Revenue heatmap: Failed to compute: {e}")
        return []


def _compute_waste_efficiency(df: pd.DataFrame, schema: Dict[str, Optional[str]]) -> Dict[str, Any]:
    """Compute waste efficiency table."""
    amount_col = schema.get("amount")
    void_flag_col = schema.get("void_flag")
    category_col = schema.get("category")
    reason_col = schema.get("reason")
    
    if not amount_col:
        return {"columns": ["message"], "data": [{"message": "Amount column not found"}]}
    
    if not void_flag_col or void_flag_col not in df.columns:
        return {"columns": ["message"], "data": [{"message": "Void flag column not found"}]}
    
    rows = []
    
    # Determine void mask
    void_mask = df[void_flag_col]
    if void_mask.dtype == 'bool':
        void_mask = void_mask
    else:
        void_mask = (df[void_flag_col] != 0) & (df[void_flag_col].notna())
    
    # Group by category if available, else use "All"
    if category_col and category_col in df.columns:
        groups = df.groupby(category_col)
        group_key = category_col
    else:
        groups = [(None, df)]
        group_key = None
    
    for group_name, group_df in groups:
        category = group_name if group_name is not None else "All"
        revenue = group_df[amount_col].sum()
        # Filter group_df using void_mask for rows in this group
        # void_mask is a Series indexed by df.index, so we can index it with group_df.index
        group_void_mask = void_mask.loc[group_df.index]
        void_amount = group_df.loc[group_void_mask, amount_col].sum()
        void_rate = (void_amount / revenue * 100) if revenue > 0 else 0.0
        
        row = {
            "Category": category,
            "Revenue": float(revenue),
            "Void_Amount": float(void_amount),
            "Void_Rate_Pct": float(void_rate)
        }
        
        # Add reason breakdown if available (top 10 reasons for this category)
        if reason_col and reason_col in group_df.columns:
            group_void_mask = void_mask.loc[group_df.index]
            void_reasons = group_df.loc[group_void_mask].groupby(reason_col).agg({
                amount_col: ['sum', 'count']
            }).reset_index()
            void_reasons.columns = [reason_col, 'Void_Amount', 'Count']
            void_reasons = void_reasons.sort_values('Void_Amount', ascending=False).head(10)
            
            for _, reason_row in void_reasons.iterrows():
                reason_data = {
                    "Category": category,
                    "Reason": reason_row[reason_col],
                    "Void_Amount": float(reason_row['Void_Amount']),
                    "Count": int(reason_row['Count'])
                }
                rows.append(reason_data)
        else:
            rows.append(row)
    
    # Determine columns from union of all row keys
    if rows:
        columns = list(set().union(*[row.keys() for row in rows]))
        # Prefer specific order
        preferred_order = ["Category", "Reason", "Revenue", "Void_Amount", "Void_Rate_Pct", "Count"]
        columns = [c for c in preferred_order if c in columns] + [c for c in columns if c not in preferred_order]
    else:
        columns = ["Category", "Revenue", "Void_Amount", "Void_Rate_Pct"]
    
    return {"columns": columns, "data": rows[:100]}  # Limit to top 100


def _compute_employee_performance(df: pd.DataFrame, schema: Dict[str, Optional[str]]) -> Dict[str, Any]:
    """Compute employee performance table."""
    amount_col = schema.get("amount")
    employee_col = schema.get("employee")
    order_id_col = schema.get("order_id")
    void_flag_col = schema.get("void_flag")

    if not amount_col:
        return {"columns": ["message"], "data": [{"message": "Amount column not found"}]}

    if not employee_col or employee_col not in df.columns:
        # Provide helpful error message with detected columns
        available_cols = list(df.columns)[:20]  # First 20 columns for context
        expected_aliases = ["Employee", "Server", "Server Name", "Staff", "Created By", "User", "Bartender"]
        message = (
            f"Employee column not found. Expected aliases: {', '.join(expected_aliases)}. "
            f"Available columns: {', '.join(available_cols[:10])}"
        )
        logger.warning(message)
        return {"columns": ["message"], "data": [{"message": message}]}
    
    # Group by employee
    grouped = df.groupby(employee_col).agg({
        amount_col: 'sum'
    }).reset_index()
    grouped.columns = ['Server', amount_col]
    
    # Add transactions count
    if order_id_col and order_id_col in df.columns:
        transactions = df.groupby(employee_col)[order_id_col].nunique().reset_index()
        transactions.columns = ['Server', 'Transactions']
        grouped = grouped.merge(transactions, on='Server', how='left')
    else:
        transactions = df.groupby(employee_col).size().reset_index()
        transactions.columns = ['Server', 'Transactions']
        grouped = grouped.merge(transactions, on='Server', how='left')
    
    # Add void metrics if available
    if void_flag_col and void_flag_col in df.columns:
        void_mask = df[void_flag_col]
        if void_mask.dtype == 'bool':
            void_mask = void_mask
        else:
            void_mask = (df[void_flag_col] != 0) & (df[void_flag_col].notna())
        
        void_amounts = df.loc[void_mask].groupby(employee_col)[amount_col].sum().reset_index()
        void_amounts.columns = ['Server', 'Void_Amount']
        grouped = grouped.merge(void_amounts, on='Server', how='left').fillna(0)
        
        # Calculate void rate
        grouped['Void_Rate_Pct'] = (grouped['Void_Amount'] / grouped[amount_col] * 100).fillna(0)
    else:
        grouped['Void_Amount'] = 0.0
        grouped['Void_Rate_Pct'] = 0.0
    
    # Rename amount column
    grouped = grouped.rename(columns={amount_col: 'Revenue'})
    
    # Sort by revenue and limit to top 50
    grouped = grouped.sort_values('Revenue', ascending=False).head(50)
    
    # Convert to list of dicts
    columns = ['Server', 'Revenue', 'Transactions']
    if void_flag_col and void_flag_col in df.columns:
        columns.extend(['Void_Amount', 'Void_Rate_Pct'])
    
    rows = grouped[columns].to_dict('records')
    
    # Ensure numeric types
    for row in rows:
        row['Revenue'] = float(row['Revenue'])
        row['Transactions'] = int(row['Transactions'])
        if 'Void_Amount' in row:
            row['Void_Amount'] = float(row['Void_Amount'])
        if 'Void_Rate_Pct' in row:
            row['Void_Rate_Pct'] = float(row['Void_Rate_Pct'])
    
    return {"columns": columns, "data": rows}


def _compute_menu_volatility(df: pd.DataFrame, schema: Dict[str, Optional[str]]) -> Dict[str, Any]:
    """Compute menu volatility table."""
    amount_col = schema.get("amount")
    item_col = schema.get("item")
    category_col = schema.get("category")
    datetime_col = schema.get("datetime")
    
    if not amount_col:
        return {"columns": ["message"], "data": [{"message": "Amount column not found"}]}
    
    if not item_col or item_col not in df.columns:
        return {"columns": ["message"], "data": [{"message": "Item column not found"}]}
    
    # Group by item
    grouped = df.groupby(item_col).agg({
        amount_col: ['sum', 'count']
    }).reset_index()
    grouped.columns = [item_col, 'Revenue', 'Count']
    
    # Add category if available
    if category_col and category_col in df.columns:
        categories = df.groupby(item_col)[category_col].first().reset_index()
        categories.columns = [item_col, 'Category']
        grouped = grouped.merge(categories, on=item_col, how='left')
    
    # Compute volatility (std dev of daily revenue per item)
    if datetime_col and datetime_col in df.columns:
        try:
            df_copy = df.copy()
            df_copy['_date'] = pd.to_datetime(df_copy[datetime_col], errors='coerce').dt.date
            df_copy = df_copy.dropna(subset=['_date', item_col, amount_col])
            
            if not df_copy.empty:
                daily_revenue = df_copy.groupby([item_col, '_date'])[amount_col].sum().reset_index()
                volatility = daily_revenue.groupby(item_col)[amount_col].std().reset_index()
                volatility.columns = [item_col, 'Volatility']
                grouped = grouped.merge(volatility, on=item_col, how='left').fillna(0)
            else:
                grouped['Volatility'] = 0.0
        except Exception as e:
            logger.warning(f"Failed to compute volatility: {e}")
            grouped['Volatility'] = 0.0
    else:
        grouped['Volatility'] = 0.0
    
    # Rename item column
    grouped = grouped.rename(columns={item_col: 'Item'})
    
    # Sort by revenue and limit to top 100
    grouped = grouped.sort_values('Revenue', ascending=False).head(100)
    
    # Convert to list of dicts
    columns = ['Item', 'Revenue', 'Count']
    if category_col and category_col in df.columns:
        columns.append('Category')
    columns.append('Volatility')
    
    rows = grouped[columns].to_dict('records')
    
    # Ensure numeric types
    for row in rows:
        row['Revenue'] = float(row['Revenue'])
        row['Count'] = int(row['Count'])
        row['Volatility'] = float(row['Volatility'])
    
    return {"columns": columns, "data": rows}
