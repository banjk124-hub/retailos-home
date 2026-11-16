---
name: retailos-core
description: Core engineering reasoning, risk control, repository intelligence and evidence standards shared by all RetailOS task skills.
---

# RetailOS Core — engineering intelligence and safety

## Identity and scope
This is the shared CORE skill for RetailOS work. It governs how an AI agent understands, reasons about, researches, changes and validates the repository. It does not replace the canonical product/architecture documents or task-specific skills.

Load this skill together with the one task skill needed for the current request. Load domain documents only through `docs/ai-context/INDEX.md`.

## Knowledge authority
Use this authority order:
1. Current source, tests, package/configuration and actual GitHub state for what exists and what is running.
2. Canonical repository documents for accepted product intent, architecture invariants, contracts and constraints.
3. Current official technical documentation and reproducible external evidence for platform/library behavior.
4. Historical logs, prior conversations and AI memory as investigative clues only.

If sources conflict, identify the conflict and inspect the highest-authority evidence. Do not silently choose the convenient interpretation.

## Reasoning protocol
For every non-trivial task:

1. **Frame the outcome.** State the user problem, observable desired result, scope and non-goals. Separate requirements from assumptions.
2. **Establish the baseline.** Verify repository, branch, commit, PR, working diff and relevant CI. Inspect the actual entry point and trace the complete path: UI/event → state/action → service/API → persistence/network → user-visible result and failure handling.
3. **Build an impact map.** Identify direct dependencies, callers/consumers, shared services, stable IDs, payload/schema contracts, persisted state, offline paths, lifecycle ownership, permissions and deployment implications.
4. **Check the simplest viable solution.** Reuse current platform APIs, installed dependencies and existing architecture before adding abstractions. Every new layer, dependency, service, registry or module must have a specific user value, ownership boundary, failure model and measurable reason to exist.
5. **Research when uncertainty matters.** Verify current platform/library behavior from official documentation and credible reproducible evidence. Compare viable options against RetailOS constraints; do not turn exploration into an accepted decision.
6. **Design a bounded change.** Name files/contracts affected, expected behavior, edge cases, risks, tests and rollback. Prefer one coherent vertical slice and reversible commits.
7. **Execute and verify.** Make only the approved change. Run the narrowest meaningful checks first, then broader checks appropriate to the impact. Inspect the final diff.
8. **Report evidence.** Separate source inspection, automated CI, local execution, browser/manual QA and physical-device acceptance. State exact commit/run and list unverified items.

## Complexity Gate
Before accepting added complexity, answer:
- Can the requirement be met by an existing component, service, API or data contract?
- What concrete limitation requires another layer?
- Who owns its state, lifecycle, errors and cleanup?
- Which consumers benefit, and which consumers may regress?
- What is the ongoing cost in bundle size, memory, network, storage, sync, quota, maintenance and support?
- How will the added behavior be tested and removed safely?

Prefer the smallest design that satisfies the full requirement, not the smallest patch that hides a symptom. Do not create speculative frameworks, generic registries or abstractions for hypothetical future modules.

## Risk and dependency gate
Classify the change before editing:
- **Local:** isolated presentation or pure helper with no shared contract.
- **Feature:** one module plus its owned service/state.
- **Cross-feature:** shared service, navigation, auth/session, camera, notifications, IndexedDB, offline or release lifecycle.
- **Platform/production:** build, Service Worker, deployment, credentials, backend/data contract or production account.

For every change beyond Local, trace producers and consumers and record compatibility. For Cross-feature or Platform/production work, require an explicit impact matrix and stronger regression/rollback plan. Stop before an unapproved migration, production action, credential change, paid service, or irreversible data operation.

## Decision discipline
Label conclusions:
- **Verified:** supported by current source, test, official documentation or observed CI.
- **Inferred:** plausible explanation with stated evidence and uncertainty.
- **Proposal:** not yet accepted.
- **Accepted:** explicitly approved and recorded in the canonical decision/architecture source.
- **Deferred / Rejected:** retained with reason where useful.

Do not present a proposal as an accepted architecture decision. Do not add a dependency, service, migration or architectural pattern without explicit approval.

## Validation and recovery
- Define acceptance criteria before implementation; include normal, empty, error, permission-denied, offline, interrupted and recovery paths where relevant.
- Reuse existing test harnesses and add focused regression coverage for changed contracts.
- Run targeted tests, typecheck and production build as applicable; use the actual scripts in `package.json`.
- For cross-feature changes, test affected consumers, not only the edited module.
- For PWA/data work, preserve release/data lifecycle separation and verify offline/persistence behavior when affected.
- Record baseline failures; never hide or relabel them as new success.
- Keep a rollback path that restores the previous known-good behavior without mutating business data.

## Stop conditions
Stop and request direction when requirements conflict, source evidence is insufficient to choose a business rule, an unapproved contract/migration is necessary, production or credentials are involved, or safe rollback cannot be established.

## Output contract
Use concise, evidence-based reporting:
- objective and scope;
- verified baseline and impact;
- decision and alternatives considered;
- files/contracts changed;
- exact checks and results;
- unverified risks;
- rollback and next smallest safe step.
