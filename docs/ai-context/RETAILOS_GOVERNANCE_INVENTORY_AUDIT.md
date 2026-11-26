# RetailOS — BATCH 00 Governance Inventory & Source Lock

**Status:** Audit record / proposed governance baseline; not yet owner-approved as a new standard  
**Repository:** `banjk124-hub/retailos-home`  
**Audited branch:** `main`  
**Audited commit:** `4e654ffb519d8b124f3edbbbda4f65fe550052ef`  
**Audit date:** 2026-11-26  
**Scope:** Repository governance documents, UI/UX decision records, active PR state, and private RetailOS Product Studio v0.1.3. This record does not authorize UI implementation, dependency changes, merge, deployment, or production promotion.

## 1. Executive conclusion

The repository already has a useful authority hierarchy, but its documentation system is not yet sufficiently consolidated to guarantee reliable cross-chat execution of the six owner requirements.

The most important issue is not absence of all principles: several are already present in `RETAILOS_PRODUCT_SKILL.md`, `UI_UX_M0_GOVERNING_SPEC.md`, and the Product Studio skill. The gap is that the principles are distributed and are not consistently expressed as explicit, enforceable decision protocols. The decision register is particularly underdeveloped relative to the breadth of architectural and product decisions recorded elsewhere.

The audit confirms:
- `main` is at `4e654ffb519d8b124f3edbbbda4f65fe550052ef`; PR #163 is already merged into this baseline.
- PR #164 remains an open Draft based on this exact main commit. Its body still describes Figma View-only as a blocker and proposes resolving Figma authoring access or choosing an alternate editable prototype surface. This conflicts with the owner-confirmed workflow: prototypes and visual validation are to be performed directly against source code; Figma is not a dependency.
- PR #157 is closed and unmerged. Documents on `main` that still describe it as open are stale.
- `IMPLEMENTATION_STATUS.md` and `AI_HANDOFF.md` on `main` still cite the pre-PR-163 SHA and describe PR #163 as open. Both are demonstrably stale.
- PR #164 contains branch-local updates that correct some of these stale records, but it does not remove the Figma blocker from its own body/handoff.
- Private Product Studio is v0.1.3, USER scope, PRIVATE. Its skill and manifests are paired with the repository standard, but they do not yet fully operationalize the six new governance requirements.

No files on `main` were changed during this audit.

## 2. Authority hierarchy — observed and retained

The existing repository defines the following useful hierarchy:
1. Current explicit owner decisions.
2. Repository Product Skill and the sole active M0 governing specification.
3. Current source, tests and domain contracts for implementation truth.
4. Historical audits/proposals and execution records as evidence only.
5. Prior chats and memory as context, never proof.

The following ownership model is already documented and should be retained:
- `AGENTS.md`: repository operating/safety contract.
- `RETAILOS_PRODUCT_SKILL.md`: product-wide product/design/engineering authority.
- `UI_UX_M0_GOVERNING_SPEC.md`: sole active M0 direction and acceptance contract.
- `INDEX.md`: navigation and document ownership map.
- `IMPLEMENTATION_STATUS.md`: verified implementation state.
- `AI_HANDOFF.md`: current continuation point.
- `PROJECT_CONTEXT.md`: durable product/repository facts.
- `ARCHITECTURE.md` and domain contracts: technical invariants and subsystem ownership.
- `ROADMAP.md`: future work and phase gates.
- `CHANGELOG_AI.md`, `SESSION_LOG.md`, phase/audit records: implementation evidence and history.

This is a source hierarchy, not a claim that every current file is accurate. Volatile facts must be revalidated against GitHub and source before use.

## 3. Owner governance requirements — acceptance criteria for future standards

The next canonical standard and plugin release must explicitly satisfy all six:

| ID | Owner requirement | Required operational rule |
|---|---|---|
| G-01 | Do not repeat previous mistakes or misunderstandings | Start from current source and owner decisions; check rejected/ superseded decisions before proposing; surface conflicts and ask only when an unresolved owner decision blocks safe action. |
| G-02 | Allow creativity and new tools/technologies | Explore design, browser, library, framework, brand system, imagery and motion options when they solve a real need; prototype in source; compare evidence, license, compatibility, performance, cost, maintenance and fallback. |
| G-03 | Reuse solutions where purpose is the same | Reuse by semantic responsibility and behavior, not visual resemblance alone; inspect existing consumers before building another solution. |
| G-04 | Do not lock architecture against future extension | Lock stable contracts and boundaries, not today's implementation choices; support extension points and staged replacement with migration/rollback evidence. |
| G-05 | Lock terminology and technical direction to approved references | Keep a canonical glossary and explicit owner-approved decision register; reference image = art direction/composition, reference video = motion/interaction; RetailOS owns brand, business semantics and architecture. |
| G-06 | Remove incorrect or unnecessary things | Use evidence-based deprecation/removal: identify consumers, behavior, replacement, risk, tests and rollback; archive unique historical evidence rather than silently deleting it. |

These are governance requirements, not permission to start implementation or select technologies without the appropriate gate.

## 4. Repository inventory and classification

Classification labels:
- **CANONICAL** — current authority for a defined concern.
- **DOMAIN CONTRACT** — authoritative technical contract for a subsystem.
- **STATUS / NAVIGATION** — current state or navigation, not a competing specification.
- **ACTIVE M0 EVIDENCE** — evidence used by the current M0 work; interpreted through the governing spec.
- **HISTORICAL / REFERENCE** — retain for traceability; not an independent instruction source.
- **TEMPLATE** — reusable documentation scaffold.
- **REVIEW REQUIRED** — current content/status needs reconciliation before it can be relied on.

### Root
| Path | Classification | Ownership / note |
|---|---|---|
| `AGENTS.md` | CANONICAL | Operating contract, safety, evidence, lifecycle and continuity rules. |
| `README.md` | PROJECT ENTRY | Public/project overview; not a design or engineering authority. |

### `docs/ai-context/`
| File | Classification | Ownership / note |
|---|---|---|
| `RETAILOS_PRODUCT_SKILL.md` | CANONICAL | Product-wide governing standard. |
| `UI_UX_M0_GOVERNING_SPEC.md` | CANONICAL | Sole active M0 authority; M1 remains blocked pending explicit M0 acceptance. |
| `INDEX.md` | STATUS / NAVIGATION | Document ownership and selective context loading. |
| `IMPLEMENTATION_STATUS.md` | STATUS / REVIEW REQUIRED | Current state; main copy contains stale SHA and PR status at audit time. |
| `AI_HANDOFF.md` | STATUS / REVIEW REQUIRED | Continuation point; main copy contains stale SHA, PR state and branch references. |
| `PROJECT_CONTEXT.md` | STATUS / CONTEXT | Durable product facts; must not become a second roadmap/status. |
| `ARCHITECTURE.md` | DOMAIN CONTRACT | Broad technical architecture/invariants; cross-check with source and subsystem contracts. |
| `DECISIONS.md` | REVIEW REQUIRED | ADR register currently contains only ADR-001 in Proposed/staged-for-validation state; too sparse to represent all accepted decisions and rejected alternatives. |
| `ROADMAP.md` | STATUS / ROADMAP | Phase sequencing and gates; currently reflects the M0 direction. |
| `CHANGELOG_AI.md` | HISTORICAL / EVIDENCE | Implementation/change evidence. |
| `SESSION_LOG.md` | HISTORICAL / HANDOFF EVIDENCE | Session history; should not compete with AI_HANDOFF. |
| `ACCEPTANCE_CHECKLIST.md` | REVIEW REQUIRED | Acceptance checklist; verify ownership and overlap with phase-specific criteria before retaining as active. |
| `AI_CAPABILITY_SYSTEM.md` | REVIEW REQUIRED | AI capability/skill architecture; reconcile with Product Studio and repository skill boundaries. |
| `AI_CAPABILITY_EVALUATION.md` | HISTORICAL / EVIDENCE | Capability evaluation evidence; not a governing skill. |
| `PROJECT_MAP.md` | REFERENCE | Repository/project navigation; verify links against current tree. |
| `HOME_PERFORMANCE_RECONCILIATION.md` | HISTORICAL / DOMAIN EVIDENCE | Home performance-specific reconciliation. |
| `PERFORMANCE_BUNDLE_PWA.md` | DOMAIN CONTRACT | Performance and bundle constraints. |
| `PWA_RUNTIME_RELEASE.md` | DOMAIN CONTRACT | PWA lifecycle, consent, staging, activation, health and rollback. |
| `SCANNER_ENGINE.md` | DOMAIN CONTRACT | Current Scanner Engine contract; scanner stabilization is closed. |
| `SCANNER_HISTORY.md` | HISTORICAL / DOMAIN EVIDENCE | Scanner decisions, experiments and retired approaches; retain as evidence. |
| `STOCKTAKE_FILE_IMPORT.md` | DOMAIN CONTRACT | Stocktake Import parsing, precision, conflicts, persistence and output. |
| `UI_OVERLAY_ARCHITECTURE.md` | DOMAIN CONTRACT | Overlay lifecycle, focus and body-scroll ownership. |
| `UI_OVERLAY_ACCEPTANCE.md` | ACTIVE DOMAIN EVIDENCE | Overlay acceptance criteria; verify it remains subordinate to the architecture contract. |
| `UI_COMPONENT_SPEC_TEMPLATE.md` | TEMPLATE | Component contract template. |
| `UI_INTERACTION_RESPONSIVENESS_AUDIT.md` | HISTORICAL / EVIDENCE | Prior interaction/responsive audit. |
| `UI_UX_ARCHITECTURE.md` | HISTORICAL / REFERENCE | Earlier UI/UX architecture proposal; not active authority. |
| `UI_UX_IMPLEMENTATION_PLAN.md` | HISTORICAL / REFERENCE | Earlier implementation plan; reconcile unique evidence, do not treat as parallel plan. |
| `UI_UX_ACCEPTANCE_MIGRATION_BLUEPRINT.md` | HISTORICAL / REFERENCE | Earlier acceptance/migration blueprint; subordinate to M0 spec. |
| `UI_UX_SCREEN_MAP.md` | HISTORICAL / REFERENCE | Broad screen map; check for unique source-backed facts before archival. |
| `UI_UX_SCREEN_BLUEPRINTS.md` | HISTORICAL / REFERENCE | Earlier screen blueprints; newer M0-A blueprint is branch-local in PR #164. |
| `UI_UX_COMPONENT_AUDIT.md` | HISTORICAL / EVIDENCE | Component audit evidence. |
| `UI_UX_DESIGN_SYSTEM_SPEC.md` | HISTORICAL / EVIDENCE | Design-system research/specification; not an independently active standard. |
| `UI_UX_TECHNOLOGY_AUDIT.md` | HISTORICAL / EVIDENCE | Technology audit; findings are not technology adoption decisions. |
| `UI_UX_PHASE_00_AUDIT.md` | HISTORICAL / EVIDENCE | Phase 00 audit. |
| `UI_UX_PHASE_01_FOUNDATION.md` | HISTORICAL / EVIDENCE | Phase 01 foundation record. |
| `UI_UX_M0_GLOBAL_DIRECTION.md` | HISTORICAL / EVIDENCE | Earlier M0 direction; conflicts must defer to M0 governing spec. |
| `UI_UX_M0_ART_DIRECTION_RESET.md` | HISTORICAL / EVIDENCE | Art-direction reset evidence. |
| `UI_UX_M0_REFERENCE_REASSESSMENT.md` | HISTORICAL / EVIDENCE | Reference interpretation evidence. |
| `UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md` | ACTIVE M0 EVIDENCE | Reference roles and motion contract; reconcile with governing spec, not a second authority. |
| `UI_UX_M0_A_EXECUTION_RECORD.md` | ACTIVE M0 EVIDENCE | M0-A execution evidence. |
| `UI_UX_M0_A_STRUCTURAL_BLUEPRINT.md` | ACTIVE M0 EVIDENCE | Structural blueprint evidence. |
| `UI_UX_M0_CROSS_SURFACE_PROTOTYPE_REVIEW.md` | ACTIVE M0 EVIDENCE | Cross-surface prototype review. |
| `modules/EXPORT_FILE.md` | DOMAIN CONTRACT | Export File module behavior and output contract. |

### `implementation/`
| File | Classification | Ownership / note |
|---|---|---|
| `LOGIN_PHASE2_HISTORY.md` | HISTORICAL / EVIDENCE | Login Phase 2 implementation history. |

### Branch-local M0-A additions in PR #164 (not yet on main)
| File | Classification | Ownership / note |
|---|---|---|
| `UI_UX_M0_A_SOURCE_BASELINE_AUDIT.md` | ACTIVE M0 EVIDENCE | Source ownership and baseline audit, based on main SHA `4e654ffb519d8b124f3edbbbda4f65fe550052ef`. |
| `UI_UX_M0_A1_SCREEN_BLUEPRINTS.md` | ACTIVE M0 EVIDENCE | Login, proposed Shell, Home and Module Library blueprints; not owner-accepted final visual designs. |

## 5. Confirmed contradictions and stale references

| ID | Severity | Evidence | Required resolution |
|---|---|---|---|
| C-01 | High | Main `IMPLEMENTATION_STATUS.md` and `AI_HANDOFF.md` state main SHA `3cd2d5bf...`; live main is `4e654ffb519d8b124f3edbbbda4f65fe550052ef`. They describe PR #163 as open although it is merged. | Update status/handoff from live GitHub facts in a bounded documentation PR. |
| C-02 | High | Main status/handoff and M0 spec describe PR #157 as open Draft; live PR #157 is closed, unmerged. | Record closed/unmerged and retain its code as unaccepted historical work. |
| C-03 | High | PR #164 body says Figma View-only blocks direct Figma authoring and proposes resolving access or selecting another editable prototype surface. The owner has rejected Figma as a dependency and requires direct source-code prototyping. | Remove Figma as a blocker and make source-code prototypes the explicit workflow. Do not block on Figma seat/access. |
| C-04 | Medium | `DECISIONS.md` is a sparse ADR register while major decisions and rejected approaches are spread across Product Skill, M0 spec, architecture and historical records. | Build one decision register with status, rationale, evidence, owner, date, supersession and reconsideration criteria. |
| C-05 | Medium | Several UI/UX files have overlapping titles and scopes; INDEX says they are evidence/history but files may still contain imperative or conflicting language. | Audit unique decisions and rewrite historical headers/cross-links so they cannot be mistaken for active instructions. Preserve unique evidence. |
| C-06 | Medium | The Product Skill says compare options and record KEEP/ADOPT/REPLACE/BUILD/DEFER, but there is no dedicated live technology radar/register visible in the inventory. | Create a technology evaluation register only after BATCH 00 approval of the canonical document architecture. |
| C-07 | Medium | Glossary and deprecation/removal governance are not identified as canonical documents. | Add a canonical terminology glossary and evidence-based deprecation/removal register in the next standards batch. |

## 6. Product Studio v0.1.3 audit

**Plugin:** `retailos-product-studio`  
**ID:** `plugins_6b06bb9b54a48191973b9aeebd13d38e`  
**Scope/discoverability:** USER / PRIVATE  
**Release:** `pluginrel_6b071373ff2c819198a8b7ae2d2df0a8`  
**Version:** `0.1.3`

Inspected files:
- `skills/retailos-product-engineering/SKILL.md`
- `plugin.json`
- `.codex-plugin/plugin.json`
- `README.md`
- `agents/openai.yaml`

Strengths already present:
- Skill is explicitly triggered for every RetailOS task, including new chats and short follow-ups.
- Requires current repository source/status verification and selective context loading.
- Defines owner-approved burgundy identity, Vietnamese-first typography, authentic retail imagery, image/video reference roles and feature-specific UX.
- Allows open design-system evolution and selective technology adoption/replacement.
- Protects Auth, module registry, data/cache, Scanner, Stocktake/Import, overlays and PWA release contracts.
- Requires bounded implementation, tests, visual/browser/device evidence, documentation and owner approval for merge/deploy.

Gaps against G-01…G-06:
- No explicit rejected-decision/reconsideration protocol; historical documents are demoted generally but there is no authoritative list of rejected approaches and the evidence required to reopen them.
- Creative exploration is permitted, but no repeatable experiment protocol ensures alternatives are compared and prototypes are built directly in source code.
- Reuse is described at a high level; there is no explicit semantic/behavior equivalence test before reuse or shared promotion.
- Architecture extension is encouraged but no explicit stable-contract vs replaceable-implementation map and extension compatibility rule.
- No canonical glossary or enforcement rule for locked terminology.
- No evidence-based removal/deprecation register and lifecycle.
- The manifests are metadata/default prompts, not additional executable governance. Keep repository standard and plugin skill paired; avoid duplicating long technical contracts in both.

**Conclusion:** v0.1.3 is a solid base, not yet complete for the new six-part governance request. Do not update it until the repository canonical standard and decision model are agreed and stable.

## 7. BATCH 00 exit assessment

| Gate | Status | Evidence / reason |
|---|---|---|
| G0.1 Live source baseline | PASS | main SHA and PR #163 merge confirmed live. |
| G0.2 Repository inventory | PASS WITH LIMITATION | Tree and all listed context documents classified; source-level content deep review is selective, not every historical page line-by-line. |
| G0.3 Authority hierarchy | PASS | INDEX, Product Skill, M0 spec and AGENTS establish the hierarchy. |
| G0.4 Contradiction register | PASS | Seven findings recorded with severity and treatment. |
| G0.5 Plugin parity baseline | PASS | Current private plugin release and core skill/manifests inspected. |
| G0.6 Six owner requirements translated to acceptance rules | PASS | G-01…G-06 recorded. |
| G0.7 Historical evidence and removal safety | PASS | No historical files deleted; candidates require further content/consumer review. |
| G0.8 Canonical document architecture approved | NOT YET | Proposed in the next batch; this audit does not silently approve it. |
| G0.9 PR #164 Figma blocker corrected | OPEN | Identified; requires PR body and branch-local handoff correction. |
| G0.10 Stale main status/handoff corrected | OPEN | Identified; requires bounded documentation change. |

## 8. Recommended next batch

**BATCH 01 — Canonical Standard & Decision Architecture**

1. Approve a minimal document ownership model before creating more files.
2. Define the product/experience standard, architecture/engineering standard, component/pattern governance, technology evaluation register, terminology glossary and deprecation/removal register.
3. Keep INDEX, IMPLEMENTATION_STATUS, AI_HANDOFF and ROADMAP concise and single-purpose.
4. Reconcile existing canonical files rather than duplicate their content.
5. Correct the stale main status/handoff and the Figma language in PR #164 as explicit, traceable fixes.
6. Only after the repository standards are stable, update Product Studio and validate cross-chat cases.

BATCH 00 is an audit record, not a declaration that the repository or plugin is already fully consolidated. No source application code, dependencies, plugin release, merge or deployment was changed by this batch.
