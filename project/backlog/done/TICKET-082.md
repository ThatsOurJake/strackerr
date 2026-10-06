# TICKET-082: Add TMDB TV Search with Complete Nested Episode Results

**Feature:** [FEA-028: Authenticated Metadata Provider Search API](../../features/FEA-028-authenticated-metadata-provider-search-api.md)

## Goal
Let import tools search TMDB TV shows and receive complete season and episode metadata in the same response so irregular source titles can be mapped to explicit `SxxExx` values.

## Scope
- Add `GET /api/v1/providers/tmdb/tv/search?query=...` under the provider-search API infrastructure from TICKET-081.
- Use the authenticated user's configured TMDB credential server-side; accept only the free-text `query` parameter.
- Return the common normalized result fields for each `TV_SHOW` candidate plus an `episodes` array.
- Include every TMDB season and episode available for each returned show. Each episode must include `seasonNumber`, `episodeNumber`, `title`, optional `description`, `duration`, `externalId`, and `imageUrl`.
- Extend the TMDB adapter or a dedicated provider-search service as needed to obtain each candidate's season count and retrieve every season without exposing provider-specific wire formats.
- Bound the number of show candidates expanded per request and handle partial/failed upstream episode expansion as one safe, documented request failure rather than returning an apparently complete but silently incomplete mapping.
- Add Swagger examples that demonstrate selecting a show and using its nested episode list to map an importer record.

## Technical Notes
- `TmdbProvider.getEpisodes` currently obtains one season at a time. Use it or an equivalent adapter method to retrieve all seasons for the bounded candidate set, including TMDB-provided season numbers.
- Preserve provider-result ordering so importers can make a deterministic candidate choice.
- Reuse the credential, authentication, query-validation, throttling, missing-configuration, and sanitized-error behavior established in TICKET-081.
- Avoid N+1 work beyond the documented bounded candidate and season limits. The service must be straightforward to test with mocked TMDB responses.

## Acceptance Criteria
- [ ] `GET /api/v1/providers/tmdb/tv/search` returns only `TV_SHOW` results for a valid authenticated user
- [ ] Every returned show includes the common normalized result fields and a complete `episodes` array
- [ ] Each episode exposes season and episode numbers plus the documented optional metadata
- [ ] All TMDB seasons for each returned show are represented, including their provider season numbers
- [ ] The endpoint handles a missing TMDB credential with the same safe `424` contract as TICKET-081
- [ ] Invalid requests, rate limiting, and upstream failures follow the documented shared API behavior without leaking secrets
- [ ] The candidate-expansion limit prevents unbounded upstream calls
- [ ] Swagger and focused tests cover the TV and nested-episode contract
- [ ] Type checks, lint, and unit tests pass
