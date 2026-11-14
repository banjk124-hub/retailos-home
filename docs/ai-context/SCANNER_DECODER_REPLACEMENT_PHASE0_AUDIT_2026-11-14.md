# Scanner Decoder Replacement — Phase 0 Source Audit

**Audit date:** 2026-11-14  
**Repository:** `banjk124-hub/retailos-home`  
**Branch:** `main`  
**Audited commit:** `51ba78d7afd7ee9e5b1c0cf33c05b9eeb0337ca6` (merge PR #106)  
**Scope:** read-only source, dependency, test and documentation audit for a future decoder replacement.  
**Runtime changes:** none.  
**Status:** Phase 0 source inspection complete; physical-device and quantitative recognition baselines remain unmeasured.

> This document is the current Phase 0 reference for the proposed decoder replacement. Older scanner audit and implementation documents remain useful as historical evidence, but their branch status, implementation status and some source facts must not be treated as current without checking this baseline.

---

## 1. Executive result

RetailOS already has a meaningful separation between feature presentation, a shared React bridge, a platform session, camera lease management, a decoder adapter interface and barcode validation. The existing scanner should therefore **not** be rewritten as a whole.

The replacement target is narrower:

- Replace the current `@zxing/library` JavaScript decoder backend with a measured ZXing-C++ WebAssembly backend.
- Make decoder selection injectable. The session currently imports and constructs `ZXingDecoderAdapter` directly, so the existing interface is not yet a replaceable runtime boundary.
- Keep the camera lease, camera lifecycle/recovery, session identity/generation protections, strict module-owned ROI, feature-owned presentation, validation and module business workflows.
- Re-evaluate image-processing helpers against the new backend using measured decode success, false positives, latency, memory and cross-platform behavior. Do not delete them merely because the new decoder advertises a feature.
- Do not enable additional symbologies until each format has an explicit allowlist entry, payload policy, fixture coverage and Home/Stocktake handoff tests.

### Current facts that drive the decision

| Area | Verified current state |
|---|---|
| Decoder package | `@zxing/library ^0.23.0` is the direct runtime dependency |
| Runtime backend | `ZXingDecoderAdapter`, created inside `UniversalScannerSession.createDecoder()` |
| Adapter abstraction | `ScannerDecoderAdapter` exists, but no runtime factory/injection point is used |
| Execution | Canvas / `drawImage` / pixel readback / ZXing run on the main thread |
| Worker / WASM | No scanner Worker, `OffscreenCanvas` or WebAssembly decoder implementation was found in the current source |
| Capability type | `ScannerCapabilities.worker` and `.webAssembly` are declared, but are not a functioning capability-detection or runtime path |
| Format allowlist | EAN-8, EAN-13, CODE-128 and CODE-39 only |
| Camera request | Ideal rear camera, 1920×1080, 30 FPS; actual track settings are browser/device negotiated |
| Preview sequencing | First usable video frame is published to the feature before decoder initialization |
| Consumers | Home barcode lookup and Stocktake scanner are the two camera-scanner consumers |
| QA | 24 scanner regression scripts are wired into `preflight`; physical-device evidence and quantitative optical corpus baseline are not present in this audit |

## 2. Repository baseline and scope

The GitHub repository default branch is `main`. The audited tree is complete (`truncated = false`) and contains 242 file blobs at the audited commit.

The audit inventory is grouped by responsibility, rather than treating every filename containing “scanner” as decoder code:

| Group | Files | Scope |
|---|---:|---|
| Platform scanner | 23 | Session, contracts, decoder, recognition policy and transforms |
| Feature scanner | 16 | React bridge, Home scanner UI, settings, diagnostics and feature services |
| Shared camera services | 3 | Camera lease, safe camera diagnostics and frame capture |
| Feature consumers / QA | 5 | Home, Stocktake, Stocktake exit gate and Scanner QA Monitor |
| Scanner-related styles | 3 | QA/settings styles and Stocktake scanner presentation styles |
| Scanner tests | 24 | Recognition, validation, lifecycle, camera, presentation and diagnostics |
| Scanner architecture / phase docs | 26 | Current architecture, dated audits, phase records and handoff/status docs |

The inventory is intentionally wider than the decoder replacement boundary. It captures dependencies that must be protected or reviewed, not candidates for wholesale replacement.

### 2.1 Platform scanner inventory — 23 files

| File | Current responsibility | Phase 0 disposition |
|---|---|---|
| `barcodeValidation.ts` | Payload and format-specific validation | **KEEP** — validation remains authoritative and backend-independent |
| `cameraRequestResolver.ts` | Builds camera constraints and checks stream compatibility | **KEEP** — outside decoder scope |
| `contracts.ts` | Shared scanner types, allowlist, camera and session contracts | **KEEP / controlled extension** — preserve existing public contracts; extend only where required |
| `decoders/decoderAdapter.ts` | Decoder input/output and adapter interface | **REWORK** — normalize backend boundary and remove unnecessary implementation-specific coupling |
| `decoders/rgbaToLuminance.ts` | RGBA-to-grayscale conversion | **REWORK / benchmark** — retain only if the selected pipeline still needs this conversion |
| `decoders/zxingDecoder.ts` | Current ZXing JS backend plus canvas, ROI and recognition-pipeline integration | **REPLACE after parity** — do not delete until the new backend passes the acceptance gates |
| `scannerAdaptiveProcessingController.ts` | A2 optional image-transform policy | **KEEP / decouple** — preserve as a backend-neutral policy if still useful |
| `scannerAdaptiveRuntimeController.ts` | A3 bounded optional-candidate budget based on runtime pressure | **KEEP / decouple** — not a device-tier selector or decoder |
| `scannerDeskew.ts` | Bounded in-plane skew estimation and luminance warp | **BENCHMARK** — compare against backend rotation support; not equivalent to perspective correction |
| `scannerEnhancementPipeline.ts` | Candidate ordering and early-exit orchestration | **REWORK** — retain one bounded, baseline-first recognition orchestrator independent of decoder implementation |
| `scannerFocusQuality.ts` | Passive ROI focus/image quality measurement | **KEEP** — observation only; not a camera-control implementation |
| `scannerGeometry.ts` | Preview-to-source coordinate mapping | **KEEP** — this is a coordinate contract, not a decoder transform |
| `scannerGeometryCorrection.ts` | Bounded 1D barcode geometry candidates | **BENCHMARK / REWORK** — compare measurable value and cost; do not equate it with general CV or a ZXing rotation option |
| `scannerImageEnhancement.ts` | Image-quality measurement and optional image variants | **BENCHMARK / REWORK** — retain only transforms proven to improve the corpus |
| `scannerImageQualityProfile.ts` | Scalar A1 findings from focus/image measurements | **KEEP** — diagnostic semantics remain separate from decode |
| `scannerLifecycleAdapter.ts` | Technical lifecycle event adapter | **KEEP** — presentation completion must remain feature-owned |
| `scannerPageLifecycleCoordinator.ts` | Serializes page lifecycle operations | **KEEP** — no decoder migration should alter recovery ordering |
| `scannerRoi.ts` | Strict source-frame ROI crop resolution | **KEEP** — missing/invalid ROI must fail closed |
| `scannerRotation.ts` | Luminance quarter-turn transform | **BENCHMARK** — compare with backend rotation; retain only if needed |
| `scannerScale.ts` | Bounded ROI source sizing and 1.5× / 1× / 2× candidates | **BENCHMARK / REWORK** — avoid redundant scaling if the selected backend already provides a better measured path |
| `scannerTemporalRecognition.ts` | Bounded copied grayscale history and fallback selection | **KEEP pending benchmark** — current-frame hit and validator rejection semantics must not be weakened |
| `scannerTorch.ts` | Capability-gated torch state/control | **KEEP** — camera-track concern, not decoder concern |
| `universalScannerSession.ts` | Session lifecycle, camera lease, frame scheduling, decoder orchestration, validation and result delivery | **REWORK narrowly** — retain lifecycle/session ownership; extract decoder creation behind a factory and keep recognition policy separable |

### 2.2 Feature scanner inventory — 16 files

| File | Current responsibility | Phase 0 disposition |
|---|---|---|
| `components/BarcodeScanner.tsx` | Home full-screen scanner presentation and local close gate | **KEEP** |
| `components/ScannerSettingsPanel.tsx` | Scanner feedback/settings UI | **KEEP** |
| `hooks/useScannerEngine.ts` | React bridge, session creation and foreground recovery | **REWORK narrowly** — use the decoder factory without moving presentation or recovery ownership |
| `hooks/useScannerPreviewRegionBinding.ts` | Publishes current feature reticle as source-frame ROI | **KEEP** |
| `hooks/useScannerSettings.ts` | React subscription to settings store | **KEEP** |
| `hooks/useScannerViewportStyle.ts` | Visual viewport sizing for feature presentation | **KEEP** |
| `scanner-transition.css` | Home/Stocktake scanner presentation and transitions | **KEEP** |
| `services/barcodeLookup.ts` | Home cached barcode lookup | **KEEP** |
| `services/cameraErrors.ts` | User-facing camera error mapping | **KEEP** |
| `services/captureScannerPreviewFrame.ts` | Frozen preview capture for feature exit presentation | **KEEP** |
| `services/scannerAudio.ts` | Web Audio unlock and beep | **KEEP** |
| `services/scannerCapabilities.ts` | Mobile-platform gate using Android/iOS user-agent and touch-iPad checks | **KEEP / clarify naming** — this is not WASM/Worker decoder capability detection |
| `services/scannerDiagnosticCollector.ts` | Privacy-projected local diagnostic collection | **KEEP / extend carefully** — backend metrics must pass an explicit allowlist |
| `services/scannerFeedback.ts` | Beep/vibration feedback orchestration | **KEEP** |
| `services/scannerPreviewRegion.ts` | Visible preview/reticle to source-frame ROI mapping | **KEEP** |
| `services/scannerSettingsStore.ts` | Local scanner settings persistence | **KEEP** |

### 2.3 Shared camera services — 3 files

| File | Current responsibility | Phase 0 disposition |
|---|---|---|
| `src/shared/services/cameraCapture.ts` | Generic JPEG frame capture | **KEEP / outside decoder boundary** |
| `src/shared/services/cameraDiagnostics.ts` | Safe camera-track settings projection | **KEEP** |
| `src/shared/services/cameraSession.ts` | Shared camera stream, lease, one-claim request, cancellation, compatibility and release | **KEEP / protected** — do not combine with decoder migration |

### 2.4 Consumers, QA and presentation styles

| File | Current responsibility | Phase 0 disposition |
|---|---|---|
| `src/features/home/HomeScreen.tsx` | Opens Home scanner, starts tap-origin lease, handles cached lookup | **KEEP / protected consumer** |
| `src/features/home/components/ScannerQaMonitor.tsx` | Reads, filters and exports scanner diagnostics | **KEEP** |
| `src/features/stocktake/components/StocktakeModule.tsx` | Opens Stocktake scanner, accepts barcode into form and manages explicit save | **KEEP / protected consumer** |
| `src/features/stocktake/components/StocktakeScanner.tsx` | Stocktake-owned scanner presentation and local exit gate | **KEEP / protected consumer** |
| `src/features/stocktake/services/stocktakeScannerExitGate.ts` | Joins technical close milestones with Stocktake presentation completion | **KEEP** |
| `src/features/stocktake/components/stocktake.css` | Stocktake scanner preview/presentation layout among other module styles | **KEEP** |
| `src/styles/scanner-qa-monitor.css` | QA Monitor presentation | **KEEP** |
| `src/styles/scanner-settings.css` | Scanner Settings presentation | **KEEP** |

Stocktake Import is not a camera scanner consumer. Its XLSX parsing/import workflow and `scripts/test-stocktake-import.mjs` are outside the decoder replacement scope.

### 2.5 Scanner regression scripts — 24 files

All remain part of the regression safety net. Some decoder/pipeline tests will need backend-neutral adaptation after the new adapter is integrated; lifecycle, camera, presentation and validation tests must not be discarded to make a new backend pass.

1. `test-scanner-adaptive-processing-a2.mjs`
2. `test-scanner-adaptive-runtime-a3.mjs`
3. `test-scanner-audio-runtime.mjs`
4. `test-scanner-camera-request.mjs`
5. `test-scanner-decoder-integration.mjs`
6. `test-scanner-deskew.mjs`
7. `test-scanner-diagnostics.mjs`
8. `test-scanner-enhancement-pipeline.mjs`
9. `test-scanner-focus-quality.mjs`
10. `test-scanner-geometry.mjs`
11. `test-scanner-image-quality-profile.mjs`
12. `test-scanner-image-quality.mjs`
13. `test-scanner-lifecycle.mjs`
14. `test-scanner-presentation.mjs`
15. `test-scanner-preview-region.mjs`
16. `test-scanner-roi-decoder.mjs`
17. `test-scanner-rotation-baseline.mjs`
18. `test-scanner-rotation.mjs`
19. `test-scanner-scale.mjs`
20. `test-scanner-settings.mjs`
21. `test-scanner-temporal-recognition.mjs`
22. `test-scanner-torch.mjs`
23. `test-scanner-track-constraints.mjs`
24. `test-scanner-validation.mjs`

### 2.6 Documentation inventory and authority

The scanner documentation set includes:

- Current architecture/status navigation: `AI_HANDOFF.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_STATUS.md`, `INDEX.md`, `ROADMAP.md`, `SESSION_LOG.md`.
- Recognition stages: `SCANNER_RECOGNITION_PIPELINE.md`, `SCAN_01_INPUT_CONTRACT.md`, `SCAN_02_GEOMETRY_MAPPING.md`, `SCAN_03_MODULE_REGION_INTEGRATION.md`, `SCAN_04_STRICT_ROI_DECODING.md`, `SCAN_05_ORTHOGONAL_ROTATION.md`, `SCAN_06_BOUNDED_DESKEW.md`, `SCAN_07_ADAPTIVE_ROI_MULTISCALE.md`, `SCAN_07_SYSTEM_SYNCHRONIZATION_AUDIT.md`, `SCAN_07_11_RESEARCH_AND_IMPLEMENTATION_PLAN.md`, `SCAN_08_09_UNIFIED_IMPLEMENTATION.md`, `SCAN_10_ADAPTIVE_IMAGE_QUALITY_A1.md`, `SCAN_11_ADAPTIVE_PROCESSING_A2.md`, `SCAN_12_ADAPTIVE_RUNTIME_A3.md`.
- Dated audits: `SCANNER_SOURCE_AUDIT_2026-11-08.md`, `SCANNER_BACKGROUND_RECOVERY_AUDIT_2026-11-08.md`, `SCANNER_C2_AUDIT_2026-11-08.md`, `SCANNER_VIDEO_PRESENTATION_AUDIT_2026-11-09.md`, `SCANNER_TORCH_AUDIT_2026-11-09.md`, `SCANNER_AUDIO_LIFECYCLE_2026-11-09.md`.

Dated audits remain historical evidence. The current source and this Phase 0 audit take precedence for the decoder replacement. `IMPLEMENTATION_STATUS.md` and `ROADMAP.md` remain the repository-wide current-status/sequence documents and should be synchronized when the implementation phase is approved.

---

## 3. Dependency map

### 3.1 Current runtime dependency flow

```text
HomeScreen
  ├─ tap-origin requestCameraLease()
  ├─ BarcodeScanner (Home-owned presentation)
  └─ cached barcode lookup
             │
             ▼
StocktakeModule
  ├─ tap-origin requestCameraLease()
  ├─ StocktakeScanner (Stocktake-owned presentation)
  └─ acceptBarcode() → form state → explicit save
             │
             ▼
Feature React bridge
  useScannerEngine
  ├─ feature-owned video element / preview surface
  ├─ page lifecycle recovery coordinator
  └─ creates UniversalScannerSession
             │
             ▼
UniversalScannerSession
  ├─ shared camera lease service
  ├─ attach stream / wait for usable video frame
  ├─ publish preview-ready before decoder init
  ├─ currently constructs ZXingDecoderAdapter directly
  ├─ serialized frame/decode scheduling
  ├─ current-frame + temporal fallback orchestration
  ├─ barcode validation / single-continuous policy
  └─ technical lifecycle events / teardown
             │
             ├──────────────► cameraSession
             │                  ├─ cameraRequestResolver
             │                  └─ cameraDiagnostics
             │
             ▼
ZXingDecoderAdapter (current backend)
  ├─ Canvas drawImage and ROI crop
  ├─ RGBA → luminance
  ├─ ROI scale candidates
  ├─ enhancement pipeline
  │    ├─ rotation / deskew
  │    ├─ image-quality and A2 policy
  │    └─ geometry correction
  ├─ ZXing MultiFormatReader
  └─ decoder diagnostics
             │
             ▼
scannerDiagnosticCollector → ScannerQaMonitor
```

### 3.2 Direct coupling that blocks clean replacement

1. `UniversalScannerSession.createDecoder()` performs a dynamic import of `./decoders/zxingDecoder` and calls `new ZXingDecoderAdapter()`. The session therefore knows a concrete backend despite holding the instance through the adapter interface elsewhere.
2. `DecoderAdapter` is not yet a minimal backend boundary. Its decode options include focus-quality callbacks, temporal snapshot callbacks and an A3 runtime budget type. These are current recognition-pipeline concerns, not necessarily responsibilities of a low-level WASM decoder.
3. `zxingDecoder.ts` owns both actual ZXing calls and much of the image candidate orchestration / image measurement integration. This makes it difficult to compare a new backend without also moving or duplicating recognition policy.
4. The current decoder integration harness imports and instantiates `ZXingDecoderAdapter` directly. It must be split into backend-specific tests and backend-neutral contract/corpus tests rather than simply deleted.
5. `ScannerCapabilities` declares Worker and WebAssembly booleans but there is no corresponding runtime detection, worker lifecycle or WASM loading path. `scannerCapabilities.ts` is only the mobile platform gate used by Home and Stocktake.
6. `ScannerProfileName` includes COMPACT/STANDARD/HIGH, but `useScannerEngine` currently passes HIGH unconditionally. The A3 runtime controller adapts optional candidate budgets from observed decode duration/frame gaps; it does not implement hardware-tier selection.

### 3.3 Confirmed absence in the current source

The source search found no scanner implementation of:

- `new Worker(...)` or a dedicated scanner decode worker;
- `OffscreenCanvas`;
- a WebAssembly decoder runtime or a `WebAssembly` API use;
- `barcode-detector` or `zxing-wasm`.

The only source-level `WebAssembly` match is the `ScannerCapabilities.webAssembly` type property. This is a declaration, not evidence that WASM is already used.

---

## 4. Current runtime flow

### 4.1 Open and camera acquisition

1. Home and Stocktake initiate `requestCameraLease()` from the initiating user gesture before the scanner presentation mounts.
2. The request is cancellable before claim and single-claim when handed to the platform session.
3. `UniversalScannerSession.startInternal()` claims the supplied request or acquires a lease, checks for a live video track and binds track-ended handling.
4. The session attaches the stream to the feature-supplied video element, calls `play()`, and waits for a usable frame.
5. Preview-ready is published before decoder initialization. This sequencing allows the feature to reveal live video while the decoder chunk initializes.
6. The current decoder is then dynamically imported, initialized with the configured allowlist, and only after successful initialization does the session enter scanning and schedule frames.

**Protected:** do not introduce a second `getUserMedia()` call, delay preview-ready until WASM is ready, or change the tap-origin lease handoff as part of decoder integration.

### 4.2 Frame recognition

- The session schedules from `requestVideoFrameCallback` where available and uses a requestAnimationFrame fallback path.
- Decode work is serialized; overlapping reader calls and unbounded decode queues are not allowed.
- The current adapter accepts a feature-owned `source-frame-normalized` ROI. Missing/invalid geometry produces a miss; it must not trigger full-frame or centered fallback decoding.
- The current ROI is cropped and bounded before candidate processing. The documented/current source policy preserves the 1.5× baseline candidate and bounded alternate scales.
- Baseline-first, bounded orientation/deskew/image/geometry work and temporal fallback must remain explicit, measurable policy. A backend's `tryRotate` or `tryDownscale` capability is not by itself proof that it can replace every existing candidate stage.
- The session validates every returned value before result delivery. A decoder result rejected by validation must not be overridden by a temporal fallback.
- Single mode claims one accepted result and closes the session; continuous mode applies the existing same-code cooldown.

### 4.3 Close, recovery and ownership

- Camera acquisition, stream ownership and release remain in `cameraSession.ts` / `UniversalScannerSession`.
- The platform lifecycle contract emits technical milestones only.
- Home and Stocktake own their video surfaces, reticles, transitions and presentation completion.
- Home's quick lookup uses cached barcode data; Stocktake forwards a detected barcode into form state. Stocktake persistence remains an explicit operator action.
- Torch is capability-gated from the active camera track and must remain non-fatal.
- QA Monitor observes diagnostics; it must not control camera, session or decoder lifecycle.

---

## 5. Recognition policy and symbology baseline

### 5.1 Active formats

The shared type and decoder mapping contain a broader set of names, but the active runtime allowlist is exactly:

- `EAN_8`
- `EAN_13`
- `CODE_128`
- `CODE_39`

The decoder checks requested formats against `SUPPORTED_BARCODE_FORMATS`; payload validation is downstream in `UniversalScannerSession`. The existence of `UPC_A`, `UPC_E`, `QR_CODE`, `DATA_MATRIX`, `PDF_417`, `AZTEC` and other members in the broad type/mapping does not mean they are enabled.

### 5.2 Format expansion gate

Do not expand formats merely because ZXing-C++ supports them. Each candidate format requires:

1. explicit allowlist enablement;
2. format-specific payload and checksum policy;
3. positive, negative and malformed fixtures;
4. false-positive tests;
5. Home lookup semantics (for product identifiers);
6. Stocktake form-fill semantics;
7. clear treatment of non-product payloads such as QR URLs/text.

Suggested prioritization for a later, separately reviewed phase: retail 1D formats first (EAN/UPC/Code 128/Code 39), then QR/Data Matrix only with explicit business handling, then other 2D formats if a real operational requirement exists. This is a planning recommendation, not a current implementation commitment.

---

## 6. Source/documentation reconciliation findings

| Existing document | Source discrepancy found at the audited commit | Required treatment |
|---|---|---|
| `SCANNER_RECOGNITION_PIPELINE.md` | Its “not implemented” section still says SCAN-08 image enhancement, SCAN-09 geometry correction and SCAN-10 adaptive budgets are not implemented. Current source contains `scannerImageEnhancement.ts`, `scannerGeometryCorrection.ts`, A2 and A3 controllers, with the pipeline wired into the current decoder. | Treat its design boundaries as useful, but its implementation status and next-step sequence are stale. Synchronize in a docs-only follow-up. |
| `SCAN_08_09_UNIFIED_IMPLEMENTATION.md` | Header still identifies PR #81 as a draft and its acceptance checklist remains unchecked. Current source includes the unified enhancement pipeline, image enhancement and geometry correction. | Preserve as a historical implementation record; add current-source pointer/status rather than treating its old PR state as current. |
| `SCANNER_SOURCE_AUDIT_2026-11-08.md` | Explicitly marked historical/superseded, but contains older source facts such as full-frame/centered fallback behavior and a 1280×720 camera request that do not match the audited current contract/source. | Keep historical; do not reuse its source facts without revalidation. |
| `SCANNER_BACKGROUND_RECOVERY_AUDIT_2026-11-08.md` | Explicitly identifies itself as pre-PR #43 historical material. | Keep as history; current recovery source and newer presentation audit take precedence. |
| `SCANNER_C2_AUDIT_2026-11-08.md` | Explicitly says its lifecycle ownership model was superseded by technical-only lifecycle separation. | Keep as history; do not use its old presentation milestone contract. |
| `SCANNER_VIDEO_PRESENTATION_AUDIT_2026-11-09.md` | Later source audit of presentation ownership; remains consistent with current Home/Stocktake component split and technical-only platform lifecycle boundary. | Retain as supporting evidence for protected contracts; it is not a decoder capability audit. |
| `SCAN_10_ADAPTIVE_IMAGE_QUALITY_A1.md`, `SCAN_11_ADAPTIVE_PROCESSING_A2.md`, `SCAN_12_ADAPTIVE_RUNTIME_A3.md` | These describe the current A1/A2/A3 recognition observation and candidate-budget architecture; current source contains the corresponding modules. They do not establish low/mid/high device-tier adaptation. | Retain, but clarify A3 runtime pressure adaptation versus future hardware-tier policy. |
| `SCANNER_TORCH_AUDIT_2026-11-09.md` and `SCANNER_AUDIO_LIFECYCLE_2026-11-09.md` | Feature/camera support evidence, not decoder evidence. | Preserve as orthogonal subsystem records. |

**Important distinction:** SCAN-08/09 image processing and A2/A3 candidate-budget controls exist in current source. That does not prove every transform improves physical recognition, nor does it mean hardware-tier adaptation, Worker execution or WASM decoding already exists.

---

## 7. Protected contract — no decoder migration regression

The following contracts are out of scope for decoder replacement unless a separate change is explicitly reviewed and approved.

### Camera and session
- Tap-origin camera lease request, cancellation-before-claim and one-time claim.
- Shared camera stream ownership, compatibility checks, reference-counted lease release and no duplicate camera request.
- Generation protection against stale asynchronous work.
- Track-ended handling and foreground/background suspend/resume/recovery.
- Fresh video surface recovery and first usable frame readiness.
- Preview-ready publication before decoder initialization.
- Current camera intent: rear-facing, ideal 1920×1080 at 30 FPS; browser negotiation may provide lower actual settings.
- Native/browser focus negotiation remains a camera concern; image-quality observation must not become an awaited autofocus prerequisite.
- Existing torch capability detection and serialized track constraints.

### Recognition and result correctness
- Strict feature-owned ROI; no full-frame fallback, centered fallback or crop expansion.
- Preview-content → source-frame coordinate mapping, including object-fit/object-position and mirroring behavior.
- Serialized decode calls and bounded candidate budgets.
- Baseline-first recognition; optional enhancement must not delay or displace the baseline.
- Existing validator remains authoritative; no payload can bypass it.
- A decoder output rejected by validation blocks temporal fallback for that attempt.
- Preserve CODE-128 as an opaque string; do not coerce it into a numeric identifier.
- Preserve single/continuous semantics, single-result terminal close and continuous same-code cooldown.

### Feature and product ownership
- Home owns full-screen scanner presentation, close animation and cached barcode lookup.
- Stocktake owns its separate framed scanner presentation and exit gate.
- Stocktake scan result populates form state; persistence remains explicit operator save.
- The platform session emits technical lifecycle events only; it never owns feature presentation completion or tells a feature how to exit.
- Scanner Settings, audio, vibration, torch controls and QA Monitor remain independent feature services.

### Platform/release
- Android Chrome/PWA and iOS Safari/PWA must both remain supported.
- No auth/session, IndexedDB schema, Apps Script payload, backend, service-worker cache policy, module ID or deployment contract changes.
- No decoder UI, presentation, navigation or business workflow ownership.
- No permanent dual-decoder runtime. A temporary comparison harness is acceptable; production must have one selected backend after cutover, with rollback through a reversible PR/commit.

---

## 8. Baseline report

### 8.1 Automated baseline

The audited `main` commit is:

`51ba78d7afd7ee9e5b1c0cf33c05b9eeb0337ca6`

GitHub Actions RetailOS CI run **#1002** (`43577726061`) for this exact commit completed successfully on 2026-11-14. The repository `preflight` script includes the 24 scanner regression scripts listed above, followed by production TypeScript/Vite build, GitHub Pages build and bundle/PWA checks.

This is a CI result for the audited commit. This Phase 0 audit did not execute `npm run preflight` on a local Windows checkout and did not perform physical-device QA.

### 8.2 Existing deterministic test coverage

The current suite covers important contracts including:

- production ZXing adapter decode fixtures and ROI behavior;
- barcode payload validation;
- rotation, deskew, scale, image quality, geometry correction and temporal fallback;
- A2/A3 policy bounds;
- camera request compatibility and track-constraint serialization;
- lifecycle, presentation ownership and preview-region mapping;
- diagnostics privacy projection/export;
- torch, settings and audio runtime behavior.

The decoder integration harness constructs the concrete `ZXingDecoderAdapter` directly. That is useful backend-specific coverage but is not yet a generic decoder contract suite.

### 8.3 Quantitative and physical baseline gaps

No verified current baseline was found in the reviewed source/docs for:

- recognition success rate by symbology and capture condition;
- false-positive rate by symbology;
- p50/p95 first-result latency on named physical devices;
- p50/p95 decode duration and frame callback gap on named devices;
- WASM/JS decoder memory high-water mark or recovery under memory pressure;
- iOS Safari/PWA versus Android Chrome/PWA comparative corpus results;
- calibrated minimum barcode module width, distance or lighting thresholds.

Current diagnostics can expose decode timings, candidate counts, quality findings and camera/runtime events, but the QA Monitor is a local diagnostic viewer/exporter, not a persistent cross-device benchmark service. Synthetic fixtures and CI cannot substitute for real printed labels and physical camera capture.

### 8.4 Required baseline corpus before backend selection

Create a versioned corpus with ground-truth payload and symbology. Include:

- EAN-8, EAN-13, CODE-128 and CODE-39 production labels;
- upright, 90°/180°/270°, in-plane skew and perspective tilt;
- small/far and low source-pixel coverage;
- curved bottles/cans and modest package deformation;
- glossy/reflective packaging, glare and clipped highlights;
- low light, low contrast, noise and motion blur;
- partial occlusion, damaged/quiet-zone-deficient and blank negative controls;
- paper labels, shelf labels, packaging and screen-displayed codes;
- representative low-capability Android, mainstream Android, iPhone Safari tab and installed iOS PWA captures.

For every capture, record device/browser/OS, actual camera track settings, source resolution, ROI size, ground-truth value, lighting/capture condition and whether the capture is a positive or negative case. Do not store employee identity or unnecessary device identifiers in diagnostic exports.

---

## 9. Technical replacement specification

### 9.1 Candidate decision boundary

The candidate order remains:

1. **First evaluation:** `barcode-detector/ponyfill`, using its explicit ponyfill import so the test does not silently switch to a partial native BarcodeDetector implementation.
2. **Alternative:** `zxing-wasm` direct API if the first candidate does not expose sufficient control over required ReaderOptions, memory/lifecycle behavior, or integration requirements.
3. **Do not decide by README feature lists.** Verify the exact package version/API, WASM asset loading, self-hosting, CSP/offline behavior, worker compatibility and iOS/Android behavior.

The previous technical research identified both as ZXing-C++ WebAssembly paths. It did not establish that every ZXing-C++ `ReaderOptions` control is exposed by `barcode-detector`; that must be verified against the exact package API. Do not assume the ponyfill exposes `tryHarder`, `tryRotate`, `tryInvert`, `tryDownscale`, denoise or all other C++ options.

### 9.2 Target responsibility model

```text
Feature Layer
  Home / Stocktake
  owns presentation, reticle, result handling and business workflow
          │
React Bridge
  useScannerEngine
  owns React binding and recovery coordination
          │
UniversalScannerSession
  owns session state, camera lease binding, frame scheduling,
  serialization, lifecycle, validation and result delivery
          │
Recognition Orchestrator
  owns strict ROI, baseline-first candidate policy,
  optional transforms, temporal fallback and candidate budgets
          │
Decoder Factory → Decoder Adapter
  initialize / decode / dispose / capabilities / diagnostics
          │
Selected ZXing-C++ WASM Backend
  barcode-detector ponyfill or zxing-wasm after evaluation
```

The diagram describes a target boundary, not an already implemented architecture. The exact ownership of pixel conversion and ROI crop will be chosen after the API evaluation. The decoder must not acquire camera streams, attach video, schedule frames, mutate presentation or validate retail business payloads.

### 9.3 Adapter requirements

The adapter/factory design must provide:

- deterministic initialization and disposal;
- explicit selected backend identity and version;
- explicit supported symbology/capability reporting, distinct from the RetailOS allowlist;
- normalized decode output: payload, symbology, geometry when available, timestamp and backend identity;
- typed distinction between ordinary no-read and backend/runtime failure;
- bounded input dimensions and memory behavior;
- cancellation/generation-safe handling of stale asynchronous results;
- no camera, DOM presentation or feature business logic;
- privacy-safe diagnostics that never expose barcode payloads or raw image pixels.

Keep recognition-policy concerns such as temporal frame selection, image-quality observation and A2/A3 candidate budgets outside a low-level backend contract wherever practical. A backend may receive a normalized pixel/crop input and return symbols; it should not decide retail validation or module behavior.

### 9.4 WASM delivery and runtime requirements

Before production integration is accepted:

- pin the exact package and WASM artifact version;
- prefer self-hosted WASM assets for predictable PWA/offline and CSP behavior; do not leave production dependent on an unverified third-party CDN fetch;
- verify asset URL/base-path behavior for GitHub Pages deployment;
- verify cold load, warm cache and offline behavior after the app shell and decoder asset have been cached;
- define initialization timeout, failure recovery, disposal and memory cleanup;
- decide main-thread versus Worker only after device benchmarking;
- measure structured-clone/transfer and memory overhead before assuming Worker is faster on iOS;
- ensure no overlapping decode and no stale result delivery after close/recovery.

### 9.5 Recognition-policy migration

Compare each existing stage independently against the selected backend:

| Existing stage | Migration question |
|---|---|
| Strict ROI crop | Can the backend consume the exact crop without changing source-coordinate semantics? |
| 1.5× baseline / 1× / 2× scales | Does backend downscale/upscale behavior improve decode success without duplicating candidate work? |
| Orthogonal rotation | Does backend rotation match current 0°/90°/180°/270° results on the corpus? |
| Continuous deskew | Still needed for in-plane skew not covered by orthogonal rotation? |
| Contrast / gamma / denoise | Which candidates measurably improve success, and what are their false-positive and latency costs? |
| Geometry correction | Does bounded rectification add real value beyond the backend? Rotation is not perspective correction. |
| Focus/image quality | Keep as passive diagnostic evidence if useful; do not let it silently reject a decodable baseline. |
| Temporal fallback | Preserve bounded snapshot freshness, one-time consumption and validation semantics; compare incremental success against added latency/memory. |
| A2/A3 | Keep optional candidate budgets bounded and backend-neutral; do not call them hardware-tier adaptation. |

Do not remove multiple stages in one change. Compare baseline-only, backend options and optional stages against the same corpus.

---

## 10. Phase 0 exit criteria

| Deliverable | Result |
|---|---|
| Current main SHA and repository tree locked | **Complete** |
| Scanner source inventory and responsibilities | **Complete** |
| Runtime dependency and consumer map | **Complete** |
| Concrete decoder coupling identified | **Complete** |
| Protected camera/session/presentation/business contracts | **Complete** |
| Existing test inventory and CI baseline | **Complete** |
| Documentation discrepancies recorded | **Complete** |
| Quantitative device/corpus baseline | **Not available — required before backend selection** |
| Physical iOS/Android QA baseline | **Not performed in Phase 0** |

### Recommended next sequence

- **Phase 1 — Decoder capability evaluation:** verify the exact `barcode-detector/ponyfill` and `zxing-wasm` APIs, controls, asset loading, offline/self-hosting and browser compatibility. Build a small isolated benchmark harness; do not change production runtime.
- **Phase 2 — Adapter/factory foundation:** add injectable backend creation and backend-neutral contract tests without changing camera/session lifecycle.
- **Phase 3 — ZXing-C++ WASM candidate integration:** integrate one selected backend behind the factory and compare against the locked baseline.
- **Phase 4 — Recognition-policy reduction:** remove only transforms shown to be redundant or harmful on the shared corpus.
- **Phase 5 — Format expansion:** separate decoder capability from retail allowlist and validator policy.
- **Phase 6 — Runtime/performance and cross-platform QA:** compare main thread/Worker and test iOS/Android physical devices.
- **Phase 7 — Production cutover:** one production backend, reversible PR/commit rollback, then remove legacy JS decoder only after acceptance.

**Phase 0 recommendation:** accept the source map and protected-contract baseline as the starting point. Do not begin Phase 2 or alter production scanner runtime until Phase 1 has verified the candidate API and a repeatable barcode corpus/baseline has been established.


## Phase 3 capability-transfer addendum — 2026-11-14

This addendum compares the production `ZXingDecoderAdapter` with the opt-in `ZXingWasmDecoderAdapter` after PR #111 shared the candidate pipeline. It does not authorize production cutover.

### Confirmed parity already present — do not duplicate
- Strict feature-owned ROI crop and bounded ROI dimensions.
- Shared 1.5× baseline / 1× / 2× scale candidates.
- Shared lazy baseline-first rotation, deskew, image enhancement and geometry-correction candidate ordering.
- Shared A2 processing plan and A3 runtime candidate budgets.
- Shared focus-quality measurement and temporal snapshot creation at baseline cadence.
- Shared temporal snapshot consumption and session-side validation, allowlist enforcement, single/continuous behavior and Home/Stocktake delivery.
- All 17 RetailOS symbology mappings and variant normalization in the WASM adapter.

### Gaps / behavior differences to close or explicitly accept
- Legacy JS tries `HybridBinarizer` then `GlobalHistogramBinarizer` for each candidate. WASM previously made one `readBarcodes` call using only its default LocalAverage binarizer. Transfer the ordered LocalAverage → GlobalHistogram fallback; LocalAverage is documented by zxing-wasm as the HybridBinarizer-equivalent mode.
- WASM previously relied on the package default `textMode: HRI`, while the old JS adapter returns `getText()`. Set `textMode: Plain` explicitly to preserve the raw text contract, especially control/GS1 payload handling.
- WASM previously set `validateOptionalChecksum: true`, unlike the old adapter's default optional-checksum behavior. Set it to false for compatibility; RetailOS payload validation remains authoritative.
- WASM previously omitted `returnErrors` and accepted any non-empty result text. Request error results for diagnostics and reject `isValid === false` / non-empty error results before emitting DecoderOutput.
- WASM previously omitted A1 quality-profile / A2 plan callbacks and the legacy decoder's rotation, deskew, geometry, scale, and per-stage timing diagnostics. Restore equivalent bounded diagnostics without moving recognition policy into the backend.
- 180° one-dimensional reversal is a separate parity question: the old integration fixture exercises reversed CODE-39 through ZXing JS, while WASM sets `tryRotate: false`. Keep internal rotation disabled until the shared corpus proves whether the explicit shared candidates cover the required orientation; add a 180° parity case before deciding whether to add a bounded candidate or enable backend rotation.

### Explicitly not transferred
- ZXing JS console-warning suppression for its own NotFoundException logging; this is a backend-specific workaround.
- Any concrete camera, lifecycle, UI or module workflow behavior; those remain in the shared session and feature owners.
- Redundant decoder-internal rotation/downscale/denoise while the shared candidate pipeline owns those stages.

### Current status after PR #114 merge
PR #114 is merged separately and resolves advisory LOW/MID/HIGH device-profile metadata and the session timing-window correction. That work does not establish decoder parity, change the selected decoder backend, or authorize cutover. PR #115 is the capability-transfer implementation branch.

### Release boundary
The capability-parity code and deterministic tests do not replace physical optical parity. The same labelled corpus must run through both adapters, followed by iOS Safari/PWA and Android Chrome/PWA QA. Only then can production cutover be proposed; remove `@zxing/library`, `zxingDecoder.ts` and JS-only tests only after the selected WASM backend is accepted and rollback evidence exists.
