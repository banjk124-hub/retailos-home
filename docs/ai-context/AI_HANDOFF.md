# Current handoff — RetailOS

**Product/experience workflow:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)  
**Decision register:** [DECISIONS.md](./DECISIONS.md)  
**Verified state:** [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)

## Current owner direction
The former global visual direction has been withdrawn. No aesthetic is currently selected. Do not default to minimal, Liquid Glass, burgundy/dark-red, retail photography, card-based composition or any other former concept. Treat palette, typography, imagery, layout, density, material, icons and motion as creative decisions to explore and obtain explicit owner approval for the relevant scope.

## Work completed in this branch
- Began documentation/AI-governance reset on `docs/experience-governance-reset`, based on main commit `16bcc7510db260dbfa335d44b6c5a578ef5650f9`.
- Scope is documentation and AI instructions only; application source is not part of this reset.
- Superseded the former M0 visual authority while preserving it as historical evidence.
- Replaced the AI experience workflow with discovery, exploration, prototype, feasibility, owner approval, implementation and QA.

## Technical boundaries
Preserve auth/session, module IDs/readiness, snapshot/cache/offline truth, Scanner Engine/session/camera, Stocktake persistence/revisions/export, Import parsing/precision/conflicts/dirty edits/persistence/output, overlay focus/body-scroll-lock, PWA consent/staging/integrity/activation/boot-health/rollback, Vite Pages base and lazy-loading. Scanner stabilization is closed; do not reopen engine internals for UI redesign.

## Continuation
Review the branch diff and verify there are no remaining active instructions that reinstate the withdrawn visual direction. Then run documentation consistency checks and update the handoff with exact commit and results. Do not merge or deploy without explicit owner authorization.
