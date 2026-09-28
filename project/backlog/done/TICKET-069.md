# TICKET-069: Add User-Scoped Item Removal Service

**Feature:** [FEA-024: Collection Item Removal](../../features/FEA-024-collection-item-removal.md)

## Goal
Provide a reusable domain operation that removes a single media item from the signed-in user's collection by deleting all of that user's activity for the item, without touching global catalog data.

## Scope
- Add a removal operation to the owning media/activity module service that takes a user id and media item id.
- Verify the item is accessible to the user and has at least one of the user's log entries before deleting.
- Delete all of the user's log entries for the item in a single transaction.
- Leave the media item record, canonical identity, and external aliases untouched.
- Return a clear result the caller can use to distinguish success from not-found/unauthorized.
- Invalidate or refresh any cached collection/stats data affected by the removal.

## Technical Notes
- Keep this logic in the domain module that already owns log entries; do not add web/render concerns here.
- Reuse existing user-access rules for media items rather than introducing a second authorization path.
- Use a single Prisma transaction so partial deletes cannot leave inconsistent activity data.
- Do not expose this operation through the public API in this ticket.

## Acceptance Criteria
- [ ] A user-scoped removal operation deletes all of the requesting user's log entries for the given item
- [ ] The global media item, canonical identity, and external aliases remain after removal
- [ ] Removal requests for items the user has no activity for return a not-found style result
- [ ] Removal cannot affect another user's log entries
- [ ] Deletion runs in one transaction
- [ ] Affected cached collection/stats data is invalidated
- [ ] Unit tests cover success, not-found, and cross-user isolation cases
