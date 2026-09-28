# TICKET-072: Replace Controller-Wide Admin Guard with Per-Route Settings Authorization

**Feature:** [FEA-025: Permission-Based Settings Access](../../features/FEA-025-permission-based-settings-access.md)

## Goal
Let any authenticated user reach their own settings routes while keeping global maintenance routes administrator-only.

## Scope
- Remove `AdminGuard` from the `SettingsWebController` class and keep `JwtAuthGuard` at the class level.
- Apply `AdminGuard` at the route level to global maintenance actions:
  - unused-image cleanup
  - orphaned item cleanup (once TICKET-071 lands)
- Leave per-user routes (password change, API key regeneration, provider credential save/remove, provider preferences, per-user cache clear) available to all authenticated users.
- Return a clear forbidden response for non-administrators hitting administrator-only settings routes.
- Preserve existing CSRF protection and the password-change rate limit.

## Technical Notes
- Audit every handler on the controller after the class guard change so no route is left unintentionally open.
- Keep `@CurrentUser()` as the only source of the acting user id; never accept a user id from the request body or query.
- Expose the acting user's administrator flag through the existing settings render path so TICKET-073 can use it.
- If a shared helper is needed to decide tab/action visibility, keep it in the existing settings controller helpers file.

## Acceptance Criteria
- [ ] All authenticated users can load the settings page
- [ ] Password change, API key regeneration, provider credential management, provider preferences, and per-user cache clear work for non-administrators
- [ ] Unused-image cleanup and orphaned item cleanup require administrator access at the route level
- [ ] A non-administrator posting directly to an administrator-only settings route is rejected server-side
- [ ] No settings route is reachable unauthenticated
- [ ] CSRF protection and the password-change rate limit remain in place
- [ ] Tests cover per-route access for both administrator and non-administrator users
