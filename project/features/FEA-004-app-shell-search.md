# FEA-004: App Shell and Search

## Outcome
The web UI has a shared shell that every page can extend, including navigation, dark mode, flash messaging, and user-scoped search.

## Scope
- Handlebars base layout and shared partials.
- Desktop sidebar and mobile navigation.
- Dark mode toggle and persistence.
- Flash message rendering.
- Global search input, dropdown results, and full results page.
- Fuse.js fuzzy fallback with user-scoped results.

## Dependencies
- FEA-001 provides Handlebars, Tailwind, and HTMX setup.
- FEA-003 provides authenticated template context.
- FEA-002 provides searchable media and log data.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-009](../backlog/done/TICKET-009.md) | Base layout and navigation |
| [TICKET-018](../backlog/done/TICKET-018.md) | Global search |

## Done Signal
- All later web views can render inside the shared layout.
- Search returns only media visible through the current user's logs.
