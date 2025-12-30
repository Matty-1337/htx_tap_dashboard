"""
Executive Dashboard Visualizations
==================================
Plotly visualizations for the Executive Dashboard with dark theme support.
"""

from typing import Optional, Dict, Any
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime, timedelta
from executive_dashboard import calculate_server_metrics, calculate_shift_metrics, apply_business_day_logic, calculate_revenue, process_void_column


def calculate_business_date(date_series: pd.Series, hour_series: pd.Series) -> pd.Series:
    """Calculate business date based on date and hour. If hour < 4am, counts as previous business day."""
    business_dates = date_series.copy()
    mask = hour_series < 4
    business_dates.loc[mask] = business_dates.loc[mask] - pd.Timedelta(days=1)
    return business_dates


def get_custom_hour_order() -> list:
    """Return custom hour order for heatmaps (4am-3am business day)."""
    return list(range(4, 24)) + list(range(0, 4))


def prepare_dashboard_data(df: pd.DataFrame) -> Dict[str, Any]:
    """Prepare all data needed for Executive Dashboard visualizations."""
    df = calculate_revenue(df)
    df = apply_business_day_logic(df)
    df, void_count = process_void_column(df)
    shift_metrics = calculate_shift_metrics(df)
    server_metrics = calculate_server_metrics(df, shift_metrics)
    if 'business_date' in df.columns and 'hour' in df.columns:
        revenue_data = df.groupby(['business_date', 'hour'])['revenue'].sum().reset_index()
        revenue_data['day_of_week'] = pd.to_datetime(revenue_data['business_date']).dt.day_name()
    else:
        revenue_data = pd.DataFrame()
    forensics_data = pd.DataFrame()
    if len(server_metrics) > 0 and 'Void_Rate' in server_metrics.columns:
        forensics_data = server_metrics[(server_metrics['Void_Rate'] > 5.0) | (server_metrics['True_Retention'] < 0.95)].copy()
        if len(forensics_data) > 0:
            forensics_data['Risk_Score'] = ((forensics_data['Void_Rate'] / 10.0) * 0.5 + ((1.0 - forensics_data['True_Retention']) * 100) * 0.5).round(2)
            forensics_data = forensics_data.sort_values('Risk_Score', ascending=False)
    return {'server_metrics': server_metrics, 'shift_metrics': shift_metrics, 'revenue_data': revenue_data, 'forensics_data': forensics_data, 'void_count': void_count}


def plot_revenue_heatmap(revenue_data: pd.DataFrame, dark_theme: bool = True) -> go.Figure:
    """Create revenue heatmap showing revenue by day of week and hour."""
    if revenue_data.empty or 'day_of_week' not in revenue_data.columns:
        fig = go.Figure()
        fig.add_annotation(text="No revenue data available", xref="paper", yref="paper", x=0.5, y=0.5, showarrow=False, font=dict(size=16, color="#FAFAFA" if dark_theme else "#363a39"))
        fig.update_layout(template="plotly_dark" if dark_theme else "plotly_white", plot_bgcolor="#0E1117" if dark_theme else "#ffffff", paper_bgcolor="#0E1117" if dark_theme else "#f8f4ed", font=dict(color="#FAFAFA" if dark_theme else "#363a39", size=12), title="Revenue Heatmap: Day × Hour", height=400)
        return fig
    day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    revenue_data['day_of_week'] = pd.Categorical(revenue_data['day_of_week'], categories=day_order, ordered=True)
    pivot_data = revenue_data.groupby(['day_of_week', 'hour'])['revenue'].sum().reset_index()
    pivot = pivot_data.pivot(index='hour', columns='day_of_week', values='revenue').fillna(0)
    hour_order = get_custom_hour_order()
    pivot = pivot.reindex([h for h in hour_order if h in pivot.index])
    fig = go.Figure(data=go.Heatmap(z=pivot.values, x=pivot.columns, y=pivot.index, colorscale=[[0, '#0E1117'], [0.3, '#1a1f2e'], [0.6, '#00E5FF'], [1, '#06FFA5']] if dark_theme else [[0, '#f8f4ed'], [0.3, '#e2d2b8'], [0.6, '#cdb082'], [1, '#b88f4d']], colorbar=dict(title="Revenue ($)", titlefont=dict(color="#FAFAFA" if dark_theme else "#363a39"), tickfont=dict(color="#FAFAFA" if dark_theme else "#363a39")), hovertemplate='<b>%{y}:00 - %{x}</b><br>Revenue: $%{z:,.2f}<extra></extra>'))
    fig.update_layout(title="Revenue Heatmap: Day × Hour", xaxis_title="Day of Week", yaxis_title="Hour of Day", template="plotly_dark" if dark_theme else "plotly_white", plot_bgcolor="#0E1117" if dark_theme else "#ffffff", paper_bgcolor="#0E1117" if dark_theme else "#f8f4ed", font=dict(color="#FAFAFA" if dark_theme else "#363a39", size=12), height=500, xaxis=dict(gridcolor="rgba(0, 229, 255, 0.1)" if dark_theme else "rgba(205, 176, 130, 0.2)"), yaxis=dict(gridcolor="rgba(0, 229, 255, 0.1)" if dark_theme else "rgba(205, 176, 130, 0.2)"))
    return fig


def plot_server_leaderboard(server_metrics: pd.DataFrame, dark_theme: bool = True, top_n: int = 15) -> go.Figure:
    """Create horizontal bar chart showing server performance leaderboard."""
    if server_metrics.empty or 'Server' not in server_metrics.columns:
        fig = go.Figure()
        fig.add_annotation(text="No server data available", xref="paper", yref="paper", x=0.5, y=0.5, showarrow=False, font=dict(size=16, color="#FAFAFA" if dark_theme else "#363a39"))
        fig.update_layout(template="plotly_dark" if dark_theme else "plotly_white", plot_bgcolor="#0E1117" if dark_theme else "#ffffff", paper_bgcolor="#0E1117" if dark_theme else "#f8f4ed", font=dict(color="#FAFAFA" if dark_theme else "#363a39", size=12), title="Server Performance Leaderboard", height=400)
        return fig
    leaderboard = server_metrics.nlargest(top_n, 'Total_Sales').sort_values('Total_Sales')
    fig = go.Figure(data=go.Bar(x=leaderboard['Total_Sales'], y=leaderboard['Server'], orientation='h', marker=dict(color=leaderboard['Total_Sales'], colorscale=[[0, '#0E1117'], [0.5, '#00E5FF'], [1, '#06FFA5']] if dark_theme else [[0, '#e2d2b8'], [0.5, '#cdb082'], [1, '#b88f4d']], showscale=True, colorbar=dict(title="Total Sales ($)", titlefont=dict(color="#FAFAFA" if dark_theme else "#363a39"), tickfont=dict(color="#FAFAFA" if dark_theme else "#363a39"))), text=[f"${x:,.0f}" for x in leaderboard['Total_Sales']], textposition='outside', hovertemplate='<b>%{y}</b><br>Total Sales: $%{x:,.2f}<extra></extra>'))
    fig.update_layout(title=f"Server Performance Leaderboard (Top {top_n})", xaxis_title="Total Sales ($)", yaxis_title="", template="plotly_dark" if dark_theme else "plotly_white", plot_bgcolor="#0E1117" if dark_theme else "#ffffff", paper_bgcolor="#0E1117" if dark_theme else "#f8f4ed", font=dict(color="#FAFAFA" if dark_theme else "#363a39", size=12), height=max(400, len(leaderboard) * 30), xaxis=dict(gridcolor="rgba(0, 229, 255, 0.1)" if dark_theme else "rgba(205, 176, 130, 0.2)"), yaxis=dict(gridcolor="rgba(0, 229, 255, 0.1)" if dark_theme else "rgba(205, 176, 130, 0.2)"))
    return fig


def plot_server_grading(server_metrics: pd.DataFrame, dark_theme: bool = True) -> go.Figure:
    """Create visualization showing server grades (A/B/C) based on performance."""
    if server_metrics.empty or 'Grade' not in server_metrics.columns:
        fig = go.Figure()
        fig.add_annotation(text="No server grading data available", xref="paper", yref="paper", x=0.5, y=0.5, showarrow=False, font=dict(size=16, color="#FAFAFA" if dark_theme else "#363a39"))
        fig.update_layout(template="plotly_dark" if dark_theme else "plotly_white", plot_bgcolor="#0E1117" if dark_theme else "#ffffff", paper_bgcolor="#0E1117" if dark_theme else "#f8f4ed", font=dict(color="#FAFAFA" if dark_theme else "#363a39", size=12), title="Server Grading (A/B/C)", height=400)
        return fig
    grade_colors = {'A': '#06FFA5', 'B': '#00E5FF', 'C': '#FF6B6B'} if dark_theme else {'A': '#10b981', 'B': '#cdb082', 'C': '#ef4444'}
    if len(server_metrics) > 0:
        scatter_fig = go.Figure()
        for grade in ['A', 'B', 'C']:
            grade_data = server_metrics[server_metrics['Grade'] == grade]
            if len(grade_data) > 0:
                scatter_fig.add_trace(go.Scatter(x=grade_data['Sales_Per_Hour'], y=grade_data['Total_Sales'], mode='markers', name=f'Grade {grade}', marker=dict(color=grade_colors.get(grade, '#818786'), size=10, line=dict(width=1, color='#0E1117' if dark_theme else '#ffffff')), text=grade_data['Server'], hovertemplate='<b>%{text}</b><br>Sales/Hour: $%{x:.2f}<br>Total Sales: $%{y:,.2f}<extra></extra>'))
        scatter_fig.update_layout(title="Server Performance by Grade", xaxis_title="Sales Per Hour ($)", yaxis_title="Total Sales ($)", template="plotly_dark" if dark_theme else "plotly_white", plot_bgcolor="#0E1117" if dark_theme else "#ffffff", paper_bgcolor="#0E1117" if dark_theme else "#f8f4ed", font=dict(color="#FAFAFA" if dark_theme else "#363a39", size=12), height=400, xaxis=dict(gridcolor="rgba(0, 229, 255, 0.1)" if dark_theme else "rgba(205, 176, 130, 0.2)"), yaxis=dict(gridcolor="rgba(0, 229, 255, 0.1)" if dark_theme else "rgba(205, 176, 130, 0.2)"))
        return scatter_fig
    grade_counts = server_metrics['Grade'].value_counts().reindex(['A', 'B', 'C'], fill_value=0)
    fig = go.Figure(data=go.Bar(x=grade_counts.index, y=grade_counts.values, marker=dict(color=[grade_colors.get(grade, '#818786') for grade in grade_counts.index]), text=grade_counts.values, textposition='outside', hovertemplate='<b>Grade %{x}</b><br>Count: %{y}<extra></extra>'))
    fig.update_layout(title="Server Grading Distribution (A/B/C)", xaxis_title="Grade", yaxis_title="Number of Servers", template="plotly_dark" if dark_theme else "plotly_white", plot_bgcolor="#0E1117" if dark_theme else "#ffffff", paper_bgcolor="#0E1117" if dark_theme else "#f8f4ed", font=dict(color="#FAFAFA" if dark_theme else "#363a39", size=12), height=400, xaxis=dict(gridcolor="rgba(0, 229, 255, 0.1)" if dark_theme else "rgba(205, 176, 130, 0.2)"), yaxis=dict(gridcolor="rgba(0, 229, 255, 0.1)" if dark_theme else "rgba(205, 176, 130, 0.2)"))
    return fig


def generate_forensics_watch_list(server_metrics: pd.DataFrame, void_data: Optional[pd.DataFrame] = None) -> pd.DataFrame:
    """Generate forensics watch list of servers requiring attention."""
    if server_metrics.empty:
        return pd.DataFrame(columns=['Server', 'Risk_Score', 'Void_Rate', 'True_Retention', 'Total_Sales', 'Issue'])
    watch_list = []
    for _, row in server_metrics.iterrows():
        issues = []
        risk_score = 0.0
        if 'Void_Rate' in row and row['Void_Rate'] > 5.0:
            issues.append(f"High Void Rate ({row['Void_Rate']:.1f}%)")
            risk_score += row['Void_Rate'] / 2.0
        if 'True_Retention' in row and row['True_Retention'] < 0.95:
            issues.append(f"Low Retention ({row['True_Retention']*100:.1f}%)")
            risk_score += (1.0 - row['True_Retention']) * 50
        if 'Sales_Per_Hour' in row:
            avg_sph = server_metrics['Sales_Per_Hour'].mean()
            if row['Sales_Per_Hour'] < avg_sph * 0.7:
                issues.append(f"Low Sales/Hour (${row['Sales_Per_Hour']:.2f})")
                risk_score += 10.0
        if issues:
            watch_list.append({'Server': row['Server'], 'Risk_Score': round(risk_score, 2), 'Void_Rate': row.get('Void_Rate', 0.0), 'True_Retention': row.get('True_Retention', 1.0), 'Total_Sales': row.get('Total_Sales', 0.0), 'Issue': ' | '.join(issues)})
    if watch_list:
        watch_df = pd.DataFrame(watch_list)
        watch_df = watch_df.sort_values('Risk_Score', ascending=False)
        return watch_df
    else:
        return pd.DataFrame(columns=['Server', 'Risk_Score', 'Void_Rate', 'True_Retention', 'Total_Sales', 'Issue'])


def plot_forensics_watch_list(forensics_data: pd.DataFrame, dark_theme: bool = True) -> go.Figure:
    """Create visualization for forensics watch list."""
    if forensics_data.empty:
        fig = go.Figure()
        fig.add_annotation(text="✅ No servers on watch list", xref="paper", yref="paper", x=0.5, y=0.5, showarrow=False, font=dict(size=16, color="#06FFA5" if dark_theme else "#10b981"))
        fig.update_layout(template="plotly_dark" if dark_theme else "plotly_white", plot_bgcolor="#0E1117" if dark_theme else "#ffffff", paper_bgcolor="#0E1117" if dark_theme else "#f8f4ed", font=dict(color="#FAFAFA" if dark_theme else "#363a39", size=12), title="Forensics Watch List", height=400)
        return fig
    fig = go.Figure(data=go.Bar(x=forensics_data['Risk_Score'], y=forensics_data['Server'], orientation='h', marker=dict(color=forensics_data['Risk_Score'], colorscale=[[0, '#06FFA5'], [0.5, '#FFD700'], [1, '#FF6B6B']] if dark_theme else [[0, '#10b981'], [0.5, '#cdb082'], [1, '#ef4444']], showscale=True, colorbar=dict(title="Risk Score", titlefont=dict(color="#FAFAFA" if dark_theme else "#363a39"), tickfont=dict(color="#FAFAFA" if dark_theme else "#363a39"))), text=[f"Risk: {x:.1f}" for x in forensics_data['Risk_Score']], textposition='outside', hovertemplate='<b>%{y}</b><br>Risk Score: %{x:.2f}<br>Void Rate: ' + forensics_data['Void_Rate'].astype(str) + '%<br>Retention: ' + (forensics_data['True_Retention'] * 100).astype(str) + '%<extra></extra>'))
    fig.update_layout(title="Forensics Watch List (Servers Requiring Attention)", xaxis_title="Risk Score", yaxis_title="", template="plotly_dark" if dark_theme else "plotly_white", plot_bgcolor="#0E1117" if dark_theme else "#ffffff", paper_bgcolor="#0E1117" if dark_theme else "#f8f4ed", font=dict(color="#FAFAFA" if dark_theme else "#363a39", size=12), height=max(400, len(forensics_data) * 40), xaxis=dict(gridcolor="rgba(0, 229, 255, 0.1)" if dark_theme else "rgba(205, 176, 130, 0.2)"), yaxis=dict(gridcolor="rgba(0, 229, 255, 0.1)" if dark_theme else "rgba(205, 176, 130, 0.2)"))
    return fig

