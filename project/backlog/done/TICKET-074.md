# TICKET-074: Add Scoped TV Show Candidate Lookup and Parent Validation for Manual Episode Add

**Feature:** [FEA-026: Manual TV Episode Parent Selection](../../features/FEA-026-manual-tv-episode-parent-selection.md)

## Goal
Allow manual episode creation to target an existing TV show item safely by adding a user-scoped candidate lookup and strict server-side parent validation.

## Scope
- Add a query path used by the manual-add flow to fetch candidate parent shows from the signed-in user's TV collection items.
- Include both identified and unidentified TV shows in candidate results.
- Support lightweight matching inputs (for example title text) to narrow candidate lists.
- Accept an optional selected parent show id in the manual episode create path.
- Validate selected parent show id server-side:
  - item exists
  - item is TV media type
  - item is within the current user's accessible scope
- Preserve current behavior when parent id is absent by allowing new parent-show creation.

## Technical Notes
- Keep lookup logic in the owning media/manual-add module; avoid pushing web concerns into domain services.
- Reuse existing access-scoping patterns already used by collection reads.
- Return stable candidate payloads suitable for UI rendering (id, title, and disambiguators).
- Emit clear validation errors for invalid parent selections so UI can present actionable feedback.

## Acceptance Criteria
- [ ] Candidate lookup returns only TV show items accessible to the signed-in user
- [ ] Candidate lookup includes identified and unidentified shows
- [ ] Manual episode create accepts a valid selected parent show id and attaches episode to that show
- [ ] Invalid parent ids (missing, wrong type, inaccessible) are rejected server-side with clear errors
- [ ] Omitting parent id keeps existing create-new-parent behavior
- [ ] Automated tests cover candidate scoping and parent validation branches
