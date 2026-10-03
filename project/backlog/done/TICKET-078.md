# TICKET-078: Rework Media Service Lookups, Creation, and Access Checks to Be User-Scoped

**Feature:** [FEA-027: User-Scoped Media Identity and Enrichment](../../features/FEA-027-user-scoped-media-identity.md)

## Goal
Make every media lookup, creation, and access check in `MediaService` (and the collection/search services that rely on it) operate within a single user's scope, so no query can return or mutate another user's item.

## Scope
- Update `findOrCreateSkeleton` to look up title aliases within the acting user's scope only.
- Update `findByExternalId`, `findByExternalAlias`, and `resolveByExternalLookup` to require a `userId` and scope the query to that user's provider ids and aliases.
- Update `findOrCreateIdentified` to create items owned by the acting user and to check for existing provider ids within that user's scope.
- Update `createSkeletonWithExternalAliases` so alias conflict checks are per user (a user's own duplicate alias is a conflict; another user's identical alias is not).
- Update `addExternalId`, `addExternalAlias`, and `addAlias` to take a `userId` and enforce per-user uniqueness.
- Update `hasUserAccess` so access is simply "the item belongs to the user" (plus the existing TV-show-via-episode rule), removing the shared-catalog fallback that grants access through any user's log entry.
- Update `searchForUser`, `searchTvShowCandidatesForUser`, `resolveByTitleForUser`, and `CollectionService.findCollection`/`findDetail` to query only the user's items.
- Update `EpisodeSyncService` so `upsertEpisode` and `relinkSkeletonLogs` operate only on the acting user's show and its episodes.

## Technical Notes
- `hasUserAccess` currently falls back to "any user has a log entry on this item" for identified items; with user-owned items that fallback is removed and ownership is the sole rule.
- `resolveByTitleForUser` currently scans all items with an exact title and filters by access; it should query the user's items directly.
- `CollectionService.findCollection` currently uses an `OR` across `createdByUserId`, `logEntries.some`, and episode log entries; with user-owned items the query reduces to `createdByUserId: userId` (plus the TV-show-via-episode case, which is now the same user's episodes).
- `EpisodeSyncService.upsertEpisode` currently sets `createdByUserId: null` on update; it must set the acting user's id instead.
- Keep `MediaService.create` and `update` as low-level primitives; user scoping is enforced by the callers passing the owning user.

## Acceptance Criteria
- [ ] No media lookup method resolves an item that does not belong to the requested user
- [ ] Creating a skeleton or identified item always records the acting user as owner
- [ ] Alias and provider-id conflict detection is per user; identical values owned by another user do not conflict
- [ ] `hasUserAccess` returns true only for items owned by the user (including TV shows reached through the user's own episodes)
- [ ] Collection and search results contain only the signed-in user's items
- [ ] Episode sync creates and updates only the acting user's episode rows
- [ ] Unit tests cover cross-user isolation for every lookup and mutation path
- [ ] Type checks, lint, and unit tests pass
