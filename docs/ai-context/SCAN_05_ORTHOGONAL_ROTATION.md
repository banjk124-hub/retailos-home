# SCAN-05 — Continuous ROI orientation recovery

**Status:** Corrective implementation is on Draft PR #67 (`fix/scan-05-06-continuous-orientation`). CI #425 passed on code head `46db3280e5271e0a1cd08647ee7ef045828b008b`; physical iOS/Android QA remains pending.

## Problem found in the previous implementation

- The previous path tried the upright ROI on every decode, but attempted one clockwise 90° transform only every third valid ROI frame after an upright miss.
- This covered the two orthogonal axes (0°/180° through ZXing's 1D reversal, and 90°/270° through one quarter-turn), but did not normalize intermediate in-plane angles.
- At the previous 110 ms minimum session interval, an extended attempt could be delayed by approximately 330 ms in the ideal schedule.

## Corrective runtime flow

1. Crop only the latest module-owned strict ROI.
2. Try the upright ROI with HybridBinarizer and GlobalHistogramBinarizer.
3. On a miss, try one exact clockwise quarter-turn with both binarizers.
4. If both miss, hand off to SCAN-06's continuous orientation estimator and correction candidates.
5. Return only a valid ZXing result; barcode validation and feature result delivery remain unchanged.

The exact quarter-turn remains a cheap fast path for the common sideways case. It is no longer the only non-upright orientation supported.

## Implementation

- `scannerRotation.ts` retains a pure, validated 90° clockwise luminance transform.
- The obsolete every-third-frame extended-decode scheduler has been removed.
- Rotation and continuous correction run on the same valid ROI frame after an upright miss.
- No full-frame fallback or fixed centered ROI is introduced.
- The shared session's minimum decode interval is reduced from 110 ms to 70 ms. Decode work remains serialized; a slow pass cannot create overlapping decoder calls.
- Camera acquisition constraints, camera lifecycle, preview presentation, validation, result delivery and Home/Stocktake business behavior are outside this correction.

## Regression coverage

- Pixel-level quarter-turn mapping and invalid-buffer rejection.
- Runtime Code 128, EAN-8 and EAN-13 fixtures at 90°/270°.
- Production adapter integration for upright and orthogonal orientation recovery.
- Continuous-angle and combined-angle coverage is owned by SCAN-06 tests.
- Preflight must verify the production adapter path, TypeScript, production build and GitHub Pages build.

## Device acceptance

On iOS Safari/PWA and Android Chrome/PWA, test Home and Stocktake independently with EAN-13, EAN-8 and Code 128. Rotate the phone and barcode separately; include all four cardinal orientations, intermediate angles, reticle center/edges, small/far labels, reflective packaging and low light. Record first-result latency and decoder stage costs.

CI does not prove physical optical accuracy, focus quality or device CPU cost.
