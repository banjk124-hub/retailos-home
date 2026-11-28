# RetailOS Roadmap — 2026-11-28

This roadmap records future work, not a visual-style authority. Product and experience work follows [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md).

## Governance
- No active global visual language is selected. Explore and validate experience-specific directions; obtain owner approval before substantial creative implementation.
- Verify live branch, commit, PR, CI and deployment before volatile status updates.
- Merge, deployment and production transfer are separate approval gates.

## Experience development lifecycle
Discover the workflow, user context, environment and constraints; explore materially different directions; prototype where feasibility or interaction matters; validate technical constraints; obtain approval; implement and QA. Scale the process to the task. Do not inherit former M0 aesthetics or approval gates as active instructions.

## Cross-platform presentation governance
- Desktop and Mobile may own independent shells, navigation and presentation composition while sharing business logic, data contracts and operation results.
- A feature request without a platform qualifier defaults to shared Desktop + Mobile. Explicit platform-only scope must be recorded in the capability matrix.
- Nine current Home workflows are shared Desktop/Mobile. Camera barcode scanning and camera-only copy/presentation are Mobile-only; manual barcode lookup remains shared. Tablet is review-required.
- Responsive adapts the selected presentation; viewport breakpoints do not decide product capability.
- Canonical policy: DECISIONS.md PD-007/PD-008, ARCHITECTURE.md ADR-030 and PLATFORM_CAPABILITY_MATRIX.md.

## Technical workstreams
- **SH-01 shell/platform presentation — complete:** PR #193 merged to main at `58d478cf6e8d6e5277c7ca2b60b274731670dfd0`; exact-head CI #1948 passed on `3381cdf9c79521f29641ab41ef95b60033d9169a`, including 10 Playwright tests. The follow-up Mobile-only camera capability enforcement across Home and Stocktake was completed by PR #195 at `a64a49fe516b03cc7c8641a6e23c54a3391a6887`; exact-head CI #1968 passed on `ed466383ceaad2d619fd7e99932e65ebf23e311c`. See SH-01_SHELL_PRESENTATION_OWNERSHIP.md and PLATFORM_CAPABILITY_MATRIX.md.
- **PCM-01–06 Platform Capability Matrix reconciliation — complete:** PR #196 merged to `main` at `adc2ec310c46f3f050b2af81b02ba622e8dc18b3`. Documentation-only reconciliation; this does not close physical-device acceptance.
- **PW-01 physical PWA acceptance — deferred by owner:** physical iOS/iPadOS and Android installed-PWA validation is not claimed complete; reopen on a reproducible defect, material platform-sensitive change or explicit release requirement.
- **CSS-01 CSS ownership migration — in progress:** CSS-01A inventory/import-owner map and CSS-01B static source audit are complete at the recorded baseline. CSS-01C bounded migration, emitted CSS chunk review and before/after computed-style evidence remain open. No broad deletion is authorized by this audit.
- **AUDIT-03A production CSS baseline — proposed:** measure production CSS delivery and bundle composition before deciding whether optimization is warranted.
- **UI-04 feature presentation migration — complete:** UI-04A–F are merged. See UI_UX_PHASE_04_FEATURE_PRESENTATION.md.
- **UI-03 CSS consolidation — complete:** merged in PR #180; see UI_UX_PHASE_03_CSS_CONSOLIDATION.md.

## Experience system and Journey workstream

The canonical contract is `EXPERIENCE_SYSTEM_SPEC.md`; ADRs live in `ARCHITECTURE.md`. The architecture is **Single-App, Multi-Page, Persistent Shell**: the App Shell remains mounted, Desktop keeps a compact left Navigation Dock, Mobile uses adaptive navigation, and only the active Page workspace changes. Shared experience foundations and shared system-data contracts coexist with independently owned Page presentation and business domains.

- **JRN-00 source audit — complete:** audited main at `e2976d807ad9bc596ec38dd5852ddadbc48d2f49`. Static source audit only; no device/performance claims.
- **JRN-01 Journey + Shell + Data contract — implemented on PR #211, pending owner review and exact-head CI:** typed authenticated destinations, neutral workflow identity, Home return context, push/pop/replace, safe-exit and semantic direction; this plan clarification adds persistent authenticated Shell, Desktop Dock persistence, adaptive Mobile navigation, global quick-action availability, one Experience System with Page-level presentation freedom, and shared-system-data versus domain/UI-state boundaries. No runtime shell/controller/page-host implementation is claimed.
- **JRN-02 Persistent Shell and navigation runtime — proposed:** implement/verify authenticated Shell persistence across destination changes; Desktop Dock remains mounted and fixed while workspace changes; Mobile adaptive navigation resolves the same destination/action definitions; global quick-action host is reachable from every Page. Preserve Login/Identity boundaries.
- **JRN-03 Page Host and independent workspaces — proposed:** implement lazy active Page Host and migrate only the two ready workflows, Stocktake and Stocktake Import, into independent Pages. Home remains a Page and entry point. Do not create nested apps or a giant module container.
- **JRN-04 Journey restoration, safe exit and lifecycle — proposed:** Home return context, feature-to-feature navigation guards, dirty/active work handling, resource cleanup and coordination with existing PWA update blockers.
- **JRN-05 Shared System Data contracts — proposed:** audit existing shared data sources/stores first; define only the minimum repositories/domain services/version signals needed for cross-Page consistency. Preserve offline/local persistence and avoid a global mega-store or backend decision.
- **JRN-06 Experience System implementation — proposed:** audit and align typography, color/tokens, components, icon semantics, motion and feedback. Keep global foundations stable while allowing Page-local layouts, variants and choreography. Review impact before changing shared contracts.
- **JRN-07 Cross-Page and cross-platform QA — proposed:** verify Desktop persistent Dock, Mobile navigation reachability, Page transitions, quick-action return, data consistency, dirty-work protection, reduced motion, keyboard/safe areas and target-device performance. Tablet remains subject to the capability matrix.
- **DOC-01 documentation reconciliation — proposed:** reconcile implementation status, handoff and specialist docs after each accepted phase; avoid duplicate competing specifications.

Sequence: JRN-01 contract → JRN-02 persistent/adaptive Shell runtime → JRN-03 independent Page Host and two ready workflows → JRN-04 safe navigation/lifecycle → JRN-05 shared data contracts → JRN-06 Experience System refinement → JRN-07 integrated QA. JRN-05 may be pulled earlier only if JRN-03 source audit proves a concrete data contract is required; do not prebuild infrastructure speculatively.

## Technical invariants
Preserve auth/session, module registry and stable IDs, snapshot/cache/offline contracts, scanner engine/lifecycle, Stocktake persistence/export, Import parsing/precision/conflict handling, overlay lifecycle, PWA update-safety and GitHub Pages deployment boundaries. Scanner stabilization is closed; reopen only for a reproducible defect, measured bottleneck or new requirement.

## Verification discipline
Distinguish source inspection, automated CI, browser emulation, physical-device acceptance, owner approval, merge and deployment. Evidence for one gate does not imply completion of another.
