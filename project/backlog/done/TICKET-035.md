# TICKET-035: Provider Rationalization and BGG Credentials

**Feature:** [FEA-012: Account and Provider Settings](../../features/FEA-012-account-provider-settings.md)

## Goal
Use IGDB as the sole game metadata source and support the API key now required by BoardGameGeek.

## Scope
- Remove Steam from the provider registry, settings UI, configuration, and user-facing provider choices.
- Remove Steam-only runtime paths that are no longer used, without deleting historical media data.
- Treat BoardGameGeek as a BYOK provider.
- Add encrypted BGG API key storage and management through the Metadata Providers settings tab.
- Send the configured key in the form required by the current BGG API.
- Return a useful configuration state instead of making BGG requests when no key is configured.

## Technical Notes
- Keep IGDB behavior and existing game provider identifiers stable.
- Use the existing encrypted provider credential abstraction rather than introducing a second secret store.
- Migration changes must preserve existing provider credentials and media records.

## Security and Validation
- Mask the BGG key after entry and exclude it from logs, errors, HTML, and serialized responses.
- Validate the credential with a bounded provider request before reporting it as usable.
- Handle BGG 401 responses as invalid or expired credential errors with no secret content.

## Acceptance Criteria
- [ ] Steam is absent from provider configuration and metadata search choices
- [ ] IGDB remains the game metadata provider
- [ ] An administrator can add and remove one encrypted BGG API key
- [ ] BGG requests authenticate with the configured key
- [ ] Missing or rejected BGG credentials produce actionable UI rather than a raw `401` message
- [ ] Existing media and non-BGG credentials are preserved through any migration
