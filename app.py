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
    
    if revenue_col:
        st.write(f"      ✅ Found revenue column: `{revenue_col}`")
        df_processed['revenue'] = clean_currency_column(df_processed[revenue_col])
    else:
        st.warning(f"      ⚠️ No revenue column in `{filename}`. Available: {', '.join(df.columns.tolist()[:5])}")
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
    
    if date_col:
        try:
            st.write(f"      ✅ Found date column: `{date_col}`")
            df_processed['date'] = pd.to_datetime(df_processed[date_col], errors='coerce')
        except:
            st.warning(f"      ⚠️ Could not parse dates in `{date_col}`")
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
