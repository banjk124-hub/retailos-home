# SCAN-07 to SCAN-11 — research and implementation plan

**Baseline:** main `20ce22e4d015d01249d6996f5d5bb55b02bb976c`.
**Scope of this document:** source audit, architecture constraints, experimental design and acceptance gates. No runtime changes.

## Source audit snapshot

### Geometry and ROI
- `scannerGeometry.ts` maps module preview-content coordinates into source-frame-normalized coordinates, accounting for object-fit, object-position, visible content and horizontal mirroring.
- `scannerRoi.ts` converts only the published source-frame ROI to integer pixels. It rejects absent, invalid or out-of-bounds geometry.
- `zxingDecoder.ts` crops directly from the source frame; no full-frame decode and no centered fallback.
- Current crop is proportionally scaled against a 1280 px source-width cap, then enlarged 1.5×. This is a fixed policy, not adaptive multi-scale.

### Image pipeline
- Source ROI is drawn to canvas, read as RGBA and converted to luminance.
- Current first candidate is upright decode.
- On miss, an exact 90° clockwise candidate is attempted.
- Continuous orientation estimation/deskew is computed for original and quarter-turned ROI; candidates are ordered by absolute correction angle.
- Deskew uses a 180-bin Sobel orientation histogram, directional-energy/coherence gates and bounded inverse-angle bilinear resampling (6M-pixel cap).
- A percentile contrast stretch is already present for compressed 1st–99th percentile luminance ranges in the deskew helper. It is not a general gamma/denoise/adaptive-threshold subsystem.
- HybridBinarizer and GlobalHistogramBinarizer are both attempted per orientation candidate.
- ZXing checksum/format result remains the authority; transforms alone never produce a result.

### Scheduling and diagnostics
- Session decode calls are serialized; minimum decode interval is 70 ms.
- Existing diagnostics record ROI availability/dimensions, rotation/deskew attempts and hits, decode/stage timing and long-task observations.
- Current diagnostics do not yet constitute a calibrated benchmark: no standard labelled corpus, per-device success rates or repeatable low/mid/high hardware baseline is established in the current records.

## Critical architecture constraints

1. **Reticle contract:** feature-owned preview reticle → existing geometry mapper → source-frame-normalized ROI. Do not recalculate reticle geometry inside the decoder.
2. **Strict ROI:** do not enlarge outside an explicitly authorized module capture envelope. Do not add full-frame or centered fallback.
3. **Candidate preservation:** keep the unmodified current path as a baseline. New transforms run conditionally after a baseline miss or when a measured condition justifies them.
4. **Ordering and budgets:** bound candidate count, pixels and processing time. Avoid Cartesian multiplication of scales × rotations × enhancement × binarizers.
5. **Validation:** every candidate still passes through the existing ZXing format/checksum validation and downstream payload validation.
6. **Isolation:** no camera lease/lifecycle/recovery, UI presentation, Home lookup, Stocktake form/save or storage changes in optical algorithm PRs.
7. **Cross-platform:** avoid browser/device-name heuristics; use capability and observed runtime measurements.
8. **Evidence:** synthetic fixtures are regression controls, not proof of real optical performance. CI is not physical-device QA.

## Experimental corpus required before SCAN-07

Build a versioned, privacy-safe labelled corpus with:
- Symbology and exact expected payload held only in test fixtures (never production diagnostics).
- Source image dimensions and barcode pixel height/width.
- ROI position: center, each edge, partially clipped, outside-ROI negative.
- Orientation and in-plane skew.
- Distance represented by barcode pixel size, not an assumed physical distance.
- Lighting: normal, low-light, uneven illumination, shadow.
- Surface: matte, reflective/specular, planar perspective, curved.
- Blur/noise/compression and exposure clipping labels.
- Device/browser capture samples kept separate from synthetic transformations.

Measure baseline decode success, false positives, overall scanner response time, decode/stage time, peak candidate pixels, memory and UI responsiveness. Record sample counts and confidence intervals where feasible.

## Phase gates

### SCAN-07 — Adaptive ROI & multi-scale
- Audit reticle dimensions and crop pixel-height distribution first.
- Define whether padding means an internal safety margin, or an additional module-authorized capture envelope. These are not interchangeable.
- Keep strict reticle ROI as candidate zero. Any additional padding must have a contract owner and hard bounds.
- Evaluate bounded scales around current 1.5×; avoid upscaling beyond useful source detail.
- Compare per-scale decode hit, false-positive, time and memory.
- Do not ship adaptive selection until small/far fixtures improve without outside-reticle decodes or unacceptable overall scanner response time.

### SCAN-08 — Image enhancement
- Candidate zero is original luminance.
- Add condition detection before gamma, contrast, adaptive threshold or denoise.
- Test each transform independently, then only combine transforms with evidence.
- Detect saturated highlight coverage; do not attempt to infer missing bar edges from clipped pixels.
- Measure false positives and checksum failures, not only successful decodes.

### SCAN-09 — Perspective & curved barcode
- Separate planar projective distortion from curved-surface deformation.
- First research detection/confidence and geometry estimation; only then add rectification.
- Bound warp dimensions, interpolation and candidate count.
- Keep the original unwarped ROI available and prefer it when confidence is low.
- Curved dewarping requires dedicated labelled curved-label data and may remain deferred if no robust detector exists.

### SCAN-10 — Adaptive performance
- Establish measured device profiles from frame processing time, long tasks, memory and frame cadence.
- Adapt scale/transform candidate budgets, not the core camera/session lifecycle.
- Preserve at least one baseline decode attempt each eligible frame.
- Keep the decoder serialized and queue bounded.
- Change 70 ms cadence only through a separate measured proposal with overall scanner response time/accuracy trade-offs.

### SCAN-11 — Cross-platform hardening
- Matrix: iOS Safari/PWA and Android Chrome/PWA; Home and Stocktake; low/mid/high capability.
- Cover first open, permission grant/deny/retry, rapid open/close, background/foreground, camera interruption and recovery.
- Run real retail labels across orientation, small/far, low-light, reflective, curved/perspective and reticle-edge conditions.
- Record browser/OS/device class, app build, symbology, lighting, label pixel height, attempts, outcome, overall scanner response time and stage costs.
- Keep functional user acceptance distinct from quantified performance acceptance.

## Proposed PR sequence
1. PR #77: documentation/source reconciliation plus additive SCAN-07 implementation on the same branch.
2. SCAN-08 enhancement candidate PR after SCAN-07 acceptance.
3. SCAN-09 perspective/curved research followed by an opt-in implementation PR only if validated.
4. SCAN-10 adaptive budget PR after candidate costs are known.
5. SCAN-11 device matrix, instrumentation gaps and targeted fixes.

Every PR must identify exact base/head, code owners, changed files, test corpus, production-adapter regression, full preflight, device evidence and rollback path.
