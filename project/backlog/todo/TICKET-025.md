# TICKET-025: REST API v1 — Log Endpoints

**Feature:** [FEA-010: Public API](../../features/FEA-010-public-api.md)

## Goal
Implement the public REST API log submission and retrieval endpoints, secured by API key, with skeleton auto-creation and deduplication.

## Scope
- `ApiKeyGuard` — reads `X-API-Key` header, looks up `User` by `apiKey`, attaches to request; returns 401 if missing or invalid
- `ApiV1Module`, `ApiV1LogController`:
  - `POST /api/v1/log`
  - `GET /api/v1/log`
- Rate limiting: 60 requests/minute per API key via `@nestjs/throttler`

## `POST /api/v1/log` Request DTO
```ts
{
  mediaType: MediaType;           // required; must be a valid MediaType enum value
  title: string;                  // required; max 500 chars
  loggedAt: string;               // required — ISO 8601 date; must not be a future date
  duration?: number;              // positive integer, minutes; max 1440 (24 hours)
  platform?: string;              // GAME only; max 100 chars
  playerCount?: number;           // BOARD_GAME only; integer 1–50
  won?: boolean;                  // BOARD_GAME only
  seasonNumber?: number;          // TV_EPISODE only; positive integer
  episodeNumber?: number;         // TV_EPISODE only; positive integer
  provider?: string;              // must be one of: tmdb, igdb, anilist, bgg, musicbrainz, steam
  externalId?: string;            // required if provider is set; max 100 chars
}
```

All validation via `class-validator` decorators on the DTO. Invalid requests return 400 with field-level error detail.

## `POST /api/v1/log` Logic
1. If `provider` + `externalId` provided: call `MediaService.findByExternalId(provider, externalId)` first; if found, use that `MediaItem`
2. Otherwise: call `MediaService.findOrCreateSkeleton(title, mediaType, userId)` — normalised alias lookup
3. For `TV_EPISODE`: if skeleton show created, also find-or-create a skeleton episode child with `(seasonNumber, episodeNumber)`
4. Call `LogService.create(dto, userId, LogSource.API)` — deduplication check applies
5. Return 201 with created log entry; 409 on duplicate

## `GET /api/v1/log` Query Params
- `type?: MediaType`
- `dateFrom?: string` (ISO date)
- `dateTo?: string` (ISO date)
- `page?: number` (default 1)
- `limit?: number` (default 50, max 100)

Response: `{ data: LogEntry[], total: number, page: number }`

## Security
- API key must be in `X-API-Key` header only — query param usage (`?apiKey=`) rejected with 401
- Each request scoped to the user owning the API key

## Acceptance Criteria
- [ ] Valid `X-API-Key` required; missing or invalid returns 401
- [ ] `POST /api/v1/log` creates entry and returns 201
- [ ] `POST /api/v1/log` with duplicate `(user, mediaItem, loggedAt)` returns 409
- [ ] `loggedAt` set to a future date returns 400
- [ ] `duration` exceeding 1440 or negative returns 400
- [ ] `provider` value not in the known whitelist returns 400
- [ ] Unknown title auto-creates a skeleton `MediaItem`
- [ ] `externalId` + `provider` bypasses skeleton creation when the item already exists
- [ ] `GET /api/v1/log` returns only the authenticated user's entries
- [ ] Type and date filters work correctly
- [ ] Rate limit: 61st request in a minute returns 429
- [ ] API key in query param returns 401 (not processed)
