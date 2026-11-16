# RetailOS AI Capability System

**Status:** Phase 2.1 implementation baseline  
**Scope:** AI working method, project intelligence and execution/validation. This document does not define or change application runtime behavior.

## 1. Purpose

Turn the repository's existing AI instructions, project knowledge and implementation workflow into a coherent, reusable engineering capability. The goal is not to maximize prompt count or document volume. The goal is to improve the quality and repeatability of audits, technical research, architecture decisions, implementation and validation while reducing context waste and regression risk.

## 2. Three connected layers

### Layer A — AI Working Protocol

Defines how an agent must operate regardless of task:
- `AGENTS.md`: always-on repository mission, safety boundaries and mandatory workflow.
- `.github/copilot-instructions.md`: concise editor/agent-specific entry rules.
- `prompts/START_HERE.md`: session start and task entry prompts.
- `.github/skills/retailos-core/SKILL.md`: shared reasoning, complexity, dependency/risk, research, decision and evidence protocol.

This layer answers: **How should the AI think and work safely?**

### Layer B — RetailOS Project Intelligence

Provides the authoritative knowledge needed to reason about this specific system:
- `docs/ai-context/INDEX.md`: navigation and progressive-disclosure router.
- `docs/ai-context/PROJECT_MAP.md`: verified directory-level source/test map; it guides inspection but never substitutes for import tracing or canonical contracts.
- `PROJECT_CONTEXT.md`: durable product goals, stack and constraints.
- `ARCHITECTURE.md` and `DECISIONS.md`: accepted invariants, boundaries and decisions.
- `IMPLEMENTATION_STATUS.md`: verified current state and acceptance gaps.
- Canonical domain contracts, e.g. `PWA_RUNTIME_RELEASE.md`, `SCANNER_ENGINE.md`, `UI_OVERLAY_ARCHITECTURE.md`, `STOCKTAKE_FILE_IMPORT.md`.
- Actual source, tests, package/configuration and GitHub history remain authoritative for implemented behavior and live repository state.

This layer answers: **What is RetailOS, how is it actually built, and what must not be broken?**

### Layer C — Execution & Validation

Provides repeatable task workflows and quality gates:
- `.github/skills/retailos-audit/SKILL.md`: source-grounded read-only audit.
- `.github/skills/retailos-technical-research/SKILL.md`: current evidence and technical option evaluation.
- `.github/skills/retailos-implementation/SKILL.md`: approved change workflow, implementation and regression verification.
- `AI_CAPABILITY_EVALUATION.md`: scenario-based acceptance checks for the AI workflow.

This layer answers: **How does the AI turn understanding into a bounded change and prove the result?**

The layers are complementary. Do not copy product facts into skills, implementation history into architecture, or task procedures into every entry-point file.

## 3. Skill architecture

Use a small, composable skill taxonomy:

| Type | Responsibility | Current repository implementation |
|---|---|---|
| CORE | Shared reasoning, safety, complexity and evidence rules | `retailos-core` |
| TASK | Reusable workflow for a class of work | `retailos-audit`, `retailos-technical-research`, `retailos-implementation` |
| DOMAIN | Deep knowledge/workflow for a bounded RetailOS subsystem | Add only when repeated work proves a distinct domain skill is useful; canonical domain contracts remain in `docs/ai-context/` |

Every skill must declare its identity, scope, required knowledge, reasoning approach, workflow, decision rules, constraints, validation and output contract. Keep each skill focused. A skill should orchestrate canonical knowledge, not duplicate it.

### Progressive disclosure

1. Always load `AGENTS.md` and `docs/ai-context/INDEX.md`.
2. Load the short current-state context required by INDEX.
3. Load CORE plus the one task skill required.
4. Load only the relevant domain contract, source and tests.
5. Open historical records only to answer a specific question or trace a regression.

Do not load all skills, domain documents or historical logs at session start. If the task crosses domains, add only the additional contract/skill required by the impact map.

## 4. Standard engineering intelligence loop

1. **Understand:** frame outcome, constraints, non-goals and unknowns.
2. **Inspect:** verify GitHub state and trace the current implementation end-to-end.
3. **Map impact:** identify dependencies, consumers, contracts, persistence, lifecycle and deployment boundaries.
4. **Explore:** research current credible alternatives only where evidence is needed.
5. **Decide:** compare against the simplest viable solution; mark proposal vs accepted decision.
6. **Plan:** bound files, behavior, tests, failure paths and rollback.
7. **Execute:** make one coherent, reversible change.
8. **Validate:** test changed behavior and affected consumers at the appropriate level.
9. **Learn:** record actual evidence, failures, corrections and reusable findings in the canonical owner document.
10. **Improve:** update a skill only when a repeated failure or proven reusable method justifies the change; add an evaluation scenario for important new rules.

## 5. Complexity and risk controls

- Reuse current code, platform APIs and installed dependencies before introducing new layers.
- Require a concrete gap and measurable value for every dependency, service, registry, abstraction or migration.
- Trace producers and consumers for shared state, event, API, schema, module identity, cache and lifecycle changes.
- Preserve business behavior, stable identifiers, data contracts, offline behavior and production boundaries.
- Isolate experiments. Do not promote a research prototype directly into production architecture.
- For cross-feature or platform changes, define explicit regression coverage and a recovery path.
- No merge, production promotion, deployment, credential operation or irreversible migration without explicit user authorization.

## 6. Evidence and learning model

Classify statements as Verified, Inferred, Proposal, Accepted, Deferred or Rejected. Keep evidence attached to the claim:
- source inspection: exact path and symbol/line;
- tests: exact command/test and result;
- CI: workflow run and exact commit;
- local/browser/device QA: environment and observed result;
- external research: source URL, publisher, version/date and limitation.

A green build does not prove physical-device acceptance. A merged PR does not prove deployment to the separate shared production account. An implementation claim must match the evidence actually available.

Do not add speculative performance metrics or unsupported success criteria. When a test fails, preserve the failure signal, identify whether it is baseline or introduced, correct the root cause and rerun the relevant check.

## 7. Skill lifecycle and change governance

- **Create:** only for a repeatable workflow with distinct scope and a clear consumer.
- **Refine:** when an evaluation exposes ambiguity, repeated error or missing decision gate.
- **Retire:** when the workflow is obsolete or its responsibility is absorbed by a canonical owner.
- **Version history:** use Git commits and the append-only AI changelog; do not maintain redundant version numbers in multiple files.
- **Evaluate:** use representative scenarios in `AI_CAPABILITY_EVALUATION.md` after material changes to CORE, task skills or entry rules.
- **Single source of truth:** update the owning file and link to it elsewhere; do not paste the same full policy into AGENTS, Copilot, prompts and every skill.

## 8. Phase 2.1 boundary

Included:
- AI reasoning/working protocol and skill composition.
- RetailOS knowledge navigation and authority rules.
- Audit and technical research workflows.
- Implementation complexity/risk gates and evidence-based validation.
- Scenario-based evaluation and controlled skill improvement.

Excluded:
- Application source/runtime changes, dependencies, data contracts and deployment.
- PWA Update/Service Worker runtime audit or hardening. That is Phase 2.2.
- Automatic merging, production promotion or deployment.

## 9. Completion criteria

Phase 2.1 is ready for review when:
- CORE, audit, research and implementation skills compose without conflicting or duplicating instructions.
- INDEX exposes the capability system and task-skill selection without requiring bulk context loading.
- Entry documents point to canonical owners instead of repeating full policies.
- Evaluation scenarios have observable pass/fail criteria.
- PR diff contains only documentation and agent-skill files.
- GitHub CI for the final head is checked and reported accurately.
- No application behavior or Phase 2.2 runtime contract is changed.
