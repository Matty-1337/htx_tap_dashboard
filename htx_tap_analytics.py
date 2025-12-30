"""
HTX TAP - Advanced Revenue Analytics Suite
==========================================
Comprehensive analysis module for restaurant POS data
Computes: Waste Efficiency, Bottle Conversion, Menu Volatility, 
         Discount Integrity, Food Attachment, Peak Hours, Day of Week Analysis

Adapted for Supabase storage integration
Author: HTX TAP Analytics
"""

import pandas as pd
import numpy as np
import warnings
import io
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import json

warnings.filterwarnings('ignore')

# ============================================================
# DATA LOADING & CLEANING
# ============================================================

def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Clean column names and remove BOM characters"""
    if df is None or df.empty:
        return df
    df.columns = df.columns.str.replace('ï»¿', '').str.replace('\ufeff', '').str.strip()
    return df

def normalize_column_name(name):
    """Normalize column name for matching: lowercase, replace spaces/underscores."""
    normalized = str(name).lower().strip()
    normalized = normalized.replace('_', ' ').replace('-', ' ')
    normalized = normalized.replace(' ', '')
    return normalized

def find_column_fuzzy(df, candidates):
    """Find a column in the dataframe that matches any of the candidates."""
    if df is None or df.empty:
        return None
    
    df_cols_normalized = {}
    for col in df.columns:
        normalized = normalize_column_name(col)
        if normalized not in df_cols_normalized:
            df_cols_normalized[normalized] = col
    
    for candidate in candidates:
        normalized_candidate = normalize_column_name(candidate)
        if normalized_candidate in df_cols_normalized:
            return df_cols_normalized[normalized_candidate]
    
    return None

def load_csv_from_supabase(client, bucket, filepath):
    """Download and parse CSV file from Supabase with multiple encoding attempts."""
    try:
        response = client.storage.from_(bucket).download(filepath)
        
        encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
        
        for encoding in encodings:
            try:
                df = pd.read_csv(io.BytesIO(response), encoding=encoding)
                return df
            except UnicodeDecodeError:
                continue
        
        return None
    except Exception as e:
        print(f"Error loading {filepath}: {str(e)}")
        return None

def load_all_data(client, bucket, folder) -> Dict[str, pd.DataFrame]:
    """Load all CSV files from Supabase storage and return as dictionary of DataFrames"""
    
    # Get all files
    files = client.storage.from_(bucket).list(folder)
    csv_files = {f['name']: f for f in files if f.get('name', '').lower().endswith('.csv')}
    
    # Load sales files (October, November, December)
    sales_files = []
    for month in ['October', 'November', 'December']:
        for filename in csv_files.keys():
            if month.lower() in filename.lower() and 'sales' in filename.lower():
                filepath = f"{folder}/{filename}" if folder else filename
                df = load_csv_from_supabase(client, bucket, filepath)
                if df is not None:
                    df = clean_dataframe(df)
                    sales_files.append(df)
                    break
    
    if sales_files:
        all_sales = pd.concat(sales_files, ignore_index=True)
        
        # Find date column
        date_col = find_column_fuzzy(all_sales, ['Order Date', 'order_date', 'Sent Date', 'sent_date'])
        if date_col:
            all_sales[date_col] = pd.to_datetime(all_sales[date_col], format='%m/%d/%y %I:%M %p', errors='coerce')
            all_sales['Hour'] = all_sales[date_col].dt.hour
            all_sales['DayOfWeek'] = all_sales[date_col].dt.day_name()
            all_sales['Date'] = all_sales[date_col].dt.date
    else:
        all_sales = pd.DataFrame()
    
    # Load voids
    voids = None
    for filename in csv_files.keys():
        if 'void' in filename.lower():
            filepath = f"{folder}/{filename}" if folder else filename
            voids = load_csv_from_supabase(client, bucket, filepath)
            if voids is not None:
                voids = clean_dataframe(voids)
                void_date_col = find_column_fuzzy(voids, ['Void Date', 'void_date'])
                if void_date_col:
                    voids[void_date_col] = pd.to_datetime(voids[void_date_col], format='%m/%d/%Y %H:%M', errors='coerce')
                break
    
    # Load discounts
    discounts = None
    for filename in csv_files.keys():
        if 'discount' in filename.lower():
            filepath = f"{folder}/{filename}" if folder else filename
            discounts = load_csv_from_supabase(client, bucket, filepath)
            if discounts is not None:
                discounts = clean_dataframe(discounts)
                break
    
    # Load labor
    labor = None
    for filename in csv_files.keys():
        if 'labor' in filename.lower():
            filepath = f"{folder}/{filename}" if folder else filename
            labor = load_csv_from_supabase(client, bucket, filepath)
            if labor is not None:
                labor = clean_dataframe(labor)
                break
    
    # Load removed items
    removed = None
    for filename in csv_files.keys():
        if 'removed' in filename.lower():
            filepath = f"{folder}/{filename}" if folder else filename
            removed = load_csv_from_supabase(client, bucket, filepath)
            if removed is not None:
                removed = clean_dataframe(removed)
                break
    
    return {
        'sales': all_sales if not all_sales.empty else pd.DataFrame(),
        'voids': voids if voids is not None and not voids.empty else pd.DataFrame(),
        'discounts': discounts if discounts is not None and not discounts.empty else pd.DataFrame(),
        'labor': labor if labor is not None and not labor.empty else pd.DataFrame(),
        'removed': removed if removed is not None and not removed.empty else pd.DataFrame()
    }


# ============================================================
# ANALYSIS 1: WASTE EFFICIENCY COEFFICIENT
# ============================================================

def analyze_waste_efficiency(data: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Calculate waste efficiency (voids + removed items) as % of revenue per server"""
    sales = data['sales']
    voids = data['voids']
    removed = data['removed']
    
    if sales.empty:
        return pd.DataFrame()
    
    # Find revenue column
    revenue_col = find_column_fuzzy(sales, ['Net Price', 'net_price', 'Total Price', 'total_price'])
    if not revenue_col:
        return pd.DataFrame()
    
    # Find server column
    server_col = find_column_fuzzy(sales, ['Server', 'server'])
    if not server_col:
        return pd.DataFrame()
    
    # Server revenue
    server_revenue = sales.groupby(server_col)[revenue_col].sum().reset_index()
    server_revenue.columns = ['Server', 'Revenue']
    
    # Server voids
    if not voids.empty:
        void_price_col = find_column_fuzzy(voids, ['Total Price', 'total_price'])
        void_server_col = find_column_fuzzy(voids, ['Server', 'server'])
        if void_price_col and void_server_col:
            server_voids = voids.groupby(void_server_col)[void_price_col].sum().reset_index()
            server_voids.columns = ['Server', 'Void_Value']
        else:
            server_voids = pd.DataFrame(columns=['Server', 'Void_Value'])
    else:
        server_voids = pd.DataFrame(columns=['Server', 'Void_Value'])
    
    # Server removed items
    if not removed.empty:
        removed_price_col = find_column_fuzzy(removed, ['Total Price', 'total_price'])
        removed_server_col = find_column_fuzzy(removed, ['Server', 'server'])
        if removed_price_col and removed_server_col:
            server_removed = removed.groupby(removed_server_col)[removed_price_col].sum().reset_index()
            server_removed.columns = ['Server', 'Removed_Value']
        else:
            server_removed = pd.DataFrame(columns=['Server', 'Removed_Value'])
    else:
        server_removed = pd.DataFrame(columns=['Server', 'Removed_Value'])
    
    # Merge
    result = server_revenue.merge(server_voids, on='Server', how='left')
    result = result.merge(server_removed, on='Server', how='left')
    result = result.fillna(0)
    
    # Calculate metrics
    result['Total_Waste'] = result['Void_Value'] + result['Removed_Value']
    result['Waste_Rate_Pct'] = (result['Total_Waste'] / (result['Revenue'] + 0.01)) * 100
    result['Revenue_per_Waste_Dollar'] = result['Revenue'] / (result['Total_Waste'] + 1)
    
    # Status classification
    def classify_waste(rate):
        if rate < 10:
            return 'Good'
        elif rate < 15:
            return 'Monitor'
        elif rate < 20:
            return 'Caution'
        else:
            return 'Critical'
    
    result['Status'] = result['Waste_Rate_Pct'].apply(classify_waste)
    
    return result.sort_values('Revenue', ascending=False)


# ============================================================
# ANALYSIS 2: BOTTLE SERVICE CONVERSION
# ============================================================

def analyze_bottle_conversion(data: Dict[str, pd.DataFrame]) -> Tuple[pd.DataFrame, Dict]:
    """Calculate bottle service conversion rate per server"""
    sales = data['sales']
    
    if sales.empty:
        return pd.DataFrame(), {}
    
    # Find columns
    menu_item_col = find_column_fuzzy(sales, ['Menu Item', 'menu_item', 'Item Name', 'item_name'])
    table_col = find_column_fuzzy(sales, ['Table', 'table'])
    check_id_col = find_column_fuzzy(sales, ['Check Id', 'check_id'])
    server_col = find_column_fuzzy(sales, ['Server', 'server'])
    revenue_col = find_column_fuzzy(sales, ['Net Price', 'net_price', 'Total Price', 'total_price'])
    
    if not all([menu_item_col, check_id_col, server_col, revenue_col]):
        return pd.DataFrame(), {}
    
    # Identify bottle items
    sales['is_bottle'] = sales[menu_item_col].astype(str).str.contains('BTL', case=False, na=False)
    
    # Filter for table-based checks
    if table_col:
        check_analysis = sales[sales[table_col].notna() & (sales[table_col] != '')].groupby(check_id_col).agg({
            'is_bottle': 'max',
            revenue_col: 'sum',
            server_col: 'first'
        }).reset_index()
    else:
        check_analysis = sales.groupby(check_id_col).agg({
            'is_bottle': 'max',
            revenue_col: 'sum',
            server_col: 'first'
        }).reset_index()
    
    # Calculate metrics
    bottle_checks = check_analysis[check_analysis['is_bottle'] == True]
    non_bottle_checks = check_analysis[check_analysis['is_bottle'] == False]
    
    summary = {
        'total_checks': len(check_analysis),
        'bottle_checks': len(bottle_checks),
        'non_bottle_checks': len(non_bottle_checks),
        'bottle_pct': len(bottle_checks) / len(check_analysis) * 100 if len(check_analysis) > 0 else 0,
        'avg_bottle_check': float(bottle_checks[revenue_col].mean()) if len(bottle_checks) > 0 else 0,
        'avg_non_bottle_check': float(non_bottle_checks[revenue_col].mean()) if len(non_bottle_checks) > 0 else 0,
        'bottle_premium': float(bottle_checks[revenue_col].mean() / non_bottle_checks[revenue_col].mean()) if len(bottle_checks) > 0 and len(non_bottle_checks) > 0 and non_bottle_checks[revenue_col].mean() > 0 else 0
    }
    
    # By server
    server_conversion = check_analysis.groupby(server_col).agg({
        'is_bottle': ['sum', 'count', 'mean'],
        revenue_col: 'sum'
    }).reset_index()
    server_conversion.columns = ['Server', 'Bottle_Checks', 'Total_Checks', 'Conversion_Rate', 'Revenue']
    server_conversion['Conversion_Rate'] = server_conversion['Conversion_Rate'] * 100
    server_conversion = server_conversion.sort_values('Conversion_Rate', ascending=False)
    
    return server_conversion, summary


# ============================================================
# ANALYSIS 3: MENU VOLATILITY INDEX
# ============================================================

def analyze_menu_volatility(data: Dict[str, pd.DataFrame], min_sales: float = 1000) -> pd.DataFrame:
    """Calculate volatility (waste/sales) per menu item"""
    sales = data['sales']
    voids = data['voids']
    removed = data['removed']
    
    if sales.empty:
        return pd.DataFrame()
    
    # Find columns
    menu_item_col = find_column_fuzzy(sales, ['Menu Item', 'menu_item'])
    revenue_col = find_column_fuzzy(sales, ['Net Price', 'net_price'])
    qty_col = find_column_fuzzy(sales, ['Qty', 'qty', 'Quantity', 'quantity'])
    
    if not menu_item_col or not revenue_col:
        return pd.DataFrame()
    
    # Item sales
    agg_dict = {revenue_col: 'sum'}
    if qty_col:
        agg_dict[qty_col] = 'sum'
    item_sales = sales.groupby(menu_item_col).agg(agg_dict).reset_index()
    item_sales.columns = ['Menu Item', 'Net Price'] + (['Qty'] if qty_col else [])
    if not qty_col:
        item_sales['Qty'] = 0
    
    # Item voids
    item_voids = pd.DataFrame(columns=['Menu Item', 'Void_Value', 'Void_Qty'])
    if not voids.empty:
        void_item_col = find_column_fuzzy(voids, ['Item Name', 'item_name', 'Menu Item', 'menu_item'])
        void_price_col = find_column_fuzzy(voids, ['Total Price', 'total_price'])
        void_qty_col = find_column_fuzzy(voids, ['Item Quantity', 'item_quantity', 'Quantity', 'quantity'])
        
        if void_item_col and void_price_col:
            agg_dict = {void_price_col: 'sum'}
            if void_qty_col:
                agg_dict[void_qty_col] = 'sum'
            item_voids = voids.groupby(void_item_col).agg(agg_dict).reset_index()
            item_voids.columns = ['Menu Item', 'Void_Value'] + (['Void_Qty'] if void_qty_col else [])
            if not void_qty_col:
                item_voids['Void_Qty'] = 0
    
    # Item removed
    item_removed = pd.DataFrame(columns=['Menu Item', 'Removed_Value', 'Removed_Qty'])
    if not removed.empty:
        removed_item_col = find_column_fuzzy(removed, ['Item Name', 'item_name', 'Menu Item', 'menu_item'])
        removed_price_col = find_column_fuzzy(removed, ['Total Price', 'total_price'])
        removed_qty_col = find_column_fuzzy(removed, ['Item Quantity', 'item_quantity', 'Quantity', 'quantity'])
        
        if removed_item_col and removed_price_col:
            agg_dict = {removed_price_col: 'sum'}
            if removed_qty_col:
                agg_dict[removed_qty_col] = 'sum'
            item_removed = removed.groupby(removed_item_col).agg(agg_dict).reset_index()
            item_removed.columns = ['Menu Item', 'Removed_Value'] + (['Removed_Qty'] if removed_qty_col else [])
            if not removed_qty_col:
                item_removed['Removed_Qty'] = 0
    
    # Merge
    result = item_sales.merge(item_voids, on='Menu Item', how='left')
    result = result.merge(item_removed, on='Menu Item', how='left')
    result = result.fillna(0)
    
    # Calculate volatility
    result['Total_Waste'] = result['Void_Value'] + result['Removed_Value']
    result['Volatility_Pct'] = (result['Total_Waste'] / (result['Net Price'] + 0.01)) * 100
    
    # Filter to meaningful items
    result = result[result['Net Price'] >= min_sales]
    
    # Action classification
    def classify_action(vol):
        if vol > 100:
            return 'REMOVE'
        elif vol > 50:
            return 'Investigate'
        elif vol > 25:
            return 'Monitor'
        else:
            return 'OK'
    
    result['Action'] = result['Volatility_Pct'].apply(classify_action)
    
    return result.sort_values('Volatility_Pct', ascending=False)


# ============================================================
# ANALYSIS 4: DISCOUNT INTEGRITY AUDIT
# ============================================================

def analyze_discount_integrity(data: Dict[str, pd.DataFrame]) -> Tuple[pd.DataFrame, pd.DataFrame, List[Dict]]:
    """Identify suspicious discount patterns"""
    discounts = data['discounts']
    
    if discounts.empty:
        return pd.DataFrame(), pd.DataFrame(), []
    
    # Find columns
    server_col = find_column_fuzzy(discounts, ['Server', 'server'])
    discount_amount_col = find_column_fuzzy(discounts, ['Discount Amount', 'discount_amount', 'Total Price', 'total_price'])
    approver_col = find_column_fuzzy(discounts, ['Approver', 'approver'])
    comment_col = find_column_fuzzy(discounts, ['Comment', 'comment'])
    opened_date_col = find_column_fuzzy(discounts, ['Opened Date', 'opened_date'])
    
    if not server_col or not discount_amount_col:
        return pd.DataFrame(), pd.DataFrame(), []
    
    # Discount by server
    server_discounts = discounts.groupby(server_col)[discount_amount_col].agg(['sum', 'count']).reset_index()
    server_discounts.columns = ['Server', 'Total_Discounts', 'Discount_Count']
    
    # Red flags
    red_flags = []
    
    # Check for large discounts without comments
    if comment_col:
        large_discounts = discounts[discounts[discount_amount_col] > 500]
        for _, row in large_discounts.iterrows():
            if pd.isna(row.get(comment_col)) or row.get(comment_col) == '':
                red_flags.append({
                    'type': 'Large discount without comment',
                    'server': row[server_col],
                    'amount': float(row[discount_amount_col]),
                    'date': str(row.get(opened_date_col, '')) if opened_date_col else '',
                    'approver': str(row.get(approver_col, '')) if approver_col else ''
                })
    
    # Check for self-approvals
    if approver_col:
        for _, row in discounts.iterrows():
            if row[server_col] == row.get(approver_col):
                red_flags.append({
                    'type': 'Self-approved discount',
                    'server': row[server_col],
                    'amount': float(row[discount_amount_col]),
                    'date': str(row.get(opened_date_col, '')) if opened_date_col else ''
                })
    
    # Approver analysis
    approver_analysis = pd.DataFrame()
    if approver_col:
        approver_analysis = discounts.groupby(approver_col)[discount_amount_col].agg(['sum', 'count']).reset_index()
        approver_analysis.columns = ['Approver', 'Total_Approved', 'Approval_Count']
        approver_analysis = approver_analysis.sort_values('Total_Approved', ascending=False)
    
    return server_discounts, approver_analysis, red_flags


# ============================================================
# ANALYSIS 5: FOOD ATTACHMENT RATE
# ============================================================

def analyze_food_attachment(data: Dict[str, pd.DataFrame]) -> Tuple[pd.DataFrame, Dict]:
    """Calculate food attachment rate on liquor orders per server"""
    sales = data['sales']
    
    if sales.empty:
        return pd.DataFrame(), {}
    
    # Find columns
    check_id_col = find_column_fuzzy(sales, ['Check Id', 'check_id'])
    server_col = find_column_fuzzy(sales, ['Server', 'server'])
    sales_category_col = find_column_fuzzy(sales, ['Sales Category', 'sales_category', 'Category', 'category'])
    revenue_col = find_column_fuzzy(sales, ['Net Price', 'net_price', 'Total Price', 'total_price'])
    
    if not all([check_id_col, server_col, revenue_col]):
        return pd.DataFrame(), {}
    
    # Aggregate by check
    if sales_category_col:
        check_analysis = sales.groupby([check_id_col, server_col]).agg({
            sales_category_col: lambda x: list(x.unique()),
            revenue_col: 'sum'
        }).reset_index()
        
        check_analysis['has_food'] = check_analysis[sales_category_col].apply(lambda x: 'Food' in x if isinstance(x, list) else False)
        check_analysis['has_liquor'] = check_analysis[sales_category_col].apply(lambda x: 'Liquor' in x if isinstance(x, list) else False)
    else:
        check_analysis = sales.groupby([check_id_col, server_col]).agg({
            revenue_col: 'sum'
        }).reset_index()
        check_analysis['has_food'] = False
        check_analysis['has_liquor'] = True
    
    # Focus on liquor checks
    liquor_checks = check_analysis[check_analysis['has_liquor'] == True]
    
    if liquor_checks.empty:
        return pd.DataFrame(), {}
    
    # By server
    server_attachment = liquor_checks.groupby(server_col).agg({
        'has_food': ['sum', 'count', 'mean'],
        revenue_col: 'sum'
    }).reset_index()
    server_attachment.columns = ['Server', 'Food_Checks', 'Liquor_Checks', 'Attachment_Rate', 'Revenue']
    server_attachment['Attachment_Rate'] = server_attachment['Attachment_Rate'] * 100
    server_attachment = server_attachment[server_attachment['Liquor_Checks'] >= 30]
    
    # Calculate opportunity
    avg_food_check = 0
    if sales_category_col:
        food_sales = sales[sales[sales_category_col] == 'Food']
        if not food_sales.empty and check_analysis['has_food'].sum() > 0:
            avg_food_check = food_sales[revenue_col].sum() / check_analysis['has_food'].sum()
    
    top_rate = server_attachment['Attachment_Rate'].max() if not server_attachment.empty else 0
    
    server_attachment['Potential_Food_Checks'] = server_attachment['Liquor_Checks'] * (top_rate / 100)
    server_attachment['Missed_Checks'] = server_attachment['Potential_Food_Checks'] - server_attachment['Food_Checks']
    server_attachment['Missed_Revenue'] = server_attachment['Missed_Checks'] * avg_food_check
    
    summary = {
        'total_liquor_checks': len(liquor_checks),
        'food_attached': int(liquor_checks['has_food'].sum()),
        'overall_rate': float(liquor_checks['has_food'].mean() * 100),
        'avg_food_spend': float(avg_food_check),
        'top_rate': float(top_rate),
        'total_missed_revenue': float(server_attachment['Missed_Revenue'].sum())
    }
    
    return server_attachment.sort_values('Attachment_Rate', ascending=False), summary


# ============================================================
# ANALYSIS 6: PEAK HOUR ANALYSIS
# ============================================================

def analyze_peak_hours(data: Dict[str, pd.DataFrame]) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Identify peak revenue hours and days"""
    sales = data['sales']
    
    if sales.empty or 'Hour' not in sales.columns:
        return pd.DataFrame(), pd.DataFrame()
    
    # Find columns
    revenue_col = find_column_fuzzy(sales, ['Net Price', 'net_price', 'Total Price', 'total_price'])
    order_id_col = find_column_fuzzy(sales, ['Order Id', 'order_id'])
    
    if not revenue_col:
        return pd.DataFrame(), pd.DataFrame()
    
    # Hourly analysis
    agg_dict = {revenue_col: 'sum'}
    if order_id_col:
        agg_dict[order_id_col] = 'nunique'
    hourly = sales.groupby('Hour').agg(agg_dict).reset_index()
    hourly.columns = ['Hour', 'Net Price'] + (['Order Id'] if order_id_col else [])
    if not order_id_col:
        hourly['Order Id'] = 0
    hourly['Pct_Revenue'] = hourly['Net Price'] / hourly['Net Price'].sum() * 100
    hourly = hourly.sort_values('Net Price', ascending=False)
    
    # Day of week analysis
    if 'DayOfWeek' not in sales.columns:
        return hourly, pd.DataFrame()
    
    agg_dict = {revenue_col: 'sum'}
    if order_id_col:
        agg_dict[order_id_col] = 'nunique'
    dow = sales.groupby('DayOfWeek').agg(agg_dict).reset_index()
    dow.columns = ['DayOfWeek', 'Net Price'] + (['Order Id'] if order_id_col else [])
    if not order_id_col:
        dow['Order Id'] = 0
    dow_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    dow['DayOfWeek'] = pd.Categorical(dow['DayOfWeek'], categories=dow_order, ordered=True)
    dow = dow.sort_values('DayOfWeek')
    dow['Pct_Revenue'] = dow['Net Price'] / dow['Net Price'].sum() * 100
    
    return hourly, dow


# ============================================================
# SUPABASE UPLOAD FUNCTIONS
# ============================================================

def upload_to_supabase(client, df: pd.DataFrame, table_name: str, report_period: str = None):
    """Upload DataFrame to Supabase table"""
    if df is None or df.empty:
        return None
    
    try:
        # Add metadata
        df_upload = df.copy()
        if report_period:
            df_upload['report_period'] = report_period
        df_upload['created_at'] = datetime.now().isoformat()
        
        # Convert to records
        records = df_upload.to_dict('records')
        
        # Convert numpy types to Python types
        def convert_types(obj):
            if isinstance(obj, (np.int64, np.int32, np.int16, np.int8)):
                return int(obj)
            elif isinstance(obj, (np.float64, np.float32, np.float16)):
                return float(obj)
            elif isinstance(obj, np.bool_):
                return bool(obj)
            elif pd.isna(obj):
                return None
            return obj
        
        records_clean = []
        for record in records:
            clean_record = {k: convert_types(v) for k, v in record.items()}
            records_clean.append(clean_record)
        
        # Upsert to Supabase
        response = client.table(table_name).upsert(records_clean).execute()
        
        return response
    except Exception as e:
        print(f"Error uploading to {table_name}: {str(e)}")
        return None


# ============================================================
# MAIN EXECUTION
# ============================================================

def run_full_analysis(client, bucket, folder, upload_to_db: bool = False, report_period: str = None) -> Dict:
    """Run all analyses and return comprehensive results"""
    
    # Load data
    data = load_all_data(client, bucket, folder)
    
    if data['sales'].empty:
        return {'error': 'No sales data found'}
    
    # Run all analyses
    results = {}
    
    # Analysis 1: Waste Efficiency
    results['waste_efficiency'] = analyze_waste_efficiency(data)
    if upload_to_db and not results['waste_efficiency'].empty:
        upload_to_supabase(client, results['waste_efficiency'], 'waste_efficiency', report_period)
    
    # Analysis 2: Bottle Conversion
    results['bottle_conversion'], results['bottle_summary'] = analyze_bottle_conversion(data)
    if upload_to_db and not results['bottle_conversion'].empty:
        upload_to_supabase(client, results['bottle_conversion'], 'bottle_conversion', report_period)
    
    # Analysis 3: Menu Volatility
    results['menu_volatility'] = analyze_menu_volatility(data)
    if upload_to_db and not results['menu_volatility'].empty:
        upload_to_supabase(client, results['menu_volatility'], 'menu_volatility', report_period)
    
    # Analysis 4: Discount Integrity
    results['discount_analysis'], results['approver_analysis'], results['discount_red_flags'] = analyze_discount_integrity(data)
    if upload_to_db and not results['discount_analysis'].empty:
        upload_to_supabase(client, results['discount_analysis'], 'discount_analysis', report_period)
    
    # Analysis 5: Food Attachment
    results['food_attachment'], results['attachment_summary'] = analyze_food_attachment(data)
    if upload_to_db and not results['food_attachment'].empty:
        upload_to_supabase(client, results['food_attachment'], 'food_attachment', report_period)
    
    # Analysis 6: Peak Hours
    results['hourly_analysis'], results['dow_analysis'] = analyze_peak_hours(data)
    if upload_to_db and not results['hourly_analysis'].empty:
        upload_to_supabase(client, results['hourly_analysis'], 'hourly_analysis', report_period)
    if upload_to_db and not results['dow_analysis'].empty:
        upload_to_supabase(client, results['dow_analysis'], 'dow_analysis', report_period)
    
    return results

