# HTX TAP Dashboard - UI Overhaul Implementation Plan

**Based on:** HTX_TAP_UI_OVERHAUL_SPEC.md  
**Branch:** `ui-overhaul-spec-v2`  
**Status:** In Progress

---

## PHASE 0: RECON & INVENTORY ✅

### Current State Analysis

**Existing Components:**
- `GlassCard` - Needs spec-compliant styling (gradient, border glow, hover effects)
- `KpiCard` - Needs to become "Hero Metric Card" with sparkline
- `DataTablePreview` - **MUST BE REPLACED** - This is a "plain table" violation
- Chart components exist (TrendLineChart, BreakdownBarChart, DonutStatusChart, etc.) - Need dark theme styling
- `ActionRail` - Exists but needs spec styling
- `TeamLeaderboardCard` - Exists but needs card-based rows, not table

**Existing Routes:**
- `/dashboard` - Single page with sections (overview, waste, team, menu)
- `/admin` - Admin page
- `/login` - Login page
- `/[client]` - Client-specific routes

**Missing Routes (Need to Create):**
- `/team` - Separate page
- `/menu` - Separate page  
- `/waste` - Separate page
- `/time` - Separate page
- `/actions` - Separate page

**Libraries Status:**
- ✅ Tailwind CSS v4
- ✅ Framer Motion
- ✅ Recharts
- ✅ clsx
- ❌ @visx/visx - Need to install
- ❌ react-flow - Need to install (for Sankey)
- ❌ Lucide React - Need to check/install
- ❌ Radix UI - Need to check/install

**Design System Status:**
- ❌ Spec color palette not implemented
- ❌ Spec typography (Inter font) not implemented
- ❌ Spec spacing/radius system not implemented
- ❌ Glow effects not implemented
- ❌ Current theme system exists but doesn't match spec

---

## PHASE 1: DESIGN SYSTEM FOUNDATION

### 1.1 Global CSS Variables (Spec Section: Design System)
**File:** `web/app/globals.css`

**Tasks:**
- [ ] Add all background layer variables (bg-primary, bg-secondary, bg-tertiary, bg-hover)
- [ ] Add accent colors (accent-primary, accent-cyan, accent-purple)
- [ ] Add status colors (status-success, status-warning, status-danger, status-info)
- [ ] Add grade colors (grade-a, grade-b, grade-c, grade-d)
- [ ] Add text colors (text-primary, text-secondary, text-muted)
- [ ] Add chart colors (chart-1 through chart-5)
- [ ] Add spacing variables (space-1 through space-16)
- [ ] Add radius variables (radius-sm, radius-md, radius-lg, radius-xl, radius-full)
- [ ] Add glow effects (glow-success, glow-warning, glow-danger, glow-accent)
- [ ] Add shadow definitions (card shadow, elevated shadow)

**Reference:** Spec lines 33-129

### 1.2 Tailwind Configuration
**File:** `web/tailwind.config.ts` (may need to create if using Tailwind v4 with config)

**Tasks:**
- [ ] Wire CSS variables into Tailwind theme
- [ ] Add utility classes for glows
- [ ] Configure custom spacing/radius from variables
- [ ] Ensure dark theme is default

**Note:** Tailwind v4 uses CSS-first approach, so may need to use `@theme` directive in CSS instead

### 1.3 Typography
**File:** `web/app/layout.tsx`, `web/app/globals.css`

**Tasks:**
- [ ] Replace Geist with Inter font (via next/font/google)
- [ ] Add SF Pro Display as fallback
- [ ] Create utility classes for typography hierarchy:
  - `.text-page-title` (32px, Bold, White, -0.02em letter-spacing)
  - `.text-section-title` (24px, Semibold, White)
  - `.text-card-title` (18px, Medium, White)
  - `.text-body` (14px, Regular, Gray-400)
  - `.text-caption` (12px, Regular, Gray-500)
  - `.text-metric-large` (48px, Bold, White)
  - `.text-metric-medium` (32px, Semibold, White)
  - `.text-metric-small` (24px, Medium, White)

**Reference:** Spec lines 72-86

### 1.4 Base UI Primitives
**Files:** `web/components/ui/` (new directory)

**Components to Create:**
- [ ] `PremiumCard.tsx` - Gradient background, border glow, elevation (replaces/enhances GlassCard)
- [ ] `HeroMetricCard.tsx` - Large metric + trend + sparkline
- [ ] `Badge.tsx` - Status/grade badges with glow/pulse variants
- [ ] `SkeletonCard.tsx` - Shimmer loading (enhance existing)
- [ ] `SectionHeader.tsx` - Title + helper + right-side controls
- [ ] `EmptyState.tsx` - Premium message + CTA

**Reference:** Spec Component Specifications (lines 197-553)

---

## PHASE 2: APP SHELL / LAYOUT ARCHITECTURE

### 2.1 Sidebar Component
**File:** `web/components/layout/Sidebar.tsx` (new)

**Tasks:**
- [ ] Create 240px sidebar (collapsible to 64px icons-only)
- [ ] HTX TAP Analytics logo with subtle glow animation
- [ ] Navigation items (Dashboard, Team, Menu, Waste, Time, Actions)
- [ ] Active state: bg highlight + left border accent
- [ ] Client selector dropdown
- [ ] Last Updated block
- [ ] Run Analysis button with pulse animation
- [ ] Collapse/expand functionality

**Reference:** Spec lines 135-162

### 2.2 Header Bar Component
**File:** `web/components/layout/HeaderBar.tsx` (new)

**Tasks:**
- [ ] Page Title
- [ ] Date Range Picker (right side)
- [ ] Filter Button
- [ ] Responsive layout

**Reference:** Spec lines 164-191

### 2.3 Layout Wrapper
**File:** `web/components/layout/DashboardLayout.tsx` (new)

**Tasks:**
- [ ] Combine Sidebar + HeaderBar + Main content area
- [ ] Page transition animations (fade + slide, 300ms ease-out)
- [ ] Responsive breakpoints (mobile/tablet/desktop/large)

**Reference:** Spec lines 133-191, 697-703

### 2.4 Update Root Layout
**File:** `web/app/layout.tsx`

**Tasks:**
- [ ] Apply DashboardLayout to dashboard routes
- [ ] Keep separate layout for login/admin if needed

---

## PHASE 3: PAGE 1 - /dashboard (Executive Overview)

### 3.1 Dashboard Page Structure
**File:** `web/app/dashboard/page.tsx` (major refactor)

**Tasks:**
- [ ] Replace current section-based layout with spec layout
- [ ] "Good morning, [Owner Name]" greeting
- [ ] "Last 30 days ▼" date selector
- [ ] "Here's your business at a glance" helper text

**Reference:** Spec lines 559-598

### 3.2 Hero Metrics Row
**Tasks:**
- [ ] Create 4 HeroMetricCard components:
  - Revenue (with sparkline, trend indicator)
  - Leakage (with sparkline, trend indicator)
  - Alerts (count with new items indicator)
  - Opportunity (with sparkline, trend indicator)
- [ ] Each card: hover elevation, click drilldown
- [ ] Responsive grid (4 cols desktop, 2 cols tablet, 1 col mobile)

**Reference:** Spec lines 197-233

### 3.3 Server Grade Distribution + Actions
**Tasks:**
- [ ] Server Grade Distribution donut chart (A/B/C breakdown)
- [ ] "This Week's Actions" mini checklist panel
- [ ] Side-by-side layout (60/40 split)

**Reference:** Spec lines 577-582

### 3.4 Revenue Heatmap
**Tasks:**
- [ ] Full week × hour heatmap
- [ ] Color scale: #1e1b4b → #312e81 → #4f46e5 → #6366f1 → #22d3ee
- [ ] Golden Window identification + annotation
- [ ] Hover tooltips (revenue, % of total, order count)
- [ ] Click to filter functionality
- [ ] Golden cells: pulse/glow animation

**Reference:** Spec lines 271-304, 584-588

### 3.5 Top Performers + Needs Attention
**Tasks:**
- [ ] Top Performers card (🥇🥈🥉 rankings)
- [ ] Needs Attention card (⚠️ alerts)
- [ ] Side-by-side layout

**Reference:** Spec lines 590-595

---

## PHASE 4: PAGE 2 - /team

### 4.1 Create Team Page
**File:** `web/app/team/page.tsx` (new)

**Tasks:**
- [ ] Create new route
- [ ] Add to sidebar navigation

**Reference:** Spec lines 600-613

### 4.2 Team Page Sections
**Tasks:**
- [ ] Summary Stats Row (Total Servers, Avg SPH, Top SPH, Total Sales)
- [ ] Grade Distribution Donut (A/B/C breakdown)
- [ ] Performance by Grade Bar Chart
- [ ] Sortable Leaderboard (card rows, NOT table)
- [ ] Expandable Individual Server Cards (Server Grade Card spec)
- [ ] Coaching Recommendations Panel

**Reference:** Spec lines 235-269, 388-440

### 4.3 Server Grade Card Component
**File:** `web/components/dashboard/ServerGradeCard.tsx` (new or enhance existing)

**Tasks:**
- [ ] Grade badge (A/B/C/D) with styling and glow/pulse
- [ ] Key metrics display
- [ ] Animated metric bars (grow from 0 to value)
- [ ] Coaching insight block
- [ ] Personality tags ("Whale Hunter", "Upsell Master", etc.)

**Reference:** Spec lines 235-269

### 4.4 Team Leaderboard (Card-Based)
**Tasks:**
- [ ] Replace table with card rows
- [ ] Each row: rank badge, avatar, name, grade, metrics, progress bar
- [ ] Action buttons (View Profile, Coaching Notes, Schedule 1-on-1)
- [ ] "Needs Attention" section for low performers

**Reference:** Spec lines 388-440

---

## PHASE 5: PAGE 3 - /menu

### 5.1 Create Menu Page
**File:** `web/app/menu/page.tsx` (new)

**Tasks:**
- [ ] Create new route
- [ ] Add to sidebar navigation

**Reference:** Spec lines 615-627

### 5.2 Menu Page Sections
**Tasks:**
- [ ] BCG Matrix Scatter Plot (Stars/Plowhorses/Puzzles/Dogs)
- [ ] Volatility Alert Banner (items to remove)
- [ ] Category Performance Breakdown
- [ ] Menu Volatility Analysis (card rows, NOT table)
- [ ] Menu Optimization Recommendations Panel

**Reference:** Spec lines 306-386

### 5.3 BCG Matrix Component
**File:** `web/components/dashboard/charts/MenuBCGMatrix.tsx` (new)

**Tasks:**
- [ ] Scatter plot (Profitability vs Quantity)
- [ ] Quadrant styling (green/blue/yellow/red zones)
- [ ] Legend (Star, Plowhorse, Puzzle, Dog)
- [ ] Hover tooltip (name, revenue, qty, margin, category)
- [ ] Click: item detail modal
- [ ] Category filter dropdown

**Reference:** Spec lines 306-343

### 5.4 Menu Volatility Cards
**Tasks:**
- [ ] Replace table with card rows
- [ ] Row styling:
  - REMOVE: Red left border, red bg tint, pulsing icon
  - INVESTIGATE: Yellow left border, yellow bg tint
  - OK: Green left border (collapsed by default)
  - STAR: Gold border, gold glow
- [ ] Action buttons per row
- [ ] "IMMEDIATE ACTION REQUIRED" banner

**Reference:** Spec lines 345-386

---

## PHASE 6: PAGE 4 - /waste

### 6.1 Create Waste Page
**File:** `web/app/waste/page.tsx` (new)

**Tasks:**
- [ ] Create new route
- [ ] Add to sidebar navigation

**Reference:** Spec lines 629-642

### 6.2 Waste Page Sections
**Tasks:**
- [ ] Total Leakage Metric + Breakdown
- [ ] Leakage Sankey Diagram (Revenue Flow)
- [ ] Void Reason Pie Chart
- [ ] Server Waste Efficiency (card rows, NOT table)
- [ ] Time-Based Void Patterns (hourly/daily)
- [ ] Suspicious Pattern Alerts Panel

**Reference:** Spec lines 492-521

### 6.3 Sankey Diagram Component
**File:** `web/components/dashboard/charts/LeakageSankey.tsx` (new)

**Tasks:**
- [ ] Use react-flow or d3-sankey
- [ ] Animated flow lines
- [ ] Hover on segment: show breakdown
- [ ] Visual flow: Gross Revenue → Net Revenue (with leakage branches)

**Reference:** Spec lines 492-521

---

## PHASE 7: PAGE 5 - /time

### 7.1 Create Time Page
**File:** `web/app/time/page.tsx` (new)

**Tasks:**
- [ ] Create new route
- [ ] Add to sidebar navigation

**Reference:** Spec lines 644-657

### 7.2 Time Page Sections
**Tasks:**
- [ ] Revenue Heatmap (Hour × Day) + Golden Window
- [ ] Hourly Revenue Bar Chart
- [ ] Day of Week Comparison
- [ ] Golden Window Identification
- [ ] Labor Alignment Recommendations
- [ ] Daypart Analysis (Lunch/Dinner/Late Night)

**Reference:** Spec lines 271-304 (heatmap), 644-657

---

## PHASE 8: PAGE 6 - /actions

### 8.1 Create Actions Page
**File:** `web/app/actions/page.tsx` (new)

**Tasks:**
- [ ] Create new route
- [ ] Add to sidebar navigation

**Reference:** Spec lines 659-671

### 8.2 Actions Page Sections
**Tasks:**
- [ ] Prioritized Open Action Items (High/Medium/Low) with due dates
- [ ] Completed This Period
- [ ] Impact Tracker ($$ saved/gained) + streak/impact score gamification
- [ ] AI-Suggested Generator UI (or "Coming Soon" module)
- [ ] Assignment + Due Date Management UI

**Reference:** Spec lines 442-490

### 8.3 Action Items Panel Component
**File:** `web/components/dashboard/ActionItemsPanel.tsx` (enhance existing ActionRail)

**Tasks:**
- [ ] Priority styling (High: red border + pulse, Medium: yellow, Low: blue)
- [ ] Completed: green bg tint, strikethrough
- [ ] Action buttons (Mark Complete, Snooze, Dismiss, Assign)
- [ ] Gamification: streak counter, impact score
- [ ] Due date display

**Reference:** Spec lines 442-490

---

## PHASE 9: INTERACTIONS / ANIMATIONS / LOADING

### 9.1 Micro-Interactions
**Tasks:**
- [ ] Cards: hover lift 4px, border glow increase
- [ ] Buttons: hover scale 1.02, press scale 0.98
- [ ] Table rows (if any remain): background highlight, show action buttons
- [ ] Chart elements: tooltips, highlight related elements

**Reference:** Spec lines 675-695

### 9.2 Page Transitions
**Tasks:**
- [ ] Fade + slide from right (forward navigation)
- [ ] Fade + slide from left (back navigation)
- [ ] 300ms duration, ease-out timing

**Reference:** Spec lines 697-703

### 9.3 Loading States
**Tasks:**
- [ ] Skeleton screens (not spinners) for initial load
- [ ] Shimmer effect on loading cards
- [ ] Progressive data loading

**Reference:** Spec lines 691-695

### 9.4 Data Updates
**Tasks:**
- [ ] Numbers animate (count up/down) when changing
- [ ] Charts animate on filter change
- [ ] New alerts slide in from right with attention animation

**Reference:** Spec lines 705-711

---

## PHASE 10: SENTIMENT-REVENUE MODULE (Placeholder)

### 10.1 Sentiment Module
**File:** `web/components/dashboard/SentimentRevenueCorrelation.tsx` (new)

**Tasks:**
- [ ] If data available: render correlation chart
- [ ] If data missing: "Connect Google Reviews" CTA module (premium placeholder)

**Reference:** Spec lines 523-553

---

## PHASE 11: ELIMINATE ALL PLAIN TABLES

### 11.1 Table Audit
**Files:** All pages and components

**Tasks:**
- [ ] Find all `<table>` elements
- [ ] Replace with card-based rows
- [ ] Ensure status left borders, icons, inline actions
- [ ] If table must exist for accessibility: render visually as cards but keep semantic table

**Reference:** Spec "What Not To Do" section (lines 767-790)

---

## PHASE 12: LIBRARY INSTALLATION

### 12.1 Install Missing Libraries
**File:** `web/package.json`

**Tasks:**
- [ ] Install @visx/visx (for advanced visualizations)
- [ ] Install react-flow (for Sankey diagrams)
- [ ] Install lucide-react (if not present)
- [ ] Install @radix-ui/* components (if needed for dropdowns, dialogs, etc.)
- [ ] Run `npm install`

**Reference:** Spec lines 719-745

---

## PHASE 13: QUALITY ASSURANCE

### 13.1 Build & Type Check
**Tasks:**
- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] Fix all TypeScript errors
- [ ] Fix all linting errors

### 13.2 Responsive Testing
**Tasks:**
- [ ] Test mobile (< 640px)
- [ ] Test tablet (640px - 1024px)
- [ ] Test desktop (1024px - 1440px)
- [ ] Test large (> 1440px)

**Reference:** Spec lines 756-763

### 13.3 Performance Verification
**Tasks:**
- [ ] Check First Contentful Paint < 1.5s
- [ ] Check Largest Contentful Paint < 2.5s
- [ ] Check Time to Interactive < 3s
- [ ] Check Cumulative Layout Shift < 0.1
- [ ] Memoize heavy chart components
- [ ] Lazy-load heavy modules if needed

**Reference:** Spec lines 747-754

### 13.4 Visual Verification
**Tasks:**
- [ ] No plain tables visible
- [ ] All cards have hover effects
- [ ] All numbers have context/trend indicators
- [ ] Action items are prominent
- [ ] Coaching language (not accusatory)
- [ ] Dark theme throughout
- [ ] Glows and gradients applied
- [ ] "Wow factor" achieved

**Reference:** Spec "Success Criteria" (lines 807-816)

---

## DELIVERABLES CHECKLIST

- [ ] Design System implemented (colors, typography, spacing, shadows, glows)
- [ ] Layout Architecture (sidebar, header, main content)
- [ ] All 6 pages created and styled:
  - [ ] /dashboard
  - [ ] /team
  - [ ] /menu
  - [ ] /waste
  - [ ] /time
  - [ ] /actions
- [ ] All required components:
  - [ ] HeroMetricCard
  - [ ] ServerGradeCard
  - [ ] RevenueHeatmap
  - [ ] MenuBCGMatrix
  - [ ] MenuVolatilityCards
  - [ ] TeamLeaderboardCards
  - [ ] ActionItemsPanel
  - [ ] LeakageSankey
  - [ ] SentimentRevenueCorrelation (placeholder)
- [ ] All interactions/animations
- [ ] All loading states
- [ ] No plain tables anywhere
- [ ] Build passes
- [ ] Responsive across all breakpoints
- [ ] Performance targets met

---

## NOTES

- **Data Availability:** If data is missing, show premium "Coming Soon" or "Connect" CTA modules, not broken/empty states
- **Coaching Language:** Use positive framing ("opportunity", "training", "improvement") not accusatory language
- **Action Items:** Every insight should have an associated action item
- **Visual Hierarchy:** Every number needs context (vs last period, trend, comparison)
- **No Compromises:** This is a complete overhaul, not incremental improvements

---

**Last Updated:** 2025-01-31  
**Status:** Phase 0 Complete, Starting Phase 1
