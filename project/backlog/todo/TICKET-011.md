# TICKET-011: History Page

**Feature:** [FEA-005: Activity Views and Insights](../../features/FEA-005-activity-views-insights.md)

## Goal
Render the full chronological day-by-day activity timeline with music grouping and HTMX pagination.

## Scope
- `HistoryController`:
  - `GET /history?page={n}` — full timeline, 30 days per page
  - `GET /history/partial?page={n}` — HTMX partial returning only the day list (for "load more")
- Calls `LogService.findByUser` then `LogService.groupByDay`
- **Caching**: check `AppCacheService` for key `history:{userId}:{page}` (TTL 5 min) before querying DB; populate cache on miss
- View: `views/pages/history.hbs`
- Partial: `views/partials/history-days.hbs` (the day list, reused by both routes)

## Day Group Display
Each day section shows:
- Date heading (e.g. "Friday, 22 August 2026")
- One row per log entry (non-music types)
- One grouped row for music tracks (if any on that day)

## Entry Row Display Per Type
| Type | Displayed Fields |
|---|---|
| MOVIE | Poster thumbnail, title, duration watched |
| TV_EPISODE | Show title + "S01E03 — Episode Title", duration |
| GAME | Cover thumbnail, title, platform badge, duration |
| BOARD_GAME | Title, player count, won/lost badge, duration (if set) |
| MUSIC (grouped) | Music note icon, "{n} tracks · {totalDuration} min" |

- Each entry (except music group) links to `/collection/:type/:id`
- Clicking the music group could link to `/history?date=YYYY-MM-DD` filtered view (future; for now, no link)

## Pagination
- "Load more" button at bottom of list
- HTMX: `hx-get="/history/partial?page=2"`, `hx-target="#history-list"`, `hx-swap="beforeend"`
- Button hidden when no more pages exist

## Empty State
- Render `views/partials/empty-history.hbs` when user has no log entries

## Acceptance Criteria
- [ ] Entries displayed newest-first, grouped by calendar day
- [ ] Music tracks on the same day collapsed into a single grouped row
- [ ] "Load more" appends the next page of days without a full page reload
- [ ] Button hidden when all days have been loaded
- [ ] Empty state rendered for users with no entries
- [ ] Each non-music entry links to the correct media item detail page
