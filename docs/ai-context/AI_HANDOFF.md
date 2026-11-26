# Current handoff — RetailOS

**UI/UX authority:** [EXPERIENCE_BUILD_STANDARD.md](./EXPERIENCE_BUILD_STANDARD.md)  
**Engineering authority:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)

## Verified repository context
- Repository: `banjk124-hub/retailos-home`; default branch: `main`.
- PR #174: `feat/retailos-greenfield-experience`, Draft, unmerged.
- Product direction is a greenfield rebuild of the Experience Layer. Legacy UI is not the design foundation.
- Business Core remains protected: Auth/session, module registry/readiness, data/persistence/offline, Scanner Engine, Stocktake/Import workflows, overlay lifecycle and PWA release safety.
- Scanner stabilization is closed; do not reopen its internals for UI work.

## Work completed
- Established one canonical Experience Build Standard and updated repository entry points, Product Skill, AGENTS, project context, Project Map, roadmap, status/handoff and deprecation records.
- Removed the retired M0 audit authority and its source-audit document pack from the active tree/navigation.
- Removed the diagnostic browser evidence harness and replaced it with five compact user-journey checks.
- Scoped domain regression tests to relevant changed paths; removed duplicate PR-base builds and routine diagnostic artifacts.
- Login remains the only rebuilt presentation slice. Authenticated Shell/Home and remaining workspaces are still to be built.

## Verification
- CI #1660 passed on `4e6b11aa3053193c959eefe408bf9d18a7ae67a6`: 8/47 selected preflight checks passed, Pages build/bundle checks passed, and Playwright 5/5 passed.
- Documentation synchronization followed that code head; no application source or test behavior changed afterward. Verify the latest documentation-only head's CI status before continuing.
- Physical-device and owner visual acceptance remain outstanding.

## Immediate next action
Begin the new authenticated App Shell as a visible source/runtime vertical slice. Keep existing session/business orchestration and render real module registry/readiness data. Do not return to M0 audits or legacy CSS cleanup.

No merge, deployment or production transfer is authorized.
