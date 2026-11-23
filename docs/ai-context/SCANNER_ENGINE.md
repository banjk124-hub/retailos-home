# Scanner Engine — current technical source of truth

**Status:** Production scanner remains ZXing-C++ WASM on the Main Thread through the current adapter. SC-01A/01B/01C Worker work is isolated prototype code and is not connected to the production session.
**Last reconciled:** 2026-11-23
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

## 6. Diagnostics and privacy

Scanner QA diagnostics are in-memory and use an explicit allowlist. Barcode payloads, camera device identifiers, employee identifiers and persistent device identifiers must not be exported. Add new metrics only when they are non-sensitive, bounded and useful for a named QA question.

Known diagnostic limitation: native ZXing-C++ result geometry/orientation metadata is not yet normalized into the RetailOS `DecoderOutput.geometry` contract. Do not claim position overlays or native rotation hit attribution are available until the adapter, diagnostics allowlist and tests are updated together.

## 7. Verified capabilities vs. release acceptance

**Automated architecture evidence currently present**
- WASM-only factory and no-legacy preflight guard.
- Real WASM adapter integration harness and generated barcode fixtures.
- Regression tests for ROI, scaling, validation, pipeline ordering, lifecycle, diagnostics and WASM options.
- TypeScript, production build and Pages build run in CI.

**Still requires optical / physical evidence**
- Labelled corpus from real supermarket packaging and shelf labels, including negative samples.
- Exact-match, miss, wrong-decode and false-positive rates by symbology and condition.
- Glare, blur, motion, curved packaging, low contrast, distance, skew and ROI-edge conditions.
- iOS Safari/PWA, Android Chrome/PWA and low-end Android acceptance.
- Home lookup and Stocktake capture/save end-to-end acceptance.

A green CI run proves code contracts and build health, not optical accuracy or physical-device performance.

## 8. Known limitations / deferred engineering

1. No dedicated scanner Worker boundary yet; WASM decode and image preparation execute through the current adapter path.
2. Device profile is advisory; low-end initial camera resolution, cadence and pre-decode budgets are not yet fully adapted.
3. Geometry generation budget is applied after some candidate preparation work; measure and move the guard earlier only with regression coverage.
4. Adapter currently discards native `position`, `rotation`, `isMirrored`, `isInverted` and `symbologyIdentifier` metadata.
5. Diagnostic collector does not yet retain every emitted geometry / image-quality metric.
6. `tryDenoise` is experimental and needs A/B optical evidence by 2D symbology.
7. RGBA → luminance → RGBA conversion may add avoidable allocations; benchmark before changing the input path.
8. EAN-2 / EAN-5 add-on symbols remain ignored by the current reader configuration.

These are explicit follow-up items, not reasons to reintroduce the retired decoder or rewrite camera/session ownership.

## 9. Camera Health Controller (SC-02)

`ScannerCameraHealthController` observes camera frame progress separately from scanner UI lifecycle. The session starts a 1-second watchdog once decoding enters SCANNING; 3 seconds without frame-progress evidence transitions to STALLED and requests one bounded automatic recovery. Native `requestVideoFrameCallback` is preferred. RAF compatibility mode is considered healthy only when the video media timeline advances (`currentTime` delta greater than 5 ms). `mute` degrades health; `unmute` does not declare healthy without recent frame progress. `track-ended` triggers immediate recovery request.

Recovery is delegated to `useScannerEngine` and reuses the existing serialized session retirement / video-surface replacement / lease reacquisition / fresh-frame startup path. The controller permits one attempt, with a 10-second cooldown policy; the hook also caps automatic health recovery to one for the mounted scanner activation to prevent a new-session loop. Failed or exhausted recovery escalates to scanner ERROR, leaving the user a close/reopen action. Watchdog and track listeners are cleared on teardown. Health callback diagnostics are bounded scalar snapshots only.

**SC-02 evidence (2026-11-23):**
- PR #144 final head `d7fff2755275b54d52505eb6ec39e04624793817` merged as `7e134f01b8df41d0a6c2d805d78fb1501b9d3631`.
- PR CI #1319 passed (preflight, TypeScript/production + Pages builds and bundle comparison); main CI #1320 passed; Pages deployment #147 succeeded on the merge commit.
- Follow-up PR #145 final head `c203fb36ae1734188e958bc7c3506fb0f95ead08` merged as `53824257486e628635a693a22c893e8d9648d313`. CI #1324 and main CI #1325 passed; Pages deployment #148 succeeded on that main commit.
- PR #145's actual changed-file list contains only `scripts/test-scanner-camera-health.mjs`; its description said the documentation was synchronized, but the canonical scanner documents were still stale. This correction reconciles those documents on a separate docs branch.
- All 41 `scripts/test-*.mjs` harnesses on main were fetched and scanned for SC-02/session import references. The two harnesses that transpile and execute `UniversalScannerSession` (`test-scanner-decoder-factory.mjs`, `test-scanner-preview-region.mjs`) both contain an explicit `./scannerCameraHealthController` stub. `test-scanner-camera-health.mjs` loads the controller directly; other matches read source for assertions rather than importing the session graph. No missing SC-02 import stub was found in this audit.
- Automated coverage remains deterministic controller-state tests and source contracts, not full live-camera/session race integration.

CI/build/deploy are software validation. A deliberate live-camera stall, track-ended injection, recovery success/failure, close/background interleavings and device matrix remain manual QA gates; do not infer them from CI.

## 10. Active stabilization workstream

The staged SC-01A/01B/01C → SC-02 → SC-03 → SC-04 → SC-05 sequence is tracked in [SCANNER_WORKSTREAM_SC01_05.md](./SCANNER_WORKSTREAM_SC01_05.md). SC-02 software/CI closure is documented against the final PR #144 head `d7fff2755275b54d52505eb6ec39e04624793817`, merge commit `7e134f01b8df41d0a6c2d805d78fb1501b9d3631`, CI #1319/#1320 and deployment #147. The post-merge test-only follow-up PR #145 merged at `53824257486e628635a693a22c893e8d9648d313`; main CI #1325 and Pages deployment #148 passed. This current main commit is the documentation correction baseline. SC-03 Geometry Diagnostics is active in PR #146; latest CI #1332 passed at head `d4b8fcae54901f53cf45b4ebf7a73fc6436516ab`. None of the Worker phases is wired into UniversalScannerSession, Home or Stocktake. Camera ownership, module ROI, decoder allowlist, recognition order and feature workflows remain protected. Live-camera fault injection, recovery success/failure and device/browser QA remain operational acceptance gates, not CI claims. The SC-01A transport/API evidence and remaining empirical proof gates are recorded in [SCANNER_SC01A_SPIKE_FINDINGS.md](./SCANNER_SC01A_SPIKE_FINDINGS.md).
## 11. Change protocol

For every scanner change:
1. Read this document and the exact source/tests involved.
2. State the ownership boundary and observable behavior being changed.
3. Add focused positive, negative and boundary regression tests.
4. Preserve Home and Stocktake behavior unless the task explicitly changes their contracts.
5. Run `npm run preflight`, TypeScript, production build and Pages build through CI.
6. Record physical-device evidence separately; never infer it from CI.
7. Update this document only when the implementation contract changes. Put incident observations in the history log with date, evidence, resolution and current status.
8. For SC-01–05 work, satisfy the phase-specific gates in `SCANNER_WORKSTREAM_SC01_05.md`; do not claim a phase complete from source inspection alone.
