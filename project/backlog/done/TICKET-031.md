# TICKET-031: Image Cache Service

**Feature:** [FEA-009: Media Enrichment Jobs and Images](../../features/FEA-009-media-enrichment-jobs-images.md)

## Goal
Download images from metadata providers, resize them to two appropriate sizes, store them locally as WebP, and serve them from local disk — eliminating runtime dependency on external image CDNs and keeping storage usage bounded.

## Scope
- `ImageCacheService`:
  - `@OnEvent(Events.IMAGE_CACHE)` listener — enqueues the request
  - `@OnEvent(Events.MEDIA_ITEM_DELETED)` listener — calls `deleteImages`
  - Internal queue: processes up to 3 downloads concurrently; prevents simultaneous bursts when a TV show with 200 episodes is identified
  - `processQueue()` — private method; picks next item from queue, downloads, resizes, saves, updates `MediaItem`
  - `deleteImages(mediaItemId)` — removes both WebP files; safe to call if files don't exist
- Two output sizes per item, both WebP:
  - `thumb` — used in history feed cards and collection grid
  - `cover` — used on media item detail pages
- NestJS static file serving for the images directory
- `DATA_DIR` env var controls the root path (default `./data`)

## Dependencies
- TICKET-032 (event foundation) must be complete

## Image Size Targets

| Orientation | Thumb | Cover |
|---|---|---|
| Portrait (movies, TV shows — `height > width`) | 160×240px | 400×600px |
| Square (games, board games, music — `height ≈ width`) | 160×160px | 400×400px |

- `sharp` auto-detects orientation from image metadata before resizing
- Resize strategy: `sharp.resize({ width, height, fit: 'cover' })` — crops to fill, never distorts
- Output: `.webp` format, quality 80

## Storage Layout
```
{DATA_DIR}/
  dev.db                        (SQLite)
  images/
    {mediaItemId}-thumb.webp
    {mediaItemId}-cover.webp
```

## Dependencies
- `sharp` (already added in TICKET-001)

## Static File Serving
Configure NestJS `ServeStaticModule` (or `express.static`) to serve `{DATA_DIR}/images/` at the URL path `/img/`:

```ts
ServeStaticModule.forRoot({
  rootPath: join(dataDir, 'images'),
  serveRoot: '/img',
})
```

After caching, `MediaItem.imageUrl` is updated to `/img/{mediaItemId}-cover.webp` and a separate Handlebars helper can derive the thumb path (`-thumb.webp`).

## `cacheImage` Algorithm
1. Download image from `sourceUrl` using `fetch` into a buffer (streaming to disk not required at these sizes)
2. Use `sharp(buffer).metadata()` to detect width/height and determine orientation
3. Resize to thumb dimensions → save as `{DATA_DIR}/images/{mediaItemId}-thumb.webp`
4. Resize to cover dimensions → save as `{DATA_DIR}/images/{mediaItemId}-cover.webp`
5. Update `MediaItem` via Prisma: set `imageUrl = '/img/{mediaItemId}-cover.webp'`
6. If `DATA_DIR/images/` directory does not exist, create it before writing

## `deleteImages` Algorithm
- Delete `{DATA_DIR}/images/{mediaItemId}-thumb.webp` and `-cover.webp` if they exist
- Called from `MediaService` when a `MediaItem` is deleted

## Integration Points
Triggered by `Events.IMAGE_CACHE` events emitted from:
- `IdentificationService.identify()` — after `MediaItem` is updated with provider metadata
- `AddController` (TICKET-016) — after user selects a provider result with an image URL
- `EpisodeSyncService` (TICKET-024) — once per episode that has an image URL

Triggered by `Events.MEDIA_ITEM_DELETED` event for cleanup.

Not triggered for:
- Skeleton items (no `imageSourceUrl` yet)
- Items where the provider returns no image URL

## Internal Queue Design
```
queue: Array<ImageCacheRequestEvent>   // pending requests
active: number                          // current concurrent downloads (max 3)
```
On each `IMAGE_CACHE` event: push to queue, call `processQueue()`.
`processQueue()`: while `active < 3` and `queue.length > 0`, dequeue one item, increment `active`, process it, decrement `active` when done, call `processQueue()` again.

## Error Handling
- Download fails (network error, 404, non-image content-type): log warning, do not update `imageUrl`, do not throw
- `sharp` processing fails: log error, do not update `imageUrl`, do not throw
- Disk write fails: log error, do not throw
- All errors are non-fatal — the fallback placeholder (design.md) handles the null `imageUrl` case in every view

## Environment Variables
```
DATA_DIR=./data    # root for db file and images; mapped to /app/data in Docker
```

Already defined in TICKET-001 `.env.example`. The Docker volume mount (`./data:/app/data`) in TICKET-003 covers this path automatically.

## Schema Changes (already covered in TICKET-002)
- `MediaItem.imageUrl: String?` — local `/img/` path after caching; null until cached
- `MediaItem.imageSourceUrl: String?` — original provider URL; retained for re-fetch if needed

## Acceptance Criteria
- [ ] `IMAGE_CACHE` event enqueues the request; no more than 3 downloads run concurrently
- [ ] Downloaded images saved as both thumb and cover WebP files at correct dimensions
- [ ] `MediaItem.imageUrl` updated to `/img/{id}-cover.webp` after successful cache
- [ ] `/img/{mediaItemId}-thumb.webp` and `/img/{mediaItemId}-cover.webp` publicly accessible via HTTP
- [ ] `MEDIA_ITEM_DELETED` event triggers file deletion; safe if files don't exist
- [ ] A download failure leaves `imageUrl` null, logs a warning, and does not crash or stall the queue
- [ ] Portrait and square images resized to the correct dimensions
- [ ] Images directory created automatically if it does not exist on first run
- [ ] 200-episode TV show identification does not fire 200 simultaneous HTTP requests
