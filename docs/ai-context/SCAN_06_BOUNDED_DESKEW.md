# SCAN-06 — Bounded in-plane barcode deskew

**Status:** Implemented on final consolidated PR #66. Final consolidated PR #66 CI run #360 passed the full preflight. Physical iOS/Android accuracy and performance QA remains pending.

## Scope

SCAN-06 corrects small in-plane barcode roll after SCAN-05 orthogonal normalization. It does not implement perspective/keystone correction, curved-label dewarping, arbitrary-angle search, large rotations, adaptive exposure or camera changes.

## Processing method

- `estimateScannerSkewAngle()` samples the reticle ROI luminance and accumulates a Sobel structure tensor.
- The dominant gradient direction estimates the barcode's in-plane roll.
- Accept only coherent estimates (confidence ≥0.35) between 1.2° and 12°.
- `rotateLuminanceByAngle()` applies one inverse-angle bilinear transform. Output bounds expand to contain the rotated ROI; uncovered pixels are white.
- Invalid buffers, blank/low-confidence images and out-of-range angles return no correction.
- Output allocation is capped at 4,000,000 pixels.

## Runtime flow

1. Decode the original strict ROI first.
2. On every third valid ROI frame after a miss, perform SCAN-05's single 90° clockwise normalization pass.
3. If both orthogonal paths miss, estimate skew on the upright ROI.
4. If the upright ROI has no valid small-angle estimate, estimate on the normalized 90° ROI.
5. Apply at most one deskew transform and one additional HybridBinarizer decode.
6. If no valid estimate exists, return a normal decode miss; never fall back to the full frame.

Deskew runs only on the scheduled extended frame after normal orientation paths miss. Session cadence remains 110 ms.

## Diagnostics

- Deskew attempts and successful hits.
- Last accepted deskew angle.
- Separate deskew transform and decode processing costs.
- No barcode payload, employee identity, camera device ID or persistent device identifier is added.

## Regression coverage

`scripts/test-scanner-deskew.mjs` verifies:
- level/blank inputs do not trigger correction;
- invalid dimensions and angles beyond the supported range fail closed;
- synthetic Code 128 at ±5° and ±8° decodes after correction;
- combined 90°/270° normalization followed by deskew decodes;
- deskew has no DOM/presentation dependency;
- decoder wiring runs deskew only after upright and orthogonal paths miss and uses one HybridBinarizer pass.

The suite is registered in preflight. Consolidated CI #342 passed deskew, scanner regressions, TypeScript and production/Pages builds.

## Performance and device acceptance

The estimator samples every three pixels and runs only after earlier decode paths miss on the extended frame. Bilinear interpolation may soften narrow bars. Extra processing can increase latency/CPU on weak devices; synthetic tests do not replace physical QA.

On iOS Safari/PWA and Android Chrome/PWA, test Home and Stocktake with EAN-13/EAN-8/Code 128 at 0°/90°/180°/270° and ±5°/±8° skew. Record accuracy, latency and CPU on weak and strong devices. Perspective and curved-label correction remain future work.

## Rollback

Revert `scannerDeskew.ts` and its decoder integration as one unit. SCAN-05 orthogonal rotation and the pre-existing 0°/180° baseline can remain active.
