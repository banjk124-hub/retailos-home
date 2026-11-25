# Documentation index

This file is the navigation layer for repository documentation. Read one canonical source per topic; do not duplicate implementation history across files.

## Start here

1. `AGENTS.md` — operating rules and context policy.
2. `PROJECT_CONTEXT.md` — durable product facts and repository context.
3. `IMPLEMENTATION_STATUS.md` — verified implementation state and outstanding acceptance gates.
4. Select the canonical topic document below. Read `ARCHITECTURE.md` only for tasks touching architecture decisions or protected contracts.
5. Load only the relevant task skill. `prompts/START_HERE.md` contains session-start prompts.

## Canonical topic sources

| Topic | Canonical document |
|---|---|
| Product-wide UI/UX principles, system ownership, layout, motion, accessibility, performance and future-module extension | [UI_UX_ARCHITECTURE.md](./UI_UX_ARCHITECTURE.md) |
| Design tokens, typography, brand, color semantics, materials, component foundations, responsive and motion specification | [UI_UX_DESIGN_SYSTEM_SPEC.md](./UI_UX_DESIGN_SYSTEM_SPEC.md) |
| Existing component inventory, ownership, keep/refactor/replace/create decisions and migration risks | [UI_UX_COMPONENT_AUDIT.md](./UI_UX_COMPONENT_AUDIT.md) |
| Runtime dependencies, browser-native APIs, compatibility and install/no-install decisions | [UI_UX_TECHNOLOGY_AUDIT.md](./UI_UX_TECHNOLOGY_AUDIT.md) |
| Current screens, navigation, workflow states and target screen inventory | [UI_UX_SCREEN_MAP.md](./UI_UX_SCREEN_MAP.md) |
| Implementable screen blueprints for desktop, tablet, mobile, states, component ownership and acceptance | [UI_UX_SCREEN_BLUEPRINTS.md](./UI_UX_SCREEN_BLUEPRINTS.md) |
| M0 reference roles and motion-safe state contract (image=structure, video=motion) | [UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md](./UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md) |
| M0 reference reassessment: direct evidence from image/video and product-wide synthesis | [UI_UX_M0_REFERENCE_REASSESSMENT.md](./UI_UX_M0_REFERENCE_REASSESSMENT.md) |
| M0 reset: reference-derived Art Direction and craft standard | [UI_UX_M0_ART_DIRECTION_RESET.md](./UI_UX_M0_ART_DIRECTION_RESET.md) |
| Product-wide M0 visual/interaction direction and reference analysis (historical exploration) | [UI_UX_M0_GLOBAL_DIRECTION.md](./UI_UX_M0_GLOBAL_DIRECTION.md) |
| Cross-surface M0 prototype review, screen-level refinements and open validation | [UI_UX_M0_CROSS_SURFACE_PROTOTYPE_REVIEW.md](./UI_UX_M0_CROSS_SURFACE_PROTOTYPE_REVIEW.md) |
| Acceptance gates, migration slices, regression matrix, rollout and rollback | [UI_UX_ACCEPTANCE_MIGRATION_BLUEPRINT.md](./UI_UX_ACCEPTANCE_MIGRATION_BLUEPRINT.md) |
| UI/UX rebuild phases, priorities, documentation goals, acceptance and rollback | [UI_UX_IMPLEMENTATION_PLAN.md](./UI_UX_IMPLEMENTATION_PLAN.md) |
| Scanner current architecture, ownership, lifecycle, ROI, pipeline, decoder, limits, validation, tests and current status | [SCANNER_ENGINE.md](./SCANNER_ENGINE.md) |
| Scanner historical phases, investigations, decisions, incidents and cleanup history | [SCANNER_HISTORY.md](./SCANNER_HISTORY.md) |
| Scanner future priorities | [ROADMAP.md](./ROADMAP.md) |
| Cross-feature overlays, scroll locking and viewport behavior | [UI_OVERLAY_ARCHITECTURE.md](./UI_OVERLAY_ARCHITECTURE.md) |
| Physical desktop/Android/iOS UI acceptance | [UI_OVERLAY_ACCEPTANCE.md](./UI_OVERLAY_ACCEPTANCE.md) |
| Home performance reconciliation | [HOME_PERFORMANCE_RECONCILIATION.md](./HOME_PERFORMANCE_RECONCILIATION.md) |
| UI interaction responsiveness | [UI_INTERACTION_RESPONSIVENESS_AUDIT.md](./UI_INTERACTION_RESPONSIVENESS_AUDIT.md) |
| PWA runtime and release contract | [PWA_RUNTIME_RELEASE.md](./PWA_RUNTIME_RELEASE.md) |
| Bundle analysis, code splitting and performance evidence | [PERFORMANCE_BUNDLE_PWA.md](./PERFORMANCE_BUNDLE_PWA.md) |
| Stocktake import file contract | [STOCKTAKE_FILE_IMPORT.md](./STOCKTAKE_FILE_IMPORT.md) |
| Export utilities | [modules/EXPORT_FILE.md](./modules/EXPORT_FILE.md) |
| Login Phase 2 history | [docs/implementation/LOGIN_PHASE2_HISTORY.md](../implementation/LOGIN_PHASE2_HISTORY.md) |

## AI context loading policy

- Default session-start set: `AGENTS.md`, this index, `PROJECT_CONTEXT.md` and `IMPLEMENTATION_STATUS.md`.
- For UI/UX work, start with `UI_UX_ARCHITECTURE.md` and `UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md`. The image is the structural reference; the video is the motion/state reference; RetailOS is authoritative for brand, business semantics and data truth. Load the screen map, component audit and relevant feature contracts before designing a surface.
- For scanner work, load `SCANNER_ENGINE.md` first. Load `SCANNER_HISTORY.md` only for a specific historical question or incident.
- Do not load multiple old scanner phase documents as competing specifications.
- Verify volatile facts (branch, commit, PR, CI, deployment) against GitHub before updating current-state documents.
- Separate exploratory research from accepted architecture. Update canonical decisions only after validation.

## Document ownership

- `PROJECT_CONTEXT.md`: durable product constraints; no full PR changelog.
- `ARCHITECTURE.md`: accepted decisions and invariants; no repeated per-commit logs.
- `IMPLEMENTATION_STATUS.md`: current verified state and outstanding acceptance gates.
- `ROADMAP.md`: future work and exit criteria, not a duplicate architecture spec.
- `AI_HANDOFF.md`: one current handoff at top; old handoffs labelled historical.
- `SESSION_LOG.md`: chronological session breadcrumbs.
- `CHANGELOG_AI.md`: concise implementation evidence, not repeated session narratives.
- `UI_UX_ARCHITECTURE.md`: product-wide design and component contract.
- `UI_UX_DESIGN_SYSTEM_SPEC.md`: concrete design-system specification and source audit.
- `UI_UX_COMPONENT_AUDIT.md`: source-level component inventory, ownership, coupling and migration decisions.
- `UI_UX_TECHNOLOGY_AUDIT.md`: browser/dependency evidence and technology decisions.
- `UI_UX_SCREEN_MAP.md`: screen/workflow truth and target information architecture.
- `UI_UX_SCREEN_BLUEPRINTS.md`: implementable screen-level layout, state, responsive, accessibility, performance and acceptance contracts.
- `UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md`: governing separation of structural reference, motion reference and RetailOS data/architecture authority.
- `UI_UX_M0_REFERENCE_REASSESSMENT.md`: direct evidence analysis of both supplied sources.
- `UI_UX_M0_ART_DIRECTION_RESET.md`: historical exploration; not the active design authority.
- `UI_UX_M0_GLOBAL_DIRECTION.md`: earlier M0 exploration; retain as history, not the current visual quality benchmark.
- `UI_UX_M0_CROSS_SURFACE_PROTOTYPE_REVIEW.md`: cross-surface concept review, per-screen refinement requirements and M0 exit status.
- `UI_UX_ACCEPTANCE_MIGRATION_BLUEPRINT.md`: acceptance gates, migration sequence, test/device matrix, protected-boundary regression, rollout and rollback.
- `UI_UX_IMPLEMENTATION_PLAN.md`: implementation sequencing, acceptance and rollback.
- Scanner current truth: `SCANNER_ENGINE.md`; scanner history: `SCANNER_HISTORY.md`.
- PWA runtime/release truth: `PWA_RUNTIME_RELEASE.md`.
- Overlay lifecycle truth: `UI_OVERLAY_ARCHITECTURE.md`.
- UI input responsiveness evidence: `UI_INTERACTION_RESPONSIVENESS_AUDIT.md`.

Scanner documentation has exactly two canonical files: `SCANNER_ENGINE.md` for current implementation truth and `SCANNER_HISTORY.md` for investigations, decisions and historical evidence. Do not create standalone phase/audit documents for Scanner. Add new durable Scanner knowledge to one of these two files; keep unrelated feature documentation out of Scanner context.
