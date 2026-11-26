# RetailOS documentation index

## Start here
1. `AGENTS.md` — repository operating, safety and release lifecycle.
2. [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md) — governing product/design/engineering workflow.
3. [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) — verified current state and open gates.
4. [AI_HANDOFF.md](./AI_HANDOFF.md) — one current continuation point.
5. [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md) — sole active UI/UX M0 authority.
6. Load only the task-specific domain contract and relevant governance register.

## Canonical ownership map
| Concern | Single owner | Boundary |
|---|---|---|
| Product direction, working method, protected boundaries | RETAILOS_PRODUCT_SKILL.md | Product-wide rules; link to detailed owners. |
| Active UI/UX direction and M0 acceptance | UI_UX_M0_GOVERNING_SPEC.md | Sole active UI/UX authority. |
| Repository architecture and architecture ADRs | ARCHITECTURE.md | Architecture invariants and project ADRs. |
| Product/cross-domain decisions and rejected options | DECISIONS.md | Does not duplicate architecture ADRs or subsystem decisions. |
| Shared components, patterns and reuse lifecycle | COMPONENT_AND_PATTERN_GOVERNANCE.md | Reuse by semantic/behavioral equivalence. |
| Technology evaluation and adoption evidence | TECHNOLOGY_RADAR.md | Evaluation record, not automatic approval. |
| Canonical terminology and status vocabulary | TERMINOLOGY_GLOSSARY.md | Shared definitions and status language. |
| Deprecation, migration and removal | DEPRECATION_REGISTER.md | Evidence and retirement lifecycle. |
| Verified implementation state | IMPLEMENTATION_STATUS.md | Current facts only; revalidate volatile state. |
| Current continuation | AI_HANDOFF.md | No parallel handoff/history. |
| Durable product/repository facts | PROJECT_CONTEXT.md | Stable context, not volatile status. |
| Delivery sequence and gates | ROADMAP.md | One current roadmap. |
| Source navigation | PROJECT_MAP.md | Directory map only; source and contracts remain authoritative. |

## Domain contracts
| Domain | Owner |
|---|---|
| Scanner runtime and history | SCANNER_ENGINE.md; SCANNER_HISTORY.md |
| PWA runtime/release | PWA_RUNTIME_RELEASE.md |
| Overlay lifecycle | UI_OVERLAY_ARCHITECTURE.md |
| Stocktake Import | STOCKTAKE_FILE_IMPORT.md |
| Performance/bundle | PERFORMANCE_BUNDLE_PWA.md |
| Export File | modules/EXPORT_FILE.md |

## AI capability system
- `AI_CAPABILITY_SYSTEM.md` explains CORE/TASK/DOMAIN skill architecture and progressive disclosure.
- `AI_CAPABILITY_EVALUATION.md` defines scenario-based quality checks; it does not claim scenarios have passed.
- Repository skills under `.github/skills/` remain executable task workflows. The private Product Studio plugin is a companion, not a replacement for repository skills or source contracts.

## UI/UX evidence retained
These files remain historical/source evidence, not parallel specifications. Open only when a task needs their specific audit or implementation history:
- `UI_UX_SCREEN_MAP.md` — source-traced screen/workflow inventory and historical IA proposal.
- `UI_UX_SCREEN_BLUEPRINTS.md` — earlier screen-level workflow/layout contracts; reconcile against current M0 and source.
- `UI_UX_COMPONENT_AUDIT.md` — component ownership, consumer and CSS audit evidence.
- `UI_UX_TECHNOLOGY_AUDIT.md` — technology/browser capability research; not an adoption decision.
- `UI_UX_PHASE_00_AUDIT.md`, `UI_UX_PHASE_01_FOUNDATION.md` — implementation/audit records; reverify every baseline against current source.
- `UI_UX_M0_A_STRUCTURAL_BLUEPRINT.md`, `UI_UX_M0_A_EXECUTION_RECORD.md` — historical M0-A structural and execution evidence; active direction is the M0 Governing Spec.
- `UI_INTERACTION_RESPONSIVENESS_AUDIT.md` — prior input-to-feedback and interaction audit; verify current behavior before reuse.
- `UI_COMPONENT_SPEC_TEMPLATE.md` — optional template, not a mandatory shared-component catalogue.
- `RETAILOS_GOVERNANCE_INVENTORY_AUDIT.md` — dated inventory/source-lock record; its branch/PR observations are historical.

Superseded UI/UX proposal documents consolidated in BATCH 02 were removed from the active documentation directory. Their rationale and extraction destinations are recorded in [UI_UX_DOCUMENT_CONSOLIDATION.md](./UI_UX_DOCUMENT_CONSOLIDATION.md); original revisions remain in Git history. Do not restore them as active specifications.

## General history
- `CHANGELOG_AI.md` and `SESSION_LOG.md` are append-only chronology, not current status.
- Historical records are not loaded by default. Never infer current implementation or PR state from them.

## Context rules
- Start with Product Skill and IMPLEMENTATION_STATUS.
- UI/UX work also loads the M0 Governing Spec.
- Verify live branch, commit, PR, CI and deployment before volatile claims or edits.
- Read the owning domain contract before protected changes.
- Check DECISIONS, ARCHITECTURE, DEPRECATION_REGISTER and TECHNOLOGY_RADAR before proposing a previously explored option or major technology change.
- Use COMPONENT_AND_PATTERN_GOVERNANCE before promoting shared components.
- Memory, old logs and prior chat summaries are context, never proof of current source state.
- Maintain one current status and one current handoff.
