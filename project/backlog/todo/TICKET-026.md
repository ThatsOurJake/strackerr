# TICKET-026: REST API v1 — Media Search & Stats Endpoints

**Feature:** [FEA-010: Public API](../../features/FEA-010-public-api.md)

## Goal
Implement the media search and stats summary API endpoints, completing the public REST API surface.

## Scope
- `ApiV1MediaController`:
  - `GET /api/v1/media/search`
- `ApiV1StatsController`:
  - `GET /api/v1/stats`
- All routes behind `ApiKeyGuard` (from TICKET-025)

## `GET /api/v1/media/search`
Query params:
- `q: string` — required, minimum 2 characters
- `type?: MediaType` — optional filter

Logic:
- Prisma exact/prefix search only (no Fuse.js fuzzy for the API — clients should send well-formed queries)
- Query: `MediaItem` where `(title CONTAINS q OR alias.alias CONTAINS q)` AND scoped to current user (via `LogEntry.userId` or `createdByUserId`)
- Optionally filtered by `type`
- Returns max 20 results

Response:
```ts
{
  data: {
    id: string;
    title: string;
    type: MediaType;
    year?: number;
    imageUrl?: string;
    isSkeleton: boolean;
  }[]
}
```

## `GET /api/v1/stats`
Query params:
- `period?: string` — one of the 8 predefined slugs (`this-week`, `last-week`, `last-30-days`, `last-3-months`, `last-6-months`, `this-year`, `last-year`, `all-time`); defaults to `this-year`; unrecognised value returns 400

Response:
```ts
{
  totalTimeByType: { [type: string]: number }; // minutes
  topItems: {
    id: string;
    title: string;
    type: MediaType;
    totalMinutes: number;
  }[];
  totalSessions: number;
}
```

Logic: reuse `StatsService` methods from TICKET-013, scoped to the authenticated user.

## Acceptance Criteria
- [ ] `GET /api/v1/media/search?q=Sever` returns items matching "Sever..." scoped to the current user
- [ ] Type filter narrows results correctly
- [ ] `GET /api/v1/stats` returns accurate totals for the authenticated user
- [ ] `GET /api/v1/stats?year=2026` scopes results to that year
- [ ] Both endpoints return 401 without a valid API key
- [ ] Results never include another user's data
