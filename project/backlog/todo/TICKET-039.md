# TICKET-039: Safe Media Reidentification

**Feature:** [FEA-013: Search and Identification Corrections](../../features/FEA-013-search-identification-corrections.md)

## Goal
Allow users to correct a mistaken media identification without deleting or recreating their activity.

## Scope
- Add a Reidentify action to identified media detail where the signed-in user has access.
- Reuse the existing provider search and result-selection workflow for the item's media type.
- Present the current identity while the replacement is being selected.
- Require confirmation before applying the replacement.
- Update provider identity and normalized metadata while preserving the media item's log entries.
- Trigger appropriate enrichment and image cache work for the replacement metadata.
- Handle conflicts when the selected provider identity already exists in the shared catalog.

## Data Integrity and Security
- Validate media type compatibility and provider identifiers server-side.
- Preserve log ownership, timestamps, notes, duration, and type-specific activity fields.
- Resolve an existing-target conflict transactionally by safely relinking permitted log entries rather than creating duplicate provider identities.
- Require authentication, user access to the source item, and CSRF protection for the mutation.

## Acceptance Criteria
- [ ] An identified media detail page exposes a clear Reidentify action
- [ ] The replacement search is constrained to compatible provider results
- [ ] Confirmation shows the current and proposed identities before mutation
- [ ] Reidentification preserves all associated log-entry data
- [ ] Selecting an identity already in the catalog does not create a duplicate media item
- [ ] Unauthorized or incompatible reidentification requests are rejected without changing data
- [ ] Successful reidentification refreshes normalized metadata and artwork jobs
