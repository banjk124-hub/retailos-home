# SCAN-06 — Continuous barcode orientation estimation and deskew

**Status:** Corrective implementation in progress on `fix/scan-05-06-continuous-orientation`, based on merged `main` commit `8571db7ea75f558397abe618e88fb2d0e1395616`. Do not mark accepted until production integration tests, CI and physical iOS/Android QA pass.

## Problem found in the previous implementation

- The previous Sobel structure tensor reduced every ROI edge to one global dominant direction. Packaging text, borders and decorative graphics could dominate that estimate.
- Correction was limited to 1.2°–12°. Intermediate orientations outside that narrow window had no continuous normalization path.
- The previous decoder tried deskew only after upright and orthogonal misses, and only on the scheduled third valid ROI frame.
- The previous production integration fixture covered +5° deskew, not a broad angle sweep or combined orthogonal-plus-skew through the actual adapter.

## Corrective estimator

- Build a 180-bin Sobel gradient-orientation histogram. Opposite gradient polarities are folded together because a 1D barcode's bar axis is directionless.
- Smooth the histogram locally, select the dominant orientation, and compute a sub-degree circular mean around that peak.
- Require minimum directional energy concentration and local orientation coherence. Blank, low-texture and directionally ambiguous ROIs fail closed. Ignore sub-0.65° estimates and bound the signed correction to ±90°.
- Normalize the result to a signed half-turn range of -90° through +90°. This supports intermediate barcode angles without enumerating a fixed list of angle constants.
- Rotate with inverse-angle bilinear sampling and expanded output bounds. The allocation remains bounded; the current cap is 6 million pixels.
- Evaluate both the original ROI and its quarter-turned representation. Prefer the smaller correction angle first, then try the alternate representation if ZXing still misses.
- Decode each candidate with both HybridBinarizer and GlobalHistogramBinarizer. ZXing checksum/format validation remains the final authority; orientation estimates alone never produce a barcode result.

This is in-plane orientation recovery. It does not claim perspective/keystone correction, curved-label dewarping, motion-blur recovery or camera autofocus changes.

## Runtime diagnostics

- `deskewAttempts` counts estimator invocations, including no-estimate outcomes.
- `deskewEstimateMisses` counts candidates rejected by the confidence/angle gates.
- `deskewHits` counts candidates that produce a ZXing result.
- `lastDeskewAngleDegrees` records the latest accepted orientation estimate.
- Stage timings separate ROI draw, image read, grayscale conversion, quarter-turn, estimator/rotation and ZXing candidate decode.
- Suppress only ZXing 0.23.0's expected `MultiFormatReader` `NotFoundException` warning during synchronous decode misses; unrelated console warnings remain visible.
- Diagnostics must not include barcode payload, employee identity, camera device ID or persistent device identifier.

## Regression coverage

- Synthetic Code 128 angle sweep through positive and negative intermediate angles, including large rotations up to ±75° and exact 90°.
- Medium-low contrast Code 128 fixture at an intermediate angle is estimated, corrected and decoded by the helper and production adapter.
- Deskew helper tests verify estimate accuracy, correction and decode.
- Production `ZXingDecoderAdapter` integration tests verify the same angle sweep, 90°/270°, combined quarter-turn plus residual skew, strict ROI crop and no full-frame fallback.
- Negative tests cover blank/invalid frames and out-of-range rotation input.
- Preflight must include the estimator, production adapter integration, TypeScript, production build and Pages build.

## Performance policy

Correctness and recognition coverage take priority over a strict ultra-low-end CPU budget. The session minimum decode interval is 70 ms, and all supported binarizer/orientation candidates can run after a miss. Decode calls remain serialized; there is no unbounded queue or concurrent use of one ZXing reader. Measure actual decode duration, stage maxima, first-result latency and UI responsiveness on representative devices. Do not claim the CPU cost is acceptable until device measurements are recorded.

## Out of scope

Perspective distortion, curved surfaces, glare removal, adaptive exposure, autofocus, camera acquisition/lifecycle changes, module presentation, barcode validation policy and business result delivery.
