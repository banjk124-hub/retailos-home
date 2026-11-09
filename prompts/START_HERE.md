# RetailOS — Start Here

## Every new session
1. Read AGENTS.md.
2. Read docs/ai-context/RETAILOS_CURRENT_STATE_2026-11-10.md. This is the canonical whole-app audit and Change Map.
3. Read docs/ai-context/AI_HANDOFF.md.
4. Read docs/ai-context/PROJECT_CONTEXT.md, ARCHITECTURE.md, ROADMAP.md and IMPLEMENTATION_STATUS.md.
5. Read .github/skills/retailos-implementation/SKILL.md.
6. Inspect current main SHA, branches, open PRs, workflow runs, local git status and full diff. Current source always outranks historical chat notes.

## Before code
Report the current baseline, exact task/PR, allowed files, protected files, behavior delta, regression tests and rollback. Do not edit until the Change Map is approved. Work on a branch from latest main.

## Current project phase
RetailOS is a local-first PWA prototype preparing for operational MVP integration. Stocktake is the only complete module UI; backend authentication, live snapshot sync, multi-device Stocktake and remote Push delivery are not integrated. Scanner foundations exist; current Scanner work is recognition/geometry expansion, not lifecycle rewrite.

## Scanner hard boundaries
- Preserve camera lease/session/lifecycle/preview/recovery.
- Home and Stocktake own their own video UI, reticle, transitions and business flow.
- Module defines the scan region and camera request. Engine receives resolved source-frame ROI and must not inspect DOM geometry as a startup gate.
- Preserve EAN-8/EAN-13/CODE-128 validation, 110 ms cadence and current camera defaults until a scoped measured PR is approved.
- Recovery must be conditional and bounded; no-result alone is not a reason for expensive processing.
- Do not combine UI, lifecycle, camera constraints and decoder algorithms in one PR.

## Safety
Never discard local/untracked work. Never change auth/session, stable module IDs, Apps Script payloads, IndexedDB schema, Service Worker, Vite base path or deployment without a migration plan. Never merge/deploy or change cloud settings without explicit user approval. Record exact tests and distinguish CI, local and physical-device evidence.
