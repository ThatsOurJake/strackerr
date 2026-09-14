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
| [FEA-012: Account and Provider Settings](./FEA-012-account-provider-settings.md) | Tabbed settings, single-credential management, provider configuration, and password change | TICKET-034, TICKET-035, TICKET-036 |
| [FEA-013: Search and Identification Corrections](./FEA-013-search-identification-corrections.md) | Music and TV search improvements plus safe media reidentification | TICKET-037, TICKET-038, TICKET-039 |
| [FEA-014: Activity and Artwork Improvements](./FEA-014-activity-artwork-improvements.md) | Monthly history, hour-based charts, higher-quality artwork, and image cleanup | TICKET-040, TICKET-041, TICKET-042, TICKET-043 |
| [FEA-015: Shell and Authentication Visual Polish](./FEA-015-shell-auth-visual-polish.md) | Typography, login identity, and mobile navigation improvements | TICKET-044, TICKET-045 |
| [FEA-016: Identification Query Ergonomics](./FEA-016-identification-query-ergonomics.md) | Structured identify-query syntax and MusicBrainz-focused lookup improvements | TICKET-046, TICKET-047 |
| [FEA-017: Shell Reliability, Asset Delivery, and Frontend Maintainability](./FEA-017-shell-reliability-asset-delivery-and-frontend-maintainability.md) | Dark mode reliability, self-hosted frontend assets, and maintainability refactors | TICKET-048, TICKET-049, TICKET-050, TICKET-051 |
| [FEA-018: Consumer API and External ID Aliases](./FEA-018-consumer-api-and-external-id-aliases.md) | Consumer-only Swagger output plus global provider/external ID aliases for canonical media lookup | TICKET-052, TICKET-053, TICKET-054 |
| [FEA-019: Collection Search and Music Collection Usability](./FEA-019-collection-search-and-music-collection-usability.md) | Board-game search-result artwork fixes plus collection handling that removes music from the All tab | TICKET-055, TICKET-056 |
| [FEA-020: Expanded Stats and Nostalgic Insights](./FEA-020-expanded-stats-and-nostalgic-insights.md) | Visible period ranges, prior-years weekly callbacks, and richer stats-page insight cards | TICKET-057, TICKET-058, TICKET-059 |
| [FEA-021: Nostalgia Deep Dive](./FEA-021-nostalgia-deep-dive.md) | A dedicated same-week-across-years nostalgia view launched from the weekly stats tile | TICKET-060, TICKET-061 |
| [FEA-022: Item Metadata Editing and Alias/History Management](./FEA-022-item-metadata-editing-and-alias-history-management.md) | A secondary item-page edit flow for title/description updates, bulk-selected history-row removals, and external alias add/edit/remove in one confirm action | TICKET-062, TICKET-063, TICKET-064 |

## Agent Workflow

1. Start from this catalog to choose a feature.
2. Open the feature file to understand the value, scope, dependencies, and linked tickets.
3. Implement tickets from `project/backlog/todo` in dependency order.
4. When a ticket is complete, move it to `project/backlog/done` and update the owning feature if scope or status changes.
