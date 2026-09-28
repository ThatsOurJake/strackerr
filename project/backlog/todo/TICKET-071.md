# TICKET-071: Add Orphaned Collection Item Cleanup to Maintenance Settings

**Feature:** [FEA-024: Collection Item Removal](../../features/FEA-024-collection-item-removal.md)

## Goal
Let administrators remove media items that no user references anymore, so per-user deletions do not leave the global catalog filling up with unreachable records.

## Scope
- Add a `Clean up orphaned items` action to the Maintenance settings tab, alongside the existing unused-image cleanup action.
- Run cleanup through the existing background job infrastructure so the web request returns promptly.
- Identify media items with no log entries from any user and no remaining dependants (for example child episodes still in use).
- Delete only the orphaned items and their owned records (canonical identity links, external aliases, cached metadata rows).
- Emit the existing `Events.MEDIA_ITEM_DELETED` event per removed item so downstream image cleanup stays consistent.
- Report job start, completion, removed-item count, and failures through existing job logging and settings feedback patterns.
- Prevent concurrent cleanup runs.

## Technical Notes
- Mirror the shape of `ImageCleanupService` for job start, concurrency guard, logging, and result reporting.
- Skip skeleton/placeholder items that identification or episode sync may still be actively re-linking.
- Batch deletions so a large catalog cleanup does not hold one long transaction.
- Keep the orphan query in the owning media module; the settings controller only starts the job and renders feedback.

## Safety Requirements
- Require authenticated administrator access and CSRF protection to start cleanup.
- If FEA-025 has landed, the cleanup route must carry its own route-level administrator guard rather than relying on a controller-wide guard.
- An item must be proven unreferenced by every user before deletion; never infer orphan status from a single user's activity.
- A failure while deleting one item must be logged and must not abort the remaining cleanup or leave partial per-item deletes.
- Cleanup must never delete items that still have user activity, including activity created while the job is running.

## Acceptance Criteria
- [ ] Maintenance settings exposes a deliberate `Clean up orphaned items` action
- [ ] Starting cleanup returns promptly and executes as a background job
- [ ] Cleanup removes only media items with no log entries from any user and no active dependants
- [ ] Each removed item emits `Events.MEDIA_ITEM_DELETED`
- [ ] The removed-item count and failures are surfaced in settings feedback and job logs
- [ ] A second cleanup cannot start while one is already running
- [ ] Only authenticated administrators with a valid CSRF token can start cleanup
- [ ] Unit tests cover orphan detection, referenced-item protection, and concurrency guarding
