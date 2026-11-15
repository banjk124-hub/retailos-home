# Documentation index

This file is the navigation layer for repository documentation. Read the canonical document for a topic; do not copy the same implementation history into several files.

## Start here

1. `AGENTS.md` — operating rules and safety contract.
2. `PROJECT_CONTEXT.md` — durable product facts and project constraints.
3. `ARCHITECTURE.md` — accepted architecture decisions and protected contracts.
4. `IMPLEMENTATION_STATUS.md` — verified implementation state and outstanding acceptance gates.
5. `.github/skills/retailos-implementation/SKILL.md` — implementation workflow.

## Topic sources of truth

| Topic | Canonical document |
|---|---|
| Scanner current architecture, runtime ownership, decoder options, payload rules and acceptance gates | [SCANNER_ENGINE.md](./SCANNER_ENGINE.md) |
| Scanner historical investigations, incident notes and migration evidence | [SCANNER_HISTORY.md](./SCANNER_HISTORY.md) |
| Scanner implementation priorities and exit criteria | [ROADMAP.md](./ROADMAP.md) |
| Cross-feature overlays, scroll locking and viewport behavior | `UI_OVERLAY_ARCHITECTURE.md` |
| Physical desktop/Android/iOS UI acceptance | `UI_OVERLAY_ACCEPTANCE.md` |
| Home performance reconciliation | `HOME_PERFORMANCE_RECONCILIATION.md` |
| UI interaction responsiveness | `UI_INTERACTION_RESPONSIVENESS_AUDIT.md` |
| PWA bundle, service worker and cache behavior | `PERFORMANCE_BUNDLE_PWA.md` |
| Stocktake import file contract | `STOCKTAKE_FILE_IMPORT.md` |
| Export utilities | `modules/EXPORT_FILE.md` |
| Login Phase 2 historical changes | `docs/implementation/LOGIN_PHASE2_HISTORY.md` |

## Document ownership

- `PROJECT_CONTEXT.md`: durable product constraints; no full PR changelog.
- `ARCHITECTURE.md`: accepted decisions and invariants; no repeated per-commit logs.
- `IMPLEMENTATION_STATUS.md`: current verified state and outstanding acceptance gates.
- `ROADMAP.md`: future work and exit criteria, not a duplicate architecture spec.
- `AI_HANDOFF.md`: one current handoff at the top; older handoffs are clearly labelled historical.
- `SESSION_LOG.md`: chronological session breadcrumbs.
- `CHANGELOG_AI.md`: concise implementation evidence; avoid repeating complete session narratives.
- Scanner implementation truth lives in `SCANNER_ENGINE.md`; scanner historical notes are indexed in `SCANNER_HISTORY.md`.
- PWA runtime/release truth lives in `PWA_RUNTIME_RELEASE.md`; bundle-size analysis remains in `PERFORMANCE_BUNDLE_PWA.md`.

## Historical-document policy

Historical audits, phase plans and incident notes are retained when they contain unique evidence, symptoms, decisions or regression clues. They must not appear as competing current specifications. When an old document conflicts with current source or SCANNER_ENGINE.md, treat it as a historical snapshot and verify the exact resolving change before acting.
