# TICKET-025: REST API v1 — Log Endpoints

**Feature:** [FEA-010: Public API](../../features/FEA-010-public-api.md)

## Goal
Implement the public REST API log submission and retrieval endpoints, secured by API key, with skeleton auto-creation and deduplication.

## Scope
- `ApiKeyGuard` — reads `X-API-Key` header, looks up `User` by `apiKey`, attaches to request; returns 401 if missing or invalid
- `ApiV1Module`, `ApiV1LogController`:
  - `POST /api/v1/log/movie`
  - `POST /api/v1/log/tv-episode`
  - `POST /api/v1/log/game`
  - `POST /api/v1/log/board-game`
  - `POST /api/v1/log/music`
  - `GET /api/v1/log`
- Rate limiting: 60 requests/minute per API key via `@nestjs/throttler`

## POST Request DTOs
Each route has a small media-specific body. Movie and music require `title`; TV episode requires `show`, `season`, and `episode`; game additionally accepts `platform`; board game additionally accepts `players` and `won`.

All routes optionally accept `loggedAt` (defaults to now), `duration`, and a paired `provider` plus `externalId` identification hint. Clients never provide `userId`, `mediaItemId`, `source`, or skeleton state.

All validation via `class-validator` decorators on the DTO. Invalid requests return 400 with field-level error detail.

## POST Logic
1. If `provider` + `externalId` provided: call `MediaService.findByExternalId(provider, externalId)` first; if found, use that `MediaItem`
2. Otherwise: call `MediaService.findOrCreateSkeleton(title, mediaType, userId)` — normalised alias lookup
3. For `/tv-episode`: if the show does not exist, create it, then find-or-create its episode child with `(season, episode)`
4. Call `LogService.create(dto, userId, LogSource.API)` — deduplication check applies
5. Return 201 with a flat activity response that hides internal user, media item, source, and skeleton fields; return 409 on duplicate

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
- [ ] Each media-specific POST route creates an entry and returns 201
- [ ] A media-specific POST with duplicate `(user, mediaItem, loggedAt)` returns 409
- [ ] `loggedAt` set to a future date returns 400
- [ ] `duration` exceeding 1440 or negative returns 400
- [ ] `provider` value not in the known whitelist returns 400
- [ ] Unknown title auto-creates a skeleton `MediaItem`
- [ ] `externalId` + `provider` bypasses skeleton creation when the item already exists
- [ ] `GET /api/v1/log` returns only the authenticated user's entries
- [ ] Type and date filters work correctly
- [ ] Rate limit: 61st request in a minute returns 429
- [ ] API key in query param returns 401 (not processed)
