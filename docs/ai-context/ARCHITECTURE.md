## ADR-014 — Engine-owned first-frame preview reveal (2026-11-08)

Status: Implemented in PR A branch `feat/scanner-a-engine-preview-transition`; review pending.

**Decision**
- The shared scanner engine owns the preview readiness handoff. `UniversalScannerSession` confirms a fresh usable frame, invokes the internal `onPreviewReady` bridge and publishes `READY` before decoder initialization.
- `useScannerEngine` exposes `isPreviewReady`; the shared `ScannerPreviewSurface` consumes that state and renders the same opening curtain for every feature.
- The curtain is the only animated layer. The native `<video>` remains fully opaque with no opacity/transform transition; this preserves the existing iOS/WebKit camera-layer guard.
- The curtain fades away only after a fresh frame is confirmed. During initial acquisition and foreground recovery it remains in place; decoder initialization is not part of preview readiness.
- Home and Stocktake provide the video ref, keyed video-surface identity and accessible label. They do not decide reveal timing, CSS readiness classes or transition duration.
- `prefers-reduced-motion` disables the curtain transition. No camera, decoder, lease, barcode or feature business behavior changes.

**Acceptance**
- One shared preview component is used by Home and Stocktake.
- The native video is never opacity-transitioned.
- The reveal is triggered by engine first-frame readiness, not `SCANNING`.
- Recovery returns the curtain while the replacement surface awaits its first fresh frame.
- Reduced-motion users receive the preview immediately when READY is reached.

---

## ADR-009 — Serialized cross-platform page lifecycle recovery (2026-11-08)

Status: Merged in PR #38 and subsequently extended by PR #43; user has verified the former preview-shrink defect is gone.

- One mounted scanner has one page-lifecycle coordinator. `visibilitychange` is the primary signal; `pagehide/pageshow` are supplementary browser/BFCache signals.
- Duplicate signals for the same visibility edge are coalesced. Real hidden/visible transitions are serialized so foreground resume waits for background suspension and lease release.
- The coordinator is platform-neutral. Platform-specific behavior belongs only in media/browser capability handling, not separate Home/Stocktake or iOS/Android business logic.
- Backgrounding cancels an unclaimed tap-started camera lease. Once claimed, the session owns and releases its lease.
- Preview READY requires a fresh frame: `requestVideoFrameCallback` where supported, otherwise advancing live media playback time. A non-zero video dimension or readyState by itself is not proof of a resumed preview.
- A failed resume does not permanently consume a fixed lifetime retry budget. Each actual foreground transition can attempt one serialized recovery; explicit retry remains available after a visible error.
- SCANNING remains downstream of successful decoder initialization. Camera constraints, autofocus, decoder cadence/validation and feature business flows remain unchanged.
- C2 must consume this shared recovery behavior without duplicating it; A may rely on truthful READY only after this contract is accepted.

---



## ADR-008 — Feature-observed scanner lifecycle and Home exit handoff (2026-11-08)

Status: Merged. PR C1 is implemented in BarcodeScanner; PR C2 is implemented in StocktakeScanner.

- `UniversalScannerSession` owns the session ID and constructs its `ScannerLifecycleAdapter` with an optional `ScannerLifecycleObserver`. Feature modules never create an adapter or supply a session ID.
- `useScannerEngine` forwards the observer through a ref-backed callback. Updating a React callback does not restart the scanner effect or reacquire the camera.
- `EXIT_PRESENTATION` is emitted by the owning feature through the active/closing `ScannerSession`; the platform session routes it through the same adapter and session ID as engine milestones.
- Home unmounts its scanner only after `EXIT_REQUESTED`, `EXIT_PRESENTATION`, `CAMERA_RELEASED`, and `DISPOSED` have all been observed. Event arrival order is not assumed; completion is idempotent.
- Home snapshot capture stays before `closeScanner()`. `CAMERA_RELEASED` remains a resource boundary and is not treated as animation completion. `DISPOSED` remains after teardown.
- Stocktake now consumes the same observer contract and four-milestone exit gate through `StocktakeScannerExitGate`, preserving Stocktake business and persistence behavior.
# Architecture notes and invariants

This file is a working contract, not a substitute for inspecting current source. Verify every path and interface before changing it.

## Conceptual boundaries
1. **App shell** — session/auth boundary, global navigation, layout, notifications and app-wide state.
2. **Module registry** — canonical module identity and metadata. Stable IDs must not be casually renamed.
3. **Module library** — search, grouping, discovery, favorites/recent items where supported, and truthful availability.
4. **Feature UI** — actual workflows for inventory, pricing, products, orders, delivery, sales, expiry/date, stocktake, etc. Do not claim a workflow exists merely because a tile exists.
5. **Data services** — Apps Script/API contract, snapshots, IndexedDB, synchronization and error handling.
6. **Platform layer** — PWA installability, service worker, offline cache, camera permissions and deployment base path.

## State dimensions must remain separate
- `uiStatus`: implemented / integrating / unavailable (use the project's actual enum if one exists).
- `dataStatus`: loaded / stale / missing / error.
- `permissionStatus`: allowed / denied / unknown.
- `connectivityStatus`: online / offline / unknown.
- `operationStatus`: idle / loading / success / error.

Do not collapse these into a single boolean such as `available`.

## Critical invariants to verify before edits
- Stable module IDs and their relation to `moduleDataService`.
- Apps Script request/response payloads and auth/session behavior.
- IndexedDB database/store/version and snapshot invalidation behavior.
- Barcode library and camera permission/error paths.
- Push notification registration and service-worker message handling.
- Vite `base` path and GitHub Pages workflow.
- Existing responsive CSS import order and component class contracts.

## UI/UX direction
- Mobile-first, operationally clear, fast, accessible.
- Avoid narrow left-aligned content with unused space.
- Use responsive grid with explicit minmax(0, 1fr), deliberate breakpoints, safe-area insets, and adequate touch targets.
- Use translucency only where it improves hierarchy; avoid blur on every surface.
- Keep hierarchy, status, action and data freshness distinguishable.
- Do not use fake metrics, fake notifications, fake demo interactions, or misleading readiness labels.
- Build a tokenized design system and migrate gradually; do not keep adding permanent override files indefinitely.

## Deployment safety
- Never push/deploy without user approval.
- Verify build commands from `package.json` and `vite.config.ts` first.
- Check Git diff and exclude secrets, generated artifacts, `node_modules`, and user data.


## Scanner invariants (Phase 1.2)
- Supported store symbologies: EAN-13, EAN-8 and CODE-128. The decoder must whitelist these explicitly; verify the installed ZXing API before importing types or adding dependencies.
- One active decoder per scanner session. Start, pause, resume and close must be idempotent; stale asynchronous work must not attach a stream or deliver callbacks after cancellation.
- Validate decoded format and payload before invoking feature callbacks. EAN values are format-specific; CODE-128 remains an opaque string and must not be coerced to numeric.
- Scanner layer must not require catalog existence. Unknown barcodes remain valid operational input where the consuming workflow permits them.
- Preserve Home cached lookup, Stocktake form-fill/explicit-save semantics, duplicate Stocktake rows, and manual entry.
- Do not tune resolution/decode interval until actual device settings and scan latency are measured.
- See `ROADMAP.md` for phase acceptance criteria and `DECISIONS.md` for accepted decisions.


## Accepted engineering decisions — Scanner Phase 1.2 (2026-11-05)

### ADR-001 — Protect existing feature contracts
Status: Accepted.
- Home scan continues to call its existing cached barcode lookup.
- Stocktake scan continues to populate the form; saving remains an explicit user action.
- Duplicate Stocktake rows remain separate records; manual entry remains available.
- Scanner does not require catalog existence and does not change IndexedDB, auth/session, Apps Script, service-worker, module ID, or deployment contracts.

### ADR-002 — Explicit store barcode symbologies
Status: Accepted.
- The scanner accepts EAN-13, EAN-8 and CODE-128 only.
- EAN payloads must match their symbology's numeric length. CODE-128 is preserved as an opaque string and is not coerced to a number.
- Do not add a product lookup at scanner-engine level.

### ADR-003 — One decoder per active session
Status: Accepted.
- Start/pause/resume/close are idempotent and generation-safe.
- A live decoder prevents a second decode loop from attaching to the same session.
- Existing decoder controls must be stopped before a replacement is attached; asynchronous single-scan attachment must stop immediately if a result arrived before controls were returned.
- Camera performance tuning follows correctness and real-device measurements.

### ADR-004 — Branch-first integration
Status: Accepted.
- Implementation is prepared on a scoped branch. Local checks and device QA are performed before integration.
- No AI task merges to main or deploys without explicit user approval.


### ADR-005 — Best-effort scan confirmation feedback (2026-11-05)
Status: Accepted for Phase 1.2E.
- A valid accepted barcode event may trigger a short audio confirmation and a short vibration where the browser/device supports it.
- Audio and haptic feedback are best-effort capabilities. Failure or lack of platform support must never block barcode delivery or camera operation.
- Audio remains unlocked only from a direct user gesture; no autoplay permission workaround is introduced.
- Vibration uses a single short 25 ms pulse through the browser Vibration API. Unsupported platforms (including iOS Safari where the API is not available) continue without vibration.
- The scanner engine owns the single accepted-result feedback event so Home and Stocktake receive consistent behavior. Consumer contracts and persistence semantics remain unchanged.
- The confirmation tone gain is raised from 0.16 to 0.24; duration and frequency remain unchanged.


### ADR-006 — Recover from unexpected camera track termination (2026-11-06)
Status: Proposed implementation on `phase-1-2f-camera-lifecycle`; pending Local verification and acceptance.
- The shared camera-session service publishes a stream-identity event only when its active stream has no remaining live video tracks.
- Scanner consumers must ignore termination events for streams they do not currently own, invalidate stale asynchronous decoder work, stop decoder controls, and detach only the matching video stream.
- The scanner may make at most one automatic recovery attempt per open scanner session. Repeated interruption becomes a visible recoverable error; a direct user retry resets that one-attempt budget.
- Intentional pause, close, unmount, and `releaseCameraStream()` remain non-recovery paths. Stale `getUserMedia` results remain generation-invalidated and must never attach after cancellation.
- Preserve camera constraints (1280×720), ZXing decode interval (110 ms), supported barcode formats, feedback, Home lookup, Stocktake form-fill/explicit-save, and all data/auth/session contracts.
- This decision does not add camera ownership leases, background polling, dependencies, or performance tuning. Device-specific behavior remains subject to Android Chrome and iOS Safari QA.
- Stream-specific cleanup must be identity-guarded: a stale scanner attempt may release only the exact stream it acquired and must not invalidate a different active stream or a newer pending getUserMedia request. No-argument release remains the intentional global invalidation path for pause/close/logout.



### ADR-007 — Reference-counted camera stream leases (2026-11-07)
Status: Implemented on `fix/scanner-p0-lifecycle-serialization`; build and device verification pending.

- `cameraSession.ts` exposes `acquireCameraLease()`. Each scanner session receives a lease for the shared `MediaStream`; releasing one lease cannot stop the stream while another lease remains active.
- The final lease release stops the active stream. Lease release is idempotent and checks both stream identity and acquisition generation so a stale lease cannot affect a replacement stream.
- App-level `releaseCameraStream()` is now a no-argument global invalidation operation, reserved for logout/forced shutdown. Scanner sessions release their own lease.
- A stale acquisition that resolves after session close releases only its own lease. Concurrent consumers awaiting one pending `getUserMedia` request receive independent leases after the shared request resolves.
- This supersedes the Phase 1.2F note that explicitly excluded a camera lease system. The change is intentional: identity-only release did not represent multiple consumers of the same shared stream.
- Do not add background camera retention. A session must release its lease on close/suspend/unmount; global logout invalidates all leases.
- Required regression coverage: two consumers share one stream; closing either consumer leaves the other live; closing the final consumer stops tracks; close-while-pending followed by a new consumer does not stop the new consumer's stream; global logout invalidates all leases.



## Scanner experience performance architecture (2026-11-07)

Status: engineering constraints for the planned Phase 1.2G–1.2J work; not a claim that these optimizations have been implemented.

### Responsibility boundaries
- **Scanner Core:** camera lease/session, frame scheduling, decoder lifecycle, barcode validation and accepted-result event.
- **Feature workflow:** Home cached lookup; Stocktake form-fill and explicit user save.
- **Presentation/UI:** scanner overlay, controls, visual transitions and feedback rendering. Presentation must observe runtime state; it must not own camera stream release semantics.
- **Platform adapters:** capability detection and graceful differences between iOS Safari and Android Chrome.

### Lifecycle and presentation invariants
- Camera/session lifecycle is independent from CSS/React animation completion. A slow or cancelled animation must never keep the camera active or release another session's stream.
- UI state must reflect actual runtime readiness. Do not show SCANNING before video and decoder readiness are established.
- Stale asynchronous work must not update UI after close, unmount, module switch or generation change.
- Transitions must not create duplicate camera requests, decoder loops, event listeners, timers or animation-frame callbacks.
- Avoid broad use of expensive blur/backdrop-filter/shadow effects on camera preview surfaces; profile before changing visual design.
- Respect `prefers-reduced-motion`; motion must remain an enhancement, not a dependency for correctness.
- Measure before optimizing. Keep instrumentation privacy-safe: no barcode payloads and no unnecessary persistent device identifiers.

### Current source facts to preserve
- `UniversalScannerSession` currently uses a 110 ms minimum decode interval. Older 70 ms statements in historical Phase 1.2F text are superseded.
- Camera stream ownership uses reference-counted leases after P0 merge. Session-level release and app-level global invalidation are distinct operations.
- Preserve Home cached lookup, Stocktake form-fill/explicit-save, duplicate Stocktake rows, manual entry and EAN-8/EAN-13/CODE-128 validation.
- Any future rotation/perspective/deskew work must be conditional and measured; do not penalize the normal scan path without evidence.

See `ROADMAP.md` for phase dependencies and acceptance gates.


### ADR-008 — Privacy-safe scanner performance telemetry (2026-11-07)
Status: Instrumentation implementation on `feat/scanner-phase-1-2g-instrumentation`; verification pending.
- Scanner performance telemetry is local runtime console output only. It must not send data to a backend or persist performance records by default.
- Permitted measurements: camera acquisition/autofocus/play/decoder readiness, first accepted result, decode processing stages, teardown, observed callback gaps, supported long-task/layout-shift entries, and UI phase commit intervals.
- Never record barcode payloads, camera device IDs, employee identity, or persistent device identifiers.
- PerformanceObserver entry types are feature-detected; absence on a browser is a supported no-op. Observed callback gaps are not equivalent to hardware/GPU frame-drop measurements.
- Instrumentation is diagnostic only: it must not alter decode cadence, camera constraints, decoder strategy, business callbacks or persistence contracts.

## Scanner camera startup — early preview readiness (2026-11-07)

### ADR-008 — Reveal the live preview before decoder initialization
**Status:** Implemented on `fix/scanner-phase-1-early-preview`; pending real-device QA and merge approval.

**Context**
- The shared scanner startup path waits for a usable video frame and then initializes the decoder.
- Previously, the Home and Stocktake UI kept showing the camera-start placeholder until the entire `session.start()` promise completed. That promise also included decoder initialization, so a usable live camera image could remain hidden while the decoder was still starting.
- Preview availability and barcode-decoding availability are separate milestones and must not be represented by one loading boolean.

**Decision**
- Add the optional session callback `onPreviewReady`, fired after the attached video element has its first usable frame and after stale/disposed-generation guards pass, but before decoder creation.
- Expose `isPreviewReady` separately from `isScanning` in `useScannerEngine`.
- Home and Stocktake reveal the actual video element when `isPreviewReady` is true and hide the startup placeholder at that point.
- Keep decoder readiness and scanning state governed by the existing session lifecycle. A visible preview must not be represented as a ready decoder or as permission to accept scans.

**Invariants / exclusions**
- Reset preview readiness on a new startup attempt, pause/close, suspension, stop, disposal and error according to the hook lifecycle.
- Do not change camera constraints, autofocus behavior, decoder algorithm, ROI, decode cadence, barcode validation, Home lookup, Stocktake form-fill/save, or persistence.
- Do not add polling, a second camera request, a second decoder loop, or a new dependency.
- Validate both iOS Safari/PWA and Android Chrome/PWA; GitHub CI alone does not establish physical-camera behavior.


## ADR-009 — Autofocus must not block camera acquisition (2026-11-07)

**Status:** Implemented on `fix/scanner-phase-1-2-autofocus-nonblocking`; automated regression and physical-device verification pending.

**Context**
- `cameraSession.ts` previously awaited `requestContinuousAutofocus()` after `getUserMedia()` returned a stream.
- Because `acquireCameraLease()` awaited the shared acquisition promise, a delayed `MediaStreamTrack.applyConstraints()` delayed lease delivery, video attachment, and the first usable preview frame.
- Autofocus is a best-effort camera enhancement. It is not a prerequisite for displaying the stream or initializing the barcode decoder.

**Decision**
- Validate the acquired video track and register its `ended` listener before starting optional focus work.
- Return the live stream from the shared acquisition promise without awaiting autofocus.
- Start continuous autofocus asynchronously and retain the existing capability detection, status classification, and safe diagnostic fields.
- Ignore late focus diagnostics when the acquisition generation is stale or the stream is no longer active. Unexpected diagnostic rejection is caught and logged without rejecting camera acquisition.
- Keep camera lease reference counting and generation/stream identity guards unchanged.

**Invariants / exclusions**
- Preserve the 1280×720 ideal resolution, 30 FPS target, ZXing decoder, 110 ms decode interval, supported barcode formats, ROI, barcode validation, Home lookup, Stocktake form-fill/explicit-save, and persistence contracts.
- Do not claim that a successful `applyConstraints()` call proves optical focus lock.
- Do not add a second stream request, polling, dependencies, UI states, or decoder loops.
- Verify delayed autofocus, unsupported focus capability, rejected focus constraints, track-ended behavior, first open and resume on iOS Safari/PWA and Android Chrome/PWA.

## ADR-010 — Tap-origin camera acquisition and module-owned scanner transitions (2026-11-08)

**Status:** Merged to `main` through PR #31 on 2026-11-08. The follow-up stabilization is tracked separately in ADR-011 / PR #32. Physical-device QA remains outstanding.

### Context
- Home and Stocktake previously mounted their scanner component after a state update; useScannerEngine then initiated camera acquisition from its mount effect.
- This left a gap between the user's tap and the getUserMedia() request.
- Both features displayed a centered startup message over a dark preview region. Home also inherited card-style scanner presentation, while the agreed target is a full-screen camera surface.
- Home and Stocktake have different presentation requirements and must not be forced into one scanner UI template.

### Decision
- Initiate requestCameraLease() synchronously in the scanner-opening click handler. The request begins camera permission/acquisition as close as possible to the user's gesture.
- Transfer the request to the mounted scanner session through CameraLeaseRequest.claim(); the session claims the same in-flight lease rather than issuing a second camera request.
- An unclaimed request supports cancel(). If the UI closes before handoff, a late successful acquisition releases its own lease. A request can be claimed only once.
- Preserve the existing shared camera lease/refcount model. A claimed request is released by its owning scanner session; cancellation of an unclaimed request must not stop a stream still owned by another lease.
- Home owns a full-screen camera presentation with no camera card/frame. Its entrance is anchored to the originating dock action.
- Stocktake owns a separate entrance treatment while retaining its existing scanner surface, frame and layout.
- Both transitions are lightweight CSS opacity/transform effects, honor prefers-reduced-motion, and do not wait for animation completion before camera startup or live preview.
- Browser/OS controls the exact timing and appearance of camera permission prompts; application code can initiate the request from the tap but cannot dictate the native prompt's presentation.

### Invariants
- No background camera retention. Close, unmount and suspension must still release the owning lease through the existing lifecycle.
- No duplicate getUserMedia request, session, decoder loop or stream lease during the handoff.
- First usable video frame remains the preview-readiness boundary; decoder/scanning readiness remains distinct.
- Animation is presentation-only. It must not own camera lifecycle, lease release or business callbacks.
- Preserve Home cached lookup and Stocktake form-fill/explicit-save, duplicate-row and manual-entry semantics.
- Preserve camera constraints, autofocus behavior, decoder/ROI/cadence, barcode validation and platform capability detection.
- Keep Home and Stocktake presentation implementations independent; only camera acquisition/lease handoff and motion-origin primitives may be shared.
- Home's continuous scan mode must remain open after each accepted result; the exit transition applies only to single-result mode.
- On a successful single-result event, mark the session as no longer desired-active before feature callback handling so visibility/foreground recovery cannot reacquire the camera during the exit window.

### Acceptance / verification
- Automated regression covers one-time lease claim, cancellation before claim, and lease isolation when another consumer still owns the shared stream.
- GitHub Actions run #89 on PR #31 head 9e2e1bbe568d0d7be41d253fde4dfd2218634955 passed the repository preflight.
- Required physical-device QA: iOS Safari/PWA and Android Chrome/PWA, including first permission prompt, denied/retry, close while permission is pending, rapid open/close/reopen, background/foreground and preview reveal.
- CI is not evidence of physical camera behavior. Do not merge or deploy until device QA and explicit user approval.


## ADR-011 — Scanner preview/lifecycle synchronization and module-owned exit transitions (2026-11-08)

**Status:** Implemented on `fix/scanner-lifecycle-preview-stability` / Draft PR #32. GitHub Actions run #107 passed on the source/test head and run #109 passed on the latest documentation-synchronized head. Local Windows/PowerShell preflight and physical-device QA remain outstanding.

### Context
- After PR #31 merged, source review found the Home presentation class and tap-origin style were not attached to the Home scanner root, so its dedicated full-screen transition CSS could not activate.
- `pauseScanner()` wrote UI state after awaiting session teardown. A foreground resume could publish a newer preview/scanning state before the older pause continuation completed.
- The start promise's final UI cleanup also needed ownership checking so a stale attempt could not clear the starting state of a newer attempt.
- Both module surfaces unmounted immediately on close/result, cutting off their intended exit treatment.

### Decision
- Attach Home's dedicated transition class and tap-origin custom properties to the actual scanner root.
- Treat the session's synchronous `suspended` state callback as the authoritative UI reset. Do not write preview/scanning state after the asynchronous suspend teardown completes.
- Only let the currently registered start promise clear the starting state.
- Keep Home and Stocktake exit animations in their own presentation components. Camera session close begins immediately; unmount occurs after the matching exit animation, or immediately when reduced motion is requested.
- Stabilize only the preview flex sizing needed by Home and Stocktake. Do not alter the camera acquisition contract or decoder pipeline.

### Invariants
- Preserve camera lease/refcount, 1280×720 ideal resolution, 30 FPS target, optional autofocus, first-frame readiness semantics, ZXing, ROI, 110 ms decode interval, supported formats and barcode validation.
- Preserve Home cached lookup and Stocktake form-fill, explicit save, duplicate rows, manual entry and persistence.
- No shared Home/Stocktake visual template, new dependency, camera prewarming, polling or background camera retention.
- Reduced-motion users must not depend on an animation event to release the scanner surface.

### Verification
- Added source regression assertions for Home transition wiring, independent Stocktake transition, lifecycle pause state ownership and preview geometry.
- Regression assertions cover Home root transition wiring, continuous-mode persistence, single-result exit gating, stale pause ownership, single-start promise ownership, Stocktake exit wiring and preview geometry.
- GitHub Actions run #107 (`42451111883`) passed the full preflight on source/test head `b3df0a683ab76237c1908e4adb01f36109fc95c6`; run #109 (`42451179152`) passed on the latest documentation-synchronized head `e2ce5f6b2c70c3e6e2cd3660cde5e46ff9f698d4`.
- Local Windows/PowerShell preflight and physical iOS Safari/PWA + Android Chrome/PWA QA remain required. No physical-device behavior is claimed from CI.


## ADR-012 — Scanner-first adaptive resource profiles and shared engine completion (2026-11-08)
Status: Proposed; documentation/architecture decision only. No adaptive runtime code exists.

### Context
The scanner is already separated into feature-owned UI, `useScannerEngine`, `UniversalScannerSession`, `cameraSession` lease ownership and a ZXing decoder adapter. However, the hook currently passes `profile: 'HIGH'` unconditionally. A Low/Mid/High type is not an adaptive policy. The user wants eventual app-wide adaptation, but authorizes scanner-first scope.

### Decision
- Re-scope Phase 1.2I as Shared Scanner Engine Completion.
- Introduce scanner-first Low/Mid/High resource policy in Phase 1.2J; defer applying it across all app modules until scanner policy is measured and proven.
- Resource adaptation may change optional visual/processing intensity only. Barcode correctness, accepted format/payload validation, session ownership, callback delivery, persistence and feature workflows are non-negotiable invariants.
- Keep Home and Stocktake presentation independently owned while sharing the engine.
- Treat direct battery/temperature data as unavailable unless a specific target browser exposes a reliable supported API. Use privacy-safe runtime proxies with hysteresis and conservative fallback; do not claim direct thermal measurement.
- Never lower camera quality or decoder work merely because a device is classified Low. Any change to resolution, decode cadence, ROI or recovery tiers requires measured scan-accuracy and latency evidence.

### Required engine boundary
The shared engine must own camera request/claim/cancel/release, session lifecycle, decoder lifecycle/scheduling, typed events/errors and diagnostics. Feature consumers own presentation and business policy. Explicit state transitions must distinguish camera request, preview readiness, decoder readiness/scanning, suspension, closing and disposal; a visible preview must not be represented as a ready decoder.

### Consequences
- Device profile selection is advisory and must be safe when device/browser capability data is missing.
- Profile changes must not create a second camera request, decoder, frame loop or concurrent session.
- A profile transition must be bounded and must not interrupt an active accepted-result delivery.
- Phase 1.2G is bounded at instrumentation/source audit; further work requires an observed defect or measured bottleneck.

See `SCANNER_SOURCE_AUDIT_2026-11-08.md` for the source evidence and phase sequence.


## ADR-013 — Scanner lifecycle event contract and presentation ownership (2026-11-08)

**Status:** Merged. The shared contract is consumed by Home (C1); Stocktake migration is tracked separately as C2.

- Define the public milestones `OPENING → READY → SCANNING → EXIT_REQUESTED → CAMERA_RELEASED → EXIT_PRESENTATION → DISPOSED` as an event vocabulary, not a mandatory linear state machine for every feature.
- `OPENING`, `READY` and `SCANNING` may be absent or recur around restart/recovery. A session may close before preview or decoder readiness. `EXIT_PRESENTATION` is optional and is owned/emitted by the feature module through the shared adapter.
- The engine owns camera lease, stream attachment/detachment, decode scheduling, decoder disposal and engine-resource cleanup. It emits `CAMERA_RELEASED` immediately after releasing its lease; decoder disposal may continue afterward. `DISPOSED` means engine teardown has completed.
- Feature modules own Connecting UI, snapshot/capture, VFX, result routing, navigation and their own UI disposal. Animation completion must never gate camera release.
- Lifecycle observer callbacks are optional and isolated: observer exceptions must not interrupt scanning, release or disposal. Terminal milestones are deduplicated per adapter instance.
- Existing `ScannerLifecycleState` remains the engine's internal operational state; the event contract does not replace it or alter scanner business behavior.
- Suspend/resume is not a terminal exit. A feature must not interpret a visibility suspension as `EXIT_REQUESTED` or `DISPOSED`.
- The foundation PR did not migrate either feature. C1 subsequently migrated Home; C2 remains responsible for Stocktake. The contract remains optional for consumers that do not need feature-owned exit presentation.

## ADR-014 — Fresh video surface on foreground recovery (2026-11-08)

**Status:** Merged in PR #43; user verified the previously reported iOS preview-shrink defect no longer reproduces.

- The existing shared scanner engine and session remain the single camera/decoder implementation.
- After a real background suspension, foreground recovery retires the old session, waits for its resource teardown and any in-flight camera lease handoff, then replaces only the disposable video DOM surface.
- Recovery waits for React to commit the replacement node and reuses the normal startup pipeline: layout barrier, stream attachment, playback, fresh-frame readiness, decoder initialization and scanning.
- Home and Stocktake share this behavior through useScannerEngine; feature-specific presentation and business logic remain independent.
- Do not create a second engine, retain camera in the background, add polling/retry timers, or move recovery into feature components.

---
