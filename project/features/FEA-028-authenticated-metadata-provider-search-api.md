# FEA-028: Authenticated Metadata Provider Search API

## Outcome
Import tools can search a user's configured TMDB, IGDB, and BoardGameGeek metadata providers through STrackerr without ever receiving, storing, or transmitting the provider credentials themselves. TMDB TV search returns complete episode metadata so tools can map irregular source titles, such as Netflix exports, to explicit season and episode numbers.

## Scope
- Add separate authenticated API v1 search endpoints:
  - `GET /api/v1/providers/tmdb/movies/search?query=...`
  - `GET /api/v1/providers/tmdb/tv/search?query=...`
  - `GET /api/v1/providers/igdb/search?query=...`
  - `GET /api/v1/providers/bgg/search?query=...`
- Accept free-text `query` only. The client chooses the returned candidate; these endpoints do not create, identify, or mutate media records.
- Resolve the provider and its credential from the authenticated user's existing provider settings on the server. Provider credentials are never accepted in a request or returned in any response.
- Return one documented, normalized search-result envelope for every endpoint instead of provider-native payloads.
- Include an `episodes` array on every TMDB TV-show result. It must contain every TMDB season and episode returned for that show, including season and episode numbers, so importer clients can perform title-to-`SxxExx` mapping locally.
- Keep movie, game, and board-game responses to the common result fields without an `episodes` array.
- Add Swagger documentation and examples for every route, including the TV episode response shape and credential-configuration failures.

## Non-Goals
- AniList and MusicBrainz search endpoints; they do not use user-supplied provider credentials.
- Provider-detail, external-ID lookup, or direct episode lookup endpoints.
- Automatic matching, importing, media creation, identification, or activity logging.
- Exposing, rotating, validating, or otherwise managing provider credentials through the public API.

## Dependencies
- FEA-008 provides the TMDB, IGDB, and BoardGameGeek provider adapters and normalized metadata contracts.
- FEA-010 provides API v1 authentication, throttling, Swagger, and public error conventions.
- FEA-012 provides encrypted, per-user provider credential configuration.
- FEA-025 ensures every authenticated user can manage the provider credentials that these endpoints consume.

## API Contract
- Each endpoint requires the existing `X-API-Key` request header and a trimmed free-text `query` parameter.
- Successful responses use `{ "data": [...] }`. Every result includes `externalId`, `title`, `type`, and optional `year`, `imageUrl`, `description`, and `tags` fields.
- TMDB TV results additionally include `episodes`, where each entry includes `seasonNumber`, `episodeNumber`, `title`, optional `description`, `duration`, `externalId`, and `imageUrl` fields.
- Missing and invalid STrackerr API keys both return `401` through the existing API-key guard.
- When the requested provider has no credential configured for the authenticated user, return a clear `424 Failed Dependency` error identifying that provider configuration is required, but never reveal a credential value or any other user's configuration.
- Invalid request input returns `400`; rate-limit responses remain `429`; normalized upstream provider failures must not leak raw upstream payloads, request URLs, or credentials.

## Security Requirements
- Always derive the user and provider credential from the validated `X-API-Key`; ignore and reject any attempt to supply a provider key through headers, query parameters, or request bodies.
- Apply the existing API throttling guard to every provider route and validate, trim, and bound the search query before calling an upstream provider.
- Do not persist provider search results or alter the user's media catalog as part of a search request.
- Never expose provider credentials in Swagger examples, logs, errors, DTOs, or outbound response payloads.
- Bound the number of TMDB TV candidates expanded with episode data and perform expansion safely so one importer query cannot create unbounded upstream work.
- Map upstream errors to stable consumer-facing API errors while preserving appropriate client-visible statuses for invalid input, authentication, missing configuration, and throttling.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-081](../backlog/todo/TICKET-081.md) | Add authenticated provider-search API infrastructure and TMDB movie search |
| [TICKET-082](../backlog/todo/TICKET-082.md) | Add TMDB TV search with complete nested episode results |
| [TICKET-083](../backlog/todo/TICKET-083.md) | Add authenticated IGDB game search |
| [TICKET-084](../backlog/todo/TICKET-084.md) | Add authenticated BoardGameGeek board-game search |

## Done Signal
- Import tools can use only a user's STrackerr API key to search the user's configured TMDB, IGDB, and BoardGameGeek accounts.
- All provider routes return the documented normalized response shape without exposing provider credentials or raw provider payloads.
- TMDB TV results provide the full season and episode mapping needed to match irregular Netflix-export titles to `SxxExx` values.
- Missing provider configuration, invalid API authentication, malformed queries, throttling, and upstream failures return clear, safe, documented responses.
