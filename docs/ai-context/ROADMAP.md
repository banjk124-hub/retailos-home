# RetailOS engineering roadmap — current state 2026-11-25

## Current priorities

1. Complete review and validation of the active PWA runtime / AI workflow PRs; their individual status is tracked in their PRs and canonical PWA/AI documents.
2. Preserve the production baseline and avoid creating parallel workstreams without a reproduced issue or a defined acceptance requirement.
3. Promote stable development releases to the shared department environment only after explicit human acceptance and separate production readiness checks.

## Scanner — production stabilization closed

**Status:** Scanner runtime stabilization and cleanup are complete. PR #153 cleanup is merged/deployed and the project owner confirmed the app operates normally without observed errors.

- Production decoder remains ZXing-C++ WASM on the Main Thread.
- Home and Stocktake share the same scanner engine/session path.
- The unused Worker prototype and production QA diagnostics collector/monitor were retired in PR #153.
- Benchmark harness and real WASM integration tests remain.
- No active SC-01–SC-05 implementation phase or Worker migration is planned.

Canonical current contract: [SCANNER_ENGINE.md](./SCANNER_ENGINE.md). Historical phase evidence and retired experiments: [SCANNER_HISTORY.md](./SCANNER_HISTORY.md).

Future Scanner work is issue-driven only. Reopen a workstream when a reproducible defect, measurable performance bottleneck, new product requirement or explicitly requested acceptance task exists. Any proposal must identify its evidence, smallest viable change, regression coverage and device/corpus validation plan before implementation.

## Scanner follow-up evidence boundary

The project owner's operational confirmation is not a quantified optical benchmark and does not imply exhaustive iOS, Android or low-end-device coverage. Do not create an open-ended diagnostics or Worker roadmap to close hypothetical risks. When optical accuracy or cross-device compatibility becomes a concrete release requirement, create a labelled corpus and record real device/browser run data.

## Other canonical roadmaps

- PWA release and runtime contract: [PWA_RUNTIME_RELEASE.md](./PWA_RUNTIME_RELEASE.md).
- AI capability architecture and evaluation: [AI_CAPABILITY_SYSTEM.md](./AI_CAPABILITY_SYSTEM.md), [AI_CAPABILITY_EVALUATION.md](./AI_CAPABILITY_EVALUATION.md).
- Bundle and performance evidence: [PERFORMANCE_BUNDLE_PWA.md](./PERFORMANCE_BUNDLE_PWA.md).

## Roadmap governance

- Keep this file focused on current priorities and exit criteria; move completed implementation narratives to history/changelog.
- Verify branch, PR, CI and deployment facts against GitHub before updating status.
- Do not treat green CI as physical-device, optical or business-process acceptance.
- Prefer deleting duplicate plans or replacing them with links over maintaining parallel status tables.

## UI/UX architecture and full experience redesign

**Status:** Phase 00 is closed in merged PR #160 at `main` commit `2b7f724a2518f2f2ae913e676490f46e23015cdf`. The Phase 01 semantic Design Foundation was merged in PR #161 at `e0902ddabc572783b1ce284fda39168e91d595e6`. Its browser verification and evidence-driven Login responsive continuation are active in PR #162; no deployment or production promotion is authorized.

- Active PR: [#162 — Responsive browser verification baseline](https://github.com/banjk124-hub/retailos-home/pull/162), branch `feat/uiux-phase-01-foundation`.
- Source batches establish semantic tokens, align mobile motion aliases with shared Motion, connect Brand typography, migrate body, Glass, Login, native/adaptive presentation, Stocktake Import text and Brand/status consumers to canonical semantic roles, correct the small Login department label's contrast, extend contract tests and record source-level motion/CSS ownership findings.
- Existing Glass materials and protected feature/platform contracts remain intact; no broad CSS deletion, new font package, or second design system is introduced.
- Be Vietnam Pro is the leading Vietnamese typography candidate for evaluation, not yet selected or bundled.
- Foundation CI #1519 passed on the merged PR #161 source head. Browser CI #1547 passed on the documentation-updated PR #162 head `952b152c369f42e6c91fd7e83e029140e6599e28`; #1545 passed the five viewport checks and its compact-landscape screenshot was reviewed. A further reduced-motion/power-conserve browser contract test is pending exact-head CI. Phase 01 still requires font decision/device validation, contrast checks on real translucent/dark surfaces, Glass fallback/role acceptance, computed-style/cascade review, broader workspace coverage and physical-device acceptance.
- Do not merge or deploy Phase 01 until source review, browser/responsive visual QA and remaining owner/device acceptance are recorded.
- Phase 00's image/video authority remains: image = structure/composition; video = motion/feedback/state; RetailOS = brand, business semantics, data truth and architecture.
- Current App/Auth/Home source remains the AS-IS baseline. The target Shell/navigation migration is a later phase and is not part of Phase 01.
- PR #157 remains a stale draft on an old base; do not merge by default.
