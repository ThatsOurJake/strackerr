# TICKET-042: Higher-Resolution IGDB Artwork

**Feature:** [FEA-014: Activity and Artwork Improvements](../../features/FEA-014-activity-artwork-improvements.md)

## Goal
Cache game artwork from an IGDB image variant large enough for collection and detail displays.

## Scope
- Request or construct an official IGDB cover URL suitable for the local 400px cover target.
- Avoid using thumbnail-sized IGDB URLs as `imageSourceUrl`.
- Preserve the highest-quality source URL through normalization and identification.
- Continue using the existing image cache to generate local thumb and cover WebP files.
- Requeue artwork when a game is reidentified so an old low-resolution cache can be replaced.

## Technical Notes
- Use a documented IGDB image size variant; do not upscale a downloaded thumbnail.
- Keep URL transformation inside the IGDB provider rather than in views or the generic image cache.
- Retain existing fallback behavior when IGDB has no cover.

## Acceptance Criteria
- [ ] IGDB search and detail results expose an image source suitable for a 400px local cover
- [ ] Newly identified games no longer cache visibly thumbnail-sized source images
- [ ] The generic image cache still produces the established thumb and cover paths
- [ ] Reidentifying a game refreshes previously cached low-resolution artwork
- [ ] Missing IGDB artwork continues to use the standard game fallback
