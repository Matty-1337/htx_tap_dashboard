# Dashboard Enhancement Plan
## From HTML Report → Live Portal

### Current Dashboard State
✅ **Working:**
- 4 Hero Metric Cards (Revenue, Leakage, Alerts, Opportunity)
- Revenue Heatmap (fixed, starts at 3AM)
- Server Grade Donut
- Top Performers Card
- Needs Attention Card
- This Week's Actions panel

❌ **Missing/Empty:**
- Golden Hours highlight box (10PM-1AM revenue)
- Leakage breakdown (Void + Removal + Discount)
- Better metric card styling (colored borders)
- More detailed action items
- Golden Hours percentage calculation
- Orders count in metrics

---

## 📊 Dashboard Enhancements Needed

### 1. **Backend: Add Missing KPIs**

#### A. Leakage Calculation
```python
# In _compute_kpis():
Leakage = Void $ + Removal $ + Discount $
Leakage % = (Leakage / Revenue) * 100
```

#### B. Golden Hours Calculation
```python
# New function: _compute_golden_hours()
# Aggregate revenue for hours 22 (10PM), 23 (11PM), 0 (12AM), 1 (1AM)
# Return: { revenue, percentage, orders, hours: "10PM-1AM" }
```

#### C. Orders Count
```python
# Already calculated as "Transactions" - ensure it's exposed
```

---

### 2. **Frontend: New Components**

#### A. GoldenHoursBox Component
**Location:** `web/components/dashboard/GoldenHoursBox.tsx`

**Props:**
- `revenue: number` - Total golden hours revenue
- `percentage: number` - % of total revenue
- `orders: number` - Number of orders
- `hours: string` - "10PM-1AM"

**Design:**
- Large centered box with gradient background
- Gold accent border
- Big time display (e.g., "10:00 PM — 1:00 AM")
- Three stat cards: Revenue, Percentage, Orders
- Insight text below

#### B. Enhanced MetricCard Component
**Location:** `web/components/dashboard/MetricCard.tsx` (or enhance HeroMetricCard)

**Add:**
- Colored top border (green/gold/red/orange)
- Better empty state handling
- More detailed trend information

---

### 3. **Dashboard Page Updates**

#### Section 1: Hero Metrics (4 cards)
**Current:** Basic cards
**Enhance:**
- Add colored top borders based on metric type
- Revenue: Green border
- Leakage: Red border (if high) / Orange (if medium)
- Alerts: Orange border
- Opportunity: Gold border
- Ensure ALL cards have data (no empty states)

#### Section 2: Golden Hours Highlight
**NEW:** Add between hero metrics and server grade
- Large, prominent box
- Shows peak revenue window
- Only display if golden hours data exists

#### Section 3: Server Grade + Actions
**Current:** Working but could be enhanced
**Enhance:**
- Better empty state for actions
- More detailed action items with priority badges

#### Section 4: Revenue Heatmap
**Current:** ✅ Working
**Enhance:**
- Add insight box below (like HTML report)
- Show strategic insights

#### Section 5: Top Performers + Needs Attention
**Current:** Working
**Enhance:**
- Ensure data always populates
- Better visual hierarchy

---

## 🎯 Implementation Order

### Phase 1: Backend (Python)
1. ✅ Add Leakage calculation to `_compute_kpis()`
2. ✅ Add Golden Hours calculation function
3. ✅ Add Golden Hours to KPIs or separate field
4. ✅ Test with real data

### Phase 2: Frontend Components
1. ✅ Create `GoldenHoursBox.tsx`
2. ✅ Enhance `HeroMetricCard.tsx` with colored borders
3. ✅ Create `InsightBox.tsx` (reusable)
4. ✅ Update metric cards to use new styling

### Phase 3: Dashboard Integration
1. ✅ Add Golden Hours box to dashboard
2. ✅ Update all metric cards with colored borders
3. ✅ Add insight boxes where appropriate
4. ✅ Ensure all data populates (no empty states)
5. ✅ Test and polish

---

## 📋 Data Flow

### Backend → Frontend
```
KPIs:
  - Revenue ✅
  - Leakage ✅ (needs calculation)
  - Void $ ✅
  - Removal $ ✅
  - Discount $ ✅
  - Transactions ✅
  - Golden Hours Revenue (NEW)
  - Golden Hours % (NEW)
  - Golden Hours Orders (NEW)

Charts:
  - hourly_revenue ✅
  - day_of_week ✅
  - revenue_heatmap ✅

Tables:
  - employee_performance ✅
  - menu_volatility ✅
  - waste_efficiency ✅
```

---

## 🎨 Design System Integration

### Colors (HTML → Portal)
- HTML Green (`#00d4aa`) → Portal Purple/Indigo
- HTML Gold (`#ffd700`) → Portal Gold
- HTML Red (`#ff4757`) → Portal Red
- HTML Orange (`#ff9f43`) → Portal Orange

### Components to Reuse
- `premium-card` - Already exists
- Glass morphism effects - Already exists
- Gradient backgrounds - Already exists

---

## ✅ Success Criteria

1. **All metric cards have data** (no empty states)
2. **Golden Hours box displays prominently**
3. **Leakage calculation is accurate**
4. **All visualizations "pop" with proper styling**
5. **No broken or empty sections**
6. **Data flows correctly from backend**

---

## 🚀 Next Steps

1. Start with backend: Add Leakage and Golden Hours calculations
2. Create GoldenHoursBox component
3. Enhance dashboard page with new components
4. Test with real data
5. Polish and iterate
