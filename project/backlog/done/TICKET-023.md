# TICKET-023: MusicBrainz Metadata Provider

**Feature:** [FEA-008: Metadata Providers](../../features/FEA-008-metadata-providers.md)

## Goal
Implement the MusicBrainz provider for music tracks. No API key required.

## Scope
- `MusicBrainzProvider` implementing `IMetadataProvider`
- Rate limiting: max 1 request/second (MusicBrainz policy)
- Register in `MetadataService` for `MUSIC_TRACK`

## API Details
- Base URL: `https://musicbrainz.org/ws/2`
- Format: JSON (`?fmt=json`)
- **Required header on all requests**: `User-Agent: STrackerr/1.0 (https://github.com/strackrr)`
- Rate limit: 1 request/second — enforce with a simple request queue or `setTimeout` throttle

## Endpoints

### `search(query)`
`GET /recording?query={q}&fmt=json&limit=10`
- Response: `{ recordings: [{ id, title, length, "artist-credit": [...], releases: [...] }] }`

### `getById(externalId)`
`GET /recording/{mbid}?fmt=json&inc=artist-credits+releases`
- Response: single recording object with full details

## Mapping to `SearchResult` / `MediaItemDetail`
- `externalId`: MusicBrainz recording `id` (MBID), prefixed `"musicbrainz:"`
- `title`: recording `title`
- `description`: artist name(s) joined from `artist-credit[].artist.name`
- `imageUrl`: MusicBrainz does not provide cover art via this API — leave `null`
- `duration`: `length` field is in milliseconds → convert to minutes (round to nearest)
- `year`: from `releases[0].date` (first 4 chars)
- `type`: always `MUSIC_TRACK`

## Rate Limiting Implementation
- Maintain a timestamp of the last request
- Before each HTTP call: if `now - lastRequest < 1000ms`, wait the remaining time
- Simple enough without a full queue given the low request volume

## Acceptance Criteria
- [ ] `MusicBrainzProvider.search("Bohemian Rhapsody")` returns track results
- [ ] `MusicBrainzProvider.getById("musicbrainz:{mbid}")` returns track metadata with duration in minutes
- [ ] `User-Agent` header set on all requests
- [ ] Back-to-back requests are throttled to 1/second
- [ ] Provider registered in `MetadataService` for `MUSIC_TRACK`
