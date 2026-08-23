# TICKET-032: Background Job Foundation

**Feature:** [FEA-001: Platform Foundation](../../features/FEA-001-platform-foundation.md)

## Goal
Install and configure `@nestjs/event-emitter` and `@nestjs/schedule` in `AppModule`, define the shared event payload types, and implement a daily cleanup cron for orphaned image files.

## Scope
- Install `@nestjs/event-emitter` and `@nestjs/schedule`
- Register `EventEmitterModule` and `ScheduleModule` globally in `AppModule`
- Define event payload interfaces in `src/events/` — shared across all modules
- `ImageCleanupService`: daily cron that removes image files with no matching `MediaItem`

## Dependencies
```
pnpm add @nestjs/event-emitter @nestjs/schedule
```

## AppModule Registration
```ts
EventEmitterModule.forRoot({ wildcard: false, maxListeners: 10 }),
ScheduleModule.forRoot(),
```

## Event Payload Types (`src/events/events.ts`)
```ts
export class ShowIdentifiedEvent {
  mediaItemId: string;
  provider: string;
  externalId: string;
  userApiKey?: string;
}

export class ImageCacheRequestEvent {
  mediaItemId: string;
  sourceUrl: string;
}

export class MediaItemChangedEvent {
  // fired on MediaItem create, update, or delete
  userId: string;   // the user whose search index should be invalidated
}

export class MediaItemDeletedEvent {
  mediaItemId: string;
}

export class LogEntryChangedEvent {
  // fired when a log entry is created or deleted for a user
  userId: string;   // the user whose history/stats/dashboard caches should be invalidated
}
```

## Event Name Constants (`src/events/event-names.ts`)
```ts
export const Events = {
  SHOW_IDENTIFIED:    'show.identified',
  IMAGE_CACHE:        'media.image.cache',
  MEDIA_ITEM_CHANGED: 'media.item.changed',
  MEDIA_ITEM_DELETED: 'media.item.deleted',
  LOG_ENTRY_CHANGED:  'log.entry.changed',
} as const;
```

## `ImageCleanupService` (daily cron)
- `@Cron(CronExpression.EVERY_DAY_AT_3AM)`
- Reads all filenames in `{DATA_DIR}/images/`
- Extracts `mediaItemId` from filename (`{id}-thumb.webp`, `{id}-cover.webp`)
- Queries Prisma for `MediaItem` records with those ids
- Deletes any file whose `mediaItemId` has no matching `MediaItem`
- Logs count of files deleted

## Where Events Are Emitted (summary for implementers)
| Event | Emitted By | Handled By |
|---|---|---|
| `show.identified` | `IdentificationService` (TICKET-017) | `EpisodeSyncService` (TICKET-024) |
| `media.image.cache` | `IdentificationService`, `AddController` | `ImageCacheService` (TICKET-031) |
| `media.item.changed` | `MediaService` on create/update/delete | `SearchService` (TICKET-018) |
| `media.item.deleted` | `MediaService` on delete | `ImageCacheService` (TICKET-031) |
| `log.entry.changed` | `LogService` on create/delete | `AppCacheService` (TICKET-033) |

## Acceptance Criteria
- [ ] `EventEmitterModule` and `ScheduleModule` registered in `AppModule`
- [ ] Event payload types and name constants exported from `src/events/`
- [ ] `ImageCleanupService` cron runs daily and deletes orphaned image files
- [ ] Cron logs count of files deleted (even if zero)
- [ ] No errors on app startup
