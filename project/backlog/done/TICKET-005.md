# TICKET-005: Admin User Management

**Feature:** [FEA-003: Accounts, Admin, and Settings](../../features/FEA-003-accounts-admin-settings.md)

## Goal
Allow the admin user to view, create, delete users, and change passwords via a protected admin UI.

## Scope
- `AdminGuard` — extracts `userId` from the JWT (`request.user.sub`), queries `UsersService.findById(userId)` to get the live DB record, checks `dbUser.isAdmin`; returns 403 if false or user not found. The JWT `isAdmin` field is **never consulted** — only the database value is trusted.
- `UsersService` methods:
  - `findAll()` — returns all users (excluding `passwordHash`)
  - `create(username, password)` — hashes password, generates `apiKey`, saves user
  - `delete(userId)` — cascades deletion of the user's log entries and metadata keys
  - `changePassword(userId, newPassword)` — hashes and saves new password
- Admin web controller routes (all behind `JwtAuthGuard` + `AdminGuard`):
  - `GET /admin/users` — renders user list
  - `POST /admin/users` — creates a new user
  - `DELETE /admin/users/:id` — deletes a user
  - `POST /admin/users/:id/password` — changes a user's password
- View: `views/pages/admin/users.hbs`

## Technical Details
- Admin cannot delete their own account (check `userId !== currentUser.id`)
- New users created by admin do not have `isAdmin: true` by default
- Cascade delete: use Prisma `onDelete: Cascade` on `LogEntry → User` and `UserMetadataKey → User` relations (confirm in schema from TICKET-002)
- Flash messages for success/error on all actions

## Acceptance Criteria
- [ ] `GET /admin/users` lists all users; accessible only to admins (403 for others)
- [ ] `AdminGuard` re-queries the DB on every request — a user stripped of admin in the DB is denied immediately, even with a valid JWT that still carries `isAdmin: true`
- [ ] Admin can create a new user with a username and password
- [ ] Admin can delete any user except themselves
- [ ] Admin can change any user's password
- [ ] Deleting a user also removes their log entries and metadata keys
- [ ] All actions show a flash confirmation or error message
