# RetailOS Roadmap — 2026-11-26

All work follows [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md). UI direction, greenfield boundaries and test policy are owned only by [EXPERIENCE_BUILD_STANDARD.md](./EXPERIENCE_BUILD_STANDARD.md).

## Active deliverable — Greenfield Experience rebuild

### Completed implementation slices
1. Experience foundation and authenticated App Shell.
2. Login presentation and employee identity handoff.
3. Operational Home and Module Library using real registry/readiness and snapshot data.
4. Library Detail with real workflow handoffs.
5. Activity Center with honest event-log availability.
6. Settings Experience integrated with existing Update Center and Scanner Settings behavior.
7. Cross-surface integration corrections and browser regression coverage.

### Remaining implementation and acceptance
1. **Operational workspaces:** migrate Stocktake and Import presentation without changing their engines, persistence, validation, revisions/conflicts, dirty-edit or output contracts.
2. **Integrated acceptance:** verify Home → Library → operational workflow → return navigation, Settings/Update Center, Activity signals, overlays, focus, scroll locking and PWA update safety.
3. **Physical-device QA:** desktop, tablet, average/low-end Android and iOS Safari/PWA; verify touch scroll, safe areas, browser chrome, performance and camera behavior.
4. **Owner acceptance and release gates:** visual acceptance, explicit merge approval, then separately authorized deployment and production transfer.

## Protected domains
- Scanner stabilization and cleanup are closed. See [SCANNER_ENGINE.md](./SCANNER_ENGINE.md) and [SCANNER_HISTORY.md](./SCANNER_HISTORY.md).
- PWA release behavior: [PWA_RUNTIME_RELEASE.md](./PWA_RUNTIME_RELEASE.md).
- Performance: [PERFORMANCE_BUNDLE_PWA.md](./PERFORMANCE_BUNDLE_PWA.md).
- Overlay lifecycle: [UI_OVERLAY_ARCHITECTURE.md](./UI_OVERLAY_ARCHITECTURE.md).
- Stocktake Import: [STOCKTAKE_FILE_IMPORT.md](./STOCKTAKE_FILE_IMPORT.md).

## Governance
Use targeted tests during feature work and full regression at integration/release gates. Browser emulation is not physical-device acceptance. No merge without explicit owner approval; no deployment without explicit authorization.
