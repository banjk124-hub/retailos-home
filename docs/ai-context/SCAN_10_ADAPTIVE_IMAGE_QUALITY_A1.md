# Scanner A1 — Adaptive Image Quality Observation

## Purpose

A1 creates one versioned, serializable quality profile from the scanner's existing grayscale ROI observation. It standardizes the evidence that later adaptive stages may consume. A1 is observation-only.

## Data path

1. The decoder draws the existing strict module-owned ROI into its baseline canvas.
2. The existing `getImageData()` readback is converted to grayscale once.
3. At the existing 500 ms focus-observation cadence, A1 runs image-quality analysis on that same grayscale buffer.
4. `createScannerImageQualityProfile()` combines the focus and luminance metrics.
5. The latest profile is included in the existing decoder diagnostic event.
6. If the same frame later reaches the image-enhancement fallback stage, the pipeline reuses the precomputed quality result instead of measuring the same pixels again.

A1 does not add camera readbacks, retain image pixels, change the ROI, or change decode candidate order.

## Profile contract

`ScannerImageQualityProfile` is versioned with `schemaVersion: 1` and contains:

| Group | Metrics |
|---|---|
| Focus | Sharpness (RMS Laplacian), edge coverage, luminance standard deviation, motion score, motion-reference availability |
| Exposure | Mean luminance, dark fraction, bright fraction, percentile dynamic range |
| Contrast | Horizontal contrast, vertical contrast, orientation-aware edge strength |
| Noise | Horizontal and vertical impulse-noise observations |
| Glare | Saturated-pixel fraction, glare-band coverage and orientation |
| Issues | Existing advisory issue flags from image-quality analysis |

The profile contains scalar values and issue labels only. It does not contain canvas, ImageData, pixel arrays, video elements, tracks, or DOM references.

## Metric semantics and limitations

- `motionScore` is meaningful only when `motionAvailable` is true. The first observation, or an observation after the source ROI changes, has no valid temporal reference; a zero score in that case must not be interpreted as a stable scene.
- Motion comparison requires the same canvas dimensions and the same source-frame dimensions plus crop coordinates. Moving the ROI invalidates the previous motion reference even when the crop dimensions remain unchanged.
- Horizontal and vertical contrast are both retained. A barcode rotated by 90 degrees must not be treated as low contrast merely because one directional metric is small.
- Exposure, contrast, noise and glare issue flags are advisory heuristics, not calibrated probabilities or decode-eligibility rules.
- A1 deliberately does not publish a single quality score or categorical good/bad label. There is no validated real-world benchmark yet to justify a universal weighting or threshold across Android and iOS camera pipelines.
- Focus validity and image-quality issue flags are separate observations. A low-texture frame may have invalid focus metrics while still carrying useful exposure/clipping observations.

## Ownership boundaries

A1 may observe pixels already owned by the decoder. It must not:
- change autofocus, exposure, torch, zoom, or other camera controls;
- change camera lifecycle, frame scheduling, or preview presentation;
- alter the scan region or decode candidate order;
- accept or reject barcode payloads;
- select adaptive processing strategies.

Those decisions belong to later stages, especially A2. Payload validation remains in `UniversalScannerSession`.

## Validation

The A1 profile regression test checks:
- profile schema and metric grouping;
- bounded dimensions and finite/range validation;
- absence of retained pixel buffers;
- motion-reference availability semantics;
- propagation of underexposure and clipping signals;
- source-ROI identity in motion comparison;
- 500 ms sampling and reuse of same-frame quality analysis.

Synthetic fixtures are useful for deterministic regression coverage but do not replace physical-device validation. Android and iOS QA must inspect diagnostic profiles under sharp, blurred, low-light, low-contrast, noisy, rotated and glare conditions before A1 is treated as production-validated.