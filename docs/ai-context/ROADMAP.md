# RetailOS Roadmap — 2026-11-26

All work follows RETAILOS_PRODUCT_SKILL.md. UI/UX sequencing and acceptance are governed only by UI_UX_M0_GOVERNING_SPEC.md. No parallel product-wide UI/UX plans.

## Governance consolidation
1. **BATCH 00 — Inventory/source lock:** audit record created on PR #165; review/merge pending.
2. **BATCH 01 — Canonical standard and decision architecture:** implemented on a dependent Draft PR; owner review and CI pending. Includes component/pattern governance, technology radar, terminology glossary, deprecation register, decision lifecycle and canonical navigation/ownership.
3. **BATCH 02 — Product Studio parity:** only after repository standards are accepted; update private plugin skill/manifests and validate cross-chat scenarios.
4. **BATCH 03 — Cross-source validation:** validate repository docs, plugin, source and execution workflow; resolve remaining contradictions and close governance gates.

No governance PR is merged merely because its content is drafted. No plugin release is published until canonical repository standards are accepted.

## UI/UX — M0 before M1
1. **M0-0 — Documentation consolidation:** merged to main via PR #163 at 4e654ffb519d8b124f3edbbbda4f65fe550052ef.
2. **M0-A — Structural/visual direction:** source audit, high-fidelity representative surfaces, burgundy identity, Vietnamese typography, retail imagery, composition and responsive layouts. PR #164 contains source-baseline and initial blueprints; owner review and remaining screens/prototypes are pending.
3. **M0-B — Motion/interaction:** derive observable patterns from video; prototype transitions, feedback, progressive readiness, interruption and reduced-motion behavior.
4. **M0-C — Cross-surface integration:** apply accepted visual/temporal language to real workflows without identical layouts or business-contract changes.
5. **M0-D — Technology, quality and owner acceptance:** evidence-based technology decisions, accessibility, browser/device/performance validation and explicit owner acceptance.

**M1 is blocked until M0-D completes and the owner explicitly accepts M0.** Documentation completion alone does not authorize source-wide migration or new dependencies.

## Scanner — closed
Scanner stabilization and cleanup are complete. Current contract: SCANNER_ENGINE.md; history: SCANNER_HISTORY.md. Reopen only for reproducible defect, measured bottleneck, new requirement or explicit acceptance. UI redesign must not reopen engine internals.

## Other domain contracts
PWA: PWA_RUNTIME_RELEASE.md · Performance: PERFORMANCE_BUNDLE_PWA.md · Overlay: UI_OVERLAY_ARCHITECTURE.md · Import: STOCKTAKE_FILE_IMPORT.md

## Governance
Verify live branch/PR/CI/deployment before status updates. No merge without explicit owner approval; no deployment without explicit authorization. CI, visual acceptance, device acceptance, workflow acceptance and production promotion are distinct.
