# RetailOS engineering roadmap — current state 2026-11-24

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

**Status:** 00B–00H architecture and source audits are documented on the open Draft PR #156. M0 reference roles are now explicit; M0-A structural design is in progress. No application source migration has started.

- Canonical reference authority: [UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md](./UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md): image=structure, video=motion/state, RetailOS=brand/business/data authority.
- M0-A structural specification: [UI_UX_M0_A_STRUCTURAL_BLUEPRINT.md](./UI_UX_M0_A_STRUCTURAL_BLUEPRINT.md).
- M0-B temporal/motion contract: same reference roles contract, with feature-owned state and data-correctness constraints.
- Source truth: [UI_UX_SCREEN_MAP.md](./UI_UX_SCREEN_MAP.md), [UI_UX_COMPONENT_AUDIT.md](./UI_UX_COMPONENT_AUDIT.md), [UI_UX_TECHNOLOGY_AUDIT.md](./UI_UX_TECHNOLOGY_AUDIT.md).
- Design and implementation contracts: [UI_UX_ARCHITECTURE.md](./UI_UX_ARCHITECTURE.md), [UI_UX_DESIGN_SYSTEM_SPEC.md](./UI_UX_DESIGN_SYSTEM_SPEC.md), [UI_UX_SCREEN_BLUEPRINTS.md](./UI_UX_SCREEN_BLUEPRINTS.md), [UI_UX_ACCEPTANCE_MIGRATION_BLUEPRINT.md](./UI_UX_ACCEPTANCE_MIGRATION_BLUEPRINT.md), [UI_UX_IMPLEMENTATION_PLAN.md](./UI_UX_IMPLEMENTATION_PLAN.md).

**Next gates:** finish M0-A individual high-fidelity structural frames, validate desktop/tablet/mobile composition and source-to-frame ownership, then proceed to M0-B motion studies. Do not merge the two reference roles, fabricate workflow/data states or begin source migration before M0 acceptance.
