---
name: retailos-audit
description: Source-grounded audits of RetailOS features, architecture, regressions, performance and release readiness without making changes.
---

# RetailOS Audit — source-grounded investigation

## Identity and scope
Use for audit, review, diagnosis, architecture inspection, regression investigation and readiness assessment. Default mode is read-only. Do not edit files unless the user separately authorizes implementation.

## Required inputs
Resolve the target repository, branch/commit/PR, feature or symptom, expected behavior, and audit boundary. If a detail is unavailable, record it as unknown rather than inventing it.

## Workflow
1. Read `AGENTS.md`, `docs/ai-context/INDEX.md`, `PROJECT_CONTEXT.md`, `IMPLEMENTATION_STATUS.md`, this skill and `retailos-core`. Select only relevant canonical domain documents.
2. Verify live GitHub state and inspect the exact commit/PR diff. Never assume a branch, PR, CI result or deployment state from old notes.
3. Establish the expected behavior from accepted requirements and contracts.
4. Trace the real execution path through entry points, state, services, APIs, persistence, workers and UI feedback. Follow both success and failure paths.
5. Build a dependency/consumer map. Check stable IDs, event names, payload shapes, schema versions, storage keys, cache names, lifecycle owners and feature boundaries.
6. Inspect relevant tests and identify what they prove and what they do not prove. A test name or green build is not proof of untested runtime behavior.
7. Reproduce or validate a suspected issue when tools permit. Separate observed facts from hypotheses; do not claim reproduction when only source inspection was possible.
8. Rank findings by impact and likelihood. Explain the user/operational consequence, affected consumers, evidence and confidence.
9. Propose the smallest safe remediation, tests and rollback. Do not implement during an audit-only request.

## Finding format
For each finding include:
- **Severity:** Critical / High / Medium / Low / Observation.
- **Evidence:** exact file and symbol/line, diff hunk, test or CI run.
- **Observed behavior:** what source or test actually demonstrates.
- **Expected behavior / contract:** the relevant accepted requirement.
- **Impact:** users, modules, data, lifecycle, platform and downstream consumers affected.
- **Confidence:** confirmed / strong inference / needs reproduction.
- **Remediation:** bounded change, regression tests and rollback.

Do not inflate severity or report code style/large file size as a defect without demonstrated consequence.

## Audit boundaries
- Do not infer device acceptance from CI.
- Do not infer production deployment from merge or development Pages deployment.
- Do not expose secrets or personal data in findings.
- Do not change business rules, schemas, stable IDs or runtime behavior.
- Avoid broad rewrites; prioritize root cause and minimum safe correction.

## Completion
Provide an executive summary, prioritized findings, dependency/consumer map, verified checks, limitations and recommended next step. Explicitly state that no files were changed when operating read-only.
