# M0-A Execution Record — Repository-first Structural Implementation

**Status:** Figma exploration is archived as historical evidence. It is not a required deliverable, prototype host, or acceptance gate. Active M0-A validation occurs in the RetailOS source tree and running application.
**Historical Figma file:** https://www.figma.com/design/795VGcSqSCeA6qbzObsd8r
**Source baseline:** `main` at `2003ea24966755d0ad4e0298b34422b053267e77`
**Governing specification:** [UI_UX_M0_A_STRUCTURAL_BLUEPRINT.md](./UI_UX_M0_A_STRUCTURAL_BLUEPRINT.md)
**Reference authority:** [UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md](./UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md)

## 1. Historical exploration

The first Figma study created editable frames for Login, Home, Module Library, Stocktake, Stocktake Import and Settings/Update Center. Those frames remain optional visual references only. They are not production source, do not establish implementation truth and will not be maintained as a second design system. The Figma Starter MCP limit encountered during exploration is no longer a project blocker because Figma is outside the delivery workflow.

## 2. Findings retained as source-review checklist

These observations are questions to validate against the actual React application, not accepted implementation defects:

1. Login: verify brand lockup visibility, credential hierarchy, keyboard-safe layout and desktop/mobile composition.
2. Home: verify hero/content fit, unused canvas, source-backed priority hierarchy and no fabricated metrics.
3. Module Library: verify all five groups and nine registry entries fit without clipping; preserve integrating/ready semantics.
4. Stocktake: verify truthful empty state, workbench hierarchy and real populated-state behavior without confusing test fixtures with production data.
5. Stocktake Import: verify empty picker, parsed review, validation/conflict and output states against the real parser/session.
6. Settings/Update Center: preserve the existing PWA update controller as the sole state authority.
7. Tablet: verify portrait/landscape adaptations rather than scaling desktop or mobile unchanged.
8. Vietnamese typography, contrast, focus, zoom, reduced-motion and low-end-device behavior require browser/device evidence.

## 3. Source-first M0-A acceptance

A screen is accepted only when the implementation PR evidences:

- Source component and feature ownership identified before edits.
- Desktop, tablet and mobile layouts rendered from production React/CSS.
- Labels, workflow readiness and data states grounded in current source contracts.
- Empty/loading/error/populated states are real states or clearly labelled test fixtures.
- Interactive controls have working actions and immediate acknowledgement.
- Keyboard, focus, text scaling, safe-area and reduced-motion behavior checked.
- No duplicate component system, design sandbox, runtime dependency or parallel token layer introduced without demonstrated need.
- Relevant automated tests, TypeScript and production/Pages builds pass.
- Auth/session, module registry, snapshot/cache, Scanner Engine, Stocktake/Import persistence and PWA release contracts remain intact.
- Physical device checks reported separately from CI and source inspection.

## 4. M0-A status

- [x] Source-grounded product-wide structural blueprint exists.
- [x] Existing application source and feature ownership audited for the initial slice.
- [x] Figma removed from the required workflow.
- [ ] Source-first representative screens implemented and reviewed.
- [ ] Desktop/tablet/mobile browser validation recorded.
- [ ] Typography and contrast verified with Vietnamese operational strings.
- [ ] Low/mid-range performance evidence recorded.
- [ ] Owner accepts product-wide structural direction.

**M0-A remains in progress.** Historical Figma frames are not evidence of source implementation or device acceptance. Continue from the repository and record exact source commits, tests and limitations.
