# HTX TAP Analytics - Brand Design System

## Overview
This document defines the canonical brand specifications for each client's dashboard theme. All UI components should reference this file for color palettes, typography, spacing, and visual rules.

---

## Melrose
**Mood:** Moody Architectural

### Color Palette
- **Background:** `#0C0C0C` (near-black)
- **Surface:** `#1E1E1E` (dark gray)
- **Text:** `#FAFAFA` (off-white)
- **Muted Text:** `#A1A1AA` (gray-400)
- **Primary:** `#CE8C71` (warm terracotta)
- **Secondary:** `#F1E0CC` (warm cream)

### Visual Rules
- **Border Radius:** `20px` (rounded-2xl)
- **Glow Effect:** `0 0 15px #CE8C71` (primary color glow)
- **Shadow:** Soft, subtle shadows
- **Typography:** Clean, architectural sans-serif
- **Spacing:** Generous whitespace

### Usage Notes
- Use primary color for accents, CTAs, and active states
- Secondary color for subtle highlights and secondary actions
- Maintain high contrast for readability on dark background

---

## Fancy's HTX
**Mood:** Art Deco Red & Onyx

### Color Palette
- **Background:** `#050505` (near-black, darker than Melrose)
- **Surface:** `#1A1A1A` (dark gray)
- **Text:** `#F5F5F0` (warm off-white)
- **Muted Text:** `#787878` (medium gray)
- **Primary:** `#A61A1A` (deep red)
- **Secondary:** `#D4AF37` (gold)
- **Card Border:** `#D4AF37` (gold accent)

### Visual Rules
- **Border Radius:** `4px` (rounded-sm, sharp corners)
- **Shadow:** Harder, more defined shadows
- **Border Style:** Gold borders on cards for art deco feel
- **Typography:** Bold, geometric (art deco influence)
- **Spacing:** Tighter, more structured

### Usage Notes
- Gold borders on cards create art deco aesthetic
- Deep red for primary actions and highlights
- Maintain sharp, geometric feel throughout

---

## Best Regards
**Mood:** Garden Chic

### Color Palette
- **Background:** `#0F1C18` (dark green-black)
- **Surface:** `#1B332D` (dark green-gray, night mode)
- **Text:** `#FFFFFF` (pure white)
- **Muted Text:** `#A8BDB5` (sage green-gray)
- **Primary:** `#2E5C55` (forest green)
- **Secondary:** `#C5A059` (warm gold)
- **Accent:** `#F4C2C2` (soft pink)
- **Background Pattern Opacity:** `0.05` (subtle pattern overlay)

### Visual Rules
- **Border Radius:** `12px` (rounded-xl, organic feel)
- **Shadow:** Soft, natural shadows
- **Background Pattern:** Optional subtle pattern at 5% opacity
- **Typography:** Elegant, organic serif/sans-serif mix
- **Spacing:** Balanced, natural flow

### Usage Notes
- Forest green for primary actions
- Warm gold for secondary highlights
- Soft pink accent for special elements
- Maintain organic, garden-inspired aesthetic

---

## Theme Application Rules

1. **Automatic Selection:** Theme is determined by `clientId` from the API response
2. **No User Override:** Themes are locked to client accounts
3. **Fallback:** Unknown clients default to "default" theme (system colors)
4. **CSS Variables:** All themes use CSS custom properties for maintainability
5. **Component Consistency:** All components should respect theme variables

---

## Implementation Notes

- Themes are applied via `data-client-theme` attribute on root container
- CSS variables are scoped per theme using attribute selectors
- Components reference variables, not hardcoded colors
- New clients can be added by extending this spec and adding CSS variables
