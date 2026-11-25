# Current repository state — 2026-11-25

**Repository:** `banjk124-hub/retailos-home`
**Default branch:** `main`
**Verified main baseline:** `588d8f937525acb29ebb7b0de97a9b1dcf61c0c7` (PR #159 merge commit).
**Current UI/UX audit:** [UI_UX_PHASE_00_AUDIT.md](./UI_UX_PHASE_00_AUDIT.md).

- PR #159 merged the open/evolving design-system architecture: Core Foundation, Shared Design System and Feature Experience. This is an architecture principle, not evidence that a formal new component/token implementation has shipped.
- RetailOS is undergoing a product-wide presentation and interaction redesign. Work is source-first in the existing React/Vite repository; Figma is optional/historical reference material, not a delivery or acceptance dependency.
- Reference authority: supplied image defines structural composition; supplied video defines motion/feedback/state behavior; RetailOS remains authoritative for brand, business semantics, data truth and architecture.
- Current source still mounts App/Auth/Home; Home owns section navigation and multiple feature/overlay entry points. A route-based multi-workspace shell and typed browser-history adapter remain target architecture, not current implementation.
- Existing shared Brand, Glass, Motion, Icon, LiquidDock, body-scroll-lock and PWA presentation systems are candidates for evolution, not mandatory preservation or automatic target components.
- Authentication/session, module registry identity/readiness, snapshot/cache, Scanner Engine, Stocktake/Import persistence/output, overlay body-scroll-lock and PWA release lifecycle are protected contracts during presentation migration.
- Scanner runtime stabilization and ecosystem cleanup are closed. Current implementation truth is in `SCANNER_ENGINE.md`; historical investigations are in `SCANNER_HISTORY.md`. Do not reopen SC-01–SC-05 for the UI redesign.
- Development GitHub Pages is not the shared department production environment or production promotion. Merge, deployment and production transfer remain separate approvals.
- PR #159 head CI #1465 passed. Post-merge main CI #1466 and GitHub Pages deployment #159 both completed successfully on `588d8f937525acb29ebb7b0de97a9b1dcf61c0c7`. These are automated pipeline/deployment results, not physical-device acceptance.
- Current volatile branch/PR/CI/deployment state must still be verified live before future status claims.
