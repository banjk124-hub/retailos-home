# Scanner Engine — current technical source of truth

**Status:** Current production architecture is ZXing-C++ WASM only. Phase A correctness changes are proposed on branch `fix/scanner-phase-a-contracts-docs`; do not treat them as merged until CI passes and the PR is accepted.
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

## 9. Active stabilization workstream

The staged SC-01A/01B/01C → SC-02 → SC-03 → SC-04 → SC-05 sequence is tracked in [SCANNER_WORKSTREAM_SC01_05.md](./SCANNER_WORKSTREAM_SC01_05.md). SC-01B runtime hardening is merged, deployed and user-confirmed on device; SC-01C scheduling accounting is the current isolated work. None of the Worker phases is wired into UniversalScannerSession, Home or Stocktake. Camera ownership, module ROI, decoder allowlist, recognition order and feature workflows remain protected. The SC-01A transport/API evidence and remaining empirical proof gates are recorded in [SCANNER_SC01A_SPIKE_FINDINGS.md](./SCANNER_SC01A_SPIKE_FINDINGS.md).
## 10. Change protocol

For every scanner change:
1. Read this document and the exact source/tests involved.
2. State the ownership boundary and observable behavior being changed.
3. Add focused positive, negative and boundary regression tests.
4. Preserve Home and Stocktake behavior unless the task explicitly changes their contracts.
5. Run `npm run preflight`, TypeScript, production build and Pages build through CI.
6. Record physical-device evidence separately; never infer it from CI.
7. Update this document only when the implementation contract changes. Put incident observations in the history log with date, evidence, resolution and current status.
8. For SC-01–05 work, satisfy the phase-specific gates in `SCANNER_WORKSTREAM_SC01_05.md`; do not claim a phase complete from source inspection alone.
