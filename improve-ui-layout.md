# Improve UI/UX Layout Plan

## Goal
Improve the overall UI/UX layout of the ERP Raupp system to feel modern, sleek, and premium, adhering to the frontend-specialist guidelines (no purple, sharp modern geometry, Lucide React icons, and cohesive typography) while maintaining the original Raupp logo.

## Tasks
- [x] Task 1: Add typography imports and configure v4 theme variables in [src/index.css](file:///home/kayke/Projetos/erp-raupp-/src/index.css) → Verify: Build compiles and font-family changes to 'Outfit' / 'Inter'
- [x] Task 2: Replace navigation emojis with SVG icons from `lucide-react` in [src/pages/Dashboard.tsx](file:///home/kayke/Projetos/erp-raupp-/src/pages/Dashboard.tsx) → Verify: Navigation renders Lucide icons correctly
- [x] Task 3: Redesign the sidebar and header to integrate the logo cleanly without hard white borders, and add smooth hover states → Verify: Sidebar looks cohesive with modern transition delays
- [x] Task 4: Upgrade the metrics/indicator cards (remove emojis, style high-contrast status pills, add scale-up micro-interactions) in [src/pages/Dashboard.tsx](file:///home/kayke/Projetos/erp-raupp-/src/pages/Dashboard.tsx) → Verify: Dashboard KPIs look premium and react to hover
- [x] Task 5: Audit design across other module lists using standard layout variables → Verify: Pages compile and render with consistent typography and borders

## Done When
- Dashboard looks premium, has active micro-animations, correct brand colors matching the logo, and modern Lucide icons.
- No purple or indigo is used.
- Project builds successfully.
