# TICKET-016: Manual Add Form

**Feature:** [FEA-007: Manual Logging and Identification](../../features/FEA-007-manual-logging-identification.md)

## Goal
Implement the multi-step manual log entry add form with live metadata provider search and a manual fallback.

## Scope
- `AddController`:
  - `GET /add` — step 1: media type selection
  - `GET /add/form?type={type}` — HTMX partial: returns the search + entry form for the selected type
  - `GET /add/search?type={type}&q={query}` — HTMX partial: queries the relevant provider, returns results list
  - `POST /add/confirm` — HTMX partial: user has selected a provider result; returns pre-filled entry form
  - `POST /add` — final submission; creates MediaItem (if needed) + LogEntry; redirects to `/history`
- Views:
  - `views/pages/add.hbs` — type selection step
  - `views/partials/add-search-form.hbs` — search input + results area
  - `views/partials/add-search-results.hbs` — list of provider results (HTMX target)
  - `views/partials/add-entry-form.hbs` — log entry detail fields (date, duration, type-specific)

## Flow

### Step 1 — Type Selection
User selects: Movie / TV Show / Game / Board Game / Music Track
On selection: HTMX swaps in `add-search-form.hbs` for the chosen type

### Step 2 — Provider Search
- Input fires `GET /add/search?type=MOVIE&q=Severance` after 300ms debounce, 3+ chars
- Results rendered in `add-search-results.hbs`: poster, title, year, description
- If no provider key configured for a BYOK provider (TMDB, IGDB): show "No API key configured — [enter manually]" link
- "Enter manually" link swaps directly to the entry form with empty fields

### Step 3 — Entry Form
Triggered either by picking a provider result or choosing manual entry.
Fields shown depend on type:
| Type | Fields |
|---|---|
| All | Date (required, default today), Notes (optional) |
| MOVIE | Duration (optional; hint: "defaults to {runtime} min") |
| TV_EPISODE | Season number, episode number, duration (optional) |
| GAME | Duration (required), Platform (Steam/Epic/GOG/Xbox/PlayStation/Other) |
| BOARD_GAME | Duration (optional), Player count (optional), Did you win? (optional) |
| MUSIC_TRACK | Duration (optional; defaults from metadata) |

### Submission
- `POST /add` body: all form fields including `mediaItemId` (if provider result selected) or title fields (if manual)
- If `mediaItemId` provided:
  - Fetch the `MediaItem` from DB
  - If `isSkeleton === true`: verify `mediaItem.createdByUserId === currentUser.id`; if not, reject with 403
  - Otherwise use the identified MediaItem (shared catalog — any user may log against it)
- If manual: call `MediaService.findOrCreateSkeleton` with provided title and type
- Call `LogService.create(dto, userId, LogSource.MANUAL)`
- On success: redirect to `/history`
- On error: re-render form with inline error messages

## Acceptance Criteria
- [ ] Type selection swaps in the correct search form via HTMX
- [ ] Provider search fires after 300ms debounce with 3+ characters
- [ ] Selecting a provider result pre-fills the entry form with metadata
- [ ] "Enter manually" skips to an empty entry form
- [ ] Missing BYOK provider key shows a clear message and offers manual entry
- [ ] All type-specific fields present and validated on submission
- [ ] Successful submission creates a log entry and redirects to `/history`
- [ ] TV Episode entry for an unknown show creates a skeleton show + links the episode
