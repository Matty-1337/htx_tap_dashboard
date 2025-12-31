# HTX TAP UI Overhaul - Remaining TODO Checklist

**Branch:** `ui-overhaul-spec-v2`  
**Date:** 2025-12-31  
**Status:** Final Sprint

---

## COMPLETED PHASES ✅

- ✅ Phase 1: Design System Foundation (CSS variables, typography, base components)
- ✅ Phase 2: App Shell / Layout Architecture (Sidebar, HeaderBar, DashboardLayout)
- ✅ Phase 3: Dashboard page overhaul
- ✅ Phase 4: Team page implementation
- ✅ Phase 5: Menu page implementation
- ✅ Phase 6: Waste page implementation
- ✅ Phase 8: Actions page implementation

---

## REMAINING WORK (Target: ~12 items)

### PHASE 7: /time PAGE IMPLEMENTATION ⚠️ PENDING

**File:** `web/app/time/page.tsx`

**Required Sections:**
1. [ ] Hero row (4 HeroMetricCards):
   - Peak Hour Revenue
   - Best Day
   - Golden Window
   - Missed Opportunity
2. [ ] Revenue Heatmap (hour × day) with Golden Window annotation
   - Reuse `RevenueHeatmap` component from dashboard
   - Add Golden Window identification + pulse/glow
3. [ ] Hourly revenue bar chart
4. [ ] Day-of-week comparison chart
5. [ ] Daypart analysis cards (Lunch/Dinner/Late Night)
6. [ ] Labor alignment recommendations panel
   - If no labor data: premium placeholder CTA
7. [ ] Loading skeletons for all sections
8. [ ] Empty states for all sections

**Components to Create/Reuse:**
- [ ] Reuse `RevenueHeatmap` from dashboard
- [ ] Create `DaypartAnalysisCard.tsx` if needed
- [ ] Create `LaborAlignmentPanel.tsx` if needed

**Status:** NOT STARTED

---

### PHASE 9: INTERACTIONS / ANIMATIONS / LOADING ⚠️ PARTIAL

**Micro-Interactions:**
- [x] Cards: hover lift 4px, border glow (implemented in PremiumCard)
- [x] Buttons: hover scale 1.02, press scale 0.98 (implemented with framer-motion)
- [ ] Numbers: count-up animation on load (NOT YET IMPLEMENTED)
- [ ] Chart elements: enhanced tooltips, highlight related elements (PARTIAL)

**Page Transitions:**
- [x] Fade + slide transitions (implemented in DashboardLayout)
- [ ] Verify all pages use DashboardLayout consistently

**Loading States:**
- [x] SkeletonShimmer component created
- [ ] Verify ALL pages have skeletons for every major section
- [ ] Verify ALL pages have premium empty states

**Data Updates:**
- [ ] Numbers animate (count up/down) when changing
- [ ] Charts animate on filter change
- [ ] New alerts slide in from right with attention animation

**Status:** PARTIAL - Need to add count-up animations and verify coverage

---

### PHASE 10: SENTIMENT-REVENUE MODULE (PLACEHOLDER) ⚠️ PENDING

**File:** `web/components/dashboard/SentimentRevenueCorrelation.tsx`

**Tasks:**
- [ ] Create placeholder component
- [ ] If data available: render correlation chart
- [ ] If data missing: "Connect Google Reviews" CTA module (premium placeholder)
- [ ] Add to dashboard page if specified in spec

**Status:** NOT STARTED

---

### PHASE 11: ELIMINATE ALL PLAIN TABLES ⚠️ VERIFICATION NEEDED

**Global Compliance Sweep:**
- [ ] Search entire codebase for `<table>` elements
- [ ] Replace any remaining tables with card-row equivalents
- [ ] Verify NO plain tables visible in UI
- [ ] Ensure all tabular data uses card-based rows with:
  - Left status borders
  - Icons
  - Inline actions

**Status:** NEEDS AUDIT - Tables may have been replaced, but need verification

---

### PHASE 12: LIBRARY INSTALLATION ✅ COMPLETE

**Libraries Status:**
- ✅ react-flow installed (v1.0.3)
- ✅ lucide-react installed
- ✅ recharts installed
- ✅ framer-motion installed
- ✅ clsx installed
- ❌ @visx/visx - Removed due to React 19 incompatibility (using Recharts instead)

**Status:** COMPLETE (with acceptable substitution)

---

### PHASE 13: QUALITY ASSURANCE ⚠️ PENDING

**Build & Type Check:**
- [ ] Run `npm run lint` and fix all errors
- [ ] Run `npm run build` and verify success
- [ ] Fix all TypeScript errors
- [ ] Fix all linting errors

**Responsive Testing:**
- [ ] Test mobile (< 640px)
- [ ] Test tablet (640px - 1024px)
- [ ] Test desktop (1024px - 1440px)
- [ ] Test large (> 1440px)
- [ ] Verify sidebar collapse works on mobile

**Performance Verification:**
- [ ] Check First Contentful Paint < 1.5s
- [ ] Check Largest Contentful Paint < 2.5s
- [ ] Check Time to Interactive < 3s
- [ ] Check Cumulative Layout Shift < 0.1
- [ ] Memoize heavy chart components (verify)
- [ ] Lazy-load heavy modules if needed

**Visual Verification:**
- [ ] No plain tables visible
- [ ] All cards have hover effects
- [ ] All numbers have context/trend indicators
- [ ] Action items are prominent
- [ ] Coaching language (not accusatory)
- [ ] Dark theme throughout
- [ ] Glows and gradients applied
- [ ] "Wow factor" achieved

**Status:** PENDING - Final verification step

---

## SUMMARY

**Total Remaining Items:** ~12

**Critical Path:**
1. Implement /time page (8 items)
2. Add count-up animations (1 item)
3. Verify no plain tables (1 item)
4. Final QA pass (1 item)
5. Create final report (1 item)

**Estimated Completion:** After /time page implementation

---

## NOTES

- **Data Availability:** All components must handle missing data gracefully with premium empty states
- **Coaching Language:** Use positive framing throughout
- **Visual Consistency:** All pages must match /dashboard styling
- **Performance:** Memoize charts, lazy-load if needed

---

**Last Updated:** 2025-12-31  
**Next Action:** Implement /time page
