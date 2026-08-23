# FEA-009: Media Enrichment Jobs and Images

## Outcome
Identified media is enriched asynchronously and external artwork is cached locally for reliable rendering.

## Scope
- Local image download, resizing, WebP conversion, storage, and serving.
- Image cache records linked to media items.
- TV show episode sync job after identification.
- Re-linking orphaned TV episode log entries after episode sync.

## Dependencies
- FEA-001 provides background job primitives.
- FEA-002 provides media, episode, and image persistence.
- FEA-008 provides provider metadata and remote image URLs.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-024](../backlog/todo/TICKET-024.md) | TV show episode sync background job |
| [TICKET-031](../backlog/todo/TICKET-031.md) | Image cache service |

## Done Signal
- Newly identified media can render local images instead of hotlinking provider artwork.
- TV show details and existing episode logs improve after background sync completes.
