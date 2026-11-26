# Current handoff — RetailOS

**UI/UX authority:** [EXPERIENCE_BUILD_STANDARD.md](./EXPERIENCE_BUILD_STANDARD.md)  
**Engineering authority:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)

## Verified repository context
- Repository: `banjk124-hub/retailos-home`; default branch: `main`.
- PR #174: `feat/retailos-greenfield-experience`, Draft, unmerged.
- Product direction is a greenfield rebuild of the Experience Layer. Legacy UI is not the design foundation.
- Business Core remains protected: Auth/session, module registry/readiness, data/persistence/offline, Scanner Engine, Stocktake/Import workflows, overlay lifecycle and PWA release safety.
- Scanner stabilization is closed; do not reopen its internals for UI work.

## Work completed in this batch
- Replaced the M0 audit-and-gate direction with one greenfield Experience Build Standard.
- Updated repository entry points, Product Skill, roadmap, project context, status/handoff and deprecation records to prevent future sessions from loading or recreating the retired M0 audit workflow.
- Removed the diagnostic browser evidence harness and replaced it with concise Login, authenticated Home and reduced-motion journey checks.
- Scoped CI so Scanner regression tests run for Scanner changes; removed the duplicate PR-base build and routine diagnostic artifact uploads.
- No application Business Core contracts were intentionally changed.

## Immediate next action
1. Verify the final-head CI run after this handoff update.
2. Fix only actual failures in the compact test suite or preflight.
3. After CI is green, begin the new authenticated App Shell as the next visible source/runtime vertical slice. Do not return to M0 audits or legacy CSS cleanup.

No merge, deployment or production transfer is authorized.
