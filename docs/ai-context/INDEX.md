# Documentation index

This file is the navigation layer for repository documentation. Read the canonical document for a topic; do not copy the same implementation history into several files.

## Start here

1. `AGENTS.md` — operating rules, selective context policy and safety contract.
2. `PROJECT_CONTEXT.md` — durable product facts and current top-level repository state.
3. `IMPLEMENTATION_STATUS.md` — verified implementation state and outstanding acceptance gates.
4. Select the relevant canonical topic document from the table below; read `ARCHITECTURE.md` only when the task touches an architecture decision or protected contract.
5. Load `.github/skills/retailos-core/SKILL.md` and only the task skill needed for the request (audit, technical research or implementation).
6. `prompts/START_HERE.md` — concise session-start and task prompts.

## Topic sources of truth

| Topic | Canonical document |
|---|---|
| Scanner current architecture, runtime ownership, decoder options, payload rules and acceptance gates | [SCANNER_ENGINE.md](./SCANNER_ENGINE.md) |
| Scanner historical investigations, incident notes and migration evidence | [SCANNER_HISTORY.md](./SCANNER_HISTORY.md) |
| Scanner implementation priorities and exit criteria | [ROADMAP.md](./ROADMAP.md) |\n| Locked scanner stabilization plan SC-01–05, phase gates and active SC-01A proof | [SCANNER_WORKSTREAM_SC01_05.md](./SCANNER_WORKSTREAM_SC01_05.md) |\n| SC-01A Worker transport/API research findings and test matrix | [SCANNER_SC01A_SPIKE_FINDINGS.md](./SCANNER_SC01A_SPIKE_FINDINGS.md) |
| Cross-feature overlays, scroll locking and viewport behavior | `UI_OVERLAY_ARCHITECTURE.md` |
| Physical desktop/Android/iOS UI acceptance | `UI_OVERLAY_ACCEPTANCE.md` |
| Home performance reconciliation | `HOME_PERFORMANCE_RECONCILIATION.md` |
| UI interaction responsiveness | `UI_INTERACTION_RESPONSIVENESS_AUDIT.md` |
| PWA runtime, user-approved downloads, Update Center, explicit safe-handoff activation, complete offline payload, data separation and rollback | [PWA_RUNTIME_RELEASE.md](./PWA_RUNTIME_RELEASE.md) |
| Bundle analysis, code splitting and performance evidence | [PERFORMANCE_BUNDLE_PWA.md](./PERFORMANCE_BUNDLE_PWA.md) |
| Stocktake import file contract | `STOCKTAKE_FILE_IMPORT.md` |
| Export utilities | `modules/EXPORT_FILE.md` |
| Login Phase 2 historical changes | `docs/implementation/LOGIN_PHASE2_HISTORY.md` |

## AI context loading policy

- The default session-start set is `AGENTS.md`, this index, `PROJECT_CONTEXT.md` and `IMPLEMENTATION_STATUS.md`.
- Load only the canonical topic document(s), relevant skill and source files required by the task. `ARCHITECTURE.md` is not a mandatory full read for an unrelated UI or documentation task.
- Historical documents are opt-in evidence for a specific investigation; never bulk-load the archive.
- Verify volatile repository facts (branch, commit, PR, CI, deployment) against GitHub before updating current-state documents.
- Keep exploratory technology research clearly separate from accepted architecture decisions. Update canonical decisions only after an explicit decision and validation.

## Document ownership

- `PROJECT_CONTEXT.md`: durable product constraints; no full PR changelog.
- `ARCHITECTURE.md`: accepted decisions and invariants; no repeated per-commit logs.
- `IMPLEMENTATION_STATUS.md`: current verified state and outstanding acceptance gates.
- `ROADMAP.md`: future work and exit criteria, not a duplicate architecture spec.
- `AI_HANDOFF.md`: one current handoff at the top; older handoffs are clearly labelled historical.
- `SESSION_LOG.md`: chronological session breadcrumbs.
- `CHANGELOG_AI.md`: concise implementation evidence; avoid repeating complete session narratives.
- Scanner implementation truth lives in `SCANNER_ENGINE.md`; the locked SC-01–05 stabilization sequence and active SC-01A proof plan live in `SCANNER_WORKSTREAM_SC01_05.md`; scanner historical notes are indexed in `SCANNER_HISTORY.md`.
- PWA runtime/release truth lives in `PWA_RUNTIME_RELEASE.md`; every implementation and deployment must follow its separate download-consent and explicit safe-handoff activation contract. Bundle-size analysis remains in `PERFORMANCE_BUNDLE_PWA.md`.

## Historical-document policy

Historical audits, phase plans and incident notes are retained when they contain unique evidence, symptoms, decisions or regression clues. They must not appear as competing current specifications. When an old document conflicts with current source or the relevant canonical contract (SCANNER_ENGINE.md or PWA_RUNTIME_RELEASE.md), treat it as a historical snapshot and verify the exact resolving change before acting.
