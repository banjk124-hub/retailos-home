## ADR-018 — Capability-gated camera Torch; investigation tooling retired (2026-11-09)

**Status:** Accepted. Production behavior remains capability-gated. Temporary diagnostics and compatibility probing were removed by PR #55; GitHub Actions run #42572378379 passed full preflight. User confirms PR #55 was merged and deployed.

### Context
- PR #51/#52 introduced optional Torch control and deferred capability discovery until after video playback and the first usable frame.
- iOS Safari/PWA Torch is confirmed working by the user.
- Android Chrome on Samsung Galaxy S23 Ultra exposes `getCapabilities()` and `applyConstraints()`, but does not expose `capabilities.torch` or `settings.torch` on the active track.
- The PR #54 debug-only probe sent `torch: true` and `torch: false`; both `applyConstraints()` promises resolved, but the physical LED did not illuminate. Promise resolution therefore did not establish hardware support.
- The investigation does not justify bypassing capability detection, adding model/browser heuristics, or introducing a native camera stack solely for Flash.

### Decision
- Discover Torch from the active video track after `video.play()` and the first usable frame.
- A feature renders its Flash control only when the active track reports `getCapabilities().torch === true`.
- Apply ON/OFF through the existing active track and preserve its camera constraints.
- Unsupported or rejected Torch remains non-fatal: preview and barcode decoding continue normally.
- Do not infer support from user-agent, device model, camera facing mode, physical LED presence or a resolved `applyConstraints()` promise.
- Do not send Torch constraints when the active track does not advertise support.
- Keep iOS on the existing WebKit/MediaStreamTrack path; no native bridge or CameraX dependency is introduced.
- Retire the temporary PR #53 sampling panel/timers and PR #54 compatibility pulse, their React/session contracts and their runbook after the evidence has been collected.

### Verified device outcome
- iOS: user confirms Flash works normally.
- Samsung Galaxy S23 Ultra / Android Chrome: Torch is not exposed on the active track; the explicit diagnostic pulse was accepted by the API but did not illuminate the LED.
- This result is specific to the tested device/browser path. It does not establish that all Android devices are unsupported.

### Acceptance
- Keep the production Flash control capability-gated in both Home and Stocktake.
- Unsupported devices continue scanning without a Flash control or Torch command.
- Preserve camera acquisition, first-frame readiness, session generation guards, lifecycle/recovery, decoder, barcode delivery and module presentation.
- Keep automated regression coverage for supported/unsupported tracks, ON/OFF, rejected constraints and constraint preservation.
- Future Android compatibility work requires a reproducible device/browser test demonstrating actual LED control before any production change.

---

## ADR-019 — Shared persisted scanner feedback preferences (2026-11-09)

**Status:** Implemented and merged to `main` by PR #56 at `5eee1a6a565f6263907541dac6af6b4ba77b37be`; final PR head `0790e4f7d04ccaa8b6500e2e8c59b99131504318` passed full preflight in GitHub Actions run #42575773839. Deployment is not asserted by this record. Physical-device verification remains pending.

### Context
- Accepted barcode feedback already uses one shared engine callback for Home and Stocktake.
- The previous implementation passed `audioFeedback` and `hapticFeedback` booleans through consumer/hook options; beep gain was fixed at 0.24 and vibration was a fixed 25 ms pulse.
- The Home Settings navigation item opened Scanner QA Monitor directly. There was no Settings Hub or persisted scanner preference UI.

### Decision
- Add one versioned device-local preference store at `retailos.scannerSettings.v1`.
- Defaults: vibration enabled and beep volume 50%. The 50% level maps to the existing gain 0.24, preserving current sound by default.
- Beep volume uses 11 discrete steps (0–100 in 10-point increments); 0 mutes the app beep and 100 maps to gain 0.48.
- The shared feedback service reads the current preferences at each accepted barcode event. Do not capture preferences into a camera session or require camera restart when preferences change.
- Remove per-feature `audioFeedback`/`hapticFeedback` overrides from Home Scanner, Stocktake Scanner, the shared hook and the platform session contract.
- Keep feedback outside `UniversalScannerSession`: it is application behavior, not camera/decoder lifecycle.
- Preserve gesture-based Web Audio unlocking, the existing 1760 Hz / ~110 ms tone envelope, one 25 ms vibration pulse, and non-blocking failure handling.
- When `navigator.vibrate` is unavailable, show an explicit unsupported note and disable the control; do not pretend the device vibrated.
- Settings navigation opens a Settings Hub. Scanner QA Monitor and Scanner preferences are separate entries and separate views. The dock settings icon uses the gear-shaped `Settings` icon.

### Invariants
- Feedback is attempted only after the existing accepted-result gate; invalid/cooldown-blocked detections remain silent.
- Home cached lookup, Stocktake form-fill/explicit-save, duplicate-row behavior, decoder cadence, barcode validation, camera acquisition and lifecycle remain unchanged.
- All current and future Scanner consumers use the same preference store through the shared feedback service.
- Storage failure falls back to in-memory defaults/current state and never blocks scanning.
- No backend, network request, dependency, auth/session or IndexedDB migration is introduced.

### Acceptance
- Settings changes persist after reload and are immediately reflected by all Scanner consumers.
- 50% default reproduces gain 0.24; 0% suppresses beep; 100% maps to gain 0.48.
- Android with Vibration API support follows the toggle. Unsupported iOS/browser paths remain non-fatal and visibly identify the limitation.
- Settings Hub exposes separate Scanner QA Monitor and Scanner settings entries.
- Full preflight and physical iOS/Android QA pass before merge/deploy.

---

## ADR-020 — Runtime verification of shared Scanner audio feedback (2026-11-09)

**Status:** Implemented on `test/scanner-audio-runtime-and-doc-sync`; full preflight passed in GitHub Actions run #42648085229 on documentation-synchronized head `9b0d76a5931a85bd336629348ec98bbd96fb86b4`. Draft PR #57 remains open and unmerged. Production audio mapping is intentionally unchanged pending physical-device comparison.

### Context
- PR #56 centralizes Scanner feedback preferences and maps the 0–100 UI level linearly to Web Audio gain 0–0.48.
- The existing settings regression test checked source text and store behavior, but did not execute the audio service against an AudioContext/GainNode implementation.
- A subjective report that 50% and 100% sound similar cannot, by itself, establish a defect in the gain calculation or justify changing the curve.

### Decision
- Add a deterministic mocked Web Audio runtime test that executes the production audio and feedback modules.
- Assert that 0% creates no oscillator; 50% ramps to gain 0.24; 70% ramps to 0.336; and 100% ramps to 0.48.
- Verify AudioContext gesture unlock, preview reads the latest shared setting, accepted-result feedback uses the same setting, vibration emits one 25 ms pulse when enabled, and absent Vibration API remains non-fatal.
- Register the test in the repository preflight.
- Do not alter the production gain mapping, tone frequency, envelope or duration until controlled A/B testing on representative iOS and Android devices supports a change. App gain is not a calibrated acoustic SPL measurement; device media volume, speaker response and browser audio processing affect perceived loudness.

### Protected scope
- No changes to camera acquisition/lease, camera constraints, autofocus, first-frame readiness, decoder, barcode validation/delivery, accepted-result gate, Torch, scanner lifecycle, Home lookup, Stocktake form-fill/explicit-save, auth, backend, storage architecture or PWA deployment.
- CI proves deterministic software-level gain routing only. It does not prove physical loudness, speaker quality, vibration hardware behavior or platform support.

---

## ADR-015 — Geometry-neutral engine video readiness (2026-11-09)

**Status:** Accepted and implemented in PR #49; merged to `main` at `1764c858a7d7855950ebe328a3a653d6935fa796`. User confirms deployment and post-deployment testing without issues.

### Context
The former `waitForVideoPresentationLayout()` gate made shared scanner startup depend on a feature DOM arrangement: a video parent had to exist, video/container rectangles had to be non-zero and nearly equal, and their geometry had to remain stable across animation frames. That assumption was not a platform/media requirement and constrained module-specific UI composition.

### Decision
- The platform engine attaches the acquired `MediaStream` to the supplied `HTMLVideoElement` without reading DOM presentation geometry.
- The engine must not require a parent element, non-zero CSS box, matching video/container rectangles, positional alignment, aspect-ratio equality, or stable DOM bounds before stream attachment or playback.
- Remove the geometry gate and its helper entirely when no consumer remains. The obsolete `src/platform/scanner/videoPresentationLayout.ts` has been deleted.
- Keep technical media readiness. `waitForVideoFrameReady()` still checks decoded media availability (`readyState >= HAVE_CURRENT_DATA` and intrinsic `videoWidth/videoHeight > 0`), playback state, and fresh-frame evidence using `requestVideoFrameCallback` where available or the media timeline fallback. This is media/frame validity, not CSS layout geometry.
- Preserve startup ordering: attach stream → play video → confirm usable frame → invoke `onPreviewReady` and publish lifecycle `READY` → initialize decoder → enter scanning only after decoder readiness.
- `isPreviewReady` is a technical signal that a usable camera frame exists. It is not a command for a particular reveal animation, container size, crop, or visual layout.
- Home and Stocktake own their video DOM, containing blocks, sizing, aspect ratio, crop/object position, visibility, overlays, reveal timing and other UI/UX choices independently.
- A module may intentionally use a video surface that is cropped, scaled, inset, letterboxed, overlaid, transformed, or otherwise geometrically different from its container. Such choices must not block engine startup.
- Keep the platform engine responsible for camera lease/session/stream/decoder resources and technical readiness only. Do not move feature presentation decisions into the engine.

### Current module implementations (verified on main)
- **Home:** `BarcodeScanner.tsx` renders its own keyed video inside `.barcode-scanner-view`. The Home transition stylesheet owns its full-surface video presentation, `object-fit: cover`, and `.has-preview` visibility gate. Native video opacity remains 1 with no opacity transition.
- **Stocktake:** `StocktakeScanner.tsx` renders its own keyed video inside `.stocktake-scanner-preview`. Stocktake retains its framed preview (base `aspect-ratio: 4/5`; mobile sizing is independently constrained), `object-fit: cover`, and its own `.has-preview` visibility gate. Native video opacity remains 1 with no opacity transition.
- Both modules consume the shared `isPreviewReady` signal but do not share a video presentation component or CSS contract.

### Protected scope
PR #49 changed only the platform startup geometry gate, its obsolete helper, and regression/preflight assertions. It did not change camera acquisition/lease ownership, lifecycle event contract, Recovery orchestration, decoder implementation/cadence, barcode validation/delivery, Home lookup, Stocktake form-fill/persistence, snapshots, module markup/CSS, PWA configuration, or deployment configuration.

### Verification
- GitHub Actions run #200 passed the full `npm run preflight`: barcode validation regression, lifecycle regression, presentation-ownership regression, TypeScript/production build, GitHub Pages build and diff checks.
- The presentation regression now asserts that the platform session does not inspect DOM geometry, technical frame readiness remains present, startup ordering is preserved, and Home/Stocktake retain their own video/reveal contracts.
- User confirms PR #49 was merged, deployed and tested without issues. This is user-reported device/deployment acceptance; CI itself remains source/build validation, not hardware simulation.

---

## Historical implementation note — PR #46 shared preview experiment (2026-11-08)

PR #46 briefly introduced an engine-owned shared preview curtain and `ScannerPreviewSurface`. Physical-device testing exposed iOS native-video sizing and Android transition regressions; PR 47A reverted that shared presentation. Retain this record as historical evidence only. The current rule is ADR-015: engine-owned technical frame readiness, module-owned visual presentation, and no DOM geometry gate.


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



## ADR-008 — Technical scanner lifecycle and feature-owned exit presentation (2026-11-08)

**Status:** Revised by the technical-only lifecycle separation PR. Home and Stocktake retain their existing module-owned close behavior.

- `UniversalScannerSession` owns the session ID and constructs its `ScannerLifecycleAdapter` with an optional `ScannerLifecycleObserver`. Features never construct the adapter or supply a session ID.
- The platform event contract contains only scanner execution/resource milestones: `OPENING`, `READY`, `SCANNING`, `SESSION_CLOSE_STARTED`, `CAMERA_LEASE_RELEASED`, and `DISPOSED`.
- The platform contract has no presentation event or presentation-completion method. The engine does not wait for, retain sessions for, or receive callbacks about UI animation.
- Home and Stocktake keep presentation completion in their own feature components. Each module locally joins its own animation completion with technical close/lease/disposal signals before unmounting.
- Snapshot capture remains before camera teardown. Camera lease release remains prompt and is never delayed by animation; `DISPOSED` follows completed engine teardown.
- Recovery may temporarily retain a retired session only so a close racing recovery can still publish its terminal technical milestones. This is resource-lifecycle coordination, not presentation ownership.

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
- `UniversalScannerSession` currently uses a 70 ms minimum decode interval (SCAN-05/06, PR #67). Older 110 ms statements in SCAN-04 and pre-correction records are historical and superseded.
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


## ADR-013 — Scanner technical lifecycle contract (2026-11-08)

**Status:** Revised by the technical-only lifecycle separation PR.

- The platform publishes optional technical milestones: `OPENING`, `READY`, `SCANNING`, `SESSION_CLOSE_STARTED`, `CAMERA_LEASE_RELEASED`, and `DISPOSED`. This is an event vocabulary, not a mandatory linear state machine.
- `OPENING`, `READY`, and `SCANNING` may recur around suspend/resume. A session may close before preview or decoder readiness.
- The engine owns camera lease, stream attachment/detachment, decode scheduling, decoder disposal, recovery, and engine-resource cleanup. `CAMERA_LEASE_RELEASED` means this session's lease has been released; it does not claim that a shared physical stream has stopped when another lease remains. `DISPOSED` means engine teardown has completed.
- Feature modules own all presentation: opening/closing UI, animation, snapshot capture, VFX, result routing, navigation, and UI disposal. They may locally coordinate their own presentation completion with technical lifecycle signals, but must never send presentation state into the platform engine.
- Observer callbacks are optional and isolated: observer exceptions must not interrupt scanning, release, or disposal. Terminal technical milestones are deduplicated per adapter instance.
- `ScannerLifecycleState` remains the engine's internal operational state. Suspend/resume is not a terminal close.
- Existing Home and Stocktake business behavior, snapshot timing, and module-specific motion remain unchanged by this contract separation.

## ADR-014 — Fresh video surface on foreground recovery (2026-11-08)

**Status:** Merged in PR #43; user verified the previously reported iOS preview-shrink defect no longer reproduces.

- The existing shared scanner engine and session remain the single camera/decoder implementation.
- After a real background suspension, foreground recovery retires the old session, waits for its resource teardown and any in-flight camera lease handoff, then replaces only the disposable video DOM surface.
- Recovery waits for React to commit the replacement node and reuses the normal startup pipeline: stream attachment, playback, fresh-frame readiness, decoder initialization and scanning. The platform session does not insert a DOM geometry/layout barrier; see ADR-015.
- Home and Stocktake share this behavior through useScannerEngine; feature-specific presentation and business logic remain independent.
- Do not create a second engine, retain camera in the background, add polling/retry timers, or move recovery into feature components.

---

## ADR-016 — Optional camera torch capability (2026-11-09)

**Status:** Merged, deployed and user-verified in PR #51. iOS enable/disable is stable; a post-deployment Android issue (Flash control not visible) is being corrected in ADR-017 / PR #52.

### Context
Home and Stocktake share the camera session and need optional flashlight control for low-light scanning. Browser engines and camera hardware do not universally expose a controllable torch.

### Decision
- The platform session discovers Torch support from the active video track's `getCapabilities().torch`; it does not infer support from device model, user-agent, facing mode or camera presence alone.
- Torch remains off by default. Camera startup, preview readiness and decoder initialization must not wait for or automatically enable it.
- The platform contract exposes typed torch state and an explicit enable/disable operation. The session applies `MediaStreamTrack.applyConstraints()` with the advanced `torch` constraint only when support is advertised.
- Because `applyConstraints()` can replace omitted custom constraints, the Torch adapter preserves existing constraints and falls back to pinning the active width, height, frame rate, facing mode and device identity from `getSettings()` when needed.
- A module may ignore this capability entirely. A consuming module decides whether/where to render a control, its labels, icons, feedback, visibility and interaction policy.
- Home and Stocktake independently expose a flash control when their active track reports support. Neither module shares a presentation component or visual contract.
- Pending operations disable repeated taps. Async completion is accepted only while the same session generation and video track remain active. Teardown, suspend and recovery clear the old track state; a replaced track must be detected again.
- Unsupported or rejected constraints are non-fatal to scanning. The barcode scanner remains usable without Torch.

### Platform limitations
- Torch is not uniformly supported by iOS Safari/WebKit, Android browsers, camera hardware or all camera modes. Capability detection is authoritative for the active track, but a reported capability can still fail at apply time.
- WebKit's maintainer confirmed Torch support was added to WebKit in August 2024, and a user reported it working on iOS 17.5.1. This does not guarantee support on every iOS release/device; continue to gate on the active track's reported capability.
- Do not request flash through getUserMedia constraints, alter existing camera resolution/FPS requests, or treat an unsupported Torch request as a camera/decoder failure.
- Physical iOS Safari/PWA and Android Chrome/PWA testing is required. CI validates contracts, adapter behavior and builds but cannot prove hardware flash behavior.

### Protected scope
No changes to camera lease/refcount, getUserMedia resolution/FPS constraints, autofocus, first-frame readiness, DOM presentation ownership (ADR-015), decoder/ROI/110 ms cadence, barcode validation/delivery, technical lifecycle event vocabulary, Recovery ordering, Home lookup or Stocktake form-fill/explicit-save behavior.

## ADR-017 — Discover camera Torch after first live frame (2026-11-09)

**Status:** Implemented in PR #52; Android physical-device retest pending.

### Context
After PR #51 was merged and deployed, the user confirmed that Torch worked reliably on iOS but the Flash control did not appear on Android. The feature UI intentionally renders the control only when the active video track advertises `getCapabilities().torch === true`.

Source audit found that `bindTorchTrack(stream)` called `getCapabilities()` immediately after the shared `getUserMedia()` lease resolved, before assigning `video.srcObject`, calling `video.play()`, and observing the first decoded frame. Chromium documents that camera capabilities may only become available once the camera is actually streaming. The initial unsupported result was cached for the lifetime of the session; there was no later refresh.

### Decision
- Keep camera acquisition, lease ownership and camera constraints unchanged.
- Bind/read Torch capability only after the current session has attached the stream, started playback and passed `waitForVideoFrameReady()` with a usable fresh frame.
- Retain the existing generation/disposal guard before binding, so a retired session cannot publish a late capability update.
- Emit a privacy-safe diagnostic with the reported Torch capability state (`true`, `false`, `not-exposed`, or `unavailable`), track ready state, facing mode and dimensions. Do not log device IDs.
- Do not infer support from Android user-agent, model names, rear-camera assumption or `getSupportedConstraints()`; only the active track's post-start capability is authoritative.
- Keep the module UI contract unchanged: the Flash control remains hidden when the active track genuinely does not expose Torch.

### Protected scope
No change to getUserMedia constraints, 1280×720/30 FPS targets, autofocus, camera lease/refcount, preview readiness definition, decoder startup/cadence, barcode validation/delivery, Home/Stocktake UI composition or Torch apply/disable semantics.

### Verification
- Regression test models a track whose Torch capability is absent before streaming and becomes available after streaming starts.
- Source-order assertion verifies Torch discovery occurs after playback and first-frame readiness.
- Physical Android Chrome/PWA retest must inspect the new `[RetailOS Scanner] Torch capability` diagnostic. If it reports `not-exposed` after the first live frame, investigate that browser/device's camera track support rather than forcing the UI control visible.


## ADR-022 — Module-owned scanner input contract (2026-11-10)
**Status:** SCAN-01 contract merged by PR #58; geometry mapping and Home/Stocktake wiring were completed in SCAN-02/03. SCAN-04 consumes the mapped source region.

The module contract is `ScannerModuleConfig`: a visible-image region in `preview-content-normalized` coordinates plus an explicit `ScannerCameraRequest`. The geometry mapper in SCAN-02 converts the preview region into `source-frame-normalized` coordinates. The scanner core consumes only that resolved source-frame region; it does not query the reticle DOM or own presentation.

Coordinate-space rules:
- Both rectangles use normalized fractions in [0,1], with a top-left origin and explicit coordinate-space tags.
- Preview coordinates refer to the visible video image content, not the outer preview element or viewport, and follow the rendered orientation including CSS mirroring.
- Source-frame coordinates refer to the unrotated camera frame, independent of CSS layout and preview aspect ratio.
- Mapping must account for `object-fit`, `object-position`, source dimensions and mirror state.

Camera request rules:
- Preferred width, height and frame rate are camera preferences, not exact constraints.
- Camera resolution is independent of the module's display aspect ratio.
- Default remains environment / 1280×720 / 30 FPS ideal / 30 FPS maximum.

SCAN-01 adds platform-neutral types and this contract only. Existing Home/Stocktake behavior is unchanged. See `SCAN_01_INPUT_CONTRACT.md` for migration, strict-mode and acceptance rules.


## ADR-023 — Pure preview-to-source geometry mapper (2026-11-10)
**Status:** Merged by PR #59 at `891a3a6c8c85442d0b4a253c1fca43b36b590f1c`; main CI run #299 and deployment smoke test passed. Home and Stocktake runtime consumers were wired in merged SCAN-03 (PR #61).

`src/platform/scanner/scannerGeometry.ts` implements a pure mapping from the module-owned `preview-content-normalized` rectangle to a `source-frame-normalized` rectangle. The caller supplies intrinsic source-frame dimensions, video element content-box dimensions, CSS `object-fit`, normalized `object-position` fractions and an explicit mirror flag.

The mapper models `fill`, `contain`, `cover`, `none` and `scale-down`; calculates the visible image intersection (excluding letterbox/pillarbox space); accounts for negative free space and object-position crop; and reverses horizontal mirroring before normalizing source coordinates. It returns a discriminated error result for invalid inputs rather than a full-frame fallback.

The mapper performs no DOM reads and has no camera, React, media-stream or decoder dependencies. It does not create a camera-startup geometry barrier. Home and Stocktake retain separate preview/reticle ownership. SCAN-03 will wire each module independently; SCAN-04 will activate strict ROI decoding only after both integrations are valid.

See `docs/ai-context/SCAN_02_GEOMETRY_MAPPING.md` and `scripts/test-scanner-geometry.mjs`.


## ADR-024 — Feature-owned preview region measurement and in-place session update (2026-11-10)
**Status:** Merged by PR #61 at `4804a0b0f06113e43a06e8b171d05dbad6fb1a8f`; user confirms iOS and Android verification with no detected issue. SCAN-04 consumes this region in the decoder.

### Decision
- Home and Stocktake keep their own video and reticle DOM. A feature-level binding hook may share measurement mechanics but must not own presentation.
- Measure the actual video/reticle DOMRects and computed object-fit/object-position after scanning is already ready; never add a camera-startup geometry barrier.
- Clip each reticle to visible image content, then map through the SCAN-02 pure mapper.
- Publish source-frame normalized geometry through an in-place ScannerSession setter/getter.
- Region updates must not restart the session, camera lease, decoder or frame loop. Invalid/unsupported geometry clears the active region rather than falling back to full frame.

### Constraints
- No decoder crop/ROI-only decode in SCAN-03; the decoder continues to receive the full video.
- No camera lifecycle, lease/refcount, readiness, recovery, cadence, validation, UI, CSS or module business-flow changes.
- Physical iOS Safari/PWA and Android Chrome/PWA alignment QA is required after deployment.

See `docs/ai-context/SCAN_03_MODULE_REGION_INTEGRATION.md` and `scripts/test-scanner-preview-region.mjs`.


## ADR-025 — Strict decoder consumption of module-owned source ROI (2026-11-10)

**Status:** Merged and deployed by the user; the user confirms normal scanner operation. Detailed optical stress scenarios were not individually recorded. SCAN-05/06 extend the ROI decoder in later decisions.

### Context
SCAN-03 publishes a mapped `source-frame-normalized` reticle region into the active session. The previous ZXing adapter still decoded the full frame first and then tried a hard-coded centered crop, so the actual module scan intent did not constrain decoder work.

### Decision
- Each decoder invocation receives the current session region with its timestamp.
- A pure resolver validates the coordinate-space tag and rectangle, then converts normalized bounds into integer source pixels using floor-leading/ceil-trailing rounding and source-frame clamping.
- ZXing draws only that source crop into its working canvas and decodes the ROI. The full-frame-first pass and fixed centered fallback are removed.
- Missing or invalid geometry is a decode miss, not a decoder error, and must never trigger full-frame fallback.
- At the SCAN-04 stage, the supported barcode allowlist, then-current binarizer schedule, 1.5× aspect-preserving ROI upscale and 110 ms cadence were preserved. The cadence/binarizer policy was superseded by SCAN-05/06 (ADR-026/027); strict ROI, allowlist, validation and result delivery remain.

### Constraints
- No camera acquisition/lease, readiness, lifecycle/recovery, frame scheduling, CSS, Home/Stocktake UI or business-flow changes.
- No rotation, deskew, perspective correction, adaptive exposure or camera-constraint changes in SCAN-04.
- Physical barcode accuracy/performance QA on iOS Safari/PWA and Android Chrome/PWA is required before release acceptance.

### Acceptance
See `docs/ai-context/SCAN_04_STRICT_ROI_DECODING.md` and `scripts/test-scanner-roi-decoder.mjs`.


## ADR-026 — Continuous ROI orientation recovery (2026-11-10)

**Status:** Accepted and merged by PR #67 at `9406ac30d53bc9984912bd1928a32fd78157cf60`; final PR-head CI #432 passed. User confirms deployed operation is good.

### Context
The prior orthogonal-only extension ran every third valid ROI frame and did not cover intermediate in-plane angles. Device testing reported missed sideways barcodes, blind angles and slow recognition. The user clarified that accuracy and sensitivity take priority over a strict ultra-low-end CPU budget.

### Decision
- Decode the upright strict ROI first.
- On a miss, try one exact clockwise 90° ROI transform as the fast sideways path on the same valid frame.
- If that misses, run SCAN-06 continuous orientation estimation and correction; no finite hard-coded angle list.
- Use both HybridBinarizer and GlobalHistogramBinarizer as successive strategies for each orientation candidate.
- Set the shared session minimum decode interval to 70 ms. Keep decode calls serialized; do not queue overlapping work.
- Keep the transform and estimator pure and ROI-local; no DOM, camera, session or presentation ownership.
- Expose rotation attempts/hits and separate transform/decode timings.

### Constraints
- Preserve strict module-owned ROI/no-fallback, camera request/lifecycle, supported symbologies, validation, result delivery and Home/Stocktake contracts.
- Missing/invalid ROI remains fail-closed; no full-frame or centered fallback.
- Physical iOS Safari/PWA and Android Chrome/PWA QA is required before release acceptance.

### Acceptance
See `docs/ai-context/SCAN_05_ORTHOGONAL_ROTATION.md` and `scripts/test-scanner-rotation.mjs`.

## ADR-027 — Continuous in-plane orientation correction (2026-11-10)

**Status:** Accepted and merged by PR #67 at `9406ac30d53bc9984912bd1928a32fd78157cf60`; final PR-head CI #432 passed. User confirms deployed operation is good.

### Context
The previous estimator used one global Sobel structure tensor and accepted only 1.2°–12°. This left large intermediate angles unsupported and could be dominated by packaging text, borders or graphics. A continuous estimate must be validated by the production decoder, not accepted as a barcode result by itself.

### Decision
- Estimate gradient orientation from a 180-bin Sobel histogram, using directional-energy concentration and local coherence gates.
- Normalize modulo 180° to a signed ±90° correction range; ignore estimates below 0.65° and fail closed on ambiguous textures.
- Apply a percentile-based contrast stretch only for compressed 1st–99th percentile ROI ranges (24–219 luminance levels), then inverse-angle bilinear ROI correction with expanded bounds, white fill and a 6,000,000-pixel allocation ceiling.
- Evaluate the original and quarter-turned ROI representations, preferring the smaller correction angle first and retaining the alternate as fallback.
- Run HybridBinarizer and GlobalHistogramBinarizer for each candidate; ZXing format/checksum validation remains authoritative.
- Count estimator invocations, rejected estimates and decode hits independently. Suppress only the library's expected `NotFoundException` console warning during synchronous misses; forward unrelated warnings.
- Keep perspective/keystone correction and curved-label dewarping out of scope.

### Constraints
- No camera/session/lifecycle, ROI mapping, UI, validation or Home/Stocktake business-flow changes.
- Measure physical accuracy, first-result latency, stage cost and UI responsiveness on iOS/Android before release acceptance.

### Acceptance
See `docs/ai-context/SCAN_06_BOUNDED_DESKEW.md` and `scripts/test-scanner-deskew.mjs`.


## ADR-028 — Separate business workflow identity from snapshot identity and add local Stocktake import (2026-11-10)

**Status:** PR #69 and PR #70 merged/deployed; PR #70 accepted by user. Main baseline for follow-up: `b9cc4ce9a848acd51027dff64f5620f65e660a4b`.

### Context

The Home module registry currently typed every workflow ID as `ModuleDataId`. That conflates two different concepts:
- a business workflow that can be opened by an employee;
- a server-provided snapshot dataset that can be synchronized and cached.

The new `Xuất file` workflow is local-only. It reads a workbook from the device and does not require a server snapshot. Adding it to `MODULE_DATA_IDS` would incorrectly make it part of the Apps Script manifest and snapshot synchronization contract.

### Decision

- Introduce `RetailModuleId` for business workflow identity, with `ModuleDataId` retained as the snapshot-data identity.
- Add `stocktake-import` to the existing Kiểm kê library as a separate ready/local workflow.
- Keep the importer separate from `StocktakeModule`; do not modify Stocktake entry persistence, scanner, camera lifecycle or existing manual/scanner/export flows.
- Parse OOXML `.xlsx` in the browser using the existing JSZip dependency and browser XML APIs. Do not upload the workbook or make network requests.
- Store import history/output in its own IndexedDB database, `retailos-stocktake-import`.
- Preview output before export. Multi-zone output is a ZIP containing one TXT per zone; individual zone downloads remain available.
- Preserve duplicate rows and exact source row order. Prefer the explicit BARCODE column over MÃ VẠCH.

### Data and output constraints

- Preserve raw numeric XML tokens to avoid JavaScript floating-point loss.
- Convert textual decimal commas to dots; reject mixed/ambiguous separators.
- Convert percentage-formatted numeric cells from Excel's stored fraction to displayed percent text (e.g. 0.125 → 12.5%).
- Resolve zone codes from recognizable sheet names or top-of-sheet metadata.
- Numeric-only zones currently map to `ADRESSE,,<number>`; this and literal percent suffix compatibility require business acceptance.

### Protected scope

No changes to Scanner Engine, camera/session/lifecycle contracts, Stocktake scanner, existing Stocktake IndexedDB schema, Stocktake save/export behavior, authentication, snapshot API, or deployment configuration.

### Acceptance

See `docs/ai-context/STOCKTAKE_FILE_IMPORT.md`. Required checks include full `npm run preflight`, both supplied workbook fixtures, multi-sheet/multi-zone coverage, iOS Safari/PWA and Android Chrome/PWA file-picker/download QA, and confirmation that the downstream system accepts numeric-only zone and percentage representations.


## ADR-029 — Stocktake import accuracy, layout tolerance and editable zone review (2026-11-10)

**Status:** PR #70 (`feat/stocktake-import-desktop-editor`) merged and accepted. See `docs/ai-context/modules/EXPORT_FILE.md` for current follow-up status.

### Context

After PR #69 was merged and deployed, practical use exposed four correctness/usability gaps: Excel decimal display values were not preserved, material rows could lack a sales barcode but have GOLDCODE, workbooks could contain varying table layouts, and there was no saved manual correction step. Desktop use also needs a wider working surface.

### Decision

- Keep the importer a standalone business workflow. `RetailModuleId` must be defined independently from `ModuleDataId`; importer history stays in its own IndexedDB database.
- Treat OOXML numeric values as decimal strings. Apply the cell's Excel number format and precision using string-based decimal rounding; never round-trip the quantity through JavaScript floating-point numbers.
- PR #70 baseline resolution was BARCODE → GOLDCODE → legacy MÃ VẠCH. The follow-up contract extends this to BARCODE → CODE → GOLDCODE → TILLCODE → legacy MÃ VẠCH final fallback. Missing code/quantity rows remain visible and editable; they are not silently discarded.
- Detect table headers independently across each sheet and each table block. Merge all recognized blocks that resolve to the same zone while preserving row order and duplicates. If a block is unsupported or zone resolution is ambiguous, show a diagnostic and block all exports rather than silently exporting a partial workbook.
- Require explicit per-zone save before export. Persist edited rows and diagnostics with the import history record.
- Use zone-only filenames and ZIP names. Keep the existing date/time in the `NHAN VIEN` content record until downstream format compatibility is confirmed.
- Provide a wide desktop workspace, a stacked mobile layout, short opacity/transform transitions, and reduced-motion support.

### Acceptance

Validate Excel display parity for integer, fixed-decimal, General and percent formats; GOLDCODE fallback; missing-code correction; multiple layouts/tables in one workbook; aggregation of same-zone tables; save/restore; and file downloads on desktop, iOS and Android. Confirm whether the date/time content record remains required.


## ADR-030 — Independent module work lifecycle and handoff (2026-11-10)

**Status:** Implemented and merged in PR #70.

### Decision

- Keep business workflow availability (`availability`) separate from engineering progress (`workStatus`). A module can be usable while still receiving follow-up development, or be paused without changing runtime behavior.
- `workStatus` is optional registry metadata with values `planned`, `in-progress`, `paused`, `operational` and `maintenance`. It is informational only; it must not gate rendering, routing, data loading, permissions or module execution.
- Each independently developed module owns a dedicated status/contract document recording its stable ID, current branch/PR/base/head, implementation state, verified evidence, pending acceptance, owned files, protected boundaries and exact resume procedure.
- Parallel module/engine work uses separate branches and PRs. Module-owned files and isolated storage may be changed only within their scope. Shared contracts require explicit cross-module design and regression coverage.
- Pausing a module is a documentation/metadata state change, not teardown/reset. Never clear local data, alter stable IDs or rewrite history as a side effect.

### Protected boundary for Xuất file

- Stable runtime ID: `stocktake-import`; dedicated storage: `retailos-stocktake-import`.
- No dependency on Stocktake local store, scanner engine, camera lifecycle, shared snapshot cache, snapshot IDs, authentication semantics or deployment configuration.
- Keep implementation under `src/features/stocktake-import/`; shared registry metadata is the only intended shared integration point.
- Resume by reading the dedicated module record, checking branch/PR head against GitHub, auditing the current diff and changed files, then rerunning full preflight. Never resume from stale notes alone.


## ADR-031 — Output layer transition and additive multi-file import sessions (2026-11-10)

**Status:** Implemented on follow-up branch `feat/stocktake-import-session-output`, draft PR #71; CI #509 passed on code head `37b5f69d`; physical device acceptance pending.

### Context

After PR #70 was deployed and accepted, the operator requested a faster output workflow and the ability to combine multiple independent workbooks in one working session. The extension must preserve the stable editor, zone navigation, local history, numeric fidelity and the surrounding module UI.

### Decisions

- Keep the current module shell and zone list. Add two mutually exclusive layers only inside the selected zone workspace: TXT Output as the front/default layer and the existing review/editor table as the back layer.
- Do not show both layers at once and do not replace the whole module view when switching. The transition is local to the zone content component.
- Use a readonly textarea as a scoped text-selection fallback. Ctrl+A is explicitly handled only on the focused textarea and selects only its contents; never programmatically select the PWA document.
- Use one output payload for preview, Clipboard copy, individual TXT download and ZIP entry generation.
- Extend row code precedence to BARCODE → CODE → GOLDCODE → TILLCODE, retaining legacy MÃ VẠCH only as the final backward-compatibility fallback.
- Accept multiple workbooks in one picker action and append files to the active session. Parse sequentially on mobile to constrain peak memory.
- Fingerprint each source file locally with SHA-256. Identical files are staged as duplicates; same-name/different-content files are separately flagged.
- Stage the entire incoming batch before mutating the active session. A parse error or cancellation leaves the current session untouched.
- Same-zone data from different files requires explicit conflict confirmation. Merge appends rows in source order and preserves duplicates; skip leaves existing zone data unchanged while accepting non-conflicting zones. Never silently replace or deduplicate rows.
- Persist source file metadata and per-row file/sheet/row provenance as additive optional history fields. Keep old history records readable without an IndexedDB schema migration.
- Keep the session's original import timestamp stable so additive imports do not rewrite the `NHAN VIEN` line.

### Protected scope

No changes to the existing Stocktake module, scanner engine, camera lifecycle, snapshot synchronization, authentication, service worker or deployment configuration.

### Acceptance

Run full preflight and test all source precedence, multi-file, duplicate-file, duplicate-zone merge/skip, history restore, output payload parity, scoped textarea selection and Clipboard fallback cases. Perform manual QA on desktop Chrome/Edge, iOS Safari/PWA and Android Chrome/PWA before release.
