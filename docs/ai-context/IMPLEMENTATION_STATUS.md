# Current verified implementation status — 2026-11-25

**Repository:** `banjk124-hub/retailos-home`
**Default branch:** `main`
**Verified baseline:** `588d8f937525acb29ebb7b0de97a9b1dcf61c0c7`
**Phase 00 audit:** [UI_UX_PHASE_00_AUDIT.md](./UI_UX_PHASE_00_AUDIT.md)

## UI/UX redesign

- PR #159 (`docs(ui): define evolving design-system architecture`) is merged at the verified baseline above.
- PR-head RetailOS CI run #1465 passed on `27966f571dd25ec15e6815ce034f6799c8ad47f8`.
- Post-merge RetailOS CI #1466 and GitHub Pages deployment #159 both completed successfully on merge commit `588d8f937525acb29ebb7b0de97a9b1dcf61c0c7`.
- These automated results do not establish physical-device or visual acceptance.
- The redesign is product-wide and source-first in the existing React/Vite repository. Figma is optional and is not a delivery dependency.
- The open/evolving design-system principle is documented: Core Foundation, Shared Design System and Feature Experience. No new design-system runtime implementation is claimed.
- Current App/Auth/Home composition remains in source. The proposed App Shell, route/history adapter and new visual foundation are not yet implemented.
- Phase 00 architecture decisions are consolidated; repository reconciliation, full shared consumer graph, selector-level CSS/computed-style audit and owner decision gates remain open.
- PR #157 is still a draft/open Login CSS-only change based on an older main commit; it is not accepted as a redesign implementation slice. Do not merge by default.
- No UI source migration, production deployment or physical-device acceptance is claimed by this documentation audit.

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
