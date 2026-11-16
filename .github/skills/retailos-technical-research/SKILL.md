---
name: retailos-technical-research
description: Evidence-led research and option evaluation for RetailOS architecture, browser APIs, libraries, performance and infrastructure decisions.
---

# RetailOS Technical Research — evidence before adoption

## Identity and scope
Use when a decision depends on current browser/platform behavior, library capabilities, compatibility, performance, security, infrastructure limits or an alternative architecture. Research produces a recommendation, not automatic permission to change the repository.

## Workflow
1. Convert the request into a precise technical question and decision criteria.
2. Capture RetailOS constraints: mobile-first, low-end devices, React/TypeScript/Vite, PWA/offline, current backend contracts, free/low-cost infrastructure, solo maintenance and production safety.
3. Inspect current source and installed dependencies first. Identify what the existing implementation already provides and the exact gap.
4. Search current official documentation first (browser standards/vendor docs, library maintainers, framework docs, security advisories). Use credible independent benchmarks or issue reports as secondary evidence.
5. Record source URL, publisher, publication/update date when available, access date, tested version and relevant compatibility limits. Distinguish documented capability from measured behavior.
6. Compare at least the existing approach and the strongest viable alternative. Add more options only when they are materially different.
7. Evaluate correctness, compatibility, performance, memory, bundle size, network, storage, quota, cost, security, accessibility, maintainability, migration effort and rollback.
8. Recommend one option with explicit assumptions, confidence, unresolved questions and a bounded proof/validation plan.
9. Keep findings as exploration until the user approves adoption. Update canonical architecture/ADR only after an explicit decision.

## Comparison standard
Use a compact matrix with:
- capability fit and unmet requirements;
- browser/device/version support;
- evidence quality and reproducibility;
- runtime and operational cost;
- integration/dependency impact;
- failure modes and fallback;
- migration and rollback;
- validation effort.

Do not use popularity, novelty or benchmark headline numbers as a substitute for fit. Benchmark comparisons must disclose hardware, versions, workload and measurement method when available.

## Adoption gate
Do not add a package, hosted service, credential, schema migration, Worker boundary, new cache/persistence layer or architectural abstraction solely because research found it attractive. Adoption requires:
- a demonstrated gap in current RetailOS;
- a reason the existing solution cannot meet it adequately;
- explicit approval for material architectural/cost/security changes;
- a minimal validation experiment with success/failure thresholds;
- a rollback path.

## Output
State the question, constraints, verified current behavior, sources/evidence, comparison, recommendation, confidence, risks and next validation. Mark the recommendation as a proposal until approved.
