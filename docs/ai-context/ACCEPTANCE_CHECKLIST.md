# Current scanner acceptance gates — 2026-11-08

Source baseline: PR #47 has been merged and physically tested by the user; restored module-owned Home/Stocktake preview presentation works correctly.

## Technical-only lifecycle separation — branch `refactor/scanner-lifecycle-technical-only`

- [x] Platform lifecycle vocabulary contains only scanner execution/resource milestones.
- [x] No presentation event or `notifyExitPresentation()` API exists in platform contract/session/hook.
- [x] Home owns presentation completion locally and joins it with technical close/lease/disposal signals.
- [x] Stocktake owns presentation completion locally and joins it with technical close/lease/disposal signals.
- [x] Recovery-retired session reference exists only to preserve terminal close signals across a recovery race.
- [x] Camera lease release is not delayed by feature animation.
- [ ] Targeted lifecycle regression suite passes on this branch.
- [ ] TypeScript and production/Pages preflight pass on this branch.
- [ ] iOS Safari/PWA and Android Chrome/PWA smoke tests confirm unchanged behavior.

## Source-audit facts (not device acceptance)
- [x] Home tap starts `requestCameraLease()` before scanner UI mounts.
- [x] Stocktake tap starts `requestCameraLease()` before scanner UI mounts.
- [x] Request is cancellable before claim and single-claim at session handoff.
- [x] Preview readiness is distinct from decoder/scanning readiness.
- [x] Current session uses 110 ms minimum decode interval; do not tune without measurements.
- [x] Current hook hardcodes profile `HIGH`; adaptive Low/Mid/High is not implemented.
- [ ] iOS opening geometry root cause measured and fixed.
- [ ] Exit fade visually synchronized while camera teardown remains prompt.

## Historical migration gates
- PR B lifecycle adapter foundation, PR C1 Home migration, PR #43 foreground Recovery, PR #45/C2 Stocktake migration and PR 47A module-owned preview restoration are merged.
- C2 originally joined a feature-owned presentation milestone with engine resource milestones. The current task removes that presentation milestone from the platform contract; Home and Stocktake retain the same local join behavior.

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
