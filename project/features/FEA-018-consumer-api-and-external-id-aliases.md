# FEA-018: Consumer API and External ID Aliases

## Outcome
The openai documentation is tidied up to avoid confusion for external consumings and stop exposing HTMX routes. New and updated endpoints to help with alias look-up and creation. 

## Scope
- Restrict generated OpenAPI output to the public API surface so Swagger shows only consumer-relevant API endpoints.
- Keep metadata-backed provider identities as the canonical identification source while adding first-class external ID aliases for additional provider namespaces.
- Allow unsupported provider namespaces, such as Steam, to be stored as opaque aliases when the namespace and external ID pass server-side validation.
- Support API lookup by provider plus external ID alias in addition to existing title-alias search.
- Add API flows to create, list, and remove external ID aliases for an existing media item and to accept aliases during create or import-style requests.

## Dependencies
- FEA-002 provides the shared media catalog and alias storage patterns.
- FEA-008 provides canonical metadata-provider identification and enrichment behavior.
- FEA-010 provides the current API routes and Swagger setup that this feature refines.
- FEA-013 provides recent identity-correction rules that must remain compatible with alias preservation.

## UX Requirements
- Swagger at `/api/docs` must read as a consumer API reference rather than an internal route inventory.
- Public API documentation must clearly separate canonical metadata identity from external alias usage and include examples for alias-based fetches.
- Alias resolution behavior must be predictable: a provider plus external ID alias always resolves to one shared media item or returns a clear not-found response.

## Security Requirements
- External alias writes must require API authentication and enforce access to the target media item.
- Provider namespace and external ID values must be normalized and validated server-side, with external IDs capped at 128 characters.
- Alias creation and reassignment must be concurrency-safe and prevent one alias from pointing to multiple media items.
- Restricting Swagger output must not weaken existing authentication, throttling, or internal route protections.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-052](../backlog/done/TICKET-052.md) | Limit OpenAPI output to the public API surface |
| [TICKET-053](../backlog/done/TICKET-053.md) | Add first-class external ID alias storage and resolution |
| [TICKET-054](../backlog/done/TICKET-054.md) | Expose alias management and alias-based lookup in API v1 |

## Done Signal
- Swagger documents only the intended public API routes and examples.
- Supported metadata identities remain canonical, while additional provider aliases can resolve the same shared media item.
- API clients can add, inspect, remove, and resolve external aliases without breaking existing title-based or canonical-provider flows.
