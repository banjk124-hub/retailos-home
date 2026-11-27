# Current handoff — RetailOS

**Repository:** banjk124-hub/retailos-home  
**Verified main HEAD:** 38192b2ce1c426edd6285594a57a2c2970bc14ee  
**Product/experience workflow:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)  
**Decision register:** [DECISIONS.md](./DECISIONS.md)  
**Verified state:** [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)

## Current owner direction

The former global visual direction has been withdrawn. No aesthetic is currently selected. Do not default to any former concept. Treat palette, typography, imagery, layout, density, material, icons and motion as creative decisions to explore and obtain explicit owner approval for the relevant scope.

RetailOS shares brand identity and business semantics, not mandatory feature parity or one universal interface. Desktop and Mobile may have different workflow availability, shells, navigation and presentation; Tablet must be evaluated deliberately. Share domain/data/business rules where the operation is the same. Responsive adapts within each platform presentation. Canonical policy: DECISIONS.md PD-007 and ARCHITECTURE.md ADR-030.

## Latest verified repository state

- PR #181 UI-04 initial feature presentation migration is merged at e58bce634b9ff67e95250d36c8653593680463e9.
- PR #185 AUDIT-03 CSS & Design Foundation static audit is merged at bddb84259f7bc68656a42d467ec83fdddfe17b1f. AUDIT-03A production CSS delivery baseline is the next proposed step; no CSS cleanup implementation is authorized by the audit.
- PR #186 cross-platform governance is merged; current main HEAD is `e88ae240959a8deea85aee2fd2992d40563ad365` after PR #189 UI-04D.
- PR #187 Platform Experience & Architecture Audit remains open / Draft. Its static source audit and CI #1860 are complete/passing, but owner review of the platform capability matrix remains pending. Keep this audit separate from UI-04 implementation.
- PR #189 completes UI-04D Stocktake presentation and is merged at `e88ae240959a8deea85aee2fd2992d40563ad365`; exact-head CI #1877 passed on `3a8c56423f34cb82e59985b10bce56f8f2af42a6`.

## UI-04 continuation

- UI-04A Login, UI-04B Settings/Update Center and UI-04C Scanner presentation are merged and validated in PR #181.
- UI-04D Stocktake presentation ownership is merged and validated in PR #189 at `e88ae240959a8deea85aee2fd2992d40563ad365`; exact-head CI #1877 passed.
- UI-04E Stocktake Import presentation is merged and validated in PR #190 at `38192b2ce1c426edd6285594a57a2c2970bc14ee`; final PR-head CI #1902 passed on `62a33ef4c06d5bf45a56d86f17ec34c73dc98198`. Main CI and Build and deploy PWA workflows succeeded on the merge commit.
- UI-04F cross-feature closure is implemented and validated in Draft PR #191. Exact-head CI #1907 passed on `80aba62c8ee481014c4f47ce75be2422f0df32de`; all 9 browser tests passed. The runtime artifact confirms 14 captured surfaces with zero browser/console errors, failed requests, horizontal overflow or duplicate DOM IDs; Home viewport checks cover seven desktop/tablet/mobile/landscape sizes.
- PR #191 remains Draft / unmerged pending owner review. No physical iOS/Android or low-end device acceptance is implied by browser viewport tests.

## Platform audit continuation

Review PR #187 independently. The key owner decision still needed is the Desktop/Tablet/Mobile capability matrix for each workflow. Do not implement platform filtering, shell divergence or feature hiding until that matrix is approved. Physical PWA display-mode/safe-area/keyboard acceptance and computed-style/runtime CSS evidence remain separate validation gates.

## Technical boundaries

Preserve auth/session, module IDs/readiness, snapshot/cache/offline truth, Scanner Engine/session/camera, Stocktake persistence/revisions/history/export, Import parsing/precision/conflicts/dirty edits/persistence/output, overlay focus/body-scroll-lock, PWA consent/staging/integrity/activation/boot-health/rollback, Vite Pages base and lazy-loading. Scanner stabilization is closed; do not reopen engine internals for UI redesign.

## Governance

This update does not authorize merge, deployment or production transfer. Verify live branch, commit, PR and CI before making volatile status claims or starting the next implementation slice.
