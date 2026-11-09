# Historical scanner source audit — pre PR #49 (2026-11-08)

> **Historical only — superseded for current scanner source facts by [SCANNER_VIDEO_PRESENTATION_AUDIT_2026-11-09.md](SCANNER_VIDEO_PRESENTATION_AUDIT_2026-11-09.md).** This report describes an earlier main baseline before the later lifecycle and geometry-neutral readiness changes. In particular, its iOS viewport/layout observations and proposed geometry diagnostics must not be treated as current engine startup requirements. PR #49 removed the engine DOM geometry barrier; the user reports the merged/deployed build was tested without issues. The original observations and reasoning are retained below as historical evidence.



Historical audit baseline: `main` at `c7146b55f0c2210cd7b8474c6a72b1c915985793` (2026-11-08), before PR B, C1 and PR #43. Current status is in ROADMAP.md and IMPLEMENTATION_STATUS.md; current C2 findings are in SCANNER_C2_AUDIT_2026-11-08.md.
Scope: source inspection and documentation realignment only. No runtime code, dependencies, configuration, data contracts, or deployment files changed in this audit.
User-reported observations:
1. Android scanner opening geometry is now stable; iOS still jumps/reflows.
2. Confirm whether camera acquisition starts from the initiating module tap.
3. Open motion appears acceptable; exit visibly fades to black and is not synchronized.
4. Existing phase documentation is stale; Phase 1.2G may be at its practical source-level limit.
5. Introduce Low/Mid/High device adaptation for the app, initially scoped to scanner, with thermal/battery/performance awareness and no accuracy/operational correctness trade-off.
6. Re-scope Phase 1.2I as completion of the shared scanner engine, not merely angled barcode recognition.

## 1. Source map and actual runtime ownership

- Home entry/UI: `src/features/home/HomeScreen.tsx`
- Stocktake entry/UI: `src/features/stocktake/components/StocktakeModule.tsx`
- Home scanner presentation: `src/features/scanner/components/BarcodeScanner.tsx`
- Stocktake scanner presentation: `src/features/stocktake/components/StocktakeScanner.tsx`
- Shared React bridge: `src/features/scanner/hooks/useScannerEngine.ts`
- Shared runtime/session: `src/platform/scanner/universalScannerSession.ts`
- Camera request/lease ownership: `src/shared/services/cameraSession.ts`
- Decoder adapter: `src/platform/scanner/decoders/zxingDecoder.ts`
- Decoder contract/types: `src/platform/scanner/contracts.ts`, `src/platform/scanner/decoders/decoderAdapter.ts`
- Scanner-specific motion: `src/features/scanner/scanner-transition.css`
- Shared motion tokens/preferences: `src/shared/motion/*`
- Home scanner layout base: `src/styles/home-ux.css`
- Stocktake scanner layout: `src/features/stocktake/components/stocktake.css`

The architecture is already split into feature-owned presentation, a shared React hook, a platform session, a camera lease service and a decoder adapter. Home and Stocktake do not share one visual component, but do share the scanner runtime and camera ownership service. Do not collapse these surfaces just to unify appearance.

## 2. Issue 1 — iOS opening layout jump

### Observed from source
- Home scanner root is fixed with `inset: 0` in `home-ux.css`.
- The Home scanner card is changed by `scanner-transition.css` to `height: 100%`, `max-height: none`, flex column, transparent background and zero radius.
- Mobile Home card repeats `height: 100%`; the scanner root remains tied to fixed viewport geometry.
- Safe-area insets are applied to card padding.
- Stocktake uses `100dvh` for its mobile scanner surface and its own independent layer/surface layout.
- The entrance animation scales the Home root from .94 to 1 over 260 ms.

### Assessment
The Android result reported by the user is positive, but it does not prove iOS viewport behavior. The mismatch between Home's percentage-height surface and Stocktake's dynamic-viewport sizing is a concrete source-level discrepancy. iOS Safari's dynamic browser chrome/visual viewport and safe-area behavior are plausible contributors. The scale transform can amplify the perception of geometry change, but source inspection alone cannot identify which factor dominates.

### Next diagnostic boundary (no code change in this audit)
Capture iOS Safari and installed-PWA recordings with viewport dimensions, visualViewport height/offset, safe-area insets, root/card bounding boxes and computed heights at: tap, first animation frame, animation end, first camera frame. Compare same device in Safari tab vs installed PWA if applicable. Only then choose between dynamic viewport sizing, visual viewport tracking, safe-area correction or animation geometry adjustment. Do not blindly replace all heights with `100dvh` without measuring Safari behavior.

Status: **source-level discrepancy identified; root cause not yet proven; no implementation authorized.**

## 3. Issue 2 — tap-origin camera startup is real

### Home flow
1. `openBarcodeScanner(event)` runs from the Home dock action.
2. It immediately calls `requestCameraLease()` before `setIsBarcodeScannerOpen(true)`.
3. `requestCameraLease()` immediately starts `acquireCameraLease()`, which calls `getUserMedia()` unless a live shared stream or pending request can be reused.
4. The scanner component mounts and passes the request into `useScannerEngine`.
5. `UniversalScannerSession.startInternal()` claims that exact request once; it does not issue a second request for the same lease.
6. The session attaches the stream, waits for `video.play()` and a usable first frame, signals preview readiness, then initializes ZXing and enters scanning.

### Stocktake flow
The Stocktake button's inline `onClick` also calls `requestCameraLease()` before setting `scannerOpen`. The request is handed to `StocktakeScanner`, then to the same hook/session path.

### What this does and does not save
It overlaps camera permission/acquisition with React mount and opening motion. It avoids waiting for the scanner component to mount before beginning `getUserMedia()`. The request is cancellable before claim and single-claim after handoff; late unclaimed leases are released on cancellation.

It does **not** remove the browser permission prompt, hardware camera startup, first usable video frame wait (up to the source's 3-second readiness timeout), or ZXing initialization. It does not guarantee permission is already granted. Optional autofocus is intentionally non-blocking and must not be reintroduced as an awaited prerequisite.

Conclusion: the tap-origin flow is implemented in both Home and Stocktake. If physical-device timing still feels slow, measure stages separately before accepting the remaining wait or attempting a new optimization. Do not start a duplicate camera request.

Status: **implemented in source; source path verified; device timing not measured in this audit.**

## 4. Issue 3 — exit fade-to-black mismatch

### Source finding
- Home entrance: `scanner-home-open`, 260 ms, opacity 0→1 and scale .94→1.
- Home exit: `scanner-home-close`, 180 ms, opacity 1→0 and scale 1→.985.
- Home scanner root has a persistent dark translucent background (`rgba(20,16,19,.82)`) from `home-ux.css`.
- On close, `BarcodeScanner.handleClose()` starts `scanner.closeScanner()` immediately while the React component remains mounted for its exit animation.
- On single result, the feature callback starts the close state and the shared session closes the camera in its single-result `finally` path.
- Session teardown cancels frame callbacks, disposes the decoder, pauses/detaches the video and releases its camera lease.

### Assessment
The visible camera image can disappear while the dark fixed overlay remains for the 180 ms exit fade. The remaining layer is therefore mostly dark background fading away, which presents as a black flash/fade and is not visually synchronized with the entrance. This is a source-supported likely cause and matches the user observation.

The camera must still be released promptly and independently of animation completion. The solution should not delay hardware teardown just to preserve the video image. The visual exit should be designed around a deterministic transition state/snapshot/surface strategy that does not require retaining an active camera lease. Any snapshot strategy must be privacy-safe, memory-bounded and verified on iOS; do not assume a canvas snapshot is free or universally supported.

Status: **likely root cause identified; fix design required; runtime unchanged.**

## 5. Phase 1.2G — practical completion boundary

### What is actually present
- Startup/lease, video readiness, decoder initialization, first accepted result and teardown timing.
- Decoder stage timing for full-frame draw, ROI draw, ImageData/luminance conversion and ZXing attempts.
- Session telemetry for decode average/max, callback gap, long tasks and layout shift where browser APIs support them.
- React phase-commit interval logging.
- Mounted guards and lifecycle ownership guards.
- Motion source has scanner-specific 260 ms entrance and 180 ms exit; shared motion tokens/preferences exist elsewhere.
- Reduced-motion handling exists.

### What telemetry cannot prove
- A frame callback gap is not a GPU frame-drop counter.
- Long-task and layout-shift observers are not uniformly available in Safari.
- Console timings do not identify thermal throttling, battery drain, GPU composition cost or actual device temperature.
- Source-level instrumentation does not replace physical-device traces or controlled before/after comparisons.
- No actual iOS/Android performance baseline was found in the reviewed phase records.

### Decision
Do not keep Phase 1.2G open as an indefinite invitation to tune durations, reduce decoder cadence or weaken scanning. Treat the source instrumentation and audit scope as **implemented/bounded**, while keeping its **device evidence and issue-specific remediation open**. Further work is justified only by a reproducible defect or measured bottleneck. The known iOS geometry and exit fade are concrete follow-up defects; do not describe them as solved by generic 1.2G.

## 6. Device adaptation phase — Low / Mid / High

This is a cross-app architecture direction, but the first delivery slice is scanner-only. It is not authorized to alter all app modules yet.

### Principle
Adapt resource intensity, not business correctness. Device tier must never change barcode validation, accepted symbologies, data persistence, single/continuous semantics, callback delivery guarantees, camera ownership, or explicit-save workflows.

### Proposed policy
- **LOW:** prioritize thermal/battery stability and UI responsiveness; reduce decorative motion/compositing and optional non-critical work. Preserve a safe scanner input quality floor. Do not lower resolution/cadence or remove recovery decode paths without scan-accuracy evidence.
- **MID:** balanced defaults; current validated scanner settings remain the baseline.
- **HIGH:** allow richer presentation or measured optional processing only when device signals and thermal state permit. Higher tier must not imply more aggressive decoding by default.

### Classification
Use capability evidence (supported APIs, actual camera track settings, viewport/device memory hints where available) rather than user-agent labels alone. Browser/device signals are incomplete; tier is an advisory runtime profile, not a guarantee of actual hardware performance. Provide conservative fallback to MID/LOW when uncertain and allow runtime degradation when sustained load/thermal pressure is observed.

### Thermal/battery feedback
The web platform does not expose a reliable universal battery/temperature API across iOS Safari and Android Chrome. Do not promise direct temperature control. Use observable proxies such as sustained decode duration, long tasks, frame callback gaps, visibility, track settings and repeated throttling. Apply hysteresis/cooldowns to avoid oscillating profiles. Never infer battery percentage where unavailable.

### Scanner-first scope
Define profile policy, resource budgets and a safe transition contract. Separate hard correctness invariants from tunable presentation/processing knobs. Record measured scan success, first-result latency, decode latency, UI responsiveness and thermal/battery proxies on representative low/mid/high devices before changing scanner constraints or cadence.

Status: **proposed phase; no adaptive tiering implementation exists in the reviewed scanner hook, which currently constructs the session with profile `HIGH` unconditionally.**

## 7. Phase 1.2I — redefine as shared scanner engine completion

The old roadmap title "Decoder capability enhancement" is too narrow for the user's current goal. Re-scope 1.2I as **Shared Scanner Engine Completion**.

### Goal
Finish a reliable, reusable scanner engine contract that supports feature-owned UI and policies without duplicating camera/decoder lifecycle logic.

### Required workstreams
1. **Runtime contract:** explicit state machine and lifecycle contract across IDLE, REQUESTING, PREVIEW_READY, INITIALIZING, SCANNING, SUSPENDED, CLOSING, ERROR and DISPOSED; no UI boolean combinations that imply contradictory states.
2. **Camera ownership:** lease request, one-time claim, cancellation, stream-ended recovery, concurrent owners, stale generation protection and deterministic release.
3. **Decoder adapter contract:** initialization/disposal, capability declaration, symbology negotiation, bounded decode scheduling, typed decode misses/errors and safe fallback.
4. **Feature policy boundary:** Home single-result cached lookup; Stocktake single-result form-fill with explicit save; future continuous policy belongs to consumer configuration, not hardcoded UI assumptions.
5. **Device profile integration:** Low/Mid/High resource profile as policy input, but cannot alter correctness invariants or unverified scan quality.
6. **Presentation independence:** Home full-screen and Stocktake framed presentation remain feature-owned; engine exposes state/events, not layout.
7. **Observability:** privacy-safe timing and diagnostics with capability-aware measurement semantics; no barcode payload/device identity logging.
8. **Testability:** deterministic tests for permission pending, cancel-before-claim, duplicate claim, rapid open-close-open, stale async completions, track ended, concurrent lease ownership, decoder failure, callback failure, single/continuous semantics and consumer contracts.
9. **Capability extension:** angled/perspective/rotation recovery may be evaluated as an optional bounded decode tier only after normal-path accuracy/latency baselines exist. It is a sub-workstream, not the phase's entire purpose.

### Exit criteria
- One shared engine serves Home and Stocktake without duplicated camera/decoder lifecycle.
- Feature callbacks and persistence semantics remain unchanged.
- State and ownership invariants pass deterministic regression tests.
- Profile switching is bounded, observable and cannot reduce correctness.
- Real iOS Safari and Android Chrome validation covers permissions, open/close/reopen, foreground recovery, track end, representative barcode matrix and low/mid/high devices.
- Documentation maps every public engine contract to source and tests.

Status: **proposed/re-scoped; not complete.**

## 8. Source-level risks and open questions
- The hook currently passes `profile: 'HIGH'` unconditionally; the profile system exists in types but adaptive policy is not wired.
- Current session decode interval is 110 ms. Do not change it by assumption.
- Current decoder uses full-frame pass then centered upscaled ROI; every third ROI pass uses GlobalHistogramBinarizer fallback. It uses a main-thread Canvas/ZXing path.
- Current supported-format list in source is broader than older architecture notes that say EAN-13/EAN-8/CODE-128 only. Reconcile the actual `SUPPORTED_BARCODE_FORMATS` constant and product requirement before changing accepted formats; do not trust stale docs.
- Camera request uses ideal environment-facing 1280×720 and 30 FPS (max 30); actual settings can differ.
- Device tiering cannot rely on a universal iOS/Android battery or thermal API.
- No device QA, local preflight or deployment verification was performed as part of this documentation/source audit.

## 9. Protected contracts
- Home scan → existing cached barcode lookup.
- Stocktake scan → populate entry form; explicit save remains user action.
- Duplicate Stocktake rows remain distinct.
- Manual entry remains available.
- Barcode payload validation remains format-specific; CODE-128 remains opaque.
- Camera lease ownership and generation safety remain intact.
- No changes to auth/session, Apps Script, IndexedDB schema, data persistence, service worker or deployment contracts in the next scanner UX fixes unless separately audited and approved.

## 10. Audit conclusion
The tap-origin startup is already correctly implemented. Remaining wait is primarily browser/device acquisition, first-frame readiness and decoder initialization. The exit fade mismatch has a clear source-level explanation: camera teardown precedes the visual fade of a dark overlay. The iOS opening layout jump is plausibly tied to fixed/percentage viewport geometry and safe-area handling, but requires visualViewport/bounding-box evidence before prescribing a fix. Phase 1.2G should be closed as a bounded instrumentation/source-audit effort, not as a claim that all device performance is solved. A new scanner-first device-adaptation phase and a re-scoped 1.2I shared-engine completion phase should govern the next architecture steps.

---
