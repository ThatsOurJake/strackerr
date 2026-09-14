# TICKET-062: Add Item Edit Entry and Dedicated Edit Screen UX

**Feature:** [FEA-022: Item Metadata Editing and Alias/History Management](../../features/FEA-022-item-metadata-editing-and-alias-history-management.md)

## Goal
Introduce a visible-but-secondary item edit entry point and a dedicated edit screen that supports one confirm/cancel workflow.

## Scope
- Add a secondary Edit action to the item detail page.
- Add/edit route and controller rendering for the item edit screen.
- Render editable metadata inputs for title and description.
- Render a selectable list of the item's session/history rows to support multi-select removal intent.
- Render external alias editing sections as placeholders or integrated controls ready for save payload wiring.
- Add save/cancel controls where cancel returns to the static item page.
- Include explicit irreversible-action messaging near the save area (for example: changes cannot be undone once saved).

## Technical Notes
- Keep this ticket focused on edit-screen navigation and UX shape; backend mutation behavior is finalized by follow-up tickets.
- Reuse established layout, spacing, and form patterns so the edit experience feels native to existing item pages.
- Ensure selected history rows and alias intents are representable in a single outbound payload model.

## Acceptance Criteria
- [ ] The item detail page exposes a visible but secondary Edit entry point
- [ ] The edit screen loads existing item title, description, history rows, and alias section UI
- [ ] The edit screen includes clear irreversible-action save text and a cancel action back to the item page
- [ ] The UI supports selecting multiple specific history/session rows for removal intent
- [ ] Automated coverage verifies route access, render state, and cancel navigation behavior
