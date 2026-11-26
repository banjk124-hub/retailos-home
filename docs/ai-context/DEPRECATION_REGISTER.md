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
