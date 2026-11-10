# SCAN-05/06 acceptance — consolidated rotation and bounded deskew (2026-11-10)

## Baseline rotation
- [x] Confirm ZXing `TRY_HARDER` retains the existing 180° scanline reversal for 1D readers.
- [x] Runtime Code 128 fixture decodes at 0° and 180° and reports orientation 180°.
- [x] EAN-8/EAN-13 inheritance path is guarded through the shared `OneDReader` hierarchy.
- [x] Baseline test is registered in preflight; CI run #337 passed.

## SCAN-05 — 90°/270° orthogonal rotation
- [x] Pure ROI luminance transform swaps dimensions and validates input.
- [x] Code 128 runtime fixture passes after normalization of both 90° and 270° input.
- [x] EAN-8 and EAN-13 runtime fixtures pass after normalization of both 90° and 270° input.
- [x] Unrotated ROI is attempted first; extra quarter-turn is bounded to every third valid ROI frame after a miss.
- [x] Rotation diagnostics and stage timings are present.
- [x] Extended decode cadence is driven by a dedicated valid-ROI sequence, not diagnostics-window counters; deterministic schedule tests cover valid and invalid sequence values.
- [x] CI run #338 passed; consolidated CI run #342 passed.
- [ ] Physical iOS Safari/PWA QA: Home and Stocktake, 0°/90°/180°/270°.
- [ ] Physical Android Chrome/PWA QA: same matrix.
- [ ] Compare decode latency/CPU on lower-end devices.

## SCAN-06 — bounded in-plane deskew
- [x] Sobel structure-tensor estimate is confidence-gated and bounded to 1.2°–12°.
- [x] Bilinear inverse-angle transform expands ROI bounds, fills uncovered pixels white and enforces a 4M-pixel allocation cap.
- [x] Synthetic Code 128 at ±5°/±8° decodes after correction.
- [x] Combined 90°/270° normalization plus skew correction passes.
- [x] Level, blank, invalid and >12° cases fail closed; pure service has no DOM/presentation dependency.
- [x] Deskew is attempted only after upright and orthogonal decode misses and uses one HybridBinarizer pass.
- [x] Previous consolidated PR #66 head passed full preflight and builds in CI run #368 (before the audit follow-up commits).
- [x] Follow-up separates processing cadence from diagnostics sampling and adds deterministic cadence regression coverage.
- [x] Production decoder integration test is registered in preflight: upright decode, scheduled 90°/270° recovery, strict ROI crop and no-fallback behavior.
- [ ] Fresh CI run for the latest audit follow-up commits must pass before merge.
- [ ] Physical iOS Safari/PWA QA: ±5°/±8° with Home and Stocktake.
- [ ] Physical Android Chrome/PWA QA: same matrix.
- [ ] Record latency, CPU and accuracy on low-end and high-end devices.

## Consolidated delivery
- [x] SCAN-04 strict ROI baseline was merged/deployed by the user; normal operation confirmed.
- [x] SCAN-05 and SCAN-06 source/tests are consolidated on final PR #66.
- [x] Documentation and ADRs synchronized on the consolidated branch; AI handoff points to PR #66 and the active final branch.
- [x] Current PR and CI references corrected; stale PR #65/branch references removed from the current handoff.
- [x] Final source/docs diff audit completed on consolidated PR #66; no scope leakage found.
- [ ] Physical device QA remains outstanding; do not merge until accepted.
- [x] Add individual EAN-8/EAN-13 runtime image fixtures for 90°/270° rotated input.
- [ ] Merge final consolidated PR #66 after device acceptance. PR #63/#64/#65 are closed as superseded and must not be merged separately.

---

# SCAN-04 acceptance — strict module-reticle ROI decoding (2026-11-10)

- [x] SCAN-03 merged at `4804a0b0f06113e43a06e8b171d05dbad6fb1a8f`.
- [x] User confirms iOS and Android reticle geometry and existing scanner flows were checked without detected issues.
- [x] Decoder contract requires a `source-frame-normalized` scan-region snapshot.
- [x] Session passes the current defensive region snapshot to each decoder invocation.
- [x] Pure pixel crop resolver validates coordinate space, finite values, normalized bounds and source dimensions.
- [x] Crop bounds floor leading and ceil trailing edges; source edges are clamped.
- [x] ZXing decodes only the measured reticle ROI; full-frame-first and fixed centered fallback passes are removed.
- [x] Missing/invalid ROI fails closed; no silent full-frame fallback.
- [x] Regression suite is registered in `npm run preflight`.
- [x] GitHub Actions run #324 passed TypeScript, production/Pages builds and full preflight on PR head `31405dae3cd2eb358dce1e11868e861ac4ace1a8`.
- [x] User confirms SCAN-04 was merged, deployed and the scanner runs normally.
- [ ] Detailed optical matrix (center/reticle edges, low-light, reflective, small/far labels) recorded separately on iOS and Android.
- [ ] Review decode-duration/ROI-unavailable diagnostics on representative devices; compare against the pre-SCAN-04 baseline.

---

# SCAN-02 acceptance — pure preview/source geometry mapping (merged main, 2026-11-10)

- [x] Pure mapper accepts explicit source and preview dimensions.
- [x] CSS `fill`, `contain`, `cover`, `none`, and `scale-down` sizing rules are represented.
- [x] Normalized object-position controls crop alignment for positive and negative free space.
- [x] Visible content bounds exclude letterbox/pillarbox space.
- [x] Horizontal mirror is inverted before source-frame normalization.
- [x] Invalid input returns an explicit failure; no full-frame fallback is produced.
- [x] Geometry utility does not read DOM/window/video or own camera/session resources.
- [x] Geometry regression script is registered in `npm run preflight`.
- [x] Geometry regression, TypeScript production build and full preflight pass on merged main commit `891a3a6c8c85442d0b4a253c1fca43b36b590f1c` (GitHub Actions run #299).
- [x] GitHub Actions main CI run #299 passed.
- [x] Home and Stocktake real-device geometry alignment QA — user confirms both iOS and Android checks completed after SCAN-03 deployment without detected issues.

---

# SCAN-01 acceptance — input and module configuration contract

- [x] Preview-content and source-frame coordinate spaces have distinct discriminators.
- [x] Rectangles use normalized fractions and document top-left origin and bounds invariants.
- [x] Module contract separates scan region from camera request.
- [x] Camera request values are preferred constraints, independent of display aspect ratio.
- [x] Default camera request remains environment / 1280×720 / 30 FPS ideal / 30 FPS maximum.
- [x] Runtime call sites, camera lifecycle, decoder, validation and module business flows are untouched.
- [ ] TypeScript production build and full `npm run preflight` pass on PR head.
- [ ] GitHub Actions CI passes.

---

# Current scanner acceptance gates — capability-gated Torch (2026-11-09)

## Shared Scanner settings — PR #56 (merged to main)
- [x] Settings dock icon uses the gear-shaped Settings icon.
- [x] Settings opens a hub with separate Scanner QA Monitor and Scanner preferences entries.
- [x] Device-local versioned preferences default to vibration enabled and beep volume 50%.
- [x] Beep volume slider has 11 levels; 50% preserves gain 0.24, 0% mutes, 100% maps to gain 0.48.
- [x] Shared feedback reads current preferences at accepted-result time; Home/Stocktake cannot override global settings.
- [x] Unsupported vibration API is surfaced honestly and does not block barcode delivery.
- [x] Regression test is included in preflight.
- [x] PR #56 is merged to main at `5eee1a6a565f6263907541dac6af6b4ba77b37be`; full preflight passed on final PR head in GitHub Actions run #42575773839.
- [ ] Physical Android test confirms vibration toggle ON/OFF and compares beep levels; physical iOS test confirms beep and unsupported-vibration fallback.
- [x] Follow-up PR #57 adds executable mocked AudioContext/GainNode regression tests; GitHub Actions run #42648085229 passed full preflight on current head `9b0d76a5931a85bd336629348ec98bbd96fb86b4`. This does not replace physical acoustic QA.
- [ ] User verifies Home lookup, Stocktake form-fill/explicit-save, scanner open/close and lifecycle behavior after the PR #56 build is deployed.
- [x] User-approved merge is reflected by merge commit `5eee1a6a565f6263907541dac6af6b4ba77b37be`.
- [ ] Deployment of PR #56 is confirmed separately; do not infer deployment from merge.

---

## Production behavior
- [x] Torch capability is read from the active video track after first usable frame.
- [x] Home and Stocktake render their own Flash controls only when the active track advertises `torch === true`.
- [x] Unsupported/rejected Torch remains non-fatal to preview and barcode scanning.
- [x] Camera acquisition, resolution/FPS, autofocus, decoder and barcode workflow remain independent of optional Torch.
- [x] iOS Safari/PWA: user confirms Flash works normally.
- [x] Android Chrome / Samsung Galaxy S23 Ultra: no Torch capability/settings exposed; explicit diagnostic request was API-accepted but physical LED did not illuminate. Device remains unsupported through the normal capability gate.
- [ ] Additional Android devices that expose `getCapabilities().torch === true`: verify physical ON/OFF, close while on, background/foreground recovery and scanner stability.

## Cleanup acceptance — PR #55
- [x] Remove PR #53 diagnostic sampler, timers, React state, panel and `scannerDebug` path.
- [x] Remove PR #54 capability-bypass probe and probe-only contracts/state.
- [x] Keep production Torch capability, ON/OFF adapter and regression tests.
- [x] Full `npm run preflight` passes on cleanup PR head; GitHub Actions run #42572378379 is green.
- [x] Source diff preserves Home/Stocktake business flows and the iOS camera path; no production camera acquisition or decoder changes.
- [x] PR #55 merge and deployment are user-confirmed. PR #56 merge is recorded above; deployment confirmation remains separate.

Capability is browser/device/camera-mode dependent. A resolved `applyConstraints()` promise is not proof of physical LED activation. Do not infer support from model names or user-agent.

---

# Current scanner acceptance gates — post PR #49 (2026-11-09)

## PR #49 — Geometry-neutral engine video readiness

**Main merge:** `1764c858a7d7855950ebe328a3a653d6935fa796`  
**CI:** GitHub Actions run #200 — full `npm run preflight` passed.  
**Deployment/device acceptance:** user confirms merged build was deployed and tested without issues.

### Engine boundary
- [x] Platform startup no longer imports or calls `waitForVideoPresentationLayout()`.
- [x] Obsolete `src/platform/scanner/videoPresentationLayout.ts` is deleted.
- [x] Engine does not require a video parent/container, non-zero CSS bounds, matching rectangles, equal aspect ratios or stable DOM geometry before attaching/playing the stream.
- [x] Technical media readiness remains: decoded media state, intrinsic `videoWidth/videoHeight`, playback state and fresh-frame evidence.
- [x] Intrinsic media frame dimensions are documented as media validity, not DOM geometry.
- [x] Startup ordering remains stream attach → play → first usable frame → preview-ready/technical READY → decoder initialization → scanning.
- [x] Regression tests assert no DOM geometry inspection in the platform session and preserve frame-readiness/startup-order checks.

### Feature-owned presentation
- [x] Home continues to render its own keyed video element and owns `.barcode-scanner-view` / `.has-preview` presentation.
- [x] Stocktake continues to render its own keyed video element and owns `.stocktake-scanner-preview` / `.has-preview` presentation.
- [x] Home and Stocktake retain independent sizing, crop, visibility, overlay and reveal policies.
- [x] Native video opacity remains 1 with no opacity transition in the current module styles.
- [x] PR #49 does not modify either feature component or their presentation styles.

### Protected behavior
- [x] Camera acquisition, lease/refcount and stream ownership remain unchanged.
- [x] Lifecycle technical event contract and Recovery remain unchanged.
- [x] Decoder initialization/algorithm/cadence and barcode validation/delivery remain unchanged.
- [x] Home lookup and Stocktake form-fill, duplicate-row and explicit-save behavior remain unchanged.
- [x] Regression suite, TypeScript/production build, Pages build and diff checks passed in CI run #200.
- [x] User confirms deployment and post-deployment testing without issues.

This is the current acceptance record for the PR #49 change. The sections below retain earlier PR and device-test history; their unchecked items are historical records from earlier gates, not outstanding acceptance criteria for PR #49.


---

## Historical scanner acceptance gates — PR 47A restoration baseline

Source baseline for restoration: pre-PR #46 main (`af694b6e7fc6bbcb0d4869ab33ab8f084bffeb73`). PR #46 was merged, then its shared preview presentation was rolled back in PR 47A after iOS/Android device regressions. PR #31/#32 references below are historical.

## Source-audit facts (not device acceptance)
- [x] Home tap starts `requestCameraLease()` before scanner UI mounts.
- [x] Stocktake tap starts `requestCameraLease()` before scanner UI mounts.
- [x] Request is cancellable before claim and single-claim at session handoff.
- [x] Preview readiness is distinct from decoder/scanning readiness.
- [x] Current session uses 110 ms minimum decode interval; do not tune without measurements.
- [x] Current hook hardcodes profile `HIGH`; adaptive Low/Mid/High is not implemented.
- [ ] iOS opening geometry root cause measured and fixed.
- [ ] Exit fade visually synchronized while camera teardown remains prompt.

## Lifecycle migration status

- [x] PR B — shared event contract and adapter merged.
- [x] PR C1 — Home consumes lifecycle observer and exit handoff.
- [x] PR #43 — fresh video surface foreground recovery merged; user confirmed previous preview-shrink defect is gone.
- [x] PR C2 — Stocktake consumes lifecycle observer and gates unmount on presentation + camera release + disposal; PR #45 merged and user reports no issues.
- [x] PR 47A restores the pre-PR #46 module-owned preview implementation and removes the shared curtain/component.
- [ ] PR 47A CI and physical iOS Safari/PWA + Android Chrome/PWA retest.

## PR 47A — Restore module-owned preview presentation

- [x] Home and Stocktake restore their pre-PR #46 video markup and feature-specific CSS.
- [x] Shared `ScannerPreviewSurface` and curtain CSS are removed.
- [x] `isPreviewReady` remains the engine's technical readiness signal.
- [x] Home and Stocktake again own their own reveal classes and presentation behavior.
- [ ] CI passes on PR 47A head.
- [ ] iOS test confirms no black → undersized video → resize sequence.
- [ ] Android test confirms no abrupt/choppy opening transition.
- [ ] Retry, foreground recovery and reduced-motion behavior are rechecked.

## Historical PR C2 — Stocktake migration acceptance (original lifecycle gate)

- [x] Stocktake passes lifecycleObserver to the shared useScannerEngine.
- [x] Session identity comes only from the engine event; no feature-created adapter/session ID.
- [x] Manual close captures the frozen preview before closeScanner().
- [x] Successful single-result callback captures the frozen preview before the session's automatic close.
- [x] EXIT_PRESENTATION is emitted by Stocktake when its own matching scanner-stocktake-close animation completes.
- [x] Parent onClose() is called only after EXIT_REQUESTED, CAMERA_RELEASED, DISPOSED, and presentation completion; event order is not assumed.
- [x] Completion is idempotent; duplicate animation/lifecycle events cannot close twice.
- [x] Camera release is never delayed by animation; reduced-motion 1ms animation path remains.
- [x] StocktakeModule camera lease cancellation, scanner visibility and parent close ownership remain unchanged.
- [x] Barcode-to-form fill, manual entry, duplicate rows, edit/review and explicit save remain unchanged.
- [x] Lifecycle regression tests cover manual close and successful single-result close; GitHub Actions run #178 passed full npm run preflight.
- [x] PR #45 merged; user reports the implementation runs correctly without issues.
## Device QA — iOS Safari/PWA
- [ ] First permission grant, deny, dismiss, retry and permission revocation.
- [ ] Tap-to-request timing and camera permission prompt behavior.
- [ ] Record getUserMedia, lease, play, first-frame, decoder-init and scanning-ready timings.
- [ ] Record visualViewport height/offset, safe-area insets and scanner root/card bounds during open transition.
- [ ] Open/close/reopen rapidly; close while permission is pending.
- [ ] Exit transition: no dark-only flash; camera is released promptly.
- [ ] Background/foreground, pagehide/pageshow, track ended and explicit retry.
- [ ] Home cached lookup and Stocktake form-fill/explicit-save/duplicate rows/manual entry.

## Device QA — Android Chrome/PWA
- [ ] Repeat the same camera/lifecycle/exit checks.
- [ ] Record representative low/mid/high device measurements; do not treat one Android device as the entire tier.
- [ ] Verify no regression in currently stable opening geometry.

## Phase 1.2G bounded completion
- [x] Source instrumentation exists for acquisition/readiness/decode/teardown and UI phase intervals.
- [ ] Device traces and repeatable baseline exist.
- [ ] Any additional optimization is tied to a reproducible defect or measured bottleneck.
- [ ] Do not claim direct GPU frame-drop, battery or temperature measurement from current telemetry.

## Phase 1.2I — Shared Scanner Engine Completion
- [ ] Explicit lifecycle/state contract and legal transitions.
- [ ] Camera request/lease/claim/cancel/release invariants and race tests.
- [ ] Decoder adapter init/dispose, capability negotiation, typed misses/errors and bounded scheduling.
- [ ] Feature policy separation for Home, Stocktake and future consumers.
- [ ] Privacy-safe diagnostics and deterministic tests for failure/race paths.
- [ ] Profile integration cannot alter correctness or create duplicate streams/decoders.

## Phase 1.2J — Scanner-first Low/Mid/High adaptation
- [ ] Define observable capability inputs and conservative unknown-device fallback.
- [ ] Define resource budgets and allowed knobs; separate correctness invariants from tunable work.
- [ ] Use sustained runtime proxies with hysteresis; do not promise universal battery/thermal APIs.
- [ ] No unmeasured reduction in resolution, cadence, ROI or fallback decoding.
- [ ] Verify scan success/accuracy, first-result latency, decode cost, UI responsiveness and battery/thermal proxies.

## Phase 1.2K — Cross-platform release gate
- [ ] iOS Safari/PWA and Android Chrome/PWA evidence recorded.
- [ ] Home/Stocktake business contracts pass.
- [ ] Regression tests, TypeScript/build/Pages preflight pass.
- [ ] Full diff reviewed; explicit user approval before merge/deploy.

---

# RetailOS acceptance checklist

## Before implementation
- [ ] Inspect current branch, status and diff.
- [ ] Confirm user story and success criteria.
- [ ] Identify stable IDs, APIs, schema, and affected services.
- [ ] Record baseline build/test failures.
- [ ] Plan rollback.

## Module library
- [ ] One canonical registry; no duplicate divergent module lists.
- [ ] IDs match existing data services/navigation.
- [ ] Search supports title, description and useful synonyms where appropriate.
- [ ] Groups are derived consistently and empty groups are handled.
- [ ] Module UI readiness is distinct from data availability and permissions.
- [ ] Every action routes correctly or reports an honest disabled/integration state.
- [ ] Loading, empty, stale, error and offline states are explicit where relevant.

## Responsive UX
- [ ] Narrow phone (~320–360px)
- [ ] Typical phone (~390–430px)
- [ ] Tablet
- [ ] Desktop / wide viewport
- [ ] No horizontal overflow or inexplicable blank column.
- [ ] Bottom navigation does not cover content.
- [ ] Safe-area insets respected.
- [ ] Touch targets and text remain usable.
- [ ] Keyboard focus and reduced motion work.
- [ ] Translucency does not harm contrast or performance.

## Regression
- [ ] Login/session
- [ ] Module navigation
- [ ] API request/response contract
- [ ] IndexedDB/snapshot refresh and stale-state behavior
- [ ] Barcode camera permission, success and failure
- [ ] Notifications
- [ ] PWA/service worker/offline
- [ ] Vite base path/GitHub Pages
- [ ] Build and tests pass

## Release
- [ ] Review diff for accidental removals/secrets.
- [ ] Confirm rollback point.
- [ ] Explicit user approval to push/deploy.
- [ ] Record release commit and verified URL.

## Scanner transition — supplemental UX patch

- [ ] Home opens as a full-screen camera surface; no camera card/frame remains.
- [ ] Stocktake retains its existing scanner frame, dimensions and layout.
- [ ] Home and Stocktake use independent presentation treatments; no shared UI template is introduced.
- [ ] Camera acquisition begins from the opening tap; the mounted scanner claims the same pending lease.
- [ ] Closing before lease handoff cancels safely; a late stream is released without stopping another active lease.
- [ ] A lease request cannot be claimed twice.
- [ ] Camera permission denial and explicit retry remain recoverable.
- [ ] Animation does not gate camera startup, first-frame reveal, decoder readiness or scanner teardown.
- [ ] First usable video frame is revealed without a standalone loading screen or visible flicker.
- [ ] prefers-reduced-motion is respected.
- [ ] iOS Safari/PWA: first permission, denial/retry, rapid open/close, background/foreground and scan result.
- [ ] Android Chrome/PWA: first permission, denial/retry, rapid open/close, background/foreground and scan result.
- [ ] Weak-device review: no heavy blur, large promoted layers, continuous animation or material scan regression.
- [ ] Home cached lookup and Stocktake form-fill/explicit-save, duplicate rows and manual entry still work.
- [ ] CI and local preflight pass; physical-device evidence is recorded separately.


## Scanner lifecycle and exit-transition stabilization — PR #32

- [ ] Home scanner root has the dedicated full-screen class and tap-origin styles.
- [ ] Home video remains hidden until first usable frame, then reveals without layout jump.
- [ ] Stocktake preview retains its frame and stable geometry at small and large viewport sizes.
- [ ] A delayed pause teardown cannot overwrite a newer foreground preview/scanning state.
- [ ] A stale start completion cannot clear a newer start's loading state.
- [ ] Manual close and successful single-scan result use the correct module-owned exit treatment.
- [ ] Home continuous scan mode remains open after an accepted result; close-on-result applies only to single-result mode.
- [ ] A successful single-result event prevents visibility/foreground recovery from reacquiring the camera during exit.
- [ ] Camera teardown starts immediately on close/result; exit motion never holds the camera lease.
- [ ] Reduced-motion mode closes without waiting for animation events.
- [ ] Rapid close/reopen does not reuse a disposed session or release a newer lease.
- [ ] iOS Safari/PWA and Android Chrome/PWA pass first-open, permission denial/retry, foreground recovery and result flows.
- [ ] Low-end Android and small iPhone viewport pass preview geometry and motion checks.
- [ ] Home lookup and Stocktake explicit-save/manual-entry/duplicate-row behavior remain unchanged.
