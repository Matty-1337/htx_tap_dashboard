# Step 0 — Baseline Map & Architecture Review

**Date:** 2025-01-27  
**Purpose:** READ-ONLY mapping of current dashboard architecture before Phase 1 implementation

---

## 1. Specification Document Status

**Finding:** The authoritative specification document ("HTX TAP Analytics Platform – Complete Technical & Product Specification") was **NOT FOUND** in the repository.

**Searched locations:**
- Root directory markdown files
- `web/` directory
- Recursive search for `*spec*.md`, `*SPEC*.md`, `*specification*.md`
- Codebase semantic search

**Available documentation:**
- `DASHBOARD_AUDIT_REPORT.md` (just created) — contains gap analysis based on implementation review
- `web/BRAND_DESIGN_SYSTEM.md` — client theming specifications
- Various deployment/setup docs in root

**Action:** Proceeding with implementation based on `DASHBOARD_AUDIT_REPORT.md` gap analysis, which identifies missing features from current implementation.

---

## 2. Dashboard Route & Structure

### Main Dashboard File
- **Path:** `web/app/dashboard/page.tsx`
- **Type:** Client Component (`'use client'`)
- **Route:** `/dashboard`
- **Layout:** Single-page experience with section-based navigation

### Section Structure
- **Navigation:** Left sidebar (`aside` with `w-64`, sticky)
- **Sections:** 4 sections defined in `NAV_SECTIONS` constant:
  ```typescript
  const NAV_SECTIONS = [
    { id: 'overview', label: 'Overview' },
    { id: 'waste', label: 'Waste' },
    { id: 'team', label: 'Team' },
    { id: 'menu', label: 'Menu' },
  ]
  ```
- **Section Component:** `web/components/dashboard/Section.tsx`
  - Wraps each section with `id`, `title`, and `ref` for scrollspy
  - Uses Framer Motion for scroll animations

### Active Section Tracking
- **Mechanism:** `IntersectionObserver` API
- **State:** `activeSection` (string: 'overview' | 'waste' | 'team' | 'menu')
- **Refs:** `sectionRefs.current` (Record<string, HTMLElement>)
- **Scroll function:** `scrollToSection(id)` — smooth scroll to section

---

## 3. Data Flow & API Structure

### Data Fetching
- **Primary Route:** `web/app/api/run/route.ts` (POST)
- **Flow:**
  1. Verifies session cookie (JWT with `clientId`)
  2. Forwards to Railway backend: `POST {API_BASE_URL}/run`
  3. Request body: `{ clientId: string, params: {} }`
  4. Returns analysis payload

### Analysis Data Structure
**Type Definition (from `page.tsx`):**
```typescript
interface AnalysisData {
  clientId?: string
  folder?: string
  generatedAt?: string
  kpis?: Record<string, number>
  charts?: {
    hourly_revenue?: Array<any>
    day_of_week?: Array<any>
  }
  tables?: {
    waste_efficiency?: { data: any[]; columns?: string[] }
    employee_performance?: { data: any[]; columns?: string[] }
    menu_volatility?: { data: any[]; columns?: string[] }
    [key: string]: any
  }
  executionTimeSeconds?: number
  [key: string]: any
}
```

### Data Storage
- **State:** `const [data, setData] = useState<AnalysisData | null>(null)`
- **Loading:** `const [loading, setLoading] = useState(true)`
- **Fetch:** `fetchAnalysis()` called on mount and via "Run Analysis" button

### Derived Data Processing
- **Location:** `web/lib/data-utils.ts`
- **Functions:**
  - `getStatusBreakdown(data)` — status distribution from employee data
  - `getTopWasteServers(data, limit)` — top N servers by waste
  - `filterData(data, filters)` — applies server/status/category filters
  - `calculateKpiFromData(data, kpiKey)` — calculates filtered KPIs
  - `findColumn(data, patterns)` — auto-detects column names

---

## 4. Filter System

### Filter State
**Type:**
```typescript
type Filters = {
  selectedServer?: string
  selectedStatus?: string
  selectedCategory?: string
}
```

**State:** `const [filters, setFilters] = useState<Filters>({})`

### Filter Application
- **Scope:** Applied to all sections (waste, team, menu tables)
- **Functions:**
  - `handleSetFilter(key, value)` — sets filter
  - `handleRemoveFilter(key)` — removes filter
  - `handleClearFilters()` — clears all
  - `handleRowClick(row)` — extracts server/status/category from row and toggles filter

### Filtered Data
- **Waste:** `filteredWasteData = filterData(wasteData, filters)`
- **Team:** `filteredEmployeeData = filterData(employeeData, filters)`
- **Menu:** `filteredMenuData = filterData(menuData, filters)`
- **KPIs:** `calculateFilteredKpi(key)` — recalculates KPIs from filtered data

### Filter Display
- **Component:** `web/components/dashboard/ActiveFilters.tsx`
- **Location:** Overview section, below Interactive Insights
- **Shows:** Active filter pills with remove buttons + "Clear all"

---

## 5. Existing Chart Components

### Chart Library
- **Library:** Recharts (`recharts` package)
- **Components:** All charts use `ResponsiveContainer` wrapper

### Available Chart Components

#### 1. TrendLineChart
- **Path:** `web/components/dashboard/charts/TrendLineChart.tsx`
- **Type:** Line chart
- **Props:**
  - `data: any[]`
  - `xKey: string`
  - `yKey: string`
  - `title?: string`
  - `subtitle?: string`
  - `selectedValue?: string | number`
  - `onPointClick?: (value: string | number) => void`
- **Usage:** Currently used for "Revenue by Hour" (`xKey="Hour"`, `yKey="Net Price"`)

#### 2. BreakdownBarChart
- **Path:** `web/components/dashboard/charts/BreakdownBarChart.tsx`
- **Type:** Horizontal bar chart
- **Props:**
  - `data: any[]`
  - `categoryKey: string`
  - `valueKey: string`
  - `title?: string`
  - `subtitle?: string`
  - `selectedCategory?: string`
  - `onBarClick?: (category: string) => void`
  - `maxItems?: number` (default: 8)
- **Usage:** Currently used for "Top Waste Servers"

#### 3. DonutStatusChart
- **Path:** `web/components/dashboard/charts/DonutStatusChart.tsx`
- **Type:** Donut/pie chart
- **Props:**
  - `data: any[]`
  - `nameKey: string`
  - `valueKey: string`
  - `title?: string`
  - `subtitle?: string`
  - `selectedStatus?: string`
  - `onSliceClick?: (status: string) => void`
- **Usage:** Currently used for "Status Distribution"

#### 4. ChartCard
- **Path:** `web/components/dashboard/charts/ChartCard.tsx`
- **Type:** Wrapper component for all charts
- **Provides:** Consistent card styling with title/subtitle

### Chart Data Sources
- **Revenue by Hour:** `data.charts.hourly_revenue` (array)
- **Revenue by Day:** `data.charts.day_of_week` (array) — **EXISTS BUT NOT RENDERED**
- **Status Breakdown:** Derived from `employee_performance` table via `getStatusBreakdown()`
- **Top Waste Servers:** Derived from `waste_efficiency` table via `getTopWasteServers()`

---

## 6. Table Components

### DataTablePreview
- **Path:** `web/components/dashboard/DataTablePreview.tsx`
- **Type:** Generic data table with auto-formatting
- **Props:**
  - `data: any[]`
  - `columns?: string[]` (optional, auto-detected if missing)
  - `title?: string`
  - `maxRows?: number` (default: 25)
  - `expandable?: boolean` (default: true)
  - `onRowClick?: (row: any) => void`
- **Features:**
  - Auto-detects columns from first row
  - Formats cells (currency, percent, numbers)
  - Expandable rows ("View more" / "Load more")
  - Row click handler for filter setting

### Table Usage
- **Waste Section:** `DataTablePreview` with `waste_efficiency` data
- **Team Section:** `DataTablePreview` with `employee_performance` data
- **Menu Section:** `DataTablePreview` with `menu_volatility` data

---

## 7. Action Rail (Already Complete)

### Component
- **Path:** `web/components/dashboard/ActionRail.tsx`
- **Position:** Right-side sticky rail (desktop only)
- **Features:** Tabs, filters, delegation, persistence (Supabase)
- **Status:** ✅ Complete — not part of Phase 1 scope

---

## 8. Utility Libraries

### UI Utilities
- **Path:** `web/lib/ui.ts`
- **Functions:**
  - `formatNumber(value)`
  - `formatCurrency(value)`
  - `formatPercent(value)`
  - `formatKpiValue(key, value)` — smart formatting based on key
  - `prettifyColumnName(name)`
  - `formatKey(key)`

### Data Utilities
- **Path:** `web/lib/data-utils.ts`
- **Functions:** (see Section 3)

### Brand Utilities
- **Path:** `web/lib/brand.ts`
- **Functions:**
  - `normalizeClientId(id)`
  - `getClientThemeAttr(clientId)` — returns `data-client-theme` value

---

## 9. Theme System

### CSS Variables
- **File:** `web/app/globals.css`
- **Variables:**
  - `--bg`, `--surface`, `--text`, `--muted`
  - `--primary`, `--secondary`, `--accent`
  - `--radius`, `--card-border`, `--glow`, `--shadow`
  - `--primary-rgb`, `--muted-rgb` (for rgba calculations)

### Client Themes
- **Melrose:** `data-client-theme="melrose"`
- **Fancy's HTX:** `data-client-theme="fancy"`
- **Best Regards:** `data-client-theme="bestregard"`

### Theme Application
- **Root:** Dashboard root `div` has `data-client-theme={themeAttr}`
- **Components:** All use CSS variables (no hardcoded colors)

---

## 10. Current Data Availability

### Charts Data
- ✅ `hourly_revenue` — exists and rendered
- ✅ `day_of_week` — **EXISTS IN PAYLOAD BUT NOT RENDERED** (Step 1 target)

### Tables Data
- ✅ `waste_efficiency.data` — full table data
- ✅ `employee_performance.data` — full table data
- ✅ `menu_volatility.data` — full table data

### KPIs Data
- ✅ `kpis` object — dynamic keys/values (first 6 displayed)

### Missing Data (to be verified)
- **Leakage by Reason:** Need to check if backend exposes this
- **Void/Discount/Removal breakdown:** Need to check if backend groups by reason
- **Category grouping:** Need to check if backend has category field
- **Daypart data:** Need to check if backend exposes daypart field
- **Menu engineering data:** Need to check if backend has profitability/popularity metrics

---

## 11. Component Reuse Strategy

### Charts
- **Reuse:** `TrendLineChart` for Revenue by Day (Step 1)
- **Reuse:** `BreakdownBarChart` for Leakage by Reason (Step 2)
- **Reuse:** `DonutStatusChart` for category breakdowns (Step 2)
- **New:** May need scatter plot for Menu Engineering Quadrant (Step 6)

### Tables
- **Reuse:** `DataTablePreview` for all table displays
- **Enhance:** Add grouping/filtering props if needed

### Cards
- **Reuse:** `GlassCard` for all card containers
- **Reuse:** `KpiCard` for KPI displays

---

## 12. Filter Extension Points

### Current Filter Type
```typescript
type Filters = {
  selectedServer?: string
  selectedStatus?: string
  selectedCategory?: string
}
```

### Planned Extensions
- **Step 3:** Add `dateRange?: { start: string; end: string }` or `dateRange?: 'week' | 'month' | 'custom'`
- **Step 7:** Add `daypart?: 'breakfast' | 'lunch' | 'dinner' | 'all'`
- **Step 7:** Add `comparisonMode?: 'none' | 'previous_period' | 'benchmark'`

### Filter Application
- **Current:** `filterData()` function in `data-utils.ts`
- **Extension:** Will need to update `filterData()` to handle new filter types
- **Backend:** May need to pass filters to Railway API if date/daypart filtering should happen server-side

---

## 13. API Extension Strategy

### Current API
- **Route:** `POST /api/run`
- **Backend:** Railway FastAPI `/run` endpoint
- **Request:** `{ clientId: string, params: {} }`
- **Response:** Full analysis payload

### Extension Approach
- **Option 1:** Extend `params` object to include filters (date range, daypart)
- **Option 2:** Keep filters client-side and filter returned data
- **Decision:** For Step 3, start with client-side filtering. If backend already supports date filtering, extend `params` later.

---

## 14. File Structure Summary

### Dashboard Files
```
web/app/dashboard/page.tsx          # Main dashboard (709 lines)
web/components/dashboard/
  ├── Section.tsx                   # Section wrapper
  ├── KpiCard.tsx                   # KPI display
  ├── GlassCard.tsx                 # Card container
  ├── DataTablePreview.tsx          # Generic table
  ├── ActiveFilters.tsx             # Filter pills
  ├── ActionRail.tsx                # Right rail (complete)
  ├── PillBadge.tsx                # Badge component
  ├── SkeletonCard.tsx             # Loading states
  └── charts/
      ├── ChartCard.tsx             # Chart wrapper
      ├── TrendLineChart.tsx        # Line chart
      ├── BreakdownBarChart.tsx     # Bar chart
      └── DonutStatusChart.tsx      # Donut chart
```

### Utility Files
```
web/lib/
  ├── ui.ts                         # Formatting utilities
  ├── data-utils.ts                # Data processing
  ├── brand.ts                     # Theme utilities
  ├── action-engine.ts             # Action generation
  └── supabase-server.ts           # Supabase client
```

### API Routes
```
web/app/api/
  ├── run/route.ts                  # Analysis execution
  ├── actions/route.ts              # Action CRUD
  ├── actions/[id]/route.ts         # Action update
  ├── roles/route.ts                # Role names
  ├── login/route.ts
  ├── logout/route.ts
  └── session/route.ts
```

---

## 15. Implementation Constraints

### DO NOT
- ❌ Refactor existing layout
- ❌ Change existing component APIs unnecessarily
- ❌ Introduce new chart libraries (use Recharts)
- ❌ Invent data/metrics
- ❌ Start Driver.js tours

### DO
- ✅ Add components surgically
- ✅ Reuse existing chart components
- ✅ Use existing CSS variables and theme system
- ✅ Extend API minimally if needed
- ✅ Wire to existing data structures
- ✅ Follow existing code patterns

---

## 16. Step 1 Preparation (Revenue by Day)

### Current State
- **Data exists:** `data.charts.day_of_week` array
- **Component exists:** `TrendLineChart` (reusable)
- **Missing:** Rendering logic in Overview section

### Implementation Plan
1. Add conditional render in Overview section (similar to Revenue by Hour)
2. Use `TrendLineChart` with appropriate `xKey` and `yKey`
3. Determine correct field names from `day_of_week` data structure
4. Place next to or below Revenue by Hour chart

### Verification
- Route: `/dashboard`
- Section: Overview
- Look for: "Revenue by Day" chart below/next to "Revenue by Hour"

---

## 17. Data Structure Assumptions

### Chart Data Format (inferred)
- **hourly_revenue:** `[{ Hour: number, "Net Price": number, ... }]`
- **day_of_week:** Likely `[{ Day: string, Revenue: number, ... }]` or similar

### Table Data Format
- **Generic:** Array of objects with dynamic keys
- **Columns:** Auto-detected or provided via `columns` prop
- **Formatting:** Auto-formatted based on column name patterns

### KPI Format
- **Generic:** `Record<string, number>`
- **Keys:** Dynamic (e.g., "revenue", "leakage_pct", "opportunity_usd")
- **Formatting:** Smart formatting via `formatKpiValue()`

---

## 18. Next Steps Readiness

### Ready to Implement
- ✅ Step 1: Revenue by Day (data exists, component exists)
- ✅ Step 2: Waste breakdowns (table data exists, can derive)
- ⚠️ Step 3: Date Range (need to verify backend support)
- ⚠️ Step 4: Server detail (need to design modal/route)
- ⚠️ Step 5: Menu groupings (need to verify data structure)
- ⚠️ Step 6: Menu quadrant (need to verify profitability/popularity data)
- ⚠️ Step 7: Daypart/comparison (need to verify data availability)

### Blockers
- **Spec document:** Not found — proceeding with audit report gaps
- **Backend data:** Need to verify what fields are available in Python outputs
- **Date filtering:** Need to determine if backend supports date range queries

---

## 19. Baseline Verification Checklist

- ✅ Dashboard route identified: `web/app/dashboard/page.tsx`
- ✅ Section structure mapped: 4 sections with scrollspy
- ✅ Data flow mapped: `/api/run` → Railway → `AnalysisData`
- ✅ Filter system mapped: `Filters` type, `filterData()` function
- ✅ Chart components identified: 3 reusable components
- ✅ Table component identified: `DataTablePreview`
- ✅ Theme system mapped: CSS variables, `data-client-theme`
- ✅ Utility libraries mapped: `ui.ts`, `data-utils.ts`, `brand.ts`
- ⚠️ Spec document: Not found (proceeding with audit gaps)
- ⚠️ Backend data structure: Need to verify during implementation

---

**END OF STEP 0 REPORT**

**Status:** READ-ONLY mapping complete. Ready to proceed with Step 1 (Revenue by Day chart) upon operator confirmation.
