# TICKET-059: Add Average Session Duration by Type and Extensible Stat-Card Support

**Feature:** [FEA-020: Expanded Stats and Nostalgic Insights](../../features/FEA-020-expanded-stats-and-nostalgic-insights.md)

## Goal
Add more informative summary stats to the stats page, starting with average session duration by media type, while keeping room for future insight cards.

## Scope
- Compute and render average session duration by media type for the selected period.
- Introduce a stats-page model or template structure that can accommodate additional summary cards without ad hoc branching.
- Present averages in a format that is easy to compare with the existing duration-based sections.
- Add focused tests for the new aggregation and rendering behavior.

## Technical Notes
- Base averages on actual user log entries in the selected period, ignoring types with no qualifying sessions.
- Keep this ticket narrow: it establishes one new committed stat and the supporting page structure for future additions.
- Reuse existing duration-formatting helpers where practical so the new cards match the rest of the page.

## Acceptance Criteria
- [ ] The stats page shows average session duration by media type for the active period
- [ ] Types with no sessions are omitted or presented intentionally rather than showing misleading zero averages
- [ ] The new stat cards fit the existing stats layout on desktop and mobile
- [ ] Coverage protects the aggregation and presentation behavior
