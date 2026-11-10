# SCAN-06 — Bounded in-plane barcode deskew

**Status:** Implemented on `feat/scan-06-bounded-deskew`; consolidated PR #65 CI run #342 passed the full preflight on head `7bd77ffd7acd6a04e65b731b3ffa3a3e9546a7f1`. Physical iOS/Android accuracy and performance QA is pending.

## 1. Scope

SCAN-06 corrects small in-plane barcode roll/skew after SCAN-05 orientation normalization.

It does **not** implement:
- perspective/keystone correction;
- curved-label dewarping;
- arbitrary-angle search or large rotations;
- adaptive exposure, camera constraints or Torch behavior.

## 2. Processing method

- `estimateScannerSkewAngle()` samples the reticle ROI grayscale buffer and accumulates a Sobel structure tensor.
- The dominant gradient direction estimates the barcode's in-plane roll.
- A correction is accepted only when the estimate is coherent (confidence at least 0.35) and within 1.2°–12°.
- `rotateLuminanceByAngle()` applies one inverse-angle bilinear transform. Output bounds expand to contain the rotated ROI; uncovered pixels are white.
- Invalid buffers, blank/low-confidence images and angles outside the bounded window return no correction.
- The transformed output is capped at 4,000,000 pixels to bound memory allocation.

## 3. Runtime flow

1. Decode the original strict ROI first.
2. On every third valid ROI frame after a miss, perform SCAN-05's single 90° clockwise normalization pass.
3. If both orthogonal paths miss, estimate skew on the upright ROI.
4. If the upright ROI has no valid small-angle estimate, estimate on the normalized 90° ROI.
5. Apply at most one deskew transform and one additional HybridBinarizer decode.
6. If no valid estimate exists, return a normal decode miss; never fall back to the full frame.

Deskew therefore runs only on the scheduled extended frame after the normal orientation passes fail. It does not change the session's 110 ms cadence or camera lifecycle.

## 4. Diagnostics

The decoder reports:
- deskew attempts and successful deskew hits;
- last accepted deskew angle;
- separate deskew transform and decode processing costs.

No barcode payload, employee identity, camera device ID or persistent device identifier is added to diagnostics.

## 5. Regression coverage

`scripts/test-scanner-deskew.mjs` verifies:
- level and blank inputs do not trigger correction;
- invalid dimensions and angles beyond the supported range fail closed;
- synthetic Code 128 at +5°, -5°, +8° and -8° is estimated and decoded after correction;
- combined 90°/270° normalization followed by deskew decodes;
- deskew code has no DOM/presentation dependency;
- decoder wiring runs deskew only after upright and orthogonal passes miss and uses HybridBinarizer only.

The suite is registered in `npm run preflight`. Consolidated CI run #342 passed the deskew suite, existing scanner regressions, TypeScript, production build and GitHub Pages build.

## 6. Performance and accuracy caveats

- The estimator samples the ROI every three pixels and runs only after earlier decode paths miss on the extended frame.
- Bilinear interpolation can soften narrow bars; synthetic tests do not replace physical label testing.
- The extra processing can increase latency/CPU on weak devices. Record decoder stage costs and compare iOS/Android low-end devices before release acceptance.
- The bounded 12° ceiling is intentional. Larger angles require a separate, measured strategy rather than silently expanding this correction pass.

## 7. Device acceptance gate

On iOS Safari/PWA and Android Chrome/PWA, test Home and Stocktake with EAN-13, EAN-8 and Code 128:
- 0°/90°/180°/270°;
- ±5° and ±8° in-plane skew;
- center/reticle-edge placements;
- small/far labels and reflective packaging;
- latency, accuracy and CPU impact on weak and strong devices;
- no regressions in Home lookup or Stocktake form/save.

## 8. Rollback

Revert `scannerDeskew.ts` and its decoder integration as one unit. SCAN-05 orthogonal rotation and the pre-existing 0°/180° baseline can remain active.
