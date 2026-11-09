# SCAN-02 — Pure preview-to-source geometry mapping

**Status:** Merged by PR #59 at `891a3a6c8c85442d0b4a253c1fca43b36b590f1c`; main CI run #299 passed. User confirms deployment and existing-flow smoke test.  
**Base:** `main` at SCAN-01 merge commit `47b991de8a0040aa44e500aa6228127f9e59f0f6`.  
**Scope:** pure geometry utility and deterministic regression tests. No runtime consumer is wired.

## 1. Purpose

Convert a feature-owned `preview-content-normalized` rectangle into a `source-frame-normalized` rectangle using the actual source-frame dimensions and the video element's rendered geometry.

The mapper must model CSS replaced-element sizing without querying the DOM. The caller supplies measured dimensions and resolved presentation values. This keeps the scanner platform layer independent of Home/Stocktake markup and prevents geometry from becoming a camera-startup prerequisite.

## 2. Implementation

File: `src/platform/scanner/scannerGeometry.ts`

Public API:
- `ScannerObjectFit`
- `ScannerObjectPosition`
- `ScannerPreviewGeometry`
- `ScannerGeometryMappingResult`
- `parseScannerObjectPosition(value)` — resolves common computed CSS keywords/percentages to normalized fractions; returns `null` for unsupported length/calc forms.
- `mapPreviewScanRegionToSourceFrame(region, geometry)`

Inputs:
- `sourceWidth` / `sourceHeight`: intrinsic decoded camera frame dimensions (for video, `videoWidth` / `videoHeight`).
- `previewWidth` / `previewHeight`: video element content-box dimensions in CSS pixels.
- `objectFit`: `fill`, `contain`, `cover`, `none`, or `scale-down`.
- `objectPosition`: normalized free-space alignment fractions; 0 = start, 0.5 = center, 1 = end. Use `parseScannerObjectPosition()` for common computed CSS keywords/percentages; unsupported forms must be handled as an explicit mapping/configuration failure.
- `mirrored`: explicit CSS horizontal mirror state.
- `region`: a normalized rectangle relative to the actually visible image-content bounds.

Output:
- Success returns `source-frame-normalized` geometry and the visible content bounds in preview-element normalized coordinates.
- Failure returns a typed error code and message. It never returns a full-frame fallback.

## 3. Geometry rules

1. Compute the rendered object dimensions according to CSS `object-fit`.
2. Apply `object-position` to the free horizontal/vertical space. For `cover`, free space is negative and the position selects which source area is cropped.
3. Intersect the rendered image rectangle with the video element viewport to identify visible image content. Letterbox/pillarbox space is excluded.
4. Interpret the feature region relative to that visible content rectangle.
5. If mirrored, map the visually selected rectangle back through the horizontal mirror before converting to source coordinates.
6. Normalize the resulting source rectangle against the intrinsic frame dimensions.

The function is pure: no `window`, `document`, `getBoundingClientRect`, media stream, video element, React state, camera lease, or decoder dependency.

## 4. Validation and failure behavior

- All source/preview dimensions must be finite and greater than zero.
- Object-position fractions must be finite and within [0,1].
- The region must have finite coordinates, positive width/height, and remain within [0,1].
- Unsupported object-fit or invalid geometry returns `invalid-geometry`.
- Invalid feature region returns `invalid-region`.
- Empty visible intersection returns `no-visible-content`.
- An empty/out-of-bounds mapped result returns `mapped-region-out-of-bounds`.
- The caller must treat any failure as a mapping failure. No silent full-frame fallback is allowed when strict ROI mode is later activated.

## 5. Current production presentation facts

Verified from main:
- Home video fills `.barcode-scanner-view`, uses `object-fit: cover` and `object-position: center`. Its visible reticle is inset 22% vertically and 8% horizontally.
- Stocktake video fills `.stocktake-scanner-preview`, uses `object-fit: cover`. Its reticle is inset 28% vertically and 10% horizontally.
- Both modules own their video elements and presentation. The reticles are not yet wired to the mapper.
- The geometry helper does not alter these CSS rules or infer a scan region from them.

## 6. Test coverage

File: `scripts/test-scanner-geometry.mjs`; registered in `npm run preflight`.

Deterministic cases:
- `cover` in portrait and landscape viewports, including horizontal and vertical crop.
- `object-position` start/center/end alignment and computed CSS keyword/percentage parsing.
- `contain` and exclusion of letterbox area.
- `fill`, `none`, and `scale-down`.
- Mirrored preview coordinate conversion.
- Invalid rectangles, invalid dimensions and invalid object-position.
- Pure-function boundary: regression guard rejects `window.` / `document.` access, DOM geometry APIs and `HTMLVideoElement` references.

## 7. Explicitly out of scope

- No Home or Stocktake runtime wiring or reticle measurement.
- No DOM geometry reads in the platform session.
- No camera acquisition/constraints, lease/refcount, lifecycle, recovery, preview readiness or startup ordering changes.
- No decoder crop/ROI behavior, ZXing changes, rotation, deskew, perspective, barcode validation, cadence or result delivery changes.
- No CSS, UI, business workflow, dependency, schema, PWA or deployment changes.

## 8. Next steps

- **SCAN-03:** feature-owned adapters in Home and Stocktake provide their own reticle region, read the actual video box and computed presentation properties, then call the pure mapper. Region updates must not restart camera/session/decoder/frame loop.
- **SCAN-04:** after both consumers provide valid source regions, enable ROI-only decode and prove that barcodes outside the active ROI are not accepted.
- Real iOS Safari/PWA and Android Chrome/PWA geometry QA is required after SCAN-03 integration, not for this pure utility PR.
