# RetailOS documentation index

## Start here
1. `AGENTS.md` — agent operating contract, safety and evidence rules.
2. `RETAILOS_PRODUCT_SKILL.md` — product principles, experience discovery, creative exploration and delivery workflow.
3. `PROJECT_CONTEXT.md` — durable product/repository facts and current owner direction.
4. `IMPLEMENTATION_STATUS.md` — verified implementation state and open gates.
5. `AI_HANDOFF.md` — current continuation point.
6. Load only task-specific domain contracts and relevant decision history.

## Canonical ownership
| Concern | Owner |
|---|---|
| Product principles and experience/creative workflow | RETAILOS_PRODUCT_SKILL.md |
| Cross-platform capability/presentation policy | DECISIONS.md (PD-007/PD-008), ARCHITECTURE.md (ADR-030), PLATFORM_CAPABILITY_MATRIX.md |
| Shell & presentation ownership | SH-01_SHELL_PRESENTATION_OWNERSHIP.md |
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
- **SH-01 and camera capability enforcement — merged:** SH-01 PR #193 merged at `58d478cf6e8d6e5277c7ca2b60b274731670dfd0`; follow-up PR #195 closed the Stocktake Mobile-only camera policy gap at `a64a49fe516b03cc7c8641a6e23c54a3391a6887`. Exact-head CI #1948 and #1968 passed on their respective PR heads. Physical-device acceptance remains PW-01; CSS ownership migration remains CSS-01. See [SH-01_SHELL_PRESENTATION_OWNERSHIP.md](./SH-01_SHELL_PRESENTATION_OWNERSHIP.md) and [PLATFORM_CAPABILITY_MATRIX.md](./PLATFORM_CAPABILITY_MATRIX.md).
- **UI-04 feature presentation migration — complete:** UI-04A–F are merged. UI-04F closure is PR #191; exact-head CI #1909 passed with 9 browser tests. See [UI_UX_PHASE_04_FEATURE_PRESENTATION.md](./UI_UX_PHASE_04_FEATURE_PRESENTATION.md).
- **AUDIT-03 CSS & Design Foundation — static audit complete:** PR #185 is merged; AUDIT-03A production CSS delivery baseline remains proposed. No source cleanup is implied.
- **PW-01 physical PWA acceptance — pending:** validate installed mode, safe areas, keyboard, orientation, permissions and lifecycle on target physical devices.
- **CSS-01 CSS ownership migration — pending:** map shared foundation/platform/feature ownership and measure cascade before moving rules. No broad deletion is implied.

## Experience governance
There is no active global visual-style specification. Previous M0 art-direction requirements are superseded by owner direction recorded in DECISIONS.md and the current Product Skill. The former UI_UX_M0_GOVERNING_SPEC.md is retained as a historical record with a supersession notice; it is not an active constraint or acceptance authority.

For a new experience:
- Discover the user, task, environment, constraints and desired outcome.
- Explore materially different creative directions before choosing.
- Prototype the proposed experience in the actual source/runtime when implementation feasibility or interaction matters.
- Validate technical constraints and obtain explicit owner approval before substantial creative implementation.
- Verify the result in browser/device contexts appropriate to the feature.

Existing source audits and blueprints remain evidence about the implementation at their recorded baseline, not prescribed target designs. Do not treat an audit's suggested layout, token, component or phase as an owner-approved creative decision.

## Historical/source evidence
Historical audits, retired proposals, phase records and session logs preserve evidence only. Open them when a task needs the specific trace; do not treat them as current instructions. See DEPRECATION_REGISTER.md for retired documents and UI_UX_DOCUMENT_CONSOLIDATION.md for earlier consolidation history.

## Context rules
- Verify live branch, commit, PR, CI and deployment before volatile claims or edits.
- Read owning domain contracts before protected changes.
- Check DECISIONS, ARCHITECTURE, DEPRECATION and TECHNOLOGY_RADAR before material changes.
- Load only the context needed for the current task; do not bulk-load the archive.
- Keep one current status and one current handoff.
