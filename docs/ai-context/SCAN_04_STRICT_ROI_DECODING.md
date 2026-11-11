# SCAN-04 — Strict module-reticle ROI decoding

> **Superseded runtime note (2026-11-10):** This document records the SCAN-04 implementation baseline. Its 110 ms cadence and every-third-ROI GlobalHistogram schedule were later superseded by SCAN-05/06, merged in PR #67. Current runtime uses a 70 ms minimum decode interval and tries HybridBinarizer plus GlobalHistogramBinarizer for each orientation candidate. Strict ROI-only behavior remains unchanged.

**Status:** Merged and deployed by the user; the user confirms normal scanner operation. The detailed optical stress matrix was not individually recorded. SCAN-05/06 extend this strict ROI pipeline in later phases.  
**Baseline:** SCAN-03 merge commit `4804a0b0f06113e43a06e8b171d05dbad6fb1a8f`; user confirms successful iOS and Android geometry/flow verification.  
**Objective:** Make the decoder consume the exact source-frame region published by each module-owned reticle, instead of decoding the full frame and then trying a fixed centered crop.

## 1. Runtime data flow

```text
Home-owned reticle ─┐
                    ├─ feature geometry binding
Stocktake reticle ──┘
         │
         ▼
source-frame-normalized region
         │
         ▼
UniversalScannerSession.getScanRegion()
         │  current defensive snapshot on each scheduled frame
         ▼
ScannerDecoderAdapter.decode(source, { timestamp, scanRegion })
         │
         ▼
resolveScannerRoiCrop()
         │  normalized coordinates → integer source pixels
         ▼
drawImage(source, crop bounds, ROI canvas)
         │
         ▼
RGBA → luminance
         │
         ▼
SCAN-05/06 candidate flow: upright → 90° → continuous deskew
         │
         └─ HybridBinarizer + GlobalHistogramBinarizer per candidate
```

The scanner session continues to own the camera, decoder instance and frame loop. The feature modules continue to own their independent video elements, reticles and presentation.

## 2. Coordinate and crop contract

- Decoder input is explicitly `source-frame-normalized`; preview-content coordinates are not accepted.
- `x`, `y`, `width`, and `height` must be finite; origin must be non-negative; dimensions must be positive; right/bottom edges must remain within the normalized source frame.
- Leading source-pixel edges use `floor`; trailing edges use `ceil`. This prevents subpixel rounding from trimming the reticle boundary.
- Pixel bounds are clamped to the intrinsic source frame dimensions.
- Missing, invalid or zero-area regions return no decode result. There is no full-frame fallback and no fixed centered fallback.
- The crop is drawn directly from the original `CanvasImageSource`; the full frame is not first rasterized into the working canvas.

## 3. Processing behavior retained

- Supported barcode formats and format allowlist are unchanged.
- The ROI is aspect-ratio-preserving; no horizontal/vertical stretching is introduced.
- Preserve the existing source-frame downscale cap: frames wider than 1280 pixels are scaled proportionally before the ROI is enlarged 1.5×. The crop retains the source aspect ratio and does not increase decode pixel density merely because a device reports a higher-resolution camera stream.
- The historical every-third-frame binarizer schedule and 110 ms cadence are superseded by SCAN-05/06. Current runtime uses HybridBinarizer and GlobalHistogramBinarizer for each orientation candidate; session minimum decode interval is 70 ms and calls remain serialized.
- SCAN-06 adds continuous in-plane deskew and bounded percentile contrast normalization. These do not alter the strict source-frame ROI contract.
- Barcode payload validation, duplicate/cooldown policy, single/continuous mode and result delivery are unchanged.
- Diagnostics now report source dimensions, ROI dimensions, decoded ROI hits and unavailable-region counts.

## 4. SCAN-07 multi-scale extension (PR #77 branch)

- The original strict crop remains the only source region. The decoder does not expand, pad outward, or recalculate the module reticle.
- The existing 1.5× sampling dimensions remain candidate zero, including the existing source-width cap and rounding behavior.
- Only after all current orientation/deskew and binarizer attempts at 1.5× miss does the adapter retry the same crop at 1× and 2× sampling.
- Fallback candidates are deduplicated and bounded to at most two additional scales; each additional allocation is capped at 6 MP.
- Every scale uses the same existing decode pipeline and ZXing result validation. Reader access remains serialized; session cadence remains 70 ms.
- The decoder records scale attempts/hits and the last attempted scale without logging barcode payloads.
- Outward padding is intentionally not enabled because Home/Stocktake currently publish only the reticle region. A future capture envelope requires an explicit module-owned contract and geometry regression coverage.

## 5. Explicitly out of scope

- Perspective correction and curved-label dewarping remain deferred to SCAN-09; rotation and in-plane deskew are now implemented by SCAN-05/06.
- Adaptive exposure/brightness control, Torch policy, camera resolution/FPS or autofocus changes.
- Decode cadence changes, parallel decode, worker migration or decoder replacement.
- Camera lease/refcount, startup/readiness, lifecycle/recovery, preview geometry or CSS changes.
- Home lookup, Stocktake form-fill/duplicate handling/explicit save/revision/export changes.
- Any shared reticle or scanner presentation component.

## 6. Regression coverage

`scripts/test-scanner-roi-decoder.mjs` verifies:
- normalized-to-pixel conversion using source dimensions;
- floor/ceil edge rounding and source-edge clamping;
- missing, wrong-coordinate-space, non-finite, zero-area and out-of-bounds input rejection;
- session-to-decoder region forwarding;
- strict crop wiring and removal of full-frame/fixed-centered decode paths.

The suite is registered in `npm run preflight`. `scripts/test-scanner-scale.mjs` validates candidate ordering, dimensions, uniqueness and allocation bounds; `scripts/test-scanner-decoder-integration.mjs` verifies production adapter scale retries retain the exact source crop. The full preflight remains required. CI must also pass TypeScript, production build, GitHub Pages build and all existing scanner regressions.

## 7. Device acceptance gates

On both iOS Safari/PWA and Android Chrome/PWA, test Home and Stocktake independently:
1. Barcode centered inside reticle.
2. Barcode near each reticle edge while fully inside the reticle.
3. Barcode slightly outside reticle (expected not to decode under strict ROI).
4. Small and distant labels.
5. Reflective packaging and low-light conditions.
6. Orientation/viewport changes and background/foreground recovery.
7. Confirm decode correctness, focus stability and existing lookup/form-save workflows.

CI cannot prove optical accuracy or device performance. The user has confirmed normal post-deployment operation; detailed low-light/reflective/small/far barcode scenarios remain separately unrecorded. SCAN-05/06 have their own device acceptance gates.

## 8. Rollback

Revert the SCAN-04 decoder/contract changes as one unit if ROI-only decoding causes a material accuracy regression. SCAN-03's geometry publication can remain intact; reverting SCAN-04 restores the previous decoder behavior without changing camera lifecycle or feature presentation.
