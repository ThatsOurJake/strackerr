# TICKET-022: BGG Metadata Provider

**Feature:** [FEA-008: Metadata Providers](../../features/FEA-008-metadata-providers.md)

## Goal
Implement the BoardGameGeek XML API provider for board games. No API key required.

## Scope
- `BggProvider` implementing `IMetadataProvider`
- XML parsing using `fast-xml-parser`
- Register in `MetadataService` for `BOARD_GAME`

## API Details
- Base URL: `https://boardgamegeek.com/xmlapi2`
- No authentication required
- Note: BGG may return HTTP 202 (queued) on the first request for a new `thing` lookup — retry once after a short delay

## Endpoints

### `search(query)`
`GET /search?query={q}&type=boardgame`
- Response: XML list of `<item id="..." type="boardgame">` with `<name>` and `<yearpublished>`
- Return top 10 results mapped to `SearchResult`

### `getById(externalId)`
`GET /thing?id={id}&stats=1`
- Response: XML `<item>` with full details
- Fields used: `name` (primary), `description`, `image`, `yearpublished`, `minplayers`, `maxplayers`, `playingtime`
- If response is HTTP 202: wait 1 second, retry once; if still 202, throw `"BGG is processing the request, please try again."`

## Mapping to `SearchResult` / `MediaItemDetail`
- `externalId`: BGG `id` as string, prefixed `"bgg:"`
- `title`: primary name (`sortindex="1"` attribute on `<name>`)
- `year`: `<yearpublished>` value
- `imageUrl`: `<image>` value (BGG returns full URL)
- `description`: `<description>` (HTML-encoded — decode entities)
- `duration`: `<playingtime>` (in minutes; BGG already provides minutes)

## Dependencies
- `fast-xml-parser`

## Acceptance Criteria
- [ ] `BggProvider.search("Catan")` returns relevant board game results
- [ ] `BggProvider.getById("bgg:13")` returns Catan metadata
- [ ] HTTP 202 triggers a single retry after 1 second
- [ ] XML parsed correctly (no raw XML in output)
- [ ] HTML entities in description decoded
- [ ] Provider registered in `MetadataService` for `BOARD_GAME`
