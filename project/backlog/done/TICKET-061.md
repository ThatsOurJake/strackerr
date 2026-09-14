# TICKET-061: Build the "This Time Past Years" Same-Week-Across-Years View

**Feature:** [FEA-021: Nostalgia Deep Dive](../../features/FEA-021-nostalgia-deep-dive.md)

## Goal
Let users review the current week across all years of their history in one dedicated nostalgia view.

## Scope
- Gather the equivalent current-week window for each historical year represented in the user's data.
- Render a year-by-year view that shows the selected week's activity across all available years.
- Include clear labels for each year's date window and meaningful summaries, such as time spent, notable items, or entry counts for that week.
- Handle years with sparse or no activity intentionally so the timeline still feels complete.

## Technical Notes
- Use the same Monday-based week semantics already used by stats.
- Treat "all the years of data we have" as each historical year present in the signed-in user's activity history, with empty weekly states rendered intentionally where useful.
- Prefer a layout that can scale to several years without requiring desktop-only interaction.
- Keep this ticket focused on the same-week-over-years experience; broader nostalgia filtering can come later.

## Acceptance Criteria
- [ ] The dedicated nostalgia view shows the current week across each historical year in the user's activity history
- [ ] Each year section clearly labels the represented date range
- [ ] The page presents useful summaries for active years and intentional empty states for inactive years
- [ ] The experience remains usable on mobile and desktop
- [ ] Automated coverage verifies the year-window selection and rendering model
