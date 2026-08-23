# TICKET-014: Collection Browser

**Feature:** [FEA-006: Collection and Media Detail](../../features/FEA-006-collection-media-detail.md)

## Goal
Render the browseable collection of the user's media items with type filters, an alphabetical sidebar, and an unidentified items filter.

## Scope
- `CollectionController`:
  - `GET /collection?type={type}&filter={unidentified}&letter={A}` — renders collection page
  - `GET /collection/partial?...` — HTMX partial returning only the item grid (for filter changes without full reload)
- Query: `DISTINCT` `MediaItem` records joined via the current user's `LogEntry` records, plus `MediaItem` records where `createdByUserId = userId`
- View: `views/pages/collection.hbs`
- Partial: `views/partials/collection-grid.hbs`

## Filters
- **Type**: All / Movie / TV Show / Game / Board Game / Music Track — renders as tab or pill buttons
- **Unidentified**: toggle to show only `isSkeleton: true` items
- **Letter**: A–Z + `#` (non-Latin/numeric, based on `sortTitle`)

Filters are additive. All filter state preserved in query params.

## Alphabetical Sidebar
- Letters A–Z + `#` listed vertically
- Clicking a letter adds `?letter=A` to query params and triggers HTMX partial reload
- Letters with no matching items shown dimmed (not hidden)
- `#` at the top of the list (for non-Latin and numeric titles)

## Sort Order
- Alphabetical by `sortTitle` ASC
- "The Office" → sorted under O

## Item Card Display
- Poster/cover image (fallback placeholder if no `imageUrl`)
- Title
- Type badge (e.g. "TV Show", "Game")
- Skeleton items: "Unidentified" badge (visual indicator) + "Identify" button that links to `/collection/:type/:id/identify`

## Pagination
- 48 items per page
- HTMX: pagination controls trigger partial reload

## Acceptance Criteria
- [ ] Only shows items belonging to the current user (via log entries or skeleton ownership)
- [ ] Type filter narrows results correctly; active filter visually indicated
- [ ] Unidentified filter shows only skeleton items with Identify CTA
- [ ] Alphabetical sidebar jumps to the correct letter section
- [ ] "The Office" appears under O, not T
- [ ] Non-Latin titles (e.g. Japanese) appear under `#`
- [ ] Filter changes reload only the grid via HTMX (no full page reload)
- [ ] Empty state shown when no items match the current filters
