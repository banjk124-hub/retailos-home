# Current handoff — RetailOS

**Governing standard:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)  
**Active UI/UX authority:** [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md)

## Verified baseline
- Repository: banjk124-hub/retailos-home; default branch main.
- Main baseline for M0-A2: `a5ef3ffe176adfcfb3ccb7cf68941dd197de33d6`.
- PR #167 CI #1600 passed: preflight, bundle comparison, responsive Playwright browser smoke and evidence artifacts.
- Owner-confirmed direction: burgundy/dark-red identity, Vietnamese-first typography, authentic retail imagery; image = art direction/composition; video = motion/interaction; adapt rather than copy.
- Scanner stabilization is closed. Do not reopen engine internals for UI redesign.

## Current phase — M0-A
- A0 source baseline and seven screen blueprints are recorded.
- A1 source architecture audit is complete and recorded in `UI_UX_M0_A1_ARCHITECTURE_AUDIT.md`.
- A2 source/design-system audit is complete and recorded in `UI_UX_M0_A2_DESIGN_SYSTEM_CSS_AUDIT.md` on `audit/m0-a2-design-system-css`.
- A2 inventory: 24 CSS files / 365,141 source bytes; 13 root CSS imports; five ordered Home stylesheets; mobile-tuning.css is 87,269 bytes; no bundled retail photography or font file.
- Main risks: Home cascade generations, broad mobile overrides, duplicated token vocabularies, scattered blur/reduced-motion/power policies, unselected Vietnamese font and missing licensed retail image assets.
- A2 runtime exit remains open: computed-style/screenshot parity, selector/property proof, emitted CSS transfer, font specimen, image crop, runtime profiling and physical-device acceptance.
- No CSS retirement or broad redesign is approved by static source audit.
- Next: collect A2 runtime evidence before A3 motion and A4 performance decisions. No new dependency until a measured requirement exists.

## Protected boundaries
Auth/session, module IDs/readiness, snapshot/cache/offline truth, Scanner Engine/session/camera, Stocktake persistence/revisions/export, Import parser precision/conflicts/dirty edits/persistence/output, overlay focus/body-scroll-lock, PWA consent/staging/integrity/activation/boot-health/rollback, Vite Pages base and lazy-loading.

No merge without explicit owner approval. No deployment without explicit authorization.
