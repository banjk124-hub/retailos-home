# RetailOS Deprecation & Removal Register

**Authority:** Canonical register for retiring code, dependencies, documents, patterns and experiments.  
**Status:** Governance standard; entries are evidence records, not blanket deletion permission.

## 1. Governing rule
Remove what is incorrect, redundant, unsafe or no longer needed—but never delete based only on file size, age, visual similarity or intuition. Prove ownership, consumers, behavior and replacement first.

Historical evidence is preserved unless it is superseded or its unique value has been extracted into an authoritative record. Git history remains the source for exact prior file revisions.

## 2. Lifecycle
`ACTIVE → REVIEW → DEPRECATED → MIGRATING → RETIRED`

- **ACTIVE:** supported and in use.
- **REVIEW:** suspected duplicate, obsolete or incorrect; no removal authorized.
- **DEPRECATED:** replacement selected; no new consumers.
- **MIGRATING:** consumers are being moved with regression evidence.
- **RETIRED:** no active consumers; removal completed and recorded.

**REJECTED** is used for options/experiments not adopted; it does not imply production use.

## 3. Required removal evidence
Before deprecating or deleting:
1. Identify exact files, symbols, dependencies, documents or behavior.
2. Trace static/dynamic consumers, imports, routes, configuration, persisted data and external contracts.
3. Explain why the item is wrong, redundant, unsafe or superseded.
4. Name the replacement or explain why none is needed.
5. Identify migration, compatibility, data-loss and operational risks.
6. Add regression tests/telemetry or reproducible proof that consumers are migrated.
7. Define rollback and final deletion condition.
8. Update owning docs, status, decision records and this register.
9. Obtain explicit owner approval when protected contracts, production behavior, data, dependencies or deployment are affected.

No bulk deletion of CSS, components, dependencies, history or data without this evidence.

## 4. Current records
| ID | Item | Status | Evidence / rationale | Required action |
|---|---|---|---|---|
| DEP-001 | Scanner Worker prototype | RETIRED | Scanner Engine/history identifies the Worker prototype as retired; production decoder remains ZXing-C++ WASM on Main Thread. | Do not revive for UI redesign; reopen only for a measured bottleneck or new requirement. |
| DEP-002 | Production Scanner QA diagnostics collector/monitor | RETIRED | Scanner history identifies production collector/monitor as retired; diagnostics are not runtime decision inputs. | Do not reintroduce as algorithm input. |
| DEP-003 | PR #157 legacy Login tablet CSS slice | REJECTED AS MERGE CANDIDATE / HISTORICAL | PR #157 is closed and unmerged; its proposed CSS is not accepted source behavior. | Preserve PR history; do not merge/cherry-pick without a fresh audit and owner approval. |
| DEP-004 | Figma as required M0 prototype/acceptance workflow | REJECTED | Owner requires direct source-code prototypes and running-browser inspection. | Optional tools cannot replace source/runtime validation or block progress. |
| DEP-005 | Legacy UI/UX authority and plan documents | RETIRED — BATCH 02 | Nine overlapping proposal/authority documents were reconciled into Product Skill, M0 Governing Spec, Component Governance, Technology Radar and Roadmap. Inbound references were identified and active links corrected. | Do not restore as active authorities; see UI_UX_DOCUMENT_CONSOLIDATION.md. |
| DEP-006 | Broad legacy CSS override layers | REVIEW | Audit evidence identifies layered CSS and a large mobile override file; file size/static selector matches do not prove safe removal. | Map computed winners, consumers and viewport/state behavior before any CSS removal. |
| DEP-007 | UI_UX_ARCHITECTURE.md | RETIRED — DOCUMENT CONSOLIDATION | Product-wide principles, layers, motion, accessibility, imagery and extension rules are represented by Product Skill, M0 Spec and Component Governance. Proposed src/app and src/design-system paths are not current source architecture. | Consult canonical owners; exact old revision remains in Git history. |
| DEP-008 | UI_UX_IMPLEMENTATION_PLAN.md | RETIRED — DOCUMENT CONSOLIDATION | Parallel phases and gates duplicated ROADMAP and M0 work packages; old status/authority links were stale. | Use ROADMAP and M0 Governing Spec. |
| DEP-009 | UI_UX_DESIGN_SYSTEM_SPEC.md | RETIRED — DOCUMENT CONSOLIDATION | Proposed tokens, font, materials and motion values were not final owner-approved decisions; valid constraints moved to M0 Spec and Technology Radar. | Do not import historical token proposals as approved values. |
| DEP-010 | UI_UX_ACCEPTANCE_MIGRATION_BLUEPRINT.md | RETIRED — DOCUMENT CONSOLIDATION | Acceptance, protected boundaries, browser/device distinction, rollout and rollback rules are owned by Product Skill, M0 Spec and Technology Radar. | Use current owners; do not use as a parallel acceptance checklist. |
| DEP-011 | UI_UX_M0_GLOBAL_DIRECTION.md | RETIRED — SUPERSEDED | Owner-confirmed direction is consolidated in the sole active M0 Governing Spec. | Do not load as current art direction. |
| DEP-012 | UI_UX_M0_ART_DIRECTION_RESET.md | REJECTED AS ACTIVE DIRECTION; DOCUMENT RETIRED | Its amber/sand “Warm Industrial Editorial” proposal conflicts with owner-confirmed burgundy/dark-red identity. | Do not revive without an explicit owner decision changing brand direction. |
| DEP-013 | UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md | RETIRED — CONSOLIDATED | Image=art direction/composition; video=motion/interaction; RetailOS=brand/business/data/architecture; state correctness, interruption and low-end constraints moved to M0 Spec/Product Skill. | M0 Governing Spec is sole authority. |
| DEP-014 | UI_UX_M0_CROSS_SURFACE_PROTOTYPE_REVIEW.md | RETIRED — HISTORICAL CONCEPT | The prototype was not accepted as target art direction; useful screen coverage and workflow cautions are already represented in M0 scope and source blueprints. | Do not use as visual quality benchmark. |
| DEP-015 | UI_UX_M0_REFERENCE_REASSESSMENT.md | RETIRED — CONSOLIDATED | Reference interpretation and non-copy rules are represented in M0 Governing Spec. | Do not load as a second reference authority. |

## 5. Reconsideration policy
A REJECTED or RETIRED item may be reopened only when:
- A new requirement materially changes the problem.
- A reproducible defect or measured bottleneck demonstrates the current approach is inadequate.
- Platform/browser support changes invalidate the prior decision.
- New evidence materially changes compatibility, security, licensing or total cost.

A proposal must cite the original record, explain new evidence and define a bounded test. Repeating an old proposal without new evidence is not a valid reason.

## 6. Register maintenance
- One record per distinct removal decision.
- Link source, PR, ADR, tests, migration and rollback.
- Keep status current; do not label planned work RETIRED.
- Retain unique rationale and audit history after code deletion.
- This register does not replace subsystem-specific runtime contracts.


| DEP-016 | M0 UI/UX audit-and-gate workflow and active M0 document pack | RETIRED | Owner direction is to rebuild the Experience Layer greenfield. The M0 process repeatedly prioritized legacy CSS/source audits and documentation gates over working implementation. Its active authority, phase gates and audit pack are removed from the index and current workflow. | Use EXPERIENCE_BUILD_STANDARD.md. Reopen a historical audit only for a specific regression or source-history question; never treat it as an implementation prerequisite. |
| DEP-017 | Playwright runtime-evidence diagnostic harness | RETIRED | `tests/browser/runtime-evidence.spec.ts` emitted large DOM/style/cascade/performance dumps and screenshots of existing surfaces, duplicating audit activity without validating a complete new workflow. | Keep focused journey assertions and failure traces only. Reintroduce targeted diagnostics only for a measured defect or explicit profiling task. |
| DEP-018 | Per-PR full scanner regression suite for UI-only changes | DEPRECATED | Scanner stabilization is closed; repeating the full scanner suite on unrelated UI/documentation changes wastes CI time without increasing relevant coverage. | CI selects full preflight when Scanner source/contracts change; otherwise use the UI-focused preflight. Full regression remains required at integration/release gates. |
