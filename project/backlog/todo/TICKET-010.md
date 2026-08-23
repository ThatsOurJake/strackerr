# TICKET-010: Login & Register Pages

**Feature:** [FEA-003: Accounts, Admin, and Settings](../../features/FEA-003-accounts-admin-settings.md)

## Goal
Render the login and registration pages and wire them to the auth module endpoints.

## Scope
- `AuthWebController`:
  - `GET /login` — render login form (redirect to `/` if already authenticated)
  - `GET /register` — render register form; redirect to `/login` if any users already exist
- Views:
  - `views/pages/login.hbs`
  - `views/pages/register.hbs`
- Use the base layout from TICKET-009
- Forms POST to the `AuthController` endpoints from TICKET-004
- Display validation errors inline (passed via flash or query param on redirect)

## Login Page
- Fields: `username`, `password`
- `POST /auth/login`
- On success: redirected to `/` by auth controller
- On failure: re-rendered with error message ("Invalid username or password")
- Link: "First time? Set up your account" → `/register` (only shown if no users exist — controller passes a flag)

## Register Page
- Fields: `username`, `password`, `confirmPassword` (client-side match check only)
- `POST /auth/register`
- Only accessible when zero users exist; controller redirects to `/login` otherwise
- On success: redirected to `/` by auth controller
- On failure: re-rendered with error message
- Explains this creates the admin account

## Acceptance Criteria
- [ ] `GET /login` renders the login form; authenticated users are redirected to `/`
- [ ] `GET /register` renders the register form when no users exist
- [ ] `GET /register` redirects to `/login` when users already exist
- [ ] Submitting valid credentials on `/login` logs the user in and redirects to `/`
- [ ] Submitting invalid credentials shows an inline error, does not clear the username field
- [ ] Submitting the register form creates the admin user and redirects to `/`
- [ ] Both pages use the base layout (Tailwind styles applied)
