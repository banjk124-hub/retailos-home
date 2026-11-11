# Scanner roadmap — SCAN-07 remains active (2026-11-11)

**Main:** PR #77 merged at `2c3fc1bd4b37f19bcfba2b1d7974184eb5e42c49`; current branch work is additive and unmerged.
**PR #77 device outcome:** user confirms modest improvement for small/far barcodes and successful reads near reticle edges, but recognition range and precision are not yet sufficient.
**Current work:** PR #78 is focused on completing SCAN-07 through native ROI detail preservation, coordinated camera focus recovery, and shared decoder/camera tuning. Do not advance to SCAN-08/09 until this gate is accepted.
**User acceptance rule:** evaluate barcode dimensions in source-frame pixels, measured physical distance, correct/incorrect decode outcomes, and stable operation. Do not attribute end-to-end scanner overall scanner response time to SCAN-07; total response depends on camera startup, focus, frame delivery, decoding, session and module result handling.

## Current shared scanner pipeline

1. Home and Stocktake each own their video element, visible reticle and feature workflow.
2. Both modules map the visible reticle through SCAN-02/03 into the same source-frame-normalized ROI contract.
3. SCAN-04 remains strict: missing/invalid ROI fails closed; no full-frame or centered fallback.
4. The decoder crops only that source ROI. Native source detail is retained up to a bounded 2048 px ROI width and 1.5 MP native ROI area; oversized crops alone are downsampled.
5. Both modules use the shared camera lease. Camera request now prefers 1920×1080 at 30 FPS maximum; browser-negotiated lower settings remain valid and must be recorded in device QA.
6. Scale candidates remain ordered 1.5× baseline, then 1× and 2× only after the full baseline path misses. Additional candidates remain bounded to 6 MP each.
7. SCAN-05/06 orientation recovery and both ZXing binarizers remain active within each scale. Valid baseline orientation estimates are reused by fallback scales for the same frame; missing estimates are recalculated. Result validation and module result handling remain authoritative.
8. Focus setup runs only after the video has produced a fresh frame. Track constraints are preserved and serialized across autofocus and Torch operations.
9. The existing grayscale ROI readback provides low-rate sharpness/motion samples. Sustained stable sharpness loss can reassert continuous autofocus only when the camera exposes that mode. This is a recovery request, not proof that the lens has physically refocused.

## SCAN-07 — Adaptive ROI, multi-scale and coordinated optical recovery

**Status:** Active; PR #77 is merged/deployed. PR #78 implementation is in progress; final-head CI #678 passed; physical-device acceptance is pending.

- Preserve SCAN-02/03 mapping and SCAN-04 strict ROI. No outward padding is enabled because Home/Stocktake have not published an authorized capture envelope.
- Preserve more native sensor pixels by bounding the ROI itself rather than scaling the entire frame to 1280 px.
- Prefer 1080p camera input, while accepting browser-negotiated lower resolutions on weaker devices.
- Keep the 1.5× baseline first, then bounded 1×/2× fallbacks after a complete baseline miss.
- Keep SCAN-05/06 orientation, deskew, contrast and both binarizers connected to each scale. Do not run an unbounded Cartesian product or parallelize the ZXing reader.
- Move continuous-focus configuration until after first-frame readiness. Preserve current camera constraints when applying focus or Torch changes, and serialize track-level updates so they cannot overwrite one another.
- Use ROI sharpness plus frame-to-frame motion filtering to detect sustained defocus; only reassert continuous focus after four stable low-sharpness samples, with an 8-second recovery cooldown. Motion/changing scenes and low-texture frames must not trigger refocus.
- Test Home and Stocktake independently on iOS Safari/PWA and Android Chrome/PWA, with the same scanner platform behavior.
- Do not claim a minimum barcode size or maximum reading distance until the source pixel-height/distance matrix has been measured on real devices.
- Do not use overall scanner response time as a SCAN-07 success metric. Record decoder-stage processing cost and camera/focus state separately where needed.

## SCAN-07 closure gates

- [ ] Native ROI pixel preservation improves small/far barcode recognition without weakening strict ROI.
- [ ] Camera track reports actual negotiated width, height, frame rate and supported focus modes.
- [ ] Continuous focus is configured after fresh-frame readiness without delaying preview readiness.
- [ ] Autofocus and Torch constraints preserve each other and remain serialized.
- [ ] Focus watchdog ignores blank/low-texture and moving frames; sustained stable blur causes at most one bounded re-arm per cooldown.
- [ ] Replace the currently inert `profile: HIGH` handoff with a measured, conservative device-budget policy based on actual track settings and observed processing cost; unknown devices must fall back safely.
- [ ] Decoder still tries the baseline first and never starves validation or module result delivery.
- [ ] Home and Stocktake both pass normal, rotated, small/far, reticle-edge and outside-reticle negative tests.
- [ ] iOS Safari/PWA and Android Chrome/PWA testing covers near/far transitions, camera movement, blur recovery, low light and foreground/background recovery.
- [ ] Real labels are recorded by symbology, physical distance, barcode module/bar width where measurable, source ROI pixel height, orientation, lighting, glare, module, device/browser/build, decode outcome and false positives.
- [ ] No unsupported performance/accuracy claims; do not attribute end-to-end overall scanner response time to SCAN-07.

## SCAN-08 — Image enhancement
**Status:** Planned — candidate evaluation, not unconditional preprocessing.
- Current baseline already has RGBA-to-luminance conversion and bounded 1st/99th percentile contrast stretch within the deskew path when dynamic range is compressed.
- Evaluate gamma/contrast variants, adaptive thresholding and denoising as optional candidates after baseline misses.
- Preserve original luminance as the first candidate. Enhancement must not invent barcode edges or erase narrow bars.
- Treat specular highlights separately: clipped/saturated pixels are information loss, not recoverable detail. Detect/measure saturation; do not claim glare restoration.
- Gate: low-light, low-contrast, noisy, clipped/highlight and normal-light corpora; compare false positives as well as decode rate.

## SCAN-09 — Perspective and curved barcode
**Status:** Planned — feasibility research only until a validated detector exists.
- Distinguish in-plane skew (already covered by SCAN-06) from perspective/keystone distortion and curved-label deformation.
- Evaluate perspective detection and bounded rectification as optional candidates only when confidence indicates likely benefit.
- Curved-surface dewarping is a separate, higher-risk problem; do not infer curvature from a weak perspective estimate.
- Gate: planar perspective fixtures, curved-label fixtures, negative controls, geometry bounds, interpolation loss, memory cost and false-positive comparison. Preserve original ROI candidate.

## SCAN-10 — Adaptive performance
**Status:** Planned — requires baseline measurements from SCAN-07/08/09.
- Classify device/runtime capability from observed processing time, frame cadence, long tasks and memory pressure; avoid brittle user-agent/device-name heuristics.
- Adapt bounded scale count, enhancement/perspective candidate budget and decode attempts while preserving the baseline candidate.
- Enforce per-frame processing budget and prevent queues/concurrent access to the ZXing reader.
- Do not change the current 70 ms session cadence until measurements and acceptance tests justify it.
- Gate: low/mid/high device profiles, worst-case frame processing cost, UI responsiveness and decode success.

## SCAN-11 — Cross-platform hardening
**Status:** Planned — continuous acceptance lane across all phases, final release gate.
- iOS Safari/PWA and Android Chrome/PWA; low/mid/high capability devices.
- Validate camera lifecycle, background/foreground, permission and recovery, Home and Stocktake flows, barcode accuracy and overall scanner response time.
- Include real retail labels: small/far, low light, reflective/saturated, curved and perspective-distorted, reticle edges.
- Record device/browser/build, module, symbology, lighting, distance/pixel-height, orientation, attempts, decode correctness, false positives, per-stage processing cost and UI responsiveness. Do not invent missing measurements.

## PR and rollout strategy
- PR #77: merged/deployed strict-ROI multi-scale baseline.
- PR #78: complete SCAN-07 native ROI detail, coordinated autofocus/Torch and both-module device acceptance.
- SCAN-08: separate PR only after SCAN-07 closure.
- SCAN-09: separate research/implementation PR; keep opt-in candidate path.
- SCAN-10: separate adaptive-budget PR only after measured candidate costs exist.
- SCAN-11: acceptance/diagnostics and targeted fixes, not a wholesale rewrite.
- Every PR must include exact base/head, changed-file scope, protected invariants, automated regression, preflight/build, device evidence and rollback.
- Never delete historical decision records. Mark superseded runtime statements explicitly and point to the current source/spec.

> **Historical records below:** older phase plans and decisions are retained for traceability. Their camera resolution, decoder cadence and profile values are snapshots from earlier baselines; the current authoritative SCAN-07 behavior is defined above and in `SCAN_07_ADAPTIVE_ROI_MULTISCALE.md`.

## Legacy roadmap history
The sections below are historical records. Their old branch names, pending states and pre-SCAN-05/06 cadence descriptions are not current status. Use this top section as the authoritative current plan; retain older records only as traceable decision history.

---

## Scope and protected behavior
- Wire the existing `ScannerCameraRequest` into the actual tap-origin camera lease and `getUserMedia()` constraints.
- Resolve whether a live shared stream is compatible with a new request using actual track settings.
- Preserve compatible shared-stream reuse and the existing reference-counted lease model.
- Reject incompatible requests while another session holds a lease; never replace a stream out from under an active session.
- Preserve the initiating module's camera intent after the one-shot lease is claimed, including foreground recovery.
- Recovery must continue retiring the old session and video surface, then create a fresh session and fresh video surface. The new session reacquires with the original module intent.
- Home and Stocktake continue requesting camera synchronously inside their existing initiating tap handlers. Their current default remains environment / 1280×720 / 30 FPS.

No changes are intended to camera permission UX, autofocus policy, page lifecycle coordinator, teardown order, video readiness, decoder/cadence, strict ROI, Torch, result callbacks, module presentation, Home lookup, Stocktake form-fill/save, auth, storage, backend or deployment configuration.

## Compatibility policy
- `preferredWidth`, `preferredHeight` and `preferredFrameRate` are ideals, not exact demands. A browser-negotiated lower resolution is still compatible.
- A known facing-mode mismatch is incompatible.
- If `maxFrameRate` is set, an actual track frame rate above that ceiling is incompatible. The preferred frame rate is clamped to that ceiling when building constraints.
- Missing browser track settings are treated as unknown, not as a proven mismatch.
- The request that initiated `getUserMedia()` accepts the browser's negotiated best-effort facing mode because it is an ideal; identical intents may share it. The hard `maxFrameRate` ceiling remains enforced for every caller. Different intents are checked against actual settings.
- Compatible requests share the active stream. An incompatible request cannot replace a stream with active leases. A pending acquisition is checked against each caller after actual settings become available.

## Verification gates
- [x] Resolver tests: ideal constraints, frame-rate ceiling, facing mismatch, missing settings.
- [x] Lease tests: compatible sharing, incompatible active lease rejection, pending acquisition compatibility, cancellation, immutable intent and reference-count integrity.
- [x] Recovery source-contract regression: fresh session + fresh video surface + original camera intent.
- [x] Full preflight, TypeScript, production and Pages builds — GitHub Actions run #610 passed.
- [ ] Physical iOS Safari/PWA and Android Chrome/PWA QA.
- [ ] Explicit user approval before merge/deploy.

---

# Current Main baseline and Scanner Engine remediation — 2026-11-11

**Current main:** `6ac1eefad1c47d87d2c83f9002050c8a7d7802fe` (PR #74 merge commit). PR #74 is merged; deployment is not asserted here.

**Scanner remediation branch:** `fix/scanner-engine-remediation-code39`, based on that Main commit. PR is not yet created.

## Completed on this branch
- Recovery diagnostics: allowlist now retains ROI availability/dimensions, rotation attempts/hits, deskew attempts/confidence misses/hits and last deskew angle. QA Monitor displays these fields and CSV export includes them.
- Privacy regression: diagnostic test verifies barcode-like payload fields and camera identifiers are rejected from collected/exported metrics.
- Code 39: ZXing 0.23.0 already provides `BarcodeFormat.CODE_39` and the adapter mapping existed. RetailOS had not enabled it in the explicit allowlist or payload validator. This branch enables it and adds payload + production-adapter tests.
- Corrected stale scanner audio gain comment; current source maps 50% to 0.30 and 100% to 0.60, with approximately 140 ms beep duration.
- Updated ADR-020, added ADR-034, and clarified SCAN-01's actual implementation boundary.

## Explicitly deferred
- Historical note (superseded by the current Camera Request Bridge work above): the aggregate `ScannerModuleConfig.cameraRequest` had been declarative only; the current branch wires camera intent through the tap-origin lease and recovery path.
- Benchmark corpus, measured device baselines and generalized recovery orchestration remain follow-up work. Existing rotation/deskew remains intact; no speculative new image transforms are added here.
- No camera constraints, autofocus, camera lease/lifecycle, frame cadence, ROI, Home/Stocktake UI or business workflows are changed by this branch.

## Acceptance gates
- [ ] Code 39 payload validation and production decoder integration pass.
- [ ] Recovery metrics survive collector filtering and appear in QA Monitor / JSON / CSV.
- [x] Privacy regression passes (CI #566).
- [ ] Existing EAN-8, EAN-13 and Code 128 scanner suites remain green.
- [ ] Full `npm run preflight`, TypeScript, production and GitHub Pages builds pass.
- [ ] Review exact diff; no merge/deploy until explicit user approval.

---

# Current work — Scanner Engine remediation and Stocktake Import workspace (2026-11-11)

- PR #70–#73 were merged; PR #74 (Stocktake Import workspace v2) is merged into main at `6ac1eefad1c47d87d2c83f9002050c8a7d7802fe`; GitHub Pages deploy workflow #89 completed successfully. Manual device QA is not asserted by this record.
- Current scanner remediation branch: `fix/scanner-engine-remediation-code39`, based on current main `6ac1eef...`.
- Remediation scope: Code 39 enablement end-to-end; recovery diagnostics allowlist + QA Monitor/CSV; privacy regression; audio documentation reconciliation.
- Do not change camera lease, camera request defaults, autofocus, lifecycle/recovery, decode cadence, strict ROI, Home/Stocktake presentation or business workflows.
- Historical baseline before this branch: `ScannerModuleConfig.cameraRequest` was declarative only. Current implementation is tracked in the task section at the top of this file.
- Benchmark corpus and generalized conditional recovery orchestration remain future work, not implied by this remediation.
- Historical outcome: PR #75 was subsequently merged into `main`; current main baseline is recorded at the top of this file. The current follow-up is PR #76.

**Verification boundary:** a synthetic 17° Code 39 fixture did not decode through the current deskew path during this work. No deskew algorithm change was made; angled Code 39 optical performance remains unverified.

## Scanner remediation acceptance
- [x] Code 39 validation and production ZXing adapter tests pass for upright and 180-degree reversal (CI #566).
- [x] Recovery metrics survive collector allowlisting and appear in QA Monitor / CSV (CI #566).
- [ ] Privacy regression passes.
- [ ] Existing EAN-8, EAN-13 and Code 128 behavior remains green.
- [x] Full preflight, TypeScript, production and Pages builds pass (final CI #577).
- [x] Diff review confirms no camera/lifecycle/feature behavior or dependencies changed.
- [ ] Explicit user approval before merge/deploy.

---

# Current work — Stocktake offline file import (2026-11-10)

**PR #69:** [Offline file import, zone preview and export](https://github.com/banjk124-hub/retailos-home/pull/69).
**Branch:** `feat/stocktake-file-import`.
**Status:** Draft implementation; not merged/deployed.

- Add a separate local-only `Xuất file` workflow inside the existing Kiểm kê library.
- Decouple business `RetailModuleId` from server snapshot `ModuleDataId`.
- Read `.xlsx` locally, detect each sheet/header/zone, extract BARCODE + SỐ LƯỢNG, preserve duplicates and decimals, preview Stocktake-compatible TXT output, and export one file per zone.
- Import history/cache is isolated in `retailos-stocktake-import`; clear-history must not affect the existing `retailos-stocktake` database.
- Existing Stocktake scanner, save/export, Scanner Engine, camera lifecycle and snapshot sync are protected.
- Remaining gates: CI/preflight, supplied workbook fixture validation, multi-sheet test, downstream confirmation for numeric-only zones and percent suffixes, and iOS/Android PWA file/download QA.
- Full contract: `STOCKTAKE_FILE_IMPORT.md`; architecture decision: ADR-028.

---

# SCAN-05/06 — corrective execution closed (2026-11-10)

**Status:** Complete, merged, deployed and user-validated.
**PR:** [#67 — Continuous barcode orientation recovery](https://github.com/banjk124-hub/retailos-home/pull/67).
**PR #67 merge baseline:** 9406ac30d53bc9984912bd1928a32fd78157cf60 (current main later advanced through PR #74).
**Final PR-head CI:** run #432 passed on c9794a5422aa2d6ace16480c2948c1bae3e0d06b.

- Original failure reports: sideways barcodes missed, intermediate orientations were not covered, and recognition felt slow/insensitive.
- Updated priority: recognition accuracy and responsiveness take precedence over an ultra-low-end CPU budget; additional processing is accepted while the app remains stable.
- Corrective implementation: continuous 180-bin orientation estimate, confidence gates, signed ±90° normalization, 90° fast path, both ROI axes evaluated, percentile contrast normalization for compressed ROI ranges and both ZXing binarizers per candidate.
- Session minimum decode interval is 70 ms. Decoder calls remain serialized and strict-ROI-only.
- Automated preflight passed in CI #425 on the executable source head and CI #432 on the final PR head.
- User confirms merge, deployment and successful real-world operation with sensitive multi-stage recognition.
- No camera, lifecycle, presentation, validation, Home lookup or Stocktake persistence behavior was intentionally changed by this slice.

**Evidence boundary:** detailed device/browser/module/symbology matrix and quantitative overall scanner response time/CPU/success-rate measurements were not supplied. The user's functional acceptance is recorded; do not invent numerical performance claims.

**Next:** SCAN-05/06 has no outstanding corrective task. Continue only with the next separately agreed roadmap scope; do not add perspective correction, curved-surface dewarping or unrelated scanner changes by implication.

---

---

# SCAN-02 execution update — audited and merged (2026-11-10)

- SCAN-01 merged by PR #58 at `47b991de8a0040aa44e500aa6228127f9e59f0f6`.
- SCAN-02 merged by PR #59 at `891a3a6c8c85442d0b4a253c1fca43b36b590f1c`; main CI run #299 passed full preflight and production/Pages builds.
- User confirms deployment and normal operation of existing scanner flows.
- Pure geometry mapper audit found no runtime calculation or architecture defect; a follow-up correction strengthens its DOM-boundary regression guard.
- SCAN-03 subsequently wired Home and Stocktake independently; PR #61 is merged at `4804a0b0f06113e43a06e8b171d05dbad6fb1a8f`, and the user confirms iOS/Android geometry and existing-flow checks found no issue.
- SCAN-04 is now implementing strict ROI-only decoding using the verified source region.

---

# SCAN-01 execution update — 2026-11-10

- SCAN-01 defines `ScannerModuleConfig`, preview/source normalized region types and explicit camera request preferences.
- SCAN-01 contract-only change merged by PR #58 at `47b991de8a0040aa44e500aa6228127f9e59f0f6`.
- No camera, lifecycle, decoder, Home or Stocktake runtime behavior changed in SCAN-01.
- SCAN-02 geometry mapping and SCAN-03 module integration are both merged; SCAN-04 consumes the verified source ROI.
- The existing camera default remains environment / 1280×720 / 30 FPS ideal / 30 FPS max.

---

# RetailOS — Engineering Roadmap

Last reviewed: 2026-11-10
Status: active working plan.

## Current execution order — scanner Torch investigation closed

1. PR #51/#52: production Torch capability detection and feature-owned controls are merged.
2. PR #53/#54: on-device diagnostics and the explicit compatibility pulse completed the investigation.
3. Evidence: iOS Flash works; Samsung Galaxy S23 Ultra / Android Chrome does not expose Torch on the active track. The explicit ON/OFF probe was API-accepted but did not illuminate the physical LED.
4. Decision: retain capability-gated behavior. Do not bypass capability detection, add device/browser heuristics, or introduce a native camera stack solely for Flash.
5. **Cleanup PR #55:** temporary diagnostic sampling, probe code, UI and stale runbook have been removed; production Torch adapter and regression coverage remain. CI run #42572378379 passed full preflight. User confirms PR #55 was merged and deployed.

**Protected contracts:** camera lease/refcount, current camera request/constraints, autofocus, first-frame readiness, lifecycle/recovery, decoder cadence, barcode validation/delivery, Home lookup, Stocktake form-fill/explicit-save, and independent module presentation.

---

## Current work — Scanner audio runtime verification and documentation sync

**Base:** PR #56 merged to `main` at `5eee1a6a565f6263907541dac6af6b4ba77b37be`.
**Branch:** `test/scanner-audio-runtime-and-doc-sync`
**Status:** Merged by PR #57 at `09cd3b5117ea38a16dd991f74320835b67ea04b5`; full preflight passed on the final documented PR head. Deployment and physical acoustic acceptance are tracked separately.

- PR #56 introduced the Settings Hub and one device-local feedback preference store shared by Home, Stocktake and future Scanner consumers.
- Default haptics remain enabled; default beep level is 50%, current Web Audio gain 0.30 at 50%. Slider steps are 0–100 in increments of 10; zero mutes and 100 maps to gain 0.60. The older PR #56 values 0.24/0.48 are superseded.
- This follow-up adds executable AudioContext/GainNode tests to verify the actual gain ramp, gesture unlock, preview/current-setting synchronization and shared feedback behavior.
- Production volume mapping remains unchanged until real-device A/B comparison demonstrates a justified alternative. A numeric gain difference is not a substitute for perceived-loudness testing.
- Physical Android vibration/beep and iOS beep/unsupported-vibration validation remain open. CI cannot verify physical haptics or acoustic output.
- No camera, decoder, barcode validation, accepted-result gate, Torch, lifecycle, Home lookup or Stocktake form/save changes are in scope.

---

## Historical source re-baseline — main c7146b55 (pre lifecycle contract)

Historical snapshot before PR B, C1 and PR #43. Current execution order is defined at the top of this file. Detailed evidence for that earlier baseline: SCANNER_SOURCE_AUDIT_2026-11-08.md. The iOS viewport/layout observations in this historical snapshot predate PR #49; they are not a current engine startup requirement. PR #49 removes the DOM geometry gate, and the user reports no issue after deployment/testing.

- PR #31 and PR #32 are merged. PR #32 merge commit: `c7146b55f0c2210cd7b8474c6a72b1c915985793`. Do not describe either PR as Draft/open.
- Camera acquisition is initiated inside the Home dock action and Stocktake scan-button click via `requestCameraLease()`, before scanner presentation mounts. The request is handed once to the shared session. Remaining wait belongs to browser permission/hardware acquisition, first usable video frame and decoder initialization; do not issue a second camera request.
- At this historical baseline, Home used a fixed `inset:0` root and percentage-height full-screen card while Stocktake used dynamic viewport units; Android was reported stable and iOS visually unstable. This was a pre-PR #49 observation, not proof of an engine-level geometry defect.
- Exit mismatch is source-supported: camera teardown detaches video immediately while the dark fixed overlay remains for a 180 ms opacity exit. Design visual exit independently from camera release.
- Phase 1.2G is bounded at source instrumentation/audit. Do not keep tuning motion/cadence without a reproducible issue or measured bottleneck. Device traces and specific defects remain open; this is not a claim that all hardware performance is solved.
- Existing telemetry does not directly measure GPU frame drops, battery percentage or device temperature. Safari may not expose all Long Task/Layout Shift observers. Use only supported, privacy-safe proxies and record their limitations.

### Revised phase sequence
1. **1.2G — Instrumentation/source audit (bounded):** implemented in source; no device performance baseline. Only issue-driven follow-up remains.
2. **1.2H — Conditional decoder performance:** only if representative device profiling shows decoder/image processing is a material bottleneck. Accuracy and correctness are hard invariants.
3. **1.2I — Shared Scanner Engine Completion:** finish explicit lifecycle/state contract, camera ownership, decoder adapter, feature-policy boundary, device-profile integration, observability and deterministic tests. Angled/perspective decode is an optional sub-capability, not the whole phase.
4. **1.2J — Device-adaptive performance profiles (scanner-first):** introduce Low/Mid/High policy initially only in scanner. Adapt optional resource intensity, not barcode correctness, supported symbologies, persistence, callback semantics or workflows. No unverified resolution/cadence reduction.
5. **1.2K — Cross-platform release validation:** validate engine, profiles and Home/Stocktake contracts on real iOS Safari/PWA and Android Chrome/PWA across representative Low/Mid/High hardware.

### Device-profile guardrails
- The current hook passes `profile: 'HIGH'` unconditionally. The profile type exists, but adaptive selection is not wired in the reviewed source.
- Classify conservatively from available capabilities and observed runtime behavior; user-agent alone is insufficient. Unknown devices fall back conservatively.
- Browser support for direct battery/thermal telemetry is not universal. Do not promise temperature/battery-aware APIs that Safari/Chrome do not expose. Use sustained decode cost, long tasks, frame callback gaps, visibility and actual track settings as imperfect proxies, with hysteresis to prevent profile oscillation.
- Low/Mid/High may govern decorative motion, optional work and bounded processing tiers only after measurement. Never compromise barcode accuracy or operational correctness to meet a performance tier.
- No adaptive profile implementation is claimed by this documentation update.
# RetailOS — Engineering Roadmap

Last reviewed: 2026-11-08
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
- EAN-13/EAN-8 payloads are format/length/check-digit-valid; CODE-128 content is preserved as opaque text; CODE-39 accepts its standard uppercase alphabet and spaces.
- Empty/unsupported values are not passed to feature callbacks.
- Home and Stocktake behavior above remains unchanged.
- Targeted tests and production builds pass, or failures are explicitly documented as blockers.

### 1.2B — Camera performance and diagnostics
**Goal:** optimize based on measured device behavior, not assumed camera constraints.

Scope:
- Record camera acquisition duration, video readiness, decoder attach, first valid result, resume overall scanner response time, actual track settings, and failure category.
- Add low-overhead diagnostics with no personal/product data leakage.
- Compare actual device behavior at 960×540 and 1280×720; test decode intervals around 100/120/150 ms.
- Measure and optimize performance separately from the lifecycle recovery slice. Unexpected ended-track recovery is implemented in Phase 1.2F and remains subject to device QA.

Acceptance criteria:
- Measurements available for representative Android Chrome and iOS Safari devices.
- Resolution/interval chosen from measured scan success and overall scanner response time, not ideal constraints alone.
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
- Historical note: before the SCAN-05/06 correction, `UniversalScannerSession` used a 110 ms minimum decode interval. The corrective branch changes this to 70 ms; the current specification is recorded in the SCAN-05/06 section at the top of this roadmap.
- P0 camera lease serialization is merged to `main` in commit `0ece0c95523a3846f1f2e06ac9d732c3e5a2f2d8`. CI passed for PR #24. Physical-device QA remains outstanding; deployment state must be checked independently.

### 1.2G — Rendering, motion and interaction performance
**Status:** Source instrumentation and audit bounded; device evidence and issue-specific fixes remain open. G-A instrumentation has been added on `feat/scanner-phase-1-2g-instrumentation`; GitHub CI run #63 passed scanner validation, TypeScript/production build, GitHub Pages build and whitespace checks on latest source; browser profiling and physical-device measurements remain pending. G-B/C audit findings are recorded below; no motion durations or decoder cadence have been tuned.

**Goal:** remove perceived stutter, flicker and jank during rapid scanner open/close and Home/Stocktake transitions by identifying the actual bottleneck across rendering, motion, UI state and lifecycle.

Slices:
- **1.2G-A — Performance instrumentation:** measure camera request/acquisition, video readiness, decoder readiness, first accepted result, release/resume, decode overall scanner response time, Canvas/ImageData work, React commits, long tasks and frame drops. Do not log barcode payloads or unnecessary device identifiers.
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

Scope: profile RGBA-to-grayscale conversion, Canvas/ImageData allocation and copies; optimize full-frame/ROI strategy and cadence based on measured scan success, overall scanner response time, CPU/thermal impact. Do not tune resolution or cadence by guesswork.

Acceptance: measurable improvement without material regression in scan success, overall scanner response time, preview smoothness, battery/thermal behavior or supported symbologies.

### 1.2I — Shared Scanner Engine Completion (supersedes the earlier decoder-capability-only definition)
**Goal:** complete the reusable scanner runtime contract shared by Home, Stocktake and future features.

Workstreams:
- Explicit lifecycle/state contract across request, preview readiness, decoder initialization, scanning, suspension, recovery, closing, error and disposal. Preview readiness must never be mistaken for decoder readiness.
- Camera ownership: request/claim/cancel, reference-counted leases, stream identity, stale generation protection, track-ended recovery and deterministic release.
- Decoder adapter: initialization/disposal, format allowlist, typed decode misses/errors, bounded scheduling and capability declaration.
- Feature-policy boundary: Home single-result cached lookup; Stocktake single-result form fill with explicit save; continuous mode only when explicitly configured by a consumer.
- Presentation independence: Home and Stocktake retain distinct UI surfaces; the engine exposes states/events, not layout.
- Integrate the scanner-first device profile as a policy input without allowing it to weaken correctness or accuracy invariants.
- Privacy-safe observability and deterministic tests for pending permission, cancel-before-claim, duplicate claim, rapid open-close-open, stale completions, concurrent leases, track-ended recovery, decoder/callback failures and feature contracts.
- SCAN-05 orthogonal rotation and SCAN-06 bounded in-plane deskew are implemented on the consolidated branch; physical device QA is pending. Perspective correction and curved-label dewarping remain separate future capabilities.

Acceptance:
- Home and Stocktake use the same camera/decoder lifecycle engine without duplicating ownership logic.
- State transitions and camera/decoder ownership invariants have deterministic regression coverage.
- No duplicate stream, decoder loop or callback after cancellation/close.
- Existing barcode allowlist and validation, Home lookup, Stocktake explicit-save/duplicates/manual-entry semantics remain unchanged.
- Profile switching cannot interrupt accepted-result delivery or change correctness semantics.
- Real iOS Safari and Android Chrome validation is recorded before phase release.

### 1.2K — Cross-platform release validation (renumbered by the device-adaptation phase)
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

## Camera startup follow-up — Patch 1: early preview (2026-11-07)

**Status:** Implemented on branch `fix/scanner-phase-1-early-preview`; GitHub CI passed. Real-device QA and merge approval remain pending.

**Problem addressed**
The Home and Stocktake scanner placeholders were tied to the full startup state. Because the session start promise also waits for decoder initialization, the UI could continue hiding a camera preview even after the video element already had a usable frame.

**Implementation boundary**
- The scanner session signals preview readiness immediately after the first usable video frame is confirmed and before decoder initialization.
- `useScannerEngine` exposes `isPreviewReady` independently of `isScanning`.
- Home and Stocktake reveal the video and dismiss the startup placeholder on preview readiness.
- Decoder readiness remains a separate lifecycle milestone; preview visibility does not mean scanning is ready.

**Protected / explicitly out of scope**
- No autofocus change (tracked separately as Patch 2).
- No camera resolution/constraints, decoder algorithm, ROI, decode interval, barcode validation or result callback changes.
- No Home cached lookup, Stocktake form-fill/explicit-save, duplicate-row, persistence, auth/session, Apps Script, IndexedDB, service-worker or deployment changes.
- No Phase 1.2G motion tuning or Phase 2 low-light / distant-small-barcode work.

**Acceptance gate**
- GitHub Actions run #79 on source commit `807ec386043a1cbfe5fccc9ef187b0c7b1fd5e5b`: TypeScript and production builds job passed, including the local-equivalent preflight.
- Verify first camera open and resume on iOS Safari/PWA and Android Chrome/PWA. Confirm preview appears before decoder readiness without a false scanning-ready state, blank/flickering frame, duplicate stream, duplicate decoder or regression in Home/Stocktake flows.
- Record device results separately. Do not mark the patch release-ready from CI alone; keep PR #29 unmerged and undeployed until user approval.


## Camera startup follow-up — Patch 2: non-blocking autofocus (2026-11-07)

**Status:** Implemented on branch `fix/scanner-phase-1-2-autofocus-nonblocking`; automated CI and real-device QA are pending.

**Problem addressed**
The shared camera acquisition promise previously awaited `requestContinuousAutofocus()`. A slow `MediaStreamTrack.applyConstraints()` therefore delayed `acquireCameraLease()`, even after `getUserMedia()` had already returned a usable stream. This delayed attaching the stream to the video element and obtaining the first preview frame.

**Implementation boundary**
- Validate the live video track and register its `ended` listener immediately after stream acquisition.
- Start optional continuous autofocus in the background; do not await it in the shared acquisition promise.
- Keep existing focus capability detection and status diagnostics. A late focus result is ignored if its generation or stream identity is stale.
- Add a regression test that holds `applyConstraints()` pending and proves that `acquireCameraLease()` still resolves and track-ended monitoring is already installed.

**Protected / explicitly out of scope**
- No changes to camera constraints (1280×720 ideal, 30 FPS target), decoder/ROI, 110 ms decode cadence, barcode validation, scanner UI, Home/Stocktake business flows, or persistence.
- No new dependencies, polling, duplicate camera request, or second decoder loop.
- Autofocus remains best-effort. Successful constraint application is not proof of physical lens focus lock.

**Acceptance gate**
- The delayed-autofocus regression test passes.
- Existing barcode, luminance and camera diagnostics tests pass.
- TypeScript, production build, GitHub Pages build and preflight pass in CI and locally.
- Verify first open, resume, focus behavior and camera-track interruption on iOS Safari/PWA and Android Chrome/PWA.
- Record physical-device evidence separately. Do not mark release-ready from CI alone; merge/deploy requires explicit user approval.


**Patch 2 CI result update (2026-11-07):** GitHub Actions run #84 (`42393062148`) passed the complete `npm run preflight`: scanner regression suite (including delayed autofocus), TypeScript/production build, GitHub Pages build and both diff checks. npm reported an EBADENGINE warning because `@zxing/library@0.23.0` declares Node >=24 while CI currently uses Node 22; build also reported the existing >500 kB chunk warning. Neither failed the run. Local Windows execution and real iOS/Android QA remain outstanding.


**Final PR-head CI confirmation (2026-11-07):** run #85 (`42393150965`) passed on documentation-synchronized head `a31d40315eaeb9f90ce209da4fef6341e8836025`. The latest PR head passed locked dependency installation and the full preflight. Local Windows/PowerShell and physical-device QA remain open.

## Supplemental Scanner UX Transition — after Patch 2 (2026-11-08)

**Status:** Merged to `main` through PR #31 on 2026-11-08. GitHub Actions run #89 passed. Real-device QA remains open.

This is a scoped UX follow-up to the camera-startup work, not a replacement for or completion of Phase 1.2G.

### Scope delivered on the branch
- Home and Stocktake initiate camera acquisition from the opening tap and hand the same pending lease to the mounted scanner session.
- Added single-claim/cancellable camera lease handoff to avoid duplicate acquisition and release late, unclaimed streams safely.
- Home scanner presentation is full-screen without a camera card/frame; its entrance originates from the Home dock action.
- Stocktake retains its existing scanner frame and layout and receives its own independent entrance/wait treatment.
- Startup messaging is no longer a centered standalone loading presentation. Actual video visibility remains tied to first usable preview readiness.
- Removed obsolete Stocktake CSS selectors that targeted the former shared Home scanner classes.
- Added automated tests for lease handoff, duplicate claim rejection and cancellation while another consumer retains the stream.

### Protected behavior
- No change to camera constraints, autofocus, ZXing/decoder algorithm, ROI, 110 ms decode cadence, barcode validation or accepted-result feedback.
- No change to Home cached barcode lookup, Stocktake form-fill/explicit-save, duplicate rows, manual entry or persistence.
- No change to auth/session, Apps Script, IndexedDB, service worker, PWA base path or deployment workflow.
- Home and Stocktake must remain separate presentation surfaces; do not consolidate their scanner UIs.

### Verification gate
- PR #31 GitHub Actions run #89 (42400411255) passed the full npm run preflight, including scanner regression tests, TypeScript/production build, GitHub Pages build and diff checks.
- Still required: physical iOS Safari/PWA and Android Chrome/PWA QA for permission prompt, denial/retry, close while pending, rapid open/close/reopen, background/foreground, first-frame reveal and scan regression.
- Do not merge/deploy based on CI alone. Explicit user approval remains required.

### Return to the existing roadmap
After PR #31 was merged, the remaining device QA and Phase 1.2G–1.2J work remain tracked separately. PR #32 addresses integration defects found after the merge; it does not complete Phase 1.2G. This UX patch does not establish a performance baseline, complete G-A/G-B/G-E, or authorize speculative decoder tuning.


## Scanner post-merge stabilization — PR #32 (2026-11-08)

**Status:** Implemented on `fix/scanner-lifecycle-preview-stability`; Draft PR #32. GitHub Actions run #107 passed on the source/test head and run #109 passed on the latest documentation-synchronized head. Local Windows and physical-device QA remain pending.

- Patch A: activate Home's full-screen transition class and pass the tap-origin style to the root element.
- Patch B: prevent stale pause continuations from overwriting a foreground resume; guard start-state cleanup by the active start promise.
- Patch C: stabilize Home and Stocktake preview flex sizing without changing stream resolution, frame rate, focus or decoder behavior.
- Patch D: add independent Home and Stocktake exit treatments. Camera teardown starts immediately; the presentation remains mounted only for its short exit motion. Reduced-motion mode bypasses the animation dependency.
- Regression guards cover Home transition wiring, continuous-mode persistence, single-result exit gating, lifecycle pause ownership, start-promise ownership, Stocktake exit wiring and preview geometry.
- The single-result session is marked inactive before feature callback handling, preventing foreground/visibility recovery from reacquiring the camera during the exit transition. Continuous mode is explicitly excluded from this close-on-result behavior.
- Protected: camera lease/refcount, 1280×720 ideal / 30 FPS target, autofocus, first-frame readiness contract, ZXing, ROI, 110 ms decode interval, validation, Home lookup, Stocktake save/manual/duplicate-row flows and persistence.
- CI evidence: run #107 (`42451111883`) passed full preflight on source/test head `b3df0a683ab76237c1908e4adb01f36109fc95c6`; run #109 (`42451179152`) passed on the prior docs-synchronized head `e2ce5f6b2c70c3e6e2cd3660cde5e46ff9f698d4`. The latest documentation-only synchronization commits have not yet been rerun through CI.
- Acceptance still open: local Windows/PowerShell preflight; iOS Safari/PWA and Android Chrome/PWA permission, deny/retry, rapid open/close, background/foreground, first-frame, result-close and business-flow checks. Test a low-end Android device and a smaller iPhone viewport. Do not merge/deploy until all gates pass and user approves.


## Phase 1.2I — Shared Scanner Engine Completion: lifecycle contract foundation

**Historical slice:** PR B — shared lifecycle event contract and adapter. Its original event vocabulary was superseded by the technical-only lifecycle separation at the top of this roadmap.

Scope:
- Define lifecycle event names and payload independently from internal session states.
- Add an optional adapter/observer boundary; preserve existing session API and keep feature presentation outside the engine.
- The original merged contract used `EXIT_REQUESTED` and `CAMERA_RELEASED`; the current contract replaces these with `SESSION_CLOSE_STARTED` and `CAMERA_LEASE_RELEASED`.
- The original optional `EXIT_PRESENTATION` event and callback were removed. Presentation completion is local to each feature and is never sent to the engine.
- `CAMERA_LEASE_RELEASED` is emitted after this session releases its lease; it does not imply the shared physical stream stopped if another lease remains.
- Current deterministic tests cover normal/early close, terminal event deduplication, observer isolation, recovery-close races, and module-local presentation gates.
- Update architecture, status and handoff documents in the same PR.

Protected / out of scope:
- No migration of Home or Stocktake presentation flows in PR B.
- No snapshot capture, Blob/object URL handoff, VFX, Connecting overlay or CSS transition changes; those remain PR A/PR C.
- No changes to camera constraints, autofocus, decoder, ROI, decode cadence, supported formats, validation, feedback, business callbacks, data/auth/persistence or deployment behavior.

Acceptance:
- Lifecycle events are optional and do not become a rigid required sequence.
- `CAMERA_LEASE_RELEASED` is observably ordered after this session releases its lease and before decoder disposal completes.
- `DISPOSED` follows completed engine teardown.
- Existing barcode/camera regression suite and new lifecycle contract tests pass, followed by TypeScript/production/Pages builds.
- PR remains unmerged and undeployed pending user approval and device validation.


## Torch investigation outcome — PR #53/#54 (2026-11-09)

- PR #53 established that the Galaxy S23 Ultra Android Chrome camera track did not expose Torch capability/settings.
- PR #54 tested a manual ON/OFF constraint pulse. Both requests were accepted by the API, but the physical LED did not illuminate.
- The result does not justify a production bypass or a native camera migration. Android devices that expose Torch will continue to receive the normal capability-gated Flash control.
- The cleanup branch removes the temporary diagnostic sampler, probe, UI and runbook. The production camera path and iOS behavior remain unchanged.


## Stocktake Import — Workspace v2 (2026-11-10)

**Deployed baseline:** PR #70–#73 merged; PR #73 merge commit `629c31c28e808cd5c3181c42b7d29e611a8ad890` is user-confirmed deployed.  
**Current proposal:** PR #74 — https://github.com/banjk124-hub/retailos-home/pull/74 (draft, not merged/deployed).  
**Branch:** `feat/stocktake-import-workspace-v2`.

Implementation order:
1. **Data contract:** optional product-name parsing and normalized unique product counts across zones/per zone.
2. **Interaction contract:** per-zone Ready/Saved/Copied/TXT downloaded/ZIP exported/Dirty/Invalid state, with stale output confirmations cleared on edit.
3. **Workspace layout:** contextual ZIP action beside zone list, dedicated TXT preview view, fixed viewport modal and bounded independent scroll regions.
4. **Responsive refinement:** desktop-first wide table workspace, compact mobile zone navigator and touch-safe actions; reduced-motion/power-conserve support.
5. **Verification:** parser/unit regression, full CI/preflight, real workbooks, desktop viewport matrix, iOS Safari/PWA and Android Chrome/PWA.

Protected: TXT payload, Excel decimal precision, code precedence, duplicate preservation, multi-file staging/merge/skip, source fingerprints/provenance, IndexedDB schema/history, existing Stocktake workflow, Scanner Engine, camera lifecycle, auth, snapshot/cache, service worker and deployment configuration.

Do not merge/deploy until CI, manual QA and explicit user approval are complete.
