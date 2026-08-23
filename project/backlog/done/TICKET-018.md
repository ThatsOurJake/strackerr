# TICKET-018: Global Search

**Feature:** [FEA-004: App Shell and Search](../../features/FEA-004-app-shell-search.md)

## Goal
Implement user-scoped global search with exact/prefix matching and Fuse.js fuzzy fallback, accessible from the nav bar and a dedicated results page.

## Scope
- `SearchController`:
  - `GET /search?q={query}` — full search results page
  - `GET /search/partial?q={query}` — HTMX partial: top 5 quick results for the nav dropdown
- `SearchService`:
  - Per-user Fuse index cache: `Map<userId, { index: Fuse, builtAt: Date }>`
  - `getIndex(userId)` — returns cached index if present and `builtAt < 10 minutes ago`; otherwise rebuilds from DB and caches it
  - `@OnEvent(Events.MEDIA_ITEM_CHANGED)` listener — deletes the cached index for `event.userId` so next search triggers a rebuild
  - `search(userId, query)`:
    1. Call `getIndex(userId)` to get (or build) the Fuse index for this user
    2. Run Fuse.js with keys `['title', 'aliases.alias']` and threshold `0.4`
    3. Deduplicate and rank: exact/prefix matches first, fuzzy matches appended
    4. Group final results by `MediaType`
    5. Return max 50 total results

## Index Build Query
Same as before — `DISTINCT MediaItem` via `LogEntry.userId = userId` UNION items where `createdByUserId = userId`, including all `MediaAlias` records. Result stored in a Fuse instance in the cache map.
- Views:
  - `views/pages/search.hbs` — full results page grouped by type
  - `views/partials/search-dropdown.hbs` — top 5 results for nav dropdown

## Security
- All queries scoped to `userId` — structurally impossible to return another user's items
- Index cache is keyed by `userId`; each user only ever receives their own index
- TTL of 10 minutes ensures stale data cannot persist indefinitely even if an event is missed

## Dependencies
- TICKET-032 (event foundation) must be complete

## Dependencies
- `fuse.js` package

## Search Results Display

### Full Results Page (`/search`)
- Heading: "Results for '{query}'"
- Sections per media type (only types with matches shown)
- Each result: poster/icon, title, type badge, link to `/collection/:type/:id`
- Empty state: "No results found for '{query}'"

### Nav Dropdown (`/search/partial`)
- Top 5 results regardless of type
- Each result: title + type badge, links to detail page
- "See all results →" link to `/search?q={query}` at bottom

## Acceptance Criteria
- [ ] Search returns no results from other users' data
- [ ] Typo tolerance works (e.g. `"Severence"` finds `"Severance"`)
- [ ] Alias matching works (a skeleton title finds the now-identified item after it has been identified)
- [ ] Adding or identifying a media item invalidates the user's cached index (next search rebuilds)
- [ ] Cached index used on subsequent searches without hitting the DB again
- [ ] Index older than 10 minutes is automatically rebuilt
- [ ] Results grouped by media type on the full results page
- [ ] Nav dropdown appears after 300ms debounce with 3+ characters (wired in TICKET-009)
- [ ] Nav dropdown shows max 5 results + "See all" link
- [ ] Empty state rendered when no results found
