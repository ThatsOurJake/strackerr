# Feature Catalog

This folder defines the product-level features for STrackerr. Each feature file links to the backlog tickets that implement it, so planning agents can create or refine features and implementation agents can follow the linked tickets.

## Feature Files

| Feature | Purpose | Tickets |
|---|---|---|
| [FEA-001: Platform Foundation](./FEA-001-platform-foundation.md) | Project scaffold, deployment, background jobs, and app cache infrastructure | TICKET-001, TICKET-003, TICKET-032, TICKET-033 |
| [FEA-002: Core Data Model](./FEA-002-core-data-model.md) | Prisma schema, media catalog service, and log entry service | TICKET-002, TICKET-007, TICKET-008 |
| [FEA-003: Accounts, Admin, and Settings](./FEA-003-accounts-admin-settings.md) | Authentication, account pages, admin users, encrypted provider settings, and API keys | TICKET-004, TICKET-005, TICKET-006, TICKET-010 |
| [FEA-004: App Shell and Search](./FEA-004-app-shell-search.md) | Shared layout, navigation, flash, dark mode, and user-scoped global search | TICKET-009, TICKET-018 |
| [FEA-005: Activity Views and Insights](./FEA-005-activity-views-insights.md) | Dashboard, history timeline, and statistics pages | TICKET-011, TICKET-012, TICKET-013 |
| [FEA-006: Collection and Media Detail](./FEA-006-collection-media-detail.md) | Collection browsing and per-media detail views | TICKET-014, TICKET-015 |
| [FEA-007: Manual Logging and Identification](./FEA-007-manual-logging-identification.md) | Manual add workflow and skeleton identification flow | TICKET-016, TICKET-017 |
| [FEA-008: Metadata Providers](./FEA-008-metadata-providers.md) | Provider registry and TMDB, AniList, IGDB, BGG, and MusicBrainz integrations | TICKET-019, TICKET-020, TICKET-021, TICKET-022, TICKET-023 |
| [FEA-009: Media Enrichment Jobs and Images](./FEA-009-media-enrichment-jobs-images.md) | Local image cache and TV episode sync background job | TICKET-024, TICKET-031 |
| [FEA-010: Public API](./FEA-010-public-api.md) | API key-protected log, media search, stats, and Swagger documentation | TICKET-025, TICKET-026, TICKET-027 |
| [FEA-011: Hardening and Polish](./FEA-011-hardening-polish.md) | Error handling, security hardening, responsive design, and final polish | TICKET-028, TICKET-029, TICKET-030 |

## Agent Workflow

1. Start from this catalog to choose a feature.
2. Open the feature file to understand the value, scope, dependencies, and linked tickets.
3. Implement tickets from `project/backlog/todo` in dependency order.
4. When a ticket is complete, move it to `project/backlog/done` and update the owning feature if scope or status changes.
