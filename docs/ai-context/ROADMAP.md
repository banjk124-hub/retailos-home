# RetailOS Roadmap — 2026-11-27

All work follows [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md). This roadmap records future work, not a visual-style authority.

## Governance
- There is no active global visual language. Follow the experience discovery, creative exploration, prototype, feasibility and owner-approval workflow in RETAILOS_PRODUCT_SKILL.md.
- Verify live branch/PR/CI/deployment before status updates.
- No merge without explicit owner approval; no deployment without explicit authorization. Production transfer is a separate decision.

## Experience development lifecycle
For each substantial experience, discover the workflow and context, explore creative alternatives, prototype the most promising direction, validate feasibility, obtain explicit owner approval, implement and QA. Scale the process to the task; small fixes do not need a design ceremony.

Do not inherit former M0 sequence, aesthetic or approval gates as active instructions. Existing M0 source audits remain historical evidence and must be revalidated before use.

## Cross-platform presentation governance — owner-confirmed; PA-02 capability matrix established
- RetailOS shares brand identity and business semantics but does not require Desktop/Mobile feature parity. Workflows may be platform-specific; shared domain/data/business rules remain shared where the underlying operation is the same.
- Desktop and Mobile may use independent shells/navigation/presentation. Tablet needs explicit evaluation. Responsive adapts each presentation; it is not the platform policy.
- Installed PWA should prefer standalone where supported; fullscreen is conditional and workflow-specific.
- Canonical decisions: DECISIONS.md PD-007/PD-008 and ARCHITECTURE.md ADR-030. The approved matrix is `PLATFORM_CAPABILITY_MATRIX.md`.
- Default scope for a feature request without a platform qualifier is shared Desktop + Mobile. Explicit Desktop-only/Mobile-only scope must be recorded in the matrix.
- Current nine Home workflows are shared Desktop + Mobile. Camera barcode scanning and its dedicated copy/presentation are Mobile-only; manual barcode lookup remains shared. Tablet is review-required.
- Shared journey/domain/data semantics stay common; Desktop/Mobile presentation owns independent composition, layout, spacing, components and navigation. Shared changes require both-platform regression evidence; platform-only changes must remain isolated.
- PR #187 is an open Draft static source audit based on main `01c814e546688595d2796c70bd72df228047e5e8`; its CI run #1860 passed on head `8d96a4af6a42e6d7ac4da0167d240f774082c4f5`. The source audit is complete, but owner review of the Desktop/Tablet/Mobile capability matrix remains pending. No platform filtering or shell divergence is authorized by the audit alone.

## Technical workstreams
- **UI-03 CSS consolidation — complete:** merged to main in PR #180 at `7b679da9bbd3b3a21b50711a8b56be8ca14e2e54`. Nine verified legacy selector families retired; Home architecture stylesheet consolidated with original cascade order preserved; exact duplicate reduced-motion rule removed. Final documentation HEAD `c85cad4cebbb37e2909f47658a7eff91331b4484` passed CI run #1817. See UI_UX_PHASE_03_CSS_CONSOLIDATION.md.
- **AUDIT-03 CSS & Design Foundation — static audit complete:** PR #185 merged at `bddb84259f7bc68656a42d467ec83fdddfe17b1f`. Implementation has not started; next proposed gate is AUDIT-03A production CSS delivery baseline. No visual language is selected.
- **UI-04 feature presentation migration — active:** initial slices PR #181 merged at e58bce634b9ff67e95250d36c8653593680463e9. UI-04A/B/C/D/E are implemented, validated and merged. UI-04D PR #189 merged at `e88ae240959a8deea85aee2fd2992d40563ad365`; UI-04E PR #190 merged at `38192b2ce1c426edd6285594a57a2c2970bc14ee`. Final PR-head CI #1902 passed on `62a33ef4c06d5bf45a56d86f17ec34c73dc98198`; main RetailOS CI and Build and deploy PWA workflows succeeded on the merge commit. UI-04F cross-feature closure is implemented and validated in Draft PR #191; exact-head CI #1907 passed on `80aba62c8ee481014c4f47ce75be2422f0df32de` (9 browser tests; 14 captured surfaces with zero runtime errors, failed requests, overflow or duplicate IDs). PR #191 remains unmerged pending owner review. See UI_UX_PHASE_04_FEATURE_PRESENTATION.md.
- Preserve established auth/session, module registry, snapshot/cache/offline, scanner, stocktake, import/export, overlay and PWA release contracts.
- Scanner stabilization is closed. Reopen only for a reproducible defect, measured bottleneck or new requirement.
- Continue source/runtime/browser/device verification according to the affected workflow; distinguish CI, browser verification, device acceptance and owner approval.
