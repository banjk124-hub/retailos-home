# RetailOS documentation index

## Start here — required

1. `AGENTS.md` — repository operating rules.
2. [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md) — **single governing product/design/engineering standard** for all RetailOS tasks and future features.
3. [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) — concise verified implementation state and open acceptance gates.
4. Load only the relevant domain contract and source/tests for the task.

## Canonical sources

| Domain | Current authority |
|---|---|
| Product direction, design language, technology selection, workflow, protected boundaries, acceptance and documentation governance | [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md) |
| Current verified state and outstanding gates | [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) |
| Current task handoff | [AI_HANDOFF.md](./AI_HANDOFF.md) |
| Durable product/repository facts | [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) |
| Accepted architecture decisions and invariants | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Scanner current implementation contract | [SCANNER_ENGINE.md](./SCANNER_ENGINE.md) |
| Scanner history and retired investigations | [SCANNER_HISTORY.md](./SCANNER_HISTORY.md) |
| PWA runtime/release contract | [PWA_RUNTIME_RELEASE.md](./PWA_RUNTIME_RELEASE.md) |
| Overlay/body-scroll-lock lifecycle | [UI_OVERLAY_ARCHITECTURE.md](./UI_OVERLAY_ARCHITECTURE.md) |
| Stocktake Import file and persistence contract | [STOCKTAKE_FILE_IMPORT.md](./STOCKTAKE_FILE_IMPORT.md) |
| Bundle and performance evidence | [PERFORMANCE_BUNDLE_PWA.md](./PERFORMANCE_BUNDLE_PWA.md) |
| Export file workflow | [modules/EXPORT_FILE.md](./modules/EXPORT_FILE.md) |

## UI/UX historical records

The following documents retain source audits, screenshots, proposals and implementation evidence. They are **reference/history only**, not independent authorities or competing instructions. When their content conflicts with the Product Skill, current source, or an explicitly accepted decision, do not follow the stale statement; reconcile it into the canonical standard first.

- `UI_UX_ARCHITECTURE.md`
- `UI_UX_IMPLEMENTATION_PLAN.md`
- `UI_UX_ACCEPTANCE_MIGRATION_BLUEPRINT.md`
- `UI_UX_SCREEN_MAP.md`
- `UI_UX_SCREEN_BLUEPRINTS.md`
- `UI_UX_COMPONENT_AUDIT.md`
- `UI_UX_TECHNOLOGY_AUDIT.md`
- `UI_UX_M0_*.md`
- `UI_UX_PHASE_00_AUDIT.md`
- `UI_UX_PHASE_01_FOUNDATION.md`
- `UI_UX_DESIGN_SYSTEM_SPEC.md`
- `UI_COMPONENT_SPEC_TEMPLATE.md`

Do not load this entire historical set for ordinary tasks. Read only the exact record needed to recover evidence or a decision.

## Context-loading rules

- Every RetailOS task starts with the Product Skill and current implementation status.
- Then inspect current GitHub branch/commit/PR/CI and source/tests relevant to the requested task.
- Read the owning domain contract before changing protected functionality.
- Do not use previous chat summaries or old document status as proof of current source state.
- Scanner knowledge stays consolidated in `SCANNER_ENGINE.md` and `SCANNER_HISTORY.md`; do not recreate phase/audit files.
- Keep one current handoff and one current status. Put implementation archaeology in the owning history/evidence document.
