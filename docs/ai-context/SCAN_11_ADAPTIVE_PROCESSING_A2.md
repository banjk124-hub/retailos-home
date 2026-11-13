# Scanner A2 — Adaptive Processing Controller

## Purpose
A2 converts A1 image-quality observations into a deterministic, bounded processing plan. It is a decode-policy component only; it does not own camera state, scheduling, ROI, presentation or payload validation.

## Current implementation boundary
A2 first controls optional image-enhancement candidates:
- Low dynamic range / low contrast: prioritize contrast stretch.
- Underexposure: allow gamma brightening.
- High noise: allow the existing horizontal median denoise.
- Multiple actionable signals: retain deterministic priority and cap the list at two transforms.
- Specular glare or clipped highlights/shadows: bypass optional image transforms because missing sensor information cannot be reconstructed safely.
- Missing or non-actionable quality evidence: preserve the existing enhancement candidate policy. A policy selects a transform only when its existing generator eligibility gates are also satisfied; vertical-only noise does not select the horizontal denoiser.

The controller does not yet reorder baseline, orthogonal rotation, deskew, ROI scale, geometry, or T3 temporal fallback. Those paths retain their validated ordering and budgets. This is intentional: A1's quality profile does not provide reliable orientation/geometry evidence, and A3 owns runtime scheduling/performance adaptation.

## Invariants
- Baseline decode remains first and returns immediately on success. A2 planning is not run on the fast path.
- Existing orthogonal rotation and confidence-gated deskew order is unchanged.
- Strict module-owned ROI remains unchanged; no full-frame or expanded-ROI candidate is introduced.
- Existing scale candidate order is unchanged.
- Geometry remains bounded by the existing four-candidate maximum.
- T3 temporal fallback remains a separate fallback after current-frame decode misses and cannot override validator rejection.
- Every optional image transform is derived from an immutable source frame; the original buffer is not mutated.
- A2 never modifies camera constraints, preview/video, lifecycle, frame cadence or UI.

## Diagnostics
Each fallback attempt emits a bounded policy snapshot through the decoder diagnostics and the QA Monitor allowlist: mode, selected transforms, candidate budgets, preserved strategy contracts and reason codes. The collector explicitly projects only known scalar fields and bounded string arrays; unknown nested fields, image pixels and DOM/camera objects are discarded.

## Validation
The A2 regression test covers unavailable evidence fallback, contrast/gamma/denoise selection, multi-cause priority, candidate cap, glare/clipping enhancement bypass, production-pipeline integration and baseline fast-path short-circuiting. Full repository preflight, TypeScript and production builds remain required before PR review.
