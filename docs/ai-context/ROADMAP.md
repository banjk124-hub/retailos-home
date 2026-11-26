# RetailOS Roadmap — 2026-11-26

All work follows [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md). This roadmap records future work, not a visual-style authority.

## Governance reset
- Owner withdrew the previous global aesthetic direction on 2026-11-26.
- Documentation/AI governance reset is being performed on `docs/experience-governance-reset`.
- Scope: clarify decision classes, discovery/exploration/prototype/feasibility/approval workflow, retire the previous M0 visual authority and reconcile status/handoff.
- No replacement visual language is selected.
- No application source changes, merge or deployment are included in this reset.

## Experience development lifecycle
For each substantial experience, discover the workflow and context, explore creative alternatives, prototype the most promising direction, validate feasibility, obtain explicit owner approval, implement and QA. Scale the process to the task; small fixes do not need a full concept phase.

Do not inherit the former M0 sequence, aesthetic or approval gates as active instructions. Existing M0 source audits remain historical evidence and must be revalidated before use.

## Technical workstreams
- Preserve established auth/session, module registry, snapshot/cache/offline, scanner, stocktake, import/export, overlay and PWA release contracts.
- Scanner stabilization is closed. Reopen only for a reproducible defect, measured bottleneck or new requirement.
- Continue source/runtime/browser/device verification according to the affected workflow; distinguish CI, browser verification, device acceptance and owner approval.

## Governance
Verify live branch/PR/CI/deployment before status updates. No merge without explicit owner approval; no deployment without explicit authorization. Production transfer is a separate decision.
