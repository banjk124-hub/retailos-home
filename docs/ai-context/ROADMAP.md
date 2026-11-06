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
- Configure ZXing using the declared direct dependencies `@zxing/browser` and `@zxing/library`; do not rely on undeclared transitive imports.
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
- Keep camera constraints at 1280×720 and ZXing decode cadence at 70 ms.
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


## Universal Scanner Engine — Phase 2 (approved direction, 2026-11-06)

**Goal:** replace the current scanner architecture through a parallel, measured implementation. Keep feature presentations independent from camera, lifecycle, decoder, and feedback services.

### Phase 2.0 — Contracts and capability baseline (current)
- Add platform-neutral scanner result, geometry, profile, capability, lifecycle, error, and session contracts.
- Detect secure context, camera API, native BarcodeDetector supported symbologies, frame callback, Worker, WASM, and vibration without requesting permission.
- Establish benchmark plan for Native BarcodeDetector, existing ZXing, and a ZBar/WASM candidate after package/license/maintenance verification.
- No change to current production scanner, Home, Stocktake, dependencies, main, or deployment.

### Phase 2.1 — Decoder benchmark
- Use the same labelled fixture set for EAN-8, EAN-13, and CODE-128, including negative/poor-quality cases.
- Measure decoder init, first decode, P50/P95 decode latency, successful decode rate, false positives, geometry quality, bundle size, and resource use.
- Physical test matrix: iPhone Safari + installed PWA; Android Chrome + installed PWA.
- Native BarcodeDetector is an optional path only when the exact required formats are supported.
- Verify ZBar/WASM package provenance, maintenance, license, API, geometry, browser support, and bundle impact before adding it.
- Do not select a default decoder based on desktop-only results.

### Phase 2.2 — Camera ownership and lifecycle core
- One engine-owned camera lease; no feature module calls getUserMedia.
- Serialized, idempotent state machine; generation-safe startup/cleanup; stale stream cannot release a newer owner.
- Controlled suspend/resume/recovery for visibility, pageshow, focus, lock/unlock and track-ended events.
- Bounded recovery; no background polling or infinite retry.

### Phase 2.3 — Frame pipeline and feedback
- Frame scheduler with requestVideoFrameCallback and fallback.
- Bounded queue/drop stale frames; worker/WASM only where benchmark proves beneficial.
- Source-frame geometry contract and correct preview transform for crop/object-fit/orientation/mirroring.
- Gesture-unlocked Web Audio beep and best-effort platform haptics; neither blocks result delivery.

### Phase 2.4 — Feature adapters and migration
- Home chooses HIGH profile and retains cached lookup.
- Stocktake chooses COMPACT profile and retains form-fill/explicit-save and duplicate-row semantics.
- Other modules can consume only the value or build custom overlays/presentation.
- Migrate only after device QA and regression tests. Keep legacy scanner available until acceptance.

**Release gate:** branch-local build/tests, fixture benchmark evidence, iOS and Android physical-device QA, Home/Stocktake regression, diff review, and explicit user approval. No merge/deploy without approval.


### Phase 2.1A — Decoder adapter boundary (implemented on branch)
- Added a decoder-only `ScannerDecoderAdapter` contract. It cannot own camera acquisition, frame scheduling, UI, or business actions.
- Added an optional Native BarcodeDetector adapter. It requests only explicitly supported symbologies, maps browser format IDs to RetailOS enums, preserves payload strings, and returns source-frame geometry when available.
- Native backend remains opt-in and is not connected to production camera flow.
- Added a repeatable fixture protocol for EAN-8, EAN-13, CODE-128, negative and multi-code cases.
- Next: add a ZXing adapter against the existing installed packages and a benchmark runner that can execute identical still-image fixtures against both adapters. Then run on physical devices.
