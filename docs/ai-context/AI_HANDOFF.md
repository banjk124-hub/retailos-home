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
