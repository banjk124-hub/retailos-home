# RetailOS Roadmap — 2026-11-26

All work follows [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md). UI/UX sequencing and acceptance are governed only by [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md).

## Completed documentation governance
- BATCH 00: PR #165 merged to main.
- BATCH 01: canonical governance standards integrated through the BATCH 00/02 dependency chain.
- BATCH 02: PR #167 merged to main at `c46cfcc788e923d0f4c787ec8e15f2783a8e74af`; nine overlapping UI/UX authority/proposal files retired, valid principles consolidated, historical evidence retained, navigation and ownership repaired.
- Product Studio parity (BATCH 03) remains deferred until repository standards receive owner review; repository CORE/TASK skills remain active.

## UI/UX — M0 before M1
1. **M0-0 — Direction and documentation baseline:** merged via PR #163.
2. **M0-A — Structural/visual direction:**
   - A0 source baseline and seven screen blueprints refreshed against current main.
   - A1 source architecture audit completed on `audit/m0-a1-source-architecture`: root/auth journey, Home responsibility map, registry/readiness, feature ownership, shared UI systems, overlays, persistence, lazy-loading/dependency boundaries and test gaps.
   - Next: A2 Design System & CSS Audit — selector ownership, token duplication, cascade/computed winners, Vietnamese typography candidates, imagery licensing/offline policy. No bulk CSS deletion.
   - Then A3 motion audit, A4 runtime/performance audit and A5 technology decision.
   - Only after these evidence gates: high-fidelity source/runtime prototypes and owner visual acceptance.
3. **M0-B — Motion/interaction:** derive observable patterns from the supplied video; prototype transitions, feedback, progressive readiness, interruption and reduced-motion behavior after M0-A direction is accepted.
4. **M0-C — Cross-surface integration:** apply accepted visual/temporal language to real workflows without identical layouts or business-contract changes.
5. **M0-D — Technology, quality and owner acceptance:** evidence-based technology choices, accessibility, browser/device/performance validation and explicit owner acceptance.

**M1 remains blocked until M0-D completes and the owner explicitly accepts M0.** No broad production migration or new dependency is authorized by documentation alone.

## Scanner — closed
Scanner stabilization and cleanup are complete. Current contract: [SCANNER_ENGINE.md](./SCANNER_ENGINE.md); history: [SCANNER_HISTORY.md](./SCANNER_HISTORY.md). Reopen only for reproducible defect, measured bottleneck, new requirement or explicit acceptance. UI redesign must not reopen engine internals.

## Other domain contracts
[PWA](./PWA_RUNTIME_RELEASE.md) · [Performance](./PERFORMANCE_BUNDLE_PWA.md) · [Overlay](./UI_OVERLAY_ARCHITECTURE.md) · [Stocktake Import](./STOCKTAKE_FILE_IMPORT.md)

## Governance
Verify live branch/PR/CI/deployment before status updates. No merge without explicit owner approval; no deployment without explicit authorization. CI, visual acceptance, device acceptance, workflow acceptance and production promotion are distinct.
