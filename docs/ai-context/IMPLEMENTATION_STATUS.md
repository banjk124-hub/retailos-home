# Current verified implementation status — 2026-11-25

**Repository:** `banjk124-hub/retailos-home`
**Default branch:** `main`
**Verified baseline:** `e0902ddabc572783b1ce284fda39168e91d595e6` (Phase 01 foundation PR #161 merged)
**Phase 00 audit:** [UI_UX_PHASE_00_AUDIT.md](./UI_UX_PHASE_00_AUDIT.md)

## UI/UX redesign

- Phase 00 is closed in merged PR #160; merge commit `2b7f724a2518f2f2ae913e676490f46e23015cdf`.
- Phase 01 implementation is underway on `feat/uiux-phase-01-foundation`, based on that main commit.
- Current batch adds semantic foundation tokens in `src/styles/theme.css`, routes legacy mobile motion aliases through shared Motion tokens, connects Brand wordmark typography, migrates body, five light Glass materials, Login, native/adaptive presentation, Stocktake Import text and Brand/status consumers to canonical roles, corrects the small Login department label's contrast, routes global focus-visible treatment through semantic focus tokens without changing its resolved appearance, and extends the foundation contract test.
- No custom font asset is shipped or selected; Vietnamese glyph/device validation remains open.
- Existing Glass variants and protected feature/platform contracts are retained. No broad CSS deletion or runtime rewrite is claimed.
- Phase 01A–01G are partial or pending as detailed in [UI_UX_PHASE_01_FOUNDATION.md](./UI_UX_PHASE_01_FOUNDATION.md); Phase 01H integration/acceptance is not complete.
- Foundation source-head GitHub Actions run #1519 passed. Browser verification run #1532 passed on commit `3d4b02eae11a8f0c68c6cfdf0c8dcd511535aa1a`: preflight, production/Pages build, bundle comparison and all five Playwright viewports. Screenshot review identified vertical overflow at 844×390 (631px full-page capture). The first compact rule reduced it to 471px but did not satisfy the new viewport-fit gate. The second iteration reduced document height to 401px. The third passed the 390px document-height gate but still had approximately 7.7px panel/dock overlap. The current iteration hides only the redundant helper paragraph at the constrained landscape breakpoint, collapses its empty slot and retains 44px controls; exact-head CI is pending. Browser smoke coverage is not full visual acceptance and does not replace iOS/Android physical-device QA. PR #162 remains open; no merge or deployment is claimed.
- PR #157 remains a stale draft based on an older baseline; do not merge by default.

## Scanner

**Status:** Production scanner stabilization and ecosystem cleanup are complete. PR #153 was merged/deployed; the project owner confirmed the app flow operates normally without observed errors.

- Production backend is ZXing-C++ WASM through `ZXingWasmDecoderAdapter` on the Main Thread.
- Home and Stocktake share the same scanner engine/session contract.
- Worker prototype, production QA diagnostics collector/monitor UI and related unused surface were retired in PR #153.
- Benchmark harness and actual WASM integration tests remain.
- No active SC-01–SC-05 implementation phase is open.

Canonical implementation specification: [SCANNER_ENGINE.md](./SCANNER_ENGINE.md). Historical investigations and phase evidence: [SCANNER_HISTORY.md](./SCANNER_HISTORY.md).

**Acceptance boundary:** owner-confirmed stable operation is recorded. This does not constitute quantified barcode accuracy or exhaustive iOS/Android/low-end-device acceptance.

## PWA runtime / release management

See [PWA_RUNTIME_RELEASE.md](./PWA_RUNTIME_RELEASE.md) for the current release integrity, staging, consent, safe handoff, boot health and rollback contract. Verify current PR, CI and deployment live before making volatile claims.

## General verification rules

- The development repository's GitHub Pages deployment is not production-account promotion.
- CI verifies only the tests and build jobs that actually ran on the exact commit.
- Record physical-device, optical and business-workflow acceptance separately from software/CI status.
- Keep this file concise; implementation archaeology belongs in canonical history documents.
