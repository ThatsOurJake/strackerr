# FEA-022: Item Metadata Editing and Alias/History Management

## Outcome
Users can open a clearly secondary edit experience from an item page, make multiple changes in one place, and save them in a single confirm action that updates metadata, external aliases, and selected history rows together.

## Scope
- Add a visible-but-secondary Edit action on the item page.
- Add a dedicated item edit screen that loads current item data and supports:
  - Editing title
  - Editing description
  - Selecting one or more specific history/session rows for removal
  - Adding external aliases
  - Editing external aliases
  - Removing external aliases
- Submit all edits as one bulk save action from the edit screen.
- Include explicit irreversible-action messaging near save text, and return users to the static item page on cancel.

## Dependencies
- FEA-006 provides the item detail experience and route context where the edit entry point is introduced.
- FEA-007 provides the existing user activity/session history model that powers removable history rows.
- FEA-018 provides the external alias model and constraints that this feature extends with user-managed editing.

## UX Requirements
- The item page Edit action must be easy to find but visually secondary to primary item consumption actions.
- The edit screen must clearly separate editable sections (metadata, history rows, external aliases) while still signaling one final save action.
- The save area must include explicit text that saved changes cannot be undone.
- Cancel must discard in-progress changes and return to the non-edit item view.
- The history-row removal UI must let users choose exactly which rows are removed before save.

## Security Requirements
- All edit operations must remain authenticated and scoped to the signed-in user and authorized item ownership rules.
- Bulk save must validate every requested mutation (metadata updates, history-row deletions, alias changes) before commit.
- Alias edits must enforce provider/external-id format rules and conflict checks so one user's changes cannot corrupt global identity mapping.
- History-row removal must only target rows the signed-in user is allowed to manage.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-062](../backlog/done/TICKET-062.md) | Add item-page edit entry and dedicated edit screen UX with confirm/cancel flow |
| [TICKET-063](../backlog/done/TICKET-063.md) | Implement single bulk-save mutation for metadata updates and selected history-row removals |
| [TICKET-064](../backlog/done/TICKET-064.md) | Add external alias add/edit/remove inside the bulk item edit flow |

## Done Signal
- Users can open an edit screen from the item page, update title/description, manage aliases, and select specific history rows for removal.
- Confirm saves all valid edits in one bulk operation with clear irreversible-action messaging.
- Cancel returns to the static item page without persisting edits.
- Invalid or unauthorized changes are rejected safely without partial, hidden data corruption.
