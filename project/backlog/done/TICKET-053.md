# TICKET-053: Add First-Class External ID Alias Storage and Resolution

**Feature:** [FEA-018: Consumer API and External ID Aliases](../../features/FEA-018-consumer-api-and-external-id-aliases.md)

## Goal
Allow one shared media item to be resolved by additional provider namespaces and external IDs, even when those providers are not supported for metadata enrichment.

## Scope
- Introduce a dedicated persistence model for external ID aliases that is distinct from the canonical metadata identity record used for enrichment.
- Normalize provider namespace and external ID values server-side before storage and lookup.
- Enforce a maximum external ID length of 128 characters.
- Preserve existing aliases when a skeleton is identified or reidentified into a canonical metadata-backed item.
- Add service-level lookup and conflict handling for provider plus external ID aliases.

## Technical Notes
- Keep canonical metadata-backed provider identities as the source of truth for enrichment and reidentification workflows.
- External aliases should be globally unique on provider namespace plus external ID so one imported identity cannot resolve to multiple catalog items.
- Unsupported provider namespaces should be treated as opaque strings, not as metadata providers to invoke.
- Identification merges must carry forward existing external aliases rather than dropping them.

## Acceptance Criteria
- [ ] A media item can store additional provider plus external ID aliases beyond its canonical metadata identity
- [ ] Unsupported provider namespaces are accepted as aliases without triggering metadata fetch behavior
- [ ] External ID values longer than 128 characters are rejected
- [ ] Alias lookups resolve the correct shared media item after identification and reidentification flows
- [ ] Conflicting alias assignments are handled deterministically without duplicate mappings
