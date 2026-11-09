# Current scanner acceptance gates — capability-gated Torch (2026-11-09)

## Production behavior
- [x] Torch capability is read from the active video track after first usable frame.
- [x] Home and Stocktake render their own Flash controls only when the active track advertises `torch === true`.
- [x] Unsupported/rejected Torch remains non-fatal to preview and barcode scanning.
- [x] Camera acquisition, resolution/FPS, autofocus, decoder and barcode workflow remain independent of optional Torch.
- [x] iOS Safari/PWA: user confirms Flash works normally.
- [x] Android Chrome / Samsung Galaxy S23 Ultra: no Torch capability/settings exposed; explicit diagnostic request was API-accepted but physical LED did not illuminate. Device remains unsupported through the normal capability gate.
- [ ] Additional Android devices that expose `getCapabilities().torch === true`: verify physical ON/OFF, close while on, background/foreground recovery and scanner stability.

## Cleanup acceptance
- [ ] Remove PR #53 diagnostic sampler, timers, React state, panel and `scannerDebug` path.
- [ ] Remove PR #54 capability-bypass probe and probe-only contracts/state.
- [ ] Keep production Torch capability, ON/OFF adapter and regression tests.
- [ ] Full `npm run preflight` passes on the cleanup PR head.
- [ ] Confirm no behavior change in Home, Stocktake or iOS.

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
