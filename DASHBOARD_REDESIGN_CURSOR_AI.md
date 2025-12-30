# HTX TAP Dashboard - Complete Redesign for Cursor AI
## Apple-Inspired Futuristic Design + Employee Analytics

This file contains the complete redesigned dashboard code with:
- **Apple-inspired futuristic design** (sleek, minimalist, premium)
- **All employee/hustle analytics** (performance metrics, efficiency scores)
- **Redesigned visualizations** (modern, clean, luxurious)
- **Complete integration** ready for Cursor AI

---

## PART 1: NEW COLOR SCHEME - APPLE INSPIRED

```python
# Apple-Inspired Color Palette
APPLE_COLORS = {
    # Primary Backgrounds (Clean, Minimal)
    'bg_primary': '#000000',           # Pure black (Apple dark mode)
    'bg_secondary': '#1d1d1f',         # Dark gray
    'bg_card': '#1c1c1e',              # Card background
    'bg_elevated': '#2c2c2e',          # Elevated surfaces
    
    # Accents (Premium, Futuristic)
    'accent_primary': '#007aff',       # Apple blue
    'accent_secondary': '#5856d6',     # Purple
    'accent_success': '#34c759',       # Green
    'accent_warning': '#ff9500',       # Orange
    'accent_danger': '#ff3b30',         # Red
    
    # Text (High Contrast)
    'text_primary': '#ffffff',         # White
    'text_secondary': '#ebebf5',        # Light gray
    'text_tertiary': '#8e8e93',        # Medium gray
    
    # Gradients (Premium)
    'gradient_start': '#007aff',        # Blue start
    'gradient_end': '#5856d6',          # Purple end
    'gradient_success': '#34c759',      # Green gradient
    'gradient_warning': '#ff9500',      # Orange gradient
    
    # Chart Colors (Modern, Vibrant)
    'chart_blue': '#007aff',
    'chart_purple': '#5856d6',
    'chart_green': '#34c759',
    'chart_orange': '#ff9500',
    'chart_red': '#ff3b30',
    'chart_teal': '#5ac8fa',
    'chart_pink': '#ff2d55',
}
```

---

## PART 2: REDESIGNED VISUALIZATION FUNCTIONS

```python
# =========================================================
# APPLE-INSPIRED VISUALIZATION FUNCTIONS
# =========================================================

def create_revenue_trend_chart_apple(df):
    """Apple-inspired daily revenue trend with glassmorphism effect."""
    if df.empty:
        return go.Figure()
    
    daily_sales = df.groupby('date').agg({
        'revenue': 'sum',
        'quantity': 'sum'
    }).reset_index()
    
    daily_sales['ma7'] = daily_sales['revenue'].rolling(window=7, min_periods=1).mean()
    daily_sales['ma30'] = daily_sales['revenue'].rolling(window=30, min_periods=1).mean()
    
    fig = go.Figure()
    
    # Area chart for daily revenue (glassmorphism effect)
    fig.add_trace(go.Scatter(
        x=daily_sales['date'],
        y=daily_sales['revenue'],
        fill='tozeroy',
        mode='lines',
        name='Daily Revenue',
        line=dict(color='#007aff', width=2),
        fillcolor='rgba(0, 122, 255, 0.1)',
        hovertemplate='<b>%{x|%B %d, %Y}</b><br>Revenue: $%{y:,.0f}<extra></extra>'
    ))
    
    # 7-day moving average (smooth line)
    fig.add_trace(go.Scatter(
        x=daily_sales['date'],
        y=daily_sales['ma7'],
        name='7-Day Average',
        line=dict(color='#34c759', width=3, dash='dash'),
        hovertemplate='<b>%{x|%B %d, %Y}</b><br>7-Day Avg: $%{y:,.0f}<extra></extra>'
    ))
    
    # 30-day moving average (trend line)
    fig.add_trace(go.Scatter(
        x=daily_sales['date'],
        y=daily_sales['ma30'],
        name='30-Day Trend',
        line=dict(color='#ff9500', width=2, dash='dot'),
        hovertemplate='<b>%{x|%B %d, %Y}</b><br>30-Day Trend: $%{y:,.0f}<extra></extra>'
    ))
    
    fig.update_layout(
        title=dict(
            text="<b>Revenue Trend</b>",
            font=dict(size=24, color='#ffffff', family='SF Pro Display'),
            x=0.5
        ),
        xaxis=dict(
            title="",
            gridcolor='rgba(255, 255, 255, 0.1)',
            gridwidth=1,
            showgrid=True,
            color='#8e8e93',
            tickfont=dict(color='#8e8e93', size=11)
        ),
        yaxis=dict(
            title="",
            gridcolor='rgba(255, 255, 255, 0.1)',
            gridwidth=1,
            showgrid=True,
            color='#8e8e93',
            tickfont=dict(color='#8e8e93', size=11),
            tickformat='$,.0f'
        ),
        plot_bgcolor='#000000',
        paper_bgcolor='#000000',
        font=dict(color='#ffffff', family='SF Pro Display'),
        hovermode='x unified',
        showlegend=True,
        legend=dict(
            bgcolor='rgba(28, 28, 30, 0.8)',
            bordercolor='rgba(255, 255, 255, 0.1)',
            borderwidth=1,
            font=dict(color='#ebebf5', size=11),
            x=0.02,
            y=0.98
        ),
        margin=dict(l=0, r=0, t=60, b=0),
        height=400
    )
    
    return fig


def create_top_items_chart_apple(df, top_n=15):
    """Apple-inspired horizontal bar chart with gradient fills."""
    if df.empty:
        return go.Figure()
    
    top_items = (
        df.groupby('item')['revenue']
        .sum()
        .nlargest(top_n)
        .reset_index()
        .sort_values('revenue')
    )
    
    # Create gradient colors
    colors = []
    for i in range(len(top_items)):
        ratio = i / len(top_items)
        if ratio < 0.33:
            colors.append('#007aff')  # Blue
        elif ratio < 0.66:
            colors.append('#5856d6')  # Purple
        else:
            colors.append('#34c759')  # Green
    
    fig = go.Figure()
    
    fig.add_trace(go.Bar(
        x=top_items['revenue'],
        y=top_items['item'],
        orientation='h',
        marker=dict(
            color=colors,
            line=dict(color='rgba(255, 255, 255, 0.1)', width=1)
        ),
        hovertemplate='<b>%{y}</b><br>Revenue: $%{x:,.0f}<extra></extra>',
        text=[f"${x:,.0f}" for x in top_items['revenue']],
        textposition='outside',
        textfont=dict(color='#ebebf5', size=10)
    ))
    
    fig.update_layout(
        title=dict(
            text=f"<b>Top {top_n} Menu Items</b>",
            font=dict(size=24, color='#ffffff', family='SF Pro Display'),
            x=0.5
        ),
        xaxis=dict(
            title="",
            gridcolor='rgba(255, 255, 255, 0.1)',
            showgrid=True,
            color='#8e8e93',
            tickfont=dict(color='#8e8e93', size=11),
            tickformat='$,.0f'
        ),
        yaxis=dict(
            title="",
            color='#8e8e93',
            tickfont=dict(color='#ebebf5', size=11)
        ),
        plot_bgcolor='#000000',
        paper_bgcolor='#000000',
        font=dict(color='#ffffff', family='SF Pro Display'),
        margin=dict(l=0, r=0, t=60, b=0),
        height=500
    )
    
    return fig


def create_hourly_heatmap_apple(df):
    """Apple-inspired heatmap with modern color scale."""
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
        labels=dict(x="Day of Week", y="Hour", color="Revenue"),
        x=pivot.columns,
        y=pivot.index,
        color_continuous_scale=[
            [0, '#000000'],
            [0.2, '#1d1d1f'],
            [0.4, '#007aff'],
            [0.6, '#5856d6'],
            [0.8, '#34c759'],
            [1, '#ff9500']
        ],
        aspect="auto"
    )
    
    fig.update_layout(
        title=dict(
            text="<b>Revenue Heatmap</b>",
            font=dict(size=24, color='#ffffff', family='SF Pro Display'),
            x=0.5
        ),
        plot_bgcolor='#000000',
        paper_bgcolor='#000000',
        font=dict(color='#ffffff', family='SF Pro Display'),
        xaxis=dict(color='#8e8e93', tickfont=dict(color='#ebebf5')),
        yaxis=dict(color='#8e8e93', tickfont=dict(color='#ebebf5')),
        coloraxis_colorbar=dict(
            title="Revenue ($)",
            titlefont=dict(color='#ebebf5', size=11),
            tickfont=dict(color='#8e8e93', size=10)
        ),
        margin=dict(l=0, r=0, t=60, b=0),
        height=400
    )
    
    return fig


def create_category_pie_chart_apple(df):
    """Apple-inspired donut chart with modern styling."""
    if df.empty:
        return go.Figure()
    
    category_sales = (
        df.groupby('category')['revenue']
        .sum()
        .reset_index()
        .sort_values('revenue', ascending=False)
    )
    
    # Apple color palette
    apple_colors = ['#007aff', '#5856d6', '#34c759', '#ff9500', '#ff3b30', '#5ac8fa', '#ff2d55']
    
    fig = px.pie(
        category_sales,
        values='revenue',
        names='category',
        hole=0.6,
        color_discrete_sequence=apple_colors
    )
    
    fig.update_traces(
        textposition='inside',
        textinfo='percent+label',
        textfont=dict(color='#ffffff', size=12, family='SF Pro Display'),
        hovertemplate='<b>%{label}</b><br>Revenue: $%{value:,.0f}<br>Percentage: %{percent}<extra></extra>',
        marker=dict(line=dict(color='#000000', width=2))
    )
    
    fig.update_layout(
        title=dict(
            text="<b>Revenue by Category</b>",
            font=dict(size=24, color='#ffffff', family='SF Pro Display'),
            x=0.5
        ),
        plot_bgcolor='#000000',
        paper_bgcolor='#000000',
        font=dict(color='#ffffff', family='SF Pro Display'),
        showlegend=True,
        legend=dict(
            bgcolor='rgba(28, 28, 30, 0.8)',
            bordercolor='rgba(255, 255, 255, 0.1)',
            borderwidth=1,
            font=dict(color='#ebebf5', size=11),
            x=1.05,
            y=0.5
        ),
        margin=dict(l=0, r=150, t=60, b=0),
        height=400
    )
    
    return fig


def create_meal_period_chart_apple(df):
    """Apple-inspired bar chart with gradient bars."""
    if df.empty:
        return go.Figure()
    
    meal_sales = (
        df.groupby('meal_period')['revenue']
        .sum()
        .reset_index()
    )
    
    period_order = ['Breakfast', 'Lunch', 'Afternoon', 'Dinner', 'Late Night']
    meal_sales['meal_period'] = pd.Categorical(
        meal_sales['meal_period'],
        categories=period_order,
        ordered=True
    )
    meal_sales = meal_sales.sort_values('meal_period')
    
    # Gradient colors for each period
    period_colors = {
        'Breakfast': '#ff9500',
        'Lunch': '#34c759',
        'Afternoon': '#5ac8fa',
        'Dinner': '#5856d6',
        'Late Night': '#007aff'
    }
    
    colors = [period_colors.get(period, '#8e8e93') for period in meal_sales['meal_period']]
    
    fig = go.Figure()
    
    fig.add_trace(go.Bar(
        x=meal_sales['meal_period'],
        y=meal_sales['revenue'],
        marker=dict(
            color=colors,
            line=dict(color='rgba(255, 255, 255, 0.1)', width=1)
        ),
        text=[f"${x:,.0f}" for x in meal_sales['revenue']],
        textposition='outside',
        textfont=dict(color='#ebebf5', size=11),
        hovertemplate='<b>%{x}</b><br>Revenue: $%{y:,.0f}<extra></extra>'
    ))
    
    fig.update_layout(
        title=dict(
            text="<b>Revenue by Meal Period</b>",
            font=dict(size=24, color='#ffffff', family='SF Pro Display'),
            x=0.5
        ),
        xaxis=dict(
            title="",
            color='#8e8e93',
            tickfont=dict(color='#ebebf5', size=11)
        ),
        yaxis=dict(
            title="",
            gridcolor='rgba(255, 255, 255, 0.1)',
            showgrid=True,
            color='#8e8e93',
            tickfont=dict(color='#8e8e93', size=11),
            tickformat='$,.0f'
        ),
        plot_bgcolor='#000000',
        paper_bgcolor='#000000',
        font=dict(color='#ffffff', family='SF Pro Display'),
        margin=dict(l=0, r=0, t=60, b=0),
        height=400
    )
    
    return fig


def create_weekday_weekend_comparison_apple(df):
    """Apple-inspired comparison chart."""
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
        specs=[[{'type': 'bar'}, {'type': 'bar'}]],
        horizontal_spacing=0.15
    )
    
    # Total Revenue
    fig.add_trace(
        go.Bar(
            x=comparison['day_type'],
            y=comparison['revenue'],
            name='Revenue',
            marker_color=['#007aff', '#5856d6'],
            showlegend=False,
            text=[f"${x:,.0f}" for x in comparison['revenue']],
            textposition='outside',
            textfont=dict(color='#ebebf5', size=11),
            hovertemplate='<b>%{x}</b><br>Revenue: $%{y:,.0f}<extra></extra>'
        ),
        row=1, col=1
    )
    
    # Avg Price
    fig.add_trace(
        go.Bar(
            x=comparison['day_type'],
            y=comparison['avg_revenue_per_item'],
            name='Avg Price',
            marker_color=['#34c759', '#ff9500'],
            showlegend=False,
            text=[f"${x:.2f}" for x in comparison['avg_revenue_per_item']],
            textposition='outside',
            textfont=dict(color='#ebebf5', size=11),
            hovertemplate='<b>%{x}</b><br>Avg: $%{y:.2f}<extra></extra>'
        ),
        row=1, col=2
    )
    
    fig.update_layout(
        title_text="<b>Weekday vs Weekend</b>",
        title_font=dict(size=24, color='#ffffff', family='SF Pro Display'),
        plot_bgcolor='#000000',
        paper_bgcolor='#000000',
        font=dict(color='#ffffff', family='SF Pro Display'),
        height=400,
        margin=dict(l=0, r=0, t=80, b=0)
    )
    
    fig.update_xaxes(
        color='#8e8e93',
        tickfont=dict(color='#ebebf5', size=11),
        gridcolor='rgba(255, 255, 255, 0.1)'
    )
    
    fig.update_yaxes(
        color='#8e8e93',
        tickfont=dict(color='#8e8e93', size=11),
        gridcolor='rgba(255, 255, 255, 0.1)',
        tickformat='$,.0f'
    )
    
    return fig
```

---

## PART 3: EMPLOYEE PERFORMANCE ANALYTICS

```python
# =========================================================
# EMPLOYEE PERFORMANCE & HUSTLE ANALYTICS
# =========================================================

def analyze_employee_performance(data: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    """
    Comprehensive employee performance analysis.
    Combines sales, labor, waste, and efficiency metrics.
    """
    sales = data['sales']
    labor = data['labor']
    voids = data['voids']
    removed = data['removed']
    discounts = data['discounts']
    
    if sales.empty:
        return pd.DataFrame()
    
    # Find columns
    server_col = find_column_fuzzy(sales, ['Server', 'server'])
    revenue_col = find_column_fuzzy(sales, ['Net Price', 'net_price', 'Total Price', 'total_price'])
    check_id_col = find_column_fuzzy(sales, ['Check Id', 'check_id'])
    
    if not server_col or not revenue_col:
        return pd.DataFrame()
    
    # Sales performance
    sales_perf = sales.groupby(server_col).agg({
        revenue_col: ['sum', 'mean', 'count'],
        check_id_col: 'nunique' if check_id_col else revenue_col: 'count'
    }).reset_index()
    
    sales_perf.columns = ['Server', 'Total_Revenue', 'Avg_Check_Value', 'Total_Items', 'Total_Checks']
    sales_perf['Revenue_per_Hour'] = 0  # Will calculate with labor data
    
    # Waste metrics
    waste_df = analyze_waste_efficiency(data)
    if not waste_df.empty:
        sales_perf = sales_perf.merge(
            waste_df[['Server', 'Waste_Rate_Pct', 'Status']],
            on='Server',
            how='left'
        )
    else:
        sales_perf['Waste_Rate_Pct'] = 0
        sales_perf['Status'] = 'Unknown'
    
    # Bottle conversion
    bottle_df, _ = analyze_bottle_conversion(data)
    if not bottle_df.empty:
        sales_perf = sales_perf.merge(
            bottle_df[['Server', 'Conversion_Rate']],
            on='Server',
            how='left'
        )
    else:
        sales_perf['Conversion_Rate'] = 0
    
    # Food attachment
    attachment_df, _ = analyze_food_attachment(data)
    if not attachment_df.empty:
        sales_perf = sales_perf.merge(
            attachment_df[['Server', 'Attachment_Rate']],
            on='Server',
            how='left'
        )
    else:
        sales_perf['Attachment_Rate'] = 0
    
    # Discount analysis
    discount_df, _, _ = analyze_discount_integrity(data)
    if not discount_df.empty:
        sales_perf = sales_perf.merge(
            discount_df[['Server', 'Total_Discounts', 'Discount_Count']],
            on='Server',
            how='left'
        )
        sales_perf['Discount_Rate'] = (sales_perf['Total_Discounts'] / sales_perf['Total_Revenue']) * 100
    else:
        sales_perf['Total_Discounts'] = 0
        sales_perf['Discount_Count'] = 0
        sales_perf['Discount_Rate'] = 0
    
    # Labor data integration
    if not labor.empty:
        employee_col = find_column_fuzzy(labor, ['Employee', 'employee'])
        net_sales_col = find_column_fuzzy(labor, ['Net Sales', 'net_sales'])
        total_pay_col = find_column_fuzzy(labor, ['Total Pay', 'total_pay'])
        regular_hours_col = find_column_fuzzy(labor, ['Regular Hours', 'regular_hours'])
        
        if all([employee_col, net_sales_col, total_pay_col]):
            labor_perf = labor[[employee_col, net_sales_col, total_pay_col]].copy()
            labor_perf.columns = ['Employee', 'Labor_Net_Sales', 'Total_Pay']
            
            # Match employee names (labor uses "LastName, FirstName", sales uses "FirstName LastName")
            # Simple matching - will need refinement
            for idx, row in sales_perf.iterrows():
                server_name = row['Server']
                # Try to find matching labor record
                for lab_idx, lab_row in labor_perf.iterrows():
                    employee_name = lab_row['Employee']
                    if ',' in employee_name:
                        last, first = employee_name.split(',')
                        if first.strip() in server_name or last.strip() in server_name:
                            sales_perf.at[idx, 'Labor_Net_Sales'] = lab_row['Labor_Net_Sales']
                            sales_perf.at[idx, 'Total_Pay'] = lab_row['Total_Pay']
                            if regular_hours_col:
                                sales_perf.at[idx, 'Hours_Worked'] = labor.at[lab_idx, regular_hours_col]
                            break
    
    # Calculate Hustle Score (composite metric)
    # Higher is better: Revenue + Efficiency - Waste - Discounts
    sales_perf['Hustle_Score'] = (
        (sales_perf['Total_Revenue'] / 1000) +  # Revenue component
        (sales_perf['Conversion_Rate'] * 10) +  # Bottle conversion
        (sales_perf['Attachment_Rate'] * 5) -  # Food attachment
        (sales_perf['Waste_Rate_Pct'] * 2) -  # Waste penalty
        (sales_perf['Discount_Rate'] * 3)  # Discount penalty
    ).fillna(0)
    
    # Performance Tier
    def classify_performance(score):
        if score >= 200:
            return 'Elite'
        elif score >= 150:
            return 'Top Performer'
        elif score >= 100:
            return 'Strong'
        elif score >= 50:
            return 'Average'
        else:
            return 'Needs Improvement'
    
    sales_perf['Performance_Tier'] = sales_perf['Hustle_Score'].apply(classify_performance)
    
    # Efficiency metrics
    if 'Hours_Worked' in sales_perf.columns:
        sales_perf['Revenue_per_Hour'] = sales_perf['Total_Revenue'] / sales_perf['Hours_Worked'].fillna(1)
        sales_perf['ROI'] = (sales_perf['Total_Revenue'] - sales_perf['Total_Discounts']) / sales_perf['Total_Pay'].fillna(1)
    
    return sales_perf.sort_values('Hustle_Score', ascending=False)


def create_employee_performance_chart_apple(employee_df):
    """Apple-inspired employee performance visualization."""
    if employee_df.empty:
        return go.Figure()
    
    # Top 20 employees
    top_employees = employee_df.head(20).copy()
    
    fig = go.Figure()
    
    # Hustle Score bars
    fig.add_trace(go.Bar(
        x=top_employees['Server'],
        y=top_employees['Hustle_Score'],
        name='Hustle Score',
        marker=dict(
            color=top_employees['Hustle_Score'],
            colorscale=[
                [0, '#ff3b30'],
                [0.3, '#ff9500'],
                [0.6, '#34c759'],
                [1, '#007aff']
            ],
            showscale=True,
            colorbar=dict(
                title="Hustle Score",
                titlefont=dict(color='#ebebf5', size=11),
                tickfont=dict(color='#8e8e93', size=10)
            ),
            line=dict(color='rgba(255, 255, 255, 0.1)', width=1)
        ),
        text=[f"{x:.0f}" for x in top_employees['Hustle_Score']],
        textposition='outside',
        textfont=dict(color='#ebebf5', size=10),
        hovertemplate='<b>%{x}</b><br>Hustle Score: %{y:.0f}<br>Tier: %{customdata}<extra></extra>',
        customdata=top_employees['Performance_Tier']
    ))
    
    fig.update_layout(
        title=dict(
            text="<b>Employee Performance - Hustle Score</b>",
            font=dict(size=24, color='#ffffff', family='SF Pro Display'),
            x=0.5
        ),
        xaxis=dict(
            title="",
            color='#8e8e93',
            tickfont=dict(color='#ebebf5', size=10),
            tickangle=-45
        ),
        yaxis=dict(
            title="",
            gridcolor='rgba(255, 255, 255, 0.1)',
            showgrid=True,
            color='#8e8e93',
            tickfont=dict(color='#8e8e93', size=11)
        ),
        plot_bgcolor='#000000',
        paper_bgcolor='#000000',
        font=dict(color='#ffffff', family='SF Pro Display'),
        margin=dict(l=0, r=0, t=60, b=100),
        height=500
    )
    
    return fig


def create_employee_radar_chart_apple(employee_df, server_name):
    """Apple-inspired radar chart for individual employee performance."""
    if employee_df.empty:
        return go.Figure()
    
    employee = employee_df[employee_df['Server'] == server_name]
    if employee.empty:
        return go.Figure()
    
    emp = employee.iloc[0]
    
    categories = ['Revenue', 'Efficiency', 'Bottle Sales', 'Food Upsell', 'Waste Control']
    values = [
        min(emp.get('Total_Revenue', 0) / 100000, 1) * 100,  # Normalized to 0-100
        min(emp.get('Revenue_per_Hour', 0) / 1000, 1) * 100,
        min(emp.get('Conversion_Rate', 0) / 30, 1) * 100,
        min(emp.get('Attachment_Rate', 0) / 50, 1) * 100,
        max(0, 100 - emp.get('Waste_Rate_Pct', 0) * 5)  # Inverted (lower waste = higher score)
    ]
    
    fig = go.Figure()
    
    fig.add_trace(go.Scatterpolar(
        r=values,
        theta=categories,
        fill='toself',
        name=server_name,
        line=dict(color='#007aff', width=3),
        fillcolor='rgba(0, 122, 255, 0.2)',
        marker=dict(size=8, color='#007aff')
    ))
    
    fig.update_layout(
        polar=dict(
            radialaxis=dict(
                visible=True,
                range=[0, 100],
                gridcolor='rgba(255, 255, 255, 0.1)',
                tickfont=dict(color='#8e8e93', size=10)
            ),
            angularaxis=dict(
                gridcolor='rgba(255, 255, 255, 0.1)',
                tickfont=dict(color='#ebebf5', size=11)
            ),
            bgcolor='#000000'
        ),
        title=dict(
            text=f"<b>{server_name} - Performance Profile</b>",
            font=dict(size=24, color='#ffffff', family='SF Pro Display'),
            x=0.5
        ),
        plot_bgcolor='#000000',
        paper_bgcolor='#000000',
        font=dict(color='#ffffff', family='SF Pro Display'),
        height=500
    )
    
    return fig
```

---

## PART 4: UPDATED CSS STYLING - APPLE INSPIRED

```python
# Add this to the st.markdown() styling section:

st.markdown("""
<style>
    /* Apple-Inspired Global Styling */
    .stApp {
        background: #000000;
        color: #ffffff;
    }
    
    /* Main Title */
    h1 {
        color: #ffffff;
        font-weight: 700;
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
        letter-spacing: -0.5px;
        font-size: 3rem;
    }
    
    h2, h3 {
        color: #ebebf5;
        font-weight: 600;
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    /* Metric Cards - Glassmorphism */
    div[data-testid="stMetricValue"] {
        font-size: 2.5rem;
        font-weight: 700;
        color: #007aff;
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    div[data-testid="stMetricLabel"] {
        color: #8e8e93;
        font-weight: 500;
        font-size: 0.9rem;
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    div[data-testid="stMetricDelta"] {
        color: #34c759;
        font-weight: 600;
    }
    
    /* Sidebar Styling */
    section[data-testid="stSidebar"] {
        background: #1c1c1e;
        border-right: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    section[data-testid="stSidebar"] h2 {
        color: #007aff;
    }
    
    /* Button Styling - Apple Design */
    .stButton>button {
        background: linear-gradient(135deg, #007aff 0%, #5856d6 100%);
        color: #ffffff;
        border: none;
        border-radius: 12px;
        font-weight: 600;
        padding: 0.75rem 2rem;
        transition: all 0.3s ease;
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
        box-shadow: 0 4px 14px rgba(0, 122, 255, 0.3);
    }
    
    .stButton>button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 122, 255, 0.4);
        background: linear-gradient(135deg, #0051d5 0%, #4a48c4 100%);
    }
    
    /* Input Fields */
    .stTextInput>div>div>input {
        background: #1c1c1e;
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    /* Tabs */
    .stTabs [data-baseweb="tab-list"] {
        background: #1c1c1e;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .stTabs [data-baseweb="tab"] {
        color: #8e8e93;
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    .stTabs [aria-selected="true"] {
        color: #007aff;
        border-bottom: 2px solid #007aff;
    }
    
    /* DataFrames */
    .dataframe {
        background: #1c1c1e;
        color: #ebebf5;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
</style>
""", unsafe_allow_html=True)
```

---

## PART 5: INTEGRATION INTO MAIN APP

Replace the existing visualization functions and add employee analytics section:

```python
# In main() function, replace visualization calls:

# OLD:
# st.plotly_chart(create_revenue_trend_chart(df_filtered), use_container_width=True)

# NEW:
st.plotly_chart(create_revenue_trend_chart_apple(df_filtered), use_container_width=True)

# Add Employee Performance Section:
st.markdown("---")
st.markdown("## 👥 Employee Performance & Hustle Analytics")

# Run employee analysis
if st.button("📊 Analyze Employee Performance", use_container_width=True, type="primary"):
    with st.spinner("Analyzing employee performance..."):
        data = load_all_data(client, BUCKET, CLIENT_FOLDER)
        employee_perf = analyze_employee_performance(data)
        st.session_state['employee_perf'] = employee_perf

if 'employee_perf' in st.session_state:
    emp_df = st.session_state['employee_perf']
    
    # Performance overview
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Top Performer", emp_df.iloc[0]['Server'] if not emp_df.empty else "N/A")
    with col2:
        st.metric("Avg Hustle Score", f"{emp_df['Hustle_Score'].mean():.0f}" if not emp_df.empty else "0")
    with col3:
        elite_count = len(emp_df[emp_df['Performance_Tier'] == 'Elite']) if not emp_df.empty else 0
        st.metric("Elite Performers", elite_count)
    with col4:
        st.metric("Total Employees", len(emp_df) if not emp_df.empty else 0)
    
    # Charts
    st.plotly_chart(create_employee_performance_chart_apple(emp_df), use_container_width=True)
    
    # Individual employee selector
    selected_employee = st.selectbox("Select Employee for Detailed View", emp_df['Server'].tolist())
    if selected_employee:
        st.plotly_chart(create_employee_radar_chart_apple(emp_df, selected_employee), use_container_width=True)
    
    # Data table
    with st.expander("📋 Full Employee Performance Data"):
        st.dataframe(emp_df, use_container_width=True)
```

---

## PART 6: COMPLETE FILE STRUCTURE

This file contains all the code needed. To integrate:

1. **Replace visualization functions** in `app.py` with the `_apple` versions
2. **Add employee analytics functions** from Part 3
3. **Update CSS styling** with Part 4
4. **Add employee section** to main() function from Part 5
5. **Update color scheme** throughout to use Apple colors

---

## NEXT STEPS FOR CURSOR AI

1. Replace all `create_*_chart()` functions with `create_*_chart_apple()` versions
2. Add `analyze_employee_performance()` function
3. Update CSS to Apple-inspired dark theme
4. Add employee performance section to dashboard
5. Test and verify all charts render correctly

---

**All code is ready for Cursor AI integration!**

