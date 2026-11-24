# Scanner stabilization workstream — SC-01 through SC-05

**Status:** SC-01A/01B/01C, SC-02, SC-03 and SC-04 software/CI scope completed at their documented boundaries. SC-04 is merged to main at `0b6840c9b2872d93920d4eba5f628158e09679b4`. SC-05 software integration contract and QA acceptance protocol are merged via PR #149; physical-device/corpus evidence remains outstanding.
**Baseline:** main at `661241e721a5510cf3f61c8ba7c3971c82b6a63c` (SC-05 QA follow-up merge, 2026-11-23).  
**Working branch:** `test/sc05-focus-diagnostics-assertions` (test-only follow-up PR #150)  
**Execution mode:** staged, evidence-first, reversible. This roadmap does not authorize a production deployment.

## Objective

Stabilize the existing scanner engine in bounded stages. Keep CameraSession lease ownership, UniversalScannerSession contract, strict module-owned source ROI, barcode payload validation, Home and Stocktake workflows unchanged unless a later phase explicitly reviews and approves a contract change.

## Locked sequence

| Stage | Name | Scope / exit gate |
|---|---|---|
| **SC-01A** | Worker Foundation investigation | Historical isolated Worker/WASM investigation. Prototype code was removed during cleanup; built-worker transport/runtime empirical proof was never accepted. |
| **SC-01B** | Worker protocol prototype (historical) | Worker protocol source work was not connected to production and was removed during cleanup; no Worker runtime acceptance is claimed. |
| **SC-01C** | Worker frame scheduling prototype (historical) | Prototype source and source-contract test were removed; transport/performance parity was not proven and no production integration occurred. |
| **SC-02** | Camera Health Controller | Frame heartbeat, health states, watchdog, recovery cooldown, bounded retry budget, escalation. Exit: stale/paused/ended stream cases reliably detected and recover without loops. |
| **SC-03** | Geometry Diagnostics | Geometry signature, stale detection, invalidation, source/preview reconciliation. Exit: geometry drift/invalid mapping cannot decode with stale ROI; diagnostics are privacy-safe. |
| **SC-04** | Focus Recovery Policy | Passive quality-state policy using existing ROI samples; sustained-blur gate, native-autofocus wait, recovery recognition and bounded cooldown. Exit: state transitions/guards pass CI; optical behavior remains device QA. |
| **SC-05** | Integration & QA | Cross-layer integration contract + existing regression audit, benchmark protocol and physical-device acceptance matrix. Software exit: contract tests, full preflight/build/Pages/PR-base CI, docs sync. Optical/device exit remains separate and requires actual recorded runs. |

The phases are ordered for evidence and safe review, not as a Worker production migration. SC-02 health operates within the current shared session; SC-03 geometry versions guard the feature-owned ROI; SC-04 observes existing ROI quality; SC-05 validates their integration. SC-01A/01B/01C Worker prototype work was retired from active code. Production remains the proven Main Thread path; a future Worker project must start with an explicit new decision and empirical acceptance criteria.

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
Historical design note only: the proposed Worker boundary would have retained camera/session/ROI ownership on Main Thread. This proposal was never promoted and has been removed from active source.

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

SC-01C prototype source has been retired. Worker transport, runtime, resource and accuracy gates were never satisfied; do not infer production readiness from source-contract tests.
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
- Tests cover normal frame recovery from mute, stall threshold, successful recovery, second-stall escalation, track-ended signal, bounded attempts and lifecycle cleanup/source contracts.


## SC-03 — Geometry Diagnostics (implementation)

SC-03 extends the existing pure preview-to-source mapper with an explicit geometry identity and stale-ROI invalidation boundary. It does not rewrite the existing object-fit mapping algorithm or alter reticle/layout styling.

- **Geometry signature:** `createScannerGeometrySignature` fingerprints source frame dimensions, video/reticle bounds, computed `object-fit`, `object-position`, supported transform/mirror state, viewport dimensions, visualViewport offsets/scale and device-pixel ratio. It is a deterministic in-memory signature; no signature is exported or persisted.
- **Revision epoch:** `ScannerGeometryRevisionTracker` assigns monotonic geometry versions. Stable valid signatures do not churn; stable invalid state remains unpublished; explicit invalidation advances the epoch so delayed work from a previous lifecycle cannot be accepted.
- **Invalidation triggers:** source metadata/resize, ResizeObserver for video/reticle/preview parent, window resize/orientation, visualViewport resize/scroll and pixel-density media-query changes. If the current fingerprint differs, the old source ROI is cleared synchronously before the next RAF measurement.
- **Stale-result protection:** the feature binding attaches `geometryVersion` to each source-frame ROI. `UniversalScannerSession` rejects malformed or older versions, preserves the latest version floor across ROI clear, and clears temporal recognition state when the active ROI/version changes.
- **Fail-closed behavior:** missing/zero-size/unsupported CSS geometry or a reticle outside visible image content publishes null. No inferred center crop, full-frame fallback or stale ROI is used. Existing unsupported length/calc `object-position` and non-horizontal transforms remain unsupported intentionally.
- **Privacy:** signature inputs are limited to geometry numbers and CSS geometry values. No camera/device identifiers, barcode payloads, employee identifiers, URLs or personal data are read into the signature or diagnostics.
- **Protected boundaries:** CameraSession acquisition/lease ownership, decoder/backend, frame cadence, ROI mapper semantics, payload validation, Home lookup and Stocktake capture/save flows remain unchanged.

### SC-03 validation and closure boundary

- Existing mapper tests continue to cover cover/contain/fill/none/scale-down, object-position, mirror mapping, Home/Stocktake reticle fixtures and invalid geometry.
- SC-03 adds deterministic signature sensitivity/normalization, revision epoch, stale session revision rejection, observer event/invalidation and listener cleanup tests, all registered in preflight.
- PR #146 head `d4b8fcae54901f53cf45b4ebf7a73fc6436516ab`; RetailOS CI #1332 passed full preflight, TypeScript/production build, PR-base bundle build and bundle comparison.
- User confirms the deployed app flow has no observed errors and operates normally; this is regression baseline acceptance.
- Close SC-03 at software/CI scope. Physical orientation/viewport behavior on actual iOS Safari/PWA and Android Chrome/PWA remains device QA; do not infer it from CI.

## SC-04 — Focus Recovery Policy (implementation)

SC-04 extends the existing `ScannerFocusQualityMonitor` into a passive recovery state policy; it does not add a second controller or touch camera ownership.

- States: `observing` → `waiting-native-autofocus` → `recovered`.
- Inputs reuse the decoder's existing baseline-scale grayscale ROI samples. No extra capture/readback is introduced.
- Only valid same-ROI samples with an available motion reference and motion score within the existing stability limit are considered. Invalid/low-texture or motion samples clear the blur streak and do not trigger recovery.
- Preserve the existing relative sharpness gates (reference threshold, 0.82 recovery band, 0.55 blur ratio, four consecutive samples) and 8-second diagnostic cooldown; thresholds are not presented as device-calibrated.
- Sustained blur recommends waiting for native autofocus and holding steady/adjusting distance. Sharpness returning to the reference band transitions to `recovered`.
- Session logs expose state/action and a **zero post-preview camera-constraint write budget**. No `applyConstraints`, autofocus re-arm, stream restart, retry timer, extra camera request or UI state is added.
- Existing ROI-baseline reset resets recovery state. Decoder, geometry/ROI, 70 ms session cadence, validation, Home/Stocktake workflows and camera lease remain unchanged.

### SC-04 validation and closure boundary

- Tests cover sharp-vs-blurred measurement, invalid texture, motion rejection, sustained blur, native-focus waiting, sharpness recovery, cooldown and reset.
- PR #148 `feat/scanner-sc04-focus-recovery-policy`; latest head `fa4349344eb9fd80d8d487942113ea5560cae6e5`.
- CI #1347 exposed a cooldown-boundary assertion error; corrected test passed CI #1348 full preflight, TypeScript, production/Pages build and PR-base bundle comparison.
- Software state-policy closure must not be confused with optical autofocus acceptance. Physical near/far transitions and focus behavior on iOS Safari/PWA and Android Chrome/PWA in Home and Stocktake remain device QA.
## SC-05 — Integration & QA

### Audit conclusion

Most integration is already implemented in the shared `UniversalScannerSession` and `useScannerEngine`: camera lease, lifecycle/visibility recovery, health controller, strict source-frame ROI, geometry revisions, focus quality, adaptive processing/runtime budget, serialized WASM decode, payload validation and feature-owned result handling. Home and Stocktake both use the same scanner hook and preview-region binding.

SC-05 will not create a new engine or camera orchestration layer. It adds one focused cross-layer source-contract test, registers it in preflight, exposes three existing passive focus-recovery diagnostic fields through the current allowlist/QA monitor, consolidates the physical QA protocol, and corrects stale current-state documentation.

### Software integration gates

- `scripts/test-scanner-sc05-integration.mjs`: guard single camera owner, shared Home/Stocktake path, ROI publishing/close gating, bounded health recovery, SC-03 revision rejection, SC-04 passive focus, adaptive runtime wiring, WASM-only production factory and benchmark privacy.
- Existing scanner tests remain specialized; SC-05 does not duplicate their fixtures or change their algorithms.
- CI must run full preflight, TypeScript, production build, Pages build and PR-base/bundle comparison on the final PR head.
- Review changed paths and bundle/dependency delta; reject unrelated source changes.

### Physical acceptance gate

Use [SCANNER_SC05_INTEGRATION_QA.md](./SCANNER_SC05_INTEGRATION_QA.md) for the device matrix, scenario protocol, local barcode corpus and run-record template. Physical iOS/Android camera/focus/viewport behavior cannot be completed by the remote CI environment and is explicitly not claimed.

### Current status

- Software scope: COMPLETE and merged via PR #149 at `e0579fa1734eac989af051c4776cc88de912c946`; CI #1375, post-merge CI #1376 and Pages deployment #151 passed.
- Test-only follow-up PR #150 merged at `661241e721a5510cf3f61c8ba7c3971c82b6a63c`; final-head CI #1384, post-merge CI #1385 and Pages deployment #152 passed.
- Physical-device/corpus matrix: NOT RUN; real devices and a labelled corpus required. This remains a separate operational acceptance/release blocker.
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

SC-00 was source audit only. No baseline benchmark has been executed in this workstream, no live-camera test, and no physical-device QA. All target states, thresholds and technology choices above remain proposals until SC-01A evidence/review.


## SC-02 closure record — 2026-11-23

- **Status:** software implementation and CI validation complete; PR #144 is the delivery unit. Head at closure review: `416b168b1b00b858c2b7e34e751e33defb9afb50`.
- **CI evidence:** RetailOS CI #1313 passed the complete preflight, TypeScript/production build, GitHub Pages build and bundle comparison.
- **Scope delivered:** independent camera-health telemetry states; frame-progress watchdog (1s interval / 3s threshold); native `requestVideoFrameCallback` with RAF `currentTime)-advance fallback; mute/unmute and ended-track signals; one bounded auto-recovery per mounted activation via the existing serialized session replacement; terminal error on failed/exhausted recovery; cleanup on teardown.
- **Regression boundaries:** decoder backend, decoder allowlist, frame scheduling cadence, ROI, payload validation, barcode recognition order, camera lease owner and Home/Stocktake feature flows remain unchanged by intent. Production remains Main Thread ZXing-C++ WASM; Worker prototype code has been retired from active source.
- **Acceptance boundary:** close SC-02 at software/CI scope only. CI does not prove physical camera fault injection or recovery. Before device acceptance, verify frame freeze/stall, mute/unmute, track-ended, successful reacquisition, failed reacquisition/cleanup, close-during-recovery, background/foreground and regular Home/Stocktake scan flows on representative iOS Safari and Android Chrome devices.
- **Follow-on:** SC-03 Geometry Diagnostics is the next planned engineering phase. Carry outstanding live-camera/device QA into the scanner operational acceptance checklist; do not reopen SC-02 software scope unless a reproducible defect is found.
