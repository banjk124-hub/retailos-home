# Current handoff — RetailOS

**Governing standard:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)  
**Active M0 specification:** [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md).

## Current context
- Repository: `banjk124-hub/retailos-home`; default branch: `main`.
- Last verified main after PR #162: `3cd2d5bf7a3d1339a6c55baa1c16c74f6ebece2c`; verify live before acting.
- PR #160 Phase 00 audit, #161 Design Foundation and #162 responsive Login/browser baseline are merged; they did not deliver product-wide redesign or the target App Shell.
- Owner-confirmed direction: burgundy/dark-red brand, Vietnamese-first typography, authentic retail imagery; image guides art direction/composition; video guides motion/interaction; remaining art is adapted, not copied.
- M0-0 documentation consolidation is complete on the PR branch; Product Studio v0.1.3 skill/manifests were audited and aligned with the governing M0 direction. M0 remains open: M0-A representative screens, M0-B motion study, M0-C integration and M0-D technology/quality/owner acceptance remain open. No M1 authorization.
- PR #163 is the documentation Draft; verify its current head and CI before continuing. Earlier CI pass does not cover later commits automatically.
- PR #157 remains an open Draft for legacy Login CSS; reconcile against PR #162, do not merge by default.
- Scanner stabilization is closed and owner-confirmed operationally. See [SCANNER_ENGINE.md](./SCANNER_ENGINE.md) and [SCANNER_HISTORY.md](./SCANNER_HISTORY.md); do not reopen engine internals for UI work.
- PWA, overlays, Stocktake and Import retain domain contracts; load only what the task needs.

## Task start
1. Read Product Skill and IMPLEMENTATION_STATUS; for UI/UX also read M0 governing spec.
2. Verify branch, main SHA, open PRs, CI and deployment.
3. Inspect source callsites/tests and recover recorded decisions without asking the user to repeat them.
4. Work in bounded batches; inspect rendered UI before requesting device acceptance.
5. Update canonical status and report exact evidence.

No merge without explicit owner approval. No deployment without explicit authorization.