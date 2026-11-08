# Current scanner acceptance gates — 2026-11-08

Current main baseline: 43f16379869b703e218e264040b859ab533c3193. Historical PR #31/#32 references below are retained as history, not current status.

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
- [ ] PR C2 — Stocktake consumes lifecycle observer and gates unmount on presentation + camera release + disposal.
- [ ] PR A — Connecting overlay and transition on READY, after C2.

## PR C2 — Stocktake migration acceptance

- [ ] Stocktake passes lifecycleObserver to the shared useScannerEngine.
- [ ] Session identity comes only from the engine event; no feature-created adapter/session ID.
- [ ] Manual close captures the frozen preview before closeScanner().
- [ ] Successful single-result callback captures the frozen preview before the session's automatic close.
- [ ] EXIT_PRESENTATION is emitted by Stocktake when its own scanner-stocktake-close animation completes.
- [ ] Parent onClose() is called only after EXIT_REQUESTED, CAMERA_RELEASED, DISPOSED, and presentation completion; event order is not assumed.
- [ ] Completion is idempotent; duplicate animation/lifecycle events cannot close twice.
- [ ] Camera release is never delayed by animation; reduced-motion path still completes.
- [ ] StocktakeModule camera lease cancellation, scanner visibility and parent close ownership remain unchanged.
- [ ] Barcode-to-form fill, manual entry, duplicate rows, edit/review and explicit save remain unchanged.
- [ ] Lifecycle regression tests cover manual close and successful single-result close; full npm run preflight passes.
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
