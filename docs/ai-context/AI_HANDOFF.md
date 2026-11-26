# Current handoff — RetailOS

**Governing standard:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)  
**Active UI/UX authority:** [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md)

## Verified baseline
- Repository: banjk124-hub/retailos-home; default branch main.
- Main baseline used for M0-A1: `c46cfcc788e923d0f4c787ec8e15f2783a8e74af`.
- PR #167 CI #1600 passed: preflight, bundle comparison, responsive Playwright browser smoke and evidence artifacts.
- Owner-confirmed direction: burgundy/dark-red identity, Vietnamese-first typography, authentic retail imagery; image = art direction/composition; video = motion/interaction; adapt rather than copy.
- Scanner stabilization is closed. Do not reopen engine internals for UI redesign.

## Current phase — M0-A
- A0 source baseline and seven screen blueprints are recorded.
- A1 source architecture audit is complete on `audit/m0-a1-source-architecture`; document: `docs/ai-context/UI_UX_M0_A1_ARCHITECTURE_AUDIT.md`.
- A1 maps root/auth lifecycle, Home state clusters, navigation/registry boundaries, Stocktake/Import/Settings ownership, shared UI systems, overlays, persistence, code splitting and test coverage.
- A1 is source-level only. Computed CSS, full transitive consumers, browser runtime profiling and physical-device behavior remain open and are explicitly assigned to later gates.
- Next execution: M0-A2 Design System & CSS Audit. Do not begin a global CSS rewrite or add dependencies before evidence.

## Protected boundaries
Auth/session, module IDs/readiness, snapshot/cache/offline truth, Scanner Engine/session/camera, Stocktake persistence/revisions/export, Import parser precision/conflicts/dirty edits/persistence/output, overlay focus/body-scroll-lock, PWA consent/staging/integrity/activation/boot-health/rollback, Vite Pages base and lazy-loading.

No merge without explicit owner approval. No deployment without explicit authorization.
