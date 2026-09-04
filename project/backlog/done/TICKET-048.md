# TICKET-048: Dark Mode Reliability Fixes

**Feature:** [FEA-017: Shell Reliability, Asset Delivery, and Frontend Maintainability](../../features/FEA-017-shell-reliability-asset-delivery-and-frontend-maintainability.md)

## Goal
Make dark mode deterministic and reliable across first paint, navigation, and preference changes.

## Scope
- Audit current dark-mode initialization path across base layout, theme script, and persisted preference handling.
- Fix first-paint theme selection so pages do not flash the wrong theme before hydration/interaction.
- Ensure toggle behavior updates both DOM class state and persisted preference consistently.
- Verify behavior on key pages using the shared shell and authentication views.

## UX Requirements
- Theme preference remains stable after full page reload and navigation.
- Light and dark tokens match `project/design.md` expectations.
- Theme toggle remains keyboard operable and preserves accessible naming.

## Acceptance Criteria
- [ ] First paint respects saved theme with no incorrect-mode flash
- [ ] Toggle reliably switches and persists preference
- [ ] Shared-shell pages and auth pages render with consistent theme state
- [ ] No regressions to existing navigation or layout behavior
