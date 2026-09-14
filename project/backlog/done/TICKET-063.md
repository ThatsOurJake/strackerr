# TICKET-063: Implement Bulk Item Save for Metadata and Selected History-Row Removals

**Feature:** [FEA-022: Item Metadata Editing and Alias/History Management](../../features/FEA-022-item-metadata-editing-and-alias-history-management.md)

## Goal
Persist item metadata changes and selected history-row removals in one confirm save operation.

## Scope
- Add a single item-edit bulk-save endpoint/handler that receives metadata edits and selected row removals from the edit screen.
- Update item title and description within the same save action.
- Remove only the explicitly selected history/session rows in the same save action.
- Return users to the static item page with clear success/failure feedback.
- Prevent partial success across metadata and history-row removals when validation fails.

## Technical Notes
- Execute the bulk save in a single transaction boundary where supported, so metadata and row removals stay consistent.
- Validate that each requested history-row deletion is authorized for the current user before mutation.
- Preserve existing analytics and list views by handling deleted-row references safely.
- Leave alias persistence details to TICKET-064 while keeping payload contracts compatible.

## Acceptance Criteria
- [ ] Confirm on the edit screen performs one bulk save for title/description and selected history-row removals
- [ ] Only the selected history rows are removed; unselected rows remain unchanged
- [ ] Validation or authorization failures prevent partial writes and surface a safe error state
- [ ] Cancel continues to perform no mutations
- [ ] Automated coverage verifies transaction behavior, authorization checks, and mixed-update success paths
