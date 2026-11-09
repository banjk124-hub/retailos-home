# SCAN-03 — Module-owned preview region integration

**Status:** Implemented on `feat/scan-03-module-region-integration`; GitHub Actions run #309 passed full preflight/build. PR #61 remains Draft and depends on PR #60.  
**Base:** SCAN-02 merged main `891a3a6c8c85442d0b4a253c1fca43b36b590f1c` plus the SCAN-02 audit/test correction branch.  
**Scope:** Measure Home and Stocktake's existing reticles independently, map each to source-frame coordinates, and publish the result into the active session without restarting it.

## 1. Purpose

Wire the pure SCAN-02 mapper into the two existing scanner presentations while preserving their independent UI, layout and business ownership.

- Home owns `.barcode-scanner-view`, its video element and `.barcode-scan-frame` reticle.
- Stocktake owns `.stocktake-scanner-preview`, its video element and `.stocktake-scanner-reticle` reticle.
- A shared feature-level binding hook may reuse measurement mechanics, but it must not render or own either module's UI.
- The platform session stores the latest source region as technical state. The decoder does not consume it until SCAN-04.

## 2. Geometry measurement pipeline

1. Wait until the feature is already scanning and its own reticle is mounted. This is a post-readiness measurement, never a camera-startup prerequisite.
2. Read intrinsic video dimensions from `videoWidth` / `videoHeight`.
3. Measure the video and reticle with their own `getBoundingClientRect()` values.
4. Read computed `object-fit`, `object-position` and the video element's transform.
5. Resolve the visible image-content bounds through the SCAN-02 pure mapper.
6. Intersect the reticle with visible image content, excluding any letterbox/pillarbox region.
7. Normalize the clipped reticle relative to visible content and map it into `source-frame-normalized`.
8. Publish the region with `ScannerSession.setScanRegion()`.

Unsupported object-position syntax or unsupported video transforms fail closed by publishing `null`; the adapter must never substitute full-frame geometry.

## 3. Runtime update contract

- `setScanRegion()` and `getScanRegion()` update/read a defensive snapshot on the current session.
- Region updates must not change session generation, camera lease/refcount, decoder instance, decode cadence, frame callback scheduling or lifecycle state.
- ResizeObserver plus viewport/orientation/video metadata events trigger a coalesced remeasurement.
- The active region is reset when the feature is not scanning or the geometry is invalid.
- A replacement video surface after foreground recovery is measured again after the new session reaches scanning.

## 4. Current module reticles

- Home: `.barcode-scan-frame`, currently inset 22% vertically and 8% horizontally.
- Stocktake: `.stocktake-scanner-reticle`, currently inset 28% vertically and 10% horizontally.
- No CSS, dimensions, animation, camera constraints or module workflow changes are intended by SCAN-03.

## 5. Explicitly out of scope

- No decoder crop or ROI-only decoding. `ZXingDecoderAdapter.decode()` continues to receive the full video source.
- No rotation, deskew, perspective correction, barcode validation or result-delivery changes.
- No camera acquisition, camera lease/refcount, startup/readiness, lifecycle/recovery or frame-loop changes.
- No shared scanner UI, reticle, transition, presentation or exit ownership.
- No Home lookup or Stocktake form-fill, duplicate-row, revision, save or export changes.

## 6. Acceptance gates

- Automated geometry-adapter tests cover Home and Stocktake reticles, visible-content clipping, mirror inversion, invalid dimensions, unsupported CSS positions/transforms and in-place session updates.
- Full preflight, TypeScript, production build and GitHub Pages build pass.
- Source diff confirms no decoder, camera, lifecycle, cadence, CSS or business-flow changes.
- After deployment, physically verify reticle-to-source alignment and barcode behavior on iOS Safari/PWA and Android Chrome/PWA.
- SCAN-04 remains blocked until both modules have valid source regions and device QA evidence.