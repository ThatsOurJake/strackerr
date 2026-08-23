# FEA-006: Collection and Media Detail

## Outcome
Users can browse their logged media collection and inspect a single media item's metadata, personal stats, and history.

## Scope
- Collection browser with media type filters.
- Alphabetical sidebar and unidentified-item filter.
- Per-item detail pages for movies, TV shows, games, board games, and music tracks.
- TV show detail view with seasons and episodes.

## Dependencies
- FEA-002 provides media and log data.
- FEA-004 provides the shared layout and search patterns.
- FEA-009 enriches TV show detail pages after provider identification.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-014](../backlog/todo/TICKET-014.md) | Collection browser |
| [TICKET-015](../backlog/todo/TICKET-015.md) | Media item detail page |

## Done Signal
- Collection lists and detail pages are user-scoped.
- Identified and unidentified media both render cleanly.
