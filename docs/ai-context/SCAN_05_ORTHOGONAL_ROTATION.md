# SCAN-05 — Orthogonal ROI rotation decoding

**Status:** Implemented on `feat/scan-05-orthogonal-rotation` and carried into consolidated SCAN-06 branch `feat/scan-06-bounded-deskew`. PR #64 CI run #338 passed; consolidated PR #65 CI run #342 passed the full preflight on head `7bd77ffd7acd6a04e65b731b3ffa3a3e9546a7f1`. Physical iOS/Android QA is pending.

## 1. Verified baseline

- Production ZXing initialization keeps `DecodeHintType.TRY_HARDER = true`.
- ZXing `OneDReader` already reverses each 1D scanline as a second attempt and reports orientation 180°.
- EAN-8 and EAN-13 inherit the shared `OneDReader` orientation implementation.
- RetailOS uses `RGBLuminanceSource`, which does not support source-image rotation; therefore the ZXing 90°/270° bitmap-rotation path is unavailable in the existing pipeline.
- The new runtime baseline fixture verifies Code 128 at 0° and 180°; EAN-8/EAN-13 are guarded at the dependency inheritance level. Do not claim separate EAN image-fixture runtime coverage from this test.

## 2. Runtime flow

```text
strict reticle ROI crop
        |
        v
RGBA -> grayscale luminance
        |
        v
normal decode (0° + built-in 180° scanline reversal)
        |
        +-- hit --> return result
        |
        +-- miss, scheduled extended frame (every 3rd ROI frame)
                  |
                  v
          one 90° clockwise ROI transform
                  |
                  v
          ZXing decode (0° + built-in 180° reversal)
                  |
                  +-- hit --> return result
                  |
                  +-- miss --> SCAN-06 bounded deskew stage
```

A single clockwise quarter-turn is sufficient for both source orientations:
- 90° clockwise input becomes 180° and uses the existing scanline reversal.
- 270° clockwise input becomes 0°.

This avoids four separate orientation passes.

## 3. Implementation

- `src/platform/scanner/scannerRotation.ts` provides pure `rotateLuminance90Clockwise()`.
- It swaps output width/height, maps each source pixel deterministically and rejects invalid dimensions/buffer lengths.
- `ZXingDecoderAdapter` always tries the unrotated ROI first.
- The additional quarter-turn is attempted only after a normal miss and only every third valid ROI frame.
- The existing 110 ms session cadence, supported-format allowlist, strict ROI crop, Hybrid/GlobalHistogram policy, validation and result delivery remain unchanged.
- Diagnostics expose rotation attempts/hits and separate transform/decode stage costs.

## 4. Regression coverage

- `scripts/test-scanner-rotation-baseline.mjs`: Code 128 runtime decode at 0° and 180°; verifies 180° metadata; guards the EAN-8/EAN-13 inheritance chain and production `TRY_HARDER` wiring.
- `scripts/test-scanner-rotation.mjs`: exact pixel mapping, dimension swap, invalid-input rejection and runtime Code 128 decode after normalizing 90°/270° source images.
- Both suites are registered in `npm run preflight`.
- CI run #338 passed on the SCAN-05 stage; consolidated CI run #342 passed both suites plus the full repository preflight.

## 5. Device acceptance gate

On iOS Safari/PWA and Android Chrome/PWA, test Home and Stocktake independently:
1. EAN-13, EAN-8 and Code 128 at 0°, 90°, 180° and 270°.
2. Center and near-edge placement while fully inside the reticle.
3. Confirm no full-frame fallback when the barcode is outside the reticle.
4. Record time-to-decode and decoder diagnostics on low- and high-end devices.
5. Confirm existing Home lookup and Stocktake form/save behavior.

CI proves the transform and ZXing synthetic-fixture behavior; it does not prove physical camera focus, optical quality, device CPU cost or real barcode accuracy.

## 6. Rollback

Revert the SCAN-05 quarter-turn helper and decoder integration as one unit. The original 0°/180° ZXing path remains intact. SCAN-04 strict ROI geometry and session contracts do not need to be reverted.
