# TICKET-060: Add Navigation from the Weekly Nostalgia Tile to a Dedicated Historical View

**Feature:** [FEA-021: Nostalgia Deep Dive](../../features/FEA-021-nostalgia-deep-dive.md)

## Goal
Make the This week nostalgia tile an entry point into a fuller historical comparison experience.

## Scope
- Add a route and controller flow for a dedicated nostalgia detail page or stats sub-view.
- Make the weekly nostalgia tile clickable when historical data exists.
- Preserve a non-clickable or disabled presentation when there is no deeper history to show.
- Carry forward the current-week comparison context into the destination route without making the user reselect it.

## Technical Notes
- Reuse the same week-matching rule defined for the base nostalgia tile so summary and detail views stay consistent.
- Keep routing coherent with the current stats surface, rather than introducing an unrelated top-level navigation concept.
- Ensure the destination can be linked directly and still validates authentication and user scoping.

## Acceptance Criteria
- [ ] The This week nostalgia tile links to a dedicated historical view when prior-year data exists
- [ ] The tile remains intentionally non-interactive when there is no deeper history to show
- [ ] The destination route is authenticated and user-scoped
- [ ] Automated coverage verifies navigation and no-history behavior
