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
- Phase 01 Design Foundation source foundation was merged in PR [#161](https://github.com/banjk124-hub/retailos-home/pull/161) at `e0902ddabc572783b1ce284fda39168e91d595e6`. Follow-up browser verification is proposed in PR #162 on branch `feat/uiux-phase-01-foundation`; it adds Playwright Chromium smoke coverage against the production Pages build at five responsive viewports. PR #162 CI is the next verification gate.
- Read [UI_UX_PHASE_01_FOUNDATION.md](./UI_UX_PHASE_01_FOUNDATION.md) for exact implemented scope, evidence and open gates.
- Current source changes: semantic tokens in `src/styles/theme.css`; Brand typography token consumption; body, Glass, Login, native/adaptive presentation and Stocktake Import text consume canonical roles; Brand/status consumers use semantic colors; the small Login department label uses the AA-checked muted role; mobile legacy motion aliases route to shared Motion tokens; design-foundation contract tests run in preflight.
- Preserve the existing Glass system, App/Auth/Home composition and all protected business/platform contracts. Do not delete CSS or change font dependencies until the documented evidence/acceptance gate is met.
- Be Vietnam Pro is the leading Vietnamese font candidate for comparison, not a selected or shipped dependency.
- The Phase 01 foundation CI passed on the merged PR #161 head. The follow-up browser test run and screenshots are pending in PR #162. Do not claim Phase 01 complete or device-accepted until responsive browser review, real-surface accessibility/contrast and owner/device acceptance are recorded.
