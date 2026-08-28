# FEA-010: Public API

## Outcome
External clients can submit and query user activity through a documented API secured by per-user API keys.

## Scope
- Media-specific API v1 log submission endpoints and shared retrieval.
- API key guard using `X-API-Key`.
- Skeleton auto-creation and deduplication for API-submitted logs.
- Media search and stats summary endpoints.
- Swagger/OpenAPI UI and DTO annotations.

Log submission is intentionally title-based and simple for plugins and scheduled imports. The API key identifies the user, while media IDs and skeleton state remain internal implementation details.

## Dependencies
- FEA-002 provides media and log services.
- FEA-003 provides API key management.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-025](../backlog/done/TICKET-025.md) | REST API v1 log endpoints |
| [TICKET-026](../backlog/done/TICKET-026.md) | REST API v1 media search and stats endpoints |
| [TICKET-027](../backlog/done/TICKET-027.md) | Swagger / OpenAPI documentation |

## Done Signal
- API clients can submit logs and query user-scoped data with an API key.
- The API surface is discoverable through generated Swagger documentation.
