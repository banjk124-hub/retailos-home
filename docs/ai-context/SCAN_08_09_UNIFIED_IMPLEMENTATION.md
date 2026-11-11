# SCAN-08 + SCAN-09 — Unified recognition candidates

**Branch:** `feat/scanner-scan08-scan09-unified` (PR #81, draft).
**Base:** `main` after PR #80 merge (`61e623f8bbf19d2459e52b7d64da05a5aa54d12b`).
**Scope:** incremental enhancement and geometry candidates in the existing `scannerEnhancementPipeline.ts`. No second scanner, no per-symbology image path.

## Recognition order

1. Original luminance → ZXing Hybrid + GlobalHistogram.
2. Exact 90° rotation.
3. Confidence-gated continuous deskew on original and quarter-turn, smallest correction first.
4. SCAN-08: measure source ROI image quality; if appropriate, try up to two optional contrast/gamma/denoise candidates.
5. SCAN-09: estimate row-wise barcode envelope; only if coherent and bounded, try one optional perspective or curved-label correction.
6. On a complete miss, the existing SCAN-07 scale loop can retry bounded 1× and 2× fallback representations.

All candidates originate exclusively from the same module-owned strict ROI. No full-frame fallback, outward padding, new camera request, or changed validation policy. The decoder returns at the first result; the existing session performs payload validation and module handoff.

## SCAN-08

- A bounded luminance histogram and sampled local gradient statistics estimate dynamic range, dark/bright clipping, contrast and impulse noise.
- Robust percentile stretch is now available on upright input after baseline miss, not only in the deskew path.
- Gamma brightening is optional for dark/underexposed imagery.
- A conservative horizontal 1×3 median is optional only for strong impulse noise; it may erase thin bars, so it is not a universal preprocessor.
- Saturated highlights are not recoverable. The algorithm does not synthesize missing bars.
- The original pixels are never mutated. No more than two optional candidates are returned.

## SCAN-09

- A repeated scanline edge envelope is measured from the existing ROI.
- Coherent row-wise width taper may yield a bounded keystone/perspective candidate.
- Coherent row-wise center bow may yield a bounded curved-label candidate.
- Incoherent/noisy/flat geometry is rejected. Candidate count is at most one; candidate pixel count is capped.
- This is **conservative row-envelope rectification**, not a general homography solver or full arbitrary 3D curved-surface reconstruction. Severe folds, wrinkles, occlusion and non-cylindrical deformations remain unproven.

## Camera startup and session coordination

Source audit confirms camera lease acquisition begins inside `UniversalScannerSession.startInternal()`, the module's tap-origin camera request bridge remains active, and preview readiness is published before the decoder is initialized. The decoder then begins the serialized scan loop using video-frame callbacks where available and the existing 70 ms minimum decode interval.

No camera acquisition or lifecycle changes are made in this PR. A speculative reordering could regress iOS camera permission, stream lease, video readiness and foreground recovery. Faster camera startup requires measured tap→getUserMedia→first-frame→first-decode timings on real devices before changing those contracts. SCAN-08/09 only run after baseline/orientation misses; normal barcodes keep the same first-decode path.

## Acceptance gates

- [ ] Full preflight, TypeScript, production and Pages builds on final PR head.
- [ ] Existing scanner regression tests pass unchanged (strict ROI, format validation, Home/Stocktake handoff, rotation/deskew and multi-scale).
- [ ] New image enhancement regression: compressed-contrast candidate, original image immutable, bounded count and blank/noise negatives.
- [ ] New geometry regression: synthetic keystone and curved-envelope positives, blank negative, bounded candidate size.
- [ ] Decoder integration tests confirm successful decode of transformed real barcode fixtures (not just candidate generation).
- [ ] Device QA iOS Safari/PWA and Android Chrome/PWA, Home and Stocktake.
- [ ] Real media corpus: paper, package, screens, glossy/low light, creased/curved surfaces, glare, small/far and negative controls; record correct payload, false positives, time and memory.

**Release constraint:** synthetic tests do not prove recognition of every physical barcode. The implementation is a bounded incremental capability, not a universal guarantee. Do not merge/deploy until the code and device gates are reviewed and explicitly approved.
