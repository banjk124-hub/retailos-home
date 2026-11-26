# Current handoff — RetailOS

**Governing standard:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)  
**Active UI/UX authority:** [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md)

## Verified baseline
- Repository: banjk124-hub/retailos-home; default branch main.
- Last verified main: `c46cfcc788e923d0f4c787ec8e15f2783a8e74af` (PR #167 BATCH 02 merge).
- PR #167 CI #1600 passed: preflight, bundle comparison, responsive Playwright browser smoke and evidence artifacts.
- Owner-confirmed direction: burgundy/dark-red identity, Vietnamese-first typography, authentic retail imagery; image = art direction/composition; video = motion/interaction; adapt rather than copy.
- Scanner stabilization is closed. Do not reopen engine internals for UI redesign.

## Current phase — M0-A
- Current branch: `feat/m0-a-operational-screen-blueprints`.
- Refreshed source audit and seven screen blueprints against current main.
- Operational blueprints trace Stocktake local session/zone/revision/export behavior, Stocktake Import parsing/conflict/dirty-edit/history/output, and Settings/Update Center consent/staging/activation/blocker states.
- These documents are design evidence, not owner-approved final visuals or source implementation.
- PR #164 is an older Draft based on pre-PR-167 main; do not merge it as-is.

## Next execution
1. Review the refreshed A0/A1.2 documents and close any remaining source-truth gaps.
2. Build high-fidelity prototypes directly in the RetailOS source/runtime; no Figma dependency.
3. Compare burgundy palette, Vietnamese type candidates and licensed retail imagery on real screens/content density.
4. Inspect running browser at 1440, 1280, 1024, 768, 390, 360 and short landscape; capture screenshots and behavioral evidence.
5. Get explicit owner visual acceptance before production-facing UI changes.
6. Then implement one bounded screen slice with browser coverage; no global CSS cleanup and no scanner-engine changes.

## Protected boundaries
Auth/session, module IDs/readiness, snapshot/cache/offline truth, Scanner Engine/session/camera, Stocktake persistence/revisions/export, Import parser precision/conflicts/dirty edits/persistence/output, overlay focus/body-scroll-lock, PWA consent/staging/integrity/activation/boot-health/rollback, Vite Pages base and lazy-loading.

No merge without explicit owner approval. No deployment without explicit authorization.
