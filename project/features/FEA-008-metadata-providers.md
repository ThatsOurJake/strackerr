# FEA-008: Metadata Providers

## Outcome
STrackerr can search and normalize metadata from the external providers needed by each supported media type.

## Scope
- Shared provider interface and registry.
- TMDB provider for movies and TV shows.
- AniList provider for anime.
- IGDB provider for games using BYOK credentials.
- BoardGameGeek provider for board games.
- MusicBrainz provider for music tracks.

## Dependencies
- FEA-001 provides the application foundation.
- FEA-003 provides encrypted provider key storage where required.
- FEA-002 provides persistence targets for normalized metadata.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-019](../backlog/todo/TICKET-019.md) | Metadata provider interface and TMDB provider |
| [TICKET-020](../backlog/todo/TICKET-020.md) | AniList metadata provider |
| [TICKET-021](../backlog/todo/TICKET-021.md) | IGDB metadata provider |
| [TICKET-022](../backlog/todo/TICKET-022.md) | BGG metadata provider |
| [TICKET-023](../backlog/todo/TICKET-023.md) | MusicBrainz metadata provider |

## Done Signal
- Provider results are normalized behind the shared interface.
- Manual add and identify flows can search providers by media type.
