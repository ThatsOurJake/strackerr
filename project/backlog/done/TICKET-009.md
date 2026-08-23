# TICKET-009: Base Layout & Navigation

**Feature:** [FEA-004: App Shell and Search](../../features/FEA-004-app-shell-search.md)

## Goal
Create the Handlebars base layout, navigation components, Tailwind configuration, and dark mode support that all pages will extend.

## Scope
- `views/layouts/main.hbs` — base HTML shell
- `views/partials/nav.hbs` — sidebar (desktop) + top bar (mobile)
- `views/partials/flash.hbs` — success/error flash message display
- `views/partials/search-bar.hbs` — global search input with HTMX live dropdown
- `views/partials/search-dropdown.hbs` — HTMX partial: top 5 quick results
- Tailwind config: `dark` class strategy, extend config for any custom tokens
- Static asset pipeline documented in `package.json` scripts

## Layout (`main.hbs`)
- `<html lang="en" class="">` — `dark` class toggled by inline script
- Loads `public/css/app.css` (Tailwind output)
- Loads HTMX 2.x from CDN
- Inline script: reads `localStorage.getItem('theme')`, applies `dark` class to `<html>` before first paint (prevents flash)
- `{{{body}}}` yield point for page content
- Includes `{{> nav}}` and `{{> flash}}`

## Navigation (`nav.hbs`)
- Desktop: persistent left sidebar, hidden at `< md` breakpoint
- Mobile: top bar with hamburger button that toggles a slide-out drawer
- Links: Dashboard (`/`), History (`/history`), Stats (`/stats`), Collection (`/collection`), Add (`/add`)
- User section (bottom of sidebar / top-right on mobile): username, Settings (`/settings`), Logout button
- Admin-only link: Users (`/admin/users`) — rendered conditionally based on `isAdmin` passed to template context

## Search Bar (`search-bar.hbs`)
- Text input, HTMX: `hx-get="/search/partial"`, `hx-trigger="keyup changed delay:300ms"`, `hx-target="#search-dropdown"`, fires only when value length ≥ 3
- `#search-dropdown` div below input receives partial results
- "Enter" key submits to full `/search?q=` page

## Flash Messages (`flash.hbs`)
- Reads `flash.success` and `flash.error` from template context
- Auto-dismiss after 4 seconds via inline CSS animation or small inline script
- Visually distinct success (green) and error (red) styles

## Dark Mode Toggle
- Button in nav with sun/moon icon
- On click: toggle `dark` class on `<html>`, save to `localStorage`

## Acceptance Criteria
- [ ] Base layout renders with nav, Tailwind styles, and HTMX loaded
- [ ] Sidebar visible at `≥ md` breakpoint; hidden at `< md` with hamburger toggle working
- [ ] Dark mode toggle persists across page loads
- [ ] Flash messages display for success and error and auto-dismiss
- [ ] Global search input fires HTMX request after 300ms debounce with 3+ characters
- [ ] Admin nav link only visible to admin users
- [ ] `pnpm run tailwind:build` produces `public/css/app.css` with no errors
