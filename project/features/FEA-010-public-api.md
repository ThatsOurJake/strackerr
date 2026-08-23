# FEA-010: Public API

## Outcome
External clients can submit and query user activity through a documented API secured by per-user API keys.

## Scope
- API v1 log submission and retrieval endpoints.
- API key guard using `X-API-Key`.
- Skeleton auto-creation and deduplication for API-submitted logs.
- Media search and stats summary endpoints.
- Swagger/OpenAPI UI and DTO annotations.

## Dependencies
- FEA-002 provides media and log services.
- FEA-003 provides API key management.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-025](../backlog/todo/TICKET-025.md) | REST API v1 log endpoints |
| [TICKET-026](../backlog/todo/TICKET-026.md) | REST API v1 media search and stats endpoints |
| [TICKET-027](../backlog/todo/TICKET-027.md) | Swagger / OpenAPI documentation |

## Done Signal
- API clients can submit logs and query user-scoped data with an API key.
- The API surface is discoverable through generated Swagger documentation.
