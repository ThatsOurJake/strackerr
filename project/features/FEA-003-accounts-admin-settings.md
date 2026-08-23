# FEA-003: Accounts, Admin, and Settings

## Outcome
Users can register, sign in, manage account-level settings, and admins can manage users.

## Scope
- Local username/password authentication.
- JWT stored in an httpOnly cookie with route guards.
- Login and registration views.
- First-user admin behavior and protected admin user management.
- Encrypted third-party provider API keys.
- User API key regeneration and cache clearing from settings.

## Dependencies
- FEA-001 provides the application scaffold.
- FEA-002 provides user and settings persistence.
- FEA-004 provides the shared layout for the account, admin, and settings views.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-004](../backlog/done/TICKET-004.md) | Authentication module |
| [TICKET-005](../backlog/done/TICKET-005.md) | Admin user management |
| [TICKET-006](../backlog/done/TICKET-006.md) | Encryption service and user settings |
| [TICKET-010](../backlog/done/TICKET-010.md) | Login and register pages |

## Done Signal
- Authenticated and unauthenticated routes behave correctly.
- Admin-only user management is protected.
- Provider keys are stored encrypted and never displayed in plain text after save.
