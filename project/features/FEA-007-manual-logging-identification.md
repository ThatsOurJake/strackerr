# FEA-007: Manual Logging and Identification

## Outcome
Users can manually add activity and later identify unmatched skeleton media without losing their history.

## Scope
- Multi-step manual log entry form.
- Type-specific log entry fields.
- Live metadata provider search where available.
- Manual fallback for unknown items.
- Skeleton-to-identified flow with alias preservation.

## Dependencies
- FEA-002 provides media and log services.
- FEA-004 provides shared layout and HTMX partial conventions.
- FEA-008 provides metadata provider search.
- FEA-009 handles downstream enrichment for identified TV shows and cached images.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-016](../backlog/todo/TICKET-016.md) | Manual add form |
| [TICKET-017](../backlog/todo/TICKET-017.md) | Identify flow |

## Done Signal
- Users can add activity with or without provider results.
- Identifying a skeleton preserves existing log entries and aliases.
