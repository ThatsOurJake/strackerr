# TICKET-084: Add Authenticated BoardGameGeek Board-Game Search

**Feature:** [FEA-028: Authenticated Metadata Provider Search API](../../features/FEA-028-authenticated-metadata-provider-search-api.md)

## Goal
Allow import tools to discover board-game candidates through the authenticated user's configured BoardGameGeek credential while receiving the same simplified API response as the other credential-backed providers.

## Scope
- Add `GET /api/v1/providers/bgg/search?query=...` using the provider-search infrastructure from TICKET-081.
- Resolve BoardGameGeek and its encrypted credential for the authenticated user through `MetadataService` and call the existing BGG adapter server-side.
- Return the shared normalized `{ data: [...] }` envelope with `BOARD_GAME` results and no TV-only `episodes` field.
- Reuse shared query validation, candidate bounds, authentication, throttling, safe upstream-error mapping, and Swagger response conventions.
- Return the shared `424` missing-configuration contract when the authenticated user has not configured a BoardGameGeek credential.

## Technical Notes
- Preserve the BGG adapter's existing image enrichment behavior while mapping output to the public normalized DTO.
- Do not expose the BGG bearer credential or raw XML/provider payloads through errors, logging, or Swagger examples.
- Add focused tests for correct user credential resolution, normalized `BOARD_GAME` results, missing configuration, and safe failures.

## Acceptance Criteria
- [ ] `GET /api/v1/providers/bgg/search` requires the existing `X-API-Key` authentication
- [ ] The endpoint accepts only validated free-text `query` input
- [ ] A configured user receives normalized `BOARD_GAME` candidates without any BGG credential in requests or responses
- [ ] A user with no BGG credential receives the documented `424` configuration error
- [ ] BGG image data is mapped to the normalized `imageUrl` field when available
- [ ] Invalid credentials and upstream errors do not leak provider payloads or secrets
- [ ] Swagger and focused tests document and verify the public contract
- [ ] Type checks, lint, and unit tests pass
