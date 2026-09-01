# FEA-012: Account and Provider Settings

## Outcome
Administrators can safely manage their account and metadata provider credentials through a clear settings experience.

## Scope
- Tabbed settings groups that separate account, metadata provider, and maintenance concerns.
- One credential set per provider, with removal required before another can be added.
- IGDB as the only game metadata provider; remove unused Steam configuration.
- Encrypted BoardGameGeek API key configuration.
- Self-service password change for the signed-in administrator.

## Dependencies
- Completed MVP account, settings, authentication, and metadata provider capabilities.
- FEA-015 provides the refreshed shared typography used by the settings interface.

## Security Requirements
- Provider secrets remain encrypted at rest, masked after entry, excluded from responses, and never written to logs.
- Credential mutations and password changes require an authenticated administrator and CSRF protection.
- Password changes require the current password and must preserve existing password policy and hashing requirements.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-034](../backlog/done/TICKET-034.md) | Tabbed settings and single-credential lifecycle |
| [TICKET-035](../backlog/done/TICKET-035.md) | Remove Steam and add BoardGameGeek credentials |
| [TICKET-036](../backlog/done/TICKET-036.md) | Signed-in administrator password change |

## Done Signal
- Settings clearly separates account, providers, and maintenance without exposing secrets.
- A configured provider cannot accept another credential until the existing credential is removed.
- IGDB and authenticated BoardGameGeek requests can be configured from Settings.
- The signed-in administrator can securely change their own password.
