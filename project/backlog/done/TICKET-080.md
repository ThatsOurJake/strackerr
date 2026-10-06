# TICKET-080: Update Identify Confirm UI, Refetch Action, and API v1 Surface for User-Scoped Identity

**Feature:** [FEA-027: User-Scoped Media Identity and Enrichment](../../features/FEA-027-user-scoped-media-identity.md)

## Goal
Present the selective-enrichment experience in the web UI (identify confirm and a new refetch action) and update the API v1 media surface so resolve, create, and identify are documented and enforced as user-scoped.

## Scope
- Rework the identify confirm partial to show a field-by-field diff (current value vs provider value) for title, description, year, duration, and artwork, with a checkbox per field defaulting to checked.
- Unticked fields must be visibly marked as "keep current value" in the confirm view.
- Submit the selected field list with the identify POST so only chosen fields are applied.
- Add a refetch action on the item page for identified items that opens the same diff/checkbox experience and submits to a refetch endpoint.
- Update the identify controller to fetch provider metadata for the diff, pass the selected fields through to `IdentificationService`, and handle conflict/validation errors with clear user-facing messages.
- Update API v1:
  - resolve, create, and identify endpoints must be scoped to the authenticated user (per TICKET-078/079) and Swagger descriptions must state that lookups only see the caller's items.
  - the identify endpoint must accept an optional `fields` list; when omitted, all provider fields are applied.
  - add a refetch endpoint for identified items with the same `fields` contract.
- Update the item edit screen (FEA-022) so alias add/edit/remove operates on the user's own aliases and conflict messages reflect per-user uniqueness.

## Technical Notes
- The confirm flow already fetches provider metadata via `metadataService.getProviderForUser` and renders `partials/identify-confirm`; extend that partial with the diff table and checkboxes rather than adding a new screen.
- Follow `design.md` component patterns for the diff table (type accent colours, badge styles, dark-mode-first).
- Refetch must reuse the item's stored provider id; if the item has no provider id, the refetch action is not shown.
- API error responses for duplicate provider ids must not leak details of the user's other items beyond a clear "already in use" conflict.
- Update existing API and controller specs to the new user-scoped contracts.

## Acceptance Criteria
- [ ] The identify confirm screen shows a per-field diff with checkboxes, all checked by default
- [ ] Submitting identify applies only the checked fields and redirects back to the item page
- [ ] Identified items expose a refetch action that reuses the same diff/checkbox experience
- [ ] Refetch applies only the checked fields and surfaces provider failures without partial writes
- [ ] API v1 resolve, create, identify, and refetch are user-scoped and documented as such in Swagger
- [ ] Duplicate provider id conflicts return a clear 409 without leaking other items' details
- [ ] Item edit alias management reflects per-user uniqueness
- [ ] View-model, controller, and API specs are updated and pass
- [ ] Type checks, lint, and unit tests pass
