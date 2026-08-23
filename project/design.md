# STrackerr — Design System

> This file is the design reference for every UI ticket. All Handlebars views must follow these conventions. When in doubt, default to dark mode appearance first.

---

## Guiding Principles

- **Colour leads.** Bold flat colour blocks carry the visual identity — not shadows, gradients, or glassmorphism. No drop shadows except where strictly necessary for legibility.
- **Dark mode is primary.** Design dark first, adapt to light. Both modes must feel intentional, not inverted.
- **Data-dense but not cramped.** The app holds a lot of information. Favour consistent spacing and tight-but-readable rows over excessive padding.
- **Cover art supports, never leads.** Not every item has artwork. The layout must look designed whether or not a thumbnail is present.
- **Icons replace words where the meaning is unambiguous.** Clock for duration, calendar for date, etc.

---

## Typography

### Fonts
Import both from Google Fonts in the base layout `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
```

| Role | Font | Weights |
|---|---|---|
| Headings, labels, UI chrome | **Syne** | 700, 800 for display; 600 for sub-headings |
| Body, metadata, form fields | **DM Sans** | 400 regular; 500 medium |

### Tailwind Config
```js
fontFamily: {
  heading: ['Syne', 'sans-serif'],
  body: ['DM Sans', 'sans-serif'],
}
```

### Scale

| Token | Size | Font | Weight | Usage |
|---|---|---|---|---|
| `display` | 2rem / 32px | Syne | 800 | Page titles, stat numbers |
| `heading` | 1.25rem / 20px | Syne | 700 | Section headings, card titles |
| `subheading` | 1rem / 16px | Syne | 600 | Day date headers, labels |
| `body` | 0.875rem / 14px | DM Sans | 400 | Card content, descriptions |
| `meta` | 0.75rem / 12px | DM Sans | 400 | Timestamps, secondary info |
| `badge` | 0.6875rem / 11px | Syne | 600 | Badges, type labels |

### Rules
- Line clamping: card titles clamped to 1 line (`line-clamp-1`), descriptions to 2 lines (`line-clamp-2`)
- No italic body text
- Letter spacing: headings `tracking-tight`, badges `tracking-wide uppercase`

---

## Colour System

### Media Type Accent Colours
Each type has one accent colour used for: left card bar, type badges, stat charts, icons, and active states.

| Type | Name | Hex | Tailwind Custom Token |
|---|---|---|---|
| Movie | Amber | `#F59E0B` | `type-movie` |
| TV Show | Electric Blue | `#3B82F6` | `type-tv` |
| Game | Acid Green | `#22C55E` | `type-game` |
| Board Game | Coral | `#F97316` | `type-boardgame` |
| Music Track | Hot Pink | `#EC4899` | `type-music` |

### Dark Mode Palette (primary)

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#111111` | Page background |
| `bg-surface` | `#1A1A1A` | Cards, sidebar |
| `bg-elevated` | `#242424` | Dropdowns, hover states, tooltips |
| `text-primary` | `#F0EDE8` | Warm off-white; all primary text |
| `text-secondary` | `#9CA3AF` | Muted labels, secondary metadata |
| `text-muted` | `#6B7280` | Disabled, placeholder |
| `border` | `#2C2C2C` | Subtle dividers and card borders |

### Light Mode Palette

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#F5F2EC` | Warm cream page background |
| `bg-surface` | `#FFFFFF` | Cards, sidebar |
| `bg-elevated` | `#EDE9E2` | Hover states |
| `text-primary` | `#111111` | All primary text |
| `text-secondary` | `#4B5563` | Muted labels |
| `text-muted` | `#9CA3AF` | Disabled, placeholder |
| `border` | `#DDD8CF` | Dividers and card borders |

### Tailwind Config
```js
colors: {
  'type-movie':      '#F59E0B',
  'type-tv':         '#3B82F6',
  'type-game':       '#22C55E',
  'type-boardgame':  '#F97316',
  'type-music':      '#EC4899',
  'bg-base':        { DEFAULT: '#111111', light: '#F5F2EC' },
  'bg-surface':     { DEFAULT: '#1A1A1A', light: '#FFFFFF' },
  'bg-elevated':    { DEFAULT: '#242424', light: '#EDE9E2' },
  'text-primary':   { DEFAULT: '#F0EDE8', light: '#111111' },
  'text-secondary': { DEFAULT: '#9CA3AF', light: '#4B5563' },
  'border-subtle':  { DEFAULT: '#2C2C2C', light: '#DDD8CF' },
}
```

---

## Dark Mode Implementation

- Strategy: Tailwind `class` mode — `dark` class on `<html>`
- Toggled by an inline script in `<head>` (before first paint) reading `localStorage.getItem('theme')`
- Default: `dark` if no preference stored
- Every surface uses both a dark and light value: `bg-[#1A1A1A] dark:bg-[#1A1A1A]` — or use the semantic tokens above with `dark:` prefix

---

## Spacing

Tailwind's default scale is used. Key values:

| Use | Value |
|---|---|
| Card inner padding | `p-4` (16px) |
| Card gap in feed | `gap-3` (12px) |
| Section gap | `gap-6` (24px) |
| Page horizontal padding | `px-6` desktop, `px-4` mobile |
| Sidebar width | `w-56` (224px) |
| Left colour bar on cards | `w-1.5` (6px) |
| Thumbnail size (history card) | `w-10 h-14` for portrait (movie/TV), `w-10 h-10` for square (game, music) |

---

## Component Patterns

### History Feed Card

The card for a single log entry in `/history` and `/`:

```
┌─[colour bar 6px]──────────────────────────────────────[thumbnail]─┐
│ [type icon]  Title                              [poster/cover 40px]│
│              Subtitle (e.g. S01E03 — Ep Title)                     │
│              [🕐 45 min]  [platform badge if game]                 │
└────────────────────────────────────────────────────────────────────┘
```

- Left edge: 6px solid bar in the type accent colour (`rounded-l-lg` on full card)
- Type icon: 16px icon in the accent colour, left of title
- Title: `heading` size, `line-clamp-1`
- Subtitle (TV episode name, game platform, music artist): `body` size, `text-secondary`, `line-clamp-1`
- Metadata row: icon + text pairs, `meta` size, `text-secondary` — clock icon + duration
- Thumbnail: fixed size, `object-cover`, `rounded`; if absent, show a placeholder block in the accent colour with the type icon centred in white
- Card background: `bg-surface`, `rounded-lg`, `border border-border-subtle`
- No drop shadow in dark mode. Optional very subtle shadow in light mode: `shadow-sm`

### Music Group Card (history feed)
Collapsed music entries for a day:

```
┌─[hot pink bar]────────────────────────────────────────────────────┐
│ [♪ icon]  12 tracks                                               │
│           [🕐 47 min]                                             │
└───────────────────────────────────────────────────────────────────┘
```

- Same card pattern but no thumbnail slot

### Day Header (history feed)

```
Friday, 22 August 2026                          [🕐 2h 15m total]
────────────────────────────────────────────────────────────────────
[🎬 1h 10m] [🎮 1h 5m]                ← media type breakdown icons
```

- Date: `subheading` font
- Total: `meta` size, `text-secondary`, clock icon, right-aligned
- Media type breakdown: small icon per type + duration, only types with activity shown
- Divider below: `border-border-subtle`

### Type Badge

Pill-shaped label used on cards and collection items:

```
bg: type accent colour at 15% opacity
text: type accent colour
border: type accent colour at 40% opacity
font: badge scale (Syne 600, uppercase, tracking-wide)
border-radius: rounded-full
padding: px-2 py-0.5
```

### Skeleton / Unidentified Badge

```
bg: bg-elevated
text: text-secondary
border: border-subtle dashed
label: "UNIDENTIFIED"
```

---

## Navigation (Sidebar)

- Width: `w-56` (224px) on `≥ md`; hidden on mobile (slide-out drawer on hamburger)
- Background: `bg-surface` with a 1px right border `border-border-subtle`
- No heavy visual treatment — the sidebar is invisible when not needed
- Logo / app name at top: "STrackerr" in Syne 800, accent colour or `text-primary`
- Nav items: icon (20px) + label (`body` size), `py-2 px-3`, `rounded-lg` on hover/active
- Active state: `bg-elevated` background + the link text in `text-primary` (no accent colour override — keep it neutral)
- Admin link: shown only to admins, separated by a subtle divider at the bottom of the list
- Dark mode toggle: icon button at the bottom of the sidebar (sun/moon)

---

## Stats & Charts

### Chart Library
**Apache ECharts** — loaded via CDN in the base layout. Use `echarts.init()` on chart container divs with data injected via Handlebars template variables.

### Waffle Chart
Used for: time per media type, proportional breakdowns.

- Grid of equal squares, coloured by type accent
- Each square = a fixed unit (e.g. 1% or 30 min)
- Rendered via ECharts custom series or plain CSS grid (CSS grid preferred for simplicity — a `10×10` grid of `<div>` squares, each coloured by type, generated server-side by Handlebars)
- Square size: `w-4 h-4`, `gap-0.5`
- Legend below: type icon + label + total time

### Monthly Activity Chart
Bar chart per month, Jan–Dec. Rendered with ECharts.

- Bars filled with a bold flat colour (use `text-primary` colour on dark mode, or mix type colours if multi-type stacking is added later)
- No grid lines — just the bars against the background
- Month labels: `meta` size below each bar
- Tooltip: ECharts default, styled to match `bg-elevated` and `text-primary`

### General Chart Rules
- No gradients inside bars/areas
- No chart borders or outer frames
- Tooltips: `bg-elevated` background, `text-primary` text, `border border-border-subtle`
- Animation: enabled but kept short (300ms ease-out)

---

## Imagery & Fallbacks

- Posters (movies, TV): `w-10 h-14` (`aspect-[2/3]`), `object-cover rounded`
- Square covers (games, board games, music): `w-10 h-10`, `object-cover rounded`
- Fallback (no `imageUrl` or load error): a block in the item's type accent colour at 20% opacity, type icon centred in the accent colour, same dimensions as the thumbnail slot
- Never stretch or distort images — `object-cover` always

---

## Icons

Use a single icon set throughout. **Lucide Icons** (free, tree-shakeable, clean line icons) loaded via CDN or npm.

Key icon mappings:

| Meaning | Lucide Icon |
|---|---|
| Duration / time | `clock` |
| Date | `calendar` |
| Movie | `film` |
| TV Show / Anime | `tv-2` |
| Game | `gamepad-2` |
| Board Game | `dice-5` |
| Music | `music` |
| Platform (generic) | `monitor` |
| Won | `trophy` |
| Lost | `x-circle` |
| Unidentified | `help-circle` |
| Search | `search` |
| Settings | `settings` |
| Admin / Users | `users` |
| Add | `plus` |
| Logout | `log-out` |
| Regenerate | `refresh-cw` |
| Dark mode | `moon` |
| Light mode | `sun` |

Icon size: `16px` inline with text (`w-4 h-4`), `20px` in navigation (`w-5 h-5`).

---

## Interactive States

- **Hover**: `bg-elevated` background on clickable rows/cards
- **Focus-visible**: `outline-2 outline-offset-2` in the nearest type accent colour, or `outline-text-primary` for non-typed elements
- **Active/pressed**: slight scale `scale-[0.98]` on buttons
- **Disabled**: `opacity-40 cursor-not-allowed`
- **Loading (HTMX)**: `htmx-indicator` spinner — a small animated spinner using the type accent colour (or neutral if no type context), shown inline near the triggering element

---

## Forms

- Input fields: `bg-elevated border border-border-subtle rounded-lg px-3 py-2`, `body` size
- Focus ring: `focus:outline-none focus:ring-2 focus:ring-type-{type}` (or a neutral ring if no type context)
- Labels: `subheading` size, `text-secondary`, `mb-1`
- Error state: `border-red-500` + small error message below in `meta` size, `text-red-400`
- Buttons:
  - Primary: solid type accent colour background, dark text or white depending on contrast, Syne 600
  - Secondary: `bg-elevated border border-border-subtle`, `text-primary`
  - Danger: `bg-red-600` text white

---

## Page Titles

Format: `STrackerr — {Page Name}` in every `<title>` tag. Syne 800 display heading at the top of each page content area (below nav).
