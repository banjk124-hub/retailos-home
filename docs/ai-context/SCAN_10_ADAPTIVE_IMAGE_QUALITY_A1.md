# Scanner A1 — Adaptive Image Quality Diagnosis

## Purpose
A1 turns existing grayscale ROI measurements into a scalar-only profile and actionable multi-label findings. Operators should not need to interpret raw sharpness, luminance, contrast or noise values. Modules own presentation; the scanner engine emits diagnosis data only.

## Data path
1. Reuse the existing strict ROI and grayscale readback.
2. At the existing 500 ms observation cadence, measure image quality from that same grayscale buffer.
3. Combine focus and image-quality measurements into the versioned profile.
4. Map evidence to stable finding codes, severity, Vietnamese description and practical recommendation.
5. Expose the latest profile through existing decoder diagnostics. No additional image readback or retained pixels.

## Findings
Findings are multi-label; several causes may coexist: exposure, clipping, contrast, dynamic range, noise, glare, measurable low sharpness, measurable frame-to-frame motion, or insufficient visual detail.

Each finding contains a stable code, severity, description and recommendation. Recommendations are operator guidance, not camera commands. The UI remains module-owned.

## Measurement semantics
- Motion is classified only when a valid same-ROI temporal reference exists. Unknown motion is not treated as stable or moving.
- A single frame cannot prove motion blur. The finding describes observed frame-to-frame change, not its cause.
- Low sharpness is reported only when the focus sample is valid and contains measurable edges. A blank ROI is not called blurry.
- Existing image issue thresholds remain heuristic indicators, not calibrated probabilities or decode eligibility gates.
- No global quality score is introduced; multiple findings preserve distinct failure causes.
- Invalid measurements fail closed. Profiles contain scalar data only, never pixels, canvas, ImageData, tracks or DOM objects.

## Boundaries
A1 observes and diagnoses only. It does not change camera controls, lifecycle, scheduling, ROI, decode candidate order, payload validation or presentation. Adaptive decisions belong to A2/A3.

## Validation
Automated validation covers profile bounds, source-ROI provenance, issue-to-description mapping, multiple simultaneous findings, motion-reference semantics, low-texture handling, and preservation of the 500 ms cadence/readback reuse.

Synthetic fixtures provide deterministic algorithmic regression coverage. Exhaustive manual testing of every device condition is not an A1 acceptance requirement; runtime findings must make field conditions diagnosable without requiring operators to inspect raw metrics.
