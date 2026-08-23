# TICKET-017: Identify Flow (Skeleton → Identified)

**Feature:** [FEA-007: Manual Logging and Identification](../../features/FEA-007-manual-logging-identification.md)

## Goal
Allow users to identify skeleton media items by searching a metadata provider and linking the result, with a background job to sync TV episodes.

## Scope
- `IdentifyController` (or extend `CollectionController`):
  - `GET /collection/:type/:id/identify` — renders the identify panel (or HTMX partial)
  - `GET /collection/:type/:id/identify/search?q={query}` — HTMX partial: provider search results
  - `POST /collection/:type/:id/identify` — body: `{ provider, externalId }`; runs identification; redirects to item detail page
- **Ownership check (server-side, not just UI)**: before any identify action, verify that `mediaItem.isSkeleton === true` AND `mediaItem.createdByUserId === currentUser.id`. Return 403 otherwise. This must be enforced in the controller, not just by hiding the button in the UI.
- `IdentificationService.identify(mediaItemId, provider, externalId, userApiKey?)`:
  1. Fetch metadata from the provider via `MetadataService`
  2. Update `MediaItem`: `title`, `sortTitle`, `description`, `imageUrl`, `year`, `duration`, `isSkeleton = false`, `createdByUserId = null`
  3. Upsert `MediaExternalId` for the provider
  4. Ensure the original skeleton title exists as a `MediaAlias` (call `MediaService.addAlias`)
  5. If type is `TV_SHOW`: fire-and-forget `EpisodeSyncService.syncShow(...)` (do not await)
  6. Return the updated `MediaItem`
- View/partial: `views/partials/identify-panel.hbs`

## UI Behaviour
- "Identify" button on skeleton item cards (collection browser) and on skeleton item detail pages
- Clicking opens an inline panel (HTMX swap) with a search input
- Provider is determined by the item's `type` (same logic as add form)
- Search fires at 3+ characters, debounced 300ms
- Results list: each result shows poster, title, year; clicking one submits `POST /collection/:type/:id/identify`
- While TV episode sync runs in the background, the page does not wait for it — the user is redirected immediately

## Alias Preservation
- The normalised version of the original skeleton title must remain as a `MediaAlias` so future API submissions with the same title continue to match the now-identified item

## Acceptance Criteria
- [ ] Identify panel opens via HTMX without a full page reload
- [ ] Search queries the correct provider for the item type
- [ ] On confirm: `MediaItem` updated with real metadata, `isSkeleton` set to `false`
- [ ] Original skeleton title preserved as a `MediaAlias`
- [ ] TV show identification triggers episode sync asynchronously (response is not delayed)
- [ ] After identification, user is redirected to `/collection/:type/:id`
- [ ] Non-skeleton items do not show the Identify button
- [ ] A user attempting to identify a skeleton they did not create receives 403 (server enforced, not just UI hidden)
