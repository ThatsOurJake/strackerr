# TICKET-044: Typography Refresh and Login Identity

**Feature:** [FEA-015: Shell and Authentication Visual Polish](../../features/FEA-015-shell-auth-visual-polish.md)

## Goal
Replace the compressed heading treatment with Outfit and make the login page unmistakably part of STrackerr.

## Scope
- Audit current Syne rendering before replacement for incorrect font loading, fallback use, `font-stretch`, transforms, width constraints, or other CSS that visibly compresses text.
- Replace Syne with Outfit for headings, labels, badges, and shared UI chrome.
- Load only the Outfit weights used by the application and update Tailwind and design documentation references.
- Remove obsolete Syne imports and references.
- Add the STrackerr name as the primary login-page identity while keeping the form as the main task.
- Ensure validation errors and narrow viewports do not cause the title or form to overlap.

## UX Requirements
- Do not apply horizontal scaling or condensed styling to Outfit.
- Confirm the rendered font is Outfit rather than a fallback at each configured weight.
- Preserve the existing color system, typography hierarchy, and direct authentication workflow.
- The app name must appear in the first viewport on mobile and desktop without adding marketing copy.

## Acceptance Criteria
- [ ] The existing heading CSS is audited and any accidental text compression is removed
- [ ] Outfit is loaded and rendered at the intended weights for all former Syne roles
- [ ] Syne is absent from font imports, Tailwind configuration, generated styles, and design documentation
- [ ] Login prominently displays `STrackerr` while keeping the form immediately accessible
- [ ] Heading and login text do not overlap or clip at 375px, 768px, or 1280px
- [ ] Typography remains readable and consistent in light and dark themes
