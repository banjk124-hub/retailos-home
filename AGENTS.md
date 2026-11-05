# RetailOS — Agent Operating Contract

## Mission
Implement RetailOS as a reliable mobile-first supermarket operations workspace. Prefer correct business behavior, explicit state, and low-friction workflows over decorative UI. Treat existing production behavior as protected until inspected and tested.

## Mandatory workflow
1. Inspect the actual repository and current git diff before editing. Never assume an old ZIP/patch matches the working tree.
2. Read `docs/ai-context/PROJECT_CONTEXT.md`, `docs/ai-context/ARCHITECTURE.md`, `docs/ai-context/IMPLEMENTATION_STATUS.md`, and the relevant skill under `.github/skills/`.
3. Establish baseline: package manager, scripts, TypeScript/build result, current branch/status, and existing tests. Record failures before changing code.
4. Make a short plan with files and regression risks. Implement one coherent vertical slice at a time.
5. After edits, run the narrowest relevant tests, then TypeScript/build. Never report a check as passed unless it was actually run and its exit status is known.
6. Inspect the diff for unintended changes, secrets, generated files, schema changes, or removed behavior.
7. Update `IMPLEMENTATION_STATUS.md` with changed files, tests run, results, and known limitations.

## Non-negotiable safety rules
- Do not deploy, push, publish, overwrite production, rotate credentials, or change cloud settings without explicit user approval.
- Do not overwrite the user's current working tree with a ZIP. Work on a branch or a separate copy and preserve a rollback point.
- Do not commit `.env`, OAuth tokens, service-account keys, personal data, or production exports.
- Do not change stable module IDs, data contracts, Apps Script API payloads, IndexedDB snapshot schema, authentication/session semantics, service-worker caching, or Vite base path without a written migration plan and regression tests.
- Do not fabricate module functionality, metrics, data, availability, or success notifications. A snapshot being available does not prove the workflow UI is implemented.
- Prefer small, reversible changes. No broad CSS deletion, backend rewrite, dependency replacement, or full-sheet overwrite without evidence and explicit plan.
- Do not introduce a new dependency if existing platform APIs or installed dependencies solve the problem adequately.
- Keep user-facing copy in Vietnamese unless the feature's existing conventions say otherwise.

## Product/design principles
- Mobile-first for Android and iOS; desktop should use the extra space rather than merely stretch mobile cards.
- A design system must define tokens, typography, spacing, surface, borders, shadows, states, and breakpoints. Avoid accumulating last-loaded CSS overrides as the permanent solution.
- Accessibility: semantic controls, keyboard operation, visible focus, sufficient contrast, reduced-motion support, safe-area insets, and meaningful accessible names.
- Performance: avoid unnecessary polling, full dataset refetches, full-sheet rewrites, and redundant state. Preserve snapshot-first/offline behavior when present.
- Every interactive control must have a truthful, tested action. No dead buttons or “Demo” behavior masquerading as a working module.

## Completion report
Report: objective, files changed, behavior changed, tests actually run, results, untested paths, risks, rollback instructions, and next step. Separate facts from assumptions.


## Cross-session continuity contract (added 2026-11-05)
- At session start, read `docs/ai-context/PROJECT_CONTEXT.md` first as the canonical project entry point, then read `ARCHITECTURE.md`, `IMPLEMENTATION_STATUS.md`, and the relevant skill.
- Keep `PROJECT_CONTEXT.md` for durable product facts/constraints; `ARCHITECTURE.md` for invariants and boundaries; `ROADMAP.md` for phase scope/acceptance gates; `DECISIONS.md` for accepted durable decisions; `IMPLEMENTATION_STATUS.md` for verified state/history; `SESSION_LOG.md` for concise handoffs.
- Every implementation session must update status and handoff evidence in the same change set. If a phase or acceptance criterion changes, update roadmap. If an invariant/decision changes, record it explicitly.
- Do not rely on chat history or model memory as the project source of truth. The repository documents and current source are authoritative.
- If GitHub connector or local tooling cannot create/update a required document, record the limitation; do not claim the document was created.
