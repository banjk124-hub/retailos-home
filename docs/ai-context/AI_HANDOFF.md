# Current handoff — RetailOS engineering continuation

**Current Scanner baseline:** runtime stabilization and ecosystem cleanup are complete. PR #153 was merged and deployed; the project owner confirmed the current application flow operates normally without observed errors.

- Current implementation contract: [SCANNER_ENGINE.md](./SCANNER_ENGINE.md). Scanner context is intentionally consolidated into this file and [SCANNER_HISTORY.md](./SCANNER_HISTORY.md) only; do not create parallel Scanner phase/audit files.
- Historical decisions and phase evidence: [SCANNER_HISTORY.md](./SCANNER_HISTORY.md).
- Production decoder: ZXing-C++ WASM on the Main Thread.
- Home and Stocktake use the shared Scanner Engine/session.
- The unused Worker prototype and production diagnostics collector/QA Monitor were retired. Benchmark harness and real WASM integration tests remain.
- No SC-01–SC-05 workstream is active.

## Engineering boundaries

Preserve shared camera lease ownership, session lifecycle/recovery, strict feature-owned ROI, bounded recognition, decoder allowlist, payload validation, and Home/Stocktake workflow contracts. Do not revive retired Worker or production diagnostics paths without a reproducible requirement and evidence-backed proposal.

## Task start protocol

Read [INDEX.md](./INDEX.md), then load only the canonical documents and source/tests relevant to the requested task. Verify live branch, PR, CI and deployment state before changing volatile status. Prefer the smallest solution that satisfies the requirement.
## UI/UX active handoff — Phase 01

- Phase 00 is closed at merged main commit `2b7f724a2518f2f2ae913e676490f46e23015cdf`; see [UI_UX_PHASE_00_AUDIT.md](./UI_UX_PHASE_00_AUDIT.md).
- Active work is PR [#161 — Phase 01 Design Foundation](https://github.com/banjk124-hub/retailos-home/pull/161), branch `feat/uiux-phase-01-foundation`.
- Read [UI_UX_PHASE_01_FOUNDATION.md](./UI_UX_PHASE_01_FOUNDATION.md) for exact implemented scope, evidence and open gates.
- Current source changes: semantic tokens in `src/styles/theme.css`; Brand typography token consumption; mobile legacy motion aliases routed to shared Motion tokens; new design-foundation contract test registered in preflight.
- Preserve the existing Glass system, App/Auth/Home composition and all protected business/platform contracts. Do not delete CSS or change font dependencies until the documented evidence/acceptance gate is met.
- Be Vietnam Pro is the leading Vietnamese font candidate for comparison, not a selected or shipped dependency.
- Do not claim Phase 01 complete, merge or deploy until exact-head CI, browser/responsive visual QA, accessibility/contrast and owner/device acceptance are recorded.
