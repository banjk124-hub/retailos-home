## Current project focus — scanner Torch investigation closed (2026-11-09)

- PR #51/#52: production capability-gated Torch control is merged.
- PR #53/#54: Android diagnostics and compatibility probe completed; their findings are recorded in `ARCHITECTURE.md` ADR-018 and `SCANNER_TORCH_AUDIT_2026-11-09.md`.
- User confirms iOS Flash works. Samsung Galaxy S23 Ultra / Android Chrome does not expose Torch on its active camera track; an API-accepted ON/OFF probe did not illuminate the physical LED.
- Decision: retain the current PWA camera architecture. Show Flash only when the active track advertises Torch. Unsupported Android devices continue scanning without Flash.
- Cleanup branch `cleanup/remove-torch-investigation-code` removes temporary diagnostics/probe code and updates technical documentation. Do not treat it as merged/deployed until PR and CI verification complete.

---

# Historical engineering focus snapshot---
# Historical engineering focus snapshot — 2026-11-08

Historical source baseline: c7146b55f0c2210cd7b8474c6a72b1c915985793 (pre lifecycle contract and Recovery). PR #31/#32 history below is not the current implementation state.

- No active branch is assumed. The source audit branch mentioned in older notes is historical; verify the actual Git branch before work.
- Home and Stocktake both initiate camera acquisition from the user's tap before scanner UI mount; remaining startup delay is hardware/browser acquisition, first usable frame and decoder initialization.
- Android opening geometry is reported stable; iOS still jumps. Root cause remains unproven; measure iOS visualViewport/safe-area/element geometry before code changes.
- Exit fade mismatch likely occurs because video is detached at teardown start while dark overlay remains through its fade. Keep camera release prompt; solve visual state separately.
- Phase 1.2G is bounded at source instrumentation/audit; further work must be issue- or measurement-driven.
- Phase 1.2I now means Shared Scanner Engine Completion. Phase 1.2J is scanner-first Low/Mid/High adaptive resource profiles; Phase 1.2K is cross-platform release validation.
- Current scanner hook hardcodes profile `HIGH`; no adaptive profile selection exists. Never trade scan accuracy or business correctness for a tier target.
- Read `SCANNER_SOURCE_AUDIT_2026-11-08.md` for source facts, limitations and acceptance gates.

---

# Project context — RetailOS

## Product intent
RetailOS is a mobile-first operational PWA for a supermarket branch. It aims to consolidate operational modules into one coherent workspace while using lightweight/free infrastructure where possible. Users are operational subject-matter experts; explanations and implementation steps should be explicit and practical.

## Known stack
- React 18, TypeScript, Vite 6.
- PWA / service worker and GitHub Pages deployment.
- Google Sheets and Google Apps Script are existing data/backend components.
- IndexedDB snapshots/offline-first data paths exist in the codebase.
- Barcode/camera scanning and notification paths exist in the codebase.
- Primary development environment is Windows with VS Code and PowerShell.
- Repository historically used GitHub Pages base path `/retailos-home/`; always verify the current config before relying on this.

## Product constraints
- Preserve working production behavior. Prefer a clone/branch for experiments.
- Avoid infrastructure cost and unnecessary services.
- Avoid broad rewrites that risk data contracts or production workflows.
- Avoid repeated polling when an event, scheduled refresh, or snapshot can meet the requirement.
- Incremental writes are preferred over whole-sheet rewrites where AppSheet/sync cost matters.
- Mobile is primary, but desktop should be deliberately supported.

## Communication
- Vietnamese is the default language for user-facing implementation reports.
- Explain technical decisions with exact files/commands and distinguish known facts from assumptions.
- Do not ask the user to provide OAuth secrets in chat.
- The user expects architecture-level reasoning, not cosmetic patches presented as a complete redesign.


## Cross-AI continuity
- Canonical entry point: `docs/ai-context/AI_HANDOFF.md`; it defines reading order, session start/end, conflict resolution and completion criteria.
- Durable context is maintained in repository documents, not in chat-only summaries. Every task branch must keep project context, architecture, roadmap, decisions, implementation status and session handoff synchronized with code.
- Current engineering focus (2026-11-05): Scanner Phase 1.2 correctness/lifecycle before performance tuning. See `IMPLEMENTATION_STATUS.md` and `ROADMAP.md` for verified status.


## Canonical AI entry point and session protocol (2026-11-05)
This file is the product-context reference linked from the canonical `AI_HANDOFF.md` entry point.

### Mandatory reading order
1. `AGENTS.md` — operating contract and safety rules.
2. `.github/skills/retailos-implementation/SKILL.md` — implementation workflow.
3. This file — product context and constraints.
4. `docs/ai-context/ARCHITECTURE.md` — boundaries and protected invariants.
5. `docs/ai-context/ROADMAP.md` — phase scope and acceptance gates.
6. `docs/ai-context/IMPLEMENTATION_STATUS.md` — verified state, validation evidence, and next action.
6. Relevant source, package/config files, git status and diff.

### Start-of-session checklist
- Confirm repository, branch, latest main SHA, task branch base/head, and whether it is behind/ahead.
- Inspect local `git status --short`, current branch, and full diff before checkout/editing. Preserve untracked files and user changes.
- Read the active phase scope and protected contracts from Implementation Status and Architecture.
- Run baseline commands that exist in `package.json`; record existing failures before changes.
- State the intended vertical slice, affected files, regression risks, checks, and stop conditions.

### End-of-session checklist
- Run targeted tests and production builds available in the repository; record exact commands and results.
- Inspect the entire diff for unrelated changes, generated artifacts, secrets, schema changes, and accidental removals.
- Update Implementation Status in the same change set with branch, commit, changed behavior, checks, failures, unverified device paths, and next action.
- Update Architecture when a durable boundary/invariant/decision changes. Update this project context when product constraints change.
- Leave the branch unmerged and undeployed until explicit user approval.

### Source-of-truth policy
Repository source and current tests/config are authoritative for actual behavior. These documents are authoritative for process, intended architecture, phase acceptance, and known limitations. Chat history and AI memory are historical hints only. When sources conflict, inspect current code, document the discrepancy, and correct the relevant repository document; never silently invent a reconciliation.


## Active engineering focus — 2026-11-06
- Current task branch: `phase-1-2f-camera-lifecycle` (GitHub branch created from `main`; not merged or deployed).
- Current scanner slice: unexpected video-track termination notification and bounded lifecycle recovery. See `ROADMAP.md` Phase 1.2F, `ARCHITECTURE.md` ADR-006 and `IMPLEMENTATION_STATUS.md`.
- The user's Local preflight passed before the current remote patch; post-sync verification and Android/iOS device QA remain required.



## Scanner roadmap focus update (2026-11-07)
- P0 camera lifecycle serialization is merged to `main` at `0ece0c95523a3846f1f2e06ac9d732c3e5a2f2d8`; GitHub CI passed TypeScript and production preflight. Real-device QA and deployment status remain separate verification items.
- The next scanner focus is measurement-led: establish a performance baseline, then Phase 1.2G (rendering, motion, interaction and lifecycle smoothness), followed by conditional decoder optimization (1.2H), angled barcode capability (1.2I), and cross-platform validation (1.2J).
- Current source decode cadence is 110 ms; older 70 ms notes are historical and stale.
- Keep roadmap/status/handoff synchronized. Do not claim planned phases are implemented; do not change source code in documentation-only work.


## Active engineering focus — Phase 1.2G (2026-11-07)
- Current branch: `feat/scanner-phase-1-2g-instrumentation`, based on `main` at `d17115046922d157405694f86afcf5951445a179`.
- Work begins with measurement, not speculative animation or decoder tuning. Instrumentation is local-only and privacy-safe; no barcode payloads or device identifiers.
- Preserve iOS Safari and Android Chrome compatibility. Browser performance APIs are feature-detected and optional.
- No merge or deployment without explicit approval.

## Active engineering focus — scanner early-preview startup (2026-11-07)

- Current branch: `fix/scanner-phase-1-early-preview`; Draft PR #29, based on main commit `3a6e9afc76d7e49c69b27c05371087ba6c29f706`.
- Current patch separates camera preview readiness from decoder readiness so the live image can be shown as soon as the first usable frame exists.
- GitHub CI run #79 passed TypeScript and production preflight. This is not a substitute for physical-device validation.
- Next verification targets: first open and resume on iOS Safari/PWA and Android Chrome/PWA, plus confirmation that preview visibility never falsely signals decoder readiness.
- Keep Patch 2 autofocus work and Phase 2 barcode-recognition improvements separate. No merge/deployment without explicit approval.


## Active engineering focus — Scanner Patch 2 non-blocking autofocus (2026-11-07)

- Base `main`: `93eff4fa10154ea3d3499e12d946309850ab1164`, including merged early-preview Patch 1.
- Active branch: `fix/scanner-phase-1-2-autofocus-nonblocking`.
- Current objective: ensure optional `applyConstraints()` autofocus cannot delay camera lease delivery or preview startup. Register track-ended monitoring before launching autofocus asynchronously.
- Preserve iOS Safari and Android Chrome compatibility, camera constraints, decoder cadence and all feature/data contracts.
- The new delayed-autofocus regression test is authored but requires local and CI execution. Physical-device QA remains outstanding.
- Keep the branch isolated; no merge/deployment without explicit user approval.


### Patch 2 verification update — 2026-11-07
- GitHub Actions run #84 passed the full repository preflight, including a regression test that holds autofocus pending while verifying camera lease acquisition remains non-blocking.
- Local Windows/PowerShell and physical iOS/Android QA remain outstanding. CI does not prove camera hardware focus behavior.
- Existing CI warnings (ZXing package engine declares Node >=24 while workflow uses Node 22; Vite chunk-size warning) were non-fatal and are recorded in Implementation Status.

## Active engineering focus — Supplemental Scanner UX Transition (2026-11-08)

- Current branch: feat/scanner-ux-transition, based on main at 36b8ca7457c9df7bb3f26105660605c66070b9ea; Draft PR #31 is open and unmerged.
- The opening tap now initiates camera acquisition; a single-claim/cancellable lease request is handed to the mounted scanner.
- Home scanner is full-screen with no camera card/frame. Stocktake retains its current scanner frame/layout. Do not unify their visual components.
- GitHub Actions run #89 passed full preflight. Local Windows/PowerShell and physical iOS Safari/PWA + Android Chrome/PWA QA remain outstanding.
- Preserve all existing scanner and business-flow contracts. No merge/deploy without explicit approval.
- After this supplemental UX patch is accepted, resume the existing Phase 1.2G–1.2J roadmap; this patch does not complete Phase 1.2G.


## Historical scanner lifecycle contract foundation — superseded 2026-11-08

- Shared lifecycle milestones are an event contract, not a required linear UI state machine.
- The platform engine owns camera/decoder resources and truthful release/disposal notifications. Feature modules own presentation, capture, VFX, result routing and UI completion.
- The original `CAMERA_RELEASED` milestone was renamed to `CAMERA_LEASE_RELEASED`: it confirms release of the session's lease, not necessarily shutdown of a shared physical stream. `DISPOSED` follows completed engine teardown.
- The original `EXIT_PRESENTATION` event and `notifyExitPresentation()` API were removed. Home and Stocktake own presentation completion locally and never send it to the engine.
- The original foundation remains historical; the current technical-only contract is documented in ADR-008/ADR-013 and the current implementation status.
