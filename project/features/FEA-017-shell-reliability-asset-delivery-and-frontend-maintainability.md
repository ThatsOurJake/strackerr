# FEA-017: Shell Reliability, Asset Delivery, and Frontend Maintainability

## Outcome
The app shell behaves consistently in both themes, loads critical UI assets from the app for better performance control, and remains easier to evolve through targeted frontend code decomposition.

## Scope
- Fix dark mode behavior so theme selection is applied reliably on first paint and persists across navigation.
- Serve third-party UI dependencies and fonts from app-managed assets where feasible.
- Split oversized controller files into focused collaborators while preserving current behavior and test confidence.
- Split `public/js/app.js` into smaller modules while keeping one stable entry point for page behavior.

## Dependencies
- FEA-004 provides base shell, dark mode, navigation, and global search foundations.
- FEA-010 and FEA-015 provide shell usage patterns that must remain stable after refactoring.

## UX Requirements
- Theme changes must not flash the wrong mode on page load.
- Visual behavior in light and dark themes remains consistent with `project/design.md` tokens.
- Decomposition work must not change route behavior, response payloads, or user-visible flow.

## Security Requirements
- Locally served third-party assets must be pinned to known versions and sourced from trusted upstream releases.
- Asset-delivery changes must not weaken existing CSP, cookie, or CSRF controls.
- Refactors must not change current authorization checks in web and API controllers.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-048](../backlog/todo/TICKET-048.md) | Dark mode reliability fixes |
| [TICKET-049](../backlog/todo/TICKET-049.md) | Self-host fonts and third-party frontend assets |
| [TICKET-050](../backlog/todo/TICKET-050.md) | Decompose selected controllers without test sprawl |
| [TICKET-051](../backlog/todo/TICKET-051.md) | Modularize `public/js/app.js` with stable entry point |

## Done Signal
- Dark mode works predictably for initial paint, toggling, and persisted preference.
- App-managed static assets replace external runtime dependencies for targeted fonts and frontend libraries.
- Selected controllers and `app.js` are easier to maintain with no behavior regressions and existing test confidence retained.
