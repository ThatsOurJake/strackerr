# FEA-011: Hardening and Polish

## Outcome
The application is resilient, secure, responsive, and consistent enough for day-to-day use.

## Scope
- Consistent web error handling.
- Empty states for list and detail pages.
- HTMX loading indicators.
- Security middleware, CSRF protection, rate limiting, and sanitisation.
- Responsive layout audit and final visual polish.

## Dependencies
- All UI and API features should be implemented before this final pass.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-028](../backlog/todo/TICKET-028.md) | Error handling and empty states |
| [TICKET-029](../backlog/todo/TICKET-029.md) | Security hardening |
| [TICKET-030](../backlog/todo/TICKET-030.md) | Responsive design and polish |

## Done Signal
- Common unhappy paths render useful UI or API responses.
- Security protections are enabled without breaking legitimate web and API flows.
- Pages work across the target responsive breakpoints.
