# TICKET-050: Decompose Selected Controllers Without Test Sprawl

**Feature:** [FEA-017: Shell Reliability, Asset Delivery, and Frontend Maintainability](../../features/FEA-017-shell-reliability-asset-delivery-and-frontend-maintainability.md)

## Goal
Improve readability and maintainability by splitting large controllers into focused collaborators while retaining existing behavioral test coverage at the current controller boundaries.

## Scope
- Decompose these files into smaller sibling modules with clear responsibilities:
  - `src/web/controllers/add.controller.ts`
  - `src/web/controllers/settings.controller.ts`
  - `src/modules/api-v1/api-v1-log.controller.ts`
- Keep route contracts, request validation behavior, and response formats unchanged.
- Keep existing tests that target the original controller entry points as the primary regression guard.
- Add or adjust tests only when required to preserve confidence for changed behavior.

## Technical Notes
- Favor extraction into helper services/functions that are colocated with each owning module.
- Avoid introducing global utility layers for logic that is only reused locally.
- Maintain current dependency injection style and naming conventions.

## Acceptance Criteria
- [ ] The three target controller files are split into focused sibling modules
- [ ] Public route behavior and API response shapes remain unchanged
- [ ] Existing controller-level tests continue to cover the workflow without requiring broad new sibling-file test suites
- [ ] Any required test updates are minimal and focused on behavioral parity
