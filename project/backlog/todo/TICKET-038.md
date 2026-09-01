# TICKET-038: TV Show Search Results and Navigation

**Feature:** [FEA-013: Search and Identification Corrections](../../features/FEA-013-search-identification-corrections.md)

## Goal
Let users find a TV show as a collection-level result and open that show's collection detail.

## Scope
- Include parent TV shows in the signed-in user's global search alongside matching episodes.
- Represent show and episode results as distinct view models.
- Selecting a TV show opens its collection detail page.
- Selecting an episode retains the existing episode destination.
- Replace raw enum labels such as `TV_EPISODE` with human-readable labels.
- Deduplicate a parent show when several matching episodes would otherwise repeat it.

## UX Requirements
- Show results display the show title, poster fallback, and a `TV show` label.
- Episode results display the parent show and episode context with an `Episode` label.
- Result rows remain keyboard accessible and usable at supported responsive breakpoints.

## Security and Validation
- Only return TV shows reachable through the signed-in user's collection or log entries.
- Validate collection identifiers on navigation so guessed IDs cannot expose another user's activity.

## Acceptance Criteria
- [ ] Searching for a TV show title returns one collection-level show result when it belongs to the user's collection
- [ ] Selecting the show result opens that TV show's collection detail
- [ ] Episode matches remain searchable and include useful show and episode context
- [ ] No result displays raw values such as `TV_EPISODE`
- [ ] Multiple episode matches do not create duplicate parent show rows
- [ ] Search results remain user-scoped and keyboard accessible
