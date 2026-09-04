# TICKET-046: Structured Identification Query Parser and Validation

**Feature:** [FEA-016: Identification Query Ergonomics](../../features/FEA-016-identification-query-ergonomics.md)

## Goal
Allow users to provide explicit identification intent through field-based query terms and provider-id lookups.

## Scope
- Introduce a parser for identification input supporting:
  - quoted field terms: `year:"2020" artist:"foo bar" title:"xxx"`
  - provider-id lookup token: `id:<provider_id>`
  - optional fallback free text terms in the same query.
- Define deterministic precedence and conflict handling when both field terms and free text are present.
- Validate malformed syntax with clear user-facing error messages.
- Add focused syntax help copy near the identify input UI and/or response partial.

## Technical Notes
- Keep parser logic isolated and unit-testable under the identification/search module.
- Return a structured query object consumed by provider adapters.
- Preserve backward compatibility for existing plain-text identify queries.
- Small helpful text on how to use this query language should also be shown on screen.

## Acceptance Criteria
- [ ] Input with `year`, `artist`, and `title` quoted fields parses into a structured object
- [ ] Input with `id:<provider_id>` parses as a direct identifier lookup intent
- [ ] Mixed free text + structured fields follows documented precedence
- [ ] Invalid syntax returns actionable validation feedback
- [ ] Existing plain-text identify behavior still works
