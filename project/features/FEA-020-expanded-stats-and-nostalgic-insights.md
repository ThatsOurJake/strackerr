# FEA-020: Expanded Stats and Nostalgic Insights

## Outcome
The stats page explains the active reporting window more clearly and adds memorable, user-scoped insights beyond basic totals.

## Scope
- Show a readable date range for the currently selected stats period.
- Add a stable "This week in prior years" insight for the This week tab that reuses the same result for the whole current week.
- Add supplemental stats that deepen interpretation of the selected period, starting with average session duration by media type.
- Extend the stats page layout and view model to support additional insight cards and charts without making the page harder to scan.

## Dependencies
- FEA-005 provides the current stats page, period tabs, and aggregation foundations.
- FEA-014 provides the current chart-display conventions for hours and artwork contexts that should remain consistent.

## UX Requirements
- The active date range must be readable at a glance and match the currently selected tab.
- The nostalgic insight should feel curated rather than random: for a given current week, it stays stable and highlights activity from the same week in a prior year.
- New stat cards should fit the existing stats page visual language and remain legible on mobile.

## Security Requirements
- All new aggregations and nostalgia lookups must remain fully scoped to the signed-in user.
- Cached stats output must separate users and selected periods so insights do not leak across accounts.
- Historical insight text must be generated from actual user activity data and handle empty-history cases without exposing raw internals.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-057](../backlog/done/TICKET-057.md) | Add visible date-range context to the stats page |
| [TICKET-058](../backlog/done/TICKET-058.md) | Add a seeded "This week in prior years" stats insight |
| [TICKET-059](../backlog/done/TICKET-059.md) | Add average session duration by type and extensible stat-card support |

## Done Signal
- Every stats tab clearly shows the date range it represents.
- The This week tab can surface a stable prior-years callback when matching historical activity exists.
- Supplemental stats add value without regressing clarity, performance, or user scoping.
