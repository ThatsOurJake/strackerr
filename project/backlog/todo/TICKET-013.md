# TICKET-013: Stats Page

**Feature:** [FEA-005: Activity Views and Insights](../../features/FEA-005-activity-views-insights.md)

## Goal
Render the statistics page with time breakdowns per media type, an activity chart, and a top items list — scoped to a set of predefined time periods.

## Predefined Periods
Stats are scoped to one of these fixed slugs only. Unrecognised slugs redirect to `this-year`.

| Slug | Label | Date Range |
|---|---|---|
| `this-week` | This week | Monday → today |
| `last-week` | Last week | previous Mon–Sun |
| `last-30-days` | Last 30 days | rolling |
| `last-3-months` | Last 3 months | rolling |
| `last-6-months` | Last 6 months | rolling |
| `this-year` | This year | Jan 1 → today |
| `last-year` | Last year | full previous calendar year |
| `all-time` | All time | no date filter |

## Scope
- `StatsController`:
  - `GET /stats?period={slug}` — defaults to `this-year`; redirects to `this-year` on unrecognised slug
- `StatsService` methods:
  - `resolveDateRange(slug)` — returns `{ from: Date, to: Date } | null` (null = all-time)
  - `totalTimeByType(userId, range)` — returns `{ [MediaType]: minutes }` map
  - `activityChart(userId, slug, range)` — returns chart data (see chart logic below)
  - `topItems(userId, range, limit = 10)` — returns `{ mediaItem: MediaItem, totalMinutes: number }[]` ordered DESC
- **Caching**: check `AppCacheService` for key `stats:{userId}:{slug}` (TTL 15 min) before running aggregation queries; populate on miss. Max 8 cache entries per user — no cache explosion possible.
- View: `views/pages/stats.hbs`

## Page Sections

### Time Per Media Type
- Horizontal bar per type with any activity
- Shows hours and minutes (e.g. "4h 35m")
- Types with zero activity hidden

### Activity Chart
Chart type varies by period — rendered with ECharts:

| Period | Chart Type | X-Axis |
|---|---|---|
| `this-week`, `last-week` | Bar chart | Days (Mon–Sun) |
| `last-30-days` | Bar chart | Days |
| `last-3-months`, `last-6-months` | Bar chart | Weeks |
| `this-year`, `last-year` | Bar chart | Months (Jan–Dec, 12 columns) |
| `all-time` | Bar chart | Years |

All bars flat colour (no gradients), no grid lines, ECharts tooltip styled to match `bg-elevated`.

### Top Items
- Top 10 media items by total time in the selected period
- Shows: poster/icon, title, type badge, total duration
- Each links to `/collection/:type/:id`

### Period Selector
- Row of 8 pill/tab buttons, one per slug
- Active period visually highlighted
- Clicking reloads the page with `?period={slug}`

## Acceptance Criteria
- [ ] All stats reflect only the authenticated user's data
- [ ] All 8 period slugs produce correct date-scoped results
- [ ] Unrecognised `?period=` value redirects to `this-year`
- [ ] Activity chart type matches the period (days / weeks / months / years)
- [ ] Caching uses the slug as the key — no unbounded cache growth
- [ ] Empty state shown when user has no entries for the selected period
- [ ] Top items link to the correct media item detail pages
