# SCAN-07 system synchronization audit — 2026-11-11

**Merged baseline:** PR #78 merge commit adee2b2815097a3d17714b2305fc144a240a3bac
**Corrective branch:** fix/scanner-native-autofocus-no-rearm
**Status:** post-merge focus correction in progress; automated verification pending; device QA pending.
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
- Shared ROI, orientation, deskew, barcode validation and Torch track controls

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

### 3.2 Post-preview focus request caused camera disturbance

The merged PR #78 moved the optional continuous-focus request until after the first fresh video frame. Although it did not await the request, it still issued `applyConstraints()` after the user could already see the preview. The request could therefore alter camera focus behavior during the live session. The watchdog could then issue additional focus requests after sustained blur samples.

**Corrective decision**
- Continuous autofocus is expressed only as an optional `advanced` preference in the initial `getUserMedia()` request.
- Advanced constraints are best-effort. If the browser/device does not support or accept the optional focus preference, it is ignored and native camera autofocus remains in control.
- No focus `applyConstraints()` call is allowed after preview readiness.
- Camera lease and session contracts expose no `prepareForScanning()` or `reapplyContinuousAutofocus()` methods.
- The preview and decoder startup path does not wait for a separate focus request.

### 3.3 Torch constraint preservation remains, focus writes are removed

The previous focus helper used `applyConstraints()` with an advanced focusMode value. That required preserving active width/height/frameRate/facing/device constraints and serializing focus and Torch writes.

**Corrective decision**
- Keep the shared constraint-preservation helper for Torch ON/OFF operations.
- The initial focus preference is already part of the camera request; Torch updates must preserve that existing advanced preference.
- Do not call the shared helper for focus. There is no post-preview focus write to serialize with Torch.
- The per-track queue remains useful for repeated Torch changes and prevents overlapping track updates.

### 3.4 Focus quality is diagnostic only

A successful optional focus preference does not prove that the physical lens has locked or tracks distance. Conversely, a missing `focusMode` setting does not prove that native autofocus is unavailable.

**Corrective decision**
- Keep low-rate sharpness, edge-coverage and motion sampling from the existing grayscale ROI readback.
- Ignore blank/low-texture samples and filter moving/changing frames.
- Sustained blur may be reported as a diagnostic event after four stable samples, with an 8-second report cooldown.
- The diagnostic must never issue focus commands, change track constraints, or claim that camera control changed.
- The camera remains responsible for native autofocus behavior regardless of whether focus capability metadata is exposed.

This separates observation from control. Motion, glare, exposure, curved packaging and changing barcode texture can still affect sharpness; passive telemetry is not a guarantee of focus recovery.

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
- `test-scanner-focus-quality.mjs`: sharp/blur discrimination, low-texture rejection, motion filtering, passive sustained-blur reporting and cooldown.
- `test-scanner-track-constraints.mjs`: serialized Torch updates preserve the optional initial focus preference and active camera settings.
- `test-scanner-camera-request.mjs`: optional focus is negotiated at initial getUserMedia request; lease exposes no post-preview focus API.
- `test-scanner-validation.mjs`: safe focus diagnostics do not expose device identifiers.
- `test-scanner-torch.mjs`: Torch uses the shared serialized track helper.
- All new tests are registered in `npm run preflight`.

GitHub Actions #677 passed the code/test head and final-head #678 passed full preflight, TypeScript, production build and Pages build. Physical-device QA remains pending.

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
- Native autofocus remains smooth without scanner-issued post-preview focus commands; unsupported focus metadata falls back to device-native behavior.
- Both Home and Stocktake pass the real-device matrix.
- No strict ROI, camera lifecycle, Torch, decoder serialization or retail workflow regression is found.

Only after this closure should SCAN-08 enhancement and SCAN-09 perspective/curved-label work begin.
