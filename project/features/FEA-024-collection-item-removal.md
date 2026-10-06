# FEA-024: Collection Item Removal

## Outcome
Users can permanently remove an item from their own collection from the existing item edit screen, after an explicit confirmation step, and land back on the collection with clear feedback. Administrators can then clear catalog items that no user references anymore.

## Scope
- Add a destructive Delete action to the existing item edit screen, visually separated from the normal save flow.
- Require an explicit in-page confirmation before the delete request is submitted.
- Remove all of the signed-in user's activity/log entries for the item so it no longer appears in their collection, history, or stats.
- Leave the global media record, canonical identity, and external aliases intact for other users.
- Redirect to the collection page with a success flash message after a successful delete.
- Add an admin Maintenance settings action that clears orphaned catalog items no user references anymore, matching the existing unused-image cleanup pattern.
- UI-only for this feature; no public API delete endpoint is introduced.

## Non-Goals
- Undo, soft-delete, or trash/restore behavior.
- API v1 delete endpoints.
- Automatic or scheduled catalog pruning; orphan cleanup is an explicit admin action.

## Dependencies
- FEA-006 provides the collection and item detail experience that the user returns to after deletion.
- FEA-022 provides the item edit screen where the delete action lives.
- FEA-014 provides the Maintenance settings action and background-job cleanup pattern reused by orphan cleanup.

## UX Requirements
- Delete must live on the item edit screen in a clearly destructive area, separate from the bulk save action.
- Delete must never be a single-click action; the user must pass an explicit confirmation step naming the item.
- Confirmation copy must state that removal is permanent and that all of the user's history for the item will be removed.
- Canceling confirmation must leave the user on the edit screen with in-progress edits unchanged.
- After a successful delete, the user lands on the collection page with a success flash message that names the removed item.
- Attempting to delete an item that is already gone must fail gracefully with a user-facing message, not an error page.
- Orphan cleanup must sit in the Maintenance settings tab next to unused-image cleanup, return promptly, and report how many items were removed.

## Security Requirements
- The delete route must be authenticated and CSRF-protected, consistent with existing edit routes.
- Deletion must be scoped to the signed-in user's own data; one user must never be able to remove another user's activity.
- Delete must use a non-GET method so it cannot be triggered by link prefetch or crawling.
- Removal of the user's entries must be transactional so partial deletion cannot leave orphaned or inconsistent activity data.
- Unauthorized or unknown item ids must return a not-found style response without leaking whether the item exists for other users.
- Orphan cleanup must require authenticated administrator access with CSRF protection and may only delete items proven unreferenced by every user.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-069](../backlog/done/TICKET-069.md) | Add user-scoped item removal service with ownership checks and transactional deletion |
| [TICKET-070](../backlog/done/TICKET-070.md) | Add delete action, confirmation flow, and post-delete redirect to the item edit screen |
| [TICKET-071](../backlog/done/TICKET-071.md) | Add admin Maintenance action that clears orphaned collection items no user references |

## Done Signal
- A user can delete an item from their collection via the item edit screen after confirming.
- All of that user's log entries for the item are removed in one transaction and the item disappears from their collection, history, and stats.
- The global media record and aliases remain available to other users.
- The user is returned to the collection page with a success flash message.
- Unauthenticated, cross-user, or unknown-item delete attempts are rejected safely.
- Administrators can clear orphaned catalog items from Maintenance settings and see how many were removed.
