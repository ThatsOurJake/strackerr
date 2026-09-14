# TICKET-064: Add External Alias Add/Edit/Remove to Bulk Item Edit Flow

**Feature:** [FEA-022: Item Metadata Editing and Alias/History Management](../../features/FEA-022-item-metadata-editing-and-alias-history-management.md)

## Goal
Allow users to add, edit, and remove external aliases for an item from the same edit screen and persist those changes in the same confirm save action.

## Scope
- Implement alias section behavior for add/edit/remove interactions in the item edit screen.
- Extend bulk-save handling so alias mutations are committed together with other pending item edits.
- Support alias validation errors at field level without losing in-progress edit context.
- Ensure alias removals are intentional and visible in the edit summary area before confirm.

## Technical Notes
- Enforce provider/external-id validation and uniqueness rules consistent with existing alias model behavior.
- Protect canonical identity lookups by preventing invalid alias rewrites that would break provider mapping.
- Keep one save contract for metadata, row removals, and alias changes so the confirm action remains truly bulk.
- Maintain clear server-side conflict responses for duplicate or unauthorized alias operations.

## Acceptance Criteria
- [ ] Users can add, edit, and remove aliases from the item edit screen
- [ ] Alias changes persist through the same confirm action used for metadata/history edits
- [ ] Alias validation and conflict errors are surfaced clearly and block unsafe saves
- [ ] Bulk saves do not partially apply alias changes when the combined request is invalid
- [ ] Automated coverage verifies alias create/update/delete behavior in the combined edit workflow
