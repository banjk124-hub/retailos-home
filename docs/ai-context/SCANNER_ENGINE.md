# Scanner Engine — current technical source of truth

**Status:** Production scanner runs ZXing-C++ WASM on the Main Thread through the current adapter. The isolated SC-01 Worker prototype has been removed from the active codebase; no Worker runtime is part of the supported scanner architecture.
**Last reconciled:** 2026-11-24
**Repository:** `banjk124-hub/retailos-home`

This document describes the current implementation contract. Older investigations and incident notes are indexed in [SCANNER_HISTORY.md](./SCANNER_HISTORY.md). They preserve evidence; they do not override this document or the source code.

## 1. Runtime architecture

```text
Home / Stocktake feature
  └─ useScannerEngine
      └─ UniversalScannerSession
          ├─ camera lease, preview readiness, lifecycle and recovery
          ├─ serialized frame scheduling and result policy
          ├─ strict feature-owned source-frame ROI
          └─ defaultScannerDecoderFactory
              └─ ZXingWasmDecoderAdapter (zxing-wasm 3.1.6)
                  └─ scannerEnhancementPipeline
                      ├─ bounded ROI sampling / scale candidates
                      ├─ native ZXing-C++ orthogonal rotation, inversion,
                      │  downscale and format decoding
                      ├─ shared continuous deskew / geometry candidates
                      └─ ordered LocalAverage → GlobalHistogram fallback
```

**Single production decoder:** `ZXingWasmDecoderAdapter` (`zxing-cpp-wasm`). The legacy ZXing JS adapter and `@zxing/library` have been removed. Do not reintroduce dual-engine selection or legacy fallback without a separately reviewed architecture decision.

## 2. Ownership boundaries

| Layer | Owns | Must not own |
|---|---|---|
| Home / Stocktake | Video element, visible reticle, feature workflow and result consumption | Decoder selection, camera lease internals |
| Universal session | Camera lease, preview readiness, frame cadence, lifecycle/recovery, serialization, validation handoff and single/continuous policy | Feature presentation or retail business rules |
| ROI / geometry | Mapping the current feature reticle to source-frame coordinates; fail-closed invalid ROI | Full-frame or inferred-region fallback |
| Shared recognition pipeline | Bounded sampling, continuous deskew, geometry correction, image-quality and temporal policies | A second implementation of native WASM capabilities |
| WASM adapter | Native decode options, pixel input, ZXing result normalization and backend diagnostics | Camera acquisition, UI, module policy or business workflow |

The current module-owned ROI is strict: missing or invalid ROI produces no decode attempt. Never replace it with a full-frame, centered or guessed crop.

## 3. Decode contract

- Production format selection is an explicit RetailOS allowlist. Empty or unsupported format lists fail initialization.
- Candidate execution is serialized; no stale-frame queue or parallel reader access.
- Baseline-first ordering is retained. Orthogonal rotation is owned by ZXing-C++; shared processing retains continuous deskew and bounded geometry correction.
- Native options currently include `tryHarder`, `tryRotate`, `tryInvert`, `tryDownscale`; `tryDenoise` is enabled conditionally when a supported 2D format is requested.
- Binarizer fallback is `LocalAverage` first, then `GlobalHistogram` on miss.
- Output payload uses `Plain` text and UTF-8. RetailOS validation remains authoritative after native decoding.
- One accepted symbol is returned per decode attempt (`maxNumberOfSymbols: 1`).
- The decoder is lazy-loaded after preview readiness through the shared factory.

## 4. Pixel and memory boundary

The source ROI is bounded before candidate generation. The decoder input must also have a single shared hard ceiling:

- `MAX_ROI_SOURCE_WIDTH = 2048`
- `MAX_ROI_SOURCE_PIXELS = 1,500,000`
- `MAX_DECODE_CANDIDATE_PIXELS = 1,500,000` (implemented in Phase A; planner and WASM guard import the same constant)

The 1.5× candidate remains the preferred baseline when it fits. If it exceeds the hard input budget, the planner reduces its effective scale. Alternate 1×/2× candidates are also bounded by the same budget and duplicate dimensions are removed. No candidate should be generated only to be rejected by the decoder.

Do not raise this ceiling based on synthetic performance alone. Any increase must include peak-memory and p95 latency evidence on low-end physical devices.

## 5. Payload validation policy

| Symbology | RetailOS validation rule |
|---|---|
| EAN-8 / EAN-13 / UPC-A / UPC-E | Exact length and check digit |
| CODE-128 | Opaque text; reject controls except ASCII GS (29), required by GS1-128 separators |
| CODE-39 | Shared family includes ZXing-C++ Standard and Extended variants; accept printable ASCII, reject controls |
| CODE-93 | Printable ASCII, reject controls |
| ITF | Even-length numeric payload |
| CODABAR | Engine output includes A–D start/stop framing; validate one framing character at each end and supported data characters inside |
| QR / Data Matrix / PDF417 / Aztec / MaxiCode / Micro QR / RSS Expanded | Preserve text payload; reject disallowed control characters |
| RSS-14 | 14-digit value with check digit |

Validation changes must include positive and negative fixtures. Do not broadly allow control characters to make a single format pass.

## 6. Runtime telemetry and privacy

The production UI does not install a console-intercepting diagnostic collector or retain/export a rolling diagnostic event buffer. Runtime controller state remains internal to the session and continues to drive bounded adaptive processing, camera health and passive focus policy. Do not remove or repurpose those controller inputs as part of UI cleanup. Barcode payloads, camera identifiers and employee identifiers must not enter diagnostic output. Benchmark measurements remain in the isolated developer harness under `scripts/scanner-benchmark/`.

Known decoder limitation: native ZXing-C++ result geometry/orientation metadata is not normalized into the RetailOS `DecoderOutput.geometry` contract. Do not claim position overlays or native rotation hit attribution are available without a separate adapter-level implementation and regression tests.

## 7. Verified capabilities vs. release acceptance

**Automated architecture evidence currently present**
- WASM-only factory and no-legacy preflight guard.
- Real WASM adapter integration harness and generated barcode fixtures.
- Regression tests for ROI, scaling, validation, pipeline ordering, lifecycle, camera health, focus policy and WASM options.
- TypeScript, production build and Pages build run in CI.

**Still requires optical / physical evidence**
- Labelled corpus from real supermarket packaging and shelf labels, including negative samples.
- Exact-match, miss, wrong-decode and false-positive rates by symbology and condition.
- Glare, blur, motion, curved packaging, low contrast, distance, skew and ROI-edge conditions.
- iOS Safari/PWA, Android Chrome/PWA and low-end Android acceptance.
- Home lookup and Stocktake capture/save end-to-end acceptance.

A green CI run proves code contracts and build health, not optical accuracy or physical-device performance.

## 8. Known limitations / deferred engineering

1. Decode and image preparation execute on the Main Thread through the production WASM adapter. Worker experiments were not production-integrated and have been removed from active code; any future Worker proposal requires a new isolated evidence-backed project.
2. Device profile is advisory; low-end initial camera resolution, cadence and pre-decode budgets are not yet fully adapted.
3. Geometry generation budget is applied after some candidate preparation work; measure and move the guard earlier only with regression coverage.
4. Adapter currently discards native `position`, `rotation`, `isMirrored`, `isInverted` and `symbologyIdentifier` metadata.
5. Developer diagnostics are intentionally isolated from the production UI; use the dedicated benchmark harness for repeatable measurements.
6. `tryDenoise` is experimental and needs A/B optical evidence by 2D symbology.
7. RGBA → luminance → RGBA conversion may add avoidable allocations; benchmark before changing the input path.
8. EAN-2 / EAN-5 add-on symbols remain ignored by the current reader configuration.

These are explicit follow-up items, not reasons to reintroduce the retired decoder or rewrite camera/session ownership.

## 9. Camera Health Controller (SC-02)

`ScannerCameraHealthController` observes camera frame progress separately from scanner UI lifecycle. The session starts a 1-second watchdog once decoding enters SCANNING; 3 seconds without frame-progress evidence transitions to STALLED and requests one bounded automatic recovery. Native `requestVideoFrameCallback` is preferred. RAF compatibility mode is considered healthy only when the video media timeline advances (`currentTime` delta greater than 5 ms). `mute` degrades health; `unmute` does not declare healthy without recent frame progress. `track-ended` triggers immediate recovery request.

Recovery is delegated to `useScannerEngine` and reuses the existing serialized session retirement / video-surface replacement / lease reacquisition / fresh-frame startup path. The controller permits one attempt, with a 10-second cooldown policy; the hook also caps automatic health recovery to one for the mounted scanner activation to prevent a new-session loop. Failed or exhausted recovery escalates to scanner ERROR, leaving the user a close/reopen action. Watchdog and track listeners are cleared on teardown. Health callback diagnostics are bounded scalar snapshots only.

**SC-02 evidence:** deterministic controller/source-contract tests are included in preflight. CI/build/deploy are software validation. A deliberate live-camera stall, track-ended injection, recovery success/failure and device matrix remain manual QA gates; do not infer them from CI.

## 10. Geometry Diagnostics (SC-03)

The existing `scannerGeometry.ts` pure mapper remains the authority for mapping visible preview-content coordinates to the unrotated source frame. SC-03 adds geometry identity and stale-region protection around that mapper; it does not change its object-fit mapping math or the feature-owned reticle layout.

- `createScannerGeometrySignature` fingerprints source dimensions, video/reticle DOMRects, computed object-fit/object-position, supported transform/mirror, window viewport, visualViewport offset/scale and devicePixelRatio. It returns a compact in-memory string and does not persist or export it.
- `ScannerGeometryRevisionTracker` issues monotonic versions. Repeated stable valid signatures preserve the same version; a valid-to-invalid transition increments once; repeated invalid state does not churn. Explicit lifecycle invalidation always advances the epoch.
- `useScannerPreviewRegionBinding` observes source metadata/resize, ResizeObserver (video, reticle, preview parent), window resize/orientation, visualViewport resize/scroll and device-pixel-ratio changes. If the measured fingerprint differs from the active one, it clears the prior ROI synchronously before the next RAF measurement.
- Published source ROI carries `geometryVersion`. `UniversalScannerSession` rejects malformed or older revisions, keeps the latest version floor across clear, and clears temporal recognition state whenever ROI/version changes.
- Missing, zero-sized, unsupported or inconsistent geometry fails closed to `null`. There is no full-frame, centered or guessed ROI fallback. CSS length/calc object-position and transforms other than identity/horizontal mirror remain deliberately unsupported.
- Signature/telemetry is geometry-only; it excludes camera/device IDs, barcode payloads, employee identifiers, URLs and personal data.

**SC-03 evidence:** PR #146 head `d4b8fcae54901f53cf45b4ebf7a73fc6436516ab`; CI #1332 passed full preflight, TypeScript/production build, PR-base baseline build and bundle comparison. Deterministic coverage includes mapper variants, signature inputs, stable/invalid epoch transitions, delayed old-revision rejection, observer invalidation and cleanup.

**Acceptance boundary:** User confirms current app flow has no observed errors and operates normally. Software/CI scope is complete; viewport/orientation behavior on physical iOS Safari/PWA and Android Chrome/PWA remains device QA and is not inferred from CI.

## 11. Active stabilization workstream

The staged SC-01A/01B/01C → SC-02 → SC-03 → SC-04 → SC-05 sequence is tracked in [SCANNER_WORKSTREAM_SC01_05.md](./SCANNER_WORKSTREAM_SC01_05.md). SC-01A/01B/01C, SC-02, SC-03 and SC-04 software/CI scopes are closed at their documented boundaries. SC-04 Focus Recovery Policy is merged to main at `0b6840c9b2872d93920d4eba5f628158e09679b4` with CI #1348 passed on its code/test head. Worker phases remain isolated from production session/Home/Stocktake. Camera ownership, module ROI, decoder allowlist, recognition order and feature workflows remain protected. Physical viewport/orientation and focus behavior remain device QA gates. SC-05 Integration & QA is the current phase. SC-01A transport/API evidence is in [SCANNER_SC01A_SPIKE_FINDINGS.md](./SCANNER_SC01A_SPIKE_FINDINGS.md).

## 12. SC-04 Focus Recovery Policy

The existing ROI focus-quality monitor now exposes a passive state policy: `observing`, `waiting-native-autofocus`, `recovered`. It only uses existing baseline-scale ROI samples and preserves the stable-motion gate, relative sharpness thresholds, four-sample blur gate and 8-second cooldown. Sustained blur emits bounded guidance to wait for native autofocus and steady/adjust distance; sharpness recovery returns to normal observation.

**Hard boundary:** post-preview camera constraint writes are disabled (`cameraConstraintWriteBudget: 0`). SC-04 does not call `applyConstraints`, re-arm autofocus, restart/reacquire the stream, add a timer, increase frame captures or change decoder candidate budgets. Invalid/moving samples cannot trigger recovery. Existing ROI baseline reset resets the policy. This is a passive observation/recommendation—not a guarantee that physical autofocus succeeded.

PR #148 merged to main at `0b6840c9b2872d93920d4eba5f628158e09679b4`. CI #1348 passed full preflight, TypeScript, production/Pages build and PR-base bundle comparison on code/test head `fa4349344eb9fd80d8d487942113ea5560cae6e5`. Physical iOS/Android near/far focus QA remains separate.
## 14. SC-05 Integration & QA

**Software scope closure:** PR #149 merged at `e0579fa1734eac989af051c4776cc88de912c946`; final PR-head CI #1375, post-merge CI #1376 and Pages deployment #151 passed. PR #150 test-only follow-up merged at `661241e721a5510cf3f61c8ba7c3971c82b6a63c`; final-head CI #1384, post-merge CI #1385 and Pages deployment #152 passed. Physical optical/device QA remains NOT RUN.

SC-05 validates cross-layer composition before introducing any new scanner algorithms. The current integration uses one `useScannerEngine` → `UniversalScannerSession` path shared by Home and Stocktake. Camera lease remains in the shared camera service; feature-owned preview ROI and geometry versions are published through the existing hook. Health recovery is bounded, focus guidance is passive, adaptive runtime budget is passed to the production WASM adapter and no Worker runtime is part of the production path.

The cross-layer source-contract test is `scripts/test-scanner-sc05-integration.mjs` and is registered in `scripts/preflight.mjs`. Existing focused regression/decoder-fixture tests remain the detailed subsystem authority. QA device matrix, run-record and local corpus protocol are in [SCANNER_SC05_INTEGRATION_QA.md](./SCANNER_SC05_INTEGRATION_QA.md).

The SC-04 passive focus recovery state/action/guidance remains internal to the runtime policy. The former collector and Home QA Monitor were removed; no new controller, camera command or capture path is introduced.

Software CI is not physical-device or optical acceptance. No scan-accuracy, false-positive, focus distance, cross-platform or latency threshold may be claimed until a labelled corpus and real-device run records support it. SC-05 release acceptance must show actual test results or list the remaining device/corpus blocker.
## 15. Change protocol

For every scanner change:
1. Read this document and the exact source/tests involved.
2. State the ownership boundary and observable behavior being changed.
3. Add focused positive, negative and boundary regression tests.
4. Preserve Home and Stocktake behavior unless the task explicitly changes their contracts.
5. Run `npm run preflight`, TypeScript, production build and Pages build through CI.
6. Record physical-device evidence separately; never infer it from CI.
7. Update this document only when the implementation contract changes. Put incident observations in the history log with date, evidence, resolution and current status.
8. For SC-01–05 work, satisfy the phase-specific gates in `SCANNER_WORKSTREAM_SC01_05.md`; do not claim a phase complete from source inspection alone.
