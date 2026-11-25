# Current handoff — RetailOS

**Governing standard:** RETAILOS_PRODUCT_SKILL.md  
**Active M0 specification:** UI_UX_M0_GOVERNING_SPEC.md

## Current context
- Repository: banjk124-hub/retailos-home; default branch: main.
- Last verified main: 4e654ffb519d8b124f3edbbbda4f65fe550052ef; verify live before acting.
- PR #160 Phase 00 audit, #161 Design Foundation and #162 responsive Login/browser baseline are merged; they did not deliver product-wide redesign or the target App Shell.
- Owner-confirmed direction: burgundy/dark-red brand, Vietnamese-first typography, authentic retail imagery; image guides art direction/composition; video guides motion/interaction; adapt rather than copy.
- M0-0 documentation consolidation is merged via PR #163. M0 remains open: M0-A representative screens, M0-B motion study, M0-C integration and M0-D technology/quality/owner acceptance remain open. No M1 authorization.
- M0-A Batch A0 source baseline and A1.1 blueprints for Login, proposed App Shell, Home and Module Library are recorded in this branch. These are source-grounded blueprints, not accepted final visual designs.
- PR #157 is closed and unmerged. Its legacy Login CSS is not accepted source behavior; do not merge or cherry-pick by default.
- Scanner stabilization is closed and owner-confirmed operationally. See SCANNER_ENGINE.md and SCANNER_HISTORY.md; do not reopen engine internals for UI work.
- PWA, overlays, Stocktake and Import retain domain contracts; load only what the task needs.

## M0-A next action — source-first
1. Complete source-grounded blueprints for Stocktake, Import and Settings/Update Center with real state matrices.
2. Build high-fidelity visual prototypes directly in the RetailOS source/runtime on an isolated branch or bounded prototype slice.
3. Run the application and inspect desktop/tablet/mobile browser renderings; compare burgundy palette, Vietnamese typography and licensed retail imagery against real content.
4. Record source-backed screenshots, behavior, accessibility, responsive and performance observations.
5. Obtain owner visual acceptance before production-facing UI changes.
6. Then implement one bounded screen slice with browser coverage; do not start global CSS cleanup.

Figma is not a dependency, blocker, prototype destination or acceptance requirement. Optional design tools may support exploration only; they never replace source-code prototypes and running-app verification.

## Task start
1. Read Product Skill and IMPLEMENTATION_STATUS; for UI/UX also read M0 governing spec.
2. Verify branch, main SHA, open PRs, CI and deployment.
3. Inspect source callsites/tests and recover recorded decisions without asking the user to repeat them.
4. Work in bounded batches; inspect rendered UI before requesting device acceptance.
5. Update canonical status and report exact evidence.

No merge without explicit owner approval. No deployment without explicit authorization.