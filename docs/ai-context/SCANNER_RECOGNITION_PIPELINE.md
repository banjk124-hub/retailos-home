# Unified Scanner Recognition & Enhancement Pipeline

**Status:** PR A+B combined foundation — implementation in review, CI/device verification pending.
**Scope:** scanner recognition path only. No camera acquisition, session lifecycle, module presentation or retail workflow rewrite.

## 1. Design objective

The scanner is a dedicated recognition subsystem. It must accept barcode images independent of the physical carrier (A4/A3/A5 paper, shelf label, package, screen or other surface). The carrier is not a symbology and must never select a different scanner mode.

The recognition pipeline is symbology-agnostic. A format is accepted only when it is registered at the supported-format boundary, mapped to the decoder and covered by the payload-validation policy. Adding a new symbology must not require rewriting image enhancement or camera code.

## 2. Runtime ownership boundaries

1. **Camera Platform / Session** owns permission, stream lease, lifecycle, fresh-frame readiness and bounded frame scheduling.
2. **Feature module** (Home or Stocktake) owns the video element, visible reticle, source-frame ROI publication and its business workflow.
3. **ROI boundary** accepts only the current module-owned `source-frame-normalized` rectangle. Invalid/missing geometry fails closed. The recognition pipeline cannot expand, recenter or replace it with a full-frame scan.
4. **Sampling / Enhancement Pipeline** derives bounded image candidates from that exact ROI.
5. **Decoder** evaluates each candidate using the configured symbology allowlist and ZXing.
6. **Validation / Result Handoff** remains downstream and authoritative. Home lookup and Stocktake form-fill/explicit-save remain feature-owned.

## 3. Current execution order

The production adapter delegates candidate orchestration to `scannerEnhancementPipeline.ts`.

| Order | Stage | Behavior |
|---|---|---|
| 1 | Baseline | Decode original ROI luminance first. No enhancement may displace this candidate. |
| 2 | Orthogonal | Only after baseline miss, derive the exact 90° clockwise candidate. |
| 3 | Deskew | Only after both earlier candidates miss, estimate orientation on the original and quarter-turned ROI; reject low-confidence estimates; create bounded bilinear corrections and try the smallest correction first. |

For each candidate, the existing HybridBinarizer and GlobalHistogramBinarizer paths remain active. The pipeline exits at the first ZXing decode output. The shared session then applies the existing payload validation and accepted-result policy.

The outer SCAN-07 sampling loop remains unchanged:
- 1.5× is the first scale candidate.
- 1× and 2× are bounded fallbacks only after the complete 1.5× candidate path misses.
- Valid orientation estimates may be reused by those fallback scales within the same source-ROI decode attempt.
- The decoder remains serialized; there is no parallel reader access or unbounded candidate queue.

## 4. What this PR changes

- Moves SCAN-05/06 candidate ordering and early-exit orchestration out of the ZXing adapter into one explicit pipeline service.
- Keeps ZXing responsible for decoding a supplied candidate, not deciding how every image transform is sequenced.
- Preserves current candidate order, binarizers, contrast normalization inside the existing deskew transform, scale fallback order, orientation reuse and diagnostic stage names.
- Adds dedicated regression coverage for baseline-first behavior, quarter-turn fallback, confidence-gated deskew, orientation reuse and early exit.
- Updates the roadmap and handoff so future image enhancement and geometry work extends one pipeline instead of adding independent branches inside the decoder.

## 5. Explicitly not implemented by this foundation

- **SCAN-08 — Image enhancement:** adaptive/local contrast, gamma, thresholding and denoise candidates. Current percentile stretch remains limited to the existing deskew path; it is not a general image-enhancement subsystem.
- **SCAN-09 — Geometric correction:** perspective/keystone rectification and curved-label dewarping. In-plane rotation/deskew is not perspective correction.
- **SCAN-10 — Adaptive budgets:** device/runtime budgets based on measured processing cost. Current 70 ms session interval and bounded scale policy are not changed.
- New symbologies not already enabled by the supported-format and validation contracts.
- Optical acceptance across all real-world media, devices and lighting conditions.

These are next pipeline stages, not reasons to rework the baseline orchestration again. Each stage must be optional, confidence-gated, bounded, observable and preserve the original ROI candidate.

## 6. Extension contract for new barcode formats

A new barcode symbology is added at the format boundary:
1. Add the symbology to the shared type and explicit supported-format allowlist.
2. Add the ZXing `BarcodeFormat` mapping.
3. Define payload validation/check-digit policy where applicable.
4. Add generated fixtures and real printed-label samples for upright, rotated, degraded and negative cases.
5. Verify both Home and Stocktake result handoff.

No special handling for paper sizes or carrier names is permitted. A4/A3/A5 are capture conditions only; the relevant evidence is the number of source pixels covering the barcode, module/bar width, focus, motion, contrast and geometry.

## 7. Physical limits and correctness

The system can improve use of available image information; it cannot reconstruct barcode modules that were never resolved by the camera. Upscaling does not create optical detail. Severe motion blur, clipped glare, occlusion, defocus, undersampling or missing quiet zones may make a symbol unreadable.

Acceptance therefore measures:
- Correct payload and symbology, including checksum/format validation.
- Decode success and false-positive rate separately.
- Source ROI dimensions and barcode module width in pixels where measurable.
- Lighting, glare, focus, motion, skew/perspective, distance, device/browser and module.
- Per-stage processing cost, memory and UI responsiveness on low-, mid- and high-capability devices.

No claim of universal optical success, minimum size or maximum distance is made without measured device/corpus evidence.

## 8. Protected invariants

Strict module-owned ROI; SCAN-02/03 geometry mapping; camera lease and lifecycle/recovery; native focus ownership; module-owned video presentation; serialized decoder calls; 70 ms session cadence; barcode validation; Home lookup; Stocktake form-fill and explicit save; no changes to authentication, storage, backend or deployment.

## 9. Next implementation sequence

1. Complete this PR's CI and source-diff review; then run physical QA on iOS Safari/PWA and Android Chrome/PWA in Home and Stocktake.
2. SCAN-08: add image-quality feature measurements and optional enhancement candidates behind the same orchestrator. Compare against original and measure false positives.
3. SCAN-09: add perspective and curved-label candidate detection/rectification only with confidence gates and bounded geometry.
4. SCAN-10: set candidate budgets from measured device processing cost; preserve baseline-first and no-queue behavior.
5. Expand symbology registry and corpus independently from image-transform work.

Do not start another isolated scanner platform rewrite. All recognition capabilities must converge through this pipeline.
