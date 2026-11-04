---
name: retailos-implementation
description: Safely audit, design, implement, and verify changes to RetailOS React/Vite/TypeScript application, especially module library, mobile UX, data snapshots, PWA, and GitHub Pages deployment.
---

# RetailOS implementation skill

## When to use
Use for any RetailOS feature, refactor, UI/UX redesign, module registry/library work, data integration, bug fix, performance work, or release preparation.

## Phase A — Orient
1. Read root `AGENTS.md`, project context and implementation status.
2. Inspect `git status --short`, branch, recent changes, package scripts, Vite config, routes, and related components.
3. Trace the feature end-to-end: UI entry point → state/action → service/data contract → persistence/network → error/empty/offline states.
4. Distinguish confirmed code facts from hypotheses. Search before assuming a file or function exists.

## Phase B — Baseline
Record:
- install/build/test/lint scripts that actually exist;
- baseline errors before changes;
- relevant stable IDs and payload schemas;
- user-visible behavior to preserve;
- target viewport/device and acceptance criteria.

Never “fix” baseline failures without noting whether they predate the change.

## Phase C — Design
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
