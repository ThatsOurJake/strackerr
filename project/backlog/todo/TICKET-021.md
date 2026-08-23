# TICKET-021: IGDB Metadata Provider

**Feature:** [FEA-008: Metadata Providers](../../features/FEA-008-metadata-providers.md)

## Goal
Implement the IGDB provider for video games using Twitch OAuth client credentials and BYOK user API keys.

## Scope
- `IgdbProvider` implementing `IMetadataProvider`
- In-memory token cache per `client_id`
- Register in `MetadataService` for `GAME`

## API Details
- IGDB API: `POST https://api.igdb.com/v4/games` (Apicalypse query language)
- Auth: Twitch OAuth2 client credentials → bearer token
  - Token endpoint: `POST https://id.twitch.tv/oauth2/token?client_id={id}&client_secret={secret}&grant_type=client_credentials`
  - Token cached in-memory until `expires_in` (typically ~60 days)

## BYOK Key Storage
- The user stores `client_id` and `client_secret` together as a single `UserMetadataKey` entry for provider `"igdb"`
- Value stored as JSON: `{ "clientId": "...", "clientSecret": "..." }` — encrypted at rest

## Apicalypse Queries

### `search(query, apiKey)`
```
fields id, name, cover.url, first_release_date, summary;
search "{query}";
limit 10;
```

### `getById(externalId, apiKey)`
```
fields id, name, cover.url, first_release_date, summary;
where id = {externalId};
```

## Mapping
- `externalId`: IGDB `id` as string, prefixed `"igdb:"`
- `year`: `first_release_date` is a Unix timestamp → extract year
- `imageUrl`: prefix `cover.url` with `https:` (IGDB returns `//images.igdb.com/...`)
- `duration`: IGDB does not provide play time — leave `null`

## Token Cache
- Key: `clientId`
- Value: `{ accessToken, expiresAt: Date }`
- On request: if cache miss or `expiresAt < now + 60s`, fetch new token
- Cache lives in provider instance memory (acceptable for single-server self-hosted)

## Error Handling
- Invalid credentials: IGDB returns 401 → throw `"Invalid IGDB credentials. Check your client_id and client_secret in Settings."`
- No key configured: throw `"IGDB API key not configured. Add your Twitch credentials in Settings."`

## Acceptance Criteria
- [ ] `IgdbProvider.search("The Last of Us", apiKey)` returns relevant results with valid credentials
- [ ] Token is fetched on first use and cached for subsequent requests
- [ ] Cached token is refreshed when expired
- [ ] Invalid credentials surface a user-friendly error message
- [ ] No IGDB key configured surfaces a clear error (caller degrades to manual form)
- [ ] Provider registered in `MetadataService` for `GAME`
