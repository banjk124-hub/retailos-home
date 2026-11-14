# Documentation index

This is the navigation layer for repository documentation. Read the canonical document for a topic; do not copy the same implementation history into several files.

## Start here
1. `AGENTS.md` — operating rules and safety contract.
2. `PROJECT_CONTEXT.md` — durable product facts, constraints and current repository status.
3. `ARCHITECTURE.md` — accepted architecture decisions and protected contracts.
4. `IMPLEMENTATION_STATUS.md` — verified implementation state and known gaps.
5. `.github/skills/retailos-implementation/SKILL.md` — implementation workflow.

## Topic sources of truth
| Topic | Canonical document |
|---|---|
| Cross-feature overlays, scroll locking and viewport behavior | `UI_OVERLAY_ARCHITECTURE.md` |
| Physical desktop/Android/iOS UI acceptance | `UI_OVERLAY_ACCEPTANCE.md` |
| Scanner recognition architecture | `SCANNER_RECOGNITION_PIPELINE.md` |
| Scanner implementation phase order | `ROADMAP.md` |
| PWA bundle, service worker and cache behavior | `PERFORMANCE_BUNDLE_PWA.md` |
| Stocktake import file contract | `STOCKTAKE_FILE_IMPORT.md` |
| Historical scanner audit evidence | Individual dated `SCANNER_*_AUDIT_*.md` records |
| Login Phase 2 historical changes | `docs/implementation/LOGIN_PHASE2_HISTORY.md` |

## Record ownership and deduplication
- `PROJECT_CONTEXT.md`: durable product constraints and current top-level state; no full PR changelog.
- `ARCHITECTURE.md`: accepted decisions/invariants; no repeated per-commit logs.
- `IMPLEMENTATION_STATUS.md`: current verified state and outstanding acceptance gates.
- `ROADMAP.md`: future sequence and exit criteria.
- `AI_HANDOFF.md`: current handoff is at the top; older scanner PR narratives below are a historical archive, not current status.
- `SESSION_LOG.md`: session handoffs; `CHANGELOG_AI.md`: implementation evidence. Avoid repeating full narratives in both.
- Dated audit/spec files are retained when they preserve unique evidence, decisions or acceptance criteria. Do not delete them merely because they discuss the same subsystem.
- When two documents cover one phase and have no inbound references, merge their distinct content into one history file and remove duplicate entry points.
