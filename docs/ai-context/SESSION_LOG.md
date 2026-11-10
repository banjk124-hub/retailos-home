### 2026-11-10 — SCAN-03 module-owned preview region integration

- Branch: `feat/scan-03-module-region-integration`, based on SCAN-02 audit follow-up head `2f1373af02f45e5023cbddc1642863af972c22db`.
- Added a pure feature-level adapter that measures the module-owned reticle against the video element, resolves computed object-fit/object-position, clips to visible image content and maps to source-frame normalized coordinates.
- Added a shared feature-level binding hook for ResizeObserver, viewport/orientation and video metadata changes. Home and Stocktake pass their own refs; their markup and reticle styling remain independent.
- Added in-place `ScannerSession.setScanRegion()/getScanRegion()` state and exposed it through `useScannerEngine`. It does not recreate session, camera, decoder or frame loop.
- Decoder remains full-frame; no ROI-only decode is active. SCAN-04 is still gated on physical geometry QA.
- GitHub Actions run #309 passed the new preview-region suite, full preflight, TypeScript, production build and GitHub Pages build. Physical iOS/Android reticle alignment and post-deploy flow QA remain pending.

---

### 2026-11-10 — SCAN-02 post-merge technical audit

- Audited PR #59 and the merged main source at `891a3a6c8c85442d0b4a253c1fca43b36b590f1c`.
- Reviewed object-fit sizing, object-position crop, visible image intersection, mirror inversion, normalized source output, invalid-input behavior and platform/session boundaries.
- No runtime geometry defect found; no Home/Stocktake consumer or ROI decode is active in SCAN-02.
- Verified main CI run #299 passed full preflight, TypeScript, production build and GitHub Pages build. User confirms deployment and existing-flow smoke test without regression.
- Found a test-quality defect: the static DOM-boundary regex was over-escaped and did not detect ordinary `document.` / `window.` access. Follow-up strengthens the regex and self-tests the guard.
- Physical Home/Stocktake reticle alignment remains a SCAN-03 iOS Safari/PWA and Android Chrome/PWA acceptance gate.
- No camera, lifecycle, decoder, validation, cadence, UI, CSS or business-flow runtime code changed.

---

### 2026-11-10 — SCAN-02 pure preview-to-source geometry mapping
- Intent: implement the pure geometry transform required before Home/Stocktake ROI integration.
- Base: SCAN-01 merge commit `47b991de8a0040aa44e500aa6228127f9e59f0f6`.
- Branch: `feat/scanner-preview-source-geometry`.
- Files: `src/platform/scanner/scannerGeometry.ts`, `scripts/test-scanner-geometry.mjs`, `scripts/preflight.mjs`, and synchronized SCAN-02 architecture/roadmap/status/handoff/acceptance records.
- Behavior: adds pure mapping for CSS object-fit modes, normalized object-position, visible-content intersection and horizontal mirror. No runtime consumer is wired.
- Tests: deterministic tests cover portrait/landscape cover crop, object-position, contain letterbox, fill/none/scale-down, mirror and invalid input. PR CI pending.
- Unverified: real iOS Safari/Android Chrome geometry and reticle alignment are deferred to SCAN-03 after both modules are wired.
- Risks / rollback: low runtime risk; no camera/session/decoder/UI/CSS/business code changed. Revert the SCAN-02 commits if mapping contract review or CI fails.

---

### 2026-11-09 — PR #53 opt-in Android Torch diagnostics

- User confirms PR #52 merged/deployed; iOS works but Android Chrome on Samsung Galaxy S23 Ultra still hides Flash in both Home and Stocktake.
- Created `feat/scanner-torch-device-diagnostics` from main after PR #52 merge.
- Added privacy-safe active-track snapshots at first frame and +250 ms / +1000 ms / +2500 ms. Diagnostics include API availability/errors, torch capability/settings, ready/muted state, facing mode, dimensions, frame rate and applyConstraints availability; deviceId is excluded.
- Added an opt-in mobile diagnostic panel in both scanner modules, enabled only with `?scannerDebug=1`. Diagnostic sampling is disabled in normal mode and retains at most four samples.
- Diagnostics do not change support detection, camera constraints/acquisition, Torch commands, decoder, lifecycle, or module presentation.
- GitHub Actions run #245 (`42562743254`) passed full `npm run preflight` on head `d481cf8bd096bd92d43fac267cd6be453c6370a8`. An earlier run failed on a stale source assertion; the assertion was corrected and the current head passed. PR #53 is ready for review; no merge or deployment performed.

---

### 2026-11-09 — Android Torch control not visible after PR #51 deployment

- User confirms PR #51 merged/deployed and tested: iOS Flash toggles reliably; Android Flash control does not appear.
- Audited current main: `bindTorchTrack(stream)` was called immediately after the camera lease resolved, before assigning the stream to video, starting playback or observing a decoded frame.
- Chromium documentation notes that camera capabilities may only be available after the camera is actually streaming.
- Created `fix/scanner-torch-capability-timing` / PR #52. Torch discovery now occurs after video playback and first-frame readiness, with the existing session generation guard retained.
- Added privacy-safe diagnostics (`true` / `false` / `not-exposed` / `unavailable`, track ready state, facing mode and dimensions; no device IDs) and a regression test for late capability exposure.
- Android physical-device retest and full CI are pending. No merge/deploy performed for PR #52.

---
### 2026-11-09 — Optional scanner Torch capability (PR #51 (ready for review))

- Rebased work on current main base `6f821bde716c958147113f66d626c53882414108` after PR #49/50 documentation baseline.
- Created `feat/scanner-torch-control` and PR #51 (ready for review).
- Added active-track Torch capability/settings detection and explicit enable/disable using the advanced MediaStreamTrack `torch` constraint.
- Added typed session/hook state and guarded async completion by session generation and active track identity.
- Added independent Home and Stocktake flash controls; both remain hidden when the active camera track does not advertise support.
- Torch defaults off. Unsupported/rejected requests are non-fatal; camera startup and barcode scanning do not depend on Torch.
- Added dedicated Torch regression coverage and wired it into preflight.
- GitHub Actions run #232 passed full preflight on implementation/test head `83bf883054c3715d37f52ee858ec126471183899`; a prior run exposed TS2454, which was fixed by guarding command cleanup with active track + session generation.
- Physical iOS Safari/PWA + Android Chrome/PWA QA remains pending. No merge or deployment performed.

---
### 2026-11-09 — PR #49 post-merge video presentation ownership audit and documentation sync

- Audited current `main` after PR #49 merge: `1764c858a7d7855950ebe328a3a653d6935fa796`.
- Confirmed `UniversalScannerSession` no longer imports or invokes `waitForVideoPresentationLayout()`; `src/platform/scanner/videoPresentationLayout.ts` is deleted.
- Confirmed technical media readiness remains in `waitForVideoFrameReady()`: decoded media state, intrinsic frame dimensions, playback state and fresh-frame handling remain separate from DOM/container geometry.
- Confirmed startup ordering remains stream attachment → playback → usable first frame → `onPreviewReady` / lifecycle `READY` → decoder initialization.
- Confirmed Home (`BarcodeScanner.tsx` / `.barcode-scanner-view`) and Stocktake (`StocktakeScanner.tsx` / `.stocktake-scanner-preview`) still render their own keyed video elements and retain independent `.has-preview` reveal CSS. PR #49 did not modify their components or styles.
- Confirmed PR #49 scope did not alter camera acquisition/lease, technical lifecycle contract, Recovery, decoder, barcode validation/delivery, Home lookup, Stocktake form-fill/explicit-save, snapshots or close behavior.
- GitHub Actions run #200 passed full `npm run preflight`: scanner validation, lifecycle, presentation ownership, production build, Pages build and diff checks.
- User confirms PR #49 was merged, deployed and tested without issues. Device/deployment acceptance is user-reported; CI is source/build validation.
- Synchronized Architecture ADR-015, Roadmap, Implementation Status, Acceptance Checklist, AI Handoff, Project Context and this Session Log. Added `SCANNER_VIDEO_PRESENTATION_AUDIT_2026-11-09.md`; older audits remain as explicitly historical evidence.
- Documentation synchronization branch: `docs/scanner-video-presentation-ownership`, based on PR #49 merge commit. One stale Recovery source comment was corrected; no executable logic, runtime behavior, tests, configuration, dependencies or deployment files changed.

---

### 2026-11-08 — PR 47A restore module-owned scanner presentation

- PR #46 was merged at `f668b4ea188e37f11659c74c1663821cc9f75ddb`, then physical-device testing exposed a regression: iOS displayed black → undersized video → sudden resize; Android curtain transition visibly flickered/chopped.
- Created `revert/scanner-pr46-restore-module-presentation` from the merged PR #46 main head.
- Restored seven source/test files exactly from pre-PR #46 baseline `af694b6e7fc6bbcb0d4869ab33ab8f084bffeb73`: Home scanner component/CSS, Stocktake scanner component/CSS, Home UX CSS, scanner lifecycle test and scanner validation test.
- Removed `ScannerPreviewSurface.tsx` introduced by PR #46. The shared curtain/video class is removed.
- `isPreviewReady` remains engine-owned technical state; Home and Stocktake own their separate UI presentation and reveal behavior.
- No camera session, frame-readiness algorithm, decoder, lease, Recovery, lifecycle exit gate or business persistence code was changed.
- CI and physical-device retest remain pending. PR 47A must not be merged until CI is green and the restored behavior is verified on iOS and Android.

---
### 2026-11-08 — PR A Engine-owned Opening Transition implementation

- Audited main after PR #45 merge: `af694b6e7fc6bbcb0d4869ab33ab8f084bffeb73`.
- Confirmed engine session already validates a fresh video frame, calls `onPreviewReady` and publishes `READY` before decoder initialization. `useScannerEngine` exposes and resets `isPreviewReady`.
- Audit found presentation duplication: Home and Stocktake each applied their own `has-preview` class/visibility rules. Existing source explicitly avoids opacity transitions on the native video layer due to the iOS/WebKit camera-layer guard.
- PR A adds shared `ScannerPreviewSurface`: the video remains opaque; a sibling curtain inherits the preview container background and fades out only after engine READY.
- Both Home and Stocktake now consume the shared component. Their module UI no longer owns preview-ready CSS classes or reveal timing.
- Removed obsolete feature-owned video opacity/visibility rules and updated regression assertions to protect the engine-owned transition and native video guard.
- Run #184 initially failed because the lifecycle regression still asserted that Home/Stocktake directly rendered the `<video>` node. Updated that assertion to verify both features consume `ScannerPreviewSurface` and that the shared component owns the keyed video/ref and curtain. Run #185 passed the full local-equivalent `npm run preflight`: barcode validation, lifecycle tests, presentation readiness, TypeScript/Vite build, Pages build and diff checks.
- Physical iOS Safari/PWA and Android Chrome/PWA QA remain pending. No merge/deploy.

---

### 2026-11-08 — PR C2 Stocktake lifecycle implementation

- Base: main after PR #44 merge, `c2c9f42610d6cf45dfc422d2cbc6d7bcab795603`.
- Branch: `feat/scanner-c2-stocktake-lifecycle`; Draft PR #45.
- Added StocktakeScanner lifecycle observer wiring and a feature-owned four-milestone exit gate. Parent close is order-independent and idempotent.
- Preserved snapshot-before-teardown for manual and successful-result paths; no duplicate close was added to the single-result path.
- Added regression coverage for all 24 milestone orders, missing/duplicate milestones, observer wiring, animation ownership, snapshot order, form-fill, explicit save, manual entry, duplicate rows and reduced motion.
- GitHub Actions run #178 passed the full local-equivalent `npm run preflight` (barcode validation, lifecycle and Stocktake gate tests, presentation readiness, TypeScript/Vite production build, Pages build and diff checks).
- PR #45 remains Draft/open and unmerged. Physical iOS Safari/PWA and Android Chrome/PWA validation remains outstanding.

---

### 2026-11-08 — Post-merge Recovery verification and C2 audit

- Main baseline: 43f16379869b703e218e264040b859ab533c3193, merge commit for PR #43.
- User confirmed PR #43 is merged and tested; the former foreground preview-shrink defect no longer reproduces.
- Re-audited the current source: PR B contract is present; Home C1 consumes the observer and waits for EXIT_REQUESTED, CAMERA_RELEASED, DISPOSED, and EXIT_PRESENTATION.
- Stocktake already uses the shared engine and fresh-surface Recovery, but its feature component does not yet pass a lifecycle observer or emit EXIT_PRESENTATION. It currently calls parent onClose() directly from the animation-end handler.
- C2 scope: add the same order-independent/idempotent exit milestone gate to StocktakeScanner; preserve pre-teardown snapshot and single-result auto-close; do not alter StocktakeModule, lease handoff, decoder, CSS timing or business persistence.
- Found stale active documentation: Roadmap and Implementation Status still describe PR #38 as a Draft blocker; ADR-008/013 and handoff/context still describe C1 or the lifecycle foundation as unmerged and Stocktake as entirely on legacy lifecycle. These active summaries are being reconciled; historical log entries remain preserved.
- Documentation-only sync branch: docs/scanner-c2-audit-sync. No runtime code has been changed for C2 in this audit.

---
### 2026-11-08 — PR C1 Home lifecycle migration
- Branch: `feat/scanner-c1-home-lifecycle-migration`, based on main merge `191f44e9101cd75a3bf961f8475134efddbf4267`.
- Audited PR #36 integration and traced Home tap → lease request → session construction → result/manual close → snapshot → camera release → decoder disposal → animation completion.
- Changed the platform contract to accept a lifecycle observer rather than a feature-created adapter. `UniversalScannerSession` binds observer to its generated ID; `useScannerEngine` keeps observer current without restarting camera effects.
- Home now publishes `EXIT_PRESENTATION` through the closing session and waits for `EXIT_REQUESTED`, presentation completion, `CAMERA_RELEASED`, and `DISPOSED` before unmounting. Snapshot remains before teardown. Stocktake remains untouched.
- Updated scanner lifecycle regression assertions. GitHub Actions/local preflight/device QA not yet verified at log creation. Branch unmerged/undeployed.
- GitHub Actions run #147 passed the complete `npm run preflight` sequence: scanner regression tests, TypeScript/Vite production build, Pages build and diff checks.
- User-local Windows preflight and physical iOS Safari/PWA + Android Chrome/PWA QA remain outstanding. No merge/deploy without explicit approval.
- Next: synchronize the branch locally, preserve existing untracked files, run `npm run preflight`, then execute the Home manual-close and single-result flows on iOS and Android.

---

# RetailOS — Session Log

Use this log for concise, chronological handoffs across AI agents and chat sessions. Do not paste secrets, personal data, full logs, or entire code files here. Detailed phase history belongs in `IMPLEMENTATION_STATUS.md`.

## Latest session

### 2026-11-05 — Phase 1.2E local build verification
- User checked out `phase-1-2e-scanner-feedback`; remote tracking branch was up to date.
- `npm run build`: passed (TypeScript + Vite 6.4.4, 1,899 modules).
- `npm run build:pages`: passed (TypeScript + Vite 6.4.4, 1,899 modules).
- `git diff main...HEAD --check`: no output reported.
- Physical device feedback QA remains outstanding. Initial status also showed untracked `artifacts/` and a path named `tatus --short`; preserve and inspect, do not delete as cleanup.


### 2026-11-05 — Phase 1.2E scan feedback
- Branch: phase-1-2e-scanner-feedback (based on pushed main commit ef7b6ff14e2cdfeeee24a7d6349f19b7b3405c1a).
- Scope: strengthen accepted-barcode confirmation with a slightly louder short beep and optional short haptic pulse.
- Source changes: scannerAudio.ts gain target 0.16 → 0.24; new scannerFeedback.ts coordinates audio and 25 ms navigator.vibrate when available; useScannerEngine.ts emits feedback only after payload validation and mode/cooldown acceptance; BarcodeScanner.tsx exposes hapticFeedback (default true).
- Protected: camera lifecycle, decoder cadence/resolution, Home lookup, Stocktake form-fill/explicit-save, duplicate Stocktake records, manual entry, data/auth/session contracts, PWA and deployment settings.
- Validation: source changes and docs were written to the branch through GitHub. No local TypeScript/build/test or device QA has been run by this session. The repository currently has no dedicated test/lint script.
- Next action: local checkout, run npm run build, npm run build:pages, git diff --check, then verify Android vibration/audio and iOS graceful fallback. Do not merge or deploy until user accepts the result.


### 2026-11-05 — Scanner foundation and continuity setup
- Branch: `phase/1.2-scanner-foundation-and-project-continuity`
- Base: `main` at `3c75f4886c2adeeaa216fd030f11f3bf8b5fd198`
- Objective: stabilize scanner lifecycle/format validation and establish durable cross-AI project governance.
- Initial source findings:
  - `useScannerEngine.ts` guards concurrent starts only while `startingRef` is true; it does not guard an already attached decoder.
  - visibility/pageshow/focus events can request a restart while asynchronous startup is in flight.
  - ZXing reader is constructed without a format whitelist.
  - feature callback receives `result.getText()` without a scanner-level format/payload validation boundary (resolved on the Phase 1.2 branch).
  - `cameraSession.ts` uses a global stream singleton and generation token; no explicit session owner/lease.
  - package scripts contain build and preview commands but no test/lint command.
- Scope: Phase 1.2A correctness slice plus durable handoff/roadmap/decision/process documents.
- Protected contracts: Home cached lookup; Stocktake form fill and explicit save; duplicate Stocktake rows; manual entry; IndexedDB, auth/session, Apps Script, service worker, deployment path.
- Validation state: GitHub source/diff review only. No local working-tree inspection, npm install, build, automated test, or physical-device QA has been performed.
- Next action: user checks out this branch locally, inspects local status, runs `npm run build` and `npm run build:pages`, then exercises scanner on Android/iOS. Report failures for a minimal patch. Merge only after user accepts local verification.


### 2026-11-06 — Phase 1.2F GitHub branch implementation
- Created `phase-1-2f-camera-lifecycle` from `main`; branch remains unmerged and undeployed.
- Updated `cameraSession.ts` to publish stream-identity notifications when the active stream loses all live video tracks.
- Updated `useScannerEngine.ts` to ignore stale stream events, invalidate pending async startup/decoder work, stop controls, detach the matching video source, and allow one automatic recovery attempt per open session. Further interruption requires explicit user retry.
- Updated Architecture ADR-006, Roadmap Phase 1.2F, Implementation Status and AI Handoff. Project Context also records the active engineering focus.
- No post-patch Local build, automated test, browser simulation, or physical-device QA has been run. The user's earlier Local preflight passed before these changes and must be rerun after synchronization.
- Preserve the Local untracked paths `artifacts/` and `tatus --short`; inspect before staging or cleanup.
- Next: synchronize branch to Local, review the full diff, run `npm run preflight`, then perform real Android/iOS camera lifecycle checks. No merge or deployment.
### 2026-11-06 — Phase 1.2F stale camera ownership hardening
- During code review, identified that stale async startup cleanup could globally release the shared camera stream after a newer scanner instance acquired it.
- Added optional expected-stream identity to releaseCameraStream() and changed scanner startup cleanup to release only its own stream. Stale startup errors are no longer surfaced as current-session errors.
- Files changed: src/shared/services/cameraSession.ts, src/features/scanner/hooks/useScannerEngine.ts.
- Validation: source review only. No post-patch local preflight, automated test, or physical-device QA has been run.
- Next: synchronize latest branch head to Local, inspect diff, rerun npm run preflight, then perform Android Chrome/iOS Safari lifecycle QA. No PR, merge, or deployment yet.
- Stream-scoped release deliberately does not invalidate or clear a separately pending getUserMedia request; only the no-argument global release changes the request generation and clears the pending request.


### 2026-11-07 — P0 scanner lifecycle serialization patch
- Branch: `fix/scanner-p0-lifecycle-serialization`, based on main `7f35fc095dd89741919005af067ca3f4285c6ea6`.
- Added reference-counted `CameraStreamLease` ownership; scanner sessions no longer release a shared stream globally. Global invalidation remains for app-level logout/forced shutdown.
- Updated session teardown to release its own lease and corrected the hook path that could return a settled stale startup promise instead of starting again.
- Updated Architecture ADR-007, Roadmap, Implementation Status and AI Handoff to describe the current source state and explicitly supersede the previous no-lease decision.
- Verification not run: no local Node/npm runtime was available in this editing session; no build, tests, browser or physical-device QA is claimed.
- Next: inspect full diff, run `npm run preflight`, add lifecycle regression tests, and test on iOS Safari and Android Chrome. Branch remains unmerged and undeployed.



### 2026-11-07 — Scanner roadmap expansion (documentation-only plan)
- Scope: record the consolidated scanner roadmap and the newly agreed Phase 1.2G rendering/motion/interaction work, plus dependent decoder and cross-platform phases.
- Planned phases: 1.2G Rendering, Motion & Interaction Performance; 1.2H Decoder Performance Optimization; 1.2I Decoder Capability Enhancement; 1.2J Cross-platform Validation.
- Execution order: P0 real-device QA; diagnostics/performance baseline; 1.2G audit and targeted fixes; 1.2H only if profiling identifies decoder cost; 1.2I angle/perspective capability; final 1.2J validation.
- Current verified baseline: P0 PR #24 merged to main at `0ece0c95523a3846f1f2e06ac9d732c3e5a2f2d8`; GitHub CI passed TypeScript and production preflight. Physical iOS/Android QA and deployment status are not asserted.
- Source-aligned correction: current decode cadence is 110 ms; historical 70 ms notes are stale.
- This change is documentation-only. No application source, dependency, configuration, deployment or production behavior changed.
- Next: review this documentation branch and its CI; merge only with explicit user approval. Then run P0 device QA and collect performance baseline before implementation.


### 2026-11-07 — Phase 1.2G-A instrumentation and G-B source audit
- Created branch `feat/scanner-phase-1-2g-instrumentation` from `main` (`d17115046922d157405694f86afcf5951445a179`).
- Added camera startup/readiness/result/teardown timing, decoder stage cost aggregation, callback-gap, long-task and layout-shift telemetry where supported, plus UI phase-commit interval logging.
- Added mounted guards for asynchronous scanner hook state callbacks and post-await state updates.
- Audited motion source: sheet entrance 420 ms; sheet/backdrop enter/exit 200 ms; several Home library card transitions 280–360 ms; layered blur/shadow effects remain candidates only.
- No camera constraints, decoder cadence/strategy, CSS motion durations, feature data contracts, or persistence behavior were changed.
- GitHub CI run #57 initially caught stale first-result timing references; corrected on branch. GitHub CI run #60 passed scanner validation, TypeScript/production build, GitHub Pages build and whitespace checks; the frame-callback-gap measurement was then corrected to observe each scheduled callback, and GitHub CI run #63 passed on that latest source. Local build/preflight, browser profiling and real-device measurements remain outstanding. Telemetry does not include barcode payloads or device identifiers.
- Next: inspect full diff, run available build/preflight/scanner validation, then collect Android Chrome and iOS Safari traces before implementing any measured optimization. Branch remains unmerged and undeployed.

### 2026-11-07 — Scanner camera startup Patch 1: early preview

- Branch: `fix/scanner-phase-1-early-preview`, based on main `3a6e9afc76d7e49c69b27c05371087ba6c29f706`.
- Source commit: `807ec386043a1cbfe5fccc9ef187b0c7b1fd5e5b`; Draft PR #29 remains open, unmerged and undeployed.
- Root cause: the scanner UI placeholder was bound to the full startup process, which waits for decoder initialization; the camera video could already have a usable frame while the placeholder remained visible.
- Implemented `onPreviewReady` between first usable video-frame readiness and decoder creation; added separate `isPreviewReady` hook state; Home and Stocktake now reveal the video/clear the placeholder at preview readiness.
- Files changed: `src/platform/scanner/contracts.ts`, `src/platform/scanner/universalScannerSession.ts`, `src/features/scanner/hooks/useScannerEngine.ts`, `src/features/scanner/components/BarcodeScanner.tsx`, `src/features/stocktake/components/StocktakeScanner.tsx`, `src/styles/home-ux.css`, `src/features/stocktake/components/stocktake.css`.
- CI run #79 (`42388939459`) passed the TypeScript and production builds job, including locked dependency install and local-equivalent preflight.
- No autofocus, camera constraint, decoder, ROI, cadence, barcode validation, Home/Stocktake business flow or persistence changes.
- Real-device QA has not been performed. Next: local preflight and iOS Safari/PWA + Android Chrome/PWA first-open/resume validation. Keep PR #29 unmerged and undeployed pending review and explicit user approval.


### 2026-11-07 — Scanner Phase 1 Patch 2: non-blocking autofocus

- Created branch `fix/scanner-phase-1-2-autofocus-nonblocking` from `main` at `93eff4fa10154ea3d3499e12d946309850ab1164` (after Patch 1 / PR #29 merge).
- Root cause: `cameraSession.ts` awaited `requestContinuousAutofocus()` inside the shared `getUserMedia()` resolution path, so a slow `applyConstraints()` delayed camera lease delivery and video preview startup.
- Changed acquisition order: validate the live video track, register its `ended` listener, log safe camera settings, launch optional autofocus asynchronously, then return the stream without waiting for autofocus.
- Retained capability detection, focus status classification and safe diagnostics. Late focus results are ignored for stale generations/streams; unexpected diagnostic rejections are caught.
- Added delayed-`applyConstraints()` regression coverage in `scripts/test-scanner-validation.mjs`; it asserts lease acquisition completes while autofocus remains unresolved and track-ended monitoring is already registered.
- Updated Architecture ADR-009, Roadmap Patch 2, Implementation Status, AI Handoff and Project Context.
- Verification status: code and tests authored remotely; local preflight, CI and physical iOS/Android QA have not yet been run. No test/build pass is claimed.
- Next: local branch synchronization and full diff review, `npm run preflight`, then first-open/resume/focus and track-ended QA on iOS Safari/PWA and Android Chrome/PWA. Do not merge or deploy without explicit approval.


### 2026-11-07 — Patch 2 automated verification
- GitHub Actions run #84 (`42393062148`) completed successfully.
- Passed: `npm ci`, scanner barcode/luminance/camera regression suite including delayed-autofocus non-blocking test, TypeScript + production build, GitHub Pages build, unstaged and staged diff checks.
- Non-fatal warnings: `@zxing/library@0.23.0` declares Node >=24 while CI currently uses Node 22; Vite reports a >500 kB minified chunk. Neither failed preflight; no dependency/runtime/chunking changes were made.
- Remaining: synchronize branch locally, inspect diff and run Windows/PowerShell `npm run preflight`; then test real camera first-open, resume, autofocus and track-ended behavior on iOS Safari/PWA and Android Chrome/PWA.


### 2026-11-07 — Patch 2 final PR-head CI
- Latest branch head `a31d40315eaeb9f90ce209da4fef6341e8836025` passed GitHub Actions run #85 (`42393150965`).
- Full preflight passed on the documentation-synchronized PR head. Local Windows/PowerShell and iOS Safari/PWA + Android Chrome/PWA physical-device QA remain required.

### 2026-11-08 — Supplemental Scanner UX Transition
- Audited main at 36b8ca7457c9df7bb3f26105660605c66070b9ea before implementation.
- Created feat/scanner-ux-transition from that exact main commit; Draft PR #31 remains unmerged and undeployed.
- Home and Stocktake opening handlers now initiate camera acquisition directly from the tap and pass a cancellable, single-claim lease request to the mounted scanner session.
- Added independent entrance/wait treatments: Home is full-screen without a camera card/frame; Stocktake retains its existing framed surface and layout.
- Kept first-frame preview readiness separate from decoder/scanning readiness. Removed obsolete Stocktake legacy scanner selectors and superseded Home card/layout CSS.
- Added automated regression coverage for cancelled unclaimed requests, lease transfer and duplicate-claim rejection.
- Updated Architecture (ADR-010), Roadmap, Implementation Status, AI Handoff and Project Context in the same branch.
- GitHub Actions run #89 (42400411255) passed the full repository preflight on source head 9e2e1bbe568d0d7be41d253fde4dfd2218634955.
- Physical iOS Safari/PWA and Android Chrome/PWA QA, local Windows/PowerShell preflight, weak-device motion review and full user acceptance remain outstanding.
- Next: inspect/sync branch locally only after preserving existing working-tree changes; run npm run preflight; complete device QA. Do not merge or deploy without explicit approval.
- After this supplemental patch is accepted, resume the existing Phase 1.2G–1.2J roadmap.


### 2026-11-08 — Post-merge Scanner stabilization (PR #32)

- Re-audited merged main at `56fbd1dab5e6fafd1976a7932a7a5a64e96c1bd4` before changing source.
- Confirmed Home's transition class/style was not attached to the root component, so its full-screen CSS could not take effect.
- Removed post-await UI writes from `pauseScanner()`; the session's synchronous suspended state callback remains the source of truth. Guarded start-state cleanup by ownership of the active promise.
- Stabilized only Home/Stocktake preview flex geometry.
- Added independent Home and Stocktake exit transitions. The camera session begins closing immediately; animation does not own camera teardown. Reduced-motion mode bypasses animation.
- Added source-level regression assertions while preserving existing camera/decoder/business tests.
- Branch `fix/scanner-lifecycle-preview-stability`, Draft PR #32. Main unchanged, no deployment.
- Pending: CI, local Windows preflight, iOS Safari/PWA + Android Chrome/PWA real-device QA, and review of the complete diff before merge.

### PR #32 CI verification — 2026-11-08
- GitHub Actions run #107 (`42451111883`) passed on source/test head `b3df0a683ab76237c1908e4adb01f36109fc95c6`.
- Passed: locked dependency installation and full `npm run preflight`, including scanner regression suite, TypeScript/production build, GitHub Pages build and diff checks.
- This confirms the recorded code/test head. Subsequent documentation-only commits, if any, require the latest branch head to be checked separately.
- Local Windows/PowerShell preflight and physical iOS Safari/PWA + Android Chrome/PWA QA remain outstanding.


### PR #32 documentation synchronization — 2026-11-08
- Reconciled stale PR #31 status references: PR #31 was merged to main before PR #32 was created; its device QA remains outstanding.
- Updated ADR-010/ADR-011, roadmap, implementation status, handoff and acceptance checklist to match the current branch and verification evidence.
- Clarified that Home continuous scan mode must not close on each result; only single-result mode uses the result exit transition. Single-result sessions become undesired-active before feature callback handling to prevent foreground recovery from reopening the camera during exit.
- GitHub Actions run #109 (`42451179152`) passed the latest docs-synchronized PR #32 head `e2ce5f6b2c70c3e6e2cd3660cde5e46ff9f698d4`, including locked dependency install, scanner regression suite, TypeScript/production build, GitHub Pages build and diff checks.
- Still outstanding: local Windows/PowerShell `npm run preflight`; physical iOS Safari/PWA and Android Chrome/PWA QA; weak-device visual/performance review. PR #32 remains Draft, unmerged and undeployed. Do not merge/deploy without explicit user approval.


### Documentation CI boundary clarification — 2026-11-08
- Run #109 passed on head `e2ce5f6b2c70c3e6e2cd3660cde5e46ff9f698d4` before the latest documentation reconciliation commits.
- The documentation-only commits that reconcile PR #31 merged status, PR #32 lifecycle details, continuous-scan behavior and acceptance gates have not yet been rerun through CI. Do not describe run #109 as validating the current documentation head.
- Current last documentation commit in this synchronization batch: `bc3e78e31742d8430cab7754f5328a55ebbed569`. Local preflight and device QA remain outstanding.


### 2026-11-08 — Scanner source audit and phase realignment (documentation-only)

- Baseline inspected: main `c7146b55f0c2210cd7b8474c6a72b1c915985793` after PR #32 merge.
- Confirmed Home and Stocktake both initiate `requestCameraLease()` directly in the initiating tap handler before mounting scanner presentation; single-claim handoff passes the request into the shared session. Remaining wait is browser/hardware acquisition, first usable frame and decoder initialization.
- Identified likely exit fade mismatch: camera teardown detaches video immediately while dark fixed overlay continues a 180 ms fade. Visual fix must not delay camera release.
- iOS layout jump remains unproven; Home percentage-height card in fixed inset root differs from Stocktake dynamic viewport sizing. Next diagnostic is visualViewport/safe-area/root-card geometry during animation.
- Reclassified Phase 1.2G as bounded source instrumentation/audit, with device evidence and issue-specific remediation still open.
- Re-scoped Phase 1.2I as Shared Scanner Engine Completion; introduced scanner-first Low/Mid/High adaptation as Phase 1.2J and cross-platform release validation as 1.2K.
- Current source passes `profile: 'HIGH'` unconditionally; adaptive profile selection is not implemented. Thermal/battery APIs are not universal; use conservative proxies and never trade scan accuracy/correctness.
- Added `SCANNER_SOURCE_AUDIT_2026-11-08.md` and synchronized Roadmap, Implementation Status, Architecture, AI Handoff, Acceptance Checklist and Project Context.
- No runtime code, tests, dependency, configuration, data contract, PWA or deployment file changed. No local preflight, CI, browser trace or physical-device QA was run in this documentation audit.
- Branch: `docs/scanner-source-audit-device-profiles`; unmerged and undeployed. Next: review documentation diff; then handle iOS geometry and exit visuals as separate scoped code changes after evidence.


### 2026-11-08 — PR B scanner lifecycle contract foundation

- Based on main `fa0d007d42bf480799e29b6003aeea2b2cd52112`; branch `feat/scanner-lifecycle-contract`.
- Added public lifecycle event vocabulary and optional `ScannerLifecycleAdapter`; engine state enum remains separate.
- Engine milestones are wired at resource boundaries. Camera release notification occurs after lease release and before decoder disposal; DISPOSED follows teardown.
- EXIT_PRESENTATION is exposed as an optional adapter milestone for feature-owned presentation. It does not make animation part of engine teardown.
- Added focused lifecycle regression test and wired it into preflight.
- Synchronized Architecture ADR-013, Roadmap Phase 1.2I slice, Implementation Status, AI Handoff and Project Context.
- Verification not run in this remote editing step; CI and local Windows/device QA are pending. Branch remains unmerged and undeployed.
\n\n### 2026-11-08 — PR B CI failure investigation and fixes\n- Inspected GitHub Actions run #130 and its job log. Existing scanner validation passed; the lifecycle test failed on the assertion `DISPOSED follows decoder disposal`.\n- Determined that assertion compared source-file declaration order across methods rather than runtime order. Replaced with method-scoped ordering checks.\n- Found and fixed a separate hook integration defect: optional lifecycle adapter was typed but not destructured/forwarded to the session. Added explicit regression guards.\n- Added coverage for repeated readiness/scanning milestones on resume. Latest corrected CI result pending.\n\n- CI run #137 caught an over-escaped newline assertion in the hook-wiring regression test. Replaced it with whitespace-independent checks for destructuring and forwarding. Latest CI pending.\n\n\n### 2026-11-08 — PR B CI green\n- Latest branch head `3e67397260993778a69eb1a5d2eb7a8216bd3044` passed GitHub Actions run #142 (`42465469769`), including scanner barcode tests, lifecycle contract tests, TypeScript/production build, Pages build and diff checks.\n- Earlier test-only failures were traced and corrected; no CI failure is being hidden or bypassed.\n- Local Windows/PowerShell and real-device iOS Safari/PWA + Android Chrome/PWA QA remain pending. PR #36 stays Draft and unmerged.\n

### 2026-11-08 — Technical-only scanner lifecycle separation

- Main baseline: `7f35943b33fc8ce990be0ebe172e0712ee98572d`; task branch: `refactor/scanner-lifecycle-technical-only`.
- Reworked the platform lifecycle vocabulary to technical-only events: `SESSION_CLOSE_STARTED` and `CAMERA_LEASE_RELEASED` replace the ambiguous exit/release names; `EXIT_PRESENTATION` is removed entirely.
- Removed `notifyExitPresentation()` from the session contract, platform session and React hook. Removed the presentation-retention reference from the hook; a narrowly scoped recovery-retired reference remains solely to preserve terminal close signals if a close races foreground recovery.
- Home and Stocktake still wait for their own local animation/presentation completion plus technical close, lease-release and disposal signals before parent unmount. Their CSS, animation names/timing, snapshots and result/business callbacks are unchanged.
- Updated lifecycle regression tests and current architecture/status/handoff documentation. Historical PR B/C2 records remain as historical evidence and are explicitly superseded by the current contract.
- Verification pending on PR branch: scanner lifecycle tests, full `npm run preflight`, GitHub Actions, and user iOS/Android smoke test. No merge or deployment performed.


### PR #48 CI verification — 2026-11-08

- Corrected the first CI-discovered regression-test guard: Home's local close gate was expressed as an early-return condition, while the source assertion expected the positive milestone conjunction. The production behavior was already equivalent; the guard and expression were aligned for explicit readability.
- GitHub Actions run #193 (`42500947176`) passed on head `88d898735105d5bfc628503637cc85d9707bf85e`.
- Full `npm run preflight` passed: barcode validation regression, lifecycle contract regression, TypeScript/production build, GitHub Pages build and diff checks.
- The initial run on the preceding head failed only at the new Home source assertion; the failure was investigated from the job log and corrected rather than bypassed.
- Local Windows/PowerShell preflight and physical iOS Safari/PWA + Android Chrome/PWA smoke tests remain pending. PR #48 stays open, unmerged and undeployed.


### 2026-11-09 — PR #54 Torch compatibility probe

- Audited merged main after PR #53. The Android sample confirms an active rear camera track at 1280×720 / 30 FPS, `getCapabilities()` and `applyConstraints()` APIs available, but no exposed `torch` capability or setting. The standard adapter correctly exits before sending Torch constraints, so actual control compatibility remained untested.
- Created `feat/scanner-torch-compatibility-probe` from main `2fc4be24bc7f6a77c9b7f9fee07a40ea9a7969de`.
- Added a diagnostics-only, explicit 1.2-second Torch ON pulse followed by an OFF attempt. The probe preserves current constraints, reports request acceptance/errors and settings before/after, and does not mutate normal Torch support state.
- Added the same probe control/result display to Home and Stocktake diagnostics panels; no production Flash visibility changes.
- Added regression coverage for not-exposed capability, constraint preservation, ON→OFF ordering and unchanged capability state.
- CI/preflight and physical Android/iOS verification are pending. Do not merge or deploy until the latest CI head is green and the user reviews the device result.


### 2026-11-09 — Close Torch investigation and retire temporary code

- Confirmed PR #54 is merged into main at `1f67dc512d18a90a3ee90d9851401feae6dca705`; earlier PR #54 documentation incorrectly described it as unmerged.
- Physical Galaxy S23 Ultra / Android Chrome result: Torch ON and OFF `applyConstraints()` requests both resolved, but the physical LED did not illuminate and `settings.torch` remained unexposed.
- User confirms iOS Flash works normally. Decision: retain the existing capability-gated PWA implementation; unsupported devices show no Flash control and continue scanning.
- Created cleanup branch `cleanup/remove-torch-investigation-code` from current main.
- Removed the PR #54 capability-bypass pulse, probe/session contracts, probe hook state and temporary UI action.
- Removed PR #53 timed capability sampling, timers, debug query handling, diagnostic panel and runbook. Kept production capability detection after first-frame readiness, production Torch ON/OFF, session guards and regression coverage.
- Updated Architecture ADR-018, Implementation Status, Roadmap, Torch audit, AI Handoff, Project Context, Acceptance Checklist and this Session Log to reflect the final decision and evidence.
- CI/preflight and final diff audit remain pending on the cleanup branch. No merge or deployment performed.


- PR #55 opened: https://github.com/banjk124-hub/retailos-home/pull/55.
- Initial CI run #42572298358 found three stale debug-state resets in `closeScanner()`; removed those setters without changing production Torch state cleanup.
- Latest head `53b14c7b060b172be2ad203675c81071f3ae2553` passed GitHub Actions run #42572378379, including scanner regression suites, TypeScript/Vite production build, GitHub Pages build and full preflight.
- User later confirmed PR #55 was merged and deployed; this supersedes the earlier pending-status note.


### 2026-11-09 — Shared Scanner settings audit and implementation

- User confirmed PR #55 was merged and deployed; current `main` baseline inspected at `841e406966748bb3c9a012f5d4faf7da272facd4`.
- Audited Home Settings navigation, QA Monitor, Home Scanner, Stocktake Scanner, `useScannerEngine`, platform contracts, Web Audio and vibration services.
- Findings: Settings previously opened QA Monitor directly; gear icon was represented by `SlidersHorizontal`; feedback defaults were true but feature options could override them; beep gain was fixed at 0.24; haptics used one 25 ms pulse.
- Created `feat/scanner-settings-hub-feedback-controls`.
- Added a versioned device-local settings store, reactive hook, Settings Hub, Scanner settings panel and mobile-first styles.
- Default beep level 50% maps to existing gain 0.24; 0% mutes; 100% maps to 0.48. Vibration remains enabled by default and uses the existing 25 ms pulse where `navigator.vibrate` is available.
- Updated shared feedback to read current preferences at each accepted barcode result. Removed per-feature audio/haptic overrides from the hook and platform contract.
- Added `scripts/test-scanner-settings.mjs` and registered it in preflight.
- Protected: camera acquisition/lease, decoder, barcode validation, accepted-result gate, Home lookup, Stocktake form-fill/explicit-save, Torch and scanner lifecycle.
- CI and physical-device QA are pending. No merge or deployment performed.


- Opened Draft PR #56: https://github.com/banjk124-hub/retailos-home/pull/56.
- GitHub Actions run #42575410311 passed the full local-equivalent `npm run preflight` on latest code head `47ff115a7fcc631b24ccda3c0b0e3e0800439cf7`, including the new Scanner settings regression test, existing scanner barcode/lifecycle/Torch/presentation tests, TypeScript/Vite production build and GitHub Pages build.
- At this historical point PR #56 was still Draft and unmerged; this status was superseded by merge commit `5eee1a6a565f6263907541dac6af6b4ba77b37be`. Physical Android vibration/beep-level QA and iOS beep/unsupported-vibration QA remain pending.


### 2026-11-09 — Post-merge Scanner audio audit and synchronization

- Re-read current `main` source after PR #56 merge commit `5eee1a6a565f6263907541dac6af6b4ba77b37be`; confirmed the Settings Hub, shared store, feedback service and both Scanner consumers are wired as intended.
- Confirmed PR #56 final head `0790e4f7d04ccaa8b6500e2e8c59b99131504318` passed full preflight in GitHub Actions run #42575773839. Merge is verified; deployment is not inferred.
- Audit finding: existing Scanner settings tests asserted source patterns and persistence but did not execute the production audio module against AudioContext/GainNode behavior.
- Created follow-up branch `test/scanner-audio-runtime-and-doc-sync` from the PR #56 merge commit.
- Added `scripts/test-scanner-audio-runtime.mjs` with a mocked AudioContext to verify zero mute, 50% gain 0.24, 70% gain 0.336, 100% gain 0.48, gesture unlock, preview/current-setting synchronization, shared feedback and non-fatal missing Vibration API.
- Registered the runtime suite in `scripts/preflight.mjs`.
- Kept the production gain curve unchanged pending controlled physical-device A/B testing; do not infer perceived loudness from the numeric gain alone.
- Synchronized AI Handoff, Implementation Status, Roadmap, Architecture ADR-018/019/020 and Acceptance Checklist with verified PR #55/#56 merge states and the outstanding physical QA gates.
- Protected camera, decoder, barcode, Torch, lifecycle, Home lookup and Stocktake form/save behavior. CI for this follow-up branch remains pending.

- Final documentation-synchronized PR head `9b0d76a5931a85bd336629348ec98bbd96fb86b4` also passed full preflight in GitHub Actions run #42648085229. No production runtime source changed in this follow-up.


### 2026-11-10 — SCAN-01 input and module config contract
- Intent: define the module-to-scanner boundary before geometry mapping and ROI decode changes.
- Branch: `feat/scanner-input-module-config-contract`, based on main `09cd3b5117ea38a16dd991f74320835b67ea04b5`.
- Files: `src/platform/scanner/contracts.ts`, `docs/ai-context/SCAN_01_INPUT_CONTRACT.md`, plus architecture/decision/roadmap/status/handoff/acceptance records.
- Behavior: platform-neutral contract types only; no runtime behavior, camera constraints, decoder, lifecycle, UI or business flow changed.
- Contract: preview-content normalized region, source-frame normalized region, module config and explicit camera preferences; default camera request remains environment 1280×720 30 FPS.
- Checks: pending full preflight and GitHub Actions on PR head.
- Unverified: no physical-device QA is required for this type-only change; later SCAN-02/03 require iOS and Android mapping validation.
- Risks / rollback: low; revert the SCAN-01 commit if contract review finds coordinate-space ambiguity before dependent PRs begin.


### 2026-11-10 — SCAN-04 strict module-reticle ROI decoding

- Baseline audited: main merge commit `4804a0b0f06113e43a06e8b171d05dbad6fb1a8f` (SCAN-03). User confirms iOS and Android geometry and existing scanner-flow checks passed without detected issues.
- Audit found SCAN-03 documentation still described PR #61 as Draft and physical geometry QA as pending; reconciled SCAN-03 status across its design, architecture, decision, roadmap, implementation and acceptance records.
- Source finding: ZXing still decoded the full frame first, then tried a fixed centered 82% × 66% crop; it did not consume the measured session ROI.
- Added strict decoder input `{ timestamp, scanRegion }`; each frame passes the latest defensive session region to ZXing.
- Added pure source-normalized-to-pixel crop resolver with validation, floor/ceil boundary rounding and source-frame clamping.
- Replaced full-frame and fixed-centered passes with direct ROI draw/decode. Missing/invalid geometry returns no result; no full-frame fallback.
- Preserved camera/session lifecycle, 110 ms cadence, supported symbologies, validation/result delivery and Home/Stocktake business behavior.
- Added strict ROI regression test and registered it in preflight; added SCAN-04 design, ADR-025, roadmap, implementation status, acceptance and handoff updates.
- GitHub Actions run #324 passed TypeScript, production/Pages builds and full preflight on PR head `31405dae3cd2eb358dce1e11868e861ac4ace1a8`; the subsequent status-only documentation update does not change executable code. Physical post-deploy iOS/Android barcode accuracy/performance evidence remains pending. No merge or deployment performed.


### 2026-11-10 — SCAN-05/06 consolidated implementation and audit

- Confirmed the existing 180° capability before adding new code: ZXing `OneDReader` reverses 1D scanlines under `TRY_HARDER`; EAN-8/EAN-13 inherit this path. Runtime baseline fixture covers Code 128 0°/180°; EAN inheritance is guarded separately.
- PR #63 baseline CI run #337 passed.
- SCAN-05 PR #64 adds a single clockwise 90° ROI transform every third valid ROI frame after upright miss. This normalizes 90°/270° input through the existing 180° scanline reversal. CI run #338 passed.
- SCAN-06 PR #65 adds Sobel structure-tensor estimation and bounded 1.2°–12° deskew after upright/orthogonal misses. Synthetic Code 128 at ±5°/±8° and combined 90°/270° + skew passed.
- Final recorded head `7bd77ffd7acd6a04e65b731b3ffa3a3e9546a7f1`; CI run #342 passed full preflight, TypeScript, production and Pages builds.
- Scope audit: no camera/session/lifecycle, ROI geometry, cadence, UI/CSS, validation, Home lookup, Stocktake save/persistence, dependency or deployment changes.
- Consolidated PR #65 is Draft/open; PR #63/#64 remain staged drafts and are included in #65. No merge/deploy performed.
- Remaining acceptance: physical iOS Safari/PWA and Android Chrome/PWA tests for 0°/90°/180°/270° and ±5°/±8°, plus latency/CPU comparison on weak devices. CI is not device QA.


### 2026-11-10 — Final consolidated SCAN-05/06 review

- Rebased the full SCAN-05/06 source, tests and synchronized technical documentation onto the current `main` tree in final branch `feat/scan-05-06-final-consolidation`.
- Final consolidated PR #66 is Draft/open, mergeable and not merged/deployed. Staged PRs #63/#64/#65 were closed without merging as superseded by #66.
- Final head `98796b1cb8d8a4bd30c9eb59a975c7f4515bece6`; CI run #350 passed the complete preflight, TypeScript, production and Pages builds. Logs confirm the 0°/180° baseline, 90°/270° rotation and ±5°/±8° deskew suites passed.
- Scope audit found no changes to camera/session/lifecycle, strict ROI geometry, 110 ms cadence, UI/CSS, barcode validation, Home lookup, Stocktake save/persistence, dependencies or deployment settings.
- Repository hygiene incident: two SCAN-05/06 design Markdown files were briefly created on `main` by the GitHub file-creation action despite the intended branch target. Both files were immediately deleted from `main` in two revert commits. Comparing the current `main` tree against the pre-incident baseline `34c5a1da03df50f6e9da9827ffb580e753661251` returns no changed files; no source code or production behavior was changed on `main`. The design files are present on the final PR branch.
- Remaining acceptance: physical iOS Safari/PWA and Android Chrome/PWA matrix (Home + Stocktake, 0°/90°/180°/270°, ±5°/±8°) and low-end latency/CPU measurements. Do not merge/deploy before device acceptance.

- After rebasing the final branch and closing staged PRs, consolidated PR #66 CI run #360 passed the full preflight on its current head. PR #66 remains Draft/open pending physical iOS/Android QA; no merge/deploy was performed.

### 2026-11-10 — SCAN-05/06 audit follow-up on consolidated PR #66

- Re-opened the current PR #66 head and audited runtime decoder scheduling, regression tests, current handoff, acceptance checklist and SCAN-05/06 technical documents.
- Found that the processing cadence used `diagnosticFrames`, which is reset by the five-second diagnostics reporting window. This coupled algorithm scheduling to observability.
- Added a dedicated valid-ROI `frameSequence` and pure `shouldAttemptExtendedDecode()` helper. Both the extra orientation/deskew pass and the global-histogram schedule now use that stable processing sequence; diagnostics counters remain reporting-only.
- Added deterministic tests for every-third-frame cadence and invalid sequence inputs.
- Extended the SCAN-05 runtime fixtures to include EAN-8 and EAN-13 at 90° and 270°, in addition to the existing Code 128 fixtures.
- Corrected the current AI handoff to identify branch `feat/scan-05-06-final-consolidation` and PR #66; removed stale current-status references to branch `feat/scan-06-bounded-deskew` and PR #65.
- Updated SCAN-05/06 designs, ADRs, Roadmap, Implementation Status and Acceptance Checklist. CI #368 is explicitly recorded as pre-follow-up validation; a new CI run is required for the latest commits.
- Protected strict ROI/no full-frame fallback, 110 ms cadence, camera/session/lifecycle, Home/Stocktake presentation and business flows. No merge or deployment performed.
- Remaining release gates: fresh CI, physical iOS Safari/PWA and Android Chrome/PWA matrix, and low-end/high-end latency/CPU evidence. These cannot be inferred from automated CI.
