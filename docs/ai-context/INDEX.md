# RetailOS documentation index

## Start here
1. AGENTS.md — repository operating, safety and lifecycle contract.
2. RETAILOS_PRODUCT_SKILL.md — governing product/design/engineering workflow.
3. IMPLEMENTATION_STATUS.md — concise verified implementation state and open gates.
4. AI_HANDOFF.md — current continuation point.
5. UI_UX_M0_GOVERNING_SPEC.md — sole active M0 direction and acceptance contract for UI/UX work.
6. Load only the relevant domain contract and governance register for the task.

## Canonical ownership map

| Concern | Single owning source | Boundary |
|---|---|---|
| Product-wide principles, workflow, protected boundaries | RETAILOS_PRODUCT_SKILL.md | Governs all RetailOS work; links to detailed owners rather than duplicating them. |
| Active UI/UX direction and M0 acceptance | UI_UX_M0_GOVERNING_SPEC.md | Sole active M0 specification. |
| Repository operations and release safety | Root AGENTS.md | Mandatory operating and release lifecycle rules. |
| Architecture invariants and project ADRs | ARCHITECTURE.md | Architecture ADR authority; subsystem contracts remain in their domain files. |
| Product/cross-domain decisions and rejected options | DECISIONS.md | Does not duplicate architecture ADRs or subsystem decisions. |
| Component, pattern and reuse lifecycle | COMPONENT_AND_PATTERN_GOVERNANCE.md | Shared vs feature-owned responsibilities and promotion/deprecation rules. |
| Technology evaluation and adoption records | TECHNOLOGY_RADAR.md | Evaluation register, not automatic approval. |
| Canonical terms and status vocabulary | TERMINOLOGY_GLOSSARY.md | Terms and meanings used across docs, PRs and conversations. |
| Deprecation/removal lifecycle | DEPRECATION_REGISTER.md | Evidence, consumers, migration, rollback and retirement. |
| Verified implementation state | IMPLEMENTATION_STATUS.md | Facts only; revalidate volatile GitHub state. |
| Current continuation point | AI_HANDOFF.md | One current handoff; not a parallel history log. |
| Durable product/repository facts | PROJECT_CONTEXT.md | Stable context, not volatile status or roadmap. |
| Phase sequencing and future gates | ROADMAP.md | One current roadmap; no parallel product-wide plan. |

## Domain contracts

| Domain | Owning source |
|---|---|
| Scanner runtime | SCANNER_ENGINE.md; decision/experiment history in SCANNER_HISTORY.md |
| PWA runtime/release | PWA_RUNTIME_RELEASE.md |
| Overlay lifecycle | UI_OVERLAY_ARCHITECTURE.md |
| Stocktake Import | STOCKTAKE_FILE_IMPORT.md |
| Performance/bundle | PERFORMANCE_BUNDLE_PWA.md |
| Export File | modules/EXPORT_FILE.md |

## Evidence and history

## Legacy documentation — do not load by default

The following files remain in the repository for traceability, but they are not active specifications. Their status and required treatment are recorded in DEPRECATION_REGISTER.md:

| Legacy family | Files | Current treatment |
|---|---|---|
| Superseded UI architecture/plan | UI_UX_ARCHITECTURE.md, UI_UX_IMPLEMENTATION_PLAN.md | Historical only; Product Skill, ARCHITECTURE and ROADMAP own current policy/sequencing. |
| Superseded design exploration | UI_UX_M0_GLOBAL_DIRECTION.md, UI_UX_M0_ART_DIRECTION_RESET.md, UI_UX_M0_CROSS_SURFACE_PROTOTYPE_REVIEW.md | Historical; M0 Governing Spec owns approved direction. M0_ART_DIRECTION_RESET contains rejected amber-led proposal. |
| Design system and technology research | UI_UX_DESIGN_SYSTEM_SPEC.md, UI_UX_TECHNOLOGY_AUDIT.md | Review/extract unique current evidence; not separate authorities. Technology Radar owns current evaluation. |
| Screen and component research | UI_UX_SCREEN_MAP.md, UI_UX_COMPONENT_AUDIT.md, UI_UX_SCREEN_BLUEPRINTS.md, UI_UX_ACCEPTANCE_MIGRATION_BLUEPRINT.md | Historical source evidence; revalidate against current source and active M0/domain contracts. |
| Phase evidence | UI_UX_PHASE_00_AUDIT.md, UI_UX_PHASE_01_FOUNDATION.md, UI_UX_M0_A_EXECUTION_RECORD.md, UI_UX_M0_A_STRUCTURAL_BLUEPRINT.md, UI_UX_M0_CROSS_SURFACE_PROTOTYPE_REVIEW.md | Read only for a specific implementation/acceptance trace; verify baseline SHA and status. |
| AI capability history | AI_CAPABILITY_SYSTEM.md, AI_CAPABILITY_EVALUATION.md | Prior AI skill architecture; relationship to repository skills and private Product Studio still requires BATCH 03 reconciliation. |
| Append-only logs | CHANGELOG_AI.md, SESSION_LOG.md | Chronology only; never use as current status. |

**Important:** a historical file may contain useful facts, but its old proposed direction, acceptance state, branch, SHA, dependency or instruction is not current merely because the file remains present. Do not use a historical file as a task entry point. If a fact is needed, verify it against current source and move the still-valid rule to its single canonical owner.

## Context rules
- Every task starts with Product Skill and IMPLEMENTATION_STATUS.
- UI/UX work also loads the M0 governing spec.
- Verify live GitHub branch, commit, PR, CI and deployment before volatile status claims or edits.
- Read owning domain contracts before protected changes.
- Check DECISIONS, relevant ADRs and DEPRECATION_REGISTER before proposing a previously explored or rejected approach.
- Use TECHNOLOGY_RADAR before adopting/replacing a major tool or dependency.
- Use COMPONENT_AND_PATTERN_GOVERNANCE before creating/promoting shared components.
- Memory and prior chat summaries are context, never proof of current source state.
- Keep one current status and one current handoff.
