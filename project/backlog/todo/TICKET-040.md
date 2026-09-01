# TICKET-040: Monthly History Browsing

**Feature:** [FEA-014: Activity and Artwork Improvements](../../features/FEA-014-activity-artwork-improvements.md)

## Goal
Present history one calendar month at a time with clear navigation between months.

## Scope
- Default `/history` to the current month in the user's display timezone.
- Accept an explicit year and month in a stable query parameter or route format.
- Query entries from the start of the selected month through the exclusive start of the next month.
- Add previous- and next-month navigation with the selected month and year as the page heading.
- Preserve existing day grouping, music grouping, notes, and media-type summaries within the month.
- Show the existing empty-state treatment when the selected month has no activity.
- Prevent navigation to future months unless future-dated activity is supported.

## UX and Accessibility
- Month navigation uses labelled previous and next controls with visible focus states.
- Month names are localized consistently with existing history dates.
- Navigation remains stable and usable at 375px without changing the page width.

## Security and Validation
- Validate month input and return a useful response for malformed or out-of-range values.
- Every monthly query remains scoped to the signed-in user.

## Acceptance Criteria
- [ ] Opening History shows only the current calendar month
- [ ] Previous and next controls move exactly one month across year boundaries
- [ ] The selected month and year are visible in the page heading and URL
- [ ] A month with no entries renders the history empty state
- [ ] Malformed period input cannot cause an unbounded query or server error
- [ ] Entries from another user never appear in the selected month
