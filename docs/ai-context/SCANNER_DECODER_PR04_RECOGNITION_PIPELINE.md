# Scanner Decoder PR-04 — Shared Recognition Pipeline

**Base:** `main` after PR #110 (`9721cc9b203819a0063a1104a9f071b0e17941d2`).
**Purpose:** complete candidate integration by routing ZXing-C++ through the same recognition policy as the existing ZXing JS backend.
**Protected:** camera lease, preview readiness, session generation, frame cadence, strict feature ROI, validation, Home/Stocktake presentation and business workflows.

## PR-03 audit

PR #110 passed RetailOS CI run #1008 and was merged. Source review confirmed:
- the exact `zxing-wasm@3.1.6` reader-only dependency and self-hosted Vite WASM URL are present;
- the candidate factory remains opt-in and production still selects ZXing JS;
- the active four-format allowlist is mapped explicitly;
- ROI crop and bounded scale candidates are present.

The important limitation was deliberate but not yet production-parity complete: the WASM adapter sent each scaled ROI directly to `readBarcodes`. Its current-frame and temporal paths therefore bypassed the existing shared rotation, deskew, image-enhancement, A2 and geometry stages. The PR-03 test checked source text and package wiring, not actual physical-device parity. A green CI run did not establish optical equivalence or performance superiority.

## PR-04 implementation

- Refactor candidate generation into one lazy iterator consumed by both sync and async pipeline executors.
- Keep the existing synchronous ZXing JS path and candidate order unchanged.
- Add an asynchronous executor for the WASM reader. It awaits each candidate sequentially; no concurrent decode queue is introduced.
- Route both WASM live-frame and temporal-snapshot recognition through that same candidate iterator.
- Preserve original ROI and bounded scale loop outside the candidate transforms; no full-frame fallback.
- Preserve focus sampling, image-quality measurement, temporal snapshot ownership and A3 optional candidate budget.
- Add a session-retirement guard so an async backend does not start another transform/decode after its owner is disposed.

## Recognition order (shared)

1. Original ROI luminance baseline.
2. 90-degree clockwise candidate after a baseline miss.
3. Confidence-gated deskew candidates, smallest correction first.
4. Advisory image quality and bounded A2-selected contrast/gamma/denoise candidates.
5. Bounded geometry candidates on upright/quarter-turned normalized surfaces, under the A2/A3 geometry budget.

Every candidate is decoded by the selected backend; the pipeline does not decide payload validity. The existing session validator remains authoritative.

## Validation boundary

CI covers deterministic synthetic candidate ordering, early exit, async serialization, identical sync/async candidate sequences, bounded geometry budgets, type checking and both production builds. It does not replace the required labelled physical corpus or iOS Safari/PWA + Android Chrome/PWA device benchmark. No backend default switch, merge or deployment is implied by this PR.
