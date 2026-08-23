# TICKET-007: Media Module

**Feature:** [FEA-002: Core Data Model](../../features/FEA-002-core-data-model.md)

## Goal
Implement the core `MediaService` that handles media item creation, alias resolution, skeleton management, and sort title computation.

## Scope
- `MediaModule` exporting `MediaService`
- `MediaService` methods:
  - `findOrCreateSkeleton(title, type, userId)` — normalises title, checks aliases, creates skeleton `MediaItem` if not found
  - `findByExternalId(provider, externalId)` — looks up by `MediaExternalId`
  - `findById(id)` — standard lookup
  - `create(data)` — creates an identified `MediaItem`, computes `sortTitle`
  - `update(id, data)` — updates fields, recomputes `sortTitle` if title changes
  - `addAlias(mediaItemId, rawAlias)` — normalises and inserts `MediaAlias` (upsert, ignore duplicate)
  - `addExternalId(mediaItemId, provider, externalId)` — upsert `MediaExternalId`
  - `computeSortTitle(title)` — returns sort key
  - `normaliseAlias(title)` — returns normalised string for alias matching

## Title Normalisation (for alias matching)
1. Lowercase
2. Trim whitespace
3. Strip trailing year in parentheses, e.g. `"Severance (2022)"` → `"severance"`
4. Strip non-alphanumeric characters except spaces

## Sort Title Computation
1. Strip leading articles case-insensitively: `"The "`, `"A "`, `"An "`
2. If first character is non-Latin (e.g. Japanese, Chinese, Korean) or a digit → prefix with `"#"` to bucket under `#` in the alphabetical sidebar
3. Lowercase the result

## `findOrCreateSkeleton` Logic
1. Normalise the incoming title
2. Look up `MediaAlias` by normalised alias → return linked `MediaItem` if found
3. If not found, create `MediaItem` with `isSkeleton: true`, `createdByUserId: userId`, compute `sortTitle`
4. Add normalised title as a `MediaAlias` on the new item
5. Wrap steps 2–4 in a Prisma transaction to avoid race conditions

## Acceptance Criteria
- [ ] `findOrCreateSkeleton("The Office", TV_SHOW, userId)` and `findOrCreateSkeleton("the office", TV_SHOW, userId)` return the same `MediaItem`
- [ ] `computeSortTitle("The Office")` returns `"office"`
- [ ] `computeSortTitle("A Bug's Life")` returns `"bug's life"`
- [ ] `computeSortTitle("進撃の巨人")` returns `"#進撃の巨人"`
- [ ] `computeSortTitle("1917")` returns `"#1917"`
- [ ] Skeleton is created with `isSkeleton: true` and `createdByUserId` set
- [ ] Calling `findOrCreateSkeleton` twice with the same title returns the same record (no duplicates)
- [ ] `addAlias` does not throw on duplicate alias (idempotent)
