# TICKET-058: Add a Seeded "This Week in Prior Years" Stats Insight

**Feature:** [FEA-020: Expanded Stats and Nostalgic Insights](../../features/FEA-020-expanded-stats-and-nostalgic-insights.md)

## Goal
Add a nostalgic insight to the This week stats tab that highlights activity from the same week in a previous year and stays stable for the entire current week.

## Scope
- Limit this insight to the `this-week` period.
- Search the signed-in user's history for activity from the equivalent week in prior years.
- Select a stable result for the current week so the surfaced callback does not change day to day within that week.
- Render the insight as an optional card with an empty state when no suitable prior-year activity exists.

## Technical Notes
- Define and document the week-equivalence rule so it matches the current Monday-based stats-week logic.
- The stability requirement can be implemented through deterministic selection from matching historical candidates rather than true randomness.
- Keep the insight grounded in real activity data, such as a memorable item, session, or grouped summary from that prior-year week.

## Acceptance Criteria
- [ ] The This week stats tab can show a prior-years callback derived from the same week in an earlier year
- [ ] The selected callback remains stable throughout the current week
- [ ] Other stats periods do not show this insight
- [ ] The page handles the no-history case gracefully
- [ ] Automated coverage verifies the selection rule and period gating
