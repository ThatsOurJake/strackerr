# TICKET-083: Add Authenticated IGDB Game Search

**Feature:** [FEA-028: Authenticated Metadata Provider Search API](../../features/FEA-028-authenticated-metadata-provider-search-api.md)

## Goal
Allow import tools to discover game candidates from the authenticated user's configured IGDB account without handling the user's IGDB credentials.

## Scope
- Add `GET /api/v1/providers/igdb/search?query=...` using the provider-search infrastructure from TICKET-081.
- Resolve IGDB and its encrypted credential for the authenticated user through `MetadataService` and call the existing IGDB adapter server-side.
- Return the shared normalized `{ data: [...] }` envelope with `GAME` results and no TV-only `episodes` field.
- Reuse shared query validation, candidate bounds, authentication, throttling, safe upstream-error mapping, and Swagger response conventions.
- Return the shared `424` missing-configuration contract when the authenticated user has not configured IGDB credentials.

## Technical Notes
- Do not broaden the API to accept IGDB client IDs, tokens, or arbitrary provider parameters; the user-configured encrypted credential remains the sole source.
- Ensure IGDB credential parsing failures and upstream authentication failures are rendered as safe provider failures without echoing credential material.
- Add focused tests for correct user credential resolution, normalized `GAME` results, missing configuration, and safe failures.

## Acceptance Criteria
- [ ] `GET /api/v1/providers/igdb/search` requires the existing `X-API-Key` authentication
- [ ] The endpoint accepts only validated free-text `query` input
- [ ] A configured user receives normalized `GAME` candidates without any IGDB credential in requests or responses
- [ ] A user with no IGDB credential receives the documented `424` configuration error
- [ ] Invalid credentials and upstream errors do not leak provider payloads or secrets
- [ ] Swagger and focused tests document and verify the public contract
- [ ] Type checks, lint, and unit tests pass
