# TICKET-008: Log Entry Module

**Feature:** [FEA-002: Core Data Model](../../features/FEA-002-core-data-model.md)

## Goal
Implement log entry creation, retrieval, and type-specific validation with deduplication logic.

## Scope
- `LogModule` exporting `LogService`
- `LogService` methods:
  - `create(dto, userId, source: LogSource)` — validates per-type fields, runs deduplication check for API source, persists entry
  - `findByUser(userId, filters)` — paginated; filters: `dateFrom`, `dateTo`, `type`
  - `findByUserAndMediaItem(userId, mediaItemId)` — all entries for a specific item
  - `groupByDay(entries)` — groups entries by calendar date; collapses `MUSIC_TRACK` entries on the same day into a single group object
- `LogService.create` and `LogService.delete`: after persisting, emit `Events.LOG_ENTRY_CHANGED` with `{ userId }` to trigger cache invalidation (TICKET-033)

## Dependencies
- TICKET-032 (event foundation) must be complete so `LOG_ENTRY_CHANGED` event type is available

## Per-Type Field Validation
| Type | Required | Optional |
|---|---|---|
| MOVIE | `loggedAt` | `duration` (defaults to `mediaItem.duration`) |
| TV_EPISODE | `loggedAt` | `duration` (defaults to `mediaItem.duration`) |
| GAME | `loggedAt`, `duration`, `platform` | — |
| BOARD_GAME | `loggedAt` | `duration`, `playerCount`, `won` |
| MUSIC_TRACK | `loggedAt` | `duration` (defaults to `mediaItem.duration`) |

- TV_EPISODE: `mediaItem.type` must be `TV_EPISODE`, not `TV_SHOW` — throw `BadRequestException` if wrong type passed
- GAME `platform`: free string; front-end offers `steam`, `epic`, `gog`, `xbox`, `playstation` as suggestions but any value is accepted

## Deduplication
- Only applies when `source === LogSource.API`
- Check: does a `LogEntry` already exist for `(userId, mediaItemId, loggedAt)`?
  - Match on date portion only (ignore time component of `loggedAt`)
- If duplicate found: throw `ConflictException` (HTTP 409)
- UI submissions (`source === LogSource.MANUAL`) skip this check entirely

## `groupByDay` Return Shape
```ts
{
  date: string;          // "2026-01-15"
  entries: LogEntry[];   // non-music entries
  musicGroup?: {
    trackCount: number;
    totalDuration: number; // minutes
    entries: LogEntry[];
  };
}[]
```

## Acceptance Criteria
- [ ] Creating a GAME entry without `platform` throws `BadRequestException`
- [ ] Creating a TV_EPISODE entry where `mediaItem.type === TV_SHOW` throws `BadRequestException`
- [ ] API duplicate submission (same user + mediaItem + date) throws 409
- [ ] UI submission for the same user + mediaItem + date succeeds (new entry created)
- [ ] `groupByDay` collapses multiple music tracks on the same day into one group
- [ ] `findByUser` date range filter works correctly
- [ ] `duration` defaults to `mediaItem.duration` when not provided and metadata has a value
