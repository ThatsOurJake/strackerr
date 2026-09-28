# TICKET-070: Add Item Delete Action and Confirmation Flow to Edit Screen

**Feature:** [FEA-024: Collection Item Removal](../../features/FEA-024-collection-item-removal.md)

## Goal
Let users remove an item from their collection through the existing item edit screen, guarded by an explicit confirmation step and followed by a clear return to the collection.

## Scope
- Add a destructive delete area to the item edit screen, visually separated from the bulk save action.
- Add an in-page confirmation dialog that names the item and states the removal is permanent.
- Wire the confirmed delete to a POST (or DELETE) route on the item web controller that calls the removal service from TICKET-069.
- Redirect to the collection page with a success flash naming the removed item.
- Show a user-facing error flash and keep the user on a safe page when removal fails or the item is not found.
- Ensure cancel from the confirmation returns to the edit screen with in-progress edits intact.

## Technical Notes
- Reuse the existing edit screen layout, button, and dialog patterns so the destructive area feels native.
- Include the existing CSRF token in the delete submission, matching the current edit form.
- Keep the delete request separate from the bulk save submission so saving cannot accidentally delete.
- Put confirmation behavior in the existing item edit frontend module rather than inline scripts.
- Keep controller logic to request/response and redirect concerns only.

## Acceptance Criteria
- [ ] The item edit screen shows a clearly destructive delete action separate from save
- [ ] Delete requires explicit confirmation naming the item and stating the action is permanent
- [ ] Canceling confirmation leaves the user on the edit screen with unsaved edits preserved
- [ ] Confirmed delete uses a non-GET, CSRF-protected route scoped to the signed-in user
- [ ] Successful delete redirects to the collection page with a success flash naming the item
- [ ] Failed or not-found deletes show an error flash instead of an error page
- [ ] Automated coverage verifies route auth, CSRF requirement, success redirect, and failure handling
