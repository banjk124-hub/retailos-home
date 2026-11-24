# Current verified implementation status — 2026-11-24

**Repository:** `banjk124-hub/retailos-home`
**Default branch:** `main`

## Scanner

**Status:** Production scanner stabilization and ecosystem cleanup are complete. PR #153 was merged and deployed; the project owner confirmed the app flow operates normally without observed errors.

- Production backend is ZXing-C++ WASM through `ZXingWasmDecoderAdapter` on the Main Thread.
- Home and Stocktake share the same scanner engine/session contract.
- Worker prototype, production QA diagnostics collector/monitor UI and related unused surface were retired in PR #153.
- Benchmark harness and actual WASM integration tests remain.
- No active SC-01–SC-05 implementation phase is open.

Canonical implementation specification: [SCANNER_ENGINE.md](./SCANNER_ENGINE.md).
Historical phase/PR/decision evidence: [SCANNER_HISTORY.md](./SCANNER_HISTORY.md). Do not use standalone `SCAN_*.md` or `SCANNER_*.md` phase/audit files as current specifications.

**Acceptance boundary:** owner-confirmed stable operation is recorded. This does not constitute quantified barcode accuracy or an exhaustive iOS/Android/low-end-device test matrix. Do not state physical acceptance beyond the actual recorded runs.

## PWA runtime / release management

See [PWA_RUNTIME_RELEASE.md](./PWA_RUNTIME_RELEASE.md) for the current release integrity, staging, consent, safe handoff, boot health and rollback contract. Check the active PR and current GitHub Actions before stating volatile branch/CI/deployment status.

## AI workflow and project intelligence

See [AI_CAPABILITY_SYSTEM.md](./AI_CAPABILITY_SYSTEM.md) and [AI_CAPABILITY_EVALUATION.md](./AI_CAPABILITY_EVALUATION.md) for canonical architecture and evaluation criteria. Verify current PR/merge status directly in GitHub.

## General verification rules

- The development repository's GitHub Pages deployment is not production-account promotion.
- CI verifies only the tests and build jobs that actually ran.
- Record physical-device, optical and business-workflow acceptance separately from software/CI status.
- Keep current status concise. Put implementation archaeology in the appropriate history document.
