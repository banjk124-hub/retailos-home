# Scanner video presentation ownership audit — 2026-11-09

**Status:** Post-merge source audit and documentation record.  
**Repository:** `banjk124-hub/retailos-home`  
**Audited baseline:** `main` at `1764c858a7d7855950ebe328a3a653d6935fa796` (merge commit for PR #49).  
**Change under review:** PR #49 — `refactor(scanner): remove engine DOM geometry gate`.  
**User verification:** User confirms merge, deployment and testing completed without issues.

## 1. Audit objective

Verify that the platform scanner engine no longer imposes DOM/container geometry as a precondition for video startup, while retaining real media-frame readiness and preserving the existing Home and Stocktake presentation implementations.

This is a source/documentation audit. No runtime behavior or executable logic, test code, dependencies, package scripts, configuration, data contracts or deployment files are changed by this synchronization. One stale comment in the Recovery hook was corrected to remove the obsolete “layout barrier” description; the comment-only edit does not change runtime behavior.

## 2. Source map inspected

| Responsibility | Source |
|---|---|
| Shared platform camera/session startup and frame readiness | `src/platform/scanner/universalScannerSession.ts` |
| React bridge, Recovery orchestration and `isPreviewReady` state | `src/features/scanner/hooks/useScannerEngine.ts` |
| Home video DOM and module presentation | `src/features/scanner/components/BarcodeScanner.tsx` |
| Stocktake video DOM and module presentation | `src/features/stocktake/components/StocktakeScanner.tsx` |
| Home and Stocktake scanner transition/reveal rules | `src/features/scanner/scanner-transition.css` |
| Stocktake preview's base frame and responsive layout | `src/features/stocktake/components/stocktake.css` |
| Geometry-neutral readiness regression assertions | `scripts/test-scanner-presentation.mjs` |
| Repository verification sequence | `scripts/preflight.mjs` |

The deleted helper `src/platform/scanner/videoPresentationLayout.ts` is no longer part of the current source tree. The Recovery hook's explanatory comment was also aligned with the current no-layout-barrier startup sequence; no executable statement changed.

## 3. Engine behavior verified on main

### 3.1 DOM geometry is no longer a startup dependency

`UniversalScannerSession` no longer imports or calls `waitForVideoPresentationLayout()`. The stream is assigned directly to the supplied video element:

```ts
this.video.srcObject = stream;
this.video.muted = true;
this.video.playsInline = true;
```

Before attaching/playing the stream, the engine no longer requires any of the following:
- A particular `parentElement` or wrapper hierarchy.
- A non-zero CSS width or height.
- `getBoundingClientRect()` values for the video or its container.
- Video/container positional alignment or equal rectangles.
- Equal aspect ratios or matching CSS geometry.
- Stable layout bounds over multiple animation frames.

This removes the former coupling between camera startup and one assumed DOM composition. A feature may now choose a cropped, scaled, inset, letterboxed, overlaid, transformed or otherwise custom video presentation without satisfying a platform-level geometry equality test.

### 3.2 Technical media readiness is retained

The engine still has `waitForVideoFrameReady()` and `isVideoFrameAvailable()`. The latter checks:

- `video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA`.
- Intrinsic decoded frame dimensions: `video.videoWidth > 0` and `video.videoHeight > 0`.

The readiness routine also accounts for playback state and fresh-frame evidence. It uses `requestVideoFrameCallback` where supported; the fallback path observes live media progression/events as implemented in the current source. The bounded readiness timeout remains 3000 ms.

**Important distinction:** `videoWidth` and `videoHeight` are intrinsic media dimensions supplied by the video decoder. They are not the element's CSS dimensions, its bounding rectangle, or the size of its container. Retaining these checks does not reintroduce the removed DOM geometry gate.

### 3.3 Startup ordering remains intact

The current source order is:

1. Claim/use the camera stream lease and register track interruption handling.
2. Attach the stream to the supplied video element.
3. Configure muted/inline playback and call `video.play()`.
4. Wait for usable decoded media/frame readiness.
5. Record video readiness diagnostics.
6. Invoke `onPreviewReady` and publish lifecycle `READY`.
7. Initialize the decoder.
8. Enter scanning only after decoder initialization and the existing session/generation checks succeed.

Preview readiness and scanning readiness remain distinct. `isPreviewReady` means the module has a usable camera frame to present; it does not mean the decoder is ready or that scanning has started.

## 4. Feature presentation ownership verified

### 4.1 Home — full-surface presentation

Source:
- `src/features/scanner/components/BarcodeScanner.tsx`
- `src/features/scanner/scanner-transition.css`
- `src/styles/home-ux.css`

Verified characteristics:
- Home renders its own keyed `<video>` inside `.barcode-scanner-view`.
- The feature applies `.has-preview` from `scanner.isPreviewReady`.
- The transition stylesheet positions the video as a full-surface layer and uses `object-fit: cover` with centered object position.
- Before preview readiness, the module hides its video using `visibility: hidden`; after readiness, it reveals the video using `visibility: visible`.
- The native video remains `opacity: 1` and has `transition: none`; the video layer itself is not opacity-faded.

The Home module owns its containing block, full-screen composition, reveal state and overlay/snapshot presentation. The engine only supplies the technical readiness signal.

### 4.2 Stocktake — framed preview presentation

Source:
- `src/features/stocktake/components/StocktakeScanner.tsx`
- `src/features/stocktake/components/stocktake.css`
- `src/features/scanner/scanner-transition.css`

Verified characteristics:
- Stocktake renders its own keyed `<video>` inside `.stocktake-scanner-preview`.
- The preview has its own framed layout; the base stylesheet uses `aspect-ratio: 4/5`, and the mobile layout independently constrains the preview using viewport-relative sizing.
- The video is absolutely positioned within the preview, fills that feature-owned surface and uses `object-fit: cover`.
- The feature applies `.has-preview` from `scanner.isPreviewReady`.
- Its presentation stylesheet owns the hidden/visible reveal rule.
- The native video remains `opacity: 1` with `transition: none`.

Stocktake therefore remains free to evolve its framed preview independently from Home's full-screen camera surface.

### 4.3 Shared contract boundary

The two modules share:
- Camera/session/decoder runtime.
- The technical `isPreviewReady` signal.
- The scanner lifecycle and Recovery infrastructure.

They do not share:
- A video presentation component.
- A required container aspect ratio or bounding-box relationship.
- CSS layout, crop, overlay or animation policy.
- A platform-engine decision about when or how the UI must reveal the video.

This is intentional ownership separation, not duplicated platform behavior.

## 5. Regression coverage

`scripts/test-scanner-presentation.mjs` now asserts that:

1. The platform session does not import or call the removed geometry helper.
2. The platform session does not inspect `getBoundingClientRect()`, `parentElement`, `clientWidth/clientHeight` or `offsetWidth/offsetHeight`.
3. Startup ordering remains stream attachment → playback → frame readiness → preview-ready callback → decoder initialization.
4. Technical readiness still checks decoded media state and intrinsic frame dimensions.
5. Home still renders its feature-owned video and binds its own `.has-preview` class.
6. Stocktake still renders its feature-owned video and binds its own `.has-preview` class.
7. The module-owned hidden/visible CSS reveal rules remain present for both modules.

The test is a source-level regression guard. It does not simulate WebKit/Chromium native camera layers or replace physical-device testing.

## 6. Change scope and protected invariants

PR #49's runtime change was limited to removing the pre-attachment geometry barrier and its import/commentary. The obsolete helper was deleted. The presentation regression test and preflight label were updated to protect the new ownership boundary.

The following areas were not changed by PR #49:
- Camera acquisition, constraints, lease/refcount, claim/cancel/release.
- Track-ended handling and foreground Recovery.
- Technical lifecycle event vocabulary and teardown ordering.
- Decoder adapter, ZXing behavior, decode cadence and scheduling.
- Barcode format allowlist, validation and callback delivery.
- Home cached lookup and single/continuous scan semantics.
- Stocktake form-fill, manual entry, duplicate-row handling and explicit save/persistence.
- Snapshot capture order and feature-owned close transitions.
- Home/Stocktake component markup and presentation CSS.
- PWA, authentication, application data contracts and deployment configuration.

## 7. Verification evidence

### GitHub Actions
Run **#200** completed successfully. The job ran `npm run preflight` and passed:
- Scanner barcode validation regression tests.
- Scanner lifecycle contract regression tests.
- Scanner presentation ownership regression tests.
- TypeScript and Vite production build.
- GitHub Pages build.
- Unstaged and staged diff whitespace checks.

### Deployment and user acceptance
The user confirms PR #49 was merged, deployed and tested without issues. The exact physical-device matrix and device/browser versions were not specified in this audit request, so this report does not invent per-device test coverage.

### Verification limits
- CI proves the checked source assertions and builds on the runner; it does not prove camera hardware behavior.
- User-reported deployment testing is recorded separately from CI evidence.
- No new device QA was performed by this documentation/source-comment audit.

## 8. Audit conclusion

The intended boundary is now reflected in the merged source:

**The engine determines whether usable camera media is available. The feature module determines how that media is represented.**

The engine must not infer module UI readiness from DOM dimensions, bounding rectangles, container equality or layout stability. Conversely, removing those DOM checks must not weaken actual decoded-frame readiness.

Home and Stocktake currently satisfy the module-owned presentation contract and were left unchanged by PR #49. No further runtime change is indicated by this audit.

## 9. Canonical references

- Architecture: `ARCHITECTURE.md` — ADR-015 (current decision), ADR-014 (foreground Recovery), ADR-008 (technical-only lifecycle).
- Roadmap: `ROADMAP.md` — current execution order and future issue/measurement-driven work.
- Implementation status: `IMPLEMENTATION_STATUS.md` — current main SHA and verification evidence.
- Acceptance: `ACCEPTANCE_CHECKLIST.md` — PR #49 acceptance gates.
- Historical audit: `SCANNER_SOURCE_AUDIT_2026-11-08.md` — pre-PR #49 evidence, superseded for current source facts.
