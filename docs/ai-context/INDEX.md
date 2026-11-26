# RetailOS documentation index

## Start here
1. `AGENTS.md` — repository operating, safety and release rules.
2. [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md) — cross-project engineering standard.
3. [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) — verified current implementation state.
4. [AI_HANDOFF.md](./AI_HANDOFF.md) — one concise continuation point.
5. [EXPERIENCE_BUILD_STANDARD.md](./EXPERIENCE_BUILD_STANDARD.md) — sole UI/UX direction and greenfield implementation/test policy.
6. Load only the domain contract needed for the task.

## Canonical ownership
| Concern | Owner |
|---|---|
| Product and engineering workflow | RETAILOS_PRODUCT_SKILL.md |
| UI/UX direction, greenfield boundary, implementation sequence and test policy | EXPERIENCE_BUILD_STANDARD.md |
| Architecture and ADRs | ARCHITECTURE.md |
| Product/cross-domain decisions | DECISIONS.md |
| Shared component/pattern governance | COMPONENT_AND_PATTERN_GOVERNANCE.md |
| Technology evaluation | TECHNOLOGY_RADAR.md |
| Terminology | TERMINOLOGY_GLOSSARY.md |
| Deprecation/removal | DEPRECATION_REGISTER.md |
| Current state / continuation | IMPLEMENTATION_STATUS.md / AI_HANDOFF.md |
| Durable context / roadmap | PROJECT_CONTEXT.md / ROADMAP.md |
| Cross-feature acceptance | ACCEPTANCE_CHECKLIST.md |

## Domain contracts
| Domain | Owner |
|---|---|
| Scanner | SCANNER_ENGINE.md; SCANNER_HISTORY.md |
| PWA/release | PWA_RUNTIME_RELEASE.md |
| Overlay lifecycle | UI_OVERLAY_ARCHITECTURE.md |
| Stocktake Import | STOCKTAKE_FILE_IMPORT.md |
| Performance/bundle | PERFORMANCE_BUNDLE_PWA.md |
| Export File | modules/EXPORT_FILE.md |

## History
Historical audit reports, old UI/UX blueprints and session logs are not active authorities. Do not load them for a new UI task. Reopen historical material only to answer a specific regression or source-history question; verify all findings against current source.

`CHANGELOG_AI.md` and `SESSION_LOG.md` are append-only chronology, never current status.

## AI capability system
`AI_CAPABILITY_SYSTEM.md` and `AI_CAPABILITY_EVALUATION.md` describe repository CORE/TASK skills. Load only the shared CORE skill and the task skill needed for the current work.

## Context rules
- Start with this index, current status and the one relevant canonical standard.
- Verify live branch, commit, PR and CI before volatile claims or edits.
- Do not load the retired M0 audit pack or reconstruct its phase gates.
- Do not use chat history or memory as proof of repository state.
- Do not create duplicate authorities, status files or handoff files.
