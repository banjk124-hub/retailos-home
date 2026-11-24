# SC-05 — Scanner Integration & Quality Acceptance

**Phase:** SC-05 Integration & QA  
**Status:** Software integration scope merged (PR #149); physical-device acceptance NOT RUN  
**Base:** SC-04 merged to `main` at `0b6840c9b2872d93920d4eba5f628158e09679b4`  
**Principle:** Validate the existing architecture before proposing new scanner algorithms.

## 1. Scope

SC-05 verifies that the current scanner subsystems compose correctly across Home and Stocktake, that automated regression/build gates remain green, and that physical QA can be performed with reproducible criteria.

In scope:
- Cross-layer integration contract: shared hook/session, feature-owned ROI, camera ownership, bounded recovery, focus diagnostics, adaptive budget and decoder boundary.
- Regression gate for current scanner test modules and both retail workflows.
- Local, privacy-safe image corpus protocol and measurement definitions.
- Run-ready iOS, Android, desktop and low-capability device acceptance checklist.
- Release gate, issue recording and handoff.

Not in scope:
- Worker decoder production integration; its transport/performance proof remains separate.
- New image-enhancement algorithms, symbologies, camera controls or dependencies.
- Arbitrary threshold tuning without baseline/corpus evidence.
- Redesign of Home lookup or Stocktake business flow.
- Claiming physical QA from mocked CI.

## 2. Integration invariants

| Boundary | Acceptance contract |
|---|---|
| Camera ownership | Only shared camera service requests/releases streams. Features and decoder never independently acquire camera. |
| Session | Home and Stocktake use the same `useScannerEngine` → `UniversalScannerSession` path. |
| ROI | Each feature publishes its own current source-frame-normalized reticle. Invalid/stale geometry fails closed. No full-frame/guessed fallback. |
| Camera health | Frame progress, track mute/end and watchdog flow through bounded session recovery; at most one automatic health recovery per session. |
| Focus | Quality is sampled from existing decoder ROI pixels. Blur guidance is advisory, native autofocus remains device-owned, and post-preview camera constraint writes remain zero. |
| Runtime adaptation | Runtime pressure adjusts only optional image/geometry candidate budgets; baseline recognition and validation remain protected. |
| Decoder | Production remains one lazy ZXing-C++ WASM adapter on Main Thread. Worker prototype was removed during cleanup and is not an available fallback. |
| Recognition/result | Serialized decode, format allowlist, payload validation, temporal/cooldown policy and accepted-result boundary remain authoritative. |
| Home | Product lookup is triggered by the scanner result in the existing Home feature path. Single/continuous semantics remain unchanged. |
| Stocktake | Scan result populates the existing workflow; exit gate, capture/form-fill and explicit save remain feature-owned. |
| Diagnostics | No barcode payload, camera identifier, employee identifier or persistent personal data in exported diagnostics/benchmark reports. |

## 3. Automated validation

The cross-layer integration contract is registered in `scripts/preflight.mjs` as `test-scanner-sc05-integration.mjs`.

Required gate:
1. `npm run preflight`
2. `npm run build`
3. `npm run build:pages`
4. PR-base build and bundle comparison (CI)
5. Review changed-file list; no unintended app workflow/dependency/runtime changes.

The integration contract is intentionally source-boundary focused. Existing dedicated suites remain the authority for detailed subsystem fixtures:

- Decoder/WASM fixture integration and supported payload validation
- ROI/geometry mapping and observer lifecycle
- Camera lifecycle, health, bounded recovery and camera request compatibility
- Focus quality, recovery state, motion/texture rejection and cooldown
- Enhancement pipeline, scale, image-quality profile and adaptive runtime
- Temporal recognition, torch, symbology/settings, runtime privacy
- Home/Stocktake scanner presentation and exit behavior

The former in-app Scanner QA monitor was retired during cleanup. SC-04 focus recovery remains runtime policy; do not reintroduce a production event collector solely to display it.

A test that uses mocks or generated images does not prove optical performance on a physical camera.

## 4. Device matrix — run and record actual devices

Do not substitute a guessed model, OS/browser version or result. At least one physical device in each target class is needed; record exact model and build before testing.

| Target | Device / OS / browser (record during run) | Status |
|---|---|---|
| iOS | iPhone; iOS; Safari browser + Home Screen PWA | NOT RUN |
| Android low-capability | Android phone; OS; Chrome; device profile | NOT RUN |
| Android mid-capability | Android phone; OS; Chrome; device profile | NOT RUN |
| Desktop baseline | Desktop/laptop; OS; Chrome/Edge | NOT RUN |

Test Home and Stocktake independently on each device where applicable. Desktop acceptance is manual-search/compatibility baseline if camera use is intentionally unsupported there; do not force camera capability.

## 5. Device test scenarios

Record each row as PASS, FAIL, BLOCKED or NOT RUN. Attach sanitized QA notes only; no decoded product list or personal information.

| ID | Scenario | Pass criteria | Status |
|---|---|---|---|
| QA-01 | Open scanner, permission grant | Preview becomes ready; first fresh frame arrives; scanning begins once | NOT RUN |
| QA-02 | Permission denied / unavailable camera | Clear actionable error; no leaked stream/lease; safe retry/close | NOT RUN |
| QA-03 | Baseline barcode scan | Exact expected value + symbology; single result; existing caller completes once | NOT RUN |
| QA-04 | Negative/no barcode scene | No accepted false result; scanner remains usable | NOT RUN |
| QA-05 | Reticle/ROI edge and resize | Decode stays within visible feature ROI; geometry changes invalidate stale ROI; no guessed/full-frame fallback | NOT RUN |
| QA-06 | Orientation / browser viewport transition | ROI is recalculated; stale geometry is rejected; preview and reticle remain aligned | NOT RUN |
| QA-07 | Near-to-far / far-to-near focus transition | Native focus is allowed to settle; recovery state behaves correctly; no camera-control write/restart | NOT RUN |
| QA-08 | Motion / shake blur | Moving frames do not trigger sustained-defocus recovery; scanner resumes once stable | NOT RUN |
| QA-09 | Background → foreground | Camera lifecycle resumes safely with fresh frames; no duplicate session or runaway retries | NOT RUN |
| QA-10 | Camera track muted / stalled / ended | Health state reflects failure; recovery is bounded; terminal failure is actionable | NOT RUN |
| QA-11 | Torch supported / unsupported | Supported devices toggle correctly; unsupported devices remain safe; no stream disruption | NOT RUN |
| QA-12 | Close during start/decode/recovery | Camera lease released, listeners/timers/decoder cleaned; late callbacks ignored | NOT RUN |
| QA-13 | Duplicate barcode / cooldown | No repeated business action inside existing cooldown; continuous mode still behaves as intended | NOT RUN |
| QA-14 | Home end-to-end | Correct scan → lookup, no incorrect product result, UI remains responsive, close completes | NOT RUN |
| QA-15 | Stocktake end-to-end | Correct scan → correct field population, user retains explicit-save semantics, close/exit gate correct | NOT RUN |
| QA-16 | Both modules / overlapping presentation | Shared camera ownership respected; no duplicate stream or result callback | NOT RUN |

## 6. Local barcode corpus and benchmark protocol

Use the existing development-only `scripts/scanner-benchmark/` harness. Do not add another benchmark application.

Corpus must include:
- Positive physical samples from shelf labels and packaging, covering the symbologies RetailOS actually uses.
- Negative controls: blank scenes, non-barcode text, unrelated patterns and deliberately unreadable/cropped samples.
- Capture conditions: normal/low lighting, glare, blur/motion, focus distance, skew/rotation, curved packaging, ROI-edge placement.
- Device class, capture condition, image dimensions and source-frame ROI metadata.
- Synthetic samples are clearly labelled; they are not substitutes for physical samples.

Keep the corpus and manifest local to the QA machine. Do not commit employee data, camera identifiers, store-confidential material or raw decoded product values. The benchmark report should retain outcomes/metrics, not decoded values.

Repeat each positive and negative case. Use the same images, ROI and format allowlist when comparing any configuration. Record:
- Exact-match rate (value + symbology), misses, wrong decodes and false-positive rate separately.
- Initialization duration, first-trial latency, steady-state p50/p95 decode latency and error count.
- Geometry availability, ROI pixel dimensions, sample/candidate counts and optional stage-hit metrics.
- Memory readings only where the browser exposes them; unavailable memory is marked unavailable, not zero.
- Browser/device/OS, power/thermal context, run count and corpus version.

**Do not set numeric release thresholds by guess.** Establish a baseline first, then approve target thresholds with observed data and business tolerance. No universal accuracy/distance/latency claim until results support it.

## 7. Release acceptance gate

SC-05 software scope may close only when:
- [ ] Cross-layer SC-05 contract test passes.
- [ ] Full preflight and production/Pages builds pass on the final PR head.
- [ ] PR-base/bundle comparison passes; no unexplained bundle or dependency growth.
- [ ] Home and Stocktake integration contracts are unchanged or explicitly reviewed.
- [ ] CI has no unresolved relevant review threads.
- [ ] Benchmark corpus and report format are ready; measured results are recorded if optical acceptance is claimed.
- [ ] Device QA results are completed for the required matrix or explicitly remain a release blocker.
- [ ] Documentation and handoff reflect actual evidence and remaining blockers.

## 8. Run record template

Copy one record per device/workflow run:

- Run ID / date:
- Device model:
- OS / browser / PWA:
- Scanner surface: Home / Stocktake:
- Corpus version / case count:
- Lighting / focus / motion / orientation:
- Exact matches / positive count:
- Misses / wrong decodes:
- False positives / negative count:
- Decode latency p50 / p95:
- Startup latency:
- Errors / recovery events:
- QA scenarios PASS / FAIL / BLOCKED:
- Notes (sanitized):
- Overall decision: PASS / FAIL / BLOCKED / NOT RUN

## 9. SC-05 closure boundary

**Software scope:** closed. PR #149 merged at `e0579fa1734eac989af051c4776cc88de912c946`; final PR-head CI #1375, post-merge CI #1376 and Pages deployment #151 passed. PR #150 test-only assertion merged at `661241e721a5510cf3f61c8ba7c3971c82b6a63c`; final-head CI #1384, post-merge CI #1385 and Pages deployment #152 passed.

**Physical optical/device acceptance:** NOT RUN. This gate remains open until run and recorded on real iOS/Android devices and a labelled corpus. If devices or corpus are unavailable, record the blocker; do not fabricate a pass or compensate with speculative code.
