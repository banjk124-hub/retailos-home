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
