# TICKET-054: Expose Alias Management and Alias-Based Lookup in API v1

**Feature:** [FEA-018: Consumer API and External ID Aliases](../../features/FEA-018-consumer-api-and-external-id-aliases.md)

## Goal
Give API clients a clear way to manage external aliases and retrieve canonical media items through those aliases.

## Scope
- Add API endpoints to list, create, and remove external ID aliases for a media item the authenticated user can access.
- Add an API lookup endpoint that resolves a media item by provider namespace plus external ID alias.
- Extend create or import-style API flows so clients can attach one or more external aliases when creating or linking media.
- Document alias-management and alias-resolution flows in Swagger with examples for supported and unsupported namespaces.

## Technical Notes
- Alias mutation endpoints must reject writes for media items the authenticated user cannot access.
- Lookup responses should return the canonical media item representation rather than a separate alias payload shape.
- Preserve existing title-alias search behavior; this ticket adds direct alias resolution rather than replacing search.
- Choose route names that keep API v1 coherent, such as media-scoped alias routes plus one direct resolve endpoint.

## Acceptance Criteria
- [ ] API clients can add an external alias to an accessible media item
- [ ] API clients can list and remove existing external aliases for an accessible media item
- [ ] API clients can resolve a media item by provider namespace plus external ID alias
- [ ] Create or import-style API requests can attach alias data in the same workflow when appropriate
- [ ] Swagger documents the new request and response shapes with consumer-oriented examples
