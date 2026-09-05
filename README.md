# STrackerr

STrackerr is a personal history tracker for media.

You can log what you watched, played, or listened to, then view it later in a clean timeline and dashboard.

## What This Project Is

- A NestJS web app with server-rendered pages (Handlebars)
- A local-first app that stores data in SQLite by default
- A simple way to keep your own media history in one place

## Run With Docker (Fast Path)

### 1. Requirements

- Docker Desktop (or Docker Engine + Docker Compose)

### 2. Start the app

From the project root:

```bash
docker compose up --build
```

### 3. Open the app

- App URL: http://localhost:3000
- OpenAPI docs: http://localhost:3000/api/docs

### 4. Stop the app

In the same terminal:

```bash
Ctrl + C
```

Or from another terminal:

```bash
docker compose down
```

## Data Storage

- The app uses a SQLite database file at `./data/prod.db` inside this repo.
- The `./data` folder is mounted into the container, so your data stays on your machine.

## Important Environment Values

The Docker setup already includes defaults in `docker-compose.yml`.
You should change these before sharing or deploying:

- `JWT_SECRET`
- `ENCRYPTION_KEY`

If you want a fresh encryption key, run:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Then place that value in `ENCRYPTION_KEY`.

## Optional: Run Postgres Container

There is also a Postgres Compose file:

```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up --build
```

Right now, the app is configured to use SQLite by default in code.
So this Postgres service is optional and not required for normal app startup.

## Troubleshooting

- If you see a Docker connection error, start Docker Desktop first.
- If port 3000 is busy, stop the process using it, then run Docker again.
- If you want a clean local reset, remove `./data/prod.db` and restart containers.
