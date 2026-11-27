# Current handoff — RetailOS

**Repository:** banjk124-hub/retailos-home  
**Verified main HEAD:** ae0ee4cde5ce8ccd160b77cf5198dbb103b82b45  
**Product/experience workflow:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)  
**Decision register:** [DECISIONS.md](./DECISIONS.md)  
**Verified state:** [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)

## Current owner direction

The former global visual direction has been withdrawn. No aesthetic is currently selected. Do not default to any former concept. Treat palette, typography, imagery, layout, density, material, icons and motion as creative decisions to explore and obtain explicit owner approval for the relevant scope.

RetailOS shares identity, journeys and business semantics. A generic feature request defaults to shared Desktop + Mobile; explicit platform-only scope must be recorded. Current nine Home workflows are shared. Camera barcode scanning and camera-only copy/CSS are Mobile-only; manual barcode lookup is shared. Desktop/Mobile presentations independently own composition, layout, spacing, components and navigation while sharing business logic/results. Shared changes require both-platform regression evidence. Tablet remains review-required. Canonical policy: DECISIONS.md PD-007/PD-008, ARCHITECTURE.md ADR-030 and PLATFORM_CAPABILITY_MATRIX.md.

## Latest verified repository state

- PR #181 UI-04 initial feature presentation migration is merged at e58bce634b9ff67e95250d36c8653593680463e9.
- PR #185 AUDIT-03 CSS & Design Foundation static audit is merged at bddb84259f7bc68656a42d467ec83fdddfe17b1f. AUDIT-03A production CSS delivery baseline is the next proposed step; no CSS cleanup implementation is authorized by the audit.
- PR #186 cross-platform governance, PR #187 PA-02 capability matrix, UI-04E PR #190 and UI-04F PR #191 are merged. Current main HEAD is `ae0ee4cde5ce8ccd160b77cf5198dbb103b82b45`.
- PR #187 Platform Experience & Architecture Audit remains open / Draft and is being advanced from the post-UI-04F main baseline. Owner has confirmed the PA-02 matrix: nine Home workflows shared Desktop/Mobile; camera scanner and dedicated copy/CSS Mobile-only; manual lookup shared; Tablet review-required. Exact-head CI run #1914 passed on `1067a21d402ada5b0baa21c53241a57284e07932`, including preflight, TypeScript, production/Pages builds, bundle comparison and 9 Playwright browser tests.
- PR #189 completes UI-04D Stocktake presentation and is merged at `e88ae240959a8deea85aee2fd2992d40563ad365`; exact-head CI #1877 passed on `3a8c56423f34cb82e59985b10bce56f8f2af42a6`.

## UI-04 continuation

- UI-04A Login, UI-04B Settings/Update Center and UI-04C Scanner presentation are merged and validated in PR #181.
- UI-04D Stocktake presentation ownership is merged and validated in PR #189 at `e88ae240959a8deea85aee2fd2992d40563ad365`; exact-head CI #1877 passed.
- UI-04E Stocktake Import presentation is merged and validated in PR #190 at `38192b2ce1c426edd6285594a57a2c2970bc14ee`; final PR-head CI #1902 passed on `62a33ef4c06d5bf45a56d86f17ec34c73dc98198`. Main CI and Build and deploy PWA workflows succeeded on the merge commit.
- UI-04F cross-feature closure was merged via PR #191 at `6925cf968ea2b9c37377856abaf4c4a2ca6785a0`; exact-head CI #1908 passed on `4d696f37bc9aa3214af16e3b9889b0965239a90b`. All 9 browser tests passed; 14 captured surfaces reported zero browser/console errors, failed requests, horizontal overflow or duplicate DOM IDs. No physical iOS/Android or low-end device acceptance is implied by browser viewport tests.

## Platform audit continuation

Continue SH-01 on branch `refactor/sh-01b-authenticated-shell`, based on main `ae0ee4cde5ce8ccd160b77cf5198dbb103b82b45`. SH-01B extracted authenticated composition while App remains auth/session and PWA lifecycle owner. SH-01C added platform context, separate Desktop/Mobile Home roots, Tablet compatibility fallback, explicit navigation renderers and Mobile-only scanner/settings gates. SH-01D adds integration contracts and exact-head CI/browser validation. See `SH-01_SHELL_PRESENTATION_OWNERSHIP.md`. Do not use viewport breakpoints as feature policy. Physical PWA acceptance and CSS computed-style validation remain separate gates.

## Technical boundaries

Preserve auth/session, module IDs/readiness, snapshot/cache/offline truth, Scanner Engine/session/camera, Stocktake persistence/revisions/history/export, Import parsing/precision/conflicts/dirty edits/persistence/output, overlay focus/body-scroll-lock, PWA consent/staging/integrity/activation/boot-health/rollback, Vite Pages base and lazy-loading. Scanner stabilization is closed; do not reopen engine internals for UI redesign.

## Governance

This update does not authorize merge, deployment or production transfer. Verify live branch, commit, PR and CI before making volatile status claims or starting the next implementation slice.
