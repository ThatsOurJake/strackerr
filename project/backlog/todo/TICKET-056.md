# TICKET-056: Exclude Music from the All Collection View with Clear Performance Messaging

**Feature:** [FEA-019: Collection Search and Music Collection Usability](../../features/FEA-019-collection-search-and-music-collection-usability.md)

## Goal
Keep the collection browser usable as music volume grows by removing music tracks from the mixed All tab while preserving the dedicated Music tab.

## Scope
- Change the collection query so the default All view excludes `MUSIC_TRACK` items.
- Leave the dedicated Music tab behavior intact and continue rendering it with the existing collection UI.
- Add collection-page messaging that explains music is excluded from All for performance and remains available under Music.
- Update tests and view-model assumptions around the default tab and result counts.

## Technical Notes
- Treat this as an All-tab dataset change, not a redesign of the Music tab.
- Preserve current paging, alphabetical filtering, and user scoping for both All and Music views.
- Confirm that any item totals or empty states still read correctly when All no longer represents every media type.

## Acceptance Criteria
- [ ] The default All collection view excludes music tracks
- [ ] The Music tab still shows music-track items with the existing UI behavior
- [ ] The collection page explains why music is excluded from All
- [ ] Existing collection filters and pagination continue to work correctly after the dataset split
- [ ] Automated coverage reflects the new All-versus-Music behavior
