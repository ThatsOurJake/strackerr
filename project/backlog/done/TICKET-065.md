# TICKET-065: Redesign API v1 Item Resolve, Item Read, and Item Creation Contracts

**Feature:** [FEA-023: API Item Resolution, Activity Routes, and Manual Identification](../../features/FEA-023-api-item-resolution-activity-routes-and-manual-identification.md)

## Goal
Replace the current API's implicit title-first logging dependency with explicit item lookup, direct item reads, and simple item creation that returns the existing `id` field already used in item payloads.

## Scope
- Refactor the existing resolve flow so one endpoint accepts exactly one lookup mode per request:
  - the existing STrackerr `id` field from item payloads
  - title
  - provider plus external id alias
- Reject mixed lookup modes and underspecified alias lookups with 400 validation errors.
- Add `GET /api/v1/media/:mediaItemId` to return the authenticated user's accessible item payload by its existing `id` field.
- Add `POST /api/v1/media` to create a minimal item using media type, title, and optional external aliases, then return the created item payload including the existing `id` field.
- Ensure created and resolved item responses share one stable DTO shape so importer clients can chain calls without translation.
- Add a lightweight authenticated profile endpoint for importer sanity checks so clients can verify API key validity before running resolve/create/activity flows.

## Technical Notes
- Treat provider plus id lookup as external-alias resolution first; clients should not need to understand canonical metadata identity internals.
- Remove API-contract dependence on top-level `provider` and `providerId` for these workflows; external aliases become the API-facing external identity shape.
- Keep user access checks consistent with existing media access rules so direct item reads and resolve responses never expose inaccessible items.
- Preserve the current `/api/v1/media` route family rather than introducing a second top-level item namespace.

## Acceptance Criteria
- [ ] Resolve requests succeed only when exactly one supported lookup mode is supplied
- [ ] `GET /api/v1/media/:mediaItemId` returns the full accessible item payload and 404s for inaccessible items
- [ ] `POST /api/v1/media` creates a minimal typed item and returns its existing `id` field in the standard media response
- [ ] External alias input is normalized and validated during create and resolve flows
- [ ] Automated coverage verifies mixed-mode resolve requests are rejected and item responses stay consistent across create, resolve, and direct read
- [x] `GET /api/v1/profile` returns basic API-key-attached profile details and uses a 404 not-found response when API keys are missing or invalid

## Progress Notes
- 2026-09-21: Added `GET /api/v1/profile` as an API-key sanity-check endpoint with basic profile data (`id`, `username`, `isAdmin`, `createdAt`) and a 404 invalid-key behavior for security parity.
