# FEA-026: Manual TV Episode Parent Selection

## Outcome
When a user manually adds a TV episode, they can attach it to an existing TV show already in their collection (including previously unidentified shows) instead of always creating a new duplicate show item.

## Scope
- Extend the manual TV episode add flow to support selecting a parent show from existing collection items before creating a new one.
- Include candidate shows from all TV show collection items for the signed-in user, regardless of identified/unidentified state.
- Require explicit user selection of the target show when candidates are available; do not silently auto-attach.
- Keep current fallback behavior: if no suitable show is selected, create a new show item and attach the episode to it.
- Improve duplicate prevention in the episode-add path so obvious parent-show duplicates are avoidable at point of entry.
- Preserve existing manual add support for users who intentionally want a brand-new show item.

## Non-Goals
- Automatic background merging of already duplicated show items.
- Re-identification or metadata reconciliation of existing shows as part of this flow.
- Introducing fuzzy global deduplication rules outside the manual episode add workflow.

## Dependencies
- FEA-006 provides collection item browsing and TV show item detail surfaces that this flow extends.
- FEA-007 provides the manual logging and manual media add foundations for TV episode creation.
- FEA-013 and FEA-023 define current identification boundaries that must remain unchanged by this feature.

## UX Requirements
- Manual TV episode add must present existing-show candidates clearly before creating a new parent show.
- Candidate labels must help disambiguate similar names (for example: title plus release year and/or provider badge when available).
- The choice to create a new show must remain available and explicit.
- If no candidate exists, the flow should continue with the current create-new behavior without extra friction.
- Validation and error messages must explain whether an episode was attached to an existing show or created under a new show.

## Security Requirements
- Candidate lookup must be scoped to the signed-in user's accessible collection items only.
- Server-side validation must enforce that the selected parent show id is TV media type and belongs to the current user's access scope.
- The manual episode create endpoint must reject cross-user or wrong-media-type parent ids, even if tampered in requests.
- Existing auth, CSRF protections, and route guards for manual add flows must remain intact.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-074](../backlog/todo/TICKET-074.md) | Add scoped TV show candidate lookup and server-side parent validation for manual episode add |
| [TICKET-075](../backlog/todo/TICKET-075.md) | Update manual TV episode add UX to select an existing parent show or create a new one |
| [TICKET-076](../backlog/todo/TICKET-076.md) | Add duplicate-prevention and manual episode parent-selection coverage across service, web, and API behavior |

## Done Signal
- A user manually adding a TV episode can pick an existing show in their collection and the episode is attached to that show.
- Existing shows are available as candidates whether they are identified or not.
- Users can still explicitly create a new show parent when needed.
- Duplicate empty-show creation is reduced in normal manual add usage, with coverage preventing regressions.
