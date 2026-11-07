# RetailOS — Engineering Roadmap

Last reviewed: 2026-11-05
Status: active working plan; verify source and status before starting a phase.

## Roadmap governance
- A phase is a bounded delivery unit with scope, protected contracts, acceptance criteria, verification evidence, and rollback path.
- Do not mark a phase complete because code was committed. Mark complete only after all required checks are evidenced.
- Split large phases into vertical slices (one coherent behavior end-to-end).
- A phase may be re-scoped only with an explicit decision recorded in `DECISIONS.md` and updated status.
- `main` is the stable integration line. Feature work occurs on named branches and is not merged/deployed without explicit user approval.

## Scanner foundation — Phase 1.2

### 1.2A — Correctness and lifecycle
**Goal:** guarantee one active decoder per scanner session, reject unsupported/invalid results, and make lifecycle transitions deterministic.

Scope:
- Centralize accepted symbologies: EAN-13, EAN-8, CODE-128.
- Use `@zxing/library` as the sole barcode decoder dependency; keep the camera lifecycle and frame scheduling in the shared scanner runtime.
- Add a pure barcode validation boundary based on decoded format and payload.
- Preserve CODE-128 as a string; do not coerce to numeric.
- Make start idempotent and serialize start/stop/pause/resume transitions.
- Coalesce visibility/pageshow/focus resume signals.
- Stop prior decoder controls before attaching a replacement.
- Prevent callbacks from stale generations or closed sessions.
- Preserve one-shot semantics and existing consumer contracts.
- Add tests for validator and lifecycle races using existing tooling where practical.

Protected behavior:
- Home still uses its existing cached barcode lookup after scan.
- Stocktake still places the scanned value into the entry form; saving remains an explicit user action.
- Duplicate stocktake records remain separate records.
- Manual barcode entry remains available.
- Do not introduce product-catalog existence validation at scanner level.
- No IndexedDB, auth/session, Apps Script, module ID, PWA cache, or deployment contract changes.

Acceptance criteria:
- Repeated focus/pageshow/visibility events cannot create concurrent decoders.
- A close/pause during pending camera acquisition or video startup cannot attach a stale stream or deliver a stale callback.
- Exactly one accepted callback in single mode.
- Continuous mode only emits accepted supported formats according to an explicit cooldown policy.
- EAN-13/EAN-8 payloads are format/length-valid; CODE-128 content is preserved and not restricted to digits.
- Empty/unsupported values are not passed to feature callbacks.
- Home and Stocktake behavior above remains unchanged.
- Targeted tests and production builds pass, or failures are explicitly documented as blockers.

### 1.2B — Camera performance and diagnostics
**Goal:** optimize based on measured device behavior, not assumed camera constraints.

Scope:
- Record camera acquisition duration, video readiness, decoder attach, first valid result, resume latency, actual track settings, and failure category.
- Add low-overhead diagnostics with no personal/product data leakage.
- Compare actual device behavior at 960×540 and 1280×720; test decode intervals around 100/120/150 ms.
- Measure and optimize performance separately from the lifecycle recovery slice. Unexpected ended-track recovery is implemented in Phase 1.2F and remains subject to device QA.

Acceptance criteria:
- Measurements available for representative Android Chrome and iOS Safari devices.
- Resolution/interval chosen from measured scan success and latency, not ideal constraints alone.
- No regression in battery/thermal behavior or camera startup.

### 1.2C — Audio and continuous scan policy
**Goal:** make feedback reliable and define safe repeated-scan behavior.

Scope:
- Audio unlock remains gesture-driven and optional.
- Beep only after a valid accepted result; audio failure never blocks scan delivery.
- Define same-code lockout separately from database deduplication.
- Keep Home and Stocktake in single mode until continuous mode is specifically validated.

Acceptance criteria:
- Audio unsupported/suspended state does not block scanning.
- No beep for rejected, empty, unsupported, or cooldown-blocked results.
- Continuous mode policy is explicit and tested.
- Stocktake duplicate records are still preserved when the user explicitly saves them.

### 1.2D — Regression and release readiness
**Goal:** provide evidence that scanner stabilization did not break app workflows.

Required checks:
- Home scan → cached lookup.
- Stocktake scan → form fill → explicit save.
- Duplicate stocktake entries.
- Manual entry.
- Camera permission denied, dismissed, revoked, and reopened.
- Background/foreground, focus/pageshow, close during pending request, track ended.
- Android Chrome and iOS Safari hardware QA where available.
- `npm run build`, `npm run build:pages`, and all targeted tests.
- Diff audit and status/handoff update.

Release gate:
- User verifies the branch locally.
- Explicit user approval is required before merge to `main` or deployment.


### 1.2E — Scan confirmation feedback
**Goal:** make accepted barcode confirmation perceptible without coupling feedback availability to scanner correctness.

Scope:
- Raise the existing short confirmation tone gain conservatively from 0.16 to 0.24; retain its current frequency and duration.
- Add a shared feedback service that coordinates audio and optional haptic feedback after a barcode passes format validation and mode/cooldown acceptance.
- Use one short 25 ms vibration pulse when the browser exposes the Vibration API.
- Keep audio gesture-unlocked and optional. Haptic/audio failures must never block the barcode callback.
- Allow the shared scanner hook and BarcodeScanner presentation to disable haptic feedback explicitly; default it on.
- Do not add dependencies, settings persistence, new UI controls, or changes to Home/Stocktake business behavior.

Acceptance criteria:
- Exactly one feedback attempt for each accepted result; none for invalid, unsupported, single-mode duplicate, or cooldown-blocked results.
- Audio remains non-blocking and retains the existing gesture unlock behavior.
- Android browsers that support Vibration API receive a short pulse; unsupported platforms continue normally without error.
- iOS Safari is treated as unsupported unless the runtime exposes navigator.vibrate; no promise of vibration on iOS.
- Barcode callback, Home cached lookup, Stocktake form-fill/explicit-save, and duplicate Stocktake record behavior remain unchanged.
- npm run build, npm run build:pages, and git diff --check pass locally; physical device QA is reported separately.

### 1.2E implementation boundary
This slice changes confirmation feedback only. Camera lifecycle, camera acquisition timing, decoder scheduling, resolution, snapshot decoding, and background-resume behavior remain out of scope for 1.2E and are reserved for 1.2F/1.2G.

## Future platform roadmap (not authorized by this scanner phase)
- Continue modularizing app shell, module registry, data contracts, providers and local-first sync only when supported by a separate audit and bounded proposal.
- Do not expand this phase into backend replacement, database migration, auth redesign, or visual redesign.


### 1.2F — Camera lifecycle recovery
**Goal:** recover safely from an unexpected loss of the active video track without leaving a stale decoder attached or creating an automatic retry loop.

Scope:
- Publish a stream-identity lifecycle notification from `cameraSession.ts` when the active stream has no remaining live video tracks.
- In `useScannerEngine.ts`, accept the notification only for the stream currently attached to that scanner; invalidate pending decoder work, stop existing controls, clear the matching video source, and synchronize scanning state.
- Permit one automatic recovery attempt per open scanner session. If the stream is interrupted again, surface a recoverable error and wait for an explicit user retry.
- Reset the automatic-recovery budget on a direct retry; browser focus/pageshow/visibility resumes do not reset it.
- Preserve generation invalidation for pending `getUserMedia` calls and prevent recovery after close, unmount, or while the document is hidden.

Protected behavior:
- Keep camera constraints at 1280×720 and ZXing decode cadence at 110 ms.
- Keep EAN-13, EAN-8 and CODE-128 validation, accepted-result feedback, and single/continuous mode semantics unchanged.
- Preserve Home cached lookup, Stocktake form-fill/explicit-save, duplicate rows, manual entry, and all auth/session, data, PWA and deployment contracts.
- No new dependency, diagnostics UI, polling, camera lease system, or performance tuning.

Acceptance criteria:
- An ended event from an obsolete stream is ignored.
- An ended event from the currently attached stream stops the decoder and detaches only that stream.
- Pending decoder attachment cannot become active after the stream ends or the scanner closes.
- At most one automatic recovery attempt occurs per open scanner session; a further interruption requires user retry.
- Repeated focus/pageshow events cannot create concurrent decoder loops or reset the retry budget.
- Intentional pause/close/unmount does not trigger automatic recovery.
- Local `npm run preflight` passes; Home and Stocktake scanner workflows and physical Android/iOS camera recovery are checked separately.
- Phase remains in progress until Local verification and device QA evidence are recorded.
### 1.2F review hardening — stream ownership race
- Additional acceptance criterion: a stale scanner startup or error path must never release a different stream acquired by a newer scanner instance. Identity-guarded release is used for stream-specific cleanup; no-argument release remains reserved for intentional global pause/close/logout invalidation.


### Phase 1.2F follow-up — serialized stream ownership (2026-11-07)
- Added reference-counted `CameraStreamLease` ownership to the shared camera service. Scanner sessions release their own lease; app-level logout retains a separate global invalidation path.
- Fixed the React bridge's stale-start promise path so a settled attempt that did not reach `scanning` can fall through to a fresh start instead of returning the same completed promise.
- This is a source implementation update only. It is not release-complete until TypeScript/build/preflight, lifecycle regression tests, and real iOS Safari/Android Chrome checks pass.
- Required tests: concurrent lease acquisition/release, pending acquisition invalidated by logout, stale session close while another session acquires, suspend/resume, rapid open-close-open, track-ended event, Home and Stocktake workflows.



## Scanner experience and performance follow-through (2026-11-07)

> Status: planned. This section records the agreed next phases; it does not claim implementation or device verification.

### Source-aligned corrections
- Current `UniversalScannerSession` source uses a 110 ms minimum decode interval. Older Phase 1.2F notes below that say 70 ms are historical and must not be used as the current runtime specification.
- P0 camera lease serialization is merged to `main` in commit `0ece0c95523a3846f1f2e06ac9d732c3e5a2f2d8`. CI passed for PR #24. Physical-device QA remains outstanding; deployment state must be checked independently.

### 1.2G — Rendering, motion and interaction performance
**Status:** In progress. G-A instrumentation has been added on `feat/scanner-phase-1-2g-instrumentation`; GitHub CI run #63 passed scanner validation, TypeScript/production build, GitHub Pages build and whitespace checks on latest source; browser profiling and physical-device measurements remain pending. G-B/C audit findings are recorded below; no motion durations or decoder cadence have been tuned.

**Goal:** remove perceived stutter, flicker and jank during rapid scanner open/close and Home/Stocktake transitions by identifying the actual bottleneck across rendering, motion, UI state and lifecycle.

Slices:
- **1.2G-A — Performance instrumentation:** measure camera request/acquisition, video readiness, decoder readiness, first accepted result, release/resume, decode latency, Canvas/ImageData work, React commits, long tasks and frame drops. Do not log barcode payloads or unnecessary device identifiers.
- **1.2G-B — Motion/rendering audit:** inspect scanner open/close, overlays/modals, Home/Stocktake transitions, layout shifts, expensive blur/shadow/backdrop effects and animation overlap.
- **1.2G-C — Lifecycle/interaction audit:** exercise rapid open-close-open, scan-close-reopen, module switching, background/foreground, repeated taps and pending startup cancellation; identify stale tasks that outlive UI state.
- **1.2G-D — State transition alignment:** define and enforce explicit UI states (IDLE, OPENING, READY, SCANNING, CLOSING, ERROR/SUSPENDED). UI must not claim SCANNING until the preview and decoder are actually ready. Keep camera release independent from animation completion.
- **1.2G-E — Motion and rendering optimization:** only after measurement, prevent overlapping transitions, reduce unnecessary rerenders/layout work, selectively simplify expensive effects, synchronize visual transitions with real state, and respect `prefers-reduced-motion`.
- **1.2G-F — Interaction stress validation:** repeated cycles and rapid input; inspect listener/timer/RAF/decoder cleanup and verify no old animation or session updates after close.

#### G-A/G-B source audit snapshot (2026-11-07)
- Added privacy-safe timing for `getUserMedia`, optional autofocus, camera lease acquisition, `video.play()`, decoder initialization, camera-to-scanning readiness, first accepted result, decoder disposal, camera lease release and total teardown.
- Added rolling decoder processing metrics for full-frame/ROI canvas draw, `getImageData`, RGBA-to-luminance conversion and ZXing decode attempts; failed ZXing attempts are included in the timing sample.
- Added per-session long-task counts, cumulative layout-shift score where supported, maximum observed video-frame callback gap, decode average/max, and lightweight React phase-commit interval logging.
- No barcode payload, camera device ID, employee identity or persistent device identifier is recorded. Instrumentation is runtime console telemetry only; it adds no dependency, network request, polling timer or persistent storage.
- Source audit: `motion.css` defines sheet enter at 420 ms, sheet/backdrop exit/entry at 200 ms, and several library-card transitions in the 280–360 ms range. Home also uses layered glass/backdrop blur and shadows; these are profiling candidates, not proven causes.
- Lifecycle audit: scanner UI currently derives display from `isStarting`/`isScanning` booleans while the core exposes richer lifecycle states. The hook also had asynchronous state updates after unmount/close; instrumentation patch now guards state callbacks and post-await updates with a mounted check. This is a targeted stale-update guard, not a full state-machine redesign.
- Important measurement limitation: browser `layout-shift` and `longtask` observers are feature-detected and may not be exposed on every Safari version. Frame-gap telemetry is an observed callback gap, not a direct GPU frame-drop counter.
- Verification status: source edits only at this point. No local npm build, CI, browser performance trace or iOS/Android device measurement has been run.

Acceptance criteria:
- No visible flicker, unintended layout shift or overlapping transition during rapid open/close and Home/Stocktake switching.
- No stale UI update or animation after close/unmount.
- No orphan camera stream, decoder loop, listener, timer or animation frame after repeated cycles.
- UI state reflects actual camera/decoder readiness.
- Performance baseline and before/after evidence are recorded separately for iOS Safari and Android Chrome.
- No change to Home cached lookup, Stocktake form-fill/explicit-save, barcode validation, auth/session, Apps Script, IndexedDB or PWA deployment contracts.

### 1.2H — Decoder performance optimization
**Goal:** reduce CPU/memory pressure only after Phase 1.2G and device measurements identify decoder/image processing as a material bottleneck.

Scope: profile RGBA-to-grayscale conversion, Canvas/ImageData allocation and copies; optimize full-frame/ROI strategy and cadence based on measured scan success, latency, CPU/thermal impact. Do not tune resolution or cadence by guesswork.

Acceptance: measurable improvement without material regression in scan success, first-result latency, preview smoothness, battery/thermal behavior or supported symbologies.

### 1.2I — Decoder capability enhancement
**Goal:** improve difficult-angle barcode acquisition without slowing the normal path unnecessarily.

Scope: evaluate rotation detection, perspective/deskew and conditional recovery decode tiers. Test physical labels at 0°, 15°, 30°, 45°, 60° and 90°, with varied distance, lighting and glare. Avoid promising all-angle recognition.

Acceptance: publish a device/condition test matrix and measured success/latency; advanced processing must be conditional and bounded.

### 1.2J — Cross-platform release validation
**Goal:** establish release evidence on real iOS and Android devices.

Required: iOS Safari and Android Chrome; camera permission/revocation, open/close/reopen, rapid module switching, background/foreground, track-ended recovery, motion smoothness, audio/haptic fallback, angled barcode matrix, Home lookup, Stocktake form-fill/explicit-save and regression checks.

Release gate: required builds/tests pass, device evidence is recorded, diff is audited, and explicit user approval is obtained before merge/deploy.

### Dependency and execution order
1. Complete P0 post-merge device QA and confirm deployment status independently.
2. Complete 1.2B diagnostics/performance baseline (extend existing diagnostics; avoid duplicate instrumentation).
3. Execute 1.2G audit and state/lifecycle analysis before changing visual effects.
4. Apply narrowly scoped 1.2G fixes and stress-test.
5. Execute 1.2H only if profiling shows decoder cost is significant.
6. Execute 1.2I capability work after normal-path performance is stable.
7. Complete 1.2C/1.2E feedback checks and 1.2D regression within final 1.2J cross-platform validation.

Do not combine unrelated motion, lifecycle and decoder changes in one patch. Each slice needs its own evidence and rollback boundary.
