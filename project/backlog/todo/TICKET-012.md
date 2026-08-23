# TICKET-012: Dashboard Page

**Feature:** [FEA-005: Activity Views and Insights](../../features/FEA-005-activity-views-insights.md)

## Goal
Render the home dashboard showing the last 7 days of activity and a quick stats summary.

## Scope
- `DashboardController`:
  - `GET /` — renders dashboard for authenticated user
- Queries:
  - Last 7 days of log entries via `LogService.findByUser` (dateFrom: 7 days ago)
  - Apply `LogService.groupByDay` to produce day sections
  - Quick stats: total minutes per media type for the past 7 days, total session count
- **Caching**: check `AppCacheService` for key `dashboard:{userId}` (TTL 5 min) before querying DB; populate cache on miss
- View: `views/pages/dashboard.hbs`
- Reuses `views/partials/history-days.hbs` for the day list section

## Layout
- Quick stat cards at the top (one per media type with any activity, plus total sessions)
- Day-grouped activity list below (same display as TICKET-011)
- "View full history →" link to `/history`
- "Add entry →" button linking to `/add`

## Empty State
- New user with no entries: show a welcome message with a clear call-to-action to `/add`
- Stat cards omitted when there is no data

## Acceptance Criteria
- [ ] Dashboard shows only the last 7 days of the authenticated user's entries
- [ ] Quick stat cards show correct totals per media type
- [ ] Day list uses the same grouped format as the history page
- [ ] Empty state shown for users with no activity
- [ ] "View full history" and "Add entry" links are present
