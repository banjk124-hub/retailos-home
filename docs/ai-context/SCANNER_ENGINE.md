# Scanner Engine — canonical production specification

**Status:** Production scanner is merged, deployed and confirmed operational by the project owner. This document is the single source of truth for the current implementation.
**Last reconciled:** 2026-11-24
**Production decoder:** ZXing-C++ WebAssembly through `ZXingWasmDecoderAdapter` on the Main Thread.
**Consumers:** Home and Stocktake through the shared scanner engine.

> Scope boundary: this specification describes the current implementation contract. Historical design, phase-by-phase changes and retired experiments belong in [SCANNER_HISTORY.md](./SCANNER_HISTORY.md). A green CI run establishes software/build contracts; it does not establish barcode accuracy or a complete cross-device optical benchmark.

## 1. Product and runtime overview

RetailOS uses one shared scanner runtime for Home lookup and Stocktake capture. Feature modules own presentation, their video element, reticle and business workflow. Shared scanner infrastructure owns camera lease/session lifecycle, preview readiness, frame scheduling, ROI validation, recognition, decode-result validation and recovery.

```text
Home / Stocktake feature
  └─ useScannerEngine
      └─ UniversalScannerSession
          ├─ camera lease and preview readiness
          ├─ lifecycle, watchdog and bounded recovery
          ├─ serialized frame scheduling and result policy
          ├─ feature-owned, strict source-frame ROI
          └─ defaultScannerDecoderFactory
              └─ ZXingWasmDecoderAdapter
                  └─ scannerEnhancementPipeline
                      ├─ bounded ROI sampling and scale candidates
                      ├─ ZXing-C++ native decode options
                      ├─ shared deskew / geometry candidates
                      └─ ordered binarizer fallback
```

There is one production decoder path: ZXing-C++ WASM. The old ZXing JS backend and the isolated Worker prototype are not part of the current runtime. Do not reintroduce dual-engine selection, Worker transport or legacy fallback without a new evidence-backed architecture decision.

## 2. Ownership boundaries

| Layer | Owns | Must not own |
|---|---|---|
| Home / Stocktake | Video element, visible reticle, feature workflow and result consumption | Decoder choice, camera lease internals |
| `useScannerEngine` | React integration, activation identity, generation guards, page-visibility recovery and UI-facing state | Retail business rules or duplicate camera ownership |
| `UniversalScannerSession` | Camera lease, preview readiness, frame cadence, lifecycle/recovery, serialization, validation handoff and single/continuous result policy | Feature presentation |
| ROI / geometry | Mapping the active feature reticle to source-frame coordinates; rejecting invalid/stale geometry | Full-frame, centered or guessed fallback |
| Recognition pipeline | Bounded sampling, deskew, geometry correction, image-quality and temporal policies | Duplicating native decoder capabilities |
| WASM adapter | Native decode options, pixel input, result normalization and backend diagnostics | Camera acquisition, UI or business workflow |

The Home and Stocktake paths must continue to use the same engine/session contract. The current feature reticle is authoritative for ROI. Missing, invalid or stale ROI means no decode attempt.

## 3. Camera and session lifecycle

The shared camera service owns stream acquisition and lease semantics. Session initialization waits for preview readiness before lazy-loading the decoder. Session and activation generations prevent stale asynchronous completions from mutating a newer activation.

Lifecycle handling must preserve:
- serialized camera recovery and session retirement;
- fresh video-surface/readiness checks before recognition resumes;
- page visibility handling without duplicate active sessions;
- bounded recovery attempts and cooldowns;
- ordered teardown of frame callbacks, watchdogs, listeners, decoder resources and camera lease.

Never create a second camera owner in Home, Stocktake, a UI component or the decoder adapter. Never make camera reacquisition a side effect of an ordinary decode miss.

## 4. Frame processing and scheduling

Frame work is serialized. There must be no parallel reads against a single decoder instance, unbounded stale-frame queue or unbounded candidate expansion. Scheduling respects session generation, current ROI revision and adaptive runtime budget.

Temporal recognition may use a small bounded set of recent downscaled frames, isolated by session generation and ROI revision. A new ROI/geometry revision clears stale temporal context. Keep memory and work bounded; do not add a queue to compensate for a slow decoder.

## 5. ROI and geometry contract

- The ROI is feature-owned and mapped from the visible preview/reticle into source-frame coordinates.
- Invalid, zero-sized, unsupported, inconsistent or stale geometry fails closed to `null`.
- No full-frame, centered or guessed ROI fallback is permitted.
- Geometry revisions are monotonic; older revisions cannot overwrite newer ROI state.
- ROI/revision changes invalidate temporal recognition state.
- Unsupported CSS positioning/transforms remain unsupported unless mapper behavior and physical layout are separately tested.

The existing pure geometry mapper remains the authority for preview-to-source coordinate mapping. Diagnostics or fingerprints must not become an alternate geometry implementation.

## 6. Recognition pipeline

Recognition is baseline-first and bounded:
1. Validate session identity, source frame and current ROI.
2. Prepare bounded ROI input and candidate dimensions.
3. Run the production ZXing-C++ WASM adapter with the explicit RetailOS format allowlist and configured native options.
4. Use shared continuous deskew and bounded geometry/image-quality candidates where policy permits.
5. Apply ordered binarizer fallback.
6. Normalize the native result and apply RetailOS payload validation.
7. Enforce the active single/continuous result policy before publishing to the feature.

Do not reorder candidates, broaden format support, add retries or increase image work based only on intuition. Changes require fixtures and measurements for the affected symbologies and conditions.

## 7. Decoder and WASM contract

- Production backend: `ZXingWasmDecoderAdapter` via the shared lazy factory.
- The legacy ZXing JS engine is retired; no dual-engine selector or automatic legacy fallback.
- Decoder initialization is lazy and follows preview readiness.
- RetailOS format selection is an explicit allowlist. Empty or unsupported lists fail initialization.
- Native options include `tryHarder`, `tryRotate`, `tryInvert` and `tryDownscale`; `tryDenoise` is conditional on supported 2D formats.
- Binarizer order: `LocalAverage`, then `GlobalHistogram` on miss.
- Output text is `Plain` UTF-8. RetailOS validation remains authoritative.
- At most one accepted symbol is returned per attempt.
- Native result geometry/orientation metadata is not currently normalized into the RetailOS geometry contract. Do not claim position overlays or orientation attribution.

## 8. Pixel and resource budgets

The source ROI and every decode candidate are bounded before expensive work:
- `MAX_ROI_SOURCE_WIDTH = 2048`
- `MAX_ROI_SOURCE_PIXELS = 1,500,000`
- `MAX_DECODE_CANDIDATE_PIXELS = 1,500,000`

The preferred 1.5× candidate is reduced when it would exceed the hard budget. Alternate 1×/2× candidates are subject to the same limit and duplicate dimensions are removed. Do not raise these limits without p95 latency and peak-memory evidence on low-end physical devices.

Temporal state is bounded (maximum three downscaled frames, maximum 640×360, maximum age 700 ms) and scoped to generation plus ROI revision. Adaptive processing gates optional work; it must not remove or weaken the baseline path.

## 9. Image processing and adaptive runtime

Shared processing modules own deskew, geometry correction, enhancement, scale planning, temporal recognition, focus-quality sampling and adaptive processing policy. Native ZXing-C++ features remain in the adapter. Avoid implementing the same rotation/inversion/scale behavior in both layers.

Adaptive runtime (A1/A2/A3) is a bounded policy over optional candidate work and resource budget. It is not a second decoder and must not create unbounded captures, retries or camera operations. Preserve existing stable-motion and sample-quality guards.

## 10. Camera health and recovery

`ScannerCameraHealthController` observes frame progress independently of UI state:
- watchdog interval: 1 second after decode enters scanning;
- stalled threshold: 3 seconds without frame-progress evidence;
- prefer `requestVideoFrameCallback`; RAF fallback requires video media timeline progression greater than 5 ms;
- mute degrades health; unmute alone does not declare healthy;
- track-ended requests immediate recovery;
- one bounded automatic attempt with a 10-second cooldown policy; mounted activation also caps health recovery to prevent a new-session loop;
- failed/exhausted recovery escalates to scanner ERROR and user close/reopen.

Recovery delegates to the existing serialized `useScannerEngine` session-retirement, video-surface replacement, lease reacquisition and fresh-frame startup path. All watchdogs and listeners must be cleared on teardown.

## 11. Focus recovery policy

Focus recovery is passive. It reuses existing baseline ROI focus-quality samples and exposes bounded policy states: `observing`, `waiting-native-autofocus`, `recovered`. Sustained blur may guide the user to wait for native autofocus, steady the device or adjust distance; recovery is inferred from measured sharpness returning to its reference band.

Hard boundary: post-preview camera constraint writes remain disabled (`cameraConstraintWriteBudget: 0`). No `applyConstraints`, autofocus re-arm, stream restart/reacquisition, added timer, extra frame capture or decoder-budget increase. Invalid or moving samples cannot trigger the policy. This is guidance, not proof that the physical lens focused successfully.

## 12. Payload validation

| Symbology | RetailOS validation |
|---|---|
| EAN-8 / EAN-13 / UPC-A / UPC-E | Exact length and check digit |
| CODE-128 | Opaque text; reject controls except ASCII GS (29) for GS1-128 |
| CODE-39 | Printable ASCII; reject controls; Standard and Extended variants share the family |
| CODE-93 | Printable ASCII; reject controls |
| ITF | Even-length numeric payload |
| CODABAR | Validate A–D framing at both ends and supported data characters inside |
| QR / Data Matrix / PDF417 / Aztec / MaxiCode / Micro QR / RSS Expanded | Preserve text; reject disallowed controls |
| RSS-14 | 14-digit value with check digit |

Validation changes require positive and negative fixtures. Do not broadly permit control characters to make one symbology pass.

## 13. Home and Stocktake integration

Home lookup and Stocktake use the shared `useScannerEngine` / `UniversalScannerSession` path. Feature components own their video surfaces, reticle and post-scan workflow; shared infrastructure owns camera and decode lifecycle.

Integration changes must verify:
- open/close and repeated activation;
- permission denial and camera unavailable;
- background/foreground and orientation/viewport changes;
- scan acceptance and duplicate suppression;
- Home lookup handoff and Stocktake capture/save;
- teardown leaves no active camera track, callback or stale result.

Do not duplicate scanner engines or fork recognition logic for either feature.

## 14. Test architecture and evidence

Automated evidence includes WASM adapter integration fixtures, no-legacy preflight checks, source-contract tests, ROI/geometry regressions, validation tests, pipeline ordering, lifecycle, camera health, focus policy and integration checks. Benchmark harness remains isolated under `scripts/scanner-benchmark/`.

A green CI/build/deploy run proves only the contracts and build paths that ran. It does not prove optical accuracy, false-positive rates, focus performance or every device/browser combination. Any performance or accuracy claim must reference measured corpus/device evidence.

## 15. Operational acceptance and current status

**Current project status:** scanner stabilization work is closed. PR #153 cleanup was merged, deployed and the project owner confirmed the application flow operates normally without observed errors. The retired Worker prototype and production QA diagnostics collector/monitor are not part of the active product.

**Evidence boundaries:** historical CI results and PR closure evidence are preserved in [SCANNER_HISTORY.md](./SCANNER_HISTORY.md). Physical test observations confirmed by the owner should not be expanded into untested claims about every iOS, Android or low-end device. No quantified optical accuracy or benchmark threshold is asserted here unless a labelled corpus and run record support it.

Remaining work, if any, is driven by a reproducible issue or a deliberately scoped new acceptance requirement—not by the former SC-01–SC-05 phase plan.

## 16. Known limitations

1. Decode and image preparation execute on the Main Thread through production WASM; the removed Worker prototype was not production-integrated.
2. Device profile remains advisory; complete low-end initial resolution/cadence adaptation is not claimed.
3. Some geometry candidate preparation may occur before all candidate-budget checks; measure and cover before refactoring.
4. Native `position`, `rotation`, `isMirrored`, `isInverted` and `symbologyIdentifier` metadata are not fully normalized into the application result contract.
5. Developer diagnostics are isolated from production UI. Use the benchmark harness for repeatable measurement.
6. `tryDenoise` requires A/B optical evidence by 2D symbology.
7. RGBA → luminance → RGBA conversion may add allocations; benchmark before changing the input path.
8. EAN-2 / EAN-5 add-on symbols remain ignored by the current reader configuration.

## 17. Change protocol

For any future scanner change:
1. Read this document and inspect the exact current source/tests; historical plans are not implementation instructions.
2. State the ownership boundary and observable behavior being changed.
3. Prefer the smallest solution that preserves the existing shared architecture.
4. Add focused positive, negative and boundary regression tests.
5. Protect Home and Stocktake parity, camera lease ownership, strict ROI and bounded processing.
6. Run preflight, TypeScript, production build and Pages build in CI.
7. Record physical-device and optical evidence separately; never infer it from CI.
8. Update this document only when the production contract changes. Put dated investigation and decision evidence in [SCANNER_HISTORY.md](./SCANNER_HISTORY.md).
