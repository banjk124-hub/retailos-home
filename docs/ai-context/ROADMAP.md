# RetailOS Roadmap — 2026-11-26

All work follows [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md). UI/UX sequencing and acceptance are governed only by [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md). No parallel product-wide UI/UX plans.

## Documentation and AI governance
1. **BATCH 00 — Inventory/source lock:** PR #165 merged to main at `8bd3c05b78098376bfa22bd7d87132c3d8688552`.
2. **BATCH 01 — Canonical governance standards:** drafted and merged into the BATCH 00 integration branch via PR #166; not yet integrated into main. BATCH 02 branch carries these standards forward for one coherent review/PR against main. Exact-head CI and owner acceptance remain open.
3. **BATCH 02 — Technical-document consolidation:** active on `docs/batch-02-documentation-consolidation`; remove duplicate UI/UX authority documents, correct inbound links, preserve unique audit evidence, reconcile current status and verify references.
4. **BATCH 03 — Product Studio parity:** only after repository standards are reviewed and owner-accepted; update private plugin skill/manifests and validate cross-chat scenarios.
5. **BATCH 04 — Cross-source validation:** validate repository docs, plugin, source skills and real execution workflow; resolve remaining contradictions and close governance gates.

The private Product Studio plugin complements repository skills; it does not replace CORE/TASK skills, domain contracts or source truth.

## UI/UX — M0 before M1
1. **M0-0 — Direction and documentation baseline:** merged to main via PR #163 at `4e654ffb519d8b124f3edbbbda4f65fe550052ef`.
2. **M0-A — Structural/visual direction:** source audit, high-fidelity representative surfaces, burgundy identity, Vietnamese typography, retail imagery, composition and responsive layouts. PR #164 remains Draft; initial Login/Shell/Home/Library blueprints exist, while remaining screens, source prototypes and owner acceptance are pending.
3. **M0-B — Motion/interaction:** derive observable patterns from the video; prototype transitions, feedback, progressive readiness, interruption and reduced-motion behavior.
4. **M0-C — Cross-surface integration:** apply accepted visual/temporal language to real workflows without identical layouts or business-contract changes.
5. **M0-D — Technology, quality and owner acceptance:** evidence-based technology decisions, accessibility, browser/device/performance validation and explicit owner acceptance.

**M1 remains blocked until M0-D completes and the owner explicitly accepts M0.** Documentation completion alone does not authorize source-wide migration or new dependencies.

## Scanner — closed
Scanner stabilization and cleanup are complete. Current contract: [SCANNER_ENGINE.md](./SCANNER_ENGINE.md); history: [SCANNER_HISTORY.md](./SCANNER_HISTORY.md). Reopen only for a reproducible defect, measured bottleneck, new requirement or explicit acceptance. UI redesign must not reopen engine internals.

## Other domain contracts
[PWA](./PWA_RUNTIME_RELEASE.md) · [Performance](./PERFORMANCE_BUNDLE_PWA.md) · [Overlay](./UI_OVERLAY_ARCHITECTURE.md) · [Stocktake Import](./STOCKTAKE_FILE_IMPORT.md)

## Governance
Verify live branch/PR/CI/deployment before status updates. No merge without explicit owner approval; no deployment without explicit authorization. CI, visual acceptance, device acceptance, workflow acceptance and production promotion are distinct.
