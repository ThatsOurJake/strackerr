# TICKET-055: Fix BoardGameGeek Search-Result Artwork Behavior

**Feature:** [FEA-019: Collection Search and Music Collection Usability](../../features/FEA-019-collection-search-and-music-collection-usability.md)

## Goal
Make BoardGameGeek-backed add-search results show artwork consistently when the provider search response includes usable image data.

## Scope
- Trace the board-game add-search flow from provider normalization through the rendered partial.
- Confirm whether the BGG search endpoint currently returns image data in the shape the app expects.
- Fix provider result mapping, template assumptions, or helper usage so search-result images render when available.
- Add focused tests around BGG search-result normalization or rendering so the regression stays covered.

## Technical Notes
- Start from the current BGG provider search path rather than item-detail rendering, because the detail page already shows artwork after identification.
- Do not introduce extra provider detail-fetch calls for every visible search result in this ticket.
- If BGG search genuinely cannot provide artwork in the current API path, document that limitation in code comments or tests and ensure the UI fallback remains intentional.

## Acceptance Criteria
- [ ] BoardGameGeek search results render artwork when the provider search payload supplies it
- [ ] Search results still fall back cleanly to the placeholder state when no image is available
- [ ] The fix does not add per-result detail fetches or regress search responsiveness
- [ ] Automated coverage protects the expected board-game search-result behavior
