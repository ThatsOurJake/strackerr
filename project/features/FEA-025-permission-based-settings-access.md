# FEA-025: Permission-Based Settings Access

## Outcome
Every authenticated user can reach Settings to manage their own password, API key, and metadata provider credentials, while globally destructive maintenance actions stay restricted to administrators.

## Scope
- Remove the controller-wide admin guard from Settings so all authenticated users can open the page.
- Keep Account (password change, API key regeneration) available to every user.
- Keep Providers (per-user provider credentials and per-media-type provider preferences) available to every user.
- Keep one Maintenance tab visible to all users, showing the per-user cache clear to everyone and global cleanup actions only to administrators.
- Apply authorization per route and per rendered action rather than per controller.
- Update navigation and tab rendering so users only see settings surfaces they can actually use.

## Non-Goals
- Introducing roles beyond the existing user/administrator distinction.
- Changing where provider credentials are stored or making any credential global.
- Adding new maintenance actions; this feature only re-scopes access to existing ones.

## Dependencies
- FEA-003 provides authentication, admin roles, API keys, and encrypted provider settings.
- FEA-012 provides the tabbed settings structure being re-scoped.
- FEA-014 provides the unused-image cleanup action that must remain admin-only.
- FEA-024 adds orphaned item cleanup, which must inherit the same admin-only gating.

## UX Requirements
- Settings must be reachable from navigation for every authenticated user.
- Tabs a user cannot use must not be shown as disabled or error-producing dead ends.
- The Maintenance tab must clearly separate personal actions from administrator-only actions so users are not confused about what affects everyone.
- Administrator-only actions must be visually labeled as global/administrative.
- Denied actions must produce a clear forbidden message, not a blank page or generic error.

## Security Requirements
- Every settings route must remain authenticated; removing the class-level admin guard must not leave any route unguarded.
- Global maintenance routes (unused-image cleanup, orphaned item cleanup) must keep explicit administrator guards at the route level.
- Hiding an administrator control in the view must never be the only protection; server-side authorization is required for each restricted route.
- Per-user routes must continue to act only on the signed-in user's own credentials, password, API key, and cache.
- Provider credential values must stay encrypted and must never be rendered back to any user, including administrators.
- CSRF protection and existing rate limiting on password change must be preserved.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-072](../backlog/todo/TICKET-072.md) | Replace controller-wide admin guard with per-route settings authorization |
| [TICKET-073](../backlog/todo/TICKET-073.md) | Render settings tabs, navigation, and maintenance actions by permission |

## Done Signal
- A non-administrator can open Settings, change their password, regenerate their API key, and manage their own provider credentials and preferences.
- A non-administrator can clear their own caches but cannot see or trigger global cleanup actions.
- Administrators retain access to every existing settings action.
- Direct requests to administrator-only settings routes from a non-administrator are rejected server-side.
