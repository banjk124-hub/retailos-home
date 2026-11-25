# Current handoff — RetailOS

**Governing standard:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)  
**Active M0 specification:** [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md).

## Current context
- Repository: `banjk124-hub/retailos-home`; default branch: `main`.
- Last verified main after PR #163: `4e654ffb519d8b124f3edbbbda4f65fe550052ef`; verify live before acting.
- PR #160 Phase 00 audit, #161 Design Foundation and #162 responsive Login/browser baseline are merged; they did not deliver product-wide redesign or the target App Shell.
- Owner-confirmed direction: burgundy/dark-red brand, Vietnamese-first typography, authentic retail imagery; image guides art direction/composition; video guides motion/interaction; remaining art is adapted, not copied.
- M0-0 documentation consolidation is merged to main via PR #163; Product Studio v0.1.3 skill/manifests were audited and aligned with the governing M0 direction. M0 remains open: M0-A representative screens, M0-B motion study, M0-C integration and M0-D technology/quality/owner acceptance remain open. No M1 authorization.
- M0-A Batch A0 source baseline and A1.1 blueprints for Login, App Shell, Home and Module Library are recorded on `feat/m0-a-source-audit-foundation`; see [source audit](./UI_UX_M0_A_SOURCE_BASELINE_AUDIT.md) and [screen blueprints](./UI_UX_M0_A1_SCREEN_BLUEPRINTS.md). Current source baseline is main `4e654ffb519d8b124f3edbbbda4f65fe550052ef`.
- PR #157 remains an open Draft for legacy Login CSS and is based on an older main baseline; reconcile its exact diff against PR #162 and current M0-A direction, do not merge by default.
- Scanner stabilization is closed and owner-confirmed operationally. See [SCANNER_ENGINE.md](./SCANNER_ENGINE.md) and [SCANNER_HISTORY.md](./SCANNER_HISTORY.md); do not reopen engine internals for UI work.
- PWA, overlays, Stocktake and Import retain domain contracts; load only what the task needs.

## M0-A next action
1. Complete A1.1 blueprints for Stocktake, Import and Settings/Update Center with source state matrices.
2. Resolve Figma editing access or select an editable prototype output surface; current connected Figma seat is View-only.
3. Build high-fidelity responsive visual prototypes and compare palette/font/image treatments.
4. Obtain owner visual acceptance before changing production-facing screen composition.
5. Then implement one bounded screen slice with browser coverage; do not start global CSS cleanup.

## Task start
1. Read Product Skill and IMPLEMENTATION_STATUS; for UI/UX also read M0 governing spec.
2. Verify branch, main SHA, open PRs, CI and deployment.
3. Inspect source callsites/tests and recover recorded decisions without asking the user to repeat them.
4. Work in bounded batches; inspect rendered UI before requesting device acceptance.
5. Update canonical status and report exact evidence.

No merge without explicit owner approval. No deployment without explicit authorization.