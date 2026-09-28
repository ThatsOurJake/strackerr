# TICKET-075: Update Manual TV Episode Add UX for Existing Parent Selection

**Feature:** [FEA-026: Manual TV Episode Parent Selection](../../features/FEA-026-manual-tv-episode-parent-selection.md)

## Goal
Give users an explicit, low-friction way to attach manually added TV episodes to existing collection shows before creating a new show item.

## Scope
- Update the manual TV episode add screen/form to surface existing parent-show candidates.
- Require explicit user choice when candidates are present:
  - select an existing show, or
  - choose create new show
- Keep create-new as an explicit fallback action so current flexibility remains.
- Show candidate disambiguation fields to reduce accidental mis-selection.
- Display result and validation feedback that confirms whether attach-to-existing or create-new occurred.

## Technical Notes
- Use the server lookup contract from TICKET-074 instead of duplicating search logic in the client.
- Keep controls consistent with existing form, flash, and validation UI patterns.
- Ensure progressive enhancement behavior: base form remains usable if dynamic candidate loading fails.
- Avoid introducing dead-end states; users must always be able to continue by creating a new parent show.

## Acceptance Criteria
- [ ] Manual TV episode add flow shows existing TV show candidates from the user's collection
- [ ] User can explicitly choose an existing show as episode parent
- [ ] User can explicitly choose create-new-parent even when candidates exist
- [ ] Candidate presentation includes enough context to distinguish similarly titled shows
- [ ] Success messaging confirms the chosen parent action
- [ ] UI and controller tests cover candidate rendering, selection handling, and fallback behavior
