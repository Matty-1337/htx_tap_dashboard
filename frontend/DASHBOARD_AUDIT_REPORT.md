# HTX TAP Analytics Dashboard - Complete Inventory & Gap Analysis

**Generated:** 2025-01-27  
**Audit Type:** Read-Only Architecture & Feature Inventory  
**Scope:** Full dashboard implementation vs. specification requirements

---

## 1. Dashboard Architecture Overview

### 1.1 Main Dashboard Route
- **File:** `web/app/dashboard/page.tsx`
- **Route:** `/dashboard`
- **Type:** Client Component (`'use client'`)
- **Layout:** Single-page experience with section-based navigation

### 1.2 Section Structure
- **Navigation:** Left sidebar with 4 sections (Overview, Waste, Team, Menu)
- **Active Section Tracking:** 
  - Uses `useRef` for section refs (`sectionRefs.current`)
  - `IntersectionObserver` API for scrollspy detection
  - State: `activeSection` (string: 'overview' | 'waste' | 'team' | 'menu')
  - Scroll-to-section: `scrollToSection(id)` function
- **Section Components:** `Section` component (`web/components/dashboard/Section.tsx`)
  - Wraps each section with `id`, `title`, and `ref` for scrollspy
  - Uses Framer Motion for scroll animations

### 1.3 Action Rail Implementation
- **Component:** `ActionRail` (`web/components/dashboard/ActionRail.tsx`)
- **Position:** Right-side sticky rail (desktop only, `hidden lg:block`)
- **Data Source:** 
  - Fetches from `/api/actions` (GET) on mount
  - Generates via `/api/actions` (POST) when analysis completes
  - Updates via `/api/actions/[id]` (PATCH) for status/assignee changes
- **Persistence:** Supabase `action_items` table
  - Fields: `id`, `client_id`, `status`, `priority`, `assignee`, `title`, `rationale`, `steps`, `estimated_impact_usd`, `source`, `created_at`, `updated_at`
- **State Management:** 
  - Local state: `completedIds`, `pinnedIds`, `expandedIds`, `assignees`, `assigneeFilter`
  - Server state: Fetched actions from Supabase

### 1.4 Data Flow
- **Backend:** Railway FastAPI (`/api/run` → Railway backend)
- **Payload Structure:** 
  ```typescript
  {
    clientId: string
    generatedAt: string
    kpis: Record<string, number>
    charts: {
      hourly_revenue?: Array<any>
      day_of_week?: Array<any>
    }
    tables: {
      waste_efficiency?: { data: any[], columns?: string[] }
      employee_performance?: { data: any[], columns?: string[] }
      menu_volatility?: { data: any[], columns?: string[] }
    }
    executionTimeSeconds: number
  }
  ```

---

## 2. Section-by-Section Inventory

### A) OVERVIEW SECTION

#### A.1 KPI Cards
- **Component:** `KpiCard` (`web/components/dashboard/KpiCard.tsx`)
- **Rendering:** Grid layout (1 col mobile, 2 col tablet, 3 col desktop)
- **Data Source:** `data.kpis` object (from Railway backend)
- **Metrics Shown:**
  - Dynamic: First 6 KPI entries from `Object.entries(kpis)`
  - Format: Uses `formatKpiValue()` and `formatKey()` from `web/lib/ui.ts`
  - Filtered Values: Shows filtered KPI when `selectedServer/Status/Category` filters active
- **Display:**
  - Label: Formatted key name
  - Value: Formatted number/currency/percent
  - Delta: Shows percentage change when filtered value exists
  - Priority badges: Uses theme CSS variables
- **Theme Integration:** Uses `.surface` class, `--text`, `--muted`, `--primary` variables
- **Status:** ✅ PRESENT (dynamic KPI display, but specific KPI names not enforced)

#### A.2 Revenue by Hour Visualization
- **Component:** `TrendLineChart` (`web/components/dashboard/charts/TrendLineChart.tsx`)
- **Data Source:** `data.charts.hourly_revenue` array
- **Rendering:** Conditional (`{data?.charts?.hourly_revenue && data.charts.hourly_revenue.length > 0 && ...}`)
- **Chart Library:** Recharts (`LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`)
- **Metrics:** 
  - X-axis: `Hour` field
  - Y-axis: `Net Price` field
- **Interactions:** None (read-only visualization)
- **Theme Integration:** Uses theme CSS variables for colors
- **Status:** ✅ PRESENT (if data exists)

#### A.3 Revenue by Day Visualization
- **Component:** Not found
- **Data Source:** `data.charts.day_of_week` exists in payload structure but not rendered
- **Status:** ❌ MISSING (data structure exists, but no visualization component)

#### A.4 "Top Actions This Week" Preview Module
- **Component:** Custom inline component in Overview section
- **Rendering:** Conditional (`{topActions.length > 0 && ...}`)
- **Data Source:** `actionItems.filter(a => a.priority === 'high').slice(0, 3)`
- **Display:**
  - Grid: 3 columns (responsive)
  - Each card: Priority badge, title, estimated impact, rationale (truncated)
  - Uses `GlassCard` component
- **Status:** ✅ PRESENT

#### A.5 Interactive Insights
- **Component:** Combined chart area
- **Left Side:**
  - `DonutStatusChart`: Status distribution (from `statusBreakdown`)
  - `BreakdownBarChart`: Top waste servers (from `topWasteServers`)
- **Right Side:**
  - `TrendLineChart`: Revenue by hour (if available)
- **Interactions:**
  - Donut chart: Click slice to filter by status
  - Bar chart: Click bar to filter by server
- **Status:** ✅ PRESENT

#### A.6 Active Filters Display
- **Component:** `ActiveFilters` (`web/components/dashboard/ActiveFilters.tsx`)
- **Filters Supported:**
  - `selectedServer` (from chart/table clicks)
  - `selectedStatus` (from donut chart clicks)
  - `selectedCategory` (from table clicks)
- **Display:** Pill badges with remove buttons, "Clear all" button
- **Status:** ✅ PRESENT

---

### B) WASTE / LEAKAGE SECTION

#### B.1 Void/Discount/Removal Summaries
- **Component:** `DataTablePreview` (`web/components/dashboard/DataTablePreview.tsx`)
- **Data Source:** `data.tables.waste_efficiency.data`
- **Table Title:** "Waste Efficiency Analysis"
- **Metrics Shown:**
  - Dynamic columns from `data.tables.waste_efficiency.columns` or auto-detected from first row
  - Formatting: Currency for revenue/waste fields, percent for rates, numbers for counts
- **Interactions:**
  - Row click: Sets `selectedServer` filter if server column exists
  - Expandable: "View more" / "Load more" buttons
  - Max rows: 25 initial, expandable to 100+
- **Filters:** Respects `filters.selectedServer`, `filters.selectedStatus`, `filters.selectedCategory`
- **Status:** ✅ PRESENT (generic table, but specific "void/discount/removal" breakdown not explicit)

#### B.2 Leakage by Reason Visualization
- **Component:** Not found
- **Data Source:** Not identified in current implementation
- **Status:** ❌ MISSING

#### B.3 Leakage by Category Table
- **Component:** `DataTablePreview` (same as B.1)
- **Data Source:** `data.tables.waste_efficiency.data` (filtered)
- **Status:** 🟡 PARTIAL (table exists, but "category" grouping/breakdown not explicit)

#### B.4 Trend Indicators
- **Component:** Not found
- **Data Source:** Not identified
- **Status:** ❌ MISSING

#### B.5 Drill-down Capability
- **Implementation:** Row click sets filters (`handleRowClick`)
- **Behavior:** Filters cascade to other sections (waste, team, menu)
- **Status:** ✅ PRESENT (filter-based drill-down)

---

### C) TEAM SECTION

#### C.1 Server Leaderboard
- **Component:** `DataTablePreview`
- **Data Source:** `data.tables.employee_performance.data`
- **Table Title:** "Employee Performance"
- **Metrics Shown:**
  - Dynamic columns from `data.tables.employee_performance.columns` or auto-detected
  - Formatting: Currency, percent, numbers as appropriate
- **Interactions:**
  - Row click: Sets `selectedServer` filter
  - Expandable rows
- **Status:** ✅ PRESENT (table exists, but "leaderboard" ranking/scoring not explicit)

#### C.2 Server Detail Views
- **Component:** Not found (no expand, modal, or detail route)
- **Implementation:** Filter-based (clicking row filters other sections)
- **Status:** ❌ MISSING (no dedicated detail view)

#### C.3 Coaching Insights
- **Component:** Not found
- **Data Source:** Not identified
- **Status:** ❌ MISSING

#### C.4 Ranking/Scoring/Classification Logic
- **Component:** `getTopWasteServers()` in `web/lib/data-utils.ts`
  - Sorts by waste value descending
  - Returns top N servers
- **Usage:** Used for `BreakdownBarChart` in Overview
- **Status:** 🟡 PARTIAL (basic ranking exists, but no scoring/classification system)

---

### D) MENU SECTION

#### D.1 Menu Item Performance Table
- **Component:** `DataTablePreview`
- **Data Source:** `data.tables.menu_volatility.data`
- **Table Title:** "Menu Volatility"
- **Metrics Shown:**
  - Dynamic columns from `data.tables.menu_volatility.columns` or auto-detected
  - Formatting: Currency, percent, numbers
- **Interactions:**
  - Row click: Sets filters
  - Expandable rows
- **Status:** ✅ PRESENT

#### D.2 "Chaos Items" or Volatility Indicators
- **Component:** Not found (no dedicated visualization)
- **Data Source:** `menu_volatility` table exists
- **Action Engine:** Generates actions for items with `Action === "REMOVE"` or `Volatility_Pct >= 100`
- **Status:** 🟡 PARTIAL (data exists, actions generated, but no dedicated UI visualization)

#### D.3 Stars / Monitor / Investigate / Remove Groupings
- **Component:** Not found
- **Data Source:** Not identified in current implementation
- **Status:** ❌ MISSING

#### D.4 Menu Engineering Quadrant
- **Component:** Not found
- **Data Source:** Not identified
- **Status:** ❌ MISSING

#### D.5 Item-level Drill-down
- **Implementation:** Row click sets filters (same as other tables)
- **Status:** ✅ PRESENT (filter-based)

---

### E) GM ACTION RAIL

#### E.1 Action List Rendering
- **Component:** `ActionRail` (`web/components/dashboard/ActionRail.tsx`)
- **Data Source:** 
  - Fetched from Supabase via GET `/api/actions`
  - Generated via POST `/api/actions` (with deduplication)
- **Display:**
  - Tabs: "Open" (default) and "Completed"
  - Filter: Assignee filter (All | GM | Manager 1 | Manager 2)
  - Sorting: Pinned first, then by priority, then by estimated impact
- **Status:** ✅ PRESENT

#### E.2 Priority Logic
- **Types:** `'high' | 'medium' | 'low'`
- **Visual:** Priority badge with color coding (high=primary, medium=secondary, low=muted)
- **Generation:** `generateActions()` in `web/lib/action-engine.ts`
  - High: Waste/team critical, menu volatility
  - Medium: KPI-driven (food attachment < 10%, bottle conversion < 5%)
  - Low: Average check improvements
- **Status:** ✅ PRESENT

#### E.3 Delegation Controls
- **Component:** Dropdown in each action card
- **Options:** "GM" | "Manager 1" | "Manager 2" (fixed, no free text)
- **Persistence:** PATCH `/api/actions/:id` with `assignee` field
- **Role Names:** Displayed as sublabels (e.g., "GM — Cassandra Phelan")
- **Status:** ✅ PRESENT

#### E.4 Status Controls
- **States:** `'open' | 'done' | 'snoozed' | 'dismissed'`
- **UI:** "Mark Done" button (moves to Completed tab)
- **Persistence:** PATCH `/api/actions/:id` with `status` field
- **Status:** ✅ PRESENT (Done implemented, snoozed/dismissed not in UI)

#### E.5 Filters
- **Assignee Filter:** Segmented control (All | GM | Manager 1 | Manager 2)
- **Tab Filter:** Open vs Completed
- **Status:** ✅ PRESENT

#### E.6 Copy/Export Behavior
- **Function:** `copyActions()` in `ActionRail`
- **Format:** Markdown grouped by assignee
- **Output:**
  - Sections: "# GM Action Items", "## GM", "## Manager 1", "## Manager 2"
  - Each action: Priority emoji, title, impact, rationale, first 3 steps
- **Status:** ✅ PRESENT

#### E.7 Supabase Persistence Linkage
- **Table:** `action_items` (created via migration)
- **API Routes:**
  - GET `/api/actions`: Fetch actions for client (last 90 days, open+done)
  - POST `/api/actions`: Generate and upsert with deduplication
  - PATCH `/api/actions/[id]`: Update status or assignee
- **Deduplication:** Unique index on `(client_id, source->>'report', source->>'dedupe_key')`
- **Status:** ✅ PRESENT

---

## 3. Platform-Wide Interactions

### 3.1 Global Filters
- **Types:**
  - `selectedServer` (string): Set via chart/table row clicks
  - `selectedStatus` (string): Set via donut chart slice clicks
  - `selectedCategory` (string): Set via table row clicks
- **Scope:** Applied to all sections (waste, team, menu tables)
- **Display:** `ActiveFilters` component in Overview
- **Persistence:** In-memory only (not persisted to URL or Supabase)
- **Status:** ✅ PRESENT (server/status/category filters)

### 3.2 Date Range Filters
- **Component:** Not found
- **Data Source:** Not identified
- **Status:** ❌ MISSING

### 3.3 Daypart Filters
- **Component:** Not found
- **Data Source:** Not identified
- **Status:** ❌ MISSING

### 3.4 Comparison Modes
- **Component:** Not found
- **Data Source:** Not identified
- **Status:** ❌ MISSING

### 3.5 Drill-down Paths
- **Implementation:** Filter-based (click row → set filter → all sections update)
- **Paths:**
  - Table row → Server filter → All sections filtered
  - Table row → Status filter → All sections filtered
  - Table row → Category filter → All sections filtered
  - Chart slice/bar → Filter → All sections filtered
- **Status:** ✅ PRESENT (filter-based drill-down)

### 3.6 "Coming Soon" / Disabled UI States
- **Component:** Not found
- **Status:** ❌ MISSING (no placeholder states identified)

---

## 4. Gap Analysis Table

| Feature | Status | Details |
|---------|--------|---------|
| **OVERVIEW SECTION** |
| KPI Cards (Revenue, Leakage $, Leakage %, Opportunity $, Alerts) | 🟡 PARTIAL | Dynamic KPI display exists, but specific named KPIs not enforced. Backend may return any KPIs. |
| Revenue by Hour visualization | ✅ PRESENT | `TrendLineChart` with `hourly_revenue` data |
| Revenue by Day visualization | ❌ MISSING | `day_of_week` data exists in payload but no visualization component |
| Top Actions preview | ✅ PRESENT | Shows top 3 high-priority actions |
| **WASTE / LEAKAGE SECTION** |
| Void/discount/removal summaries | 🟡 PARTIAL | Generic `waste_efficiency` table exists, but explicit void/discount/removal breakdown not visible |
| Leakage by reason visualization | ❌ MISSING | No dedicated chart/visualization |
| Leakage by category table | 🟡 PARTIAL | Table exists, but category grouping/breakdown not explicit |
| Trend indicators | ❌ MISSING | No trend visualization (sparklines, arrows, etc.) |
| **TEAM SECTION** |
| Server leaderboard | 🟡 PARTIAL | Table exists, but "leaderboard" ranking/scoring UI not explicit |
| Server detail views | ❌ MISSING | No expand, modal, or detail route |
| Coaching insights | ❌ MISSING | No dedicated coaching insights component |
| Ranking/scoring/classification | 🟡 PARTIAL | Basic `getTopWasteServers()` exists, but no comprehensive scoring system |
| **MENU SECTION** |
| Menu item performance table | ✅ PRESENT | `menu_volatility` table displayed |
| Chaos items / volatility indicators | 🟡 PARTIAL | Data exists, actions generated, but no dedicated visualization |
| Stars/Monitor/Investigate/Remove groupings | ❌ MISSING | No grouping UI or filtering by action type |
| Menu engineering quadrant | ❌ MISSING | No profitability vs. popularity quadrant chart |
| **ACTION RAIL** |
| Action list rendering | ✅ PRESENT | Full implementation with tabs, filters, sorting |
| Priority logic | ✅ PRESENT | High/medium/low with visual indicators |
| Delegation controls | ✅ PRESENT | Dropdown with role name display |
| Status controls | 🟡 PARTIAL | "Done" implemented, but "snoozed"/"dismissed" not in UI |
| Filters | ✅ PRESENT | Assignee filter and tab filter |
| Copy/export | ✅ PRESENT | Markdown export grouped by assignee |
| Supabase persistence | ✅ PRESENT | Full CRUD with deduplication |
| **PLATFORM-WIDE** |
| Global filters (server/status/category) | ✅ PRESENT | Implemented and working |
| Date range filters | ❌ MISSING | No date range picker or filter |
| Daypart filters | ❌ MISSING | No daypart (breakfast/lunch/dinner) filter |
| Comparison modes | ❌ MISSING | No period-over-period or benchmark comparison |
| Drill-down paths | ✅ PRESENT | Filter-based drill-down working |
| Coming soon / disabled states | ❌ MISSING | No placeholder UI for missing features |

---

## 5. Ready to Build Summary

### 5.1 Overview Section
- **Missing:** Revenue by Day visualization (data exists, needs `DayOfWeekChart` component)
- **Partial:** Named KPI enforcement (backend may need to guarantee specific KPIs: Revenue, Leakage $, Leakage %, Opportunity $, Alerts)

### 5.2 Waste / Leakage Section
- **Missing:**
  - Leakage by reason visualization (needs chart component)
  - Trend indicators (sparklines or trend arrows)
- **Partial:**
  - Explicit void/discount/removal breakdown (may need backend grouping or frontend aggregation)
  - Category grouping/breakdown (may need backend support or frontend grouping logic)

### 5.3 Team Section
- **Missing:**
  - Server detail view (expand, modal, or `/dashboard/server/[id]` route)
  - Coaching insights component (derived analytics display)
- **Partial:**
  - Leaderboard UI polish (ranking badges, scores, classifications)
  - Comprehensive scoring system (beyond top waste servers)

### 5.4 Menu Section
- **Missing:**
  - Stars/Monitor/Investigate/Remove grouping UI (filter/group by action type)
  - Menu engineering quadrant chart (profitability vs. popularity scatter plot)
- **Partial:**
  - Chaos items visualization (dedicated chart or highlighted section)

### 5.5 Action Rail
- **Partial:**
  - Snoozed/Dismissed status controls (UI buttons/actions)

### 5.6 Platform-Wide
- **Missing:**
  - Date range filter (picker component, backend support)
  - Daypart filter (breakfast/lunch/dinner, backend support)
  - Comparison modes (period-over-period, benchmark comparison)
  - "Coming soon" placeholder states for missing features

---

## 6. Component Inventory

### 6.1 Dashboard Components
- `web/components/dashboard/GlassCard.tsx` - Surface card with theme variables
- `web/components/dashboard/KpiCard.tsx` - KPI display with delta
- `web/components/dashboard/PillBadge.tsx` - Status/priority badge
- `web/components/dashboard/Section.tsx` - Section wrapper with scrollspy
- `web/components/dashboard/DataTablePreview.tsx` - Generic data table with formatting
- `web/components/dashboard/ActiveFilters.tsx` - Filter pill display
- `web/components/dashboard/ActionRail.tsx` - Right-side action management rail
- `web/components/dashboard/SkeletonCard.tsx` - Loading skeletons

### 6.2 Chart Components
- `web/components/dashboard/charts/TrendLineChart.tsx` - Line chart (Recharts)
- `web/components/dashboard/charts/BreakdownBarChart.tsx` - Bar chart (Recharts)
- `web/components/dashboard/charts/DonutStatusChart.tsx` - Donut chart (Recharts)

### 6.3 Utility Libraries
- `web/lib/ui.ts` - Formatting utilities (`formatKpiValue`, `formatKey`, `formatNumber`, `formatCurrency`, `formatPercent`, `prettifyColumnName`)
- `web/lib/data-utils.ts` - Data processing (`getStatusBreakdown`, `getTopWasteServers`, `filterData`, `calculateKpiFromData`, `findColumn`)
- `web/lib/action-engine.ts` - Action generation with deduplication
- `web/lib/brand.ts` - Client theme utilities
- `web/lib/supabase-server.ts` - Supabase client (service role)

### 6.4 API Routes
- `web/app/api/run/route.ts` - Analysis execution (Railway backend)
- `web/app/api/actions/route.ts` - Action CRUD (GET, POST)
- `web/app/api/actions/[id]/route.ts` - Action update (PATCH)
- `web/app/api/roles/route.ts` - Role names (GET)
- `web/app/api/login/route.ts` - Authentication
- `web/app/api/logout/route.ts` - Logout
- `web/app/api/session/route.ts` - Session check

---

## 7. Data Flow Summary

### 7.1 Analysis Execution
1. User clicks "Run Analysis" → POST `/api/run`
2. Route verifies session, extracts `clientId`
3. Forwards to Railway backend: `POST {API_BASE_URL}/run`
4. Backend returns analysis payload
5. Dashboard stores in state: `setData(payload)`

### 7.2 Action Generation
1. On analysis completion → POST `/api/actions` with payload
2. Server fetches role names from env vars
3. Calls `generateActions(payload, filters, roleNames)`
4. Upserts to Supabase with deduplication
5. Returns persisted actions
6. Dashboard updates `actionItems` state

### 7.3 Filter Application
1. User clicks chart/table → `handleRowClick(row)`
2. Extracts server/status/category from row
3. Updates `filters` state
4. Filters applied to: `filteredWasteData`, `filteredEmployeeData`, `filteredMenuData`
5. KPIs recalculated: `calculateFilteredKpi(key)`
6. Actions regenerated with filters: `generateActions(data, filters, roleNames)`

### 7.4 Action Updates
1. User changes assignee/status → PATCH `/api/actions/:id`
2. Server verifies `client_id` match
3. Updates Supabase row
4. Returns updated action
5. Dashboard refreshes via `onActionUpdate()` callback

---

## 8. Theme Integration Status

### 8.1 Client Themes
- **Melrose:** Moody Architectural (terracotta primary, 20px radius, glow effects)
- **Fancy's HTX:** Art Deco (red/gold, 4px radius, gradient overlays)
- **Best Regards:** Garden Chic (forest green, 12px radius, checkerboard pattern)

### 8.2 Theme Application
- **Root:** `data-client-theme` attribute on dashboard root
- **CSS Variables:** All components use `--bg`, `--surface`, `--text`, `--muted`, `--primary`, `--secondary`, `--accent`, `--radius`, `--card-border`, `--glow`, `--shadow`
- **Status:** ✅ PRESENT (comprehensive theme system)

---

## 9. Specification Comparison Notes

**Note:** The specification document ("HTX TAP Analytics Platform – Complete Technical & Product Specification") was not found in the repository. This audit is based on:
1. Current implementation analysis
2. Common analytics dashboard patterns
3. Existing code structure and data flows

**Recommendation:** Obtain the specification document to perform exact requirement matching.

---

## 10. Critical Findings

### 10.1 Data Structure Assumptions
- Backend payload structure is inferred from TypeScript interfaces
- Specific KPI names (Revenue, Leakage $, etc.) are not enforced in code
- Chart data keys (`Hour`, `Net Price`, etc.) are assumed from component usage

### 10.2 Missing Visualizations
- Revenue by Day (data exists, component missing)
- Leakage by reason (no data source identified)
- Menu engineering quadrant (no data source identified)
- Trend indicators (no implementation)

### 10.3 Missing Interactions
- Date range filtering
- Daypart filtering
- Comparison modes
- Server detail views
- Menu item grouping by action type

### 10.4 Partial Implementations
- KPI naming (dynamic vs. named)
- Status controls (done only, missing snoozed/dismissed)
- Leaderboard UI (basic table vs. ranked display)
- Category breakdowns (generic table vs. grouped views)

---

**End of Audit Report**
