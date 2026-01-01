"""
Schema-tolerant column detection utilities for pandas DataFrames.
Detects key columns using case-insensitive matching and name-pattern heuristics.
"""
import pandas as pd
import logging
from typing import Optional, Dict, List
from date_filter import CANDIDATE_DATE_COLUMNS

logger = logging.getLogger(__name__)


def normalize_columns(df: pd.DataFrame) -> Dict[str, str]:
    """
    Create a mapping from lowercase column names to actual column names.
    
    Args:
        df: pandas DataFrame
    
    Returns:
        Dictionary mapping lowercase -> actual column name
        Example: {"net_price": "Net_Price", "date": "Date"}
    """
    if df is None or df.empty or len(df.columns) == 0:
        return {}
    
    return {col.lower(): col for col in df.columns}


def find_col(
    df: pd.DataFrame,
    candidates: List[str],
    mode: str = 'exact'
) -> Optional[str]:
    """
    Internal helper to find a column in DataFrame using case-insensitive matching.
    
    Strategy: Always try exact matches first, then contains matches if mode allows.
    
    Args:
        df: pandas DataFrame
        candidates: List of candidate column names (case-insensitive)
        mode: 'exact' for exact match only, 'contains' to also try substring match
    
    Returns:
        Actual column name (preserving case) if found, None otherwise
    """
    if df is None or df.empty or len(df.columns) == 0:
        return None
    
    # Normalize for quick lookup
    normalized = normalize_columns(df)
    
    # Phase 1: Try exact matches first (case-insensitive)
    for candidate in candidates:
        candidate_lower = candidate.lower()
        if candidate_lower in normalized:
            actual_col = normalized[candidate_lower]
            logger.debug(f"Found column '{actual_col}' (exact match for '{candidate}')")
            return actual_col
    
    # Phase 2: If mode allows, try contains matches
    if mode == 'contains':
        for candidate in candidates:
            candidate_lower = candidate.lower()
            for col_lower, actual_col in normalized.items():
                if candidate_lower in col_lower:
                    logger.debug(f"Found column '{actual_col}' (contains match for '{candidate}')")
                    return actual_col
    
    return None


def find_amount_col(df: pd.DataFrame) -> Optional[str]:
    """
    Find the revenue/amount column.
    
    Candidates (ordered by priority):
    - net_price, net_price, net_sales, net sales, sales, revenue, amount, total, price
    
    Strategy: exact match first, then contains
    """
    candidates = [
        "net_price", "net price", "net_sales", "net sales",
        "sales", "revenue", "amount", "total", "price"
    ]
    return find_col(df, candidates, mode='contains')


def find_datetime_col(df: pd.DataFrame) -> Optional[str]:
    """
    Find the datetime/date column.
    
    Uses date_filter.CANDIDATE_DATE_COLUMNS plus additional candidates:
    - business_date, order_date, created, created_at, closed_at, opened_at,
      timestamp, transaction_date, sale_date, sent date, order date
    
    Strategy: exact match first, then contains
    """
    # Start with date_filter candidates
    candidates = list(CANDIDATE_DATE_COLUMNS)
    # Add additional candidates (expanded aliases from user requirements)
    additional = [
        "business_date", "order_date", "order date", "created", "created_at",
        "closed_at", "opened_at", "timestamp", "transaction_date", "sale_date",
        "sent date", "Sent Date", "check opened", "Check Opened",
        "check closed", "Check Closed", "close date", "Close Date"
    ]
    candidates.extend(additional)
    return find_col(df, candidates, mode='contains')


def find_employee_col(df: pd.DataFrame) -> Optional[str]:
    """
    Find the employee/server column.
    
    Candidates (expanded aliases):
    - server, employee, employee_name, staff, cashier, user, username,
      server name, Server Name, staff, Created By, User, Bartender
    
    Strategy: exact match first, then contains
    """
    candidates = [
        "server", "employee", "employee_name", "staff",
        "cashier", "user", "username", "server name", "Server Name",
        "Server", "Employee", "Created By", "Bartender"
    ]
    return find_col(df, candidates, mode='contains')


def find_item_col(df: pd.DataFrame) -> Optional[str]:
    """
    Find the menu item/product column.
    
    Candidates:
    - item, item_name, menu_item, product, product_name
    
    Strategy: exact match first, then contains
    """
    candidates = [
        "item", "item_name", "menu_item", "product", "product_name"
    ]
    return find_col(df, candidates, mode='contains')


def find_category_col(df: pd.DataFrame) -> Optional[str]:
    """
    Find the category/department column.
    
    Candidates:
    - category, item_category, product_category, type, department
    
    Strategy: exact match first, then contains
    """
    candidates = [
        "category", "item_category", "product_category", "type", "department"
    ]
    return find_col(df, candidates, mode='contains')


def find_void_flag_col(df: pd.DataFrame) -> Optional[str]:
    """
    Find the void flag column (boolean or indicator).
    
    Candidates:
    - is_void, is_voided, voided, void, void_flag
    
    Strategy: exact match first, then contains
    """
    candidates = [
        "is_void", "is_voided", "voided", "void", "void_flag"
    ]
    return find_col(df, candidates, mode='contains')


def find_discount_amount_col(df: pd.DataFrame) -> Optional[str]:
    """
    Find the discount/comp amount column (best effort).
    
    Candidates:
    - discount, discount_amount, discounted_amount, promo, comp
    
    Strategy: exact match first, then contains
    """
    candidates = [
        "discount", "discount_amount", "discounted_amount", "promo", "comp"
    ]
    return find_col(df, candidates, mode='contains')


def find_removal_flag_or_amount_col(df: pd.DataFrame) -> Optional[str]:
    """
    Find the removal flag or amount column (best effort).
    
    Candidates:
    - removed, removal, is_removed, delete, deleted
    
    Strategy: exact match first, then contains
    """
    candidates = [
        "removed", "removal", "is_removed", "delete", "deleted"
    ]
    return find_col(df, candidates, mode='contains')


def find_reason_col(df: pd.DataFrame) -> Optional[str]:
    """
    Find the reason column (void/removal/comp reasons).
    
    Candidates:
    - void_reason, reason, comp_reason, removal_reason, note, comment, description
    
    Strategy: exact match first, then contains
    """
    candidates = [
        "void_reason", "reason", "comp_reason", "removal_reason",
        "note", "comment", "description"
    ]
    return find_col(df, candidates, mode='contains')


def find_order_id_col(df: pd.DataFrame) -> Optional[str]:
    """
    Find the order/check/tab ID column (best effort).
    
    Candidates (expanded aliases):
    - order_id, check_id, tab_id, ticket_id, receipt, transaction_id,
      Order Id, Check Id, Ticket Id, Receipt Number, Transaction Id
    
    Strategy: exact match first, then contains
    """
    candidates = [
        "order_id", "check_id", "tab_id", "ticket_id", "receipt", "transaction_id",
        "Order Id", "Check Id", "Ticket Id", "Receipt Number", "Transaction Id",
        "order id", "check id", "ticket id", "receipt number", "transaction id"
    ]
    return find_col(df, candidates, mode='contains')


def detect_schema(df: pd.DataFrame) -> Dict[str, Optional[str]]:
    """
    Debug helper: detect all key columns and return a dictionary of chosen column names.
    
    Safe to log - only prints column names, never raw data.
    
    Args:
        df: pandas DataFrame
    
    Returns:
        Dictionary mapping detector name -> detected column name (or None)
    """
    schema = {
        "amount": find_amount_col(df),
        "datetime": find_datetime_col(df),
        "employee": find_employee_col(df),
        "item": find_item_col(df),
        "category": find_category_col(df),
        "void_flag": find_void_flag_col(df),
        "discount_amount": find_discount_amount_col(df),
        "removal_flag_or_amount": find_removal_flag_or_amount_col(df),
        "reason": find_reason_col(df),
        "order_id": find_order_id_col(df),
    }
    
    # Log detected schema (safe - only column names)
    logger.info("Detected schema:")
    for key, col in schema.items():
        if col:
            logger.info(f"  {key}: '{col}'")
        else:
            logger.debug(f"  {key}: not found")
    
    return schema
