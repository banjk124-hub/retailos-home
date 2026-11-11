# SCAN-01 — Scanner input and module configuration contract

**Status:** Merged to `main` by PR #58 at `47b991de8a0040aa44e500aa6228127f9e59f0f6`; user confirms deploy and device testing without issues.  
**Original base:** `main` at `09cd3b5117ea38a16dd991f74320835b67ea04b5`.  
**Scope:** platform-neutral TypeScript contracts only. No scanner runtime behavior is changed by this PR.

**Current implementation clarification (2026-11-11):** SCAN-02/03 geometry is active through `useScannerPreviewRegionBinding` and `ScannerSession.setScanRegion()`. The aggregate `ScannerModuleConfig` is not currently consumed by Home/Stocktake; in particular, `cameraRequest` is declarative only. `cameraSession.ts` currently uses one shared camera stream with fixed environment / 1280×720 / 30 FPS preferences. Per-module camera requests are deferred until shared-stream compatibility, pending-request ownership, tap-origin acquisition and recovery re-acquisition semantics are designed together. Do not wire per-module constraints by bypassing the existing lease path.

## 1. Purpose

Establish an unambiguous boundary between feature-owned scan intent and shared scanner processing before geometry mapping or ROI decoding is implemented.

Home and Stocktake continue to own separate preview elements, reticles, layout, presentation transitions, and business callbacks. The shared scanner must not infer module intent from the DOM.

## 2. Coordinate spaces

All rectangles use normalized fractions, not CSS pixels or device pixels:

- `x`, `y`: top-left origin.
- `width`, `height`: positive extents.
- Valid rectangle invariant: each value is finite; `x >= 0`, `y >= 0`, `width > 0`, `height > 0`, `x + width <= 1`, and `y + height <= 1`.

### `preview-content-normalized`

Feature-owned input. The rectangle is relative to the visible video image content, excluding any letterbox/crop area outside the actual image. Coordinates follow the visual orientation presented by the module (including CSS mirroring). It is not relative to the outer dialog, preview container, viewport, or reticle border.

### `source-frame-normalized`

Resolved technical input. The rectangle is relative to the unrotated camera source frame, with origin at the source frame's top-left. It is independent of rendered preview aspect ratio and CSS dimensions.

SCAN-02 owns the pure mapping between these spaces. It must account for source dimensions, rendered content bounds, `object-fit`, `object-position`, and mirror state. It must not add a camera-startup DOM geometry barrier.

## 3. Camera request

`ScannerCameraRequest` expresses module intent using preferred values:

- `facingMode`: `environment` or `user`.
- `preferredWidth`, `preferredHeight`: preferred source dimensions.
- `preferredFrameRate`: preferred frame rate.
- `maxFrameRate`: optional upper bound.

These are ideal preferences, not exact constraints. Display aspect ratio is not a camera request and must never be used to derive sensor resolution.

The exported default remains environment / 1280×720 / 30 FPS ideal / 30 FPS maximum, matching current production behavior. No module currently passes a different request in SCAN-01.

## 4. Module contract

`ScannerModuleConfig` requires:

- `previewScanRegion`: feature-owned region in preview-content normalized coordinates.
- `cameraRequest`: feature-owned camera intent.

The module defines its active region from its own reticle/layout. A future module may use a different region or camera request without sharing presentation components.

## 5. Runtime and migration rules

- This PR defines types and the source-of-truth contract only; it does not activate ROI filtering.
- Existing Home and Stocktake behavior remains unchanged until SCAN-02/03 map and wire both consumers.
- Until both consumers provide a valid region, existing full-frame behavior remains as-is; do not silently change it during contract introduction.
- Once strict ROI mode is enabled in a later PR, invalid/missing geometry must fail closed rather than silently decode the full frame.
- Updating a region must not recreate the camera stream, session, decoder, or frame loop.
- Core receives resolved source-frame region data; it does not inspect reticle DOM, decide reticle layout, or own UI presentation.
- No decoder rotation, deskew, perspective correction, contrast recovery, or additional dependencies are in scope.

## 6. Protected behavior

No changes to camera lease/refcount, single-claim handoff, cancellation/release ordering, preview readiness, lifecycle/recovery, decoder cadence, one-decode-in-flight guard, ZXing implementation, EAN validation, CODE-128 payload handling, result acceptance/cooldown, Torch, feedback settings, Home lookup, or Stocktake form/save/revision/export behavior.

## 7. Next PR dependencies

1. **SCAN-02:** implement and test pure preview-to-source geometry mapping, including `object-fit: cover`, `contain`, `object-position`, and mirrored preview cases.
2. **SCAN-03:** independently wire Home and Stocktake module configs and update region inputs without restarting the session.
3. **SCAN-04:** enable ROI-only decode and add regression coverage proving a barcode outside the active region is not accepted.
4. **SCAN-05:** establish representative labelled barcode image/device benchmarks before adding recovery algorithms.

## 8. Acceptance for SCAN-01

- Contract types compile under the existing TypeScript build.
- Coordinate spaces, units, origin, orientation and rectangle invariants are documented.
- Default camera preferences match the current 1280×720 / 30 FPS behavior.
- No Home/Stocktake runtime call sites or scanner lifecycle/decoder implementation are changed.
- Full repository preflight and PR CI pass.
