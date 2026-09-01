# TICKET-036: Signed-In Administrator Password Change

**Feature:** [FEA-012: Account and Provider Settings](../../features/FEA-012-account-provider-settings.md)

## Goal
Allow the signed-in administrator to change their own password without requiring an external reset path.

## Scope
- Add a password-change form to the Account settings tab.
- Require current password, new password, and new-password confirmation.
- Verify the current password before changing the stored hash.
- Apply the existing password policy and use the existing password hashing service.
- Return field-level validation and a success message without echoing password values.
- Keep the administrator signed in by issuing authentication state consistent with the updated account credentials.

## Security and Validation
- Require authenticated access, valid CSRF protection, and matching account ownership.
- Use constant-time password verification through the established hashing library.
- Never log, retain, or repopulate submitted password fields.
- Apply the existing authentication rate limit to repeated failed current-password checks.

## Acceptance Criteria
- [ ] The signed-in administrator can open the password-change form from Account settings
- [ ] An incorrect current password leaves the password unchanged
- [ ] Mismatched or policy-invalid new passwords show useful field errors
- [ ] A valid change stores only the new password hash and leaves the administrator signed in
- [ ] The old password no longer authenticates and the new password does
- [ ] Password fields are not logged or repopulated after any response
