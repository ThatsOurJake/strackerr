# TICKET-004: Authentication Module

**Feature:** [FEA-003: Accounts, Admin, and Settings](../../features/FEA-003-accounts-admin-settings.md)

## Goal
Implement local username/password authentication with JWT stored in an httpOnly cookie, including guards for protecting routes.

## Scope
- `AuthModule` with Passport local strategy and JWT strategy
- `POST /auth/login` — validate credentials, set JWT cookie
- `POST /auth/register` — only succeeds when zero users exist; first user gets `isAdmin: true`; returns 403 afterwards
- `POST /auth/logout` — clears the JWT cookie
- `JwtAuthGuard` — protects web routes, redirects to `/login` on failure (not 401 JSON)
- `CurrentUser` decorator — extracts user from request in controllers

## Dependencies
`@nestjs/passport`, `@nestjs/jwt`, `passport`, `passport-local`, `passport-jwt`, `bcrypt`

## Technical Details

### Registration logic
1. Check `User` count — if > 0, throw `ForbiddenException`
2. Hash password with bcrypt (salt rounds: 12)
3. Generate `apiKey` (cuid)
4. Set `isAdmin: true` on the first user
5. Return the created user (exclude `passwordHash`)

### JWT
- Payload: `{ sub: userId, username, isAdmin }`
- `isAdmin` in the JWT is included **for UI rendering only** (e.g. showing the admin nav link). It must never be used as the authorization source of truth — always re-query the DB for any access control decision.
- Signed with `JWT_SECRET` env var
- Cookie options: `httpOnly: true`, `secure: true` when `NODE_ENV=production`, `sameSite: 'strict'`, `maxAge: 7 days`
- Cookie name: `strackr_token`

### JwtAuthGuard behaviour
- On missing/invalid cookie: redirect to `/login` (not JSON 401)
- On valid cookie: attach decoded JWT payload to `request.user` — this contains `sub` (userId) for identity, but **not** trusted for authorization beyond route access

## Acceptance Criteria
- [ ] `POST /auth/register` with no existing users creates an admin user and sets JWT cookie
- [ ] `POST /auth/register` with existing users returns 403
- [ ] `POST /auth/login` with valid credentials sets JWT cookie and redirects to `/`
- [ ] `POST /auth/login` with invalid credentials re-renders login with an error message
- [ ] `POST /auth/logout` clears the cookie and redirects to `/login`
- [ ] Routes decorated with `@UseGuards(JwtAuthGuard)` redirect unauthenticated requests to `/login`
- [ ] Passwords are never stored in plaintext
- [ ] `jwt.isAdmin` is never used as an authorization check in any guard or controller — only `db.user.isAdmin` is trusted
