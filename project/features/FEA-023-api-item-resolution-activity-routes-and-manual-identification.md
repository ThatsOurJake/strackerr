# FEA-023: API Item Resolution, Activity Routes, and Manual Identification

## Outcome
External clients follow an explicit item-first API workflow: resolve an item, create it when needed, log activity against the existing `id` field returned in item payloads, and optionally trigger manual identification later. The API v1 surface uses `/activity` terminology instead of `/log`, and no backward-compatibility layer for the old route family is required.

## Scope
- Replace the current title-first log workflow with an item-first workflow that separates item resolution, item creation, and activity creation.
- Keep one resolve endpoint, but require exactly one lookup mode per request: the existing STrackerr `id` field, title, or provider plus external id alias.
- Add a direct item read endpoint so clients can fetch the full item payload by its existing `id` field after resolving or creating it.
- Add one item creation endpoint that accepts a minimal typed payload, including title and optional external aliases, and returns the created item with its existing `id` field.
- Rename API v1 log routes from `/api/v1/log/...` to `/api/v1/activity/...` and require the target item id when creating activity.
- Evolve activity reads from the current all-user list to item-scoped activity retrieval.
- Remove top-level API request reliance on `provider` and `providerId`; external provider identities used by clients should flow through stored external aliases instead.
- Add an item-scoped manual identification endpoint that uses the authenticated user's configured metadata provider, rejects already identified items, and returns clear failure details when the required provider alias is missing or provider lookup fails.

## Dependencies
- FEA-008 provides metadata-provider selection and enrichment behavior that the new identification trigger must reuse.
- FEA-010 provides the current API v1 module, guards, DTOs, and Swagger surface that this feature intentionally reshapes.
- FEA-018 provides external alias storage and lookup, which becomes the primary API-facing external identity contract.
- FEA-013 defines the current no-reidentification constraint that this feature must preserve by returning a conflict when identification has already happened.

## UX Requirements
- Swagger at `/api/docs` must present the new client workflow clearly: resolve, create if missing, log activity, then optionally identify.
- The resolve contract must document the mutually exclusive lookup modes and reject mixed lookup inputs with a clear validation response.
- Consumer-facing route names and summaries must use `activity` rather than `log` so the API reads as a domain workflow instead of an internal diagnostics surface.
- Item payloads returned from resolve, create, and direct-read endpoints must be consistent so importer clients can reuse responses without payload translation.

## Security Requirements
- All new and updated endpoints must remain protected by `X-API-Key` and scoped to the authenticated user's accessible items.
- Item-scoped activity writes must verify that the requested activity route matches the target item's media type before creating data.
- Resolve, create, and identify flows must validate provider namespaces, external ids, and mutually exclusive request modes server-side.
- The identification endpoint must not permit reidentification, must not fetch metadata for arbitrary unsupported alias namespaces, and must return safe conflict/not-found/failure responses without leaking other users' data.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-065](../backlog/todo/TICKET-065.md) | Redesign API v1 item resolve, item read, and item creation contracts around an item-first workflow |
| [TICKET-066](../backlog/todo/TICKET-066.md) | Replace `/log` with item-id-based `/activity` endpoints and item-scoped activity reads |
| [TICKET-067](../backlog/todo/TICKET-067.md) | Rework identification sourcing to rely on stored external aliases and the user's configured metadata provider |
| [TICKET-068](../backlog/todo/TICKET-068.md) | Add the item-scoped manual identification API endpoint and update Swagger coverage for the new workflow |

## Done Signal
- API clients can resolve a media item by exactly one lookup mode, create a minimal item when it does not exist, and receive the existing `id` field suitable for follow-up calls.
- API clients can submit and read activity through `/api/v1/activity` using the existing item `id` field, with route-level type safety.
- Manual identification can be triggered per item when the configured provider alias exists, while already identified items return a conflict and failed provider fetches surface clearly.
- Swagger and automated coverage reflect the new importer-oriented workflow without preserving the legacy `/log` contract.
