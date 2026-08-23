# STrackerr — Project Overview

This file defines the recommended implementation order for all 33 tickets. The feature catalog in [features/README.md](./features/README.md) groups those tickets into product-level features so planning agents can work from features while implementation agents can follow the linked tickets.

Each ticket references its owning feature and, where relevant, the `design.md` file for global design conventions. Apply those conventions to every view built across Phase 3 onwards.

---

## Planning Model

- Features live in `project/features` and describe outcomes, scope, dependencies, linked tickets, and done signals.
- Tickets live in `project/backlog/todo` until complete, then move to `project/backlog/done`.
- Agents should start from [features/README.md](./features/README.md), choose a feature, then implement linked tickets in the order below.

---

## Design Reference
A `design.md` file has been added to this directory. It defines:
- Colour palette and Tailwind theme tokens
- Typography scale
- Component patterns (cards, badges, buttons, forms)
- Spacing conventions
- Dark mode implementation approach

Every ticket that touches a Handlebars view must follow `design.md`.

---

## Key Architectural Decisions (summary)
- **Stack**: NestJS · Prisma · Handlebars · HTMX · Tailwind CSS · pnpm
- **Auth**: Local username/password · JWT in httpOnly cookie · first user = admin
- **API auth**: `X-API-Key` header · single regeneratable key per user
- **Media items**: shared global catalog once identified · skeletons scoped by `createdByUserId`
- **Search**: always user-scoped via LogEntry join · Fuse.js fuzzy for web UI · prefix-only for API
- **Metadata providers**: BYOK for TMDB + IGDB · public for AniList, BGG, MusicBrainz
- **Deployment**: Docker + docker-compose · SQLite (dev) / Postgres (prod) · migrate on boot
