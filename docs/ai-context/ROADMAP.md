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

The canonical contract is `EXPERIENCE_SYSTEM_SPEC.md`; ADRs live in `ARCHITECTURE.md`. RetailOS follows **Single-App, Multi-Page, Persistent Shell**. The Shell survives Page changes; Desktop keeps a fixed left Dock, Mobile uses its existing adaptive bottom navigation. Pages own their workspace and business domain.

- **JRN-00 source audit — complete:** audited main at `e2976d807ad9bc596ec38dd5852ddadbc48d2f49`. Static source audit only; no device/performance claims.
- **JRN-01 Journey + Shell + Data contract — merged:** PR #211, merge commit `2e0b9ee90e99a39d96ebe8598bcf00a4ec6a0020`. Typed destinations, neutral workflow identity, Home return context, push/pop/replace, safe-exit semantics and persistent-shell ownership contract are recorded. No runtime controller or Page Host was included.
- **JRN-02 Persistent Shell navigation — merged:** PR #212, merge commit `b958d9033d8f5c1f7a0a48844bde1a9909ca66de`; ShellNavigation is rendered by AuthenticatedAppShell and Home registers its navigation model through the shell context. Existing Desktop fixed-left Dock and Mobile bottom navigation are retained.
- **JRN-03 source audit — complete at baseline `b30505a86511909d94406bfd8467be4ec204c620`:** static source/contract audit recorded in `AUDIT_JRN_03_PAGE_HOST.md`; no runtime changes.
- **JRN-03 Page Host and independent workspaces — proposed:** implement the minimal authenticated destination controller and lazy active Page Host; move only Stocktake and Stocktake Import into independent Pages. Home remains a Page and entry point. Follow the audit's staged acceptance gates; do not bundle JRN-04 global actions.
- **JRN-04 Global Quick Actions — proposed:** extract Quick Search, Scanner, Settings, Calendar and Notifications from Home-owned state into a persistent Shell-level host, available from every Page; preserve invoking Page context and resource lifecycle. Do this after Page Host exists so the behavior is tested across actual destinations.
- **JRN-05 Journey restoration, safe exit and lifecycle — proposed:** restore Home context, guard feature-to-feature exits, protect dirty/active work and coordinate with PWA update blockers.
- **JRN-06 Shared System Data contracts — proposed:** audit existing sources first; define only the minimum neutral repositories/domain services/version signals needed for cross-Page consistency. Preserve offline/local persistence; no backend or global mega-store decision.
- **JRN-07 Experience System implementation — proposed:** align typography, semantic colors, tokens, component contracts, icons, motion and feedback while preserving Page-level layout and composition freedom.
- **JRN-08 Cross-Page and cross-platform QA — proposed:** verify persistent Desktop Dock, Mobile navigation, Page transitions, global action return, data consistency, dirty-work protection, reduced motion, keyboard/safe areas and target-device performance. Tablet remains governed by the capability matrix.

Sequence: JRN-01 merged → JRN-02 persistent navigation Shell → JRN-03 Page Host/two ready workflows → JRN-04 global quick actions → JRN-05 safe exit/lifecycle → JRN-06 shared system data → JRN-07 Experience System → JRN-08 integrated QA. Do not create abstractions before a real consumer requires them.

## Technical invariants
Preserve auth/session, module registry and stable IDs, snapshot/cache/offline contracts, scanner engine/lifecycle, Stocktake persistence/export, Import parsing/precision/conflict handling, overlay lifecycle, PWA update-safety and GitHub Pages deployment boundaries. Scanner stabilization is closed; reopen only for a reproducible defect, measured bottleneck or new requirement.

## Verification discipline
Distinguish source inspection, automated CI, browser emulation, physical-device acceptance, owner approval, merge and deployment. Evidence for one gate does not imply completion of another.
