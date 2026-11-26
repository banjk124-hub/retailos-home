# RetailOS documentation index

## Start here
1. `AGENTS.md` — repository operating, safety and release lifecycle.
2. [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md) — governing product/design/engineering workflow.
3. [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) — verified current state and open gates.
4. [AI_HANDOFF.md](./AI_HANDOFF.md) — current continuation point.
5. [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md) — sole active UI/UX authority.
6. Load only task-specific domain contracts.

## Canonical ownership
| Concern | Owner |
|---|---|
| Product direction, workflow, protected boundaries | RETAILOS_PRODUCT_SKILL.md |
| Active UI/UX direction and M0 acceptance | UI_UX_M0_GOVERNING_SPEC.md |
| Repository architecture and architecture ADRs | ARCHITECTURE.md |
| Product/cross-domain decisions | DECISIONS.md |
| Shared components and patterns | COMPONENT_AND_PATTERN_GOVERNANCE.md |
| Technology evaluation | TECHNOLOGY_RADAR.md |
| Terminology/status vocabulary | TERMINOLOGY_GLOSSARY.md |
| Deprecation/removal | DEPRECATION_REGISTER.md |
| Current status / handoff | IMPLEMENTATION_STATUS.md / AI_HANDOFF.md |
| Stable project context / roadmap / navigation | PROJECT_CONTEXT.md / ROADMAP.md / PROJECT_MAP.md |
| Cross-feature acceptance | ACCEPTANCE_CHECKLIST.md |

## M0-A working documents
- [UI_UX_M0_A_SOURCE_BASELINE_AUDIT.md](./UI_UX_M0_A_SOURCE_BASELINE_AUDIT.md) — refreshed source audit against main after PR #167.
- [UI_UX_M0_A1_SCREEN_BLUEPRINTS.md](./UI_UX_M0_A1_SCREEN_BLUEPRINTS.md) — seven source-grounded screen blueprints: Login, proposed Shell, Home, Library, Stocktake, Import and Settings/Update Center.
- [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md) — direction and acceptance authority.

These are design/audit artifacts, not owner-approved final designs or permission for broad implementation. Next is source/runtime visual prototyping and owner review.

## Domain contracts
| Domain | Owner |
|---|---|
| Scanner | SCANNER_ENGINE.md; SCANNER_HISTORY.md |
| PWA/release | PWA_RUNTIME_RELEASE.md |
| Overlay lifecycle | UI_OVERLAY_ARCHITECTURE.md |
| Stocktake Import | STOCKTAKE_FILE_IMPORT.md |
| Performance/bundle | PERFORMANCE_BUNDLE_PWA.md |
| Export File | modules/EXPORT_FILE.md |

## Historical/source evidence
Open only when a task needs the specific audit/history; do not treat these as active UI/UX authorities:
- UI_UX_SCREEN_MAP.md; UI_UX_SCREEN_BLUEPRINTS.md
- UI_UX_COMPONENT_AUDIT.md; UI_UX_TECHNOLOGY_AUDIT.md
- UI_UX_PHASE_00_AUDIT.md; UI_UX_PHASE_01_FOUNDATION.md
- UI_UX_M0_A_STRUCTURAL_BLUEPRINT.md; UI_UX_M0_A_EXECUTION_RECORD.md
- UI_INTERACTION_RESPONSIVENESS_AUDIT.md; UI_COMPONENT_SPEC_TEMPLATE.md
- RETAILOS_GOVERNANCE_INVENTORY_AUDIT.md
- CHANGELOG_AI.md; SESSION_LOG.md (append-only chronology)

Superseded proposal documents removed in BATCH 02 are recorded in DEPRECATION_REGISTER.md and UI_UX_DOCUMENT_CONSOLIDATION.md. Their original revisions remain in Git history.

## AI capability system
`AI_CAPABILITY_SYSTEM.md` and `AI_CAPABILITY_EVALUATION.md` describe the repository CORE/TASK/DOMAIN skill architecture and evaluation. Repository skills remain active; the private Product Studio plugin is a companion, not a replacement.

## Context rules
- Start with Product Skill and current status; for UI/UX also load the M0 Governing Spec and M0-A documents.
- Verify live branch, commit, PR, CI and deployment before volatile claims or edits.
- Read owning domain contracts before protected changes.
- Check decisions, architecture, deprecation and technology records before major changes.
- Preserve one current status and one current handoff.
