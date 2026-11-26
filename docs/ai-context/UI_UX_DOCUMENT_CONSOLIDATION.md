> **Historical record — not current UI/UX authority.** The M0 audit workflow and its active document pack were retired on 2026-11-26 because they diverted work into repeated legacy audits instead of implementation. Current UI/UX direction, greenfield boundaries, build sequence and test policy are owned only by [EXPERIENCE_BUILD_STANDARD.md](./EXPERIENCE_BUILD_STANDARD.md). Do not restore M0 gates or treat the references below as current instructions.

# Historical UI/UX Documentation Consolidation Record

**Batch:** BATCH 02  
**Status:** Consolidation change record; not a UI implementation or owner acceptance.  
**Historical authority at the time of BATCH 02 (superseded 2026-11-26):** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md) + retired M0 specification, with [COMPONENT_AND_PATTERN_GOVERNANCE.md](./COMPONENT_AND_PATTERN_GOVERNANCE.md), [TECHNOLOGY_RADAR.md](./TECHNOLOGY_RADAR.md), [ROADMAP.md](./ROADMAP.md) and [DEPRECATION_REGISTER.md](./DEPRECATION_REGISTER.md) owning their specific concerns.

## 1. Why the consolidation was required
The previous UI/UX document family had multiple overlapping authorities: product architecture, design-system specification, reference interpretation, phased implementation plan, acceptance/migration plan and cross-surface prototype review. Several documents described themselves as historical at the top while continuing to claim governing authority in their body. `PROJECT_MAP.md` also pointed to superseded documents as the target design system, and the M0-A structural blueprint depended on an old reference-role contract.

This created conflicting instructions and unnecessary context loading. BATCH 02 removes the parallel authority layer while retaining source-audit records that contain unique implementation evidence.

## 2. Extraction and destination map
| Retired document | Reusable content retained in | Disposition |
|---|---|---|
| UI_UX_ARCHITECTURE.md | RETAILOS_PRODUCT_SKILL.md; UI_UX_M0_GOVERNING_SPEC.md; COMPONENT_AND_PATTERN_GOVERNANCE.md | Removed; proposed folder architecture was not treated as current source structure. |
| UI_UX_IMPLEMENTATION_PLAN.md | ROADMAP.md; UI_UX_M0_GOVERNING_SPEC.md | Removed; parallel phases and stale status were redundant. |
| UI_UX_DESIGN_SYSTEM_SPEC.md | UI_UX_M0_GOVERNING_SPEC.md; TECHNOLOGY_RADAR.md | Removed; exact token/font/material proposals remain unapproved unless separately validated. |
| UI_UX_ACCEPTANCE_MIGRATION_BLUEPRINT.md | RETAILOS_PRODUCT_SKILL.md; UI_UX_M0_GOVERNING_SPEC.md; TECHNOLOGY_RADAR.md | Removed; protected contracts, evidence levels, quality and release gates remain in canonical owners. |
| UI_UX_M0_GLOBAL_DIRECTION.md | UI_UX_M0_GOVERNING_SPEC.md; DECISIONS.md | Removed; owner-confirmed direction remains active in one place. |
| UI_UX_M0_ART_DIRECTION_RESET.md | DECISIONS.md; DEPRECATION_REGISTER.md | Removed as a conflicting active proposal; amber/sand “Warm Industrial Editorial” is not the approved RetailOS identity. |
| UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md | UI_UX_M0_GOVERNING_SPEC.md; RETAILOS_PRODUCT_SKILL.md | Removed; image/video/RetailOS authority split and motion correctness rules are consolidated. |
| UI_UX_M0_CROSS_SURFACE_PROTOTYPE_REVIEW.md | UI_UX_M0_GOVERNING_SPEC.md; retained M0-A source blueprint/execution evidence | Removed as a visual benchmark; its unaccepted prototype is not the target art direction. |
| UI_UX_M0_REFERENCE_REASSESSMENT.md | UI_UX_M0_GOVERNING_SPEC.md | Removed; reference interpretation and non-copy rules are consolidated. |

## 3. Historical/source evidence intentionally retained
The following documents are not active authorities but contain distinct source or execution evidence that should not be discarded in this batch:
- `UI_UX_SCREEN_MAP.md`: source-traced screen/workflow inventory and historical IA proposal.
- `UI_UX_SCREEN_BLUEPRINTS.md`: earlier detailed workflow and screen-state contracts; compare against current source and newer M0-A work.
- `UI_UX_COMPONENT_AUDIT.md`: consumer/coupling and CSS ownership findings; its own proof gaps remain explicit.
- `UI_UX_TECHNOLOGY_AUDIT.md`: dependency/browser capability research; not an adoption decision.
- `UI_UX_PHASE_00_AUDIT.md` and `UI_UX_PHASE_01_FOUNDATION.md`: historical audit/implementation records; revalidate every baseline before reuse.
- `UI_UX_M0_A_STRUCTURAL_BLUEPRINT.md` and `UI_UX_M0_A_EXECUTION_RECORD.md`: M0-A evidence; not owner-approved final UI or implementation acceptance.
- `UI_INTERACTION_RESPONSIVENESS_AUDIT.md`: prior input-to-feedback audit; recheck behavior in current source.
- `UI_COMPONENT_SPEC_TEMPLATE.md`: optional template only.
- `AI_CAPABILITY_SYSTEM.md` and `AI_CAPABILITY_EVALUATION.md`: retained because repository CORE/TASK skills are active and are not replaced by the private Product Studio plugin.
- `CHANGELOG_AI.md` and `SESSION_LOG.md`: append-only history; never current status.

## 4. Link and authority repair
- `INDEX.md` now separates canonical owners, domain contracts, AI capability system and retained evidence.
- `PROJECT_MAP.md` no longer identifies retired UI/UX proposal documents as the target design system.
- M0-A structural and execution records now point to the active M0 Governing Spec, not the retired reference-role contract.
- `DEPRECATION_REGISTER.md` records each retired proposal and the canonical replacement.
- `ROADMAP.md`, `IMPLEMENTATION_STATUS.md` and `AI_HANDOFF.md` now distinguish PR #165 merged to main from PR #166 merged only into the integration branch.

## 5. Safety and history
This batch changes documentation only. No application source, styles, dependencies, runtime contracts, tests, deployment workflows or production data are changed. Exact prior document revisions remain available through Git history; removal from the active tree does not erase their historical commits.

A deleted document must not be restored as a competing authority. If a specific historical finding is needed, inspect its original revision and move only validated current evidence into the correct canonical owner.
