# TICKET-079: Rework Identification for User-Scoped Enrichment with Selective Field Application

**Feature:** [FEA-027: User-Scoped Media Identity and Enrichment](../../features/FEA-027-user-scoped-media-identity.md)

## Goal
Change `IdentificationService` so identifying or refetching an item enriches only the acting user's record, rejects duplicate provider ids within the user's scope, and applies only the fields the user explicitly selected.

## Scope
- Remove `mergeIntoExistingItem` entirely; identification no longer merges one item into another.
- In `identify`, after fetching provider metadata, check whether the acting user already has an item carrying the same `[provider, externalId]`; if so, throw a conflict identifying that the id is already in use on one of their items.
- Add a `fields` parameter (list of `title`, `description`, `year`, `duration`, `artwork`) to the identify and refetch operations; only listed fields are written to the item.
- Add a `refetch` operation for identified items that re-fetches provider metadata using the item's stored provider id and applies the selected fields, using the user's configured provider credentials.
- Keep the original title as a title alias on the user's item after identification (per-user alias from TICKET-077).
- Keep the `isSkeleton: false` transition and the TV-show episode sync trigger, but scope episode sync to the acting user (per TICKET-078).
- Keep image caching behavior unchanged: emit the existing `IMAGE_CACHE` event when artwork is applied.

## Technical Notes
- `identifyFromConfiguredAlias` (used by the API) must pass through the same field-selection contract; when the API does not specify fields, all available provider fields are applied (API callers get the current all-fields behavior).
- The duplicate-provider-id check must run before any write so a failed identify never partially updates the item.
- Field validation must happen server-side: unknown field names are rejected, and an empty field list is rejected.
- `assertMetadataType` and the TV-episode → TV-show type mapping stay as-is.
- The `hasUserAccess` check inside `identify` becomes an ownership check per TICKET-078.

## Acceptance Criteria
- [ ] Identifying an item updates only the acting user's item; no other user's data is read or written
- [ ] Identifying a second item to a provider id the user already has returns a conflict and writes nothing
- [ ] Only the fields present in the requested field list are written; unselected fields keep their current values
- [ ] Refetch on an identified item re-fetches provider metadata and applies only selected fields
- [ ] Unknown or empty field lists are rejected with a clear validation error
- [ ] Failed provider lookups apply no fields and surface a clear error
- [ ] Unit tests cover selective application, duplicate-id rejection, and cross-user isolation
- [ ] Type checks, lint, and unit tests pass
