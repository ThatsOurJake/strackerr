# TICKET-002: Prisma Schema & Initial Migration

**Feature:** [FEA-002: Core Data Model](../../features/FEA-002-core-data-model.md)

## Goal
Define the complete database schema and generate the initial SQLite migration so all subsequent tickets have a stable data layer.

## Scope
- Install Prisma, configure datasource for SQLite (`DATABASE_URL`)
- Define all models and enums (see below)
- Generate and run the initial migration (`prisma migrate dev`)
- Create a singleton `PrismaService` injectable across all NestJS modules
- Add `prisma generate` to the `postinstall` script

## Models

### User
| Field | Type | Notes |
|---|---|---|
| id | String | cuid, @id |
| username | String | @unique |
| passwordHash | String | |
| apiKey | String | @unique, cuid default |
| isAdmin | Boolean | default false |
| createdAt | DateTime | @default(now()) |

### UserMetadataKey
| Field | Type | Notes |
|---|---|---|
| id | String | cuid, @id |
| userId | String | FK → User |
| provider | String | e.g. "tmdb", "igdb" |
| keyEnc | String | AES-256-GCM ciphertext |
| keyIv | String | IV for decryption |
| @@unique | [userId, provider] | |

### MediaItem
| Field | Type | Notes |
|---|---|---|
| id | String | cuid, @id |
| type | MediaType | enum |
| title | String | |
| sortTitle | String | articles stripped, for alphabetical sort |
| isSkeleton | Boolean | default false |
| createdByUserId | String? | nullable; set on skeleton, cleared on identify |
| parentId | String? | nullable; TV_EPISODE → TV_SHOW self-relation |
| seasonNumber | Int? | TV_EPISODE only |
| episodeNumber | Int? | TV_EPISODE only |
| description | String? | |
| imageUrl | String? | local path once cached (e.g. `/img/abc123-cover.webp`); null until TICKET-031 runs |
| imageSourceUrl | String? | original external URL from provider; retained for potential re-fetch |
| year | Int? | |
| duration | Int? | minutes |
| createdAt | DateTime | |
| updatedAt | DateTime | @updatedAt |

### MediaAlias
| Field | Type | Notes |
|---|---|---|
| id | String | cuid, @id |
| mediaItemId | String | FK → MediaItem |
| alias | String | @unique, normalised |

### MediaExternalId
| Field | Type | Notes |
|---|---|---|
| id | String | cuid, @id |
| mediaItemId | String | FK → MediaItem |
| provider | String | "tmdb", "igdb", "steam", "anilist", "bgg", "musicbrainz" |
| externalId | String | |
| @@unique | [provider, externalId] | |

### LogEntry
| Field | Type | Notes |
|---|---|---|
| id | String | cuid, @id |
| userId | String | FK → User |
| mediaItemId | String | FK → MediaItem |
| loggedAt | DateTime | date of the activity |
| duration | Int? | minutes; optional for BOARD_GAME |
| platform | String? | GAME only |
| playerCount | Int? | BOARD_GAME only |
| won | Boolean? | BOARD_GAME only |
| source | LogSource | default MANUAL |
| createdAt | DateTime | |

## Enums
- `MediaType`: `TV_SHOW`, `TV_EPISODE`, `MOVIE`, `GAME`, `BOARD_GAME`, `MUSIC_TRACK`
- `LogSource`: `MANUAL`, `API`

## Acceptance Criteria
- [ ] `pnpm prisma migrate dev` completes without errors
- [ ] All models and enums present in `prisma/schema.prisma`
- [ ] `PrismaService` is injectable and connects to the SQLite database
- [ ] `pnpm prisma studio` opens and shows all tables
