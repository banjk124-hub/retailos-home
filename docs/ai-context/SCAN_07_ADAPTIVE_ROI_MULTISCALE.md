# SCAN-07 — Adaptive ROI & multi-scale sampling

**Status:** Implemented on PR #77 branch. CI #634 passed on code/test head; physical-device acceptance pending.
**Scope:** Decoder-side sampling improvements only. No camera, session, lifecycle, preview, UI or retail workflow changes.

## 1. Source audit findings

- Home and Stocktake publish a reticle rectangle in preview-content-normalized coordinates.
- The existing geometry mapper resolves that rectangle into source-frame-normalized coordinates.
- resolveScannerRoiCrop() validates the coordinate space and bounds, then returns integer source pixels.
- The decoder currently receives no wider module-authorized capture envelope. The reticle is therefore the strict maximum crop boundary.
- The deployed sampling path caps source width at 1280 px and enlarges the resulting ROI 1.5× before RGBA-to-luminance conversion.
- Each scale then uses the same upright, 90° clockwise and continuous deskew recovery path with Hybrid and GlobalHistogram binarizers.

## 2. Implementation

### Candidate ordering

1. **1.5× baseline** — exact existing integer dimensions and existing decode pipeline. This is always first.
2. **1× fallback** — same source crop at the post-source-cap sampling dimensions. This may avoid interpolation artifacts or excessive enlargement.
3. **2× fallback** — same source crop with additional sampling enlargement, subject to the additional-candidate allocation cap.

The alternate scales are attempted only after every current orientation/deskew/binarizer attempt at the 1.5× baseline misses. No scale is evaluated concurrently.

### Bounds

- Maximum three scale candidates per source frame.
- Duplicate integer output dimensions are removed.
- Each additional candidate is limited to 6,000,000 output pixels.
- Existing 1280 px source-width cap is unchanged.
- Baseline 1.5× rounding behavior is unchanged.
- Canvas is reused; each candidate redraws directly from the original source frame and exact same crop bounds.

### Diagnostics

The existing decoder diagnostic record now includes:
- scaleAttempts: number of scale candidates processed.
- scaleHits: accepted ZXing result count at a candidate scale (at most one per source frame).
- lastScaleFactor: effective sampling factor of the most recently attempted candidate.

No barcode payload, camera identifier or employee information is logged.

## 3. ROI padding decision

**Outward padding is intentionally not enabled in this implementation.**

The current module contract exposes only the visible reticle region. Expanding the crop around it would decode pixels the module has not authorized and would weaken SCAN-04 strict ROI behavior.

If real-label evidence later demonstrates edge clipping, a separate optional captureEnvelope must be designed:
- It is owned and published by each feature module.
- It is expressed in preview-content coordinates and passed through the existing geometry mapper.
- It must contain the reticle and remain within explicit normalized bounds.
- Decoder may crop only that authorized envelope; it must never infer padding or use full-frame/center fallback.
- Home and Stocktake require independent geometry and workflow regression tests before opting in.

This contract is deferred rather than silently approximated with a fixed percentage.

## 4. Protected behavior

No changes to:
- Preview-to-source mapping, reticle publication or in-place session region updates.
- Strict ROI validation and fail-closed behavior.
- Camera lease, camera constraints, autofocus, frame loop, 70 ms minimum interval or lifecycle/recovery.
- Serialized ZXing reader access, supported formats, checksum/format validation or payload policy.
- Single/continuous result semantics, Home lookup, Stocktake form-fill/explicit-save or UI presentation.
- Dependencies, workers, backend, storage or deployment configuration.

## 5. Regression and acceptance

Automated:
- scripts/test-scanner-scale.mjs: baseline ordering/dimensions, fallback ordering, invalid dimensions, unique candidates and 6 MP fallback allocation cap.
- scripts/test-scanner-decoder-integration.mjs: production ZXing adapter uses multiple scales on a miss while every draw remains within the module-owned crop.
- scripts/test-scanner-roi-decoder.mjs: existing strict ROI and fail-closed contract remains in preflight.
- GitHub Actions run #634 (`42970931657`) passed full preflight, TypeScript, production build and Pages build on code/test head `cdf35ab6c8f66b3f1ca0fc798cc2eaf0493c540c`. Any subsequent docs-only sync must also pass CI on the final PR head.

Physical-device:
- Home and Stocktake separately on iOS Safari/PWA and Android Chrome/PWA.
- Low- and high-capability devices.
- Small/far labels represented by actual source barcode pixel height.
- Center, each reticle edge, partially clipped and outside-reticle negative controls.
- Normal light and low light; orientation and foreground/background lifecycle.
- Record build/browser/device class, symbology, source ROI dimensions, scale attempts, decode outcome, first-result latency, processing-stage cost and UI responsiveness.

CI is not device QA. Synthetic fixture success is not proof of improved real-world recognition. Do not merge/deploy until CI, review and required device acceptance are evaluated.
