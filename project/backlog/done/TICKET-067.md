# TICKET-067: Rework Identification Sourcing Around Stored External Aliases

**Feature:** [FEA-023: API Item Resolution, Activity Routes, and Manual Identification](../../features/FEA-023-api-item-resolution-activity-routes-and-manual-identification.md)

## Goal
Make identification independent of API clients remembering a canonical provider pair by sourcing metadata lookups from the item's stored external aliases and the authenticated user's configured metadata provider.

## Scope
- Update identification logic so the selected metadata provider for the authenticated user is mapped to the corresponding stored alias namespace on the item.
- Fail identification when the item does not have a usable external id for that configured provider.
- Preserve the current no-reidentification rule by treating already identified items as conflicts.
- Ensure provider-specific external-id validation still runs before outbound metadata fetches.
- Return explicit service-level outcomes for missing provider alias, already identified items, provider lookup failure, and alias collisions.

## Technical Notes
- Canonical metadata identities should remain internal enrichment state, not a required client-managed field in create or activity requests.
- Unsupported alias namespaces may still exist on items, but only the configured metadata provider namespace should be eligible for the identify workflow.
- Keep the mapping between provider settings and external-alias namespace deterministic so future refetch support can reuse the same rule.
- Review existing identification tests to ensure conflict and merge behavior still protects shared catalog integrity.

## Acceptance Criteria
- [ ] Identification resolves the external id to fetch from the item's stored aliases using the authenticated user's configured metadata provider
- [ ] Missing alias data for the configured provider causes a clear non-success outcome instead of a silent no-op
- [ ] Already identified items still return a conflict-compatible outcome
- [ ] Invalid provider external ids are rejected before provider fetches run
- [ ] Automated coverage verifies alias-driven identification sourcing and the main failure modes
