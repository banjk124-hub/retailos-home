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
