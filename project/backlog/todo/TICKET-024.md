# TICKET-024: TV Show Episode Sync Background Job

**Feature:** [FEA-009: Media Enrichment Jobs and Images](../../features/FEA-009-media-enrichment-jobs-images.md)

## Goal
Implement the async background job that fetches and caches all seasons and episodes for a TV show after it is identified, and re-links any orphaned log entries.

## Scope
- `EpisodeSyncService`:
  - `syncShow(mediaItemId, provider, externalId, userApiKey?)` — async handler
  - `@OnEvent(Events.SHOW_IDENTIFIED)` listener that calls `syncShow` with the event payload
- Triggered by `IdentificationService` emitting a `ShowIdentifiedEvent` — `EpisodeSyncService` has no direct dependency on `IdentificationService`

## Dependencies
- TICKET-032 (event foundation) must be complete

## Sync Algorithm

1. Fetch show metadata via `IMetadataProvider.getById(externalId)` to get season count
2. For each season (1 to `seasonCount`):
   a. Call `IMetadataProvider.getEpisodes(externalId, seasonNumber, userApiKey)`
   b. For each episode returned, upsert a `MediaItem` record:
      - `type: TV_EPISODE`
      - `parentId: mediaItemId` (the show)
      - `seasonNumber`, `episodeNumber`
      - `title`, `description`, `duration`, `isSkeleton: false`
      - Upsert key: `(parentId, seasonNumber, episodeNumber)` — do not create duplicates
   c. If the episode has an `imageSourceUrl`: emit `Events.IMAGE_CACHE` with `{ mediaItemId: episode.id, sourceUrl }` — the `ImageCacheService` queue handles it asynchronously
3. Re-link orphaned log entries:
   - Find `LogEntry` records where `mediaItem.isSkeleton = true` AND `mediaItem.parentId = mediaItemId`
   - For each: match to the newly upserted canonical episode by `(seasonNumber, episodeNumber)`
   - If match found: update `LogEntry.mediaItemId` to the canonical episode id
   - Delete the now-orphaned skeleton episode `MediaItem`
4. Log sync completion (or errors) via NestJS `Logger` — not surfaced to the user

## Error Handling
- Provider errors during sync (rate limit, network): log warning and continue to next season/episode
- Partial sync is acceptable — re-running identification would trigger sync again
- Do not throw — this runs in the background and must not crash the server

## Acceptance Criteria
- [ ] `EpisodeSyncService` is triggered by `show.identified` event, not called directly
- [ ] After identifying a TV show, `MediaItem` records are created for all seasons and episodes
- [ ] Upsert: calling `syncShow` twice does not create duplicate episode records
- [ ] Orphaned skeleton episode log entries are re-linked to canonical episode records
- [ ] Orphaned skeleton episode `MediaItem` records deleted after re-linking
- [ ] Sync runs asynchronously — the `POST /identify` response is returned before sync completes
- [ ] Each episode with an image URL emits an `IMAGE_CACHE` event (not downloaded inline)
- [ ] Provider errors are logged and do not crash the process
