# FEA-019: Collection Search and Music Collection Usability

## Outcome
Collection and add-flow search remain clear and performant as the library grows, with board-game search results showing the expected artwork behavior and music isolated from the mixed collection view.

## Scope
- Investigate and fix why BoardGameGeek-backed add-search results do not show images even though identified board-game item pages do.
- Keep the existing collection Music tab while removing music-track items from the mixed All collection result set.
- Add clear collection-page messaging that All excludes music for performance and that the Music tab contains the full song library.
- Preserve existing collection filters, paging, and type-specific detail routing while changing the All-tab dataset.

## Dependencies
- FEA-006 provides the collection browser and media detail surfaces.
- FEA-008 provides the BoardGameGeek provider search and detail normalization that likely controls the missing-image behavior.
- FEA-014 provides recent artwork quality improvements that should stay consistent with board-game results.

## UX Requirements
- Board-game add-search results should show artwork whenever the underlying provider search data supports it.
- The collection tab model must stay simple: users can still open the Music tab, while All clearly communicates that music is intentionally excluded.
- The performance note on the collection page must be visible without overwhelming the existing layout.

## Security Requirements
- Search-result image fixes must not weaken current request validation, provider-key handling, or manual-entry fallbacks.
- Collection filtering changes must remain user-scoped and must not surface another user's music items or counts.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-055](../backlog/todo/TICKET-055.md) | Fix BoardGameGeek search-result artwork behavior |
| [TICKET-056](../backlog/todo/TICKET-056.md) | Exclude music from the All collection view with clear performance messaging |

## Done Signal
- BoardGameGeek add-search results and identified board-game pages present consistent artwork behavior when the provider supplies images.
- The All collection view excludes music tracks, while the Music tab remains the place to browse the full song catalog.
- Users understand why music is excluded from All without losing access to their music collection.
