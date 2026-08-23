# FEA-002: Core Data Model

## Outcome
STrackerr has a stable persistence model and core services for media items and user activity logs.

## Scope
- Prisma schema and initial migration for users, media items, aliases, log entries, provider metadata, API keys, settings, and cached images.
- Media catalog service for identified global media and user-scoped skeleton items.
- Log entry service for validated creation, deduplication, retrieval, and day grouping.

## Dependencies
- FEA-001 provides the application scaffold.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-002](../backlog/todo/TICKET-002.md) | Prisma schema and initial migration |
| [TICKET-007](../backlog/todo/TICKET-007.md) | Media module |
| [TICKET-008](../backlog/todo/TICKET-008.md) | Log entry module |

## Done Signal
- Database schema supports all planned media types and user activity.
- Media and log services expose the core operations required by the UI, providers, and API.
