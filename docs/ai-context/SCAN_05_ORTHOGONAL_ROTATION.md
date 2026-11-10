# SCAN-05 — Orthogonal ROI rotation decoding

**Status:** Implemented on final consolidated PR #66. Staged PR #64 CI run #338 and final consolidated PR #66 CI run #368 passed before the audit follow-up commits; fresh CI is required for the latest head. Physical iOS/Android QA remains pending.

## Verified baseline

- Production ZXing initialization enables `DecodeHintType.TRY_HARDER`.
- ZXing `OneDReader` already reverses 1D scanlines and reports orientation 180°.
- EAN-8 and EAN-13 inherit the shared `OneDReader` implementation.
- RetailOS uses `RGBLuminanceSource`, which does not support ZXing bitmap rotation; 90°/270° therefore require an explicit ROI transform.
- Runtime baseline fixture verifies Code 128 at 0°/180°. The orthogonal rotation suite now also rasterizes EAN-8 and EAN-13 fixtures and verifies both 90° and 270° normalization at runtime.

## Runtime flow

```text
strict reticle ROI -> grayscale -> normal decode (0° + built-in 180° reversal)
                                  |
                                  +-- hit -> return
                                  |
                                  +-- miss, every third valid ROI frame
                                         |
                                         v
                                  one 90° clockwise ROI transform
                                         |
                                         v
                                  decode (0° + built-in 180° reversal)
                                         |
                                         +-- hit -> return
                                         +-- miss -> SCAN-06 deskew stage
```

One clockwise quarter-turn covers both source directions: 90° input becomes 180°; 270° input becomes 0°. This avoids four independent orientation passes.

## Implementation

- `src/platform/scanner/scannerRotation.ts` provides pure `rotateLuminance90Clockwise()`.
- It swaps output dimensions, maps source pixels deterministically and fails closed on invalid input.
- Decoder always tries the unrotated strict ROI first.
- Extra quarter-turn runs only after a miss and every third valid ROI frame, using a dedicated processing sequence independent of diagnostics sampling.
- Existing 110 ms session cadence, supported formats, binarizer schedule, validation and result delivery remain unchanged.
- Diagnostics expose rotation attempts/hits and separate processing-stage costs.

## Regression coverage

- `scripts/test-scanner-rotation-baseline.mjs`: Code 128 runtime decode at 0°/180°, 180° metadata, EAN inheritance guards and production `TRY_HARDER` wiring.
- `scripts/test-scanner-rotation.mjs`: pixel mapping, dimensions, invalid-input rejection and runtime Code 128, EAN-8 and EAN-13 decode after 90°/270° normalization.
- `scripts/test-scanner-decoder-integration.mjs`: production `ZXingDecoderAdapter` integration for upright decode, third-valid-frame 90°/270° recovery, strict ROI crop and fail-closed no-full-frame-fallback behavior.
- All suites are registered in preflight. CI #338 and #368 passed the pre-follow-up baseline; the latest audit follow-up requires a fresh CI run.

## Device acceptance

On iOS Safari/PWA and Android Chrome/PWA, test Home and Stocktake independently:
1. EAN-13, EAN-8 and Code 128 at 0°/90°/180°/270°.
2. Center and near-edge placement while fully inside the reticle.
3. Barcode outside reticle must not decode through a full-frame fallback.
4. Record time-to-decode and diagnostics on low- and high-end devices.
5. Confirm Home lookup and Stocktake form/save behavior.

CI does not prove physical optical accuracy, focus quality, device CPU cost or real barcode accuracy.

## Rollback

Revert the SCAN-05 quarter-turn helper and decoder integration as one unit. The existing 0°/180° path and SCAN-04 strict ROI contract remain intact.
