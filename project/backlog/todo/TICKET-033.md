# TICKET-033: Application Cache Infrastructure

**Feature:** [FEA-001: Platform Foundation](../../features/FEA-001-platform-foundation.md)

## Goal
Set up an in-memory application cache with per-user key tracking, automatic TTL-based expiry, event-driven invalidation on log entry changes, and a manual clear action in the settings page.

## Scope
- Install `@nestjs/cache-manager`
- `AppCacheModule` registered globally in `AppModule`
- `AppCacheService` — typed wrapper with per-user key tracking and bulk clear
- `CacheKeys` helper — centralised key builders to avoid string typos across modules
- `@OnEvent(Events.LOG_ENTRY_CHANGED)` listener in `AppCacheService` — clears all cached data for the affected user automatically
- Settings route: `POST /settings/cache/clear` — manual clear for the current user (added to TICKET-006's controller)

## Dependencies
```
pnpm add @nestjs/cache-manager
```

TICKET-032 must be complete (event types and `LOG_ENTRY_CHANGED` event needed).

## `AppModule` Registration
```ts
CacheModule.register({ isGlobal: true, ttl: 300, max: 500 })
```

## `CacheKeys` Helper (`src/cache/cache-keys.ts`)
```ts
export const CacheKeys = {
  history:   (userId: string, page: number) => `history:${userId}:${page}`,
  dashboard: (userId: string)               => `dashboard:${userId}`,
  stats:     (userId: string, year: string) => `stats:${userId}:${year}`,
};
```

## TTLs
| Cache | Key Pattern | TTL |
|---|---|---|
| History page | `history:{userId}:{page}` | 5 minutes (300s) |
| Dashboard | `dashboard:{userId}` | 5 minutes (300s) |
| Stats | `stats:{userId}:{year}` | 15 minutes (900s) |

## `AppCacheService`
```ts
class AppCacheService {
  // Maps userId → Set of cache keys owned by that user
  private userKeys = new Map<string, Set<string>>();

  async set(key: string, value: unknown, ttl: number, userId: string): Promise<void>
  async get<T>(key: string): Promise<T | null>
  async clearForUser(userId: string): Promise<void>  // deletes all keys in userKeys[userId]

  @OnEvent(Events.LOG_ENTRY_CHANGED)
  async onLogEntryChanged(event: LogEntryChangedEvent): Promise<void> {
    await this.clearForUser(event.userId);
  }
}
```

`clearForUser` iterates the key set for the user, calls `cacheManager.del(key)` for each, then clears the set.

## Settings Integration (add to TICKET-006 controller)
- `POST /settings/cache/clear`:
  1. Call `AppCacheService.clearForUser(currentUser.id)`
  2. Call `SearchService.invalidateIndex(currentUser.id)` (exposes a public `invalidateIndex` method)
  3. Flash message: "Your caches have been cleared."
- Settings page view: a "Clear caches" button in a "Data & Cache" section
- No confirmation dialog needed — action is harmless and reversible on next page load

## Usage Pattern in Controllers
```ts
// Check cache first; on miss, query DB and populate cache
async getHistory(userId, page) {
  const key = CacheKeys.history(userId, page);
  const cached = await this.cacheService.get(key);
  if (cached) return cached;

  const result = await this.logService.findByUser(...);
  await this.cacheService.set(key, result, 300, userId);
  return result;
}
```

## Acceptance Criteria
- [ ] `AppCacheService.set` stores value and registers key under the user's key set
- [ ] `AppCacheService.clearForUser` removes all keys for a given user from both the cache and the tracking map
- [ ] `LOG_ENTRY_CHANGED` event triggers automatic cache clear for the affected user
- [ ] `POST /settings/cache/clear` clears the current user's cache and search index, shows flash confirmation
- [ ] Cache entries expire automatically after their TTL even without an event
- [ ] History, dashboard, and stats pages use the cache (verified by: second load does not hit DB)
