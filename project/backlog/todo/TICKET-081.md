# TICKET-081: Add Authenticated Provider Search API Infrastructure and TMDB Movie Search

**Feature:** [FEA-028: Authenticated Metadata Provider Search API](../../features/FEA-028-authenticated-metadata-provider-search-api.md)

## Goal
Establish the secure, normalized provider-search API contract and deliver TMDB movie search without exposing the authenticated user's TMDB credential.

## Scope
- Add an API v1 provider-search controller protected by the existing `ApiKeyGuard` and `ApiThrottlerGuard`.
- Define shared request validation, result DTOs, response DTOs, and safe provider-error mapping for all FEA-028 routes.
- Add `GET /api/v1/providers/tmdb/movies/search?query=...`.
- Resolve TMDB movie search through `MetadataService.getProviderForUser(MediaType.MOVIE, userId)` and pass the server-resolved credential only to the provider adapter.
- Return `{ data: [...] }` using the normalized result fields: `externalId`, `title`, `type`, optional `year`, `imageUrl`, `description`, and `tags`.
- Validate that `query` is trimmed free text within a documented length bound. Do not add provider-key, direct-ID, create, identify, or mutation inputs.
- Return `424 Failed Dependency` with a clear TMDB-configuration message when the authenticated user has not configured a TMDB credential.
- Document the route, authentication header, normalized response, `401`, `400`, `424`, `429`, and sanitized upstream-failure responses in Swagger.

## Technical Notes
- Reuse the existing API key guard so missing and invalid `X-API-Key` values share the existing `401` behavior. API keys in query parameters must remain rejected.
- The shared error mapping must never include a provider API key, raw upstream error body, upstream request URL, or stack trace.
- Keep the shared response DTO independent from persisted `MediaItem` DTOs: provider results are transient discovery data, not catalog records.
- Set a bounded provider-result count in the API service before later TV episode expansion is added.
- Add focused controller/service and DTO tests for authentication, query validation, configured and missing credentials, normalized results, provider failures, and Swagger visibility.

## Acceptance Criteria
- [ ] `GET /api/v1/providers/tmdb/movies/search` requires a valid `X-API-Key`
- [ ] Missing and invalid API keys both return `401`
- [ ] A valid user can search TMDB movies using only `query`; the request never accepts a TMDB key
- [ ] The response is the documented normalized `{ data: [...] }` envelope
- [ ] A user without a TMDB credential receives a safe, clear `424` configuration error
- [ ] Invalid or blank queries return `400`, and provider failures do not leak secrets or raw upstream data
- [ ] Existing API throttling applies to the new endpoint
- [ ] Swagger documents the public contract and all relevant response statuses
- [ ] Focused unit/controller tests, type checks, lint, and unit tests pass
