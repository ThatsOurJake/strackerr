# FEA-014: Activity and Artwork Improvements

## Outcome
History and statistics are easier to interpret, while higher-quality artwork uses less local storage.

## Scope
- Month-based history browsing with previous and next month navigation.
- Statistics charts that consistently communicate duration in hours.
- Higher-resolution IGDB source images for game artwork.
- TV episodes use their parent show's poster instead of caching episode artwork.
- A Settings maintenance action that runs an unused-image cleanup job on demand.

## Dependencies
- Completed MVP history, statistics, image cache, TV enrichment, and settings capabilities.
- TICKET-034 provides the maintenance settings group used by the cleanup action.

## Security Requirements
- History and statistics queries remain scoped to the signed-in user for every selected month or period.
- Image cleanup can only be started by an authenticated administrator with CSRF protection.
- Cleanup only removes files proven to be unused within the configured image data directory.

## Tickets
| Ticket | Purpose |
|---|---|
| [TICKET-040](../backlog/todo/TICKET-040.md) | Monthly history browsing |
| [TICKET-041](../backlog/todo/TICKET-041.md) | Hour-based statistics chart labels |
| [TICKET-042](../backlog/todo/TICKET-042.md) | Higher-resolution IGDB artwork |
| [TICKET-043](../backlog/todo/TICKET-043.md) | Parent TV posters and manual image cleanup |

## Done Signal
- Users can move between calendar months in history and clearly see the selected period.
- Statistics axes and tooltips report duration in hours without ambiguous raw values.
- Game artwork is sourced at an appropriate display resolution.
- Episode activity reuses parent TV posters, and administrators can explicitly clean unused cached files.
