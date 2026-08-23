# TICKET-028: Error Handling & Empty States

**Feature:** [FEA-011: Hardening and Polish](../../features/FEA-011-hardening-polish.md)

## Goal
Implement consistent error handling across web routes, empty state views for all list pages, and HTMX loading indicators.

## Scope
- Global HTTP exception filter for web routes
- Error page view
- Empty state partials for each list view
- HTMX loading indicators on all partial-loading elements
- Inline form validation error display

## Global Exception Filter
- Catches all `HttpException` on web routes (non-API routes)
- Renders `views/pages/error.hbs` with `{ statusCode, message }`
- 404: "Page not found"
- 403: "You don't have permission to view this"
- 500: always render the generic "Something went wrong" string — **never** pass the raw exception message or any internal detail to the view in any environment. Log the full error server-side via NestJS `Logger` instead.
- API routes (`/api/*`) continue to return JSON errors (NestJS default behaviour); 500 responses return `{ statusCode: 500, message: "Internal server error" }` with no further detail

## Empty State Partials
Each partial includes a relevant icon, a short message, and a call-to-action link:

| Partial | Message | CTA |
|---|---|---|
| `empty-history.hbs` | "No activity yet" | "Add your first entry" → `/add` |
| `empty-collection.hbs` | "Nothing here yet" | "Start tracking" → `/add` |
| `empty-stats.hbs` | "No data for this period" | "Add an entry" → `/add` |
| `empty-search.hbs` | "No results for '{query}'" | "Add it manually" → `/add` |
| `empty-admin-users.hbs` | "No other users yet" | "Add a user" |

## HTMX Loading Indicators
- All elements with `hx-get` or `hx-post` attributes include `hx-indicator="#{id}"` pointing to a spinner element
- Spinner: `<span id="{id}" class="htmx-indicator">…</span>` (CSS: hidden by default, shown when HTMX request is in flight via `.htmx-request` class)
- Apply to: collection grid, search dropdown, add form steps, identify panel

## Form Validation Errors
- Controller catches validation errors and passes `errors: { field: message }` to the view context
- Each form field renders an error message below it when `errors[fieldName]` is set
- Field receives a visual error state (red border)

## Acceptance Criteria
- [ ] Unknown routes render the error page (not a JSON 404)
- [ ] `/admin/users` accessed by a non-admin renders the 403 error page
- [ ] All list views (`/history`, `/collection`, `/stats`, `/search`) render their empty state
- [ ] HTMX partial loads show a loading spinner while in flight
- [ ] Form submission errors shown inline, not as a full-page error
- [ ] API routes still return JSON errors (not HTML)
