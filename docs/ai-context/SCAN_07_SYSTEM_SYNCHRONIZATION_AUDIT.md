# SCAN-07 system synchronization audit — 2026-11-11

**Branch:** fix/scanner-scan07-focus-and-optical-pipeline
**Base:** PR #77 merge commit 2c3fc1bd4b37f19bcfba2b1d7974184eb5e42c49
**Status:** implementation in progress; CI and device QA pending.
**Scope lock:** SCAN-07 only. Do not start SCAN-08/09.

## 1. User-verified result from PR #77

- Small/far barcode reading improved modestly.
- Barcodes close to reticle edges can be read.
- Improvement is not sufficient for the required reading range or precision.
- User observed focus becoming very soft, periodic focus hunting, and cases where autofocus did not recover until the scanner was closed and reopened.
- No numerical minimum barcode size or maximum reading distance has been established.
- Overall scanner response time is not a SCAN-07 metric; it includes camera startup, focus, frame delivery, decoder, session, module callback and close/release behavior.

## 2. Shared platform audit

Both Home and Stocktake consume:
- `useScannerEngine`
- `UniversalScannerSession`
- Shared `cameraSession.ts` lease and reference-counted stream
- Shared `ZXingDecoderAdapter`
- Shared ROI, orientation, deskew, barcode validation and focus/Torch track controls

Feature-owned differences remain:
- Home result callback and lookup workflow.
- Stocktake single-result form-fill and explicit-save workflow.
- Each module owns its video element, reticle and presentation.

A scanner-platform change must therefore be regression-tested against both consumers. Do not duplicate decoder or focus logic inside either feature.

## 3. Confirmed source findings

### 3.1 Native ROI information was discarded too early

The old decoder scaled the source ROI based on the entire frame width exceeding 1280 px. A 1080p camera could therefore provide more sensor pixels, but the decoder reduced the crop before sampling it.

**Change in this branch**
- Keep the crop strict and module-owned.
- Preserve native source pixels up to 2048 px ROI width and 1.5 MP ROI area.
- Downsample only oversized ROI crops.
- Prefer 1920×1080 camera input with a 30 FPS maximum; actual browser-negotiated settings are recorded and remain authoritative.
- Keep 1.5× baseline first, then 1×/2× fallback only after a complete baseline miss. Each additional candidate is capped at 6 MP.

Upscaling alone does not create optical detail. Improvement depends on the actual camera resolution, lens, barcode physical module size and distance.

### 3.2 Autofocus was requested too early

The previous flow requested continuous focus as soon as getUserMedia returned, before video playback and fresh-frame readiness. Camera capabilities can be incomplete before the track is actually streaming.

**Change in this branch**
- The camera lease is still delivered immediately after getUserMedia; autofocus never blocks lease acquisition.
- The owning session requests focus after video.play() and a fresh frame.
- Preview readiness and decoder initialization do not await the focus request.

### 3.3 Autofocus could reset the active camera constraints

The previous focus helper called applyConstraints() with only the advanced focusMode property. applyConstraints replaces the active custom constraint set. Omitting the active width/height/frameRate/facing/device constraints can reset negotiated camera settings.

**Change in this branch**
- Shared `mediaTrackConstraints.ts` preserves existing getConstraints() and fills missing key values from getSettings().
- Focus and Torch both use the same helper.
- A per-track serialized queue prevents simultaneous focus/Torch updates from overwriting each other's advanced settings.

### 3.4 A continuous-focus request did not prove optical focus

A successful browser constraint request only confirms that the browser accepted the request. It does not prove the physical lens reached focus or continues to track distance.

**Change in this branch**
- The decoder reuses its existing grayscale ROI readback at a low rate (500 ms) to calculate sharpness, edge coverage and frame-to-frame motion.
- Blank/low-texture samples are ignored.
- Changing/moving frames are filtered before any focus re-arm.
- Four consecutive stable samples below 55% of a previously sharp reference can trigger a continuous-focus reassertion.
- Re-arm is limited to one request per 8 seconds and only occurs when continuous focus is exposed and accepted.
- The operation remains on the shared camera track queue and preserves Torch/current camera settings.

This is a bounded re-arm request, not a guarantee of physical refocus. Motion, glare, exposure, curved packaging and changing barcode texture can still affect the sharpness metric.

## 4. Protected SCAN-01 to SCAN-06 contracts

- SCAN-01 camera request remains a module intent passed through the tap-origin camera lease.
- SCAN-02/03 preview-to-source geometry and module-owned reticle remain unchanged.
- SCAN-04 strict ROI remains fail-closed; no full-frame, centered or inferred outward-padding fallback.
- SCAN-05 exact quarter-turn and SCAN-06 continuous orientation/deskew, percentile contrast and two binarizers remain in the same pipeline. Valid baseline Sobel orientation estimates are reused across fallback scales for the same frame; missing estimates are recomputed, and hints reset every frame.
- Camera lease ref-counting, session lifecycle, fresh-frame readiness, foreground recovery and teardown order remain intact.
- Decoder calls remain serialized; the 70 ms session interval is unchanged.
- Barcode validation and Home/Stocktake result semantics remain unchanged.

## 5. Automated regression added

- `test-scanner-scale.mjs`: native ROI source-pixel preservation, source ROI bounds, 1.5× baseline ordering, 1×/2× fallback ordering, candidate uniqueness and pixel caps.
- `test-scanner-focus-quality.mjs`: sharp/blur discrimination, low-texture rejection, motion filtering, four-sample re-arm and cooldown.
- `test-scanner-track-constraints.mjs`: concurrent autofocus/Torch updates serialize and retain both advanced constraints.
- `test-scanner-validation.mjs`: camera lease remains non-blocking, focus waits for session preview readiness, active camera settings survive focus.
- `test-scanner-torch.mjs`: Torch uses the shared serialized track helper.
- All new tests are registered in `npm run preflight`.

CI is pending on the final branch head. Do not claim these tests pass until GitHub Actions confirms it.

## 6. Physical acceptance matrix

Test each case in both Home and Stocktake on iOS Safari/PWA and Android Chrome/PWA, across low-, mid- and high-capability devices.

Record:
- Device/OS/browser/build SHA and module.
- Actual camera width, height, frame rate, focus capability list and actual focus mode when exposed.
- Barcode symbology, printed X-dimension/bar width, source ROI pixel height and physical distance.
- Near-to-far and far-to-near movement without closing the scanner.
- Upright, 90°/180°/270°, intermediate angle, reticle center and reticle edge.
- Fast pan followed by stillness; focus hunting; sustained blur; whether focus recovers without closing/reopening.
- Low light, reflective/glare, curved package and perspective-distorted labels.
- Correct payload/check digit, false positives, missed reads and UI/preview responsiveness.
- Outside-reticle negative controls.

Do not record overall scanner response time as SCAN-07 performance. Record decoder-stage processing cost separately from camera/focus/session/module behavior.

## 7. Closure rule

SCAN-07 is not complete until:
- Native ROI detail shows repeatable improvement on measured small/far labels.
- Focus recovery behaves correctly on supported devices and degrades honestly where the browser does not expose focus control.
- Both Home and Stocktake pass the real-device matrix.
- No strict ROI, camera lifecycle, Torch, decoder serialization or retail workflow regression is found.

Only after this closure should SCAN-08 enhancement and SCAN-09 perspective/curved-label work begin.
