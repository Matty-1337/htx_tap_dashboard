"""
Premiere Elite Executive Dashboard for Toast POS Data
=====================================================
Simplified robust implementation for server metrics calculation.
"""

from typing import Optional, Tuple
import pandas as pd
import numpy as np
import sys

def find_column(df: pd.DataFrame, possible_names: list) -> Optional[str]:
    """Find column by trying multiple possible names."""
    for name in possible_names:
        if name in df.columns:
            return name
        # Try case-insensitive
        for col in df.columns:
            if col.lower() == name.lower():
                return col
    return None

def calculate_revenue(df: pd.DataFrame) -> pd.DataFrame:
    """Ensure revenue column exists."""
    if 'revenue' not in df.columns:
        # Try to calculate from Net Sales or Amount
        for col in ['net_sales', 'net_price', 'amount', 'total', 'item_net_sales']:
            if col in df.columns:
                # Try to multiply by quantity if available
                if 'qty' in df.columns or 'qty_clean' in df.columns:
                    qty_col = 'qty_clean' if 'qty_clean' in df.columns else 'qty'
                    df['revenue'] = pd.to_numeric(df[col], errors='coerce').fillna(0) * pd.to_numeric(df[qty_col], errors='coerce').fillna(1)
                else:
                    df['revenue'] = pd.to_numeric(df[col], errors='coerce').fillna(0)
                return df
        # Last resort: set to 0
        df['revenue'] = 0.0
    return df

def apply_business_day_logic(df: pd.DataFrame) -> pd.DataFrame:
    """Ensure business_date exists."""
    if 'business_date' not in df.columns:
        date_col = find_column(df, ['date', 'sent_date', 'order_date', 'opened_date'])
        if date_col:
            df['date'] = pd.to_datetime(df[date_col], errors='coerce')
            df['business_date'] = df['date']
            # Simple logic: If hour < 4am, counts as yesterday
            df.loc[df['date'].dt.hour < 4, 'business_date'] = df.loc[df['date'].dt.hour < 4, 'business_date'] - pd.Timedelta(days=1)
        else:
            df['business_date'] = pd.NaT
            df['date'] = pd.NaT
    
    # Ensure hour column exists
    if 'hour' not in df.columns and 'date' in df.columns:
        df['hour'] = pd.to_datetime(df['date'], errors='coerce').dt.hour
    elif 'hour_bucket' in df.columns:
        df['hour'] = df['hour_bucket']
    
    return df

def process_void_column(df: pd.DataFrame) -> Tuple[pd.DataFrame, Optional[int]]:
    """Identify void transactions."""
    if 'is_voided' not in df.columns:
        # Look for standard void flags
        df['is_voided'] = False
        void_col = find_column(df, ['void', 'voided', 'is_void', 'void_', 'void?'])
        if void_col:
            void_values = df[void_col].astype(str).str.lower()
            df['is_voided'] = void_values.isin(['true', 'yes', 't', 'y', '1', 'void', 'voided'])
    
    # Create valid_sale column (Not void)
    df['valid_sale'] = ~df['is_voided']
    voided_count = df['is_voided'].sum() if 'is_voided' in df.columns else 0
    return df, int(voided_count) if voided_count else None

def calculate_shift_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate basic shift metrics - simplified version."""
    # Find server and date columns
    server_col = find_column(df, ['server', 'server_name', 'employee', 'staff'])
    if not server_col or 'business_date' not in df.columns:
        # Return empty DataFrame with expected columns
        return pd.DataFrame(columns=['Server', 'Business_Date', 'Hours_Worked', 'Total_Sales', 'Transaction_Count'])
    
    # Group by server and business date
    shift_stats = df.groupby([server_col, 'business_date']).agg({
        'revenue': 'sum',
        'date': 'count'  # Transaction count
    }).reset_index()
    
    shift_stats.columns = [server_col, 'business_date', 'Total_Sales', 'Transaction_Count']
    
    # Estimate hours worked (default to 5 hours per shift if no time data)
    if 'date' in df.columns:
        df_with_time = df.copy()
        df_with_time['date'] = pd.to_datetime(df_with_time['date'], errors='coerce')
        hours_per_shift = df_with_time.groupby([server_col, 'business_date'])['date'].apply(
            lambda x: max(1.0, (x.max() - x.min()).total_seconds() / 3600.0) if len(x) > 1 else 5.0
        ).reset_index(name='Hours_Worked')
        shift_stats = shift_stats.merge(hours_per_shift, on=[server_col, 'business_date'], how='left')
        shift_stats['Hours_Worked'] = shift_stats['Hours_Worked'].fillna(5.0)
    else:
        shift_stats['Hours_Worked'] = 5.0  # Default estimate
    
    shift_stats.columns = ['Server', 'Business_Date', 'Total_Sales', 'Transaction_Count', 'Hours_Worked']
    return shift_stats

def calculate_server_metrics(df: pd.DataFrame, shift_df: Optional[pd.DataFrame] = None) -> pd.DataFrame:
    """
    Generate the SERVER GRADES (Moneyball Stats) - simplified robust version.
    """
    # Find server column
    server_col = find_column(df, ['server', 'server_name', 'employee', 'staff'])
    if not server_col:
        print("[EXEC_DASH] Warning: No server column found", file=sys.stdout, flush=True)
        return pd.DataFrame()
    
    # Use shift_df if available, otherwise aggregate directly from df
    if shift_df is not None and len(shift_df) > 0 and 'Server' in shift_df.columns:
        # Aggregate shift metrics by server
        stats = shift_df.groupby('Server').agg({
            'Total_Sales': 'sum',
            'Hours_Worked': 'sum',
            'Transaction_Count': 'sum',
            'Business_Date': 'nunique'
        }).reset_index()
        
        # Calculate Sales Per Hour
        stats['Sales_Per_Hour'] = (stats['Total_Sales'] / stats['Hours_Worked'].replace(0, 1)).round(2)
        
        # Calculate Hustle Score (transactions per hour)
        stats['Hustle_Score'] = (stats['Transaction_Count'] / stats['Hours_Worked'].replace(0, 1)).round(2)
    else:
        # Fallback: aggregate directly from df
        stats = df.groupby(server_col).agg({
            'revenue': 'sum',
            'date': 'count'
        }).reset_index()
        stats.columns = ['Server', 'Total_Sales', 'Transaction_Count']
        stats['Hours_Worked'] = 5.0 * stats['Server'].map(df.groupby(server_col)['business_date'].nunique() if 'business_date' in df.columns else lambda x: 1)
        stats['Sales_Per_Hour'] = (stats['Total_Sales'] / stats['Hours_Worked'].replace(0, 1)).round(2)
        stats['Hustle_Score'] = (stats['Transaction_Count'] / stats['Hours_Worked'].replace(0, 1)).round(2)
    
    # Calculate void metrics
    if 'is_voided' in df.columns:
        void_df = df[df['is_voided'] == True]
        if len(void_df) > 0:
            void_stats = void_df.groupby(server_col).agg({
                'is_voided': 'count',
                'revenue': 'sum'
            }).reset_index()
            void_stats.columns = [server_col, 'Void_Count', 'Void_Revenue']
        else:
            # No voids - create empty stats with correct structure
            void_stats = pd.DataFrame({server_col: [], 'Void_Count': [], 'Void_Revenue': []})
            # Merge will fill with NaN which we'll handle below
        
        if len(void_stats) > 0:
            stats = stats.merge(void_stats, left_on='Server', right_on=server_col, how='left')
            stats['Void_Count'] = stats['Void_Count'].fillna(0).astype(int)
            stats['Void_Revenue'] = stats['Void_Revenue'].fillna(0.0)
            # Drop duplicate server column if it exists
            if server_col in stats.columns and server_col != 'Server':
                stats = stats.drop(columns=[server_col])
        else:
            stats['Void_Count'] = 0
            stats['Void_Revenue'] = 0.0
        
        # Calculate Void Rate
        stats['Void_Rate'] = ((stats['Void_Revenue'] / stats['Total_Sales'].replace(0, 1)) * 100).round(2)
        stats['True_Retention'] = (1.0 - (stats['Void_Count'] / stats['Transaction_Count'].replace(0, 1))).round(3)
    else:
        stats['Void_Count'] = 0
        stats['Void_Rate'] = 0.0
        stats['True_Retention'] = 1.0
    
    # Calculate Error Rate (same as void rate for now)
    stats['Error_Rate'] = stats['Void_Rate']
    
    # Grading Logic (A/B/C based on Sales Per Hour quartiles)
    if len(stats) > 0:
        q75 = stats['Sales_Per_Hour'].quantile(0.75)
        q25 = stats['Sales_Per_Hour'].quantile(0.25)
        
        stats['Grade'] = 'C'
        stats.loc[stats['Sales_Per_Hour'] > q75, 'Grade'] = 'A'
        stats.loc[(stats['Sales_Per_Hour'] > q25) & (stats['Sales_Per_Hour'] <= q75), 'Grade'] = 'B'
    else:
        stats['Grade'] = 'C'
    
    # Clean up duplicate server column if exists
    if server_col != 'Server' and server_col in stats.columns:
        stats = stats.drop(columns=[server_col])
    
    # Ensure Server column name is consistent
    if server_col != 'Server':
        stats = stats.rename(columns={server_col: 'Server'})
    
    return stats

def detect_anomalies(server_metrics: pd.DataFrame) -> pd.DataFrame:
    """Pass-through for now - add ML anomaly detection later if needed."""
    if len(server_metrics) == 0:
        return server_metrics
    
    # Add placeholder columns for compatibility
    if 'Anomaly_Score' not in server_metrics.columns:
        server_metrics['Anomaly_Score'] = 0.0
    if 'Is_Anomaly' not in server_metrics.columns:
        server_metrics['Is_Anomaly'] = False
    
    return server_metrics
