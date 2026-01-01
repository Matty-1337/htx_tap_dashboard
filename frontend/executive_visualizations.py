"""
Executive Dashboard Visualizations for Toast POS Analytics
============================================================
Contains all visualization and data processing functions for the
Executive Dashboard landing page.

Functions:
- plot_revenue_heatmap() - 2D heatmap showing revenue by day/hour
- plot_server_leaderboard() - Server performance rankings by SPH
- plot_server_grading() - A/B/C server grade report cards
- plot_forensics_watch_list() - Void detection and risk analysis

Helper Functions:
- calculate_business_date() - Business date logic (4 AM cutoff)
- get_custom_hour_order() - Custom hour sorting for bar operations
- prepare_dashboard_data() - Data preparation pipeline
- generate_forensics_watch_list() - Forensics data processing
"""

import pandas as pd
import numpy as np
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import sys


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def calculate_business_date(df):
    """
    Calculate Business Date: Sales after midnight (00:00-05:00) belong to the previous day.
    Bar is open 4 PM - 2 AM, so post-midnight sales are part of the previous business day.

    Args:
        df: DataFrame with 'date' and 'hour' columns

    Returns:
        DataFrame with 'business_date' column added
    """
    df = df.copy()

    if 'date' not in df.columns or 'hour' not in df.columns:
        return df

    def adjust_date(row):
        if pd.isna(row['date']) or pd.isna(row['hour']):
            return row['date']

        hour = int(row['hour'])
        # If hour is 0-5 (midnight to 5 AM), subtract 1 day
        if 0 <= hour < 6:
            return row['date'] - pd.Timedelta(days=1)
        return row['date']

    df['business_date'] = df.apply(adjust_date, axis=1)

    # Also calculate business_dayofweek from business_date
    df['business_dayofweek'] = df['business_date'].dt.day_name()

    return df


def get_custom_hour_order():
    """
    Returns the custom hour sorting order for bar operations.
    Hours flow from opening to closing: 11 AM → 2 AM
    This matches business day logic where 1 AM/2 AM count as previous day's sales.

    Order: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2]
    Visual: 11 AM (top) → 12 PM → 1 PM → ... → 11 PM → 12 AM → 1 AM → 2 AM (bottom)
    """
    return [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2]


def prepare_dashboard_data(df):
    """
    Prepare data for Executive Dashboard visualizations.

    Pipeline:
    1. Filter to valid sales only
    2. Validate and parse date columns
    3. Create hour column
    4. Calculate business date
    5. Create DayOfWeek column
    6. Ensure revenue column exists
    7. Return cleaned data

    Args:
        df: Raw master DataFrame

    Returns:
        Cleaned DataFrame ready for visualization
    """

    # STEP 1: Filter valid sales
    if 'valid_sale' in df.columns:
        initial_rows = len(df)
        df = df[df['valid_sale'] == True].copy()
        voided_rows = initial_rows - len(df)

        if voided_rows > 0:
            st.info(f"ℹ️ Filtered out {voided_rows:,} voided transactions ({voided_rows/initial_rows*100:.1f}%)")
    else:
        st.warning("⚠️ No 'valid_sale' column found - assuming all transactions are valid")

    if len(df) == 0:
        st.error("❌ No valid sales data after filtering voids")
        return pd.DataFrame()

    # STEP 2: Validate and parse date columns
    if 'date' not in df.columns:
        # Try to find date column
        for col in ['sent_date', 'order_date', 'opened_date', 'timestamp']:
            if col in df.columns:
                df['date'] = df[col]
                st.info(f"ℹ️ Using '{col}' as date column")
                break

    if 'date' in df.columns:
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        null_dates = df['date'].isna().sum()

        if null_dates > 0:
            st.warning(f"⚠️ {null_dates:,} rows have invalid dates ({null_dates/len(df)*100:.1f}%)")

        # Remove rows with null dates
        df = df[df['date'].notna()].copy()

        if len(df) == 0:
            st.error("❌ No data remaining after removing invalid dates")
            return pd.DataFrame()
    else:
        st.error("❌ No date column found in data. Cannot proceed with dashboard.")
        return pd.DataFrame()

    # STEP 3: Create Hour column
    if 'hour' not in df.columns:
        df['hour'] = df['date'].dt.hour

    # STEP 4: Calculate Business Date (sales after midnight belong to previous day)
    df = calculate_business_date(df)

    # STEP 5: Create DayOfWeek column
    if 'business_dayofweek' in df.columns:
        df['DayOfWeek'] = df['business_dayofweek']
    elif 'weekday' in df.columns:
        df['DayOfWeek'] = df['weekday']
    else:
        df['DayOfWeek'] = df['date'].dt.day_name()

    # STEP 6: Ensure revenue column exists
    if 'revenue' not in df.columns:
        if 'net_price_clean' in df.columns and 'qty_clean' in df.columns:
            df['revenue'] = df['net_price_clean'] * df['qty_clean']
            st.info("ℹ️ Calculated revenue from net_price × qty")
        elif 'net_price' in df.columns and 'qty' in df.columns:
            # Clean and calculate
            df['revenue'] = (
                pd.to_numeric(df['net_price'], errors='coerce').fillna(0) *
                pd.to_numeric(df['qty'], errors='coerce').fillna(0)
            )
            st.info("ℹ️ Calculated revenue from net_price × qty")
        else:
            df['revenue'] = 0.0
            st.warning("⚠️ No revenue column found - set to 0. Check your data columns.")

    # STEP 7: Data quality summary
    total_revenue = df['revenue'].sum()
    date_range = (df['date'].min(), df['date'].max())
    unique_days = df['business_date'].nunique() if 'business_date' in df.columns else 0

    with st.expander("📊 Data Quality Summary", expanded=False):
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Valid Rows", f"{len(df):,}")
        with col2:
            st.metric("Total Revenue", f"${total_revenue:,.2f}")
        with col3:
            st.metric("Business Days", unique_days)

        st.write(f"**Date Range:** {date_range[0].strftime('%Y-%m-%d')} to {date_range[1].strftime('%Y-%m-%d')}")
        st.write(f"**Columns Available:** {', '.join(df.columns[:10])}{'...' if len(df.columns) > 10 else ''}")

    return df


# ============================================================================
# VISUALIZATION FUNCTIONS
# ============================================================================

def plot_revenue_heatmap(df):
    """
    2D Heatmap: Business DayOfWeek (x) vs Hour (y) colored by Sum(Revenue).
    Uses Business Date for proper day attribution and custom hour sorting (4 PM - 2 AM).
    """

    # Check if required columns exist
    if df is None or len(df) == 0:
        st.error("❌ No data available for heatmap")
        return None

    # Ensure hour column exists
    if 'hour' not in df.columns:
        if 'date' in df.columns:
            df['hour'] = pd.to_datetime(df['date'], errors='coerce').dt.hour
        else:
            st.error("❌ Missing 'hour' column. Cannot generate heatmap.")
            return None

    # Aggregate data by Business DayOfWeek and hour
    if 'business_dayofweek' in df.columns:
        day_col = 'business_dayofweek'
    elif 'DayOfWeek' in df.columns:
        day_col = 'DayOfWeek'
    elif 'weekday' in df.columns:
        day_col = 'weekday'
    elif 'date' in df.columns:
        df['DayOfWeek'] = pd.to_datetime(df['date'], errors='coerce').dt.day_name()
        day_col = 'DayOfWeek'
    else:
        st.error("❌ Missing day column. Cannot generate heatmap.")
        return None

    # Filter out rows with missing hour or day
    df_clean = df.dropna(subset=[day_col, 'hour'])

    if len(df_clean) == 0:
        st.error("❌ No valid data after filtering. Check date/hour columns.")
        return None

    # CRITICAL FIX: Convert hour to integer to avoid float/int mismatch during reindexing
    df_clean['hour'] = df_clean['hour'].astype(int)

    heatmap_data = df_clean.groupby([day_col, 'hour'])['revenue'].sum().reset_index()

    # Check if we have data
    if len(heatmap_data) == 0:
        st.error("❌ No revenue data found after grouping. Check that 'revenue' column has values.")
        return None

    # Pivot for heatmap
    day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    heatmap_pivot = heatmap_data.pivot_table(
        values='revenue',
        index='hour',
        columns=day_col,
        aggfunc='sum',
        fill_value=0
    )

    # Reorder columns (days) - only include days that exist
    existing_days = [d for d in day_order if d in heatmap_pivot.columns]
    if len(existing_days) == 0:
        st.error(f"❌ No matching day names found. Expected {day_order}, got {list(heatmap_pivot.columns)}")
        return None

    heatmap_pivot = heatmap_pivot.reindex(columns=existing_days)

    # Custom hour sorting: [16, 17, ..., 23, 0, 1, 2]
    custom_hour_order = get_custom_hour_order()
    # Only include hours that exist in the data
    available_hours = [h for h in custom_hour_order if h in heatmap_pivot.index]
    # Add any remaining hours not in custom order
    remaining_hours = [h for h in heatmap_pivot.index if h not in available_hours]
    final_hour_order = available_hours + sorted(remaining_hours)

    # Reindex rows with custom hour order
    heatmap_pivot = heatmap_pivot.reindex(final_hour_order)

    # CRITICAL: Fill any NaN values created during reindexing with 0
    heatmap_pivot = heatmap_pivot.fillna(0)

    # Final check before creating plot
    if heatmap_pivot.empty:
        st.error("❌ Heatmap pivot table is empty after processing.")
        return None

    # Final validation: Check for actual data
    total_in_final = heatmap_pivot.sum().sum()
    if total_in_final == 0:
        st.error("❌ Heatmap has zero revenue after reindexing!")
        st.warning("This might be a data type mismatch. Check debug expanders above.")
        return None

    # Create heatmap with improved color scale (dark to bright for easy reading)
    fig = px.imshow(
        heatmap_pivot,
        labels=dict(x="Business Day of Week", y="Hour", color="Revenue ($)"),
        color_continuous_scale=[
            [0.0, '#0d1117'],    # Very dark (almost black) for low values
            [0.2, '#1a365d'],    # Dark blue
            [0.4, '#2563eb'],    # Medium blue
            [0.6, '#7B2CBF'],    # Purple
            [0.8, '#00D9FF'],    # Bright cyan
            [1.0, '#06FFA5']     # Neon green for highest values
        ],
        aspect="auto",
        template='plotly_dark',
        title="💰 Revenue Heatmap: Peak Times Analysis"
    )

    # Format hour labels to show time (e.g., "4 PM", "11 PM", "1 AM")
    hour_labels = []
    for h in heatmap_pivot.index:
        if h >= 12:
            if h == 12:
                hour_labels.append("12 PM")
            else:
                hour_labels.append(f"{h-12} PM")
        else:
            if h == 0:
                hour_labels.append("12 AM")
            else:
                hour_labels.append(f"{h} AM")

    fig.update_layout(
        height=650,
        font=dict(color='white', size=13, family='Arial'),
        title=dict(
            font=dict(size=24, color='#00D9FF', family='Arial Black'),
            x=0.5,
            xanchor='center'
        ),
        xaxis=dict(
            title="Day of Week",
            title_font=dict(size=16, color='#00D9FF', family='Arial Black'),
            tickfont=dict(size=13, color='white', family='Arial Bold'),
            side='bottom',
            gridcolor='rgba(255,255,255,0.1)'
        ),
        yaxis=dict(
            title="Hour",
            title_font=dict(size=16, color='#00D9FF', family='Arial Black'),
            ticktext=hour_labels,
            tickvals=list(heatmap_pivot.index),
            tickfont=dict(size=12, color='white', family='Arial'),
            gridcolor='rgba(255,255,255,0.1)'
        ),
        plot_bgcolor='rgba(10,10,10,0.95)',
        paper_bgcolor='rgba(0,0,0,0)',
        margin=dict(l=80, r=150, t=100, b=80),
        coloraxis_colorbar=dict(
            title=dict(
                text="Revenue ($)",
                font=dict(size=14, color='white', family='Arial Black')
            ),
            tickfont=dict(size=12, color='white'),
            thickness=20,
            len=0.7,
            bgcolor='rgba(0,0,0,0.5)',
            bordercolor='rgba(255,255,255,0.3)',
            borderwidth=1,
            tickformat='$,.0f'
        )
    )

    # Enhanced hover template with more information
    fig.update_traces(
        hovertemplate='<b>%{x}</b><br>' +
                      '<b>%{customdata[0]}</b><br>' +
                      'Revenue: <b>$%{z:,.2f}</b><br>' +
                      '<extra></extra>',
        customdata=[[hour_labels[i]] for i in range(len(hour_labels))]
    )

    # Add annotation with summary stats
    total_revenue = heatmap_pivot.sum().sum()
    peak_day = heatmap_pivot.sum().idxmax()
    peak_hour_idx = heatmap_pivot.sum(axis=1).idxmax()
    peak_hour_label = hour_labels[list(heatmap_pivot.index).index(peak_hour_idx)]

    fig.add_annotation(
        text=f"Total Revenue: ${total_revenue:,.0f} | Peak Day: {peak_day} | Peak Hour: {peak_hour_label}",
        xref="paper", yref="paper",
        x=0.5, y=1.05,
        showarrow=False,
        font=dict(size=13, color='#06FFA5', family='Arial Bold'),
        xanchor='center'
    )

    return fig


def plot_server_leaderboard(df):
    """
    Server Performance Table with SPH (Sales Per Hour) as primary ranking metric.
    Returns both a table DataFrame and a chart figure.
    Uses the robust executive_dashboard module for calculations.
    """
    from executive_dashboard import (
        calculate_server_metrics,
        calculate_shift_metrics,
        apply_business_day_logic,
        calculate_revenue,
        process_void_column
    )

    # Prepare data using executive_dashboard pipeline
    df_prep = df.copy()
    df_prep = calculate_revenue(df_prep)
    df_prep = apply_business_day_logic(df_prep)
    df_prep, void_count = process_void_column(df_prep)

    # Calculate shift metrics
    shift_df = calculate_shift_metrics(df_prep)

    # Calculate server metrics
    server_perf = calculate_server_metrics(df_prep, shift_df)

    if len(server_perf) == 0:
        st.warning("⚠️ No server performance data available. Check that your data has server/employee columns.")
        return None, None

    # Create horizontal bar chart sorted by SPH
    server_chart_data = server_perf.copy()

    # Sort by Sales_Per_Hour (SPH) and take top 15
    server_chart_data = server_chart_data.sort_values('Sales_Per_Hour', ascending=True).tail(15)

    # Create color mapping based on Grade
    grade_colors = {
        'A': '#06FFA5',  # Bright green for top performers
        'B': '#00D9FF',  # Cyan for mid performers
        'C': '#FF006E'   # Pink/red for low performers
    }
    server_chart_data['Color'] = server_chart_data['Grade'].map(grade_colors)

    fig = go.Figure(go.Bar(
        x=server_chart_data['Sales_Per_Hour'],
        y=server_chart_data['Server'],
        orientation='h',
        marker=dict(
            color=server_chart_data['Color'],
            line=dict(color='#ffffff', width=1.5)
        ),
        text=server_chart_data['Sales_Per_Hour'].apply(lambda x: f'${x:,.0f}/hr'),
        textposition='outside',
        textfont=dict(color='white', size=11, family='Arial Black'),
        hovertemplate='<b>%{y}</b><br>' +
                      'SPH: $%{x:,.2f}/hr<br>' +
                      'Grade: %{customdata[0]}<br>' +
                      'Total Sales: $%{customdata[1]:,.2f}<br>' +
                      '<extra></extra>',
        customdata=server_chart_data[['Grade', 'Total_Sales']].values
    ))

    fig.update_layout(
        title=dict(
            text="📊 Top 15 Servers by Sales Per Hour (SPH)",
            font=dict(size=22, color='#00D9FF', family='Arial Black'),
            x=0.5,
            xanchor='center'
        ),
        height=600,
        font=dict(color='white', size=12, family='Arial'),
        xaxis=dict(
            title="Sales Per Hour ($)",
            title_font=dict(size=16, color='#00D9FF', family='Arial Black'),
            gridcolor='rgba(255,255,255,0.1)',
            showgrid=True,
            zeroline=False
        ),
        yaxis=dict(
            title="",
            tickfont=dict(size=12, color='white', family='Arial Black'),
            gridcolor='rgba(255,255,255,0.05)',
            showgrid=True
        ),
        showlegend=False,
        plot_bgcolor='rgba(10,10,10,0.95)',
        paper_bgcolor='rgba(0,0,0,0)',
        margin=dict(l=150, r=100, t=80, b=60)
    )

    return server_perf, fig


def plot_server_grading(df):
    """
    Server Report Card: Visual grading system showing A/B/C performance ratings
    with color-coded metrics and detailed breakdowns.
    """
    from executive_dashboard import (
        calculate_server_metrics,
        calculate_shift_metrics,
        apply_business_day_logic,
        calculate_revenue,
        process_void_column
    )

    # Prepare data
    df_prep = df.copy()
    df_prep = calculate_revenue(df_prep)
    df_prep = apply_business_day_logic(df_prep)
    df_prep, void_count = process_void_column(df_prep)

    # Calculate metrics
    shift_df = calculate_shift_metrics(df_prep)
    server_metrics = calculate_server_metrics(df_prep, shift_df)

    if len(server_metrics) == 0:
        st.warning("⚠️ No server data available for grading.")
        return None, None

    # Count grades
    grade_counts = server_metrics['Grade'].value_counts()
    a_count = grade_counts.get('A', 0)
    b_count = grade_counts.get('B', 0)
    c_count = grade_counts.get('C', 0)

    # Create grade distribution donut chart
    grade_data = pd.DataFrame({
        'Grade': ['A - Excellent', 'B - Good', 'C - Needs Improvement'],
        'Count': [a_count, b_count, c_count],
        'Color': ['#06FFA5', '#00D9FF', '#FF006E']
    })

    fig_donut = go.Figure(go.Pie(
        labels=grade_data['Grade'],
        values=grade_data['Count'],
        hole=0.5,
        marker=dict(
            colors=grade_data['Color'],
            line=dict(color='#ffffff', width=2)
        ),
        textinfo='label+value',
        textfont=dict(size=14, color='white', family='Arial Black'),
        hovertemplate='<b>%{label}</b><br>Servers: %{value}<br>Percentage: %{percent}<extra></extra>'
    ))

    fig_donut.update_layout(
        title=dict(
            text="📊 Server Grade Distribution",
            font=dict(size=22, color='#00D9FF', family='Arial Black'),
            x=0.5,
            xanchor='center'
        ),
        height=500,
        font=dict(color='white', size=13, family='Arial'),
        showlegend=True,
        legend=dict(
            font=dict(color='white', size=13, family='Arial'),
            bgcolor='rgba(0,0,0,0.3)',
            bordercolor='rgba(255,255,255,0.2)',
            borderwidth=1
        ),
        plot_bgcolor='rgba(0,0,0,0)',
        paper_bgcolor='rgba(0,0,0,0)',
        annotations=[dict(
            text=f'{len(server_metrics)}<br>Servers',
            x=0.5, y=0.5,
            font=dict(size=24, color='#06FFA5', family='Arial Black'),
            showarrow=False
        )]
    )

    return server_metrics, fig_donut


def generate_forensics_watch_list(master_df):
    """
    Generate Forensics / Watch List: Suspicious Correlations.

    This function identifies servers and tabs with suspicious void patterns:
    - Tab Killing: Multiple voids on the same tab
    - High Void Rate: Servers with Z-Score > 2.0
    - Phantom Tabs: High void amounts correlated to specific tabs

    Args:
        master_df: Master DataFrame with void, server, tab, date, hour columns

    Returns:
        DataFrame with Server_Name, Tab_Name, Void_Amount, Risk_Reason columns
    """
    watch_list_items = []

    # Find column names
    server_col = None
    for col in ['server', 'server_name', 'employee', 'staff']:
        if col in master_df.columns:
            server_col = col
            break

    tab_col = None
    for col in ['tab_name', 'customer_name', 'check_name', 'tab']:
        if col in master_df.columns:
            tab_col = col
            break

    if not server_col:
        return pd.DataFrame(columns=['Server_Name', 'Tab_Name', 'Void_Amount', 'Risk_Reason'])

    # Check if is_voided column exists
    if 'is_voided' not in master_df.columns:
        # Try to find void column
        void_col = None
        for col in ['void', 'voided', 'is_void', 'void_', 'void?']:
            if col in master_df.columns:
                void_col = col
                break

        if void_col:
            void_values = master_df[void_col].astype(str).str.lower()
            master_df['is_voided'] = void_values.isin(['true', 'yes', 't', 'y', '1', 'void', 'voided'])
        else:
            master_df['is_voided'] = False

    # Calculate void rates per server
    server_void_stats = master_df.groupby(server_col).agg({
        'is_voided': 'sum'  # Count voids
    }).reset_index()

    # Get total transactions per server
    total_transactions = master_df.groupby(server_col).size().reset_index(name='total_transactions')
    server_void_stats = server_void_stats.merge(total_transactions, on=server_col)

    # Calculate void rate
    server_void_stats['void_count'] = server_void_stats['is_voided']
    server_void_stats['void_rate'] = (
        server_void_stats['void_count'] / server_void_stats['total_transactions'] * 100
    )

    # Calculate Z-Score
    staff_avg_void_rate = server_void_stats['void_rate'].mean()
    staff_std_void_rate = server_void_stats['void_rate'].std()

    if staff_std_void_rate > 0:
        server_void_stats['z_score'] = (
            (server_void_stats['void_rate'] - staff_avg_void_rate) / staff_std_void_rate
        )
        server_void_stats['flagged'] = server_void_stats['z_score'] > 2.0
    else:
        server_void_stats['z_score'] = 0.0
        server_void_stats['flagged'] = False

    # Add flagged servers to watch list
    flagged_servers = server_void_stats[server_void_stats['flagged'] == True].copy()
    if len(flagged_servers) > 0:
        flagged_servers['Tab_Name'] = 'N/A'

        # Calculate void amount for flagged servers
        voided_df = master_df[master_df['is_voided'] == True].copy()
        if 'revenue' in voided_df.columns:
            void_amounts = voided_df.groupby(server_col)['revenue'].sum().reset_index()
            void_amounts.columns = ['Server_Name', 'Void_Amount']
            flagged_servers = flagged_servers.merge(void_amounts, left_on=server_col, right_on='Server_Name', how='left')
            flagged_servers['Void_Amount'] = flagged_servers['Void_Amount'].fillna(0.0)
        else:
            flagged_servers['Void_Amount'] = 0.0

        flagged_servers['Risk_Reason'] = 'High Void Rate Z-Score (>2.0)'
        flagged_servers['Server_Name'] = flagged_servers[server_col]
        watch_list_items.append(flagged_servers[['Server_Name', 'Tab_Name', 'Void_Amount', 'Risk_Reason']])

    # Tab Killing: Servers with >1 void on same Tab Name
    if tab_col:
        voided_df = master_df[master_df['is_voided'] == True].copy()

        if len(voided_df) > 0 and 'revenue' in voided_df.columns:
            # Group by server and tab to find multiple voids
            tab_void_counts = voided_df.groupby([server_col, tab_col]).agg({
                'is_voided': 'count',
                'revenue': 'sum'
            }).reset_index()
            tab_void_counts.columns = ['Server_Name', 'Tab_Name', 'Void_Count', 'Void_Amount']

            # Filter to tabs with >1 void
            tab_killing = tab_void_counts[tab_void_counts['Void_Count'] > 1].copy()
            if len(tab_killing) > 0:
                tab_killing['Risk_Reason'] = 'Multiple Voids on Same Tab'
                watch_list_items.append(tab_killing[['Server_Name', 'Tab_Name', 'Void_Amount', 'Risk_Reason']])

    # Combine all watch list items
    if len(watch_list_items) > 0:
        watch_list = pd.concat(watch_list_items, ignore_index=True)
        return watch_list
    else:
        return pd.DataFrame(columns=['Server_Name', 'Tab_Name', 'Void_Amount', 'Risk_Reason'])


def plot_forensics_watch_list(watch_list):
    """
    Create colorful visualizations for Forensics Watch List.

    Args:
        watch_list: DataFrame with Server_Name, Tab_Name, Void_Amount, Risk_Reason

    Returns:
        tuple: (fig1, fig2, fig3) - Three plotly figures for different visualizations
    """

    if len(watch_list) == 0:
        return None, None, None

    # Chart 1: Void Amount by Server (Horizontal Bar Chart)
    server_voids = watch_list.groupby('Server_Name')['Void_Amount'].sum().reset_index()
    server_voids = server_voids.sort_values('Void_Amount', ascending=True).tail(15)

    fig1 = px.bar(
        server_voids,
        x='Void_Amount',
        y='Server_Name',
        orientation='h',
        color='Void_Amount',
        color_continuous_scale=['#00D9FF', '#7B2CBF', '#FF006E', '#FFBE0B'],
        template='plotly_dark',
        title="Top Servers by Total Void Amount",
        labels={'Void_Amount': 'Void Amount ($)', 'Server_Name': 'Server'}
    )

    fig1.update_layout(
        height=500,
        font=dict(color='white', size=12),
        title_font=dict(size=18, color='#00D9FF'),
        xaxis=dict(title_font=dict(size=14, color='white'), tickfont=dict(color='white')),
        yaxis=dict(title_font=dict(size=14, color='white'), tickfont=dict(color='white')),
        plot_bgcolor='rgba(0,0,0,0)',
        paper_bgcolor='rgba(0,0,0,0)'
    )

    fig1.update_traces(
        hovertemplate='<b>%{y}</b><br>Void Amount: $%{x:,.2f}<extra></extra>',
        marker_line_color='#00D9FF',
        marker_line_width=1
    )

    # Chart 2: Risk Reasons Distribution (Donut Chart)
    risk_counts = watch_list['Risk_Reason'].value_counts().reset_index()
    risk_counts.columns = ['Risk_Reason', 'Count']

    fig2 = go.Figure(data=[go.Pie(
        labels=risk_counts['Risk_Reason'],
        values=risk_counts['Count'],
        hole=0.5,  # Donut chart
        textinfo='label+percent',
        textfont=dict(size=12, color='white'),
        marker=dict(
            colors=['#00D9FF', '#7B2CBF', '#FF006E', '#FFBE0B', '#06FFA5'],
            line=dict(color='#09090b', width=2)
        )
    )])

    fig2.update_layout(
        title="Risk Reasons Distribution",
        template='plotly_dark',
        font=dict(color='white'),
        plot_bgcolor='rgba(0,0,0,0)',
        paper_bgcolor='rgba(0,0,0,0)',
        height=500,
        showlegend=True,
        legend=dict(
            font=dict(color='white', size=11),
            bgcolor='rgba(0,0,0,0)',
            bordercolor='#27272a',
            borderwidth=1
        )
    )

    # Chart 3: Void Amount by Risk Reason (Grouped Bar Chart)
    risk_voids = watch_list.groupby('Risk_Reason')['Void_Amount'].sum().reset_index()
    risk_voids = risk_voids.sort_values('Void_Amount', ascending=False)

    fig3 = px.bar(
        risk_voids,
        x='Risk_Reason',
        y='Void_Amount',
        color='Risk_Reason',
        color_discrete_sequence=['#00D9FF', '#7B2CBF', '#FF006E', '#FFBE0B', '#06FFA5'],
        template='plotly_dark',
        title="Total Void Amount by Risk Reason",
        labels={'Void_Amount': 'Void Amount ($)', 'Risk_Reason': 'Risk Reason'}
    )

    fig3.update_layout(
        height=500,
        font=dict(color='white', size=12),
        title_font=dict(size=18, color='#00D9FF'),
        xaxis=dict(title_font=dict(size=14, color='white'), tickfont=dict(color='white'), tickangle=-45),
        yaxis=dict(title_font=dict(size=14, color='white'), tickfont=dict(color='white')),
        plot_bgcolor='rgba(0,0,0,0)',
        paper_bgcolor='rgba(0,0,0,0)',
        showlegend=False
    )

    fig3.update_traces(
        hovertemplate='<b>%{x}</b><br>Void Amount: $%{y:,.2f}<extra></extra>',
        marker_line_color='white',
        marker_line_width=1
    )

    return fig1, fig2, fig3

