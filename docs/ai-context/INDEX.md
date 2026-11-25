# RetailOS documentation index

## Start here
1. `AGENTS.md` — repository operating rules.
2. [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md) — single governing product/design/engineering standard.
3. [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) — concise verified state and open gates.
4. [AI_HANDOFF.md](./AI_HANDOFF.md) — current continuation point.
5. UI/UX work must also load [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md), the sole active M0 specification.

## Canonical sources
| Domain | Authority |
|---|---|
| Product direction, workflow, protected boundaries | [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md) |
| Active M0 direction, work packages and acceptance | [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md) |
| Verified implementation state | [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) |
| Current handoff | [AI_HANDOFF.md](./AI_HANDOFF.md) |
| Durable product/repository facts | [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) |
| Architecture decisions/invariants | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Scanner contract/history | [SCANNER_ENGINE.md](./SCANNER_ENGINE.md), [SCANNER_HISTORY.md](./SCANNER_HISTORY.md) |
| PWA runtime/release | [PWA_RUNTIME_RELEASE.md](./PWA_RUNTIME_RELEASE.md) |
| Overlay lifecycle | [UI_OVERLAY_ARCHITECTURE.md](./UI_OVERLAY_ARCHITECTURE.md) |
| Stocktake Import | [STOCKTAKE_FILE_IMPORT.md](./STOCKTAKE_FILE_IMPORT.md) |
| Performance/bundle | [PERFORMANCE_BUNDLE_PWA.md](./PERFORMANCE_BUNDLE_PWA.md) |

## UI/UX evidence and history
These retain audits, proposals, screen maps and execution evidence; they are not independent active specifications. Interpret through the M0 governing spec and current source:
- `UI_UX_ARCHITECTURE.md`, `UI_UX_IMPLEMENTATION_PLAN.md`, `UI_UX_ACCEPTANCE_MIGRATION_BLUEPRINT.md`
- `UI_UX_SCREEN_MAP.md`, `UI_UX_SCREEN_BLUEPRINTS.md`, `UI_UX_COMPONENT_AUDIT.md`, `UI_UX_TECHNOLOGY_AUDIT.md`
- `UI_UX_M0_GLOBAL_DIRECTION.md`, `UI_UX_M0_ART_DIRECTION_RESET.md`, `UI_UX_M0_REFERENCE_REASSESSMENT.md`, `UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md`
- `UI_UX_M0_A_STRUCTURAL_BLUEPRINT.md`, `UI_UX_M0_A_EXECUTION_RECORD.md`, `UI_UX_M0_CROSS_SURFACE_PROTOTYPE_REVIEW.md`
- `UI_UX_PHASE_00_AUDIT.md`, `UI_UX_PHASE_01_FOUNDATION.md`, `UI_UX_DESIGN_SYSTEM_SPEC.md`, `UI_COMPONENT_SPEC_TEMPLATE.md`
Do not bulk-load the archive. M0 specification identifies active work and exit criteria.

## Context rules
- Every task starts with Product Skill and implementation status.
- UI/UX work also loads the M0 governing spec.
- Verify live GitHub branch, commit, PR, CI and deployment before volatile status claims or edits.
- Read owning domain contracts before protected changes.
- Memory and prior chat summaries are not proof of current source state.
- Keep Scanner knowledge in SCANNER_ENGINE and SCANNER_HISTORY.
- Maintain one current handoff and one current status.