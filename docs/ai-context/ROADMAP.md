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

**Status:** Phase 00 audit is recorded in [UI_UX_PHASE_00_AUDIT.md](./UI_UX_PHASE_00_AUDIT.md). PR #159 is merged to `main` at `588d8f937525acb29ebb7b0de97a9b1dcf61c0c7`; PR-head CI #1465 passed. Post-merge main CI/deployment and physical-device acceptance are separate evidence and are not inferred from that PR run.

- Product-wide redesign is source-first in the existing React/Vite repository. Figma is optional reference material, not a delivery dependency or acceptance gate.
- Reference roles remain strict: image = structure/composition; video = motion/feedback/state; RetailOS = brand, business semantics, data truth and architecture.
- Design-system architecture is open/evolving: Core Foundation, Shared Design System and Feature Experience. Feature-specific layouts/components are valid when task semantics require them.
- Current source still uses the existing App/Auth/Home composition; the target Shell, route/history adapter and formal foundation are not yet implemented.
- Phase 00 architecture principles are closed, but repository reconciliation, shared consumer graph, selector-level CSS audit and owner decision gates remain open. No broad source migration is authorized by documentation completion alone.
- PR #157 remains a draft on an old base with a legacy Login CSS-only change; it is not a required redesign milestone and must not be merged by default.

**Next gate:** finish the remaining Phase 00 audit items and obtain explicit owner acceptance for route/history, desktop navigation, visual foundation, overlay/focus strategy, device matrix and the first bounded source slice. Scanner Engine remains closed; only an optional, isolated presentation slice may be considered later.
