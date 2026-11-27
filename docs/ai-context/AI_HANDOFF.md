# Current handoff — RetailOS

**Repository:** `banjk124-hub/retailos-home`  
**Verified main HEAD:** `01c814e546688595d2796c70bd72df228047e5e8`  
**Product/experience workflow:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)  
**Decision register:** [DECISIONS.md](./DECISIONS.md)  
**Verified state:** [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)

## Current owner direction

The former global visual direction has been withdrawn. No aesthetic is currently selected. Do not default to any former concept. Treat palette, typography, imagery, layout, density, material, icons and motion as creative decisions to explore and obtain explicit owner approval for the relevant scope.

RetailOS shares brand identity and business semantics, not mandatory feature parity or one universal interface. Desktop and Mobile may have different workflow availability, shells, navigation and presentation; Tablet must be evaluated deliberately. Share domain/data/business rules where the operation is the same. Responsive adapts within each platform presentation. Canonical policy: DECISIONS.md PD-007 and ARCHITECTURE.md ADR-030.

## Latest verified repository state

- PR #181 UI-04 initial feature presentation migration is **merged** at `e58bce634b9ff67e95250d36c8653593680463e9`. Its old feature branch is not the continuation base.
- PR #185 AUDIT-03 CSS & Design Foundation static audit is **merged** at `bddb84259f7bc68656a42d467ec83fdddfe17b1f`. AUDIT-03A production CSS delivery baseline is the next proposed step; no CSS cleanup implementation is authorized by the audit.
- PR #186 cross-platform governance is **merged**; current main HEAD is `01c814e546688595d2796c70bd72df228047e5e8`.
- PR #187 Platform Experience & Architecture Audit is **open / Draft**. Its static source audit and CI run #1860 are complete/passing, but owner review of the platform capability matrix remains pending. Keep this audit separate from UI-04 implementation.
- This documentation reconciliation is being prepared on `docs/official-status-sync-2026-11-27`, based on current main.

## UI-04 continuation

1. Read [UI_UX_PHASE_04_FEATURE_PRESENTATION.md](./UI_UX_PHASE_04_FEATURE_PRESENTATION.md).
2. Create a new isolated branch from the latest main; do not reuse `refactor/ui-04-feature-presentation`.
3. Finish UI-04D Stocktake presentation ownership. The merged work already separates overlay/panel selectors and Stocktake scanner presentation, with focused tests registered in preflight and exact-head CI #1845 passing. The broader view/state-to-presentation boundary still needs review and validation.
4. Audit UI-04E Stocktake Import by surface, state and component ownership—not file size. Preserve parser precision, conflict review, dirty edits, persistence/history and export.
5. Complete UI-04F cross-feature regression and update canonical documents from exact-head evidence.

## Platform audit continuation

Review PR #187 independently. The key owner decision still needed is the Desktop/Tablet/Mobile capability matrix for each workflow. Do not implement platform filtering, shell divergence or feature hiding until that matrix is approved. Physical PWA display-mode/safe-area/keyboard acceptance and computed-style/runtime CSS evidence remain separate validation gates.

## Technical boundaries

Preserve auth/session, module IDs/readiness, snapshot/cache/offline truth, Scanner Engine/session/camera, Stocktake persistence/revisions/history/export, Import parsing/precision/conflicts/dirty edits/persistence/output, overlay focus/body-scroll-lock, PWA consent/staging/integrity/activation/boot-health/rollback, Vite Pages base and lazy-loading. Scanner stabilization is closed; do not reopen engine internals for UI redesign.

## Governance

This documentation update does not authorize merge, deployment or production transfer. Verify live branch, commit, PR and CI before making volatile status claims or starting the next implementation slice.
