# TICKET-015: Media Item Detail Page

**Feature:** [FEA-006: Collection and Media Detail](../../features/FEA-006-collection-media-detail.md)

## Goal
Render per-item detail pages showing metadata, personal stats, and session history — with a dedicated TV show view that lists all seasons and episodes.

## Scope
- `CollectionController` (extend):
  - `GET /collection/:type/:id` — renders the appropriate detail view based on type
- Query: `MediaItem` by id + all `LogEntry` records for `(userId, mediaItemId)` + for TV shows, all child episode `MediaItem` records
- Security: return 403 if user has no log entries for this item and did not create it as a skeleton
- Views (one per type):
  - `views/pages/collection/movie.hbs`
  - `views/pages/collection/tv-show.hbs`
  - `views/pages/collection/game.hbs`
  - `views/pages/collection/board-game.hbs`
  - `views/pages/collection/music-track.hbs`

## Display Per Type

### Movie
- Poster, title, year, description
- Total times watched, total duration watched
- Session log: each entry shows date + duration watched

### TV Show
- Banner/poster, title, year, description
- Show-level summary: total episodes watched (unique), total duration watched
- Seasons accordion (expand/collapse per season)
- Each season lists all episodes (from cached `MediaItem` children, including unwatched)
- Per-episode row: episode number, title, watch count, total duration watched
- Episodes never watched shown with watch count = 0 (greyed out or dimmed)
- No percentage progress displayed

### Game
- Cover, title, year, description
- Total sessions, total duration
- Session log: date, duration, platform badge

### Board Game
- Image, title, year, description
- Total sessions, total duration (if recorded)
- Session log: date, player count, won/lost badge, duration (if recorded)

### Music Track
- No cover (or MusicBrainz art if available), title, artist, duration
- Total plays, total duration
- Play log: date, duration

## Acceptance Criteria
- [ ] All five detail views render correctly with real data
- [ ] TV show page lists all cached episodes including unwatched ones
- [ ] Per-episode watch count and total duration are accurate
- [ ] User cannot access a detail page for items they have no connection to (403)
- [ ] Sessions displayed newest-first
- [ ] "Back to collection" navigation present
