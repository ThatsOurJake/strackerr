# TICKET-006: Encryption Service & User Settings

**Feature:** [FEA-003: Accounts, Admin, and Settings](../../features/FEA-003-accounts-admin-settings.md)

## Goal
Implement AES-256-GCM encryption for storing third-party metadata API keys, and expose a settings page where users can manage their provider keys and regenerate their API key.

## Scope
- `EncryptionService` — `encrypt(plaintext)` / `decrypt(ciphertext, iv)` using Node.js `crypto`
- `UserMetadataKey` CRUD in `UsersService`:
  - `upsertMetadataKey(userId, provider, plainKey)` — encrypts and saves
  - `getDecryptedKey(userId, provider)` — for internal server-side use only, never returned to client
  - `deleteMetadataKey(userId, provider)`
  - `listProviderKeysForUser(userId)` — returns `{ provider, configured: boolean }[]` (no key values)
- `UsersService.regenerateApiKey(userId)` — generates a new cuid, saves, returns it once
- Settings web controller:
  - `GET /settings` — renders settings page
  - `POST /settings/provider-key` — save/update a provider key (body: `provider`, `key`)
  - `DELETE /settings/provider-key/:provider` — remove a provider key
  - `POST /settings/api-key/regenerate` — regenerate API key, flash new key once
  - `POST /settings/cache/clear` — clear all caches for the current user (calls `AppCacheService.clearForUser` + `SearchService.invalidateIndex`); flash confirmation
- View: `views/pages/settings.hbs`

## Technical Details
- Algorithm: AES-256-GCM
- `ENCRYPTION_KEY` env var: 32-byte hex string (64 hex chars)
- IV: 16 random bytes, generated fresh per encryption, stored as hex alongside ciphertext
- Auth tag appended to ciphertext (GCM provides integrity)
- The decrypted key value is **never** included in any HTTP response or view render context
- On settings page, display which providers are configured (boolean only), not the key values
- After API key regeneration: display the new key once in a flash message; it cannot be retrieved again

## Acceptance Criteria
- [ ] `encrypt(decrypt(x)) === x` for any string `x`
- [ ] Keys stored in DB are unreadable without `ENCRYPTION_KEY`
- [ ] Settings page shows provider configuration status (configured / not configured) without revealing key values
- [ ] User can save, update, and delete provider keys for: `tmdb`, `igdb`
- [ ] API key regeneration invalidates the old key immediately and shows the new key once
- [ ] `getDecryptedKey` is only callable server-side (not exposed via any HTTP route)
- [ ] "Clear caches" button on settings page clears history, dashboard, stats, and search index caches for the current user
- [ ] Flash message confirms cache clear
