# TICKET-076: Add Coverage for Duplicate Prevention in Manual TV Episode Parent Selection

**Feature:** [FEA-026: Manual TV Episode Parent Selection](../../features/FEA-026-manual-tv-episode-parent-selection.md)

## Goal
Lock in the new parent-selection behavior with automated coverage that prevents regressions back to duplicate show creation during manual TV episode adds.

## Scope
- Add integration-level coverage for manual episode add flows where:
  - an unidentified show already exists with the same/similar title
  - an identified show exists with the same/similar title
  - no suitable show exists and create-new is expected
- Verify selected-parent attach behavior and create-new fallback outcomes end-to-end.
- Verify invalid/tampered parent id requests are rejected and do not create incorrect relationships.
- Add regression assertions that duplicate empty-show creation does not occur when a valid existing parent is selected.

## Technical Notes
- Prefer test fixtures that mirror current real-world problematic cases (empty shell show from API plus manual episode add).
- Reuse existing test factories/helpers for media items and episodes to keep setup maintainable.
- Keep assertions focused on persisted parent-child relationships and user-visible outcomes.
- Document any known edge cases discovered during coverage expansion as follow-up backlog notes, not silent gaps.

## Acceptance Criteria
- [ ] Tests prove episodes attach to selected existing shows (identified and unidentified)
- [ ] Tests prove create-new behavior still works when no parent is selected/matched
- [ ] Tests prove invalid parent ids are rejected safely
- [ ] Regression tests fail if flow reverts to creating duplicates despite valid selected parents
- [ ] Test suite remains stable and deterministic across local and CI runs
