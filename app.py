"""
Toast Analytics Dashboard - HTX TAP
A comprehensive restaurant analytics platform for Toast POS data
"""

import io
import time
from datetime import datetime, timedelta
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
# CUSTOM STYLING - LUXURY DARK THEME
# =========================================================

st.markdown("""
<style>
    /* Global App Styling */
    .stApp {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    }
    
    /* Main Title */
    h1 {
        color: #f8fafc;
        font-weight: 800;
        letter-spacing: -0.5px;
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    
    h2, h3 {
        color: #e2e8f0;
        font-weight: 600;
    }
    
    /* Metric Cards - Glassmorphism */
    div[data-testid="stMetricValue"] {
        font-size: 2rem;
        font-weight: 700;
        color: #fbbf24;
    }
    
    div[data-testid="stMetricLabel"] {
        color: #cbd5e1;
        font-weight: 500;
        font-size: 0.9rem;
    }
    
    div[data-testid="stMetricDelta"] {
        color: #10b981;
    }
    
    /* Card Containers */
    .metric-card {
        background: rgba(30, 41, 59, 0.6);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(148, 163, 184, 0.1);
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
    
    /* Sidebar Styling */
    section[data-testid="stSidebar"] {
        background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
        border-right: 1px solid rgba(148, 163, 184, 0.1);
    }
    
    section[data-testid="stSidebar"] h2 {
        color: #fbbf24;
    }
    
    /* Button Styling */
    .stButton>button {
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        color: #0f172a;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        padding: 0.5rem 1.5rem;
        transition: all 0.3s ease;
    }
    
    .stButton>button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
    }
    
    /* Download Button */
    .stDownloadButton>button {
        background: rgba(30, 41, 59, 0.8);
        color: #fbbf24;
        border: 1px solid #fbbf24;
        border-radius: 8px;
        font-weight: 600;
    }
    
    /* Input Fields */
    .stTextInput>div>div>input {
        background: rgba(30, 41, 59, 0.6);
        color: #f8fafc;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 8px;
    }
    
    /* Date Input */
    .stDateInput>div>div>input {
        background: rgba(30, 41, 59, 0.6);
        color: #f8fafc;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 8px;
    }
    
    /* Divider */
    hr {
        border-color: rgba(148, 163, 184, 0.2);
        margin: 2rem 0;
    }
    
    /* DataFrame */
    .dataframe {
        background: rgba(30, 41, 59, 0.6);
        color: #f8fafc;
    }
    
    /* Success/Warning/Error Messages */
    .stSuccess {
        background: rgba(16, 185, 129, 0.1);
        border-left: 4px solid #10b981;
    }
    
    .stWarning {
        background: rgba(251, 191, 36, 0.1);
        border-left: 4px solid #fbbf24;
    }
    
    .stError {
        background: rgba(239, 68, 68, 0.1);
        border-left: 4px solid #ef4444;
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
        
        # If folder is empty, search root directory
        if not files:
            st.warning(f"⚠️ No files in '{folder}'. Searching entire bucket...")
            files = client.storage.from_(bucket).list("")
            files = [f for f in files if f.get('name', '').lower().endswith('.csv')]
        
        return files
    
    except Exception as e:
        st.error(f"❌ Error accessing storage: {str(e)}")
        return []

@st.cache_data(ttl=1800)  # Cache for 30 minutes
def load_csv_from_supabase(_client, bucket, filepath):
    """
    Download and parse CSV file from Supabase.
    
    Args:
        _client: Supabase client (prefixed with _ to prevent hashing)
        bucket: Storage bucket name
        filepath: Full path to CSV file
        
    Returns:
        DataFrame: Parsed CSV data
    """
    try:
        response = _client.storage.from_(bucket).download(filepath)
        df = pd.read_csv(io.BytesIO(response))
        return df
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

def standardize_dataframe(df):
    """
    Standardize column names and data types across different Toast export formats.
    
    Returns:
        DataFrame: Processed dataframe with standard columns
    """
    df_processed = df.copy()
    
    # ===== REVENUE COLUMN =====
    revenue_candidates = [
        'net_sales', 'total_price', 'net_price', 'check_total', 
        'sales', 'amount', 'net_amount', 'total_net_sales'
    ]
    
    revenue_col = None
    for col in df_processed.columns:
        if col.lower() in revenue_candidates:
            revenue_col = col
            break
    
    if revenue_col:
        df_processed['revenue'] = clean_currency_column(df_processed[revenue_col])
    else:
        st.warning("⚠️ Revenue column not found. Setting revenue to 0.")
        df_processed['revenue'] = 0
    
    # ===== DATE COLUMN =====
    date_candidates = [
        'order_date', 'business_date', 'date', 'opened_date', 
        'created_at', 'closed_date', 'paid_date'
    ]
    
    date_col = None
    for col in df_processed.columns:
        if col.lower() in date_candidates:
            try:
                df_processed['date'] = pd.to_datetime(df_processed[col], errors='coerce')
                date_col = col
                break
            except:
                continue
    
    if not date_col:
        st.error("❌ No valid date column found!")
        df_processed['date'] = pd.NaT
    
    # ===== ITEM/PRODUCT COLUMN =====
    item_candidates = [
        'item_name', 'name', 'menu_item_name', 'item', 
        'product_name', 'menu_item', 'selection_name'
    ]
    
    item_col = None
    for col in df_processed.columns:
        if col.lower() in item_candidates:
            df_processed['item'] = df_processed[col].astype(str)
            item_col = col
            break
    
    if not item_col:
        df_processed['item'] = 'Unknown'
    
    # ===== CATEGORY COLUMN =====
    category_candidates = [
        'category', 'category_group_name', 'menu_category', 
        'category_name', 'item_category'
    ]
    
    category_col = None
    for col in df_processed.columns:
        if col.lower() in category_candidates:
            df_processed['category'] = df_processed[col].astype(str)
            category_col = col
            break
    
    if not category_col:
        df_processed['category'] = 'Uncategorized'
    
    # ===== QUANTITY COLUMN =====
    qty_candidates = ['quantity', 'qty', 'count', 'item_quantity']
    
    qty_col = None
    for col in df_processed.columns:
        if col.lower() in qty_candidates:
            df_processed['quantity'] = pd.to_numeric(df_processed[col], errors='coerce').fillna(1)
            qty_col = col
            break
    
    if not qty_col:
        df_processed['quantity'] = 1
    
    return df_processed

def enrich_dataframe(df):
    """
    Add calculated fields for analytics.
    """
    df_enriched = df.copy()
    
    # Drop rows with invalid dates
    df_enriched = df_enriched.dropna(subset=['date'])
    
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
        marker_color='rgba(251, 191, 36, 0.6)',
        hovertemplate='<b>%{x|%B %d, %Y}</b><br>Revenue: $%{y:,.2f}<extra></extra>'
    ))
    
    # Moving average line
    fig.add_trace(go.Scatter(
        x=daily_sales['date'],
        y=daily_sales['ma7'],
        name='7-Day Average',
        line=dict(color='#10b981', width=3),
        hovertemplate='<b>%{x|%B %d, %Y}</b><br>7-Day Avg: $%{y:,.2f}<extra></extra>'
    ))
    
    fig.update_layout(
        title="Daily Revenue Trend with Moving Average",
        xaxis_title="Date",
        yaxis_title="Revenue ($)",
        template="plotly_dark",
        hovermode='x unified',
        plot_bgcolor='rgba(30, 41, 59, 0.6)',
        paper_bgcolor='rgba(30, 41, 59, 0.6)',
        font=dict(color='#e2e8f0', size=12),
        showlegend=True,
        legend=dict(
            bgcolor='rgba(15, 23, 42, 0.8)',
            bordercolor='rgba(148, 163, 184, 0.2)',
            borderwidth=1
        )
    )
    
    return fig

def create_top_items_chart(df, top_n=15):
    """Create horizontal bar chart of top selling items."""
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
        template="plotly_dark",
        color='revenue',
        color_continuous_scale='Viridis'
    )
    
    fig.update_layout(
        xaxis_title="Revenue ($)",
        yaxis_title="",
        plot_bgcolor='rgba(30, 41, 59, 0.6)',
        paper_bgcolor='rgba(30, 41, 59, 0.6)',
        font=dict(color='#e2e8f0', size=12),
        showlegend=False
    )
    
    fig.update_traces(
        hovertemplate='<b>%{y}</b><br>Revenue: $%{x:,.2f}<extra></extra>'
    )
    
    return fig

def create_hourly_heatmap(df):
    """Create heatmap showing revenue by day of week and hour."""
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
        color_continuous_scale="Plasma",
        title="Revenue Heatmap: Day × Hour",
        aspect="auto"
    )
    
    fig.update_layout(
        template="plotly_dark",
        plot_bgcolor='rgba(30, 41, 59, 0.6)',
        paper_bgcolor='rgba(30, 41, 59, 0.6)',
        font=dict(color='#e2e8f0', size=12)
    )
    
    return fig

def create_category_pie_chart(df):
    """Create pie chart showing revenue distribution by category."""
    category_sales = (
        df.groupby('category')['revenue']
        .sum()
        .reset_index()
        .sort_values('revenue', ascending=False)
    )
    
    fig = px.pie(
        category_sales,
        values='revenue',
        names='category',
        title="Revenue Distribution by Category",
        hole=0.4,
        color_discrete_sequence=px.colors.qualitative.Set3
    )
    
    fig.update_layout(
        template="plotly_dark",
        plot_bgcolor='rgba(30, 41, 59, 0.6)',
        paper_bgcolor='rgba(30, 41, 59, 0.6)',
        font=dict(color='#e2e8f0', size=12),
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
        template="plotly_dark",
        color='revenue',
        color_continuous_scale='Sunset'
    )
    
    fig.update_layout(
        xaxis_title="Meal Period",
        yaxis_title="Revenue ($)",
        plot_bgcolor='rgba(30, 41, 59, 0.6)',
        paper_bgcolor='rgba(30, 41, 59, 0.6)',
        font=dict(color='#e2e8f0', size=12),
        showlegend=False
    )
    
    fig.update_traces(
        hovertemplate='<b>%{x}</b><br>Revenue: $%{y:,.2f}<extra></extra>'
    )
    
    return fig

def create_weekday_weekend_comparison(df):
    """Create comparison chart for weekday vs weekend performance."""
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
            marker_color=['#fbbf24', '#10b981'],
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
            marker_color=['#fbbf24', '#10b981'],
            showlegend=False,
            hovertemplate='<b>%{x}</b><br>Avg: $%{y:.2f}<extra></extra>'
        ),
        row=1, col=2
    )
    
    fig.update_layout(
        title_text="Weekday vs Weekend Performance",
        template="plotly_dark",
        plot_bgcolor='rgba(30, 41, 59, 0.6)',
        paper_bgcolor='rgba(30, 41, 59, 0.6)',
        font=dict(color='#e2e8f0', size=12),
        height=400
    )
    
    return fig

# =========================================================
# PDF EXPORT FUNCTION
# =========================================================

def create_executive_pdf(client_name, metrics, top_items):
    """
    Generate professional executive summary PDF.
    
    Args:
        client_name: Restaurant/client name
        metrics: Dictionary of key metrics
        top_items: DataFrame of top performing items
        
    Returns:
        bytes: PDF file content
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # ===== HEADER SECTION =====
    # Dark header background
    c.setFillColor(HexColor('#0f172a'))
    c.rect(0, height - 120, width, 120, fill=1, stroke=0)
    
    # Gold accent bar
    c.setFillColor(HexColor('#fbbf24'))
    c.rect(0, height - 125, width, 5, fill=1, stroke=0)
    
    # Title
    c.setFillColor(HexColor('#ffffff'))
    c.setFont("Helvetica-Bold", 28)
    c.drawString(50, height - 60, "HTX TAP Analytics")
    
    c.setFont("Helvetica", 16)
    c.drawString(50, height - 85, f"{client_name} - Executive Summary")
    
    # Date
    c.setFont("Helvetica", 10)
    c.setFillColor(HexColor('#cbd5e1'))
    c.drawString(50, height - 105, f"Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}")
    
    # ===== KEY METRICS SECTION =====
    y_position = height - 160
    
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(HexColor('#0f172a'))
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
    c.setStrokeColor(HexColor('#cbd5e1'))
    c.line(50, y_position, width - 50, y_position)
    
    y_position -= 15
    c.setFont("Helvetica", 9)
    c.setFillColor(HexColor('#0f172a'))
    
    total_rev = metrics.get('total_revenue', 1)
    
    for idx, row in top_items.head(10).iterrows():
        if y_position < 100:  # Start new page if needed
            c.showPage()
            y_position = height - 50
        
        item_name = str(row['item'])[:40]  # Truncate long names
        revenue = row['revenue']
        percentage = (revenue / total_rev * 100) if total_rev > 0 else 0
        
        c.drawString(50, y_position, item_name)
        c.drawString(350, y_position, f"${revenue:,.2f}")
        c.drawString(450, y_position, f"{percentage:.1f}%")
        
        y_position -= 15
    
    # ===== FOOTER =====
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor('#64748b'))
    c.drawString(50, 30, "HTX TAP - Track. Analyze. Profit.")
    c.drawRightString(width - 50, 30, "Confidential - For Internal Use Only")
    
    # Save PDF
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
        
        # Bucket settings
        BUCKET = st.secrets.get("SUPABASE_BUCKET", "client-data")
        st.info(f"📦 **Bucket**: `{BUCKET}`")
        
        # Client folder input
        CLIENT_FOLDER = st.text_input(
            "Client Folder Name",
            value="Melrose",
            help="Enter the exact folder name from Supabase Storage"
        )
        
        st.markdown("---")
        
        # Refresh button
        if st.button("🔄 Reload Data", use_container_width=True):
            st.cache_data.clear()
            st.cache_resource.clear()
            st.rerun()
        
        st.markdown("---")
        
        # Info section
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
        st.caption("v2.0 | © HTX TAP")
    
    # ===== MAIN HEADER =====
    st.title(f"🍞 {CLIENT_FOLDER} Analytics Dashboard")
    st.markdown(f"**HTX TAP** · Track. Analyze. Profit.")
    st.markdown("---")
    
    # ===== DATA LOADING =====
    with st.status("🔍 Loading data from Supabase...", expanded=True) as status:
        # Get file list
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
            
            # Build filepath
            if filename.startswith(CLIENT_FOLDER):
                filepath = filename
            else:
                filepath = f"{CLIENT_FOLDER}/{filename}" if CLIENT_FOLDER else filename
            
            st.write(f"   📥 Loading `{filename}`...")
            
            df = load_csv_from_supabase(client, BUCKET, filepath)
            
            if df is not None and not df.empty:
                df = standardize_dataframe(df)
                dataframes.append(df)
            else:
                st.warning(f"   ⚠️ Skipped `{filename}` (empty or error)")
        
        if not dataframes:
            status.update(label="❌ No valid data loaded", state="error")
            st.error("All files failed to load or were empty.")
            st.stop()
        
        # Merge all dataframes
        status.update(label="🔗 Merging datasets...", state="running")
        combined_df = pd.concat(dataframes, ignore_index=True)
        
        # Enrich data
        status.update(label="🎯 Enriching data...", state="running")
        processed_df = enrich_dataframe(combined_df)
        
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
            min_date = processed_df['date'].min().date()
            max_date = processed_df['date'].max().date()
            
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
    
    # Check if data exists after filtering
    if df_filtered.empty:
        st.warning("⚠️ No data available with current filters. Please adjust your selection.")
        st.stop()
    
    # ===== KEY METRICS =====
    total_revenue = df_filtered['revenue'].sum()
    total_transactions = len(df_filtered)
    total_items_sold = df_filtered['quantity'].sum()
    avg_order_value = total_revenue / total_transactions if total_transactions > 0 else 0
    unique_items = df_filtered['item'].nunique()
    
    # Calculate period-over-period growth (if applicable)
    if 'date' in df_filtered.columns and len(df_filtered) > 1:
        date_range_days = (df_filtered['date'].max() - df_filtered['date'].min()).days
        if date_range_days >= 14:  # At least 2 weeks of data
            midpoint = df_filtered['date'].min() + timedelta(days=date_range_days // 2)
            first_half_revenue = df_filtered[df_filtered['date'] < midpoint]['revenue'].sum()
            second_half_revenue = df_filtered[df_filtered['date'] >= midpoint]['revenue'].sum()
            
            if first_half_revenue > 0:
                revenue_growth = ((second_half_revenue - first_half_revenue) / first_half_revenue) * 100
            else:
                revenue_growth = 0
        else:
            revenue_growth = 0
    else:
        revenue_growth = 0
    
    # Display metrics
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
    
    # Row 1: Revenue Trend & Top Items
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
    
    # Row 2: Heatmap & Category Pie
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
    
    # Row 3: Meal Period & Weekday/Weekend
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
        # Prepare metrics for PDF
        metrics_dict = {
            'total_revenue': total_revenue,
            'total_transactions': total_transactions,
            'avg_order_value': avg_order_value,
            'total_items': total_items_sold,
            'unique_items': unique_items,
            'date_range': f"{df_filtered['date'].min().strftime('%m/%d/%Y')} - {df_filtered['date'].max().strftime('%m/%d/%Y')}"
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
    
    # ===== FOOTER =====
    st.markdown("---")
    st.markdown("""
    <div style='text-align: center; color: #64748b; padding: 20px;'>
        <p style='margin: 0;'>HTX TAP Analytics Dashboard</p>
        <p style='margin: 0; font-size: 0.9em;'>Track. Analyze. Profit.</p>
    </div>
    """, unsafe_allow_html=True)

# =========================================================
# RUN APPLICATION
# =========================================================

if __name__ == "__main__":
    main()
