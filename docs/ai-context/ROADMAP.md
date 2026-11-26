# RetailOS Roadmap — 2026-11-26

All work follows [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md). UI direction, greenfield boundaries and test policy are owned only by [EXPERIENCE_BUILD_STANDARD.md](./EXPERIENCE_BUILD_STANDARD.md).

## Active deliverable — Greenfield Experience rebuild

1. **Stabilize the development workflow:** remove diagnostic-only browser harnesses, keep user-journey tests concise, and scope scanner regressions to scanner changes.
2. **Experience foundation and App Shell:** create an isolated new presentation layer, design primitives/tokens needed by real surfaces, and a responsive authenticated shell. Keep existing auth/session and business orchestration.
3. **Home and Module Library:** rebuild their presentation using real module registry/readiness data.
4. **Operational workspaces:** migrate Stocktake and Import presentation without changing their engines, persistence, validation or output contracts.
5. **Settings and system experience:** Update Center, offline/error/recovery, permissions and system notifications.
6. **Integration and acceptance:** remove legacy presentation only after its consumers are migrated and new workflows pass browser and physical-device acceptance.

Each step must deliver working source/runtime behavior. Do not create another M0/M1 audit program, broad legacy CSS inventory, or documentation-only gate before implementation.

## Protected domains
- Scanner stabilization and cleanup are closed. See [SCANNER_ENGINE.md](./SCANNER_ENGINE.md) and [SCANNER_HISTORY.md](./SCANNER_HISTORY.md).
- PWA release behavior: [PWA_RUNTIME_RELEASE.md](./PWA_RUNTIME_RELEASE.md).
- Performance: [PERFORMANCE_BUNDLE_PWA.md](./PERFORMANCE_BUNDLE_PWA.md).
- Overlay lifecycle: [UI_OVERLAY_ARCHITECTURE.md](./UI_OVERLAY_ARCHITECTURE.md).
- Stocktake Import: [STOCKTAKE_FILE_IMPORT.md](./STOCKTAKE_FILE_IMPORT.md).

## Governance
Verify live branch/PR/CI/deployment before status updates. Use targeted tests for changed behavior, full regression at integration/release gates, and physical-device QA for device-specific acceptance. No merge without explicit owner approval; no deployment without explicit authorization.
