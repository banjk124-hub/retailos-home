# M0-A Execution Record — Structural Visual Studies

**Status:** In progress — first editable design batch created and partially visually reviewed.
**Figma file:** https://www.figma.com/design/795VGcSqSCeA6qbzObsd8r
**Source baseline:** `main` at `2003ea24966755d0ad4e0298b34422b053267e77`
**Governing specification:** [UI_UX_M0_A_STRUCTURAL_BLUEPRINT.md](./UI_UX_M0_A_STRUCTURAL_BLUEPRINT.md)
**Reference authority:** [UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md](./UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md)

## 1. Delivered Figma frames

All frames are native, editable Figma layers, not flattened UI screenshots.

| Frame | Viewport | Figma node ID | Status |
|---|---|---:|---|
| Login | Desktop 1440×900 | `2:166` | Created; screenshot reviewed |
| Login | Mobile 390×844 | `2:200` | Created; screenshot reviewed |
| Home Overview | Desktop 1440×1000 | `2:103` | Created; screenshot reviewed; hero needs vertical-fit refinement |
| Home Overview | Mobile 390×844 | `2:60` | Created; not yet screenshot-reviewed |
| Module Library | Desktop 1440×1000 | `3:10` | Created; screenshot reviewed |
| Module Library | Mobile 390×844 | `3:155` | Created; screenshot reviewed |
| Stocktake | Desktop 1440×1000 | `3:203` | Created; screenshot reviewed |
| Stocktake | Mobile 390×844 | `3:299` | Created; not yet screenshot-reviewed |
| Stocktake Import | Desktop 1440×1000 | `3:252` | Created; screenshot reviewed |
| Stocktake Import | Mobile 390×844 | `3:333` | Created; not yet screenshot-reviewed |
| Settings / Update Center | Desktop 1440×900 | `3:370` | Created; not yet screenshot-reviewed |

Local variable foundation created in Figma: `RetailOS M0-A Foundations` with Light/Dark modes and initial brand, text, surface, border, radius and spacing tokens. These are prototype tokens, not approved production design tokens.

## 2. Source-grounded constraints applied

- Login uses existing employee sign-in language and form structure; authentication/session logic is not changed.
- Home uses actual registry-backed ready modules (Stocktake and Stocktake Import). Snapshot-dependent content is shown as unavailable/not loaded rather than invented KPI values.
- Module Library reflects the current 5 groups and 9 module IDs; seven entries are marked integrating and two ready, matching the current registry. No unavailable workflow is presented as launchable.
- Stocktake is represented as a feature-owned local workflow with session/zone/capture/review/export stages. Empty state is explicitly labelled; no fabricated stocktake counts.
- Stocktake Import is represented as staged file selection → analysis → review → output. No fake parser progress, row counts or output-ready state.
- Settings / Update Center remains a presentation of the existing PWA update controller; scanner settings remain feature-owned.
- Scanner Engine, camera lifecycle, decoder, recovery, Stocktake persistence, Import parser/output, authentication/session and PWA release controller were not modified.

## 3. Visual review findings

Reviewed screenshots:
- Login desktop/mobile.
- Home desktop.
- Module Library desktop/mobile.
- Stocktake desktop.
- Stocktake Import desktop.

Findings requiring refinement:
1. Login's brand lockup/mark is not visible in the current exported frame; inspect node parenting/reuse and correct before acceptance.
2. Home desktop hero's lower action is visually clipped by the current fixed panel height; refine height/content fit. The lower canvas also has excess unused vertical space; improve composition without inventing data.
3. Stocktake desktop has intentionally truthful empty-state content but the main workbench is visually too sparse; use source-backed session/zone/capture hierarchy and provide a representative populated-state frame only with clearly labelled sample data.
4. Import desktop empty file-picker state is clear; a separate post-parse/review state is still needed to prove row review, validation, conflict and output hierarchy without inventing results.
5. Module Library desktop and mobile hierarchy reads clearly; verify desktop group overflow and exact 5-group fit at 1440px (current fifth group touches/clips the right edge).
6. Tablet adaptations are still missing for Shell/Home and operational workspaces.
7. Mobile Stocktake, Import and Home, plus Settings desktop, still require screenshot review. Settings mobile and Login/Shell tablet studies are not yet created.

## 4. Tooling limitation

The Figma Starter plan's MCP call limit was reached after the frames were created. Additional screenshot review/refinement and remaining responsive frames are blocked until the Figma tool limit resets or the plan is upgraded. Do not claim the unreviewed frames passed visual QA.

## 5. M0-A exit checklist

- [x] Source-grounded editable Login desktop/mobile frames created.
- [x] Source-grounded editable Home desktop/mobile frames created.
- [x] Source-grounded editable Module Library desktop/mobile frames created.
- [x] Source-grounded editable Stocktake desktop/mobile frames created.
- [x] Source-grounded editable Stocktake Import desktop/mobile frames created.
- [x] Source-grounded editable Settings / Update Center desktop frame created.
- [x] Initial Figma Light/Dark token foundation created.
- [x] Selected desktop/mobile screenshots visually reviewed.
- [ ] Correct Login brand mark visibility.
- [ ] Correct Home hero clipping and composition density.
- [ ] Correct Module Library desktop right-edge clipping.
- [ ] Improve Stocktake populated/review composition with labelled sample data.
- [ ] Add Import post-parse/review/validation/output frame.
- [ ] Add Settings mobile frame.
- [ ] Add tablet adaptations for Shell/Home and operational workflows.
- [ ] Review all remaining created frames at full size.
- [ ] Confirm typography and contrast with Vietnamese strings and actual device/browser targets.
- [ ] Owner accepts product-wide structural direction.

**M0-A remains open.** This execution record is evidence of the first design batch, not a declaration of acceptance or permission to start source migration or M0-B.
