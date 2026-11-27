# RetailOS Roadmap — 2026-11-26

All work follows [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md). This roadmap records future work, not a visual-style authority.

## Governance
- There is no active global visual language. Follow the experience discovery, creative exploration, prototype, feasibility and owner-approval workflow in RETAILOS_PRODUCT_SKILL.md.
- Verify live branch/PR/CI/deployment before status updates.
- No merge without explicit owner approval; no deployment without explicit authorization. Production transfer is a separate decision.

## Experience development lifecycle
For each substantial experience, discover the workflow and context, explore creative alternatives, prototype the most promising direction, validate feasibility, obtain explicit owner approval, implement and QA. Scale the process to the task; small fixes do not need a design ceremony.

Do not inherit former M0 sequence, aesthetic or approval gates as active instructions. Existing M0 source audits remain historical evidence and must be revalidated before use.

## Technical workstreams
## Cross-platform presentation governance — owner-confirmed, audit pending
- RetailOS shares brand identity and business semantics but does not require Desktop/Mobile feature parity. Workflows may be platform-specific; shared domain/data/business rules remain shared where the underlying operation is the same.
- Desktop and Mobile may use independent shells/navigation/presentation. Tablet needs explicit evaluation. Responsive adapts each presentation; it is not the platform policy.
- Installed PWA should prefer standalone where supported; fullscreen is conditional and workflow-specific.
- Canonical decisions: DECISIONS.md PD-007 and ARCHITECTURE.md ADR-030. Do not start broad CSS migration before capability, shell and PWA display-mode audits.

- **UI-03 CSS consolidation — complete:** merged to main in PR #180 at 7b679da9bbd3b3a21b50711a8b56be8ca14e2e54. Nine verified legacy selector families retired; Home architecture stylesheet consolidated with original cascade order preserved; exact duplicate reduced-motion rule removed. Final documentation HEAD c85cad4cebbb37e2909f47658a7eff91331b4484 passed CI run #1817. See UI_UX_PHASE_03_CSS_CONSOLIDATION.md.
- **UI-04 feature presentation migration — active:** branch refactor/ui-04-feature-presentation. Scope: Login, Settings/Update Center, Scanner presentation, Stocktake and Stocktake Import. Discovery/source baseline and protected contracts are recorded in UI_UX_PHASE_04_FEATURE_PRESENTATION.md. No application source changes yet.
- Preserve established auth/session, module registry, snapshot/cache/offline, scanner, stocktake, import/export, overlay and PWA release contracts.
- Scanner stabilization is closed. Reopen only for a reproducible defect, measured bottleneck or new requirement.
- Continue source/runtime/browser/device verification according to the affected workflow; distinguish CI, browser verification, device acceptance and owner approval.
