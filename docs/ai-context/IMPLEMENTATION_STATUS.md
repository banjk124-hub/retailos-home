# Current verified implementation status — 2026-11-27

**Repository:** banjk124-hub/retailos-home  
**Verified main HEAD:** 6925cf968ea2b9c37377856abaf4c4a2ca6785a0

This file records verified repository state, not an authorization to merge, deploy or transfer production.

## Owner direction and governance

- The former global visual direction has been withdrawn. No replacement visual language is selected. Creative decisions remain experience-specific and require explicit owner approval before substantial implementation.
- Cross-platform policy is canonical in DECISIONS.md PD-007/PD-008 and ARCHITECTURE.md ADR-030. The owner-confirmed matrix is in `PLATFORM_CAPABILITY_MATRIX.md`: all nine current Home workflows shared Desktop/Mobile; camera scanner and camera-only copy/CSS Mobile-only; manual lookup shared; Tablet review-required. A generic feature request defaults to shared Desktop/Mobile.
- Merge and deployment are separate approval gates. No merge or deployment is authorized by this documentation update.

## Verified merged work

| Work | Repository state | Evidence |
|---|---|---|
| UI-03 CSS consolidation | PR #180 merged | Merge commit 7b679da9bbd3b3a21b50711a8b56be8ca14e2e54; final docs CI #1817 passed |
| UI-04 initial presentation slices | PR #181 merged | Merge commit e58bce634b9ff67e95250d36c8653593680463e9; exact branch-head CI #1845 passed |
| AUDIT-02 ownership implementation | PR #184 merged | Verified PR metadata |
| AUDIT-03 CSS & Design Foundation static audit | PR #185 merged | Merge commit bddb84259f7bc68656a42d467ec83fdddfe17b1f; audit only, no source implementation |
| Cross-platform governance contract | PR #186 merged | Merge commit `01c814e546688595d2796c70bd72df228047e5e8` |
| UI-04E Stocktake Import presentation | PR #190 merged | Merge commit `38192b2ce1c426edd6285594a57a2c2970bc14ee`; final exact PR-head CI #1902 passed |
| UI-04F cross-feature closure | PR #191 merged | Merge commit `6925cf968ea2b9c37377856abaf4c4a2ca6785a0`; exact-head CI #1908 passed |

## Active work and open gates

### UI-04 — Feature Presentation Migration

- UI-04A Login, UI-04B Settings/Update Center and UI-04C Scanner presentation are implemented and validated in merged PR #181.
- UI-04D Stocktake presentation ownership is implemented, validated and merged in PR #189 at `e88ae240959a8deea85aee2fd2992d40563ad365`.
- PR #189 exact-head CI #1877 passed on `3a8c56423f34cb82e59985b10bce56f8f2af42a6`, including the dedicated Stocktake browser workflow.
- UI-04E Stocktake Import presentation is implemented, validated and merged in PR #190 at `38192b2ce1c426edd6285594a57a2c2970bc14ee`.
- Final PR-head CI #1902 passed on `62a33ef4c06d5bf45a56d86f17ec34c73dc98198`, including full preflight, TypeScript, production/Pages builds, bundle comparison and 9 responsive/runtime browser tests.
- Main RetailOS CI run [#45954497490](https://github.com/banjk124-hub/retailos-home/actions/runs/45954497490) and Build and deploy PWA run [#45954497547](https://github.com/banjk124-hub/retailos-home/actions/runs/45954497547) both succeeded on the merge commit.
- UI-04F cross-feature closure is implemented and validated in Draft PR #191. Exact-head CI run [#1907](https://github.com/banjk124-hub/retailos-home/actions/runs/45965306663) passed on `80aba62c8ee481014c4f47ce75be2422f0df32de`: preflight, TypeScript, production/Pages builds, bundle comparison and 9 Playwright browser tests. Runtime artifact confirms 14 captured surfaces with zero browser/console errors, failed requests, horizontal overflow or duplicate DOM IDs. PR #191 remains unmerged pending owner review.
- Canonical detail: UI_UX_PHASE_04_FEATURE_PRESENTATION.md.

### Platform Experience & Architecture Audit

- PR #187 remains open / Draft; it is being refreshed from main `6925cf968ea2b9c37377856abaf4c4a2ca6785a0` after UI-04F merge.
- PA-02 owner matrix is now confirmed: nine Home workflows shared Desktop/Mobile; camera scanner and dedicated copy/CSS Mobile-only; manual lookup shared; Tablet review-required.
- This PR adds typed platform-availability metadata to the module registry and a focused preflight contract. It does not yet implement a platform resolver, filtering, separate shells or presentation migration.
- CI #1860 validates the old audit-only head and is not evidence for the refreshed source changes. Exact new-head CI is pending.
- Physical-device PWA acceptance and computed-style/runtime CSS validation remain pending.

### AUDIT-03 — CSS & Design Foundation

- PR #185 is merged; its deliverable is a static audit, not an implementation.
- AUDIT-03A production CSS delivery baseline is the next proposed step. Do not delete or consolidate CSS based only on raw file size.

## Technical boundaries

Preserve auth/session, module registry and destination identity, snapshot/cache/offline truth, scanner engine/camera lifecycle, Stocktake persistence/revisions/history/export, Stocktake Import parsing/precision/conflicts/dirty edits/persistence/output, overlay focus/body-scroll-lock, PWA update staging/consent/integrity/activation/boot-health/rollback, Vite Pages base path and lazy-loading. Scanner stabilization SC-00–SC-05 remains closed; reopen only for a reproducible defect, measured bottleneck or new requirement.

## Evidence classification

- **Repository/source and PR metadata inspected:** main HEAD `6925cf968ea2b9c37377856abaf4c4a2ca6785a0`; PR #181, #185, #186, #187, #189, #190 and #191 metadata.
- **UI-04D:** merged PR #189; exact-head CI #1877 passed on source head `3a8c56423f34cb82e59985b10bce56f8f2af42a6`.
- **UI-04E:** merged PR #190; exact PR-head CI #1902 passed on `62a33ef4c06d5bf45a56d86f17ec34c73dc98198`; main CI and Pages deploy workflows succeeded on merge commit.
- **Browser/device acceptance:** UI-04F Chromium evidence covers 14 captured surfaces and 7 Home viewports; no physical iOS/Android or low-end device acceptance is claimed.
- **Merge/deployment:** PR #190 is merged. The GitHub Pages build/deploy workflow completed successfully on the merge commit; no separate production-account transfer was performed.
