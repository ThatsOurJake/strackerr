# FEA-027: User-Scoped Media Identity and Enrichment

## Outcome
Each user owns their own media records end to end. Identifying an item enriches only that user's record, provider ids and external aliases are unique per user, and a user's importer aliases can never block or resolve another user's items. Shared image caching is preserved as a purely technical concern.

## Scope
- Make every media item explicitly owned by a user; remove the shared global catalog behavior for identified items.
- Scope canonical provider ids (`MediaExternalId`) per user so two users can independently store the same provider id on their own items.
- Scope external aliases (`MediaExternalAlias`) per user so importer aliases such as `steam:app:1145360` are unique per user, not globally.
- Scope title aliases (`MediaAlias`) per user so title-based lookup and deduplication never cross user boundaries.
- Reject identification when the acting user already has an item carrying the same provider id (no cross-user or same-user merging).
- Rework the identify confirm flow to show a field-by-field diff of the provider metadata against the current item, with per-field checkboxes (title, description, year, duration, artwork) that the user can tick or untick before applying.
- Add a user-scoped refetch action for identified items that re-fetches provider metadata and applies only the fields the user selected.
- Keep the existing image caching behavior unchanged (per-item cache files keyed by source URL); no new sharing mechanism is introduced.
- Make TV episode sync per user: each user's identified show gets its own episode rows under their own show record.
- Update API v1 resolve, create, and identify flows so all lookups and writes are scoped to the authenticated user.

## Non-Goals
- Backward compatibility or data migration for existing shared data (app is not live).
- Cross-user sharing, collaboration, or "merge my item with another user's item" features.
- Changing provider credential storage or per-user provider preferences.

## Dependencies
- FEA-002 provides the core data model and media catalog service that this feature reshapes.
- FEA-008 provides metadata-provider selection and enrichment behavior that identification and refetch reuse.
- FEA-009 provides the shared image cache that remains unchanged in sharing behavior.
- FEA-018 provides the external alias model and API surface that becomes user-scoped.
- FEA-023 provides the item-first API workflow (resolve, create, identify) that must stay intact while becoming user-scoped.

## UX Requirements
- The identify confirm screen must show a field-by-field diff (current value vs provider value) for title, description, year, duration, and artwork, with a checkbox per field defaulting to checked.
- Unticked fields must be visibly marked as "keep current value" so the outcome is predictable before submit.
- The item page must expose a refetch action for identified items that opens the same diff/checkbox experience and applies only selected fields.
- Refetch and identify must surface clear errors when the provider lookup fails, without partially applying any fields.
- Collection, search, and item detail views must continue to show only the signed-in user's items and their own metadata.

## Security Requirements
- Every media read, write, resolve, and identify operation must be scoped to the authenticated user; a user must never resolve, read, or mutate another user's item by id, title, provider id, or alias.
- Provider id and alias uniqueness constraints must be enforced at the database level per user, not only in application code.
- The refetch endpoint must validate the requested field list server-side and reject unknown fields.
- Rejecting duplicate provider ids must return a clear conflict response that does not leak the existence or details of the user's other items beyond what they already own.
- Image cache behavior is unchanged; cached image files remain per item and must not be served to users who do not own the item.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-077](../backlog/done/TICKET-077.md) | Migrate the schema to user-owned media items with per-user provider ids, aliases, and title aliases |
| [TICKET-078](../backlog/done/TICKET-078.md) | Rework media service lookups, creation, and access checks to be user-scoped |
| [TICKET-079](../backlog/done/TICKET-079.md) | Rework identification to enrich only the acting user's item, reject duplicate provider ids, and support selective field application |
| [TICKET-080](../backlog/done/TICKET-080.md) | Update the identify confirm UI, refetch action, and API v1 surface for user-scoped identity and selective enrichment |

## Done Signal
- Two users can independently create, identify, and refetch items with the same provider id and the same importer aliases without either user's data affecting the other.
- Identifying an item updates only the acting user's record, and the confirm screen lets the user choose exactly which provider fields are applied.
- A user who already has an item with a provider id receives a clear conflict when trying to identify a second item to the same id.
- API v1 resolve, create, and identify flows are fully user-scoped and documented as such in Swagger.
- TV episode sync creates episode rows under the acting user's own show record only.
