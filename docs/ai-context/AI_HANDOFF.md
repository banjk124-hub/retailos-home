## Current implementation — PR C1 Home lifecycle migration (2026-11-08)

- Active branch: `feat/scanner-c1-home-lifecycle-migration`, based on main merge `191f44e9101cd75a3bf961f8475134efddbf4267` (PR #36 lifecycle contract).
- Home now supplies a lifecycle observer; `UniversalScannerSession` binds it to its own generated session ID. The feature must not construct an adapter or invent a parallel ID.
- Home's exit handoff waits for `EXIT_REQUESTED`, `EXIT_PRESENTATION`, `CAMERA_RELEASED`, and `DISPOSED` before unmounting the scanner. Snapshot capture remains before teardown. The camera is released before awaiting decoder disposal.
- The hook retains a reference to the closing session only until `EXIT_PRESENTATION` is reported, so a manual close can still publish the event after the active-session ref is cleared.
- Stocktake is intentionally unchanged. PR C2 remains the next module migration; Opening Transition PR A remains after C1/C2.
- Validation is pending GitHub Actions and user-local `npm run preflight`; no physical iOS/Android QA is claimed. Do not merge or deploy without explicit approval.

---

# Current handoff update — 2026-11-08

Read this update before using older session notes below. Current source baseline is main merge `c7146b55f0c2210cd7b8474c6a72b1c915985793` (PR #32). PR #31 and #32 are merged; old Draft/unmerged statements are historical.

## User's current priorities
1. Android opening layout is now stable; iOS still jumps/reflows.
2. Verify startup is truly initiated from the module tap; source confirms it is.
3. Exit fades to dark because video teardown precedes completion of the dark overlay fade; visual fix still needed.
4. Reassess Phase 1.2G realistically; source instrumentation exists, but telemetry is not proof of GPU drops, battery or temperature.
5. Define Low/Mid/High adaptive resource profiles for the app eventually, but implement scanner-first and never trade scan accuracy/operational correctness.
6. Re-scope Phase 1.2I to shared scanner engine completion.

## Current source facts
- Home and Stocktake tap handlers call `requestCameraLease()` before setting scanner-open state. A cancellable, one-claim lease is handed to the mounted shared session.
- Remaining startup wait is browser permission/hardware acquisition, first usable frame and decoder initialization; no duplicate camera request should be added.
- Hook currently passes `profile: 'HIGH'` unconditionally; adaptive profile selection is not implemented.
- iOS geometry issue is not conclusively diagnosed. Home fixed inset root + percentage-height card differs from Stocktake dynamic viewport sizing. Measure visualViewport/safe-area/element bounds before patching.
- Home close currently initiates camera teardown while the dark fixed overlay remains for 180 ms; this likely explains black fade.

## Current task branch
`docs/scanner-source-audit-device-profiles` — documentation-only source audit and phase realignment. No runtime code or deployment changes. Review `SCANNER_SOURCE_AUDIT_2026-11-08.md` first.

## Recommended next work order
1. Review/merge documentation only after user approval.
2. Capture iOS Safari/PWA viewport geometry and reproduce opening layout jump; patch only after root cause evidence.
3. Design a visual exit state that preserves prompt camera teardown while avoiding dark-only fade; test iOS and Android.
4. Define shared engine completion contracts and tests (Phase 1.2I).
5. Implement scanner-first Low/Mid/High profiles with conservative fallback and no accuracy trade-off (Phase 1.2J).
6. Cross-platform release validation (Phase 1.2K).

Do not implement decoder tuning, adaptive camera constraints, or broad app-wide profile wiring as part of the documentation task. Do not merge/deploy without explicit user approval.

---

# RetailOS — AI Handoff (Canonical Entry Point)

> Read this file first when an AI agent, a new chat, or a new contributor starts work. Then follow the mandatory reading order below. This file is an index and current-state handoff, not a replacement for source code or detailed architecture.

## Project identity
- Repository: `banjk124-hub/retailos-home`
- Product: mobile-first supermarket operations PWA.
- Default language for user-facing work: Vietnamese.
- Primary development environment: Windows, VS Code, PowerShell.
- Stack: React 18, TypeScript, Vite 6, PWA/service worker, IndexedDB; existing Google Sheets/Apps Script integrations.
- Current deployment target: GitHub Pages. Verify `vite.config.ts` and workflow before relying on a base path or deploying.

## Mandatory reading order
1. `AGENTS.md` — non-negotiable operating contract.
2. `docs/ai-context/PROJECT_CONTEXT.md` — product intent and session protocol.
3. `.github/skills/retailos-implementation/SKILL.md` — implementation workflow.
4. `docs/ai-context/ARCHITECTURE.md` — boundaries and invariants.
5. `docs/ai-context/ROADMAP.md` — phases, dependencies, and acceptance gates.
6. `docs/ai-context/IMPLEMENTATION_STATUS.md` — latest verified state and chronological record.

Durable engineering decisions are recorded in `ARCHITECTURE.md`; there is currently no separate `DECISIONS.md`.
7. Relevant feature source, tests, package scripts, and current git diff.

If any item is missing or contradicts the current source, stop treating this handoff as authoritative for that detail. Inspect the repository, then update the relevant document in the same change set.

## Current verified repository snapshot
- Last reviewed main commit before this phase: `3c75f4886c2adeeaa216fd030f11f3bf8b5fd198` (2026-11-05).
- Latest active work branch: `phase-1-2e-scanner-feedback` (Phase 1.2E scan confirmation feedback), based on pushed main commit `ef7b6ff14e2cdfeeee24a7d6349f19b7b3405c1a`.
- Previous Phase 1.2 foundation branch has been merged into `main` and deployed; Phase 1.2E remains unmerged and undeployed.
- This branch is intentionally separate from `main`; do not merge or deploy without explicit user approval.
- Scanner stack uses `@zxing/library ^0.23.0` as its only decoder dependency; ZBar and browser-native decoding are not part of the runtime.
- Current package scripts observed: `dev`, `build`, `build:pages`, `preview`, `preview:pages`. No test or lint script was defined at the time of review.
- Main contains the Phase 1.2 scanner foundation: explicit EAN-13/EAN-8/CODE-128 whitelist and payload validation. The active Phase 1.2E branch adds a louder accepted-result beep and best-effort 25 ms vibration where supported.
- Scanner engine has a live-controls guard and handles a single-scan result arriving before ZXing returns its controls. Phase 1.2E local TypeScript/build and device verification are still pending.
- These are review findings, not proof of device-level failure. Confirm against the current branch before making claims.

## Non-negotiable working rules
- Inspect branch, status, diff, recent commits, and actual source before editing. Never assume the user's local working tree is clean.
- Never discard untracked files, artifacts, local changes, or user data. Never run destructive cleanup commands.
- Work on a task branch. Keep `main` protected.
- Do not push, merge, publish, deploy, change cloud settings, rotate credentials, or modify production without explicit user approval.
- Never place secrets, OAuth tokens, service-account keys, personal data, or production exports in the repository or chat.
- Do not change stable module IDs, Apps Script payloads, auth/session semantics, IndexedDB schema, service-worker behavior, or Vite base path without a written migration plan and regression coverage.
- Do not add dependencies before checking whether existing dependencies/platform APIs are sufficient.
- Separate verified facts, hypotheses, decisions, and open questions.
- Do not claim tests/build/device QA passed unless actually executed and the exit result is known.

## Required session start
1. Confirm repository and current default branch.
2. Fetch latest `main`; inspect task branch and whether it is behind/ahead.
3. Read mandatory documents in the order above.
4. Inspect local `git status --short`, current branch, and diff before checkout or edits.
5. Run baseline commands available in `package.json`; record pre-existing failures.
6. State the task, scope, files likely to change, protected contracts, tests, and stop conditions.

## Required session end
1. Run targeted checks and build commands that are available.
2. Inspect the complete diff and ensure no unrelated changes, generated artifacts, or secrets.
3. Update `IMPLEMENTATION_STATUS.md` with exact files, behavior, commands, results, unverified paths, and next step.
4. Update `ROADMAP.md` if phase scope, dependencies, or acceptance criteria changed.
5. Update `ARCHITECTURE.md` or `PROJECT_CONTEXT.md` only when durable invariants or project facts changed.
6. Record durable decisions in `ARCHITECTURE.md` until a dedicated decision log is justified.
7. Leave a concise handoff: branch, base/head commit, completed work, remaining work, blockers, exact next action.
8. Do not merge/deploy.

## Conflict resolution
When sources disagree, use this order:
1. Current executable source and tests for actual behavior.
2. Current package/config/CI files for tooling and deployment behavior.
3. This operating contract for process and safety.
4. Architecture and project context for intended invariants.
5. Roadmap and implementation status for planned/reported progress.
6. Older chat messages and old AI summaries as historical clues only.

Do not silently reconcile contradictions. Record the discrepancy and correct the authoritative document.

## Definition of done
A change is not complete merely because code was written. It is complete only when implementation, regression evidence, documentation, project status, and handoff agree. A phase may be marked complete only against its acceptance criteria; otherwise label it in progress, blocked, or unverified.


## Active task — Phase 1.2F camera lifecycle recovery (2026-11-06)
- Active GitHub branch: `phase-1-2f-camera-lifecycle`, created from `main`; it is intentionally unmerged and undeployed.
- Scope is limited to `cameraSession.ts` and `useScannerEngine.ts` plus the required architecture, roadmap, status and session handoff documents.
- The service now exposes a stream-identity ended-track subscription. The scanner hook invalidates stale startup/decoder work, stops controls and makes at most one automatic recovery attempt per open session; repeated interruption requires user retry.
- The user created a matching Local branch and ran `npm run preflight` successfully before this GitHub patch. That baseline is not a post-patch verification.
- Preserve the Local untracked paths `artifacts/` and `tatus --short`; their contents have not yet been reviewed. Do not clean, overwrite, or stage them as part of this task.
- Next: fetch/synchronize this branch in Local, review diff, rerun preflight, and perform Android Chrome/iOS Safari scanner lifecycle QA. No PR, merge, or deployment until the user approves.
### Review follow-up — stale stream ownership guard (2026-11-06)
- Full source review found that a stale startup path could invoke the shared global camera release after a newer scanner instance acquired its stream. This was a real ownership race in the singleton service.
- releaseCameraStream(expectedStream?) now supports identity-guarded release; no-argument calls preserve intentional global release semantics. Scanner startup cleanup passes the exact stream and ignores stale errors when its generation is no longer current.
- Source patch is on phase-1-2f-camera-lifecycle; no post-patch local build or device QA has been run yet.
- Next: fetch the latest branch, inspect the local diff, run npm run preflight, then perform scanner QA on Android Chrome (and iOS Safari if available). Preserve local untracked paths artifacts/ and tatus --short. Do not PR/merge/deploy until accepted.
- Stream-scoped release deliberately does not invalidate or clear a separately pending getUserMedia request; only the no-argument global release changes the request generation and clears the pending request.


## Current task handoff — P0 scanner lifecycle serialization (2026-11-07)
- Active branch: `fix/scanner-p0-lifecycle-serialization`, based on `main` at `7f35fc095dd89741919005af067ca3f4285c6ea6`.
- Source files changed: `src/shared/services/cameraSession.ts`, `src/platform/scanner/universalScannerSession.ts`, `src/features/scanner/hooks/useScannerEngine.ts`.
- Current source now uses reference-counted camera leases. Scanner sessions release their own lease; global release is reserved for logout/forced shutdown. The hook also retries startup after an awaited stale attempt settles without reaching scanning.
- Technical documents updated in the same branch: `ARCHITECTURE.md`, `ROADMAP.md`, `IMPLEMENTATION_STATUS.md`, `SESSION_LOG.md`.
- Verification status: not run in this remote editing session. No claim of build, tests, browser QA or device QA passing.
- Immediate next action: inspect the branch diff and run `npm run preflight`; add lifecycle tests for lease concurrency and pending-start races; then verify rapid open/close, background/foreground, Home and Stocktake on iOS Safari and Android Chrome.
- Do not merge or deploy. User approval is required after verification.



## Current handoff snapshot — 2026-11-07 (after P0 merge)

This section is the latest handoff snapshot and supersedes older task sections above where they describe P0 as active/unmerged. Older entries remain as history.

- Repository: `banjk124-hub/retailos-home`; default branch: `main`.
- P0 scanner lifecycle serialization PR #24 is merged to main at `0ece0c95523a3846f1f2e06ac9d732c3e5a2f2d8`; its GitHub CI passed TypeScript and production preflight. Do not infer physical-device QA or deployment from that CI result.
- Current source decode cadence is 110 ms; historical 70 ms references are stale and corrected in the roadmap/architecture addenda.
- Camera sessions own reference-counted leases. Global camera invalidation is reserved for app-level forced shutdown/logout.
- Latest agreed plan: P0 device QA → performance diagnostics/baseline → Phase 1.2G motion/rendering/interaction audit and fixes → 1.2H decoder optimization if profiling justifies it → 1.2I angled barcode capability → 1.2J cross-platform validation.
- Phase 1.2G–1.2J are planned only. This documentation update does not implement scanner source changes.
- Preserve Home cached lookup, Stocktake form-fill/explicit-save, duplicate rows, manual entry, barcode formats, auth/session, Apps Script, IndexedDB, service worker and PWA deployment contracts.
- Before source edits: inspect current source and branch/diff; gather baseline measurements; isolate one bottleneck and one coherent patch at a time. Do not tune decoder cadence/resolution or rewrite motion globally without evidence.
- No merge/deploy without explicit user approval.


## Current handoff snapshot — Phase 1.2G-A (2026-11-07)

- `main` is at `d17115046922d157405694f86afcf5951445a179`; current work is isolated on `feat/scanner-phase-1-2g-instrumentation`.
- G-A source instrumentation has been added to camera acquisition, autofocus, video/decoder readiness, first accepted result, decoder processing stages, teardown, callback gaps, long tasks, layout shifts (when supported) and React UI phase commits.
- A targeted mounted guard prevents scanner hook callbacks and async completion from updating React state after unmount/close.
- G-B source audit found motion candidates: 420 ms sheet entrance, 200 ms sheet/backdrop transitions, several 280–360 ms library-card transitions, and layered Home glass/backdrop blur/shadows. These are not yet proven bottlenecks.
- No motion timing, camera resolution, 110 ms decode cadence or decoder algorithm has been tuned. No Home/Stocktake business contract changed intentionally.
- GitHub CI run #63 passed scanner validation, TypeScript/production build, GitHub Pages build and whitespace checks on latest source commit `e46c19542ca1eef12b1ce03b21a7e3d404f6f500`. Local npm execution, browser Performance trace and physical iOS/Android QA remain outstanding.
- Next: inspect diff, run all available scanner/build checks, then collect comparable Android Chrome and iOS Safari traces before selecting one targeted G-E optimization. Do not merge/deploy without explicit user approval.

## Current handoff snapshot — Scanner Patch 1 early preview (2026-11-07)

This is the latest task snapshot and supersedes older “active task” labels above where they conflict. Earlier entries remain historical records.

- Repository: `banjk124-hub/retailos-home`; default branch: `main`.
- Active branch: `fix/scanner-phase-1-early-preview`, based on `main` at `3a6e9afc76d7e49c69b27c05371087ba6c29f706`.
- Source patch commit before documentation synchronization: `807ec386043a1cbfe5fccc9ef187b0c7b1fd5e5b`.
- Draft PR #29: https://github.com/banjk124-hub/retailos-home/pull/29 — not merged, not deployed.
- Patch 1 separates camera preview readiness from decoder/scanning readiness. The session calls `onPreviewReady` after the first usable video frame and before decoder creation; the hook exposes `isPreviewReady`; Home and Stocktake reveal the live video and hide the startup placeholder at that milestone.
- CI run #79 (`42388939459`) passed: TypeScript and production builds, including the local-equivalent preflight. This does not prove real-device camera behavior.
- No autofocus, resolution, decoder, ROI, cadence, barcode-validation, business-flow or persistence behavior was changed.
- Required next work: local branch synchronization and full diff review; local `npm run preflight`; first-open and resume QA on iOS Safari/PWA and Android Chrome/PWA; verify preview appears before decoder readiness without implying scanning is ready.
- Preserve existing untracked local files (including previously reported `artifacts/` and any other unreviewed paths). Do not clean or overwrite them.
- Patch 2 (autofocus acquisition behavior) remains separate and is not authorized by Patch 1. Phase 2 recognition improvements remain out of scope.
- Do not merge, publish or deploy without explicit user approval.


## Current handoff snapshot — Scanner Patch 2 non-blocking autofocus (2026-11-07)

- Repository: `banjk124-hub/retailos-home`; default branch: `main`.
- Base commit: `93eff4fa10154ea3d3499e12d946309850ab1164`, after Patch 1 / PR #29 was merged.
- Active branch: `fix/scanner-phase-1-2-autofocus-nonblocking`.
- Patch 2 changes only the camera acquisition boundary and its regression coverage: `cameraSession.ts` returns a live stream without awaiting optional autofocus; track-ended monitoring is installed before focus work begins.
- `requestContinuousAutofocus()` remains capability-gated and best-effort. Its existing result categories and privacy-safe diagnostics are retained. Late results for stale streams/generations are ignored.
- Added a regression test with a deliberately pending `applyConstraints()` Promise. It checks that the camera lease resolves before autofocus settles and that the ended listener is registered.
- Technical documents synchronized: Architecture ADR-009, Roadmap Patch 2, Implementation Status, Project Context and Session Log.
- Not yet verified in this task: local npm preflight, GitHub Actions CI, real iOS Safari/PWA and Android Chrome/PWA first-open/resume/focus behavior.
- Preserve camera constraints, 110 ms decode cadence, decoder/ROI, barcode validation, Home and Stocktake business behavior, persistence, auth/session and deployment configuration.
- Next: synchronize locally without disturbing untracked files; inspect full diff; run `npm run preflight`; collect device QA evidence. Do not merge or deploy without explicit user approval.


### Patch 2 verification update — 2026-11-07
- GitHub Actions run #84 (`42393062148`) passed the full `npm run preflight`, including the new delayed-`applyConstraints()` regression, TypeScript/production build, Pages build and diff checks.
- Non-blocking regression behavior is now verified in CI: camera lease acquisition resolves while the mocked autofocus Promise remains pending, and the ended listener is already installed.
- CI emitted a non-fatal EBADENGINE warning: `@zxing/library@0.23.0` declares Node >=24 while the current workflow uses Node 22. Vite also emitted its existing large-chunk warning. Neither caused failure.
- Local Windows/PowerShell execution and physical iOS Safari/PWA + Android Chrome/PWA QA are still required. Do not treat CI as device verification.


### Latest Patch 2 PR-head CI — 2026-11-07
- Final PR head `a31d40315eaeb9f90ce209da4fef6341e8836025` passed GitHub Actions run #85 (`42393150965`), including locked dependency install and full `npm run preflight`.
- This verifies the latest documentation-synchronized branch head, not only the earlier source/test commit.
- Local Windows/PowerShell preflight and physical iOS/Android camera QA remain outstanding.

## Current handoff snapshot — Supplemental Scanner UX Transition (2026-11-08)

This is the latest active task snapshot and supersedes older active-task labels above where they conflict. Earlier entries remain historical.

- Repository: banjk124-hub/retailos-home; base branch: main at 36b8ca7457c9df7bb3f26105660605c66070b9ea.
- Active branch: feat/scanner-ux-transition; Draft PR #31: https://github.com/banjk124-hub/retailos-home/pull/31.
- Latest recorded head: 9e2e1bbe568d0d7be41d253fde4dfd2218634955.
- Camera acquisition begins in the Home/Stocktake tap handler and is handed to the mounted scanner through a single-claim, cancellable lease request.
- Home scanner opens as a full-screen camera surface without a card/frame. Stocktake retains its existing framed scanner UI. Their presentation code remains independent.
- The animation does not gate camera acquisition or first-frame readiness. Browser/OS permission prompt timing remains browser-controlled.
- GitHub Actions run #89 (42400411255) passed full preflight. No local PowerShell or physical iOS/Android QA is claimed.
- Required next steps: preserve and inspect the local working tree before syncing; review the full branch diff including documentation; run local npm run preflight; perform first-open permission, denial/retry, close-while-pending, rapid open/close, background/foreground and scan regression checks on iOS Safari/PWA and Android Chrome/PWA.
- Do not merge, deploy or close the PR without explicit user approval.
- Once this supplemental patch is accepted, return to the existing Phase 1.2G–1.2J roadmap. The patch does not complete Phase 1.2G.


## Current handoff — Post-merge Scanner stabilization (2026-11-08)

- Main base: `56fbd1dab5e6fafd1976a7932a7a5a64e96c1bd4`.
- Active branch: `fix/scanner-lifecycle-preview-stability`; Draft PR #32.
- Main remains unchanged. No merge or deployment has been performed for PR #32.
- Implemented: Home transition class/style wiring; stale lifecycle UI write prevention; active-start promise ownership guard; Home/Stocktake preview flex sizing; independent module exit transitions; regression guards.
- Protected: camera lease/refcount, camera constraints, autofocus, decoder, ROI, 110 ms cadence, validation, Home lookup, Stocktake form-fill/explicit-save, duplicate rows, manual entry and persistence.
- GitHub Actions run #109 (`42451179152`) passed full preflight on the previous docs-synchronized head `e2ce5f6b2c70c3e6e2cd3660cde5e46ff9f698d4`. Additional documentation-only synchronization commits followed; CI has not yet rerun on the current documentation head. Next inspect the complete PR diff locally and run local `npm run preflight`.
- Physical QA still required on iOS Safari/PWA and Android Chrome/PWA: permission grant/deny/retry, open/close while pending, rapid reopen, background/foreground, first usable frame, result exit, scan accuracy, Stocktake explicit save, and reduced-motion behavior.
- Preserve all existing local changes and untracked files during sync. Do not use destructive Git cleanup. Do not merge/deploy without explicit user approval.

### PR #32 CI verification — 2026-11-08
- GitHub Actions run #107 (`42451111883`) passed on source/test head `b3df0a683ab76237c1908e4adb01f36109fc95c6`.
- Passed: locked dependency installation and full `npm run preflight`, including scanner regression suite, TypeScript/production build, GitHub Pages build and diff checks.
- Run #109 (`42451179152`) passed on the latest documentation-synchronized head `e2ce5f6b2c70c3e6e2cd3660cde5e46ff9f698d4`.
- Local Windows/PowerShell preflight and physical iOS Safari/PWA + Android Chrome/PWA QA remain outstanding.


## Active task — PR B Scanner Lifecycle Contract (2026-11-08)

- Branch: `feat/scanner-lifecycle-contract`, based on main `fa0d007d42bf480799e29b6003aeea2b2cd52112`.
- Scope: shared lifecycle event vocabulary/adapter, truthful camera-release and disposal milestones, deterministic regression tests, synchronized technical documentation.
- The event vocabulary is not a compulsory linear workflow. READY/SCANNING may be skipped on early close; EXIT_PRESENTATION is optional and feature-owned. Suspend/resume is not terminal exit.
- Engine emits CAMERA_RELEASED after releasing its lease and before awaiting decoder disposal. DISPOSED follows completed engine teardown.
- Home and Stocktake are not migrated in PR B. PR A opening presentation and PR C snapshot/exit handoff remain separate.
- Run `npm run preflight` after syncing the branch. Current remote editing has not run tests/build or physical device QA.
- Preserve local changes/untracked files. Keep PR unmerged/undeployed until explicit approval.
\n\n### PR B corrective audit — CI run #130\n- Run #130 failed at the new lifecycle test, not dependency installation or the existing scanner test.\n- The source-order assertion incorrectly compared method declaration offsets. It was rewritten to inspect execution ordering inside each method boundary.\n- A second real defect was found: the hook declared `lifecycle` in its options type but failed to destructure and forward it. This is fixed and guarded by the test.\n- Await a new CI run on the latest branch head before treating the PR as passing. Local Windows and physical iOS/Android QA remain outstanding.\n\n- Follow-up CI run #137 failed on a brittle string assertion in the test guard (newline escaping); corrected the guard to be whitespace-independent. Recheck latest CI before claiming pass.\n\n\n### PR B CI verification — run #142\n- Latest synchronized branch head `3e67397260993778a69eb1a5d2eb7a8216bd3044` passed GitHub Actions run #142 (`42465469769`). Full preflight passed, including both scanner regression suites and both production builds.\n- Local Windows preflight and physical iOS/Android QA remain outstanding. Keep PR #36 Draft and do not merge/deploy without explicit user approval.\n