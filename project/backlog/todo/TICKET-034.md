# TICKET-034: Tabbed Settings and Single-Credential Lifecycle

**Feature:** [FEA-012: Account and Provider Settings](../../features/FEA-012-account-provider-settings.md)

## Goal
Make Settings easier to scan and prevent a second credential from being added while one already exists for a provider.

## Scope
- Organize Settings into Account, Metadata Providers, and Maintenance tabs.
- Keep the selected tab addressable through a query parameter or fragment and usable without client-side JavaScript.
- Show each provider as configured or not configured without revealing its secret.
- When configured, show only the remove action; do not render or enable an add form for that provider.
- After successful removal, return the provider to its add state.
- Prevent duplicate credentials server-side even if a client bypasses the UI.

## UX Requirements
- Tabs follow the existing design system and expose an accessible selected state.
- Provider status and destructive removal are visually distinct.
- Removal requires explicit confirmation and reports success or failure through the existing flash pattern.
- Pending HTMX requests cannot be submitted repeatedly.

## Security and Validation
- Require authenticated administrator access and CSRF protection for credential mutations.
- Continue encrypting secrets at rest and never return, prefill, or log stored plaintext credentials.
- Enforce the one-credential rule transactionally at the persistence boundary.

## Acceptance Criteria
- [ ] Account, Metadata Providers, and Maintenance settings are presented as accessible tabs
- [ ] A configured provider shows status and removal controls but no add control
- [ ] Removing a credential restores that provider's add state after success
- [ ] A forged second-add request is rejected without replacing or exposing the stored credential
- [ ] Provider mutations require administrator authentication and valid CSRF protection
- [ ] Settings remains usable at 375px, 768px, and 1280px
