# TICKET-020: AniList Metadata Provider

**Feature:** [FEA-008: Metadata Providers](../../features/FEA-008-metadata-providers.md)

## Goal
Implement the AniList GraphQL provider for anime TV shows. No API key required.

## Scope
- `AniListProvider` implementing `IMetadataProvider`
- Register in `MetadataService` for `TV_SHOW` (anime variant)

## API Details
- Endpoint: `POST https://graphql.anilist.co`
- No authentication required (public API)
- Rate limit: ~90 requests/minute — handle 429 gracefully

## GraphQL Queries

### `search(query)`
```graphql
query ($search: String) {
  Page(page: 1, perPage: 10) {
    media(search: $search, type: ANIME) {
      id
      title { romaji english native }
      startDate { year }
      coverImage { large }
      description(asHtml: false)
      episodes
    }
  }
}
```

### `getById(externalId)`
```graphql
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    title { romaji english native }
    startDate { year }
    coverImage { large }
    description(asHtml: false)
    episodes
    averageEpisodeDuration
  }
}
```

### `getEpisodes(showId)`
AniList does not provide per-episode metadata reliably. Return synthetic episode stubs:
- Use `media.episodes` (total count) to generate stubs: `{ seasonNumber: 1, episodeNumber: n, title: "Episode n" }`
- Duration: use `averageEpisodeDuration` (seconds → minutes) for each stub

## Title Preference
Use `title.english` if available, fall back to `title.romaji`, then `title.native`.

## Mapping to `SearchResult` / `MediaItemDetail`
- `externalId`: AniList `id` as string, prefixed with `"anilist:"` (e.g. `"anilist:16498"`)
- `type`: always `TV_SHOW`
- `imageUrl`: `coverImage.large`
- `description`: strip HTML tags if any remain despite `asHtml: false`

## Acceptance Criteria
- [ ] `AniListProvider.search("Attack on Titan")` returns relevant results
- [ ] `AniListProvider.getById("anilist:16498")` returns Attack on Titan metadata
- [ ] `getEpisodes` returns synthetic stubs using total episode count
- [ ] 429 rate limit response handled gracefully (throw descriptive error)
- [ ] Provider registered in `MetadataService` for anime TV shows
- [ ] No API key required (should not fail if user has no AniList key configured)
