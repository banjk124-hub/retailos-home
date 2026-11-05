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
- Canonical entry point: `docs/ai-context/AI_HANDOFF.md` (when available); it defines reading order, session start/end, conflict resolution and completion criteria.
- Durable context is maintained in repository documents, not in chat-only summaries. Every task branch must keep project context, architecture, roadmap, decisions, implementation status and session handoff synchronized with code.
- Current engineering focus (2026-11-05): Scanner Phase 1.2 correctness/lifecycle before performance tuning. See `IMPLEMENTATION_STATUS.md` and `ROADMAP.md` for verified status.


## Canonical AI entry point and session protocol (2026-11-05)
This file is the first-read entry point for every AI agent, chat session, or contributor.

### Mandatory reading order
1. `AGENTS.md` — operating contract and safety rules.
2. This file — product context, constraints, and this session protocol.
3. `docs/ai-context/ARCHITECTURE.md` — boundaries and protected invariants.
4. `docs/ai-context/IMPLEMENTATION_STATUS.md` — verified state, active phase, validation evidence, and next action.
5. `.github/skills/retailos-implementation/SKILL.md` — implementation workflow.
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
