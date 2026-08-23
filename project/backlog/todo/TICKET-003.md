# TICKET-003: Docker & Deployment Setup

**Feature:** [FEA-001: Platform Foundation](../../features/FEA-001-platform-foundation.md)

## Goal
Containerise the application with a multi-stage Dockerfile and a docker-compose setup that runs migrations automatically on boot.

## Scope
- `Dockerfile` — multi-stage build (builder + runtime)
- `docker-compose.yml` — SQLite mode with persistent volume
- `docker-compose.postgres.yml` — override file to switch to Postgres
- `docker/entrypoint.sh` — runs `prisma migrate deploy` then starts the app
- `.dockerignore`

## Dockerfile Stages

### builder
- Base: `node:26-alpine`
- Install pnpm via corepack
- Copy source, run `pnpm install --frozen-lockfile`
- Run `pnpm run build` (NestJS compile)
- Run `pnpm run tailwind:build`
- Run `pnpm prisma generate`

### runtime
- Base: `node:26-alpine`
- Copy `dist/`, `node_modules/`, `prisma/`, `public/`, `views/` from builder
- Copy `docker/entrypoint.sh`, set executable
- Expose `PORT` (default 3000)
- Entrypoint: `sh /app/entrypoint.sh`

## entrypoint.sh
```sh
#!/bin/sh
pnpm prisma migrate deploy
exec node dist/main
```

## docker-compose.yml
- Service `app`: builds from Dockerfile, mounts `./data:/app/data` for SQLite persistence
- Environment: `DATABASE_URL`, `ENCRYPTION_KEY`, `JWT_SECRET`, `PORT`, `NODE_ENV=production`

## docker-compose.postgres.yml
- Adds `db` service (postgres:16-alpine) with health check
- Overrides `DATABASE_URL` on `app` to point at Postgres container

## Acceptance Criteria
- [ ] `docker-compose up --build` builds and starts the application
- [ ] Migrations run automatically before the app starts
- [ ] SQLite data persists across container restarts via the volume mount
- [ ] App is accessible at `http://localhost:3000`
- [ ] `docker-compose -f docker-compose.yml -f docker-compose.postgres.yml up` works with Postgres
