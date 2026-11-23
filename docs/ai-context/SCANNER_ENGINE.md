# RetailOS Scanner — Unified Technical Specification & Release Closure

**Status:** Production Main Thread scanner is the accepted runtime. SC-01 Worker remains a preserved, unintegrated prototype with empirical transport/performance unverified. SC-02 through SC-05 software scope is closed at documented boundaries; physical-device optical acceptance remains NOT RUN. This document is the current source specification, not evidence that every cleanup or release gate is complete.
**Last reconciled:** 2026-11-23
**Canonical source:** This document is the current production-runtime specification. The SC-01 Worker research and SC-05 physical QA protocol remain active evidence references; historical/phase records remain archival and must not be mistaken for current runtime facts.

## 1. Product contract
RetailOS production currently uses one barcode decoder backend: ZXing-C++ WASM via `zxing-wasm` 3.1.6 on the Main Thread. The scanner is shared by Home and Stocktake. Worker code exists as a preserved, isolated prototype; it is not production-connected. No legacy JS decoder fallback or dual-engine production selection is supported.

## 2. Runtime architecture and ownership
```
Home / Stocktake
  -> useScannerEngine
  -> UniversalScannerSession
      -> CameraSession lease / preview readiness / lifecycle
      -> serialized scheduling, result acceptance and bounded recovery
      -> feature-owned source-frame ROI
      -> defaultScannerDecoderFactory (lazy WASM)
          -> ZXingWasmDecoderAdapter
          -> shared scannerEnhancementPipeline
```

| Boundary | Responsibility | Protected invariant |
|---|---|---|
| Feature (Home/Stocktake) | UI, reticle, result workflow, source ROI | No camera acquisition or decoder orchestration |
| Shared hook/session | Camera lease, readiness, lifecycle, scheduling, result policy | One session path; serialized decode |
| Camera service | Sole camera stream acquisition/lease ownership | No duplicate getUserMedia owners |
| ROI/geometry | Reticle-to-source mapping and geometry revision | Missing/invalid/stale ROI fails closed; never full-frame fallback |
| Enhancement pipeline | Bounded candidate transforms and early exit | Original ROI baseline first; bounded memory |
| WASM adapter | Native options, input and result normalization | No camera/UI/business ownership |
| Validation | RetailOS payload correctness | Decoder success alone is not acceptance |

## 3. Production decode flow
1. Feature publishes the current source-frame ROI and geometry revision.
2. Shared session verifies session state, frame freshness and ROI validity.
3. Bounded ROI/candidate preparation applies the current processing budget.
4. Baseline decode precedes fallbacks; native orthogonal rotation/inversion/downscale options remain delegated to ZXing-C++.
5. Shared deskew/geometry candidates run only under current confidence/budget gates.
6. Candidate scale fallbacks remain bounded; duplicate dimensions are removed.
7. ZXing output is normalized, RetailOS validation runs, then result policy delivers a valid result to the owning feature.

**Strict ROI:** invalid/missing/stale ROI produces no decode. Do not add guessed center crops or full-frame scanning.

## 4. Decoder, format and validation
- Single decoder backend: ZXing-C++ WASM.
- Lazy initialization after camera preview readiness.
- Explicit supported-format allowlist; empty/unsupported format selection fails initialization.
- Native options: `tryHarder`, `tryRotate`, `tryInvert`, `tryDownscale`; conditional `tryDenoise` for supported 2D formats.
- LocalAverage then GlobalHistogram fallback.
- One symbol per attempt; plain UTF-8 payload.
- RetailOS format validation remains authoritative, including checksums/lengths and control-character policy.

Format policy summary: retail linear formats use explicit length/check-digit validation; CODE-128 permits GS (ASCII 29) only where needed; CODE-39/93 printable ASCII; ITF even-length numeric; CODABAR framing/data validation; supported 2D formats preserve text while rejecting disallowed controls; RSS-14 requires length/check digit. Consult implementation fixtures before changing policy.

## 5. Resource, performance and asynchronous invariants
- Hard input ceiling: 2048 source width; 1,500,000 ROI source pixels; 1,500,000 candidate pixels.
- Candidate buffers are bounded; avoid candidates that exceed the decoder budget and deduplicate dimensions.
- Decode is serialized; no parallel reader access, unbounded queue, stale-frame backlog or duplicate session.
- Camera health/recovery is bounded (at most one automatic recovery attempt per session).
- Adaptive runtime adjusts within bounded processing budgets; it does not change camera resolution/cadence or relax baseline recognition.
- Current device profile is advisory/diagnostic; LOW/MID/HIGH does not yet change camera startup or decode cadence. Do not describe it as completed low-end device adaptation.
- Image preparation currently performs ROI draw/readback, RGBA-to-luminance conversion and luminance-to-RGBA expansion for ZXing WASM. This is a benchmark candidate, not a proven defect; measure allocations, peak memory and p50/p95 before altering the path.
- Session close/unmount/background transitions must invalidate stale callbacks and release resources.
- Worker prototype is isolated from production and retained as an architecture candidate. The SC-01A study explicitly records transport/runtime performance as unverified; do not integrate or remove it until Main Thread vs Worker is evaluated with build, transport, responsiveness, accuracy and low-end device evidence.

## 6. Home and Stocktake consumers
Both consumers use the same hook/session. Each owns its reticle, ROI binding and business flow. Home result lookup remains Home-owned; Stocktake entry/confirmation/save remains Stocktake-owned. Scanner teardown must not change retail workflows. Do not fork scanner engines per consumer.

## 7. Focus, health and diagnostics
- Health controller observes frame progress and camera lifecycle; recovery is bounded.
- Focus quality is passive and uses ROI samples; no post-preview camera constraint writes. Recovery guidance does not prove optical autofocus success.
- Diagnostics are in-memory and pass through an explicit allowlist. Never export decoded barcode payload, camera/device IDs, employee IDs or persistent identifiers.
- Current QA Monitor has known observability debt: duplicated collector installation ownership, unused allowlist fields, incomplete display of nested stage/profile data, and a Max stage summary reading the wrong metric field. These should be corrected without removing useful diagnostic evidence.
- Decoder stage-cost and session runtime windows are separate observations; do not collapse them until the window semantics are made explicit.
- The collector currently retains up to 1,000 in-memory events and replaces console methods while installed. Confirm its memory/notification cost before changing the retention mechanism.
- Keep geometry/focus diagnostics only where they support a named QA question; do not turn them into a customer feature contract.

## 8. Tests and quality gates — lean policy
Keep regression tests that protect correctness, privacy, lifecycle and consumer contracts. Consolidate source-string tests only where their asserted invariant is demonstrably duplicated. Worker source-contract tests are retained while the prototype is under evaluation; they do not prove Worker runtime correctness and need a separate mock-runtime/transport suite before integration. CI/preflight must remain proportionate and cover:
- payload validation and temporal acceptance
- camera request/lifecycle/lease and bounded health recovery
- strict ROI geometry and Home/Stocktake consumer wiring
- production WASM adapter, format mapping and decoder integration
- enhancement pipeline limits and adaptive runtime safety
- privacy-safe diagnostic export
- TypeScript production build and Pages build

Do not retain one-off read/write audits, repeated source assertions, standalone diagnostic metrics, benchmark harnesses or fixtures without an actively used QA question. The current scanner benchmark harness remains useful: it supports labelled local images, strict ROI, p50/p95 and exact/miss/wrong/false-positive scoring. It currently benchmarks the production WASM adapter only, not Worker transport. Benchmark tools are dev-only; never import them into the production bundle. Physical device QA remains manual and should record only environment, scenario, pass/fail and actionable issue—not payloads or unnecessary numeric telemetry.

## 9. Dependencies
Production scanner dependency is `zxing-wasm`. No `@zxing/library` JS decoder should be reintroduced. React, Vite and TypeScript are app-level dependencies, not scanner-specific. Review transitive dependency changes through lockfile and production bundle; do not add scanner dependencies without a capability gap and evidence.

## 10. Legacy/historical documentation policy
This document is the current production runtime specification. Keep `SCANNER_SC01A_SPIKE_FINDINGS.md` and `SCANNER_WORKSTREAM_SC01_05.md` indexed because they contain unresolved Worker transport and phase evidence. Keep `SCANNER_SC05_INTEGRATION_QA.md` indexed because the physical QA protocol is still open. Historical audits and migration snapshots are archival evidence, not alternate runtime specifications.

## 11. Scanner Ecosystem Audit — 2026-11-23
Audit baseline: `main` at `357b5ba1bd136cb562b4e2f96290484771ee7937`. This section records confirmed findings and their disposition; it is not a claim that cleanup or optical release acceptance is complete.

### Confirmed findings and dispositions
- Preserve the production boundaries: one shared camera owner, one `useScannerEngine` → `UniversalScannerSession` path, feature-owned ROI, strict fail-closed geometry, serialized decode, RetailOS validation and separate Home/Stocktake business flows.
- Preserve the Worker implementation and source-contract check as an isolated prototype. No built Worker/Pages transport, low-end responsiveness, memory or accuracy parity evidence is present. Do not integrate or delete until those measurements exist.
- Remove the duplicated resets of `diagnosticDecodeDurationTotalMs` and `diagnosticDecodeDurationMaxMs` in `UniversalScannerSession.emitDiagnostics()`; this is safe dead repetition.
- Correct Scanner QA Monitor summary semantics: its current `Max stage` card reads top-level `durationMs` and does not use nested `stages`/decoder `maxDecodeMs`. It must not label startup stage max as decode-stage max.
- Consolidate diagnostics ownership. Home currently installs the console collector and ScannerQaMonitor installs it again; the singleton returns a no-op disposer for the second owner. Keep one explicit owner and preserve sanitized in-memory collection.
- Reconcile diagnostics schema: several allowlist fields have no current runtime emitter; current stage/profile data is not fully surfaced by the UI. Do not remove potentially useful metrics until emitter → allowlist → UI/CSV/JSON → QA question mapping is complete.
- Preserve actual regression/fixture tests. The 33 scanner checks registered in preflight all resolve to existing scripts. Real WASM fixture tests and pipeline/ROI/lifecycle tests protect different contracts; only consolidate genuinely duplicative source assertions.
- Candidate unused contract types in `contracts.ts`: `ScannerCameraProfile`, `ScannerActualCameraSettings`, `ScannerPoint`, `ScannerCapabilities` have no runtime call-sites in the repository source search. `ScannerGeometry` and feature capability service are separate and must not be removed by association. Confirm type export/API expectations before deleting the candidate types.
- `ScannerImageQualityProfile` is constructed and passed into diagnostics but is not currently consumed by QA Monitor; choose whether to expose its useful findings or remove the profile layer only after a concrete QA-value review.
- Current device profile is diagnostic metadata only. It does not yet adapt initial camera resolution, frame cadence or pre-decode budget for LOW devices.
- Main Thread image preparation has measurable candidate allocation stages (`getImageData`, RGBA↔luminance conversion, `ImageData` expansion). Benchmark before optimizing or moving processing into Worker.
- `SCANNER_RECOGNITION_PIPELINE.md` is now explicitly historical; `SCANNER_ENGINE.md` describes the current production path. Keep Worker research and physical QA protocol documents linked in INDEX while gates remain unresolved.

### Release/acceptance status
- Software phases SC-02 through SC-05 are recorded closed at their merged CI boundaries; this does not imply physical optical/device acceptance.
- Worker transport/runtime proof: NOT VERIFIED.
- Physical iOS Safari/PWA, Android LOW/MID and desktop/browser matrix: NOT RUN per SC-05 QA record.
- Scanner cleanup PR #152: review candidate only; no merge/promotion authorized by this audit.

## 12. Final Scanner Ecosystem Closure — pending
Do not mark overall scanner ecosystem closure complete until source cleanup findings are resolved, the Worker keep/integrate/remove decision is evidence-based, final preflight/TypeScript/production/Pages gates pass, and device/corpus caveats are accurately represented in release handoff.

Closure checklist:
- [x] One production backend (ZXing-C++ WASM); legacy decoder removed
- [x] Shared camera/session ownership and Home/Stocktake consumers
- [x] Strict feature-owned ROI and geometry revision protection
- [x] Bounded enhancement, decode scheduling and recovery
- [x] Payload validation/result acceptance
- [x] Privacy-safe diagnostics boundaries
- [x] SC-05 cross-layer contract and physical QA protocol
- [ ] Physical-device acceptance evidence for supported phone/browser matrix
- [ ] Final cleanup CI and Pages build

**Release handoff:** scanner ecosystem closure remains a candidate until source audit, cleanup review, CI/Pages build and device acceptance caveat are reconciled. No production promotion is authorized by this candidate.
