# FEA-001: Platform Foundation

## Outcome
STrackerr can be booted, developed, deployed, and operated with the shared infrastructure that later features depend on.

## Scope
- NestJS application scaffold using pnpm, Biome, Tailwind CSS, Handlebars, and HTMX.
- Docker and docker-compose deployment path with migrations running on boot.
- Background job primitives for scheduled work and domain events.
- In-memory application cache with user-scoped keys and invalidation hooks.

## Dependencies
- No feature dependencies. This feature unlocks most later implementation work.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-001](../backlog/done/TICKET-001.md) | Project scaffold |
| [TICKET-003](../backlog/done/TICKET-003.md) | Docker and deployment setup |
| [TICKET-032](../backlog/done/TICKET-032.md) | Background job foundation |
| [TICKET-033](../backlog/done/TICKET-033.md) | Application cache infrastructure |

## Done Signal
- The app runs locally in development.
- The app can be built and started in a container.
- Domain events, scheduled jobs, and cache invalidation are available for dependent features.
