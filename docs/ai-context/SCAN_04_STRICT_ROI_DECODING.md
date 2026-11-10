# SCAN-04 — Strict module-reticle ROI decoding

**Status:** Implemented on `feat/scan-04-strict-reticle-roi-decoding`; GitHub Actions run #324 passed TypeScript, production/Pages builds and full preflight on PR head `31405dae3cd2eb358dce1e11868e861ac4ace1a8`. Physical post-deployment barcode QA is pending.  
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
RGBA → luminance → ZXing HybridBinarizer
         │
         └─ GlobalHistogramBinarizer every third ROI pass
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
- Hybrid binarization remains the normal path. Global Histogram remains a bounded secondary binarizer every third ROI pass.
- Session decode cadence remains 110 ms.
- Barcode payload validation, duplicate/cooldown policy, single/continuous mode and result delivery are unchanged.
- Diagnostics now report source dimensions, ROI dimensions, decoded ROI hits and unavailable-region counts.

## 4. Explicitly out of scope

- Rotation normalization, deskew, perspective correction or curved-label dewarping.
- Adaptive exposure/brightness control, Torch policy, camera resolution/FPS or autofocus changes.
- Decode cadence changes, parallel decode, worker migration or decoder replacement.
- Camera lease/refcount, startup/readiness, lifecycle/recovery, preview geometry or CSS changes.
- Home lookup, Stocktake form-fill/duplicate handling/explicit save/revision/export changes.
- Any shared reticle or scanner presentation component.

## 5. Regression coverage

`scripts/test-scanner-roi-decoder.mjs` verifies:
- normalized-to-pixel conversion using source dimensions;
- floor/ceil edge rounding and source-edge clamping;
- missing, wrong-coordinate-space, non-finite, zero-area and out-of-bounds input rejection;
- session-to-decoder region forwarding;
- strict crop wiring and removal of full-frame/fixed-centered decode paths.

The suite is registered in `npm run preflight`. CI must also pass TypeScript, production build, GitHub Pages build and all existing scanner regressions.

## 6. Device acceptance gates

On both iOS Safari/PWA and Android Chrome/PWA, test Home and Stocktake independently:
1. Barcode centered inside reticle.
2. Barcode near each reticle edge while fully inside the reticle.
3. Barcode slightly outside reticle (expected not to decode under strict ROI).
4. Small and distant labels.
5. Reflective packaging and low-light conditions.
6. Orientation/viewport changes and background/foreground recovery.
7. Confirm scan latency, accuracy and existing lookup/form-save workflows.

CI cannot prove optical accuracy or device performance. Do not mark SCAN-04 release-accepted until physical testing is recorded on both platforms.

## 7. Rollback

Revert the SCAN-04 decoder/contract changes as one unit if ROI-only decoding causes a material accuracy regression. SCAN-03's geometry publication can remain intact; reverting SCAN-04 restores the previous decoder behavior without changing camera lifecycle or feature presentation.
