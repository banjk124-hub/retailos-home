# Documentation index

This file is the navigation layer for repository documentation. Read one canonical source per topic; do not duplicate implementation history across files.

## Start here

1. `AGENTS.md` — operating rules and context policy.
2. `PROJECT_CONTEXT.md` — durable product facts and repository context.
3. `IMPLEMENTATION_STATUS.md` — verified implementation state and outstanding acceptance gates.
4. Select the canonical topic document below. Read `ARCHITECTURE.md` only for tasks touching architecture decisions or protected contracts.
5. Load only the relevant task skill. `prompts/START_HERE.md` contains session-start prompts.

## Canonical topic sources

| Topic | Canonical document |
|---|---|
| Scanner current architecture, ownership, lifecycle, ROI, pipeline, decoder, limits, validation, tests and current status | [SCANNER_ENGINE.md](./SCANNER_ENGINE.md) |
| Scanner historical phases, investigations, decisions, incidents and cleanup history | [SCANNER_HISTORY.md](./SCANNER_HISTORY.md) |
| Scanner future priorities | [ROADMAP.md](./ROADMAP.md) |
| Cross-feature overlays, scroll locking and viewport behavior | `UI_OVERLAY_ARCHITECTURE.md` |
| Physical desktop/Android/iOS UI acceptance | `UI_OVERLAY_ACCEPTANCE.md` |
| Home performance reconciliation | `HOME_PERFORMANCE_RECONCILIATION.md` |
| UI interaction responsiveness | `UI_INTERACTION_RESPONSIVENESS_AUDIT.md` |
| PWA runtime and release contract | [PWA_RUNTIME_RELEASE.md](./PWA_RUNTIME_RELEASE.md) |
| Bundle analysis, code splitting and performance evidence | [PERFORMANCE_BUNDLE_PWA.md](./PERFORMANCE_BUNDLE_PWA.md) |
| Stocktake import file contract | `STOCKTAKE_FILE_IMPORT.md` |
| Export utilities | `modules/EXPORT_FILE.md` |
| Login Phase 2 history | `docs/implementation/LOGIN_PHASE2_HISTORY.md` |

## AI context loading policy

- Default session-start set: `AGENTS.md`, this index, `PROJECT_CONTEXT.md` and `IMPLEMENTATION_STATUS.md`.
- For scanner work, load `SCANNER_ENGINE.md` first. Load `SCANNER_HISTORY.md` only for a specific historical question or incident.
- Do not load multiple old scanner phase documents as competing specifications.
- Verify volatile facts (branch, commit, PR, CI, deployment) against GitHub before updating current-state documents.
- Separate exploratory research from accepted architecture. Update canonical decisions only after validation.

## Document ownership

- `PROJECT_CONTEXT.md`: durable product constraints; no full PR changelog.
- `ARCHITECTURE.md`: accepted decisions and invariants; no repeated per-commit logs.
- `IMPLEMENTATION_STATUS.md`: current verified state and outstanding acceptance gates.
- `ROADMAP.md`: future work and exit criteria, not a duplicate architecture spec.
- `AI_HANDOFF.md`: one current handoff at top; old handoffs labelled historical.
- `SESSION_LOG.md`: chronological session breadcrumbs.
- `CHANGELOG_AI.md`: concise implementation evidence, not repeated session narratives.
- Scanner current truth: `SCANNER_ENGINE.md`; scanner history: `SCANNER_HISTORY.md`.
- PWA runtime/release truth: `PWA_RUNTIME_RELEASE.md`.

Scanner documentation has exactly two canonical files: `SCANNER_ENGINE.md` for current implementation truth and `SCANNER_HISTORY.md` for investigations, decisions and historical evidence. Do not create standalone phase/audit documents for Scanner. Add new durable Scanner knowledge to one of these two files; keep unrelated feature documentation out of Scanner context.
