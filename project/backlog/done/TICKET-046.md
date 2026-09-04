# TICKET-046: Structured Identification Query Parser and Validation

**Feature:** [FEA-016: Identification Query Ergonomics](../../features/FEA-016-identification-query-ergonomics.md)

## Goal
Allow users to provide explicit identification intent through field-based query terms and provider-id lookups.

## Scope
- Introduce a parser for identification input supporting:
  - quoted field terms: `year:"2020" artist:"foo bar" title:"xxx"`
  - provider-aware id lookup token: `id:<identifier>`
  - standalone free text search terms.
- Reject mixed query modes (structured fields + free text, or id lookup + anything else) with clear validation feedback.
- Validate malformed syntax with clear user-facing error messages.
- Add focused syntax help copy near the identify input UI and/or response partial.

## Technical Notes
- Keep parser logic isolated and unit-testable under the identification/search module.
- Return a structured query object consumed by provider adapters.
- Preserve backward compatibility for existing plain-text identify queries.
- Small helpful text on how to use this query language should also be shown on screen.

## Acceptance Criteria
- [ ] Input with `year`, `artist`, and `title` quoted fields parses into a structured object
- [ ] Input with `id:<identifier>` parses as a direct identifier lookup intent
- [ ] Mixed query modes are rejected with actionable validation feedback
- [ ] Invalid syntax returns actionable validation feedback
- [ ] Existing plain-text identify behavior still works
