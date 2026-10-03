# TICKET-077: Migrate Schema to User-Owned Media Items with Per-User Ids and Aliases

**Feature:** [FEA-027: User-Scoped Media Identity and Enrichment](../../features/FEA-027-user-scoped-media-identity.md)

## Goal
Change the Prisma schema so every media item is owned by a user and all identity-bearing records (provider ids, external aliases, title aliases) are unique per user instead of globally.

## Scope
- Make `MediaItem.createdByUserId` required (non-nullable) and rename the relation semantics from "skeleton owner" to "owner".
- Add `userId` to `MediaExternalId` and change the unique constraint from `[provider, externalId]` to `[userId, provider, externalId]`.
- Add `userId` to `MediaExternalAlias` and change the unique constraint from `[providerNamespace, externalId]` to `[userId, providerNamespace, externalId]`.
- Add `userId` to `MediaAlias` and change the unique constraint from `[alias]` to `[userId, alias]`.
- Add a `userId` index on `MediaItem` to support user-scoped collection and search queries.
- Keep `CachedImage` keyed by `mediaItemId` + `sourceUrl` (unchanged); image sharing is handled at the file level, not the schema level.
- Create a new migration; no data migration or backfill is required (app is not live).

## Technical Notes
- `MediaItem` currently uses `createdByUserId String?` with a `SkeletonOwner` relation; identified items set it to `null`. After this change every item has an owner, so the `isSkeleton` flag remains the only distinction between unidentified and identified items.
- `LogEntry` already carries `userId`, so activity scoping is unaffected.
- `MediaItem.parentId` (TV episode → show) stays as-is; episodes belong to the same user's show record, so no cross-user parent references can occur once ownership is enforced at creation time.
- Update `prisma/schema.prisma` and generate the client; verify `pnpm prisma migrate dev` produces a clean migration on a fresh database.

## Acceptance Criteria
- [ ] `MediaItem.createdByUserId` is non-nullable and every item row has an owner
- [ ] `MediaExternalId` is unique per `[userId, provider, externalId]`
- [ ] `MediaExternalAlias` is unique per `[userId, providerNamespace, externalId]`
- [ ] `MediaAlias` is unique per `[userId, alias]`
- [ ] Migration applies cleanly to a fresh database and the Prisma client regenerates without errors
- [ ] Type checks and lint pass after the schema change
