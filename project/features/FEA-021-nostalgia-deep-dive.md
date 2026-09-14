# FEA-021: Nostalgia Deep Dive

## Outcome
The weekly nostalgia insight becomes a navigable experience that lets users explore the same week across their historical years instead of seeing only one highlighted callback.

## Scope
- Turn the existing This week nostalgia tile into a navigable entry point when historical data is available.
- Add a dedicated "This time past years" page or stats sub-view focused on the current week across the user's historical years.
- Show the equivalent Monday-based week for each historical year in a stable, comparable format.
- Present year-by-year summaries and activity slices that help users compare what they were doing during this week in prior years.

## Dependencies
- FEA-005 provides the current stats page and authenticated reporting surface.
- FEA-020 provides the base nostalgia tile and same-week matching rules that this feature expands.

## UX Requirements
- The nostalgia tile should feel actionable only when a deeper historical view exists.
- The "This time past years" view must make the selected comparison window obvious and explain that it mirrors the current week across prior years.
- The page should remain readable on mobile even when multiple years are shown.
- Empty or sparse historical years should be handled intentionally rather than making the page feel broken.

## Security Requirements
- All nostalgia deep-dive data must remain scoped to the signed-in user.
- The deep-dive route must honor the same authentication and caching boundaries as the rest of stats.
- Historical summaries must be derived from actual user activity and must not expose raw internal identifiers unnecessarily.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-060](../backlog/todo/TICKET-060.md) | Add navigation from the weekly nostalgia tile to a dedicated historical view |
| [TICKET-061](../backlog/todo/TICKET-061.md) | Build the "This time past years" same-week-across-years view |

## Done Signal
- Users can open a dedicated nostalgia view from the weekly stats tile.
- The deep-dive view shows the current week mapped across the user's historical years in a clear, comparable layout.
- Missing-history cases remain understandable and do not break the stats experience.
