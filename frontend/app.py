"""
Toast Analytics Dashboard - HTX TAP
A comprehensive restaurant analytics platform for Toast POS data
Version: 2.2 - Column Auto-Detection
"""

import io
import time
from datetime import datetime, timedelta, date
import pandas as pd
import numpy as np
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from supabase import create_client
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from htx_tap_analytics import run_full_analysis
import executive_dashboard as ed

# =========================================================
# PAGE CONFIGURATION
# =========================================================

st.set_page_config(
    page_title="HTX TAP - Toast Analytics",
    layout="wide",
    page_icon="🍞",
    initial_sidebar_state="expanded"
)

# =========================================================
# CUSTOM STYLING - BRAND IDENTITY LIGHT THEME
# =========================================================

st.markdown("""
<style>
    /* Global App Styling */
    .stApp {
        background: #f8f4ed;
    }
    
    /* Main Title */
    h1 {
        color: #272a29;
        font-weight: 800;
        letter-spacing: -0.5px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    
    h2, h3 {
        color: #363a39;
        font-weight: 600;
    }
    
    /* Metric Cards */
    div[data-testid="stMetricValue"] {
        font-size: 2rem;
        font-weight: 700;
        color: #b88f4d;
    }
    
    div[data-testid="stMetricLabel"] {
        color: #363a39;
        font-weight: 500;
        font-size: 0.9rem;
    }
    
    div[data-testid="stMetricDelta"] {
        color: #10b981;
    }
    
    /* Card Containers */
    .metric-card {
        background: #e2d2b8;
        border: 1px solid #cdb082;
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }
    
    /* Sidebar Styling */
    section[data-testid="stSidebar"] {
        background: #eeeeee;
        border-right: 1px solid #cdb082;
    }
    
    section[data-testid="stSidebar"] h2 {
        color: #b88f4d;
    }
    
    /* Button Styling */
    .stButton>button {
        background: linear-gradient(135deg, #b88f4d 0%, #cdb082 100%);
        color: #272a29;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        padding: 0.5rem 1.5rem;
        transition: all 0.3s ease;
    }
    
    .stButton>button:hover {
        background: linear-gradient(135deg, #816435 0%, #b88f4d 100%);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(184, 143, 77, 0.4);
    }
    
    /* Download Button */
    .stDownloadButton>button {
        background: #f8f4ed;
        color: #b88f4d;
        border: 1px solid #b88f4d;
        border-radius: 8px;
        font-weight: 600;
    }
    
    .stDownloadButton>button:hover {
        background: #e2d2b8;
        border-color: #816435;
    }
    
    /* Input Fields */
    .stTextInput>div>div>input {
        background: #ffffff;
        color: #363a39;
        border: 1px solid #cdb082;
        border-radius: 8px;
    }
    
    /* Date Input */
    .stDateInput>div>div>input {
        background: #ffffff;
        color: #363a39;
        border: 1px solid #cdb082;
        border-radius: 8px;
    }
    
    /* Selectbox/Multiselect */
    .stSelectbox>div>div>div {
        background: #ffffff;
        color: #363a39;
        border: 1px solid #cdb082;
    }
    
    /* Divider */
    hr {
        border-color: #cdb082;
        margin: 2rem 0;
    }
    
    /* DataFrame */
    .dataframe {
        background: #ffffff;
        color: #363a39;
        border: 1px solid #cdb082;
    }
    
    /* Success/Warning/Error Messages */
    .stSuccess {
        background: rgba(16, 185, 129, 0.1);
        border-left: 4px solid #10b981;
    }
    
    .stWarning {
        background: rgba(205, 176, 130, 0.2);
        border-left: 4px solid #cdb082;
    }
    
    .stError {
        background: rgba(239, 68, 68, 0.1);
        border-left: 4px solid #ef4444;
    }
    
    /* Info boxes */
    .stInfo {
        background: rgba(205, 176, 130, 0.15);
        border-left: 4px solid #cdb082;
    }
    
    /* Text color adjustments */
    p, span, div {
        color: #363a39;
    }
    
    /* Caption/subtext */
    .stCaption {
        color: #818786;
    }
</style>
""", unsafe_allow_html=True)

# =========================================================
# SUPABASE CONNECTION
# =========================================================

@st.cache_resource(ttl=3600)
def init_supabase():
    """
    Initialize Supabase client with credentials from secrets.
    Cached for 1 hour to prevent repeated connections.
    """
    try:
        url = st.secrets["SUPABASE_URL"]
        key = st.secrets["SUPABASE_SERVICE_ROLE_KEY"]
        client = create_client(url, key)
        
        # Test connection
        client.storage.list_buckets()
        
        return client
    except KeyError as e:
        st.error(f"🚨 **Missing Configuration**: {e}")
        st.info("""
        **Setup Required:**
        1. Create `.streamlit/secrets.toml` file in your project root
        2. Add your Supabase credentials:
```toml
        SUPABASE_URL = "your-project-url"
        SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
        SUPABASE_BUCKET = "client-data"
```
        """)
        st.stop()
    except Exception as e:
        st.error(f"🚨 **Connection Failed**: {str(e)}")
        st.stop()

# =========================================================
# DATA LOADING FUNCTIONS
# =========================================================

def get_files_from_supabase(client, bucket, folder):
    """
    Retrieve CSV files from Supabase storage.
    
    Args:
        client: Supabase client instance
        bucket: Storage bucket name
        folder: Folder path within bucket
        
    Returns:
        list: File metadata objects
    """
    try:
        # First, try listing the specific folder
        files = client.storage.from_(bucket).list(folder)
        
        # Filter out placeholder files and keep only CSVs
        files = [f for f in files if f.get('name', '').lower().endswith('.csv') 
                 and 'placeholder' not in f.get('name', '').lower()]
        
        # If folder is empty, search root directory
        if not files:
            st.warning(f"⚠️ No files in '{folder}'. Searching entire bucket...")
            files = client.storage.from_(bucket).list("")
            files = [f for f in files if f.get('name', '').lower().endswith('.csv')
                     and 'placeholder' not in f.get('name', '').lower()]
        
        return files
    
    except Exception as e:
        st.error(f"❌ Error accessing storage: {str(e)}")
        return []

@st.cache_data(ttl=1800)  # Cache for 30 minutes
def load_csv_from_supabase(_client, bucket, filepath):
    """
    Download and parse CSV file from Supabase with multiple encoding attempts.
    
    Args:
        _client: Supabase client (prefixed with _ to prevent hashing)
        bucket: Storage bucket name
        filepath: Full path to CSV file
        
    Returns:
        DataFrame: Parsed CSV data
    """
    try:
        response = _client.storage.from_(bucket).download(filepath)
        
        # Try different encodings
        encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
        
        for encoding in encodings:
            try:
                df = pd.read_csv(io.BytesIO(response), encoding=encoding)
                return df
            except UnicodeDecodeError:
                continue
        
        # If all encodings fail
        st.error(f"❌ Could not decode {filepath} with any encoding")
        return None
        
    except Exception as e:
        st.error(f"Error loading {filepath}: {str(e)}")
        return None

# =========================================================
# DATA PROCESSING FUNCTIONS
# =========================================================

def clean_currency_column(series):
    """
    Clean currency strings and convert to float.
    Handles: $1,234.56 -> 1234.56
    """
    return (
        series.astype(str)
        .str.replace('$', '', regex=False)
        .str.replace(',', '', regex=False)
        .str.replace(' ', '', regex=False)
        .pipe(pd.to_numeric, errors='coerce')
        .fillna(0)
    )

def normalize_column_name(name):
    """
    Normalize column name for matching: lowercase, replace spaces/underscores.
    
    Args:
        name: Column name to normalize
        
    Returns:
        str: Normalized column name
    """
    # Convert to lowercase and replace spaces/underscores with a standard separator
    normalized = str(name).lower().strip()
    # Replace both spaces and underscores with a single space, then remove spaces
    normalized = normalized.replace('_', ' ').replace('-', ' ')
    # Remove all spaces for comparison
    normalized = normalized.replace(' ', '')
    return normalized

def find_column_fuzzy(df, candidates):
    """
    Find a column in the dataframe that matches any of the candidates.
    Handles case-insensitive matching and spaces vs underscores.
    
    Examples:
        - "Order Date" matches "order_date", "order date", "OrderDate"
        - "Total Price" matches "total_price", "total price", "TotalPrice"
    
    Args:
        df: DataFrame to search
        candidates: List of possible column names (can have spaces or underscores)
        
    Returns:
        str or None: Matched column name (original case) or None
    """
    # Create normalized mapping: normalized_name -> original_column_name
    df_cols_normalized = {}
    for col in df.columns:
        normalized = normalize_column_name(col)
        if normalized not in df_cols_normalized:
            df_cols_normalized[normalized] = col
    
    # Check each candidate
    for candidate in candidates:
        normalized_candidate = normalize_column_name(candidate)
        if normalized_candidate in df_cols_normalized:
            return df_cols_normalized[normalized_candidate]
    
    return None

def standardize_dataframe(df, filename=""):
    """
    Standardize column names and data types across different Toast export formats.
    
    Returns:
        DataFrame: Processed dataframe with standard columns
    """
    df_processed = df.copy()
    
    # Show what columns we found (for debugging)
    st.write(f"      📋 Columns in `{filename}`: {', '.join(df.columns.tolist()[:10])}")
    
    # ===== REVENUE COLUMN =====
    revenue_candidates = [
        # Exact match (for analytics output files)
        'Revenue', 'revenue',
        # Underscore variations
        'net_sales', 'total_price', 'net_price', 'check_total', 
        'sales', 'amount', 'net_amount', 'total_net_sales',
        'gross_sales', 'total', 'price', 'subtotal',
        # Space variations (for CSV files with spaces in headers)
        'net sales', 'total price', 'net price', 'check total',
        'total net sales', 'gross sales',
        # Title case variations
        'Net Sales', 'Total Price', 'Net Price', 'Check Total',
        'Total Net Sales', 'Gross Sales', 'Total', 'Price', 'Subtotal'
    ]
    
    revenue_col = find_column_fuzzy(df_processed, revenue_candidates)
    
    # Check if this file type doesn't need revenue column
    discount_files = ['discount', 'discounts']
    analytics_output_files = ['bottle_conversion', 'waste_efficiency', 'menu_volatility', 
                             'discount_analysis', 'food_attachment', 'hourly_analysis', 
                             'dow_analysis']
    is_discount_file = any(discount_name in filename.lower() for discount_name in discount_files)
    is_analytics_output = any(analytics_name in filename.lower() for analytics_name in analytics_output_files)
    files_without_revenue = is_discount_file or is_analytics_output
    
    if revenue_col:
        st.write(f"      ✅ Found revenue column: `{revenue_col}`")
        # If column is already named "Revenue", it's likely already numeric (from analytics outputs)
        if revenue_col == 'Revenue':
            df_processed['revenue'] = pd.to_numeric(df_processed[revenue_col], errors='coerce').fillna(0)
        else:
            df_processed['revenue'] = clean_currency_column(df_processed[revenue_col])
    else:
        # Only show warning if this file type should have revenue
        if not files_without_revenue:
            available_cols = ', '.join(df.columns.tolist()[:10])
            st.warning(f"      ⚠️ No revenue column in `{filename}`. Available: {available_cols}")
        df_processed['revenue'] = 0
    
    # ===== DATE COLUMN =====
    date_candidates = [
        # Underscore variations
        'order_date', 'business_date', 'date', 'opened_date', 
        'created_at', 'closed_date', 'paid_date', 'timestamp',
        'datetime', 'transaction_date', 'sent_date', 'removed_date',
        'void_date', 'applied_date',
        # Space variations (for CSV files with spaces in headers)
        'order date', 'business date', 'opened date', 'closed date',
        'paid date', 'transaction date', 'sent date', 'removed date',
        'void date', 'applied date',
        # Title case variations
        'Order Date', 'Business Date', 'Date', 'Opened Date',
        'Created At', 'Closed Date', 'Paid Date', 'Timestamp',
        'DateTime', 'Transaction Date', 'Sent Date', 'Removed Date',
        'Void Date', 'Applied Date'
    ]
    
    date_col = find_column_fuzzy(df_processed, date_candidates)
    
    # Check if this file type doesn't need date column
    analytics_output_files = ['bottle_conversion', 'waste_efficiency', 'menu_volatility', 
                             'discount_analysis', 'food_attachment', 'hourly_analysis', 
                             'dow_analysis']
    labor_files = ['labor', 'labor hours']
    is_analytics_output = any(analytics_name in filename.lower() for analytics_name in analytics_output_files)
    is_labor_file = any(labor_name in filename.lower() for labor_name in labor_files)
    files_without_dates = is_analytics_output or is_labor_file
    
    if date_col:
        try:
            st.write(f"      ✅ Found date column: `{date_col}`")
            df_processed['date'] = pd.to_datetime(df_processed[date_col], errors='coerce')
        except:
            st.warning(f"      ⚠️ Could not parse dates in `{date_col}`")
            df_processed['date'] = pd.NaT
    else:
        if files_without_dates:
            # These file types don't need date columns - this is expected
            df_processed['date'] = pd.NaT
        else:
            st.warning(f"      ⚠️ No date column in `{filename}`")
            df_processed['date'] = pd.NaT
    
    # ===== ITEM/PRODUCT COLUMN =====
    item_candidates = [
        # Underscore variations
        'item_name', 'name', 'menu_item_name', 'item', 
        'product_name', 'menu_item', 'selection_name', 'description',
        # Space variations
        'item name', 'menu item name', 'product name', 'menu item',
        'selection name',
        # Title case variations
        'Item Name', 'Name', 'Menu Item Name', 'Item',
        'Product Name', 'Menu Item', 'Selection Name', 'Description'
    ]
    
    item_col = find_column_fuzzy(df_processed, item_candidates)
    
    if item_col:
        df_processed['item'] = df_processed[item_col].astype(str)
    else:
        df_processed['item'] = 'Unknown'
    
    # ===== CATEGORY COLUMN =====
    category_candidates = [
        # Underscore variations
        'category', 'category_group_name', 'menu_category', 
        'category_name', 'item_category', 'group',
        # Space variations
        'category group name', 'menu category', 'category name',
        'item category',
        # Title case variations
        'Category', 'Category Group Name', 'Menu Category',
        'Category Name', 'Item Category', 'Group'
    ]
    
    category_col = find_column_fuzzy(df_processed, category_candidates)
    
    if category_col:
        df_processed['category'] = df_processed[category_col].astype(str)
    else:
        df_processed['category'] = 'Uncategorized'
    
    # ===== QUANTITY COLUMN =====
    qty_candidates = [
        # Underscore variations
        'quantity', 'qty', 'count', 'item_quantity', 'units',
        # Space variations
        'item quantity',
        # Title case variations
        'Quantity', 'Qty', 'Count', 'Item Quantity', 'Units'
    ]
    
    qty_col = find_column_fuzzy(df_processed, qty_candidates)
    
    if qty_col:
        df_processed['quantity'] = pd.to_numeric(df_processed[qty_col], errors='coerce').fillna(1)
    else:
        df_processed['quantity'] = 1
    
    return df_processed

def enrich_dataframe(df):
    """
    Add calculated fields for analytics.
    """
    df_enriched = df.copy()
    
    # Drop rows with invalid dates BEFORE any operations
    df_enriched = df_enriched.dropna(subset=['date'])
    
    # Additional validation: remove any remaining NaT values
    df_enriched = df_enriched[df_enriched['date'].notna()]
    
    if df_enriched.empty:
        return df_enriched
    
    # Time-based features
    df_enriched['year'] = df_enriched['date'].dt.year
    df_enriched['month'] = df_enriched['date'].dt.month
    df_enriched['month_name'] = df_enriched['date'].dt.strftime('%B')
    df_enriched['year_month'] = df_enriched['date'].dt.to_period('M').astype(str)
    df_enriched['week'] = df_enriched['date'].dt.isocalendar().week
    df_enriched['day'] = df_enriched['date'].dt.day
    df_enriched['day_name'] = df_enriched['date'].dt.day_name()
    df_enriched['hour'] = df_enriched['date'].dt.hour
    df_enriched['is_weekend'] = df_enriched['date'].dt.dayofweek >= 5
    
    # Meal period classification
    def classify_meal_period(hour):
        if pd.isna(hour):
            return 'Unknown'
        if 5 <= hour < 11:
            return 'Breakfast'
        elif 11 <= hour < 15:
            return 'Lunch'
        elif 15 <= hour < 17:
            return 'Afternoon'
        elif 17 <= hour < 22:
            return 'Dinner'
        else:
            return 'Late Night'
    
    df_enriched['meal_period'] = df_enriched['hour'].apply(classify_meal_period)
    
    return df_enriched

# =========================================================
# VISUALIZATION FUNCTIONS
# =========================================================

def create_revenue_trend_chart(df):
    """Create daily revenue trend line chart."""
    if df.empty:
        return go.Figure()
    
    daily_sales = df.groupby('date').agg({
        'revenue': 'sum',
        'quantity': 'sum'
    }).reset_index()
    
    # Calculate 7-day moving average
    daily_sales['ma7'] = daily_sales['revenue'].rolling(window=7, min_periods=1).mean()
    
    fig = go.Figure()
    
    # Daily revenue bars
    fig.add_trace(go.Bar(
        x=daily_sales['date'],
        y=daily_sales['revenue'],
        name='Daily Revenue',
        marker_color='rgba(205, 176, 130, 0.7)',
        hovertemplate='<b>%{x|%B %d, %Y}</b><br>Revenue: $%{y:,.2f}<extra></extra>'
    ))
    
    # Moving average line
    fig.add_trace(go.Scatter(
        x=daily_sales['date'],
        y=daily_sales['ma7'],
        name='7-Day Average',
        line=dict(color='#816435', width=3),
        hovertemplate='<b>%{x|%B %d, %Y}</b><br>7-Day Avg: $%{y:,.2f}<extra></extra>'
    ))
    
    fig.update_layout(
        title="Daily Revenue Trend with Moving Average",
        xaxis_title="Date",
        yaxis_title="Revenue ($)",
        template="plotly_white",
        hovermode='x unified',
        plot_bgcolor='#ffffff',
        paper_bgcolor='#f8f4ed',
        font=dict(color='#363a39', size=12),
        showlegend=True,
        legend=dict(
            bgcolor='rgba(255, 255, 255, 0.9)',
            bordercolor='#cdb082',
            borderwidth=1
        )
    )
    
    return fig

def create_top_items_chart(df, top_n=15):
    """Create horizontal bar chart of top selling items."""
    if df.empty:
        return go.Figure()
    
    top_items = (
        df.groupby('item')['revenue']
        .sum()
        .nlargest(top_n)
        .reset_index()
        .sort_values('revenue')
    )
    
    fig = px.bar(
        top_items,
        y='item',
        x='revenue',
        orientation='h',
        title=f"Top {top_n} Menu Items by Revenue",
        template="plotly_white",
        color='revenue',
        color_continuous_scale=[[0, '#e2d2b8'], [0.5, '#cdb082'], [1, '#b88f4d']]
    )
    
    fig.update_layout(
        xaxis_title="Revenue ($)",
        yaxis_title="",
        plot_bgcolor='#ffffff',
        paper_bgcolor='#f8f4ed',
        font=dict(color='#363a39', size=12),
        showlegend=False
    )
    
    fig.update_traces(
        hovertemplate='<b>%{y}</b><br>Revenue: $%{x:,.2f}<extra></extra>'
    )
    
    return fig

def create_hourly_heatmap(df):
    """Create heatmap showing revenue by day of week and hour."""
    if df.empty:
        return go.Figure()
    
    day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    heatmap_data = (
        df.groupby(['day_name', 'hour'])['revenue']
        .sum()
        .reset_index()
    )
    
    heatmap_data['day_name'] = pd.Categorical(
        heatmap_data['day_name'],
        categories=day_order,
        ordered=True
    )
    
    pivot = heatmap_data.pivot(
        index='hour',
        columns='day_name',
        values='revenue'
    ).fillna(0)
    
    fig = px.imshow(
        pivot,
        labels=dict(x="Day of Week", y="Hour of Day", color="Revenue ($)"),
        x=pivot.columns,
        y=pivot.index,
        color_continuous_scale=[[0, '#f8f4ed'], [0.3, '#e2d2b8'], [0.6, '#cdb082'], [1, '#b88f4d']],
        title="Revenue Heatmap: Day × Hour",
        aspect="auto"
    )
    
    fig.update_layout(
        template="plotly_white",
        plot_bgcolor='#ffffff',
        paper_bgcolor='#f8f4ed',
        font=dict(color='#363a39', size=12)
    )
    
    return fig

def create_category_pie_chart(df):
    """Create pie chart showing revenue distribution by category."""
    if df.empty:
        return go.Figure()
    
    category_sales = (
        df.groupby('category')['revenue']
        .sum()
        .reset_index()
        .sort_values('revenue', ascending=False)
    )
    
    # Brand color palette for pie chart
    brand_colors = ['#b88f4d', '#cdb082', '#e2d2b8', '#816435', '#f8f4ed', '#eeeeee']
    fig = px.pie(
        category_sales,
        values='revenue',
        names='category',
        title="Revenue Distribution by Category",
        hole=0.4,
        color_discrete_sequence=brand_colors
    )
    
    fig.update_layout(
        template="plotly_white",
        plot_bgcolor='#ffffff',
        paper_bgcolor='#f8f4ed',
        font=dict(color='#363a39', size=12),
        showlegend=True
    )
    
    fig.update_traces(
        textposition='inside',
        textinfo='percent+label',
        hovertemplate='<b>%{label}</b><br>Revenue: $%{value:,.2f}<br>Percentage: %{percent}<extra></extra>'
    )
    
    return fig

def create_meal_period_chart(df):
    """Create bar chart showing revenue by meal period."""
    if df.empty:
        return go.Figure()
    
    meal_sales = (
        df.groupby('meal_period')['revenue']
        .sum()
        .reset_index()
    )
    
    # Define order
    period_order = ['Breakfast', 'Lunch', 'Afternoon', 'Dinner', 'Late Night']
    meal_sales['meal_period'] = pd.Categorical(
        meal_sales['meal_period'],
        categories=period_order,
        ordered=True
    )
    meal_sales = meal_sales.sort_values('meal_period')
    
    fig = px.bar(
        meal_sales,
        x='meal_period',
        y='revenue',
        title="Revenue by Meal Period",
        template="plotly_white",
        color='revenue',
        color_continuous_scale=[[0, '#e2d2b8'], [0.5, '#cdb082'], [1, '#b88f4d']]
    )
    
    fig.update_layout(
        xaxis_title="Meal Period",
        yaxis_title="Revenue ($)",
        plot_bgcolor='#ffffff',
        paper_bgcolor='#f8f4ed',
        font=dict(color='#363a39', size=12),
        showlegend=False
    )
    
    fig.update_traces(
        hovertemplate='<b>%{x}</b><br>Revenue: $%{y:,.2f}<extra></extra>'
    )
    
    return fig

def create_weekday_weekend_comparison(df):
    """Create comparison chart for weekday vs weekend performance."""
    if df.empty:
        return go.Figure()
    
    comparison = df.groupby('is_weekend').agg({
        'revenue': 'sum',
        'quantity': 'sum'
    }).reset_index()
    
    comparison['day_type'] = comparison['is_weekend'].map({
        True: 'Weekend',
        False: 'Weekday'
    })
    
    comparison['avg_revenue_per_item'] = comparison['revenue'] / comparison['quantity']
    
    fig = make_subplots(
        rows=1, cols=2,
        subplot_titles=('Total Revenue', 'Average Item Price'),
        specs=[[{'type': 'bar'}, {'type': 'bar'}]]
    )
    
    # Total Revenue
    fig.add_trace(
        go.Bar(
            x=comparison['day_type'],
            y=comparison['revenue'],
            name='Revenue',
            marker_color=['#b88f4d', '#cdb082'],
            showlegend=False,
            hovertemplate='<b>%{x}</b><br>Revenue: $%{y:,.2f}<extra></extra>'
        ),
        row=1, col=1
    )
    
    # Avg Price
    fig.add_trace(
        go.Bar(
            x=comparison['day_type'],
            y=comparison['avg_revenue_per_item'],
            name='Avg Price',
            marker_color=['#b88f4d', '#cdb082'],
            showlegend=False,
            hovertemplate='<b>%{x}</b><br>Avg: $%{y:.2f}<extra></extra>'
        ),
        row=1, col=2
    )
    
    fig.update_layout(
        title_text="Weekday vs Weekend Performance",
        template="plotly_white",
        plot_bgcolor='#ffffff',
        paper_bgcolor='#f8f4ed',
        font=dict(color='#363a39', size=12),
        height=400
    )
    
    return fig

# =========================================================
# PDF EXPORT FUNCTION
# =========================================================

def create_executive_pdf(client_name, metrics, top_items):
    """
    Generate professional executive summary PDF.
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # ===== HEADER SECTION =====
    # Light header background with brand colors
    c.setFillColor(HexColor('#e2d2b8'))
    c.rect(0, height - 120, width, 120, fill=1, stroke=0)
    
    # Gold accent bar
    c.setFillColor(HexColor('#b88f4d'))
    c.rect(0, height - 125, width, 5, fill=1, stroke=0)
    
    # Title
    c.setFillColor(HexColor('#272a29'))
    c.setFont("Helvetica-Bold", 28)
    c.drawString(50, height - 60, "HTX TAP Analytics")
    
    c.setFont("Helvetica", 16)
    c.drawString(50, height - 85, f"{client_name} - Executive Summary")
    
    c.setFont("Helvetica", 10)
    c.setFillColor(HexColor('#818786'))
    c.drawString(50, height - 105, f"Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}")
    
    # ===== KEY METRICS SECTION =====
    y_position = height - 160
    
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(HexColor('#272a29'))
    c.drawString(50, y_position, "Performance Overview")
    
    y_position -= 30
    c.setFont("Helvetica", 11)
    
    metric_lines = [
        f"Total Revenue: ${metrics.get('total_revenue', 0):,.2f}",
        f"Total Transactions: {metrics.get('total_transactions', 0):,}",
        f"Average Order Value: ${metrics.get('avg_order_value', 0):,.2f}",
        f"Total Items Sold: {metrics.get('total_items', 0):,}",
        f"Unique Menu Items: {metrics.get('unique_items', 0):,}",
        f"Reporting Period: {metrics.get('date_range', 'N/A')}"
    ]
    
    for line in metric_lines:
        c.drawString(50, y_position, line)
        y_position -= 20
    
    # ===== TOP PERFORMERS SECTION =====
    y_position -= 20
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y_position, "Top 10 Menu Items")
    
    y_position -= 25
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y_position, "Item Name")
    c.drawString(350, y_position, "Revenue")
    c.drawString(450, y_position, "% of Total")
    
    y_position -= 5
    c.setStrokeColor(HexColor('#cdb082'))
    c.line(50, y_position, width - 50, y_position)
    
    y_position -= 15
    c.setFont("Helvetica", 9)
    c.setFillColor(HexColor('#363a39'))
    
    total_rev = metrics.get('total_revenue', 1)
    
    for idx, row in top_items.head(10).iterrows():
        if y_position < 100:
            c.showPage()
            y_position = height - 50
        
        item_name = str(row['item'])[:40]
        revenue = row['revenue']
        percentage = (revenue / total_rev * 100) if total_rev > 0 else 0
        
        c.drawString(50, y_position, item_name)
        c.drawString(350, y_position, f"${revenue:,.2f}")
        c.drawString(450, y_position, f"{percentage:.1f}%")
        
        y_position -= 15
    
    # ===== FOOTER =====
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor('#818786'))
    c.drawString(50, 30, "HTX TAP - Track. Analyze. Profit.")
    c.drawRightString(width - 50, 30, "Confidential - For Internal Use Only")
    
    c.save()
    buffer.seek(0)
    return buffer.getvalue()

# =========================================================
# MAIN APPLICATION
# =========================================================

def main():
    """Main application logic."""
    
    # Initialize Supabase
    client = init_supabase()
    
    # ===== SIDEBAR =====
    with st.sidebar:
        st.markdown("### ⚙️ Configuration")
        
        BUCKET = st.secrets.get("SUPABASE_BUCKET", "client-data")
        st.info(f"📦 **Bucket**: `{BUCKET}`")
        
        CLIENT_FOLDER = st.text_input(
            "Client Folder Name",
            value="Melrose",
            help="Enter the exact folder name from Supabase Storage"
        )
        
        st.markdown("---")
        
        if st.button("🔄 Reload Data", use_container_width=True):
            st.cache_data.clear()
            st.cache_resource.clear()
            st.rerun()
        
        st.markdown("---")
        
        st.markdown("### ℹ️ About")
        st.markdown("""
        **HTX TAP** provides comprehensive analytics for restaurant POS data.
        
        **Features:**
        - Real-time revenue tracking
        - Menu performance analysis
        - Time-based insights
        - Executive reporting
        """)
        
        st.markdown("---")
        st.caption("v2.2 | © HTX TAP")
    
    # ===== MAIN HEADER =====
    st.title(f"🍞 {CLIENT_FOLDER} Analytics Dashboard")
    st.markdown(f"**HTX TAP** · Track. Analyze. Profit.")
    st.markdown("---")
    
    # ===== DATA LOADING =====
    with st.status("🔍 Loading data from Supabase...", expanded=True) as status:
        files = get_files_from_supabase(client, BUCKET, CLIENT_FOLDER)
        
        if not files:
            status.update(
                label="❌ No files found",
                state="error",
                expanded=False
            )
            st.error(f"""
            **No CSV files found in folder**: `{CLIENT_FOLDER}`
            
            **Troubleshooting:**
            1. Verify the folder name matches exactly (case-sensitive)
            2. Check that CSV files exist in: `{BUCKET}/{CLIENT_FOLDER}/`
            3. Ensure your Supabase service role key has storage access
            """)
            st.stop()
        
        status.update(
            label=f"✅ Found {len(files)} file(s). Processing...",
            state="running"
        )
        
        # Load all CSVs
        dataframes = []
        for file in files:
            filename = file['name']
            
            if filename.startswith(CLIENT_FOLDER):
                filepath = filename
            else:
                filepath = f"{CLIENT_FOLDER}/{filename}" if CLIENT_FOLDER else filename
            
            st.write(f"   📥 Loading `{filename}`...")
            
            df = load_csv_from_supabase(client, BUCKET, filepath)
            
            if df is not None and not df.empty:
                df = standardize_dataframe(df, filename)
                dataframes.append(df)
            else:
                st.warning(f"   ⚠️ Skipped `{filename}` (empty or error)")
        
        if not dataframes:
            status.update(label="❌ No valid data loaded", state="error")
            st.error("""
            **All files failed to load or were empty.**
            
            This usually means:
            - Your CSV files don't have recognizable column names for dates/revenue
            - The files are in an unsupported format
            
            **Please share a sample of your CSV columns so I can help!**
            """)
            st.stop()
        
        status.update(label="🔗 Merging datasets...", state="running")
        combined_df = pd.concat(dataframes, ignore_index=True)
        
        status.update(label="🎯 Enriching data...", state="running")
        processed_df = enrich_dataframe(combined_df)
        
        if processed_df.empty:
            status.update(label="❌ No valid data after processing", state="error")
            st.error("""
            **No valid data found after cleaning.**
            
            Your CSV files were loaded, but they don't contain:
            - Valid date columns (tried: order_date, business_date, date, etc.)
            - Valid revenue columns (tried: net_sales, total_price, sales, etc.)
            
            **Next Step**: Please download one of your CSV files and show me the column names.
            I can then update the app to recognize your specific format!
            """)
            
            # Show what we loaded for debugging
            with st.expander("🔍 Show Raw Data (First 100 rows)"):
                st.dataframe(combined_df.head(100))
            
            st.stop()
        
        status.update(
            label=f"✅ Data loaded successfully! ({len(processed_df):,} records)",
            state="complete",
            expanded=False
        )
    
    # ===== FILTERS =====
    st.markdown("### 🎛️ Filters")
    
    filter_col1, filter_col2, filter_col3 = st.columns([2, 2, 1])
    
    with filter_col1:
        if 'date' in processed_df.columns:
            valid_dates = processed_df['date'].dropna()
            
            if len(valid_dates) > 0:
                min_date = valid_dates.min().date()
                max_date = valid_dates.max().date()
                
                date_range = st.date_input(
                    "Date Range",
                    value=[min_date, max_date],
                    min_value=min_date,
                    max_value=max_date,
                    help="Select date range for analysis"
                )
                
                if len(date_range) == 2:
                    start_date, end_date = date_range
                    mask = (
                        (processed_df['date'].dt.date >= start_date) &
                        (processed_df['date'].dt.date <= end_date)
                    )
                    df_filtered = processed_df[mask].copy()
                else:
                    df_filtered = processed_df.copy()
            else:
                df_filtered = processed_df.copy()
        else:
            df_filtered = processed_df.copy()
    
    with filter_col2:
        categories = sorted(df_filtered['category'].unique())
        selected_categories = st.multiselect(
            "Categories",
            options=categories,
            default=categories,
            help="Filter by menu category"
        )
        
        if selected_categories:
            df_filtered = df_filtered[df_filtered['category'].isin(selected_categories)]
    
    with filter_col3:
        meal_periods = sorted(df_filtered['meal_period'].unique())
        selected_periods = st.multiselect(
            "Meal Periods",
            options=meal_periods,
            default=meal_periods
        )
        
        if selected_periods:
            df_filtered = df_filtered[df_filtered['meal_period'].isin(selected_periods)]
    
    st.markdown("---")
    
    if df_filtered.empty:
        st.warning("⚠️ No data available with current filters. Please adjust your selection.")
        st.stop()
    
    # ===== KEY METRICS =====
    total_revenue = df_filtered['revenue'].sum()
    total_transactions = len(df_filtered)
    total_items_sold = df_filtered['quantity'].sum()
    avg_order_value = total_revenue / total_transactions if total_transactions > 0 else 0
    unique_items = df_filtered['item'].nunique()
    
    revenue_growth = 0
    if 'date' in df_filtered.columns and len(df_filtered) > 1:
        try:
            date_range_days = (df_filtered['date'].max() - df_filtered['date'].min()).days
            if date_range_days >= 14:
                midpoint = df_filtered['date'].min() + timedelta(days=date_range_days // 2)
                first_half_revenue = df_filtered[df_filtered['date'] < midpoint]['revenue'].sum()
                second_half_revenue = df_filtered[df_filtered['date'] >= midpoint]['revenue'].sum()
                
                if first_half_revenue > 0:
                    revenue_growth = ((second_half_revenue - first_half_revenue) / first_half_revenue) * 100
        except:
            revenue_growth = 0
    
    kpi1, kpi2, kpi3, kpi4, kpi5 = st.columns(5)
    
    with kpi1:
        st.metric(
            label="💰 Total Revenue",
            value=f"${total_revenue:,.0f}",
            delta=f"{revenue_growth:+.1f}%" if revenue_growth != 0 else None
        )
    
    with kpi2:
        st.metric(
            label="🧾 Transactions",
            value=f"{total_transactions:,}"
        )
    
    with kpi3:
        st.metric(
            label="📊 Avg Order Value",
            value=f"${avg_order_value:.2f}"
        )
    
    with kpi4:
        st.metric(
            label="🛒 Items Sold",
            value=f"{total_items_sold:,.0f}"
        )
    
    with kpi5:
        st.metric(
            label="📋 Unique Items",
            value=f"{unique_items:,}"
        )
    
    st.markdown("---")
    
    # ===== VISUALIZATIONS =====
    viz_row1_col1, viz_row1_col2 = st.columns(2)
    
    with viz_row1_col1:
        st.plotly_chart(
            create_revenue_trend_chart(df_filtered),
            use_container_width=True
        )
    
    with viz_row1_col2:
        st.plotly_chart(
            create_top_items_chart(df_filtered),
            use_container_width=True
        )
    
    viz_row2_col1, viz_row2_col2 = st.columns(2)
    
    with viz_row2_col1:
        st.plotly_chart(
            create_hourly_heatmap(df_filtered),
            use_container_width=True
        )
    
    with viz_row2_col2:
        st.plotly_chart(
            create_category_pie_chart(df_filtered),
            use_container_width=True
        )
    
    viz_row3_col1, viz_row3_col2 = st.columns(2)
    
    with viz_row3_col1:
        st.plotly_chart(
            create_meal_period_chart(df_filtered),
            use_container_width=True
        )
    
    with viz_row3_col2:
        st.plotly_chart(
            create_weekday_weekend_comparison(df_filtered),
            use_container_width=True
        )
    
    st.markdown("---")
    
    # ===== DATA TABLE =====
    with st.expander("📋 View Raw Data", expanded=False):
        st.dataframe(
            df_filtered[[
                'date', 'item', 'category', 'revenue', 'quantity', 
                'meal_period', 'day_name'
            ]].head(1000),
            use_container_width=True
        )
    
    st.markdown("---")
    
    # ===== EXPORT SECTION =====
    st.markdown("### 📑 Export Reports")
    
    export_col1, export_col2 = st.columns(2)
    
    with export_col1:
        try:
            date_range_str = f"{df_filtered['date'].min().strftime('%m/%d/%Y')} - {df_filtered['date'].max().strftime('%m/%d/%Y')}"
        except:
            date_range_str = "N/A"
        
        metrics_dict = {
            'total_revenue': total_revenue,
            'total_transactions': total_transactions,
            'avg_order_value': avg_order_value,
            'total_items': total_items_sold,
            'unique_items': unique_items,
            'date_range': date_range_str
        }
        
        top_items_df = (
            df_filtered.groupby('item')['revenue']
            .sum()
            .nlargest(10)
            .reset_index()
        )
        
        pdf_bytes = create_executive_pdf(CLIENT_FOLDER, metrics_dict, top_items_df)
        
        st.download_button(
            label="📄 Download Executive Summary (PDF)",
            data=pdf_bytes,
            file_name=f"{CLIENT_FOLDER}_Executive_Summary_{datetime.now().strftime('%Y%m%d')}.pdf",
            mime="application/pdf",
            use_container_width=True
        )
    
    with export_col2:
        csv_export = df_filtered.to_csv(index=False).encode('utf-8')
        
        st.download_button(
            label="📊 Download Full Dataset (CSV)",
            data=csv_export,
            file_name=f"{CLIENT_FOLDER}_Full_Data_{datetime.now().strftime('%Y%m%d')}.csv",
            mime="text/csv",
            use_container_width=True
        )
    
    # =========================================================
    # PROFIT ENGINES SECTION (7 NEW VISUALIZATIONS)
    # =========================================================
    st.markdown("---")
    st.markdown("## 🚀 Profit Engines")
    st.markdown("**Advanced profit optimization analytics**")
    
    # Prepare dataframes for Profit Engines
    # Map standardized columns to expected column names
    sales_df = df_filtered.copy()
    
    # Column mapping for Profit Engines
    column_mapping = {
        'revenue': 'Net Price',
        'item': 'Menu Item',
        'date': 'Order Date',
        'server': 'Server',
        'category': 'Menu Group',
        'quantity': 'Qty'
    }
    
    # Rename columns if they exist
    for old_col, new_col in column_mapping.items():
        if old_col in sales_df.columns and new_col not in sales_df.columns:
            sales_df[new_col] = sales_df[old_col]
    
    # Ensure Order Id exists (use Check Id or create index)
    if 'Order Id' not in sales_df.columns:
        if 'check_id' in sales_df.columns:
            sales_df['Order Id'] = sales_df['check_id']
        elif 'order_id' in sales_df.columns:
            sales_df['Order Id'] = sales_df['order_id']
        else:
            sales_df['Order Id'] = sales_df.index.astype(str)
    
    # Load separate dataframes for voids and discounts
    voids_df = pd.DataFrame()
    discounts_df = pd.DataFrame()
    labor_df = pd.DataFrame()
    
    # Try to load voids, discounts, and labor from files
    for file in files:
        filename = file['name'].lower()
        filepath = f"{CLIENT_FOLDER}/{file['name']}" if CLIENT_FOLDER else file['name']
        
        if 'void' in filename and voids_df.empty:
            df_void = load_csv_from_supabase(client, BUCKET, filepath)
            if df_void is not None and not df_void.empty:
                voids_df = df_void.copy()
                # Map void columns
                if 'Total Price' not in voids_df.columns:
                    price_col = find_column_fuzzy(voids_df, ['Total Price', 'total_price', 'Amount', 'amount'])
                    if price_col:
                        voids_df['Total Price'] = voids_df[price_col]
                if 'Reason' not in voids_df.columns:
                    reason_col = find_column_fuzzy(voids_df, ['Reason', 'reason', 'Void Reason', 'void_reason', 'Comment', 'comment'])
                    if reason_col:
                        voids_df['Reason'] = voids_df[reason_col]
                    else:
                        voids_df['Reason'] = 'Unknown'
        
        if 'discount' in filename and discounts_df.empty:
            df_disc = load_csv_from_supabase(client, BUCKET, filepath)
            if df_disc is not None and not df_disc.empty:
                discounts_df = df_disc.copy()
        
        if 'labor' in filename and labor_df.empty:
            df_lab = load_csv_from_supabase(client, BUCKET, filepath)
            if df_lab is not None and not df_lab.empty:
                labor_df = df_lab.copy()
    
    # ENGINE 1: The Server Friction Coefficient ("Hustle" Index)
    st.markdown("---")
    st.header("1. Server Friction Coefficient (The Hustle Index)")
    st.markdown("*Detects who is grinding (high transactions) vs. cherry-picking (high sales, low work).*")
    
    if 'Server' in sales_df.columns and 'Net Price' in sales_df.columns and 'Order Id' in sales_df.columns:
        server_stats = sales_df.groupby('Server').agg(
            Total_Sales=('Net Price', 'sum'),
            Transactions=('Order Id', 'nunique')
        ).reset_index()
        
        # Calculate Friction: Transactions per $1000 in Sales
        server_stats['Hustle_Score'] = (server_stats['Transactions'] / (server_stats['Total_Sales'] + 0.01)) * 1000
        server_stats = server_stats[server_stats['Total_Sales'] > 1000]  # Filter active servers
        
        if not server_stats.empty:
            fig_hustle = px.scatter(
                server_stats,
                x="Transactions",
                y="Total_Sales",
                text="Server",
                size="Hustle_Score",
                color="Hustle_Score",
                color_continuous_scale="RdYlGn",
                title="Revenue vs. Effort (Bubble Size = Hustle Score)",
                template="plotly_dark"
            )
            fig_hustle.update_traces(
                textposition='top center',
                marker=dict(line=dict(color='#CDB082', width=1))
            )
            fig_hustle.update_layout(
                plot_bgcolor='#0E1117',
                paper_bgcolor='#0E1117',
                font=dict(color='#CDB082', size=12),
                xaxis=dict(gridcolor='rgba(205, 176, 130, 0.2)'),
                yaxis=dict(gridcolor='rgba(205, 176, 130, 0.2)')
            )
            st.plotly_chart(fig_hustle, use_container_width=True)
        else:
            st.info("Not enough server data to calculate hustle scores.")
    else:
        st.warning("Missing required columns (Server, Net Price, Order Id) for Hustle Index.")
    
    # ENGINE 2: The Menu Engineering Matrix ("Stars & Dogs")
    st.markdown("---")
    st.header("2. Menu Engineering Matrix (Stars vs. Dogs)")
    st.markdown("*Upper Right: Keep (Stars). Bottom Left: 86 Immediately (Dogs).*")
    
    if 'Menu Item' in sales_df.columns and 'Qty' in sales_df.columns and 'Net Price' in sales_df.columns:
        menu_stats = sales_df.groupby('Menu Item').agg(
            Qty_Sold=('Qty', 'sum'),
            Total_Revenue=('Net Price', 'sum')
        ).reset_index()
        
        menu_stats = menu_stats[menu_stats['Qty_Sold'] > 10]
        
        if not menu_stats.empty:
            avg_qty = menu_stats['Qty_Sold'].mean()
            avg_rev = menu_stats['Total_Revenue'].mean()
            
            def classify_item(row):
                if row['Qty_Sold'] >= avg_qty and row['Total_Revenue'] >= avg_rev:
                    return "⭐ STAR"
                elif row['Qty_Sold'] < avg_qty and row['Total_Revenue'] < avg_rev:
                    return "🐕 DOG"
                elif row['Qty_Sold'] >= avg_qty and row['Total_Revenue'] < avg_rev:
                    return "🐎 PLOWHORSE"
                else:
                    return "❓ PUZZLE"
            
            menu_stats['Class'] = menu_stats.apply(classify_item, axis=1)
            
            fig_menu = px.scatter(
                menu_stats,
                x="Qty_Sold",
                y="Total_Revenue",
                color="Class",
                hover_name="Menu Item",
                color_discrete_map={"⭐ STAR": "#FFD700", "🐕 DOG": "#EF553B", "🐎 PLOWHORSE": "#00CC96", "❓ PUZZLE": "#AB63FA"},
                title="Profitability vs. Popularity",
                template="plotly_dark"
            )
            fig_menu.add_hline(y=avg_rev, line_dash="dash", line_color="#CDB082", annotation_text="Avg Revenue")
            fig_menu.add_vline(x=avg_qty, line_dash="dash", line_color="#CDB082", annotation_text="Avg Qty")
            fig_menu.update_layout(
                plot_bgcolor='#0E1117',
                paper_bgcolor='#0E1117',
                font=dict(color='#CDB082', size=12),
                xaxis=dict(gridcolor='rgba(205, 176, 130, 0.2)'),
                yaxis=dict(gridcolor='rgba(205, 176, 130, 0.2)')
            )
            st.plotly_chart(fig_menu, use_container_width=True)
        else:
            st.info("Not enough menu item data for analysis.")
    else:
        st.warning("Missing required columns (Menu Item, Qty, Net Price) for Menu Engineering Matrix.")
    
    # ENGINE 3: Labor-to-Revenue Sync ("Ghost Shift" Detector)
    st.markdown("---")
    st.header("3. Labor-to-Revenue Sync (The Ghost Shift Detector)")
    st.markdown("*Overlaid: Revenue (Bars) vs. Active Staffing (Line). Detects overstaffing.*")
    
    if 'Order Date' in sales_df.columns and 'Net Price' in sales_df.columns and 'Server' in sales_df.columns:
        # Ensure Hour and Date columns exist
        if 'Hour' not in sales_df.columns:
            sales_df['Hour'] = pd.to_datetime(sales_df['Order Date'], errors='coerce').dt.hour
        if 'Date' not in sales_df.columns:
            sales_df['Date'] = pd.to_datetime(sales_df['Order Date'], errors='coerce').dt.date
        
        # Remove rows with invalid dates
        sales_df_clean = sales_df.dropna(subset=['Hour', 'Date'])
        
        if not sales_df_clean.empty:
            staff_activity = sales_df_clean.groupby(['Date', 'Hour'])['Server'].nunique().reset_index()
            staff_activity = staff_activity.groupby('Hour')['Server'].mean().reset_index()  # Avg staff per hour
            hourly_rev_trend = sales_df_clean.groupby('Hour')['Net Price'].mean().reset_index()
            
            fig_labor = make_subplots(specs=[[{"secondary_y": True}]])
            fig_labor.add_trace(
                go.Bar(
                    x=hourly_rev_trend['Hour'],
                    y=hourly_rev_trend['Net Price'],
                    name="Avg Revenue",
                    marker_color='#CDB082'
                ),
                secondary_y=False
            )
            fig_labor.add_trace(
                go.Scatter(
                    x=staff_activity['Hour'],
                    y=staff_activity['Server'],
                    name="Active Servers",
                    line=dict(color='#EF553B', width=3)
                ),
                secondary_y=True
            )
            fig_labor.update_layout(
                title="Revenue vs. Active Staffing",
                template="plotly_dark",
                hovermode="x unified",
                plot_bgcolor='#0E1117',
                paper_bgcolor='#0E1117',
                font=dict(color='#CDB082', size=12),
                xaxis=dict(gridcolor='rgba(205, 176, 130, 0.2)'),
                yaxis=dict(gridcolor='rgba(205, 176, 130, 0.2)', title="Revenue ($)"),
                yaxis2=dict(gridcolor='rgba(205, 176, 130, 0.1)', title="Active Servers")
            )
            st.plotly_chart(fig_labor, use_container_width=True)
        else:
            st.info("Not enough date/time data for labor analysis.")
    else:
        st.warning("Missing required columns for Labor-to-Revenue Sync.")
    
    # ENGINE 4: Void Forensics Report
    st.markdown("---")
    st.header("4. Void Forensics Report")
    
    if not voids_df.empty and 'Total Price' in voids_df.columns:
        col_v1, col_v2 = st.columns(2)
        with col_v1:
            if 'Reason' in voids_df.columns:
                void_reasons = voids_df.groupby('Reason')['Total Price'].sum().reset_index().sort_values('Total Price', ascending=False).head(10)
                if not void_reasons.empty:
                    fig_voids = px.bar(
                        void_reasons,
                        y='Reason',
                        x='Total Price',
                        orientation='h',
                        title="Top Reasons for Voids ($)",
                        template="plotly_dark",
                        color='Total Price',
                        color_continuous_scale='Reds'
                    )
                    fig_voids.update_layout(
                        plot_bgcolor='#0E1117',
                        paper_bgcolor='#0E1117',
                        font=dict(color='#CDB082', size=12),
                        xaxis=dict(gridcolor='rgba(205, 176, 130, 0.2)'),
                        yaxis=dict(gridcolor='rgba(205, 176, 130, 0.2)')
                    )
                    st.plotly_chart(fig_voids, use_container_width=True)
                else:
                    st.info("No void reasons data available.")
            else:
                st.info("Reason column not found in voids data.")
        
        with col_v2:
            if 'Reason' in voids_df.columns:
                def categorize_void(reason):
                    r = str(reason).lower()
                    if any(x in r for x in ['86', 'kitchen', 'quality', 'waste', 'spill']):
                        return 'Kitchen/Ops'
                    if any(x in r for x in ['server', 'entry', 'guest', 'change', 'comp']):
                        return 'FOH/Server'
                    return 'Other'
                
                voids_df['Source'] = voids_df['Reason'].apply(categorize_void)
                fig_source = px.pie(
                    voids_df,
                    values='Total Price',
                    names='Source',
                    title="Void Source: Kitchen vs FOH",
                    template="plotly_dark",
                    color_discrete_map={
                        'Kitchen/Ops': '#EF553B',
                        'FOH/Server': '#FFD700',
                        'Other': '#8E8E93'
                    }
                )
                fig_source.update_layout(
                    plot_bgcolor='#0E1117',
                    paper_bgcolor='#0E1117',
                    font=dict(color='#CDB082', size=12)
                )
                st.plotly_chart(fig_source, use_container_width=True)
            else:
                st.info("Reason column not found in voids data.")
    else:
        st.info("No voids data available. Upload a voids CSV file to see this analysis.")
    
    # ENGINE 5: Upsell Velocity Tracker
    st.markdown("---")
    st.header("5. Upsell Velocity Tracker")
    
    # Ensure Categories exist
    if 'Category' not in sales_df.columns:
        if 'Menu Group' in sales_df.columns:
            def categorize_group(g):
                g_str = str(g).lower()
                if any(x in g_str for x in ['liquor', 'wine', 'beer', 'cocktail']):
                    return 'Alcohol'
                if any(x in g_str for x in ['food', 'entree', 'appetizer']):
                    return 'Food'
                return 'Other'
            sales_df['Category'] = sales_df['Menu Group'].apply(categorize_group)
        elif 'category' in sales_df.columns:
            def categorize_group(g):
                g_str = str(g).lower()
                if any(x in g_str for x in ['liquor', 'wine', 'beer', 'cocktail']):
                    return 'Alcohol'
                if any(x in g_str for x in ['food', 'entree', 'appetizer']):
                    return 'Food'
                return 'Other'
            sales_df['Category'] = sales_df['category'].apply(categorize_group)
        else:
            sales_df['Category'] = 'Other'
    
    if 'Order Id' in sales_df.columns and 'Server' in sales_df.columns and 'Category' in sales_df.columns:
        check_summary = sales_df.groupby(['Order Id', 'Server']).agg(
            Has_Food=('Category', lambda x: 'Food' in list(x)),
            Has_Alcohol=('Category', lambda x: 'Alcohol' in list(x))
        ).reset_index()
        
        food_checks = check_summary[check_summary['Has_Food'] == True]
        
        if not food_checks.empty:
            upsell_stats = food_checks.groupby('Server').agg(
                Total_Food_Tables=('Order Id', 'nunique'),
                Tables_With_Alc=('Has_Alcohol', 'sum')
            ).reset_index()
            upsell_stats['Attachment_Rate'] = (upsell_stats['Tables_With_Alc'] / upsell_stats['Total_Food_Tables']) * 100
            upsell_stats = upsell_stats[upsell_stats['Total_Food_Tables'] > 20]
            
            if not upsell_stats.empty:
                fig_upsell = px.bar(
                    upsell_stats.sort_values('Attachment_Rate'),
                    x='Attachment_Rate',
                    y='Server',
                    orientation='h',
                    title="Alcohol Attachment Rate %",
                    template="plotly_dark",
                    color='Attachment_Rate',
                    color_continuous_scale='Greens'
                )
                fig_upsell.update_layout(
                    plot_bgcolor='#0E1117',
                    paper_bgcolor='#0E1117',
                    font=dict(color='#CDB082', size=12),
                    xaxis=dict(gridcolor='rgba(205, 176, 130, 0.2)'),
                    yaxis=dict(gridcolor='rgba(205, 176, 130, 0.2)')
                )
                st.plotly_chart(fig_upsell, use_container_width=True)
            else:
                st.info("Not enough food table data (need >20 tables per server) for upsell analysis.")
        else:
            st.info("No food orders found for upsell analysis.")
    else:
        st.warning("Missing required columns for Upsell Velocity Tracker.")
    
    # ENGINE 6: Peak Hour Throughput Heatmap
    st.markdown("---")
    st.header("6. Peak Hour Throughput Heatmap")
    
    if 'Order Date' in sales_df.columns and 'Net Price' in sales_df.columns:
        if 'DayOfWeek' not in sales_df.columns:
            sales_df['DayOfWeek'] = pd.to_datetime(sales_df['Order Date'], errors='coerce').dt.day_name()
        if 'Hour' not in sales_df.columns:
            sales_df['Hour'] = pd.to_datetime(sales_df['Order Date'], errors='coerce').dt.hour
        
        sales_df_clean = sales_df.dropna(subset=['DayOfWeek', 'Hour'])
        
        if not sales_df_clean.empty:
            heatmap_data = sales_df_clean.groupby(['DayOfWeek', 'Hour'])['Net Price'].sum().reset_index()
            days_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            
            fig_heat = px.density_heatmap(
                heatmap_data,
                x='Hour',
                y='DayOfWeek',
                z='Net Price',
                title="Revenue Intensity Heatmap",
                color_continuous_scale=['#0E1117', '#CDB082'],
                category_orders={'DayOfWeek': days_order},
                template="plotly_dark"
            )
            fig_heat.update_layout(
                plot_bgcolor='#0E1117',
                paper_bgcolor='#0E1117',
                font=dict(color='#CDB082', size=12)
            )
            st.plotly_chart(fig_heat, use_container_width=True)
        else:
            st.info("Not enough date/time data for heatmap.")
    else:
        st.warning("Missing required columns for Peak Hour Heatmap.")
    
    # ENGINE 7: CLV Predictor ("Whale" Hunter)
    st.markdown("---")
    st.header("7. CLV Predictor (The Whale Hunter)")
    
    # Check for Tab Name or similar column
    tab_name_col = None
    for col in sales_df.columns:
        if 'tab' in col.lower() or 'guest' in col.lower() or 'customer' in col.lower():
            tab_name_col = col
            break
    
    if tab_name_col:
        guest_stats = sales_df.groupby(tab_name_col).agg(
            Total_Spend=('Net Price', 'sum')
        ).reset_index().sort_values('Total_Spend', ascending=False).head(10)
        
        if not guest_stats.empty:
            fig_clv = px.bar(
                guest_stats,
                x='Total_Spend',
                y=tab_name_col,
                orientation='h',
                title="Top 10 Guests by Lifetime Value",
                template="plotly_dark",
                color='Total_Spend',
                color_continuous_scale='Blues'
            )
            fig_clv.update_yaxes(autorange="reversed")
            fig_clv.update_layout(
                plot_bgcolor='#0E1117',
                paper_bgcolor='#0E1117',
                font=dict(color='#CDB082', size=12),
                xaxis=dict(gridcolor='rgba(205, 176, 130, 0.2)'),
                yaxis=dict(gridcolor='rgba(205, 176, 130, 0.2)')
            )
            st.plotly_chart(fig_clv, use_container_width=True)
        else:
            st.info("No guest data available for CLV analysis.")
    else:
        st.info("No 'Tab Name' or guest identifier column found. This analysis requires customer tracking data.")
    
    # ===== ADVANCED ANALYTICS SECTION =====
    st.markdown("---")
    st.markdown("## 🔬 Advanced Analytics Suite")
    st.markdown("**Comprehensive revenue analysis with waste efficiency, bottle conversion, menu volatility, and more.**")
    
    analytics_tab1, analytics_tab2, analytics_tab3, analytics_tab4, analytics_tab5, analytics_tab6, analytics_tab7 = st.tabs([
        "📊 Overview", "💸 Waste Efficiency", "🍾 Bottle Conversion", "📈 Menu Volatility",
        "🍔 Food Attachment", "⏰ Peak Hours", "💰 Discount Analysis"
    ])
    
    # Run analytics button
    if st.button("🚀 Run Advanced Analytics", use_container_width=True, type="primary"):
        with st.spinner("Running comprehensive analytics... This may take a minute."):
            try:
                results = run_full_analysis(client, BUCKET, CLIENT_FOLDER, upload_to_db=False)
                
                if 'error' in results:
                    st.error(f"❌ {results['error']}")
                else:
                    st.session_state['analytics_results'] = results
                    st.success("✅ Analytics completed successfully!")
                    st.rerun()
            except Exception as e:
                st.error(f"❌ Error running analytics: {str(e)}")
                st.exception(e)
    
    # Display results if available
    if 'analytics_results' in st.session_state:
        results = st.session_state['analytics_results']
        
        with analytics_tab1:
            st.markdown("### 📊 Analytics Overview")
            
            # Summary metrics
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                if not results.get('waste_efficiency', pd.DataFrame()).empty:
                    avg_waste = results['waste_efficiency']['Waste_Rate_Pct'].mean()
                    st.metric("Avg Waste Rate", f"{avg_waste:.1f}%")
            
            with col2:
                if results.get('bottle_summary'):
                    st.metric("Bottle Conversion", f"{results['bottle_summary'].get('bottle_pct', 0):.1f}%")
            
            with col3:
                if not results.get('menu_volatility', pd.DataFrame()).empty:
                    critical = len(results['menu_volatility'][results['menu_volatility']['Volatility_Pct'] > 100])
                    st.metric("Critical Menu Items", f"{critical}")
            
            with col4:
                if results.get('attachment_summary'):
                    st.metric("Food Attachment Rate", f"{results['attachment_summary'].get('overall_rate', 0):.1f}%")
            
            st.markdown("---")
            st.markdown("**Select a tab above to view detailed analytics for each metric.**")
        
        with analytics_tab2:
            st.markdown("### 💸 Waste Efficiency Analysis")
            if not results.get('waste_efficiency', pd.DataFrame()).empty:
                waste_df = results['waste_efficiency']
                
                # Chart
                fig = px.bar(
                    waste_df.head(20),
                    x='Server',
                    y='Waste_Rate_Pct',
                    color='Status',
                    color_discrete_map={
                        'Good': '#10b981',
                        'Monitor': '#cdb082',
                        'Caution': '#b88f4d',
                        'Critical': '#ef4444'
                    },
                    title="Waste Rate by Server",
                    template="plotly_white"
                )
                fig.update_layout(
                    plot_bgcolor='#ffffff',
                    paper_bgcolor='#f8f4ed',
                    font=dict(color='#363a39', size=12),
                    xaxis_tickangle=-45
                )
                st.plotly_chart(fig, use_container_width=True)
                
                # Table
                st.dataframe(waste_df[['Server', 'Revenue', 'Total_Waste', 'Waste_Rate_Pct', 'Status']], use_container_width=True)
            else:
                st.info("No waste efficiency data available. Run analytics first.")
        
        with analytics_tab3:
            st.markdown("### 🍾 Bottle Service Conversion")
            if not results.get('bottle_conversion', pd.DataFrame()).empty:
                bottle_df = results['bottle_conversion']
                
                # Chart
                fig = px.bar(
                    bottle_df.head(20),
                    x='Server',
                    y='Conversion_Rate',
                    color='Conversion_Rate',
                    color_continuous_scale=[[0, '#e2d2b8'], [0.5, '#cdb082'], [1, '#b88f4d']],
                    title="Bottle Conversion Rate by Server",
                    template="plotly_white"
                )
                fig.update_layout(
                    plot_bgcolor='#ffffff',
                    paper_bgcolor='#f8f4ed',
                    font=dict(color='#363a39', size=12),
                    xaxis_tickangle=-45,
                    showlegend=False
                )
                st.plotly_chart(fig, use_container_width=True)
                
                # Summary
                if results.get('bottle_summary'):
                    summary = results['bottle_summary']
                    st.markdown(f"**Venue Average:** {summary.get('bottle_pct', 0):.1f}%")
                    st.markdown(f"**Bottle Premium:** {summary.get('bottle_premium', 0):.1f}x revenue multiplier")
                
                st.dataframe(bottle_df, use_container_width=True)
            else:
                st.info("No bottle conversion data available. Run analytics first.")
        
        with analytics_tab4:
            st.markdown("### 📈 Menu Volatility Analysis")
            if not results.get('menu_volatility', pd.DataFrame()).empty:
                volatility_df = results['menu_volatility']
                
                # Chart
                fig = px.scatter(
                    volatility_df.head(50),
                    x='Net Price',
                    y='Volatility_Pct',
                    color='Action',
                    size='Total_Waste',
                    hover_data=['Menu Item'],
                    color_discrete_map={
                        'OK': '#10b981',
                        'Monitor': '#cdb082',
                        'Investigate': '#b88f4d',
                        'REMOVE': '#ef4444'
                    },
                    title="Menu Item Volatility (Waste vs Sales)",
                    template="plotly_white"
                )
                fig.update_layout(
                    plot_bgcolor='#ffffff',
                    paper_bgcolor='#f8f4ed',
                    font=dict(color='#363a39', size=12)
                )
                st.plotly_chart(fig, use_container_width=True)
                
                # Critical items
                critical = volatility_df[volatility_df['Volatility_Pct'] > 100]
                if not critical.empty:
                    st.warning(f"⚠️ **{len(critical)} items with >100% volatility (voided more than sold!)**")
                    st.dataframe(critical[['Menu Item', 'Net Price', 'Total_Waste', 'Volatility_Pct', 'Action']], use_container_width=True)
                
                st.dataframe(volatility_df[['Menu Item', 'Net Price', 'Total_Waste', 'Volatility_Pct', 'Action']], use_container_width=True)
            else:
                st.info("No menu volatility data available. Run analytics first.")
        
        with analytics_tab5:
            st.markdown("### 🍔 Food Attachment Rate")
            if not results.get('food_attachment', pd.DataFrame()).empty:
                attachment_df = results['food_attachment']
                
                # Chart
                fig = px.bar(
                    attachment_df.head(20),
                    x='Server',
                    y='Attachment_Rate',
                    color='Attachment_Rate',
                    color_continuous_scale=[[0, '#e2d2b8'], [0.5, '#cdb082'], [1, '#b88f4d']],
                    title="Food Attachment Rate on Liquor Orders",
                    template="plotly_white"
                )
                fig.update_layout(
                    plot_bgcolor='#ffffff',
                    paper_bgcolor='#f8f4ed',
                    font=dict(color='#363a39', size=12),
                    xaxis_tickangle=-45,
                    showlegend=False
                )
                st.plotly_chart(fig, use_container_width=True)
                
                # Summary
                if results.get('attachment_summary'):
                    summary = results['attachment_summary']
                    st.markdown(f"**Overall Rate:** {summary.get('overall_rate', 0):.1f}%")
                    st.markdown(f"**Missed Revenue Opportunity:** ${summary.get('total_missed_revenue', 0):,.0f}")
                
                st.dataframe(attachment_df, use_container_width=True)
            else:
                st.info("No food attachment data available. Run analytics first.")
        
        with analytics_tab6:
            st.markdown("### ⏰ Peak Hours & Days Analysis")
            
            col1, col2 = st.columns(2)
            
            with col1:
                if not results.get('hourly_analysis', pd.DataFrame()).empty:
                    hourly_df = results['hourly_analysis']
                    
                    fig = px.bar(
                        hourly_df,
                        x='Hour',
                        y='Pct_Revenue',
                        color='Pct_Revenue',
                        color_continuous_scale=[[0, '#e2d2b8'], [0.5, '#cdb082'], [1, '#b88f4d']],
                        title="Revenue by Hour of Day",
                        template="plotly_white"
                    )
                    fig.update_layout(
                        plot_bgcolor='#ffffff',
                        paper_bgcolor='#f8f4ed',
                        font=dict(color='#363a39', size=12),
                        showlegend=False
                    )
                    st.plotly_chart(fig, use_container_width=True)
            
            with col2:
                if not results.get('dow_analysis', pd.DataFrame()).empty:
                    dow_df = results['dow_analysis']
                    
                    fig = px.bar(
                        dow_df,
                        x='DayOfWeek',
                        y='Pct_Revenue',
                        color='Pct_Revenue',
                        color_continuous_scale=[[0, '#e2d2b8'], [0.5, '#cdb082'], [1, '#b88f4d']],
                        title="Revenue by Day of Week",
                        template="plotly_white"
                    )
                    fig.update_layout(
                        plot_bgcolor='#ffffff',
                        paper_bgcolor='#f8f4ed',
                        font=dict(color='#363a39', size=12),
                        showlegend=False
                    )
                    st.plotly_chart(fig, use_container_width=True)
        
        with analytics_tab7:
            st.markdown("### 💰 Discount Analysis")
            if not results.get('discount_analysis', pd.DataFrame()).empty:
                discount_df = results['discount_analysis']
                
                # Chart
                fig = px.bar(
                    discount_df.head(20),
                    x='Server',
                    y='Total_Discounts',
                    color='Total_Discounts',
                    color_continuous_scale=[[0, '#e2d2b8'], [0.5, '#cdb082'], [1, '#b88f4d']],
                    title="Total Discounts by Server",
                    template="plotly_white"
                )
                fig.update_layout(
                    plot_bgcolor='#ffffff',
                    paper_bgcolor='#f8f4ed',
                    font=dict(color='#363a39', size=12),
                    xaxis_tickangle=-45,
                    showlegend=False
                )
                st.plotly_chart(fig, use_container_width=True)
                
                # Red flags
                if results.get('discount_red_flags'):
                    red_flags = results['discount_red_flags']
                    if red_flags:
                        st.warning(f"⚠️ **{len(red_flags)} red flags identified**")
                        st.json(red_flags)
                
                st.dataframe(discount_df, use_container_width=True)
            else:
                st.info("No discount data available. Run analytics first.")
    
    # =========================================================
    # EXECUTIVE DASHBOARD SECTION (Server Performance Analytics)
    # =========================================================
    st.markdown("---")
    st.markdown("## 👔 Executive Dashboard")
    st.markdown("**Server performance metrics and analytics**")
    
    # Prepare data for executive dashboard
    exec_df = df_filtered.copy()
    
    # Apply executive dashboard processing
    exec_df = ed.calculate_revenue(exec_df)
    exec_df = ed.apply_business_day_logic(exec_df)
    exec_df, void_count = ed.process_void_column(exec_df)
    
    # Calculate shift metrics
    shift_metrics = ed.calculate_shift_metrics(exec_df)
    
    # Calculate server metrics (the main performance data)
    server_metrics = ed.calculate_server_metrics(exec_df, shift_metrics)
    
    if not server_metrics.empty:
        # Display Server Performance Table
        st.markdown("### 📊 Server Performance Metrics")
        st.markdown("*Sales per hour, hustle scores, void rates, and performance grades*")
        
        # Format the metrics for display
        display_metrics = server_metrics.copy()
        display_metrics['Total_Sales'] = display_metrics['Total_Sales'].apply(lambda x: f"${x:,.2f}")
        display_metrics['Sales_Per_Hour'] = display_metrics['Sales_Per_Hour'].apply(lambda x: f"${x:,.2f}")
        display_metrics['Hustle_Score'] = display_metrics['Hustle_Score'].apply(lambda x: f"{x:.2f}")
        display_metrics['Void_Rate'] = display_metrics['Void_Rate'].apply(lambda x: f"{x:.2f}%")
        display_metrics['True_Retention'] = display_metrics['True_Retention'].apply(lambda x: f"{x:.3f}")
        
        # Display the table
        st.dataframe(
            display_metrics[['Server', 'Grade', 'Total_Sales', 'Sales_Per_Hour', 'Hustle_Score', 
                           'Transaction_Count', 'Void_Rate', 'True_Retention']],
            use_container_width=True,
            hide_index=True
        )
        
        # Visualizations
        exec_viz_col1, exec_viz_col2 = st.columns(2)
        
        with exec_viz_col1:
            # Sales Per Hour by Grade
            if 'Sales_Per_Hour' in server_metrics.columns and 'Grade' in server_metrics.columns:
                fig_sph = px.bar(
                    server_metrics.sort_values('Sales_Per_Hour', ascending=True),
                    x='Sales_Per_Hour',
                    y='Server',
                    color='Grade',
                    color_discrete_map={'A': '#10b981', 'B': '#cdb082', 'C': '#b88f4d'},
                    orientation='h',
                    title="Sales Per Hour by Server (Performance Grade)",
                    template="plotly_white"
                )
                fig_sph.update_layout(
                    plot_bgcolor='#ffffff',
                    paper_bgcolor='#f8f4ed',
                    font=dict(color='#363a39', size=12),
                    xaxis_title="Sales Per Hour ($)",
                    yaxis_title="",
                    showlegend=True
                )
                st.plotly_chart(fig_sph, use_container_width=True)
        
        with exec_viz_col2:
            # Hustle Score visualization
            if 'Hustle_Score' in server_metrics.columns:
                fig_hustle = px.bar(
                    server_metrics.sort_values('Hustle_Score', ascending=True),
                    x='Hustle_Score',
                    y='Server',
                    color='Hustle_Score',
                    color_continuous_scale=[[0, '#e2d2b8'], [0.5, '#cdb082'], [1, '#b88f4d']],
                    orientation='h',
                    title="Hustle Score (Transactions Per Hour)",
                    template="plotly_white"
                )
                fig_hustle.update_layout(
                    plot_bgcolor='#ffffff',
                    paper_bgcolor='#f8f4ed',
                    font=dict(color='#363a39', size=12),
                    xaxis_title="Hustle Score",
                    yaxis_title="",
                    showlegend=False
                )
                st.plotly_chart(fig_hustle, use_container_width=True)
        
        # Void Rate Analysis
        if 'Void_Rate' in server_metrics.columns and server_metrics['Void_Rate'].sum() > 0:
            st.markdown("### ⚠️ Void Rate Analysis")
            void_analysis_col1, void_analysis_col2 = st.columns(2)
            
            with void_analysis_col1:
                void_servers = server_metrics[server_metrics['Void_Rate'] > 0].copy()
                if not void_servers.empty:
                    fig_void = px.bar(
                        void_servers.sort_values('Void_Rate', ascending=True),
                        x='Void_Rate',
                        y='Server',
                        color='Void_Rate',
                        color_continuous_scale='Reds',
                        orientation='h',
                        title="Void Rate by Server (%)",
                        template="plotly_white"
                    )
                    fig_void.update_layout(
                        plot_bgcolor='#ffffff',
                        paper_bgcolor='#f8f4ed',
                        font=dict(color='#363a39', size=12),
                        xaxis_title="Void Rate (%)",
                        yaxis_title="",
                        showlegend=False
                    )
                    st.plotly_chart(fig_void, use_container_width=True)
            
            with void_analysis_col2:
                # Performance scatter: Sales vs Void Rate
                fig_scatter = px.scatter(
                    server_metrics,
                    x='Total_Sales',
                    y='Void_Rate',
                    color='Grade',
                    size='Transaction_Count',
                    hover_name='Server',
                    color_discrete_map={'A': '#10b981', 'B': '#cdb082', 'C': '#b88f4d'},
                    title="Sales vs Void Rate (Bubble Size = Transactions)",
                    template="plotly_white"
                )
                fig_scatter.update_layout(
                    plot_bgcolor='#ffffff',
                    paper_bgcolor='#f8f4ed',
                    font=dict(color='#363a39', size=12),
                    xaxis_title="Total Sales ($)",
                    yaxis_title="Void Rate (%)",
                    showlegend=True
                )
                st.plotly_chart(fig_scatter, use_container_width=True)
        
        # Shift Metrics Summary
        if not shift_metrics.empty:
            st.markdown("### 📅 Shift Performance Summary")
            shift_summary = shift_metrics.groupby('Server').agg({
                'Total_Sales': 'sum',
                'Hours_Worked': 'sum',
                'Transaction_Count': 'sum',
                'Business_Date': 'nunique'
            }).reset_index()
            shift_summary['Avg_Sales_Per_Shift'] = (shift_summary['Total_Sales'] / shift_summary['Business_Date']).round(2)
            shift_summary['Shifts_Worked'] = shift_summary['Business_Date']
            
            display_shift = shift_summary.copy()
            display_shift['Total_Sales'] = display_shift['Total_Sales'].apply(lambda x: f"${x:,.2f}")
            display_shift['Avg_Sales_Per_Shift'] = display_shift['Avg_Sales_Per_Shift'].apply(lambda x: f"${x:,.2f}")
            display_shift['Hours_Worked'] = display_shift['Hours_Worked'].apply(lambda x: f"{x:.1f}")
            
            st.dataframe(
                display_shift[['Server', 'Shifts_Worked', 'Hours_Worked', 'Total_Sales', 
                             'Avg_Sales_Per_Shift', 'Transaction_Count']],
                use_container_width=True,
                hide_index=True
            )
    else:
        st.info("""
        **No server performance data available.**
        
        To see executive dashboard metrics, your data needs to include:
        - Server/Employee names
        - Date/time information
        - Revenue/sales data
        
        The executive dashboard calculates:
        - **Performance Grades** (A/B/C based on sales per hour)
        - **Hustle Scores** (transactions per hour)
        - **Void Rates** (error tracking)
        - **True Retention** (transaction success rate)
        """)
    
    # ===== FOOTER =====
    st.markdown("---")
    st.markdown("""
    <div style='text-align: center; color: #818786; padding: 20px;'>
        <p style='margin: 0;'>HTX TAP Analytics Dashboard</p>
        <p style='margin: 0; font-size: 0.9em;'>Track. Analyze. Profit.</p>
    </div>
    """, unsafe_allow_html=True)

if __name__ == "__main__":
    main()
