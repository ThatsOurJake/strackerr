# TICKET-057: Add Visible Date-Range Context to the Stats Page

**Feature:** [FEA-020: Expanded Stats and Nostalgic Insights](../../features/FEA-020-expanded-stats-and-nostalgic-insights.md)

## Goal
Show the exact date window represented by the currently selected stats tab so users can interpret the page without inferring the range.

## Scope
- Extend stats view data to include a readable date-range label for the active period.
- Render the range near the page heading or period tabs in a way that remains clear on desktop and mobile.
- Handle bounded ranges and the all-time case cleanly.
- Add controller or view-model coverage for the displayed range text.

## Technical Notes
- Reuse the existing period-resolution logic rather than recalculating dates separately in the template.
- The label can be human-readable only; no timezone annotation is required in this ticket.
- Keep the output consistent with local-date semantics already used elsewhere in the web UI.

## Acceptance Criteria
- [ ] Every bounded stats period shows a readable date range on the page
- [ ] The all-time period shows an intentional label rather than a misleading synthetic range
- [ ] The displayed range matches the data window used by the aggregations
- [ ] Coverage verifies representative range labels
