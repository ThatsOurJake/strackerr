# TICKET-019: Metadata Provider Interface & TMDB Provider

**Feature:** [FEA-008: Metadata Providers](../../features/FEA-008-metadata-providers.md)

## Goal
Define the shared metadata provider interface, set up the provider registry, and implement the TMDB provider for movies and TV shows.

## Scope
- `IMetadataProvider` interface
- `MetadataModule` with `MetadataService` (provider registry)
- `TmdbProvider` implementing `IMetadataProvider`
- HTTP client setup (`@nestjs/axios` or native `fetch`)

## `IMetadataProvider` Interface
```ts
interface SearchResult {
  externalId: string;
  title: string;
  year?: number;
  imageUrl?: string;
  description?: string;
  type: MediaType;
}

interface MediaItemDetail extends SearchResult {
  duration?: number; // minutes
}

interface Episode {
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  description?: string;
  duration?: number;
  externalId?: string;
}

interface IMetadataProvider {
  search(query: string, apiKey?: string): Promise<SearchResult[]>;
  getById(externalId: string, apiKey?: string): Promise<MediaItemDetail>;
  getEpisodes?(showId: string, season?: number, apiKey?: string): Promise<Episode[]>;
}
```

## `MetadataService` (Provider Registry)
- `getProvider(mediaType: MediaType): IMetadataProvider` — returns correct provider
- `getProviderForUser(mediaType, userId)` — resolves provider + decrypts BYOK key via `EncryptionService`
- Default mapping:
  - `MOVIE` → TMDB
  - `TV_SHOW` (non-anime) → TMDB
  - `TV_SHOW` (anime) → AniList *(registered in TICKET-020)*
  - `GAME` → IGDB *(registered in TICKET-021)*
  - `BOARD_GAME` → BGG *(registered in TICKET-022)*
  - `MUSIC_TRACK` → MusicBrainz *(registered in TICKET-023)*
- Note: anime vs non-anime distinction handled by caller passing a flag or checking `MediaExternalId` for anilist provider

## `TmdbProvider`
- Base URL: `https://api.themoviedb.org/3`
- API key passed per-request as `?api_key=` query param (BYOK)
- `search(query, apiKey)`:
  - For `MOVIE`: `GET /search/movie?query={q}`
  - For `TV_SHOW`: `GET /search/tv?query={q}`
- `getById(externalId, apiKey)`: `GET /movie/{id}` or `GET /tv/{id}`
- `getEpisodes(showId, season, apiKey)`: `GET /tv/{id}/season/{n}`
- Image URLs: prepend `https://image.tmdb.org/t/p/w500`
- Error handling: 401 → throw descriptive error ("Invalid TMDB API key"); 429 → throw with retry hint

## Acceptance Criteria
- [ ] `TmdbProvider.search("Severance", apiKey)` returns results including Severance
- [ ] `TmdbProvider.getById("tv:87108", apiKey)` returns Severance metadata
- [ ] `TmdbProvider.getEpisodes("87108", 1, apiKey)` returns season 1 episodes
- [ ] Invalid API key returns a descriptive error (not a raw 401)
- [ ] `MetadataService.getProvider(MOVIE)` returns `TmdbProvider`
- [ ] Interface is type-safe and all providers must implement it
