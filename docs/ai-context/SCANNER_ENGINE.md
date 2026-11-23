# RetailOS Scanner — Unified Technical Specification & Release Closure

**Status:** Production scanner stabilized; SC-01 through SC-05 software scope closed. Physical-device optical acceptance is a separate evidence gate and must not be falsely marked complete.
**Last reconciled:** 2026-11-23
**Canonical source:** This document supersedes scanner implementation, architecture, phase and QA documents for current operating guidance. Historical records remain only for unique investigation evidence.

## 1. Product contract
RetailOS has one barcode scanning engine: ZXing-C++ WASM via `zxing-wasm` 3.1.6. The scanner is shared by Home and Stocktake. No legacy JS decoder fallback, alternate engine selection, or experimental Worker backend is part of production.

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
- Adaptive runtime adjusts within bounded processing budgets; do not add timers, telemetry or metrics without a concrete operational decision they support.
- Session close/unmount/background transitions must invalidate stale callbacks and release resources.
- Worker prototype is isolated from production and retained as an architecture candidate. The SC-01A study explicitly records transport/runtime performance as unverified; do not integrate or remove it until Main Thread vs Worker is evaluated with build, transport, responsiveness, accuracy and low-end device evidence.

## 6. Home and Stocktake consumers
Both consumers use the same hook/session. Each owns its reticle, ROI binding and business flow. Home result lookup remains Home-owned; Stocktake entry/confirmation/save remains Stocktake-owned. Scanner teardown must not change retail workflows. Do not fork scanner engines per consumer.

## 7. Focus, health and diagnostics
- Health controller observes frame progress and camera lifecycle; recovery is bounded.
- Focus quality is passive and uses ROI samples; no aggressive camera constraint writes. Recovery policy may wait for native autofocus and reassess.
- Diagnostics are opt-in/in-memory and allowlist-based. Never export decoded barcode payload, camera/device IDs, employee IDs or persistent identifiers.
- Keep QA monitor only if it serves operational debugging; remove excessive metrics, redundant counters, raw event logs and collector fields with no active consumer or named decision use.
- Geometry/focus diagnostics are not a customer feature contract; avoid unnecessary UI or persistent logging.

## 8. Tests and quality gates — lean policy
Keep only regression tests that protect correctness, privacy, lifecycle and consumer contracts. Consolidate duplicate source-string tests when they assert the same invariant. Remove prototype-only tests and dead test scripts. CI/preflight must remain proportionate and cover:
- payload validation and temporal acceptance
- camera request/lifecycle/lease and bounded health recovery
- strict ROI geometry and Home/Stocktake consumer wiring
- production WASM adapter, format mapping and decoder integration
- enhancement pipeline limits and adaptive runtime safety
- privacy-safe diagnostic export
- TypeScript production build and Pages build

Do not retain read/write audit scripts, repeated source snapshot assertions, standalone diagnostic metrics, benchmark harnesses or fixtures without an actively used QA question. Benchmark tools are dev-only; never import them into the production bundle. Physical device QA remains manual and should record only environment, scenario, pass/fail and actionable issue—not payloads or unnecessary numeric telemetry.

## 9. Dependencies
Production scanner dependency is `zxing-wasm`. No `@zxing/library` JS decoder should be reintroduced. React, Vite and TypeScript are app-level dependencies, not scanner-specific. Review transitive dependency changes through lockfile and production bundle; do not add scanner dependencies without a capability gap and evidence.

## 10. Legacy/historical documentation policy
This document is the only current scanner specification. Historical audits, implementation phases, experiments and benchmark methodology are archival references and are not parallel specs. They should be read only to reproduce a specific issue or recover evidence. The documentation index points only here for scanner operating guidance.

## 11. Final Scanner Ecosystem Closure
Scanner is closed for feature development and architectural expansion. No further scanner phase is planned absent a reproducible defect, physical-device evidence or business requirement.

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
