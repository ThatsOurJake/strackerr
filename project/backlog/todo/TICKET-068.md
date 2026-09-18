# TICKET-068: Add Item-Scoped Manual Identification Endpoint and Document the New Importer Flow

**Feature:** [FEA-023: API Item Resolution, Activity Routes, and Manual Identification](../../features/FEA-023-api-item-resolution-activity-routes-and-manual-identification.md)

## Goal
Expose a consumer-facing endpoint that lets clients trigger identification for one item using the user's configured provider setup, then document the complete resolve/create/activity/identify workflow in Swagger.

## Scope
- Add an item-scoped identification endpoint under the existing media route family, such as `POST /api/v1/media/:mediaItemId/identity` or equivalent.
- Require API-key authentication and item access checks.
- Return a success response when identification starts or completes, 409 when the item is already identified, and a clear non-2xx response when the configured provider alias is missing or the metadata fetch fails.
- Update Swagger route summaries, examples, and response descriptions to explain the intended importer workflow:
  - resolve by one mode
  - create if missing
  - log activity by item id
  - identify later when desired
- Add or update controller and OpenAPI tests to pin the new route set and the removal of legacy `/log` documentation.

## Technical Notes
- Keep the route under the item resource so the request shape stays minimal and clients do not need to repeat provider information already implied by settings plus stored aliases.
- Choose response codes that distinguish validation, conflict, and upstream-provider failure clearly for importer clients.
- Swagger examples should show that identification is optional for import completion and can happen after activity has already been logged.
- Ensure the generated OpenAPI document reflects the final public route family names and hides removed legacy endpoints.

## Acceptance Criteria
- [ ] API clients can trigger identification for an accessible item through one item-scoped endpoint
- [ ] Already identified items return 409 and missing configured-provider alias data returns a clear failure response
- [ ] Upstream metadata lookup failures are surfaced in a consumer-usable way without exposing internal stack details
- [ ] Swagger documents the new importer workflow and no longer presents legacy `/log` routes
- [ ] Automated coverage verifies endpoint responses and public OpenAPI route contents
