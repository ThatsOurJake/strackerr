# TICKET-029: Security Hardening

**Feature:** [FEA-011: Hardening and Polish](../../features/FEA-011-hardening-polish.md)

## Goal
Apply security middleware, CSRF protection, rate limiting, and input sanitisation across the application.

## Scope
- Helmet middleware (security headers)
- CSRF double-submit cookie for web form submissions
- Rate limiting on web and API routes
- API key query param rejection
- Cookie security flags in production
- Input sanitisation on user-supplied strings

## Helmet
- Install and apply `helmet` middleware in `main.ts`
- Configure CSP to allow:
  - `script-src`: `'self'` + HTMX CDN origin
  - `style-src`: `'self'` + `'unsafe-inline'` (required for Tailwind inline styles)
  - `img-src`: `'self' data:` only — all provider images are cached locally (TICKET-031), so no external image CDN origins are needed at runtime
- Other Helmet defaults apply: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS (production only)

## CSRF Protection
- Double-submit cookie pattern for all state-changing web form POSTs
- On `GET` of any page with a form: generate a CSRF token, set as a cookie (`csrf_token`, not httpOnly) and embed as a hidden `<input name="_csrf">` in forms
- On `POST`: middleware validates that the cookie value matches the form field value
- Applies to web routes only; API routes (`/api/*`) are excluded (they use API key auth)
- Return 403 if token missing or mismatched

## Rate Limiting (`@nestjs/throttler`)
- Web routes: 100 requests/minute per IP
- API routes: 60 requests/minute per API key (applied in `ApiKeyGuard`)
- 429 response: web routes render a friendly "Too many requests" page; API routes return JSON

## Additional Security Rules
- `ApiKeyGuard` (TICKET-025): explicitly check that `X-Api-Key` header is used; if `?apiKey=` query param is present, return 401 with message "API key must be sent in the X-API-Key header, not as a query parameter"
- Cookie `secure` flag: enabled when `NODE_ENV === 'production'`
- Input sanitisation: strip HTML tags from all user-supplied string fields (title, platform, username) before persistence using a simple strip-tags utility — Handlebars auto-escapes output, but sanitise at the persistence layer too

## Acceptance Criteria
- [ ] Helmet headers present on all responses (verify with curl)
- [ ] CSRF token required for all web form POSTs; missing token returns 403
- [ ] CSRF middleware does not apply to `/api/*` routes
- [ ] 61st web request per minute from the same IP returns 429
- [ ] API key in query param (`?apiKey=`) returns 401 with explanatory message
- [ ] `Secure` cookie flag set in production (`NODE_ENV=production`)
- [ ] HTML tags stripped from user-supplied string inputs before DB write
