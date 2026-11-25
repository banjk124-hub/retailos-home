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

**Status:** Phase 00 is closed in merged PR #160 at `main` commit `2b7f724a2518f2f2ae913e676490f46e23015cdf`. Phase 01 Design Foundation is active in PR #161; it is not merged and no deployment is authorized.

- Active PR: [#161 — Phase 01 Design Foundation](https://github.com/banjk124-hub/retailos-home/pull/161), branch `feat/uiux-phase-01-foundation`.
- The first source batch establishes semantic tokens, aligns mobile motion aliases with the shared Motion system, connects Brand typography, adds a contrast/token contract test and records source audit evidence.
- Existing Glass materials and protected feature/platform contracts remain intact; no broad CSS deletion, new font package, or second design system is introduced.
- Be Vietnam Pro is the leading Vietnamese typography candidate for evaluation, not yet selected or bundled.
- Phase 01 still requires font decision/device validation, contrast checks on real translucent/dark surfaces, Glass role acceptance, computed-style/cascade review, responsive visual QA and full exact-head CI.
- Do not merge or deploy Phase 01 until the PR's CI and review gates pass and remaining owner/device acceptance is recorded.
- Phase 00's image/video authority remains: image = structure/composition; video = motion/feedback/state; RetailOS = brand, business semantics, data truth and architecture.
- Current App/Auth/Home source remains the AS-IS baseline. The target Shell/navigation migration is a later phase and is not part of Phase 01.
- PR #157 remains a stale draft on an old base; do not merge by default.
