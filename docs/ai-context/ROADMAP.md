# RetailOS — Engineering Roadmap

Last reviewed: 2026-11-09
Status: active working plan.

## Current execution order — Android Torch capability timing

1. PR #51 optional Torch capability is merged, deployed and user-tested. iOS works; Android currently hides the Flash control.
2. **Active fix: PR #52 — defer capability discovery until after video playback and first decoded frame.** This addresses Chromium's documented capability availability timing without changing camera acquisition or module presentation.
3. Run full automated preflight, then retest Android Chrome/PWA on the same physical device. Inspect safe capability diagnostics.
4. If Torch is still `not-exposed` after the first frame, establish the device/browser track's actual support before considering another API or platform-specific path.

**Protected contracts:** camera lease/refcount, 1280×720 / 30 FPS camera request, autofocus, first-frame readiness, lifecycle/recovery, decoder cadence, barcode validation/delivery, Home lookup, Stocktake form-fill/explicit-save, and independent module presentation.

---
