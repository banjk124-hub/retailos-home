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
