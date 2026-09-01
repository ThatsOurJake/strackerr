# TICKET-045: Mobile Navigation Drawer Redesign

**Feature:** [FEA-015: Shell and Authentication Visual Polish](../../features/FEA-015-shell-auth-visual-polish.md)

## Goal
Make mobile navigation easier to understand and dismiss through a deliberate drawer layout.

## Scope
- Add an icon close button inside the drawer header with an accessible label and tooltip where appropriate.
- Separate primary navigation, administrator navigation, and account/theme actions with spacing and subtle dividers.
- Keep the STrackerr identity visible in the drawer header.
- Close the drawer from the close button, backdrop, Escape key, and successful navigation.
- Manage focus when opening and closing, returning focus to the hamburger trigger.
- Prevent background page scrolling while the drawer is open.
- Preserve the existing desktop sidebar behavior.

## UX and Accessibility
- Use the existing Lucide X icon for the close action.
- The drawer, backdrop, dividers, active state, and focus state follow the shared design tokens in both themes.
- All controls meet the 44x44px mobile target and remain keyboard operable.
- Drawer content must fit or scroll vertically without overlapping account actions.

## Acceptance Criteria
- [ ] The open drawer contains an obvious, accessible close button
- [ ] Primary, administrator, and account actions are visually separated
- [ ] Close button, backdrop, Escape, and navigation all dismiss the drawer
- [ ] Focus enters the drawer on open and returns to the hamburger trigger on close
- [ ] The background does not scroll while the drawer is open
- [ ] The drawer has no overlap or horizontal scroll at 375px and 768px
- [ ] Desktop sidebar behavior is unchanged
