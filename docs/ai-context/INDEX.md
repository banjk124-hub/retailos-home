# RetailOS documentation index

## Start here
1. AGENTS.md — agent operating contract, safety and evidence rules.
2. RETAILOS_PRODUCT_SKILL.md — product principles, experience discovery, creative exploration and delivery workflow.
3. PROJECT_CONTEXT.md — durable product/repository facts and current owner direction.
4. IMPLEMENTATION_STATUS.md — verified implementation state and open gates.
5. AI_HANDOFF.md — current continuation point.
6. Load only task-specific domain contracts and relevant decision history.

## Canonical ownership
| Concern | Owner |
|---|---|
| Product principles and experience/creative workflow | RETAILOS_PRODUCT_SKILL.md |
| Cross-platform capability/presentation policy | DECISIONS.md (PD-007) / ARCHITECTURE.md (ADR-030) |
| Architecture ADRs and technical invariants | ARCHITECTURE.md |
| Product/cross-domain decisions and superseded direction | DECISIONS.md |
| Shared components, patterns and feature ownership | COMPONENT_AND_PATTERN_GOVERNANCE.md |
| Technology evaluation | TECHNOLOGY_RADAR.md |
| Terminology/status vocabulary | TERMINOLOGY_GLOSSARY.md |
| Deprecation/removal lifecycle | DEPRECATION_REGISTER.md |
| Current verified state / continuation | IMPLEMENTATION_STATUS.md / AI_HANDOFF.md |
| Durable facts / future work / navigation | PROJECT_CONTEXT.md / ROADMAP.md / PROJECT_MAP.md |
| Cross-feature acceptance | ACCEPTANCE_CHECKLIST.md |
| PWA release lifecycle | PWA_RUNTIME_RELEASE.md |
| Scanner contracts/history | SCANNER_ENGINE.md / SCANNER_HISTORY.md |
| Overlay lifecycle | UI_OVERLAY_ARCHITECTURE.md |
| Stocktake Import | STOCKTAKE_FILE_IMPORT.md |
| Performance/bundle | PERFORMANCE_BUNDLE_PWA.md |

## Current technical workstreams
- **UI-03 CSS consolidation — complete:** [UI_UX_PHASE_03_CSS_CONSOLIDATION.md](./UI_UX_PHASE_03_CSS_CONSOLIDATION.md) records the merged implementation and exact-head validation evidence.
- **UI-04 feature presentation migration — active:** PR #181 is merged; UI-04A/B/C/D are complete and merged (UI-04D in PR #189); UI-04E Stocktake Import is implemented in open/Draft PR #190 pending final CI/browser validation; UI-04F remains open. [UI_UX_PHASE_04_FEATURE_PRESENTATION.md](./UI_UX_PHASE_04_FEATURE_PRESENTATION.md) is the canonical phase record.
- **AUDIT-03 CSS & Design Foundation — static audit complete:** PR #185 is merged; AUDIT-03A production CSS delivery baseline is the next proposed step. No source cleanup is implied.

## Experience governance
There is no active global visual-style specification. Previous M0 art-direction requirements are superseded by owner direction recorded in DECISIONS.md and the current Product Skill. The former UI_UX_M0_GOVERNING_SPEC.md is retained as a historical record with a supersession notice; it is not an active constraint or acceptance authority.

For a new experience:
- Discover the user, task, environment, constraints and desired outcome.
- Explore materially different creative directions before choosing.
- Prototype the proposed experience in the actual source/runtime when implementation feasibility or interaction matters.
- Validate technical constraints and obtain explicit owner approval before substantial creative implementation.
- Verify the result in browser/device contexts appropriate to the feature.

Existing source audits and blueprints remain evidence about the current implementation, not a prescribed target design. Do not treat an audit's suggested layout, token, component or phase as an owner-approved creative decision.

## Historical/source evidence
Historical audits, retired proposals, phase records and session logs preserve evidence only. Open them when a task needs the specific trace; do not treat them as current instructions. See DEPRECATION_REGISTER.md for retired documents and UI_UX_DOCUMENT_CONSOLIDATION.md for earlier consolidation history.

## Context rules
- Verify live branch, commit, PR, CI and deployment before volatile claims or edits.
- Read owning domain contracts before protected changes.
- Check DECISIONS, ARCHITECTURE, DEPRECATION and TECHNOLOGY_RADAR before material changes.
- Load only the context needed for the current task; do not bulk-load the archive.
- Keep one current status and one current handoff.
