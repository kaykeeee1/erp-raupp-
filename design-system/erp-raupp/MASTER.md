# Design System Master File - ERP Raupp

> **LOGIC:** When building or updating a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** ERP Raupp  
**Category:** Enterprise ERP & Outsourcing Dashboard  
**Base Mode:** Light Mode (Premium Corporate) with Dark Sidebar  

---

## Global Rules

### Color Palette

The color system is derived from the official Raupp logo (Blue and Orange), using high-contrast, professional tones.

| Role | Hex | Tailwind Utility | Usage |
|------|-----|------------------|-------|
| **Primary (Raupp Blue)** | `#2b539c` | `bg-blue-600` / `text-blue-600` | Brand identity, primary CTAs, sidebar |
| **Secondary (Dark Blue)**| `#1e3a6d` | `bg-blue-800` / `text-blue-800` | Hover states, active links, page titles |
| **Accent (Raupp Orange)**| `#ea580c` | `bg-orange-600` / `text-orange-600` | Notifications, highlight borders, warnings |
| **Success/Revenues**     | `#059669` | `bg-emerald-600` / `text-emerald-600` | Financial inflows, positive metrics, READY status |
| **Critical/Expenses**    | `#dc2626` | `bg-rose-600` / `text-rose-600` | Financial outflows, stock alerts, errors |
| **Neutral Background**   | `#f8fafc` | `bg-slate-50` | Body page background |
| **Neutral Text**         | `#0f172a` | `text-slate-900` | Body text |
| **Muted Text**           | `#475569` | `text-slate-600` | Subtitles, labels, descriptions |

---

### Typography

- **Heading Font:** Outfit (Inter fallback) — Mood: modern, premium, geometric, polished.
- **Body Font:** Inter — Mood: highly readable, clean, corporate.
- **Google Fonts Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap');
```

---

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `space-xs` | `4px` / `0.25rem` | Inner input padding, tiny element spacing |
| `space-sm` | `8px` / `0.5rem` | Icon + text gaps, badge margins |
| `space-md` | `16px` / `1rem` | Standard padding of tables, small cards |
| `space-lg` | `24px` / `1.5rem` | Large card padding, page container gutters |
| `space-xl` | `32px` / `2rem` | Space between sections, grid layouts |

---

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Table rows, buttons |
| `shadow-premium` | `0 10px 25px -5px rgba(43,83,156,0.05), 0 8px 10px -6px rgba(43,83,156,0.05)` | Dashboard KPI cards (slight blue undertone) |
| `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1)` | Modals (XmlUploadModal) |

---

## Component Specs

### 1. Primary Buttons
```html
<button class="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm font-semibold text-xs rounded-lg cursor-pointer flex items-center space-x-1.5 uppercase tracking-wide">
  <span>+ Ação</span>
</button>
```

### 2. Cards (Indicator/KPI)
```html
<div class="bg-white p-6 rounded-xl border border-slate-200/80 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
  <!-- Content -->
</div>
```

### 3. Inputs & Forms
```html
<input 
  type="text" 
  name="nome" 
  autocomplete="off"
  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors"
/>
```

---

## Style Guidelines

* **Floating Logo Capsule**: The brand logo on the sidebar is contained in a floating card/capsule with a white background, accommodating the white background of the image file cleanly.
* **Layout Design**: Dual pane sidebar-centric. Sidebar in deep dark gray/slate (`bg-slate-900` or `#0f172a`), main page background in clean off-white (`bg-slate-50`).

---

## Anti-Patterns (Do NOT Use)

* ❌ **Emojis as main navigation/UI icons** — Use Lucide React SVG icons.
* ❌ **Purple, Violet, Indigo or Magenta colors** — Banned by design guidelines.
* ❌ **Transition-all** — Use specific `transition-colors`, `transition-transform` or `transition-opacity` for performance.
* ❌ **Numeric listings without tabular font** — Always use `tabular-nums` class on numeric data.
* ❌ **Inputs without labels or accessibility equivalents** — Use `<label>` or `aria-label`.
