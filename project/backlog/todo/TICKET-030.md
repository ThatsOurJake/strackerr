# TICKET-030: Responsive Design & Polish

**Feature:** [FEA-011: Hardening and Polish](../../features/FEA-011-hardening-polish.md)

## Goal
Audit and polish all pages for responsive layout, consistent Tailwind styling, image fallbacks, and page title completeness.

## Scope
- Responsive audit across all pages at three breakpoints
- Sidebar/top-nav transition
- Image fallbacks for missing cover art
- Page `<title>` tags
- Favicon
- Interactive element focus/hover states

## Breakpoints to Test
- Mobile: 375px (iPhone SE)
- Tablet: 768px (iPad)
- Desktop: 1280px

## Responsive Requirements
- No horizontal scroll at 375px
- Sidebar hidden at `< md` breakpoint; hamburger menu triggers slide-out drawer
- Alphabetical sidebar on `/collection` collapses or scrolls horizontally on mobile
- Stats monthly chart columns visible and legible on mobile (horizontal scroll acceptable for chart only)
- Table-like layouts (episode list, session log) use card stacking on mobile
- All tap targets minimum 44×44px

## Image Fallbacks
- All poster/cover `<img>` elements: `onerror` inline handler or CSS fallback showing a placeholder with media type icon
- Placeholder: rounded rectangle with type-specific icon (movie camera, game controller, etc.) and the item's initial letter

## Page Titles
Every page sets `<title>STrackerr — {Page Name}</title>`:
- Dashboard → `STrackerr — Dashboard`
- History → `STrackerr — History`
- Stats → `STrackerr — Stats`
- Collection → `STrackerr — Collection`
- Item detail → `STrackerr — {Item Title}`
- Search → `STrackerr — Search: {query}`
- Settings → `STrackerr — Settings`
- Admin → `STrackerr — Users`
- Login/Register → `STrackerr — Login` / `STrackerr — Setup`

## Interactive States
- All buttons and links have `:hover` and `:focus-visible` styles
- Focus rings visible for keyboard navigation
- Active nav link visually distinguished

## Favicon
- Add a simple SVG favicon referencing the STrackerr name/icon to `public/favicon.svg`
- Reference in base layout `<head>`

## Acceptance Criteria
- [ ] No horizontal scroll at 375px on any page (except the stats monthly chart)
- [ ] Hamburger menu opens and closes the nav drawer on mobile
- [ ] All interactive elements have hover and focus-visible styles
- [ ] Cover/poster image fallback displayed when `imageUrl` is null or fails to load
- [ ] All pages have correct `<title>` tags
- [ ] Favicon visible in the browser tab
- [ ] Alphabetical sidebar usable on tablet (768px)
