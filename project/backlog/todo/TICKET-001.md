# TICKET-001: Project Scaffold

**Feature:** [FEA-001: Platform Foundation](../../features/FEA-001-platform-foundation.md)

## Goal
Initialise the NestJS application with pnpm, Biome, Tailwind CSS, Handlebars, and HTMX so the project can boot and render a page.

## Scope
- Run `nest new` inside the workspace, configured for pnpm
- Integrate existing `biome.json` for linting/formatting
- Install and configure Tailwind CSS (PostCSS pipeline → `public/css/app.css`)
- Configure Handlebars as the NestJS view engine (`@nestjs/platform-express` + `hbs`)
- Add HTMX 2.x via CDN reference in the base layout
- Set up `@nestjs/config` with a `.env` file
- Create base folder structure: `src/`, `prisma/`, `public/`, `views/layouts/`, `views/partials/`, `views/pages/`
- Create `.env.example` documenting all required environment variables

## Technical Details
- Package manager: pnpm
- NestJS platform: express
- Tailwind: CLI build script in `package.json` (`tailwind:build`, `tailwind:watch`)
- Handlebars: register `views/` as the views directory, `views/layouts/` for layouts, `views/partials/` for partials
- `ConfigModule.forRoot({ isGlobal: true })` in `AppModule`

## npm Dependencies to Install
| Package | Purpose |
|---|---|
| `fuse.js` | Fuzzy search (TICKET-018) |
| `sharp` | Image download, resize, and WebP conversion (TICKET-031) |
| `class-validator` | DTO field validation decorators (`@IsString()`, `@IsNumber()`, etc.) |
| `class-transformer` | Type coercion for incoming request data (`@Type(() => Number)`) |

## Global Validation Pipe
Configure in `main.ts` before `app.listen()`:
```ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,             // strips unknown properties from incoming DTOs
  forbidNonWhitelisted: true,  // throws 400 if client sends properties not in the DTO
  transform: true,             // coerces plain objects/strings to DTO class instances
}));
```
`whitelist + forbidNonWhitelisted` together provide mass-assignment protection across all routes.
For web form POSTs (strings from HTML forms), `transform: true` + `@Type(() => Number)` on DTO fields handles coercion before validators run.

## CDN References (added to base layout `<head>`)
| Library | Purpose |
|---|---|
| HTMX 2.x | Partial page updates |
| Apache ECharts | Stats charts (TICKET-013) |
| Lucide Icons | Icon set used throughout the UI |
| Google Fonts: Syne + DM Sans | Typography |

ECharts and Lucide are loaded via CDN (not npm) because the app is server-rendered — no bundler processes client-side JS.

## Environment Variables (`.env.example`)
```
DATABASE_URL=file:./data/dev.db
ENCRYPTION_KEY=        # 32-byte hex string
JWT_SECRET=            # random secret
PORT=3000
NODE_ENV=development
DATA_DIR=./data        # root for SQLite db file and cached images
```

## Acceptance Criteria
- [ ] `pnpm run start:dev` boots the NestJS app without errors
- [ ] A GET `/` route renders a Handlebars template with Tailwind styles applied
- [ ] `pnpm run tailwind:build` compiles Tailwind to `public/css/app.css`
- [ ] `pnpm run lint` (Biome) passes with no errors
- [ ] `.env.example` is present and documents all variables including `DATA_DIR`
- [ ] `fuse.js` and `sharp` installed as npm dependencies
- [ ] ECharts, Lucide, and Google Fonts loaded via CDN in the base layout `<head>`
