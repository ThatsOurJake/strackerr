# TICKET-041: Hour-Based Statistics Chart Labels

**Feature:** [FEA-014: Activity and Artwork Improvements](../../features/FEA-014-activity-artwork-improvements.md)

## Goal
Make chart duration values immediately understandable by displaying them consistently in hours.

## Scope
- Convert duration data from stored minutes to hours at the statistics chart presentation boundary.
- Label duration axes with hours and keep the axis label visible.
- Format tooltips with an `hours` unit instead of an unexplained raw number.
- Use sensible precision: whole hours for exact values and at most one decimal place otherwise.
- Apply the same unit and formatting to chart legends or summaries that represent duration.
- Preserve raw minute storage and calculations outside chart presentation.

## UX Requirements
- Tooltips remain readable in light and dark themes and identify the period and duration.
- Axis labels do not overlap or become clipped at 375px, 768px, or 1280px.
- Empty and zero-duration periods remain visually distinct from missing data.

## Acceptance Criteria
- [ ] A stored value of `200` minutes is displayed as `3.3 hours`, not `200`
- [ ] The duration axis visibly identifies hours
- [ ] Duration tooltips include the word `hours`
- [ ] Legends and summaries do not mix minutes and hours for the same chart
- [ ] Conversion changes presentation only and does not alter persisted durations
- [ ] Labels and tooltips are legible in both themes at supported breakpoints
