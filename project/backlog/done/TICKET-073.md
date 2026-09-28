# TICKET-073: Render Settings Tabs and Maintenance Actions by Permission

**Feature:** [FEA-025: Permission-Based Settings Access](../../features/FEA-025-permission-based-settings-access.md)

## Goal
Present a settings experience that matches what the signed-in user is allowed to do, without exposing administrator-only controls to regular users.

## Scope
- Show the Settings navigation entry to every authenticated user.
- Render Account and Providers tabs for all users.
- Keep a single Maintenance tab visible to all users, split into:
  - a personal section containing the per-user cache clear
  - an administrator section containing unused-image cleanup and orphaned item cleanup
- Render the administrator section only when the signed-in user is an administrator.
- Label administrator actions clearly as global so their blast radius is obvious.
- Ensure tab switching and deep links to a tab behave correctly for non-administrators.

## Technical Notes
- Drive visibility from the administrator flag surfaced by TICKET-072 rather than re-querying the user in the view layer.
- Reuse existing tab, section, and feedback markup patterns in the settings page template.
- Treat view-level hiding as presentation only; route guards remain the enforcement boundary.
- Update existing settings view-model tests rather than introducing a parallel permission model.

## Acceptance Criteria
- [ ] The Settings navigation entry is visible to every authenticated user
- [ ] Non-administrators see Account, Providers, and a Maintenance tab containing only the personal cache clear
- [ ] Administrators additionally see the global cleanup actions in a clearly labeled administrator section
- [ ] Administrator-only controls are absent from non-administrator markup, not just hidden with styling
- [ ] Deep-linking to any tab as a non-administrator renders a usable page with no dead-end controls
- [ ] Tests cover rendered tab and action visibility for administrator and non-administrator users
