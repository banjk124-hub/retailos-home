---
name: retailos-implementation
description: Safely design, implement, and verify approved changes to the RetailOS React/Vite/TypeScript application.
---

# RetailOS implementation skill

## When to use
Use for approved implementation work: features, bounded refactors, UI/UX, module registry/library, data integration, bug fixes, performance changes and release preparation. For read-only audits, use `retailos-audit` instead.

## Skill composition

Load `.github/skills/retailos-core/SKILL.md` as the shared engineering reasoning and safety layer. Select task skills only when relevant:
- `retailos-audit` for read-only investigation and review.
- `retailos-technical-research` when current external technical evidence is needed.
- This implementation skill for approved code changes.

Load only the domain contract/source files selected through `docs/ai-context/INDEX.md`. Do not load every skill or every domain document by default.

## Phase A — Orient
1. Read root `AGENTS.md`, `docs/ai-context/INDEX.md`, `PROJECT_CONTEXT.md` and `IMPLEMENTATION_STATUS.md`; use INDEX to select only the relevant canonical topic document and skill. Do not bulk-read historical logs.
2. Inspect `git status --short`, branch, recent changes, package scripts, Vite config, routes, and related components.
3. Trace the feature end-to-end: UI entry point → state/action → service/data contract → persistence/network → error/empty/offline states.
4. Verify current branch, commit, PR, CI and deployment state from GitHub; do not infer current state from stale documentation.
5. Distinguish confirmed code facts from hypotheses. Search before assuming a file or function exists.
6. For architecture, performance or new-technology work, research current credible options and official documentation, compare trade-offs against project constraints, and keep exploratory proposals separate from accepted decisions.

## Phase B — Baseline
Record:
- install/build/test/lint scripts that actually exist;
- baseline errors before changes;
- relevant stable IDs and payload schemas;
- user-visible behavior to preserve;
- target viewport/device and acceptance criteria.

Never “fix” baseline failures without noting whether they predate the change.

## Phase C — Design
Apply the CORE Complexity Gate and Risk/Dependency Gate before coding. Prefer the minimum sufficient solution, reuse existing platform capabilities and dependencies, and justify every new layer. Trace producers and consumers for shared contracts; stop before unapproved migrations or architectural changes.

Before coding, state:
- user problem and measurable outcome;
- proposed interaction and responsive behavior;
- files likely to change;
- contracts that must remain unchanged;
- failure modes and rollback plan;
- tests required.

For module library work, define a single source of truth for module identity and metadata. Keep these dimensions distinct:
- data source/snapshot availability;
- module UI implementation status;
- user permission;
- network/offline state;
- feature health/error state.

Do not infer one dimension from another.

## Phase D — Implement
- Use existing project conventions and installed dependencies.
- Avoid parallel registries and duplicate labels/IDs.
- Preserve stable identifiers; derive views/search groups from canonical metadata where appropriate.
- Keep business logic out of presentation-only components.
- Give controls real actions and accessible labels.
- Include loading, empty, error, permission-denied, and offline states when relevant.
- Respect mobile safe areas and reduced-motion preferences.
- Avoid changing data schemas or API payloads as part of a visual-only task.

## Phase E — Verify
Use the acceptance criteria and evidence standards in `retailos-core`. Validate changed behavior and affected consumers; distinguish source assertions, automated tests, CI, local/browser execution and physical-device acceptance.

Run relevant checks in this order:
1. targeted unit/type checks;
2. app TypeScript check;
3. production build;
4. tests/E2E that exist and can run;
5. manual viewport checks for mobile and desktop when browser access exists;
6. regression checks for login/session, module navigation, snapshot/IndexedDB, Apps Script sync, barcode/camera permission, notifications, PWA/service worker, and deployment base path when affected.

Capture command and result. Never claim manual QA without actually viewing the result.

## Phase F — Report
Provide:
- what changed and why;
- files changed;
- exact checks run and pass/fail;
- what remains unverified;
- risk and rollback steps;
- next smallest safe increment.

## Stop conditions
Stop and ask before:
- changing production or deployment;
- altering auth/session or data contracts;
- deleting legacy styles/files whose usage is not proven absent;
- introducing paid services or new credentials;
- making an irreversible migration;
- inventing business rules where source or user requirements are insufficient.
