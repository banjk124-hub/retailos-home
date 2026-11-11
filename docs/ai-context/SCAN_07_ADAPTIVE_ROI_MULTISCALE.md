# SCAN-07 — Adaptive ROI, multi-scale and coordinated focus recovery

**Status:** Active implementation on PR #78 branch. CI and physical-device acceptance pending.
**User feedback on PR #77:** modest improvement for small/far barcodes and reads near reticle edges, but not sufficient range/precision.
**Scope lock:** SCAN-07 remains active. Do not move to SCAN-08/09 yet.

## 1. Confirmed module/platform boundary

- Home and Stocktake use the same shared scanner hook, camera lease, session, decoder and validation platform.
- Each feature module owns its video element, visible reticle, presentation and business result handling.
- SCAN-02/03 preview-to-source mapping and SCAN-04 strict module ROI remain authoritative.
- Neither module publishes a wider capture envelope. Outward padding is not authorized and remains disabled.
- Home and Stocktake must both be tested; their single/continuous mode and business workflows may differ.

## 2. PR #77 deployed baseline

- Strict source ROI, no full-frame/center fallback.
- 1.5× baseline followed after a full miss by 1× and 2× bounded sampling.
- SCAN-05 exact quarter-turn and SCAN-06 continuous orientation/deskew, contrast normalization, Hybrid + GlobalHistogram.
- Serialized ZXing reader and existing 70 ms session interval.
- User confirms some improvement for small/far and reticle-edge labels, but current capability is not sufficient.
- No minimum barcode size or maximum reading distance has been measured.

## 3. Native ROI detail preservation

### Previous limitation

The decoder downscaled the source crop based on the entire frame width exceeding 1280 px. This discarded useful sensor pixels before the strict ROI reached the decoder, even when the ROI itself was small enough to process safely.

### PR #78 implementation

- Camera request prefers environment / 1920×1080 / 30 FPS maximum. Width/height are ideals; the browser may negotiate a lower actual resolution.
- Decoder preserves native source pixels inside the module-owned crop up to 2048 px ROI width and 1.5 MP native ROI area.
- Only oversized ROIs are proportionally downsampled to that bounded source budget.
- Sampling remains 1.5× baseline, then 1× and 2× only after a full baseline miss.
- Each additional scale remains capped at 6 MP; at most three candidates per source frame.
- All candidates use the same strict source crop and existing orientation/deskew/binarizer pipeline.

This increases the amount of source detail available to the decoder when the camera actually supplies higher-resolution frames. Upscaling alone does not create optical detail. Real device resolution and barcode pixel height must be recorded.

## 4. Autofocus source audit and correction

### Confirmed source issues

- Continuous autofocus was previously requested immediately after getUserMedia resolved, before the video element had played and produced a fresh frame.
- Camera capabilities may not be fully available at that point.
- The focus helper called applyConstraints() with only an advanced focusMode value. That API replaces the active custom constraint set; omitting existing width/height/frameRate/facing/device constraints could reset the negotiated camera configuration.
- Torch already applies track constraints after preview readiness. Independent focus and Torch calls could race and overwrite one another's advanced settings.

### PR #78 implementation

1. Move the initial focus request to the point after video.play() and first fresh-frame readiness.
2. Keep focus setup non-blocking; it must not delay preview readiness or decoder initialization.
3. Use a shared constraint builder that preserves current getConstraints() values and falls back to actual getSettings() for dimensions, frame rate, facing mode and device ID.
4. Serialize all track-level advanced constraint updates through one per-track queue shared by autofocus and Torch.
5. Record safe focus capability/result information; never log device identifiers or barcode payloads.

A successful applyConstraints() call means the browser accepted a request; it does not prove that the physical lens reached focus.

## 5. Bounded focus recovery watchdog

The decoder already reads grayscale pixels from the strict ROI. PR #78 reuses that readback at a low rate (one sample per 500 ms) to calculate:
- Laplacian sharpness (high-frequency edge response).
- Edge coverage (whether the ROI contains enough texture to evaluate).
- Frame-to-frame motion score after removing global brightness shift.

Recovery policy:
- Low-texture/blank ROI samples are ignored.
- Motion/changing frames are ignored so camera movement does not trigger repeated focus reconfiguration.
- A previously sharp ROI must show four consecutive stable samples below 55% of its reference sharpness before recovery is requested.
- Recovery is limited to one reassertion per 8 seconds.
- Recovery runs only if continuous focus was exposed and accepted by the browser. If unsupported/unavailable, the engine does not pretend it can control the lens.
- Reapply uses the shared serialized track-constraint queue and preserves Torch/current camera settings.

This is a conservative recovery request. It cannot guarantee hardware refocus, and image sharpness can still be affected by motion, exposure, glare, curved packaging and low light. Physical-device validation is mandatory.

## 6. Protected behavior

No changes to:
- SCAN-02/03 geometry mapping or module-owned reticle publication.
- SCAN-04 strict ROI/no-full-frame fallback.
- SCAN-05/06 orientation/deskew/result validation.
- Camera lease reference counting, tap-origin acquisition, session lifecycle, background recovery or teardown ordering.
- Preview surface ownership, UI/presentation, Home lookup, Stocktake form-fill/explicit-save.
- ZXing reader serialization, result semantics or the 70 ms session interval.
- Dependencies, workers, backend, storage or deployment configuration.

## 7. Automated verification

- `scripts/test-scanner-scale.mjs`: native ROI preservation and source-pixel bounds, baseline ordering, fallback ordering, unique candidates and scale allocation bounds.
- `scripts/test-scanner-focus-quality.mjs`: sharp vs blurred ROI, motion filtering, sustained blur trigger and cooldown.
- `scripts/test-scanner-track-constraints.mjs`: concurrent focus/Torch requests are serialized and both advanced constraints survive.
- `scripts/test-scanner-validation.mjs`: focus is deferred until preview-ready and existing camera constraints survive autofocus.
- `scripts/test-scanner-torch.mjs`: Torch uses the same shared track constraint helper.
- Full `npm run preflight`, TypeScript, production build and Pages build must pass on the final PR head.

## 8. Device acceptance — required on both Home and Stocktake

Test iOS Safari/PWA and Android Chrome/PWA on low-, mid- and high-capability devices.

For each test, record:
- Device class/model, OS, browser/version, PWA/browser mode, build SHA and module.
- Actual camera width, height, frame rate, focus capability list and actual focus mode when exposed.
- Barcode symbology, printed module/bar width, measured source ROI pixel height and physical distance from camera.
- Orientation, camera movement, lighting, reflective/glare condition, packaging curvature and reticle placement.
- Correct payload/check digit, false positives, whether focus recovered without closing/reopening, and whether UI/preview remained responsive.

Required cases:
- Near-to-far and far-to-near movement while scanner remains open.
- Small labels at increasing distance; rotated labels and reticle edges.
- Fast camera pan followed by stillness.
- Low light and reflective packaging.
- Curved packaging and perspective-distorted labels (record as SCAN-07 integration observations; do not implement SCAN-08/09 transforms here).
- Outside-reticle negative controls.
- Home lookup and Stocktake form-fill/explicit-save flows.

Do not use overall scanner response time as a SCAN-07-specific metric. Record decoder-stage processing cost separately from camera/focus/session/module behavior. Do not claim an absolute minimum barcode size or maximum distance until the matrix is measured.

## 9. Rollback

Revert the native ROI sampling/camera request changes, focus lease methods, shared track-constraint helper, watchdog and diagnostics as a single SCAN-07 unit. Preserve the PR #77 strict-ROI multi-scale baseline. Camera/session ownership and feature workflows remain structurally unchanged.
