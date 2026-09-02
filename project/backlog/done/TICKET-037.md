# TICKET-037: MusicBrainz Search Reliability

**Feature:** [FEA-013: Search and Identification Corrections](../../features/FEA-013-search-identification-corrections.md)

## Goal
Return useful music results for natural artist and track queries while handling MusicBrainz availability limits gracefully.

## Scope
- Parse common `artist: track` and `artist - track` input into escaped MusicBrainz artist and recording fields.
- Preserve a sensible free-text fallback for queries that do not match those forms.
- Correct request construction so punctuation and Lucene-special characters cannot corrupt the provider query.
- Serialize requests to honor MusicBrainz's one-request-per-second policy under concurrent use.
- Handle `503` and rate-limit responses as temporary provider failures with bounded retry behavior.
- Show a user-facing retry message instead of a raw status-code exception.

## Technical Notes
- Continue sending the required descriptive `User-Agent` header.
- Keep retries bounded and respect `Retry-After` when supplied; do not hold a web request indefinitely.
- Preserve normalized `MUSIC_TRACK` results and existing provider identifiers.

## Acceptance Criteria
- [ ] `Ariana Grande: One Last Time` returns relevant recording results
- [ ] `Ariana Grande - One Last Time` returns relevant recording results without triggering a malformed request
- [ ] Free-text title searches continue to work
- [ ] Concurrent searches do not exceed one MusicBrainz request per second
- [ ] Temporary `503` or rate-limit responses produce a recoverable retry message rather than a raw exception
- [ ] Artist and recording values are correctly escaped before constructing the provider query
