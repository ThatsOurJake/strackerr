# TICKET-049: Self-Host Fonts and Third-Party Frontend Assets

**Feature:** [FEA-017: Shell Reliability, Asset Delivery, and Frontend Maintainability](../../features/FEA-017-shell-reliability-asset-delivery-and-frontend-maintainability.md)

## Goal
Reduce external runtime asset dependency by serving critical fonts and frontend libraries from app-managed static assets.

## Scope
- Inventory currently CDN-loaded frontend dependencies and typography assets used by the app shell.
- Move feasible runtime dependencies to app-managed static delivery.
- Pin versions and record provenance for each self-hosted dependency.
- Preserve current visual output and runtime behavior after source switch.
- Configure caching headers/versioning strategy appropriate for static assets.

## Security Requirements
- Use only trusted upstream releases with integrity/provenance checks during update workflow.
- Keep CSP and other existing security controls compatible with local delivery.
- Avoid introducing dynamic asset-fetch behavior that bypasses current controls.

## Acceptance Criteria
- [ ] Targeted fonts are served from app assets rather than external font CDN at runtime
- [ ] Targeted third-party frontend libraries are served from app assets where feasible
- [ ] Asset versions are pinned and documented for maintainability
- [ ] Static caching/versioning is configured without stale-asset breakage
- [ ] Visual and interactive behavior is unchanged
