# Scanner stabilization workstream — SC-01 through SC-05

**Status:** SC-01A/01B/01C isolated Worker prototype phases completed and merged. SC-01B deploy/device update was user-verified without errors. SC-01C source-contract validation and post-merge CI + Pages deployment passed. SC-02 camera-health implementation and software/CI scope are merged and closed; live-camera recovery/device acceptance remains pending. Empirical Worker transport/runtime/optical benchmarks and production integration remain gated.
**Baseline:** main at `d0d65f56aca8081953be644ef002d91d9f84e4e4` (source audit baseline, 2026-11-17).  
**Working branch:** `docs/scanner-sc01-05-roadmap`  
**Execution mode:** staged, evidence-first, reversible. This roadmap does not authorize a production deployment.

## Objective

Stabilize the existing scanner engine in bounded stages. Keep CameraSession lease ownership, UniversalScannerSession contract, strict module-owned source ROI, barcode payload validation, Home and Stocktake workflows unchanged unless a later phase explicitly reviews and approves a contract change.

## Locked sequence

| Stage | Name | Scope / exit gate |
|---|---|---|
| **SC-01A** | Worker Foundation prototype | Isolated Worker/WASM proof boundary and protocol foundation. Source-contract CI is present; built-worker transport/runtime empirical proof remains unverified. |
| **SC-01B** | Runtime & Protocol Hardening | Typed/versioned messages, bounded init/decode, generation validation, capped recovery/disposal. CI merged; user reports deploy/device verification PASS. |
| **SC-01C** | Frame Scheduling | One in-flight + one replaceable latest pending frame; queue/backpressure metrics, drop accounting and bounded timeout. Exit: source contracts + CI passed and merged; device/transport performance remains required before production integration. |
| **SC-02** | Camera Health Controller | Frame heartbeat, health states, watchdog, recovery cooldown, bounded retry budget, escalation. **Software exit:** controller/source contracts and CI/build pass. **Device exit:** freeze/paused/ended-stream recovery and failure cleanup verified on representative devices without loops. |
| **SC-03** | Geometry Diagnostics | Geometry signature, stale detection, invalidation, source/preview reconciliation. Exit: geometry drift/invalid mapping cannot decode with stale ROI; diagnostics are privacy-safe. |
| **SC-04** | Focus Recovery Policy | Quality decision engine, capability-based actions, policy/cooldowns/budget and controlled physical-device tests. Exit: quality decisions validated; no unsupported autofocus assumption or uncontrolled constraint churn. |
| **SC-05** | Integration & QA | Home/Stocktake integration, regressions, benchmark, Android/iOS/Desktop and low-end-device matrix, release gate. Exit: CI, measured accuracy/perf and explicit device acceptance complete. |

Dependencies are sequential: SC-02 builds on the isolated SC-01A/01B/01C Worker scheduling/reporting foundation; SC-03 feeds valid geometry into frame scheduling; SC-04 consumes quality/health evidence and geometry context; SC-05 integrates and validates all stages. Discovery may run in parallel, but production integration must respect this sequence.

## Global protected contracts

- `cameraSession.ts` remains the sole owner of camera stream acquisition and lease ownership; Worker never acquires/releases camera.
- `UniversalScannerSession` remains the session orchestration and consumer-facing contract. Worker is a decoder execution backend behind that boundary.
- Strict module-owned source-frame ROI is preserved; invalid/missing/stale geometry fails closed, never silently expands to full frame or guessed center crop.
- Barcode format allowlist, ZXing options, candidate ordering, validation and accepted-result policy remain unchanged unless separately approved and fixture-covered.
- Home lookup and Stocktake capture/form-fill/explicit-save remain feature-owned and unchanged.
- No decoded payload, camera/device identifier, employee identifier or personal data in exported diagnostics.
- No new dependency, backend, camera migration or broad refactor without a separate decision.
- Do not merge/deploy/promote without explicit approval. Automated CI is not optical or physical-device acceptance.

## SC-01 — Worker Foundation

### Target boundary
Main Thread retains video/camera, session, ROI publication, scheduling, UI and result gate. Worker receives only owned frame data plus immutable decode-job context, performs pixel/image preparation and ZXing WASM decode, and returns decode output/diagnostics. Worker must not validate retail payloads, perform lookup, invoke UI, or own camera/session state.

### Protocol and identity
Versioned message envelope: protocol version, worker generation, session ID + session generation, job ID, message type. INIT/READY handshake; DECODE/RESULT; CANCEL; DISPOSE/DISPOSED; bounded ERROR. Ignore stale generation/session/job responses. Freeze per-job ROI/settings snapshot.

### Queue and cancellation
Single in-flight decode and at most one latest pending frame. Replacing pending frame closes/disposes it. No FIFO backlog. Soft cancellation invalidates identity and discards result; synchronous WASM may not be interruptible by a CANCEL message while executing. Hard cancellation uses Worker termination only under bounded restart policy, not on every close/unmount.

### Frame transport proposal (not yet accepted)
- VideoFrame transfer: preferred candidate if capability, correctness and performance are proven on supported browsers.
- ImageBitmap transfer: compatibility candidate; benchmark capture/conversion overhead and explicit close/disposal.
- ImageData: fallback/diagnostic path, with copy and memory-bandwidth cost.
- OffscreenCanvas: Worker-side processing surface, optional capability—not a frame transport by itself and not a hard prerequisite.
- Existing Main Thread decoder: last-resort fallback with bounded cadence/processing budget and same correctness contract.

### SC-01A/01B/01C current evidence

SC-01A/01B/01C remain isolated prototypes; no Worker decoder is wired into the production adapter/session. SC-01A transport feasibility notes remain in [SCANNER_SC01A_SPIKE_FINDINGS.md](./SCANNER_SC01A_SPIKE_FINDINGS.md). VideoFrame is still only a candidate transport (ImageBitmap compatibility candidate, OffscreenCanvas optional); no measured transport performance is claimed. SC-01B was merged/deployed and user-confirmed on-device without errors. SC-01C adds scheduling accounting around the existing one-in-flight/latest-pending policy; source-contract tests and post-merge CI/Pages build passed. Actual transfer/optical benchmark and device evidence remain required before integration.

SC-01C scheduling policy is intentionally simple: accept incoming decode requests, dispatch immediately when idle, retain only the newest waiting frame while one decode is active, resolve replaced waiting requests as misses, and dispatch the retained newest frame after the active decode completes. It does not add a timer-driven FIFO, parallel decode or synchronous WASM cancellation. Diagnostics are bounded counters/aggregates in memory and contain no payload/device data.

SC-01C is closed at the isolated prototype/software-validation boundary. Do not promote the Worker prototype to production until transport, runtime, resource and accuracy gates are independently verified.
### SC-01 release gates
No lost frames/resource leaks or stale results; bounded queue; graceful worker failure; fallback maintains exact formats, ROI, processing/candidate order and validation. Benchmark: Main Thread blocking/long tasks, decode P50/P95, exact-match/miss/wrong/false-positive rates, worker startup, transfer cost, memory observations, first-result latency and UI responsiveness. Establish baseline before changes; do not invent target metrics.

## SC-02 — Camera Health Controller

Observe frame progress rather than merely stream/track existence. Define state model (proposed): HEALTHY, DEGRADED, STALLED, RECOVERING, FAILED. Heartbeat must distinguish frame callback progress, video timeline/dimensions and track ready/muted/ended signals. Use thresholds derived from measured device behavior, not arbitrary universal constants. Add recovery cooldown, bounded attempts, reset criteria and escalation (rebind/reacquire only through existing session/lease path). Prevent overlapping recovery, retry storms, and camera ownership violations. Test background/foreground, freeze, mute, track-ended, delayed frame, recovery success/failure, cooldown and exhaustion.

## SC-02 — Camera Health Controller (implementation)

SC-02 is isolated in the platform session and does not alter decoder policy or retail flow.
- States: HEALTHY, DEGRADED, STALLED, RECOVERING, FAILED (telemetry vocabulary; UI scanner lifecycle remains its own state machine).
- Heartbeat: `requestVideoFrameCallback` counts decoded-frame progress. RAF fallback counts progress only when `video.currentTime` advances, avoiding a false healthy heartbeat while the video is frozen.
- Signal: `mute` => DEGRADED; `unmute` returns toward HEALTHY only if recent frame progress exists; `track-ended` requests immediate bounded recovery.
- Watchdog interval 1,000 ms; stall threshold 3,000 ms. These are initial policy constants, not device-optimized measurements.
- Recovery is routed through the existing hook session-replacement path (retire old session, replace video surface, reacquire camera, await a fresh frame and decoder). Per-controller attempt budget is one, cooldown is 10,000 ms, and the hook caps automatic health recovery to one across session replacement for this mounted scanner activation. Failure escalates to scanner ERROR and requires user close/reopen; no retry loop.
- Watchdog/track listeners are removed during teardown. Health snapshots contain state/reason/frame age/attempt count only; no barcode payload, device ID or employee data.
- Tests cover deterministic controller transitions (recent-frame mute/unmute, stall threshold, recovery success/failure, second-stall cooldown/budget escalation and track-ended) plus source-contract assertions for session/hook wiring. These are **not** end-to-end camera/session race tests.


## SC-03 — Geometry Diagnostics

Create a compact geometry signature for source dimensions, preview bounds, object-fit/object-position, mirror/orientation, viewport/safe-area and ROI mapping inputs. Detect stale signature and invalidation when source/preview/viewport/orientation changes. Reconcile preview-space reticle to source-frame ROI and fail closed on inconsistency. Do not modify presentation layout in this phase. Test resize, orientation, visualViewport/safe-area changes, source dimension changes, mirror/object-position variants and stale ROI; export only non-sensitive geometry metadata.

## SC-04 — Focus Recovery Policy

Separate passive quality measurement from policy decisions. Quality engine provides bounded signals (focus/sharpness, motion, luminance/contrast, stability and sample validity); policy decides whether to wait, sample again, reduce processing load, or attempt a capability-supported camera action. Autofocus is generally browser/device-owned and may not be controllable; actions must be capability-gated, conservative, cooldown-limited and budgeted. Do not infer blur cause or force unsupported constraints. Controlled testing across supported devices/browser combinations is required before enabling active camera actions.

## SC-05 — Integration & QA

Integrate through existing session/backend boundary, then verify Home and Stocktake separately. Include lifecycle, ROI/geometry, validation, single/continuous behavior, feedback, capture/save, fallback and update handoff regression. Benchmark baseline vs worker and each accepted controller. Matrix: Android Chrome/PWA, iOS Safari/Home Screen PWA, desktop Chrome, low-end Android. Release gate includes CI, benchmark/corpus evidence, resource/memory checks and explicit physical-device acceptance. CI/build green does not prove optical or device acceptance.

## Reversible execution and rollback

Each phase should be isolated in a small branch/commit and independently reviewable. Keep a working fallback/backend switch only if it is simple, explicit and testable; avoid dual runtime complexity. If accuracy, resource ownership, memory, or consumer behavior regresses, disable the new execution path and restore the prior decoder execution route. Do not progress to the next phase until exit gates and findings are documented.

## Decisions still open (must be resolved by evidence)

1. VideoFrame vs ImageBitmap preferred transport on actual supported browsers.
2. Worker-side canvas strategy and whether OffscreenCanvas is needed at all.
3. Worker module/bundling and WASM asset-loading pattern for this Vite build.
4. Abort/restart thresholds, timeouts, retry and termination budget.
5. Benchmark cadence/budget based on measured low/mid/high devices.
6. Whether Main Thread fallback remains shipped and its bounded behavior.

## Current evidence limits

SC-00 was source audit only. SC-02's 1s watchdog/3s stall threshold and one automatic recovery are implemented and CI-validated, but they are not device-tuned. No Worker transport benchmark or SC-02 live-camera fault-injection/physical-device QA has been completed. The device acceptance items below remain open; software completion must not be presented as optical or device acceptance.


## SC-02 closure record — 2026-11-23 (evidence reconciled)

- **Status:** software implementation and CI validation complete; PR #144 merged. Final PR head `d7fff2755275b54d52505eb6ec39e04624793817`; merge commit `7e134f01b8df41d0a6c2d805d78fb1501b9d3631`.
- **PR/main CI:** PR CI #1319 (`45126497812`) and post-merge main CI #1320 (`45126692556`) passed preflight, TypeScript, production/Pages build and bundle comparison.
- **Deployment:** Pages deployment #147 (`45126692360`) succeeded on merge commit `7e134f01b8df41d0a6c2d805d78fb1501b9d3631`. Follow-up PR #145 head `c203fb36ae1734188e958bc7c3506fb0f95ead08` merged as `53824257486e628635a693a22c893e8d9648d313`; CI #1324 and main CI #1325 passed; Pages deployment #148 (`45139174575`) succeeded on that main commit.
- **Scope delivered:** independent camera-health telemetry states; frame-progress watchdog (1s interval / 3s threshold); native `requestVideoFrameCallback` with RAF `currentTime`-advance fallback; mute/unmute and ended-track signals; one bounded auto-recovery per mounted activation via the existing serialized session replacement; terminal error on failed/exhausted recovery; teardown cleanup.
- **Harness import audit:** all 41 `scripts/test-*.mjs` on main were fetched and scanned. The two session-execution harnesses (`test-scanner-decoder-factory.mjs`, `test-scanner-preview-region.mjs`) stub `./scannerCameraHealthController`; `test-scanner-camera-health.mjs` imports the controller directly. Remaining harness matches read source for assertions, not executable session import graphs. No missing SC-02 import stub was found.
- **Test boundary:** deterministic controller tests and source-contract assertions pass in CI; full session/camera integration, close/background race injection and physical camera behavior are not covered end-to-end.
- **Regression boundaries:** decoder backend, allowlist, frame cadence, ROI, payload validation, recognition order, camera lease owner and Home/Stocktake flow remain unchanged by intent. Production remains Main Thread ZXing-C++ WASM; Worker prototype remains isolated.
- **Outstanding device QA:** freeze/stall, mute/unmute with frame progression, track-ended, successful reacquisition, failed reacquisition and resource cleanup, close-during-recovery, background/foreground and normal Home/Stocktake scan flows on representative iOS Safari/PWA, Android Chrome/PWA and low-end Android. No physical-device QA is claimed.
- **Governance note:** main branch currently has protection disabled and no required checks enforced. CI evidence is green, but merge gates are not enforced by branch protection.
- **Follow-on:** SC-03 Geometry Diagnostics is active in PR #146; its latest CI #1332 passed at head `d4b8fcae54901f53cf45b4ebf7a73fc6436516ab`. Keep SC-03 changes separate; do not reopen SC-02 software scope without a reproducible defect.
