# RetailOS roadmap — 2026-11-25

All work follows [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md). UI/UX sequencing and acceptance are governed only by [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md). No parallel product-wide UI/UX plans.

## UI/UX — M0 before M1
1. **M0-0 — Documentation consolidation:** reconcile Product Skill, M0, index, status, roadmap, handoff and plugin skill. One active spec and one status.
2. **M0-A — Structural/visual direction:** source audit, high-fidelity representative surfaces, burgundy identity, Vietnamese typography, retail imagery, composition and responsive layouts.
3. **M0-B — Motion/interaction:** derive observable patterns from video; prototype transitions, feedback, progressive readiness, interruption and reduced-motion behavior.
4. **M0-C — Cross-surface integration:** apply accepted visual/temporal language to real workflows without identical layouts or business-contract changes.
5. **M0-D — Technology, quality and owner acceptance:** evidence-based technology decisions, accessibility, browser/device/performance validation and explicit owner acceptance.

**M1 is blocked until M0-D completes and the owner explicitly accepts M0.** Documentation completion alone does not authorize source-wide migration or new dependencies.

## Scanner — closed
Scanner stabilization and cleanup are complete. Current contract: [SCANNER_ENGINE.md](./SCANNER_ENGINE.md); history: [SCANNER_HISTORY.md](./SCANNER_HISTORY.md). Reopen only for reproducible defect, measured bottleneck, new requirement or explicit acceptance. UI redesign must not reopen engine internals.

## Other domain contracts
PWA: [PWA_RUNTIME_RELEASE.md](./PWA_RUNTIME_RELEASE.md) · Performance: [PERFORMANCE_BUNDLE_PWA.md](./PERFORMANCE_BUNDLE_PWA.md) · Overlay: [UI_OVERLAY_ARCHITECTURE.md](./UI_OVERLAY_ARCHITECTURE.md) · Import: [STOCKTAKE_FILE_IMPORT.md](./STOCKTAKE_FILE_IMPORT.md)

## Governance
Verify live branch/PR/CI/deployment before status updates. No merge without explicit owner approval; no deployment without explicit authorization. CI, visual acceptance, device acceptance, workflow acceptance and production promotion are distinct.