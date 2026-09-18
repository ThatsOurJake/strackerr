# TICKET-066: Replace `/log` with Item-Id-Based `/activity` Endpoints and Item-Scoped Reads

**Feature:** [FEA-023: API Item Resolution, Activity Routes, and Manual Identification](../../features/FEA-023-api-item-resolution-activity-routes-and-manual-identification.md)

## Goal
Make activity creation explicit and domain-correct by requiring a target item id, renaming the public route family to `/activity`, and limiting reads to activity for one specific item.

## Scope
- Rename the API v1 controller, routes, DTO summaries, and Swagger tags from `log` to `activity`.
- Replace title-based activity creation with item-id-based creation across the media-specific activity endpoints.
- Keep media-specific activity routes aligned with current payload differences, such as TV episode season/episode fields and game or movie duration handling.
- Add route-level safety checks so a movie activity endpoint cannot log against a TV show item, and equivalent mismatches fail cleanly.
- Replace the current all-user `GET /api/v1/log` style listing with item-scoped activity retrieval for one media item.
- Remove the legacy `/api/v1/log/...` route family from the public API v1 surface rather than preserving a compatibility layer.

## Technical Notes
- Reuse existing log-entry persistence and deduplication rules where possible; this ticket changes public contract and validation, not the underlying activity model.
- Choose request shapes that keep importer flows simple, with the existing item `id` field passed explicitly on each activity write.
- Item-scoped activity reads must still enforce authenticated access to the target item and return only the caller's activity rows.
- Update OpenAPI examples so the documented workflow starts from a resolved or created item id rather than a title-only POST.

## Acceptance Criteria
- [ ] Public activity write endpoints live under `/api/v1/activity/...` and require a target item id
- [ ] Activity writes reject item-type mismatches with clear validation or conflict responses
- [ ] Item-scoped activity reads return only the authenticated user's rows for the requested item
- [ ] The legacy `/api/v1/log` route family is no longer part of the API v1 surface
- [ ] Automated coverage verifies item-id-based writes, type mismatch failures, and item-scoped activity reads
