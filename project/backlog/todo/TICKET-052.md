# TICKET-052: Limit OpenAPI Output to the Public API Surface

**Feature:** [FEA-018: Consumer API and External ID Aliases](../../features/FEA-018-consumer-api-and-external-id-aliases.md)

## Goal
Make Swagger describe only the consumer API so users are not exposed to internal HTML, partial, or HTMX-oriented endpoints.

## Scope
- Change OpenAPI document generation to include only the API v1 module or controllers.
- Keep Swagger UI served at `/api/docs` with API-key authentication support.
- Review tags, operation summaries, and DTO descriptions so the published spec reads as an external integration surface.
- Add or update tests that fail if non-API paths appear in the generated document.

## Technical Notes
- Prefer restricting the document at generation time instead of relying on per-controller exclusions across web controllers.
- Preserve the current API route paths and response schemas unless required for documentation clarity.
- Add at least one assertion that documented paths stay under `/api/` and exclude view or partial endpoints.

## Acceptance Criteria
- [ ] `GET /api/docs` renders Swagger UI without exposing internal web or HTMX routes
- [ ] Generated OpenAPI paths are limited to the intended public API controllers
- [ ] Swagger still supports `X-API-Key` authorization and try-it-out behavior
- [ ] Automated coverage prevents future route leakage into the public spec
