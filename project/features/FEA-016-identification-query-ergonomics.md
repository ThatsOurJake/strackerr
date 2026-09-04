# FEA-016: Identification Query Ergonomics

## Outcome
Users can identify media more reliably by using explicit query syntax for provider identifiers and field-based terms, with first-class support for MusicBrainz workflows.

## Scope
- Add structured identification query syntax supporting quoted field terms such as `year:"2020" artist:"foo bar" title:"xxx"`.
- Add identifier lookup syntax using `id:<identifier>` when identifying items, interpreted against the currently selected provider.
- Parse and validate syntax server-side with clear, recoverable validation feedback for malformed queries.
- Improve MusicBrainz identification behavior for structured field queries and id lookups.
- Keep manual fallback behavior available when structured provider lookups do not resolve.

## Dependencies
- FEA-007 provides manual logging and identification flow.
- FEA-008 provides metadata provider adapters including MusicBrainz.
- FEA-013 provides previous search and identification corrections.

## Security Requirements
- Identification queries must remain scoped to the signed-in user context for any resulting actions.
- `id:<identifier>` lookups must validate the active provider and identifier format server-side before provider calls.
- Structured query parsing must treat all user input as untrusted and prevent template, SQL, and command injection via strict parameterization and escaping.

## UX Requirements
- Query syntax help must be visible near identification search inputs with concise examples.
- Invalid syntax should show a direct correction message instead of a generic failure.
- Queries must use exactly one mode at a time: structured fields, id lookup, or free text.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-046](../backlog/done/TICKET-046.md) | Structured identification query parser and validation |
| [TICKET-047](../backlog/done/TICKET-047.md) | MusicBrainz structured search and id lookup integration |

## Done Signal
- Users can submit `year`, `artist`, and `title` filters with quoted values and receive relevant identification results.
- Users can submit `id:<identifier>` for supported providers and either identify directly or receive a clear recoverable error.
- MusicBrainz identification quality improves for common artist/title and identifier-driven flows.
