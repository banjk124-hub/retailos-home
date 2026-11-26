# RetailOS Deprecation & Removal Register

**Authority:** Canonical register for retiring code, dependencies, documents, patterns and experiments.  
**Status:** Governance standard; entries are evidence records, not blanket deletion permission.

## 1. Governing rule

Remove what is incorrect, redundant, unsafe or no longer needed—but never delete based only on file size, age, visual similarity or intuition. First prove ownership, consumers, behavior and replacement.

Historical evidence is preserved unless it contains secrets, personal data or legally/operationally unsafe material requiring controlled removal.

## 2. Lifecycle

`ACTIVE → REVIEW → DEPRECATED → MIGRATING → RETIRED`

- **ACTIVE:** supported and in use.
- **REVIEW:** suspected duplicate, obsolete or incorrect; no removal authorized.
- **DEPRECATED:** replacement selected; new consumers must not be added.
- **MIGRATING:** consumers are being moved with regression evidence.
- **RETIRED:** no active consumers; removal completed and recorded.

A separate **REJECTED** status applies to experiments/options that were not adopted. Rejected does not mean code was ever production-active.

## 3. Required removal evidence

Before marking DEPRECATED or deleting:
1. Identify exact files, symbols, dependencies, documents or behavior.
2. Trace static and dynamic consumers, imports, routes, configuration, persisted data and external contracts.
3. Explain why it is wrong, redundant, unsafe or superseded.
4. Name the replacement or state why no replacement is needed.
5. Identify migration, compatibility, data-loss and operational risks.
6. Add regression tests/telemetry or reproducible proof that consumers are migrated.
7. Define rollback and the condition for final deletion.
8. Update owning docs, status, ADR and this register.
9. Obtain explicit owner approval when protected contracts, production behavior, data, dependencies or deployment are affected.

No bulk deletion of CSS, components, dependencies, history or data without this evidence.

## 4. Current known records

| ID | Item | Status | Evidence / rationale | Required action |
|---|---|---|---|---|
| DEP-001 | Scanner Worker prototype | RETIRED | Scanner Engine/history record identifies the Worker prototype as retired; production decoder remains ZXing-C++ WASM on Main Thread. | Do not revive for UI redesign. Reopen only for a reproducible measured bottleneck or new requirement with benchmark evidence. |
| DEP-002 | Production QA diagnostics collector/monitor for Scanner | RETIRED | Scanner history identifies production diagnostics collector/monitor as retired; diagnostics are not part of runtime decision-making. | Do not reintroduce as an algorithm input. Benchmark/error tooling requires a separate explicit need and bounded scope. |
| DEP-003 | PR #157 legacy Login tablet CSS slice | REJECTED AS MERGE CANDIDATE / HISTORICAL | PR is closed and unmerged; its proposed change is not accepted source behavior. | Preserve PR history; do not cherry-pick/merge without a fresh source audit and current owner approval. |
| DEP-004 | Figma-dependent M0-A prototype workflow | REJECTED | Owner explicitly requires direct source-code prototypes and rejected Figma as a dependency/blocker. | Use running source prototypes and browser inspection; do not block on Figma access. |
| DEP-005 | Legacy UI/UX proposal documents | REVIEW | Several earlier plans/audits overlap the sole active M0 spec. They may contain unique evidence. | Reconcile each unique decision/evidence; demote to historical with authority notice; archive/remove only after link and content audit. |
| DEP-006 | Broad legacy CSS override layers | REVIEW | Current source audit identifies layered CSS and a large mobile override file; file size/static selector matches do not prove safe removal. | Map computed winners, consumers and viewport/state behavior before migration/removal. |
| DEP-007 | `UI_UX_M0_ART_DIRECTION_RESET.md` — “Warm Industrial Editorial” / amber-led proposal | REJECTED AS ACTIVE DIRECTION | Its body proposes amber/sand as an art-direction layer. This conflicts with the later owner-confirmed burgundy/dark-red identity and the active `UI_UX_M0_GOVERNING_SPEC.md`. Preserve only as evidence of the rejected exploration. | Do not load as current direction or reuse amber palette. Keep historical; source of truth is M0 Governing Spec. |
| DEP-008 | `UI_UX_M0_GLOBAL_DIRECTION.md` | SUPERSEDED / HISTORICAL | Earlier proposal predates the final owner-confirmed direction and M0 governing specification. | Remove from default context loading; preserve only if tracing decision history. |
| DEP-009 | `UI_UX_ARCHITECTURE.md` | SUPERSEDED / HISTORICAL | 35 KB proposal overlaps Product Skill, `ARCHITECTURE.md`, Component Governance and active M0 spec; its baseline and proposed architecture must not be treated as current source truth. | Preserve unique evidence only; no default loading. Extract any still-valid invariant into its canonical owner before eventual archival/removal. |
| DEP-010 | `UI_UX_IMPLEMENTATION_PLAN.md` | SUPERSEDED / HISTORICAL | 33 KB phased plan duplicates current `ROADMAP.md` and includes older source baselines/phase assumptions. | `ROADMAP.md` owns future sequencing. Preserve unique completed evidence in phase records; no parallel plan. |
| DEP-011 | `UI_UX_DESIGN_SYSTEM_SPEC.md` | REVIEW — INTERNAL STATUS CONFLICT | File-level authority notice demotes it to historical evidence while its body labels itself “Governing design-system specification”. It also records a proposed/partially implemented token baseline. | Resolve status language; extract any still-active design tokens/contracts to the active M0 spec or actual design-system owner. Do not treat this file as a second governing authority. |
| DEP-012 | `UI_UX_SCREEN_MAP.md` | HISTORICAL SOURCE EVIDENCE | 41 KB AS-IS/TO-BE map is useful for behavior recovery but references older baselines and proposed navigation. | Preserve as audit evidence; load only for a specific screen/workflow trace; verify all facts against current source. |
| DEP-013 | `UI_UX_COMPONENT_AUDIT.md` | HISTORICAL SOURCE EVIDENCE | 35 KB inventory explicitly says consumer/cascade proof is incomplete; recommendations are not proof of unused components/styles. | Preserve useful source findings; re-audit affected callsites before implementation/removal. |
| DEP-014 | `UI_UX_SCREEN_BLUEPRINTS.md` | SUPERSEDED / HISTORICAL | 40 KB 00G blueprints predate later M0 direction and M0-A source blueprints; may contain useful workflow constraints. | Preserve only unique constraints not already in M0-A source blueprint and domain contracts. Do not load by default. |
| DEP-015 | `UI_UX_ACCEPTANCE_MIGRATION_BLUEPRINT.md` | REVIEW — OVERLAP | 31 KB 00H proposal overlaps active M0 gates, Product Skill verification and `ACCEPTANCE_CHECKLIST.md`; owner acceptance was still open in the audited body. | Reconcile unique acceptance criteria into the single active owner; avoid a parallel migration/acceptance plan. |
| DEP-016 | `UI_UX_TECHNOLOGY_AUDIT.md` | HISTORICAL RESEARCH EVIDENCE | 00B inventory/recommendations were based on older source baseline; current package/config and official docs must be rechecked. | Move still-relevant options/findings into `TECHNOLOGY_RADAR.md` with current evidence; no adoption based solely on this audit. |
| DEP-017 | `UI_UX_PHASE_00_AUDIT.md` and `UI_UX_PHASE_01_FOUNDATION.md` | ACTIVE EXECUTION EVIDENCE — REVIEW STATUS | These contain source/implementation findings, but baseline SHAs and branch statuses can become stale. | Preserve as phase evidence; mark current/closed status accurately and do not use as general standards. |
| DEP-018 | `UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md` | HISTORICAL EVIDENCE — AUTHORITY HEADER CONFLICT | Body contains useful owner-aligned image/video reference roles and motion safety rules, but the top authority notice labels it historical. Those principles are now carried by M0 Governing Spec/Product Skill. | M0 Governing Spec owns current direction. Keep this file for historical trace only; resolve any remaining contradictory header/body status. |
| DEP-019 | `UI_UX_M0_CROSS_SURFACE_PROTOTYPE_REVIEW.md` | HISTORICAL / SCREEN-COVERAGE EVIDENCE | The body explicitly labels the concept as historical and superseded; some workflow review notes may remain useful. | Preserve only unique workflow observations; do not use its visual composition as the target. |
| DEP-020 | `UI_UX_M0_A_EXECUTION_RECORD.md` | EXECUTION EVIDENCE — REVIEW REQUIRED | Contains source-first acceptance checklist but also historical PR #157 details and baseline references. | Keep execution evidence; correct stale PR state and baseline references before relying on it. |
| DEP-021 | `AI_CAPABILITY_SYSTEM.md` / `AI_CAPABILITY_EVALUATION.md` | REVIEW — AI GOVERNANCE OVERLAP | These define a prior repository skill architecture and scenario checks; Product Studio is a separate private companion and repository skills remain active. | Do not delete or replace until all skill entry points and workflows are reconciled. Decide canonical relationship in BATCH 03, not by filename/age. |
| DEP-022 | `SESSION_LOG.md` / `CHANGELOG_AI.md` | HISTORICAL LOGS | Append-only chronological records; they are not current status sources. | Retain as history; no default context load. Correct only factual errors; do not consolidate away unique chronology. |
| DEP-023 | `PROJECT_MAP.md` | REVIEW — STALE NAVIGATION LINKS | Current file still describes older UI/UX architecture and implementation plan as target design-system authorities. | Rewrite navigation to point to INDEX and current canonical owners; keep source directory map only after verifying current paths. |

## 5. Reconsideration policy

A REJECTED or RETIRED item may be reopened only when:
- A new requirement materially changes the problem.
- A reproducible defect or measured performance bottleneck demonstrates the current approach is inadequate.
- Platform/browser support changes invalidate the prior decision.
- New evidence materially changes compatibility, security, licensing or total cost.

The proposal must cite the original rejection/retirement record, explain what new evidence exists and define a bounded test. Repeating the old proposal without new evidence is not a valid reason to reopen.

## 6. Register maintenance

- One record per distinct removal decision.
- Link source, PR, ADR, tests, migration and rollback.
- Keep status current; do not label planned work RETIRED.
- Retain unique rationale and audit history after code deletion.
- Do not use this register as a substitute for subsystem-specific runtime contracts.
