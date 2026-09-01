# TICKET-043: Parent TV Posters and Manual Image Cleanup

**Feature:** [FEA-014: Activity and Artwork Improvements](../../features/FEA-014-activity-artwork-improvements.md)

## Goal
Reuse each TV show's poster for episode activity and let administrators explicitly remove cached image files that are no longer referenced.

## Scope
- Stop enqueueing episode-specific image cache work during episode synchronization and identification.
- Resolve episode artwork to the parent TV show's cached poster in stats and other episode thumbnail contexts.
- Leave movie, TV show, game, board game, and music artwork behavior unchanged.
- Add a `Clean up unused images` action to the Maintenance settings tab.
- Run cleanup through the existing background job infrastructure so the web request returns promptly.
- Scan managed image files against current database references and remove only unreferenced cache outputs.
- Report job start, completion, removed-file count, and failures through existing job logging and settings feedback patterns.
- Prevent concurrent cleanup runs.

## Safety Requirements
- Require authenticated administrator access and CSRF protection to start cleanup.
- Restrict deletion to recognized cache filenames inside the configured images directory.
- Resolve and validate paths before deletion; never follow a path outside the image cache root.
- A partial file-system failure must be logged and must not abort database-backed application behavior.

## Acceptance Criteria
- [ ] Episode sync no longer queues episode image downloads
- [ ] Episode activity uses the parent TV show's poster or the standard TV fallback
- [ ] Settings exposes a deliberate `Clean up unused images` maintenance action
- [ ] Starting cleanup returns promptly and executes as a background job
- [ ] Cleanup removes unreferenced episode cache files and reports the removed count
- [ ] Referenced cache files and files outside the managed cache naming pattern are never deleted
- [ ] A second cleanup cannot start while one is already running
