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

The canonical experience contract is [EXPERIENCE_SYSTEM_SPEC.md](./EXPERIENCE_SYSTEM_SPEC.md). It defines destination/page ownership, screen journeys, component boundaries, icon semantics, motion, feedback, resource lifecycle and future feature onboarding. This is a proposed target contract; it does not authorize runtime migration or lock a global visual style.

- **JRN-00 source audit — complete:** audited main at e2976d807ad9bc596ec38dd5852ddadbc48d2f49. Confirmed App owns auth/session and login/identity/home timing; AuthenticatedAppShell composes Identity/Home; HomeScreen still mounts Stocktake and Stocktake Import; motion wrappers/tokens coexist with local transitions; icon registries coexist with direct Lucide imports. Static review only; no browser/device performance claim.
- **JRN-01 Journey contract — implemented, pending merge:** typed authenticated destination model added at `src/platform/journey/journey.types.ts`; stable `RetailModuleId` moved to `src/shared/domain/retailModule.ts` and re-exported by Home for compatibility; destination identity derives from that neutral contract; Home return context, push/pop/replace semantics, safe-exit guard and transition direction are explicit; ADR-043 records the decision; contract test is registered in preflight. Runtime Journey Controller, page host and browser-history integration are not implemented and remain in JRN-02/JRN-03.
- **JRN-02 Feature Page host — proposed:** move Stocktake and Stocktake Import to independently mounted lazy Feature Pages; Home remains an entry point, not their lifecycle owner.
- **JRN-03 Return and safe exit — proposed:** preserve Home context and feature persistence; protect dirty/active work; verify resource cleanup and PWA update blockers.
- **JRN-04 Home quick actions — proposed:** retain Settings, Quick Search, quick Scanner, Calendar and Notifications as Home-owned surfaces unless a later workflow proves otherwise.
- **JRN-05 Motion and feedback contract — proposed:** map semantic transitions and feedback per journey/screen; preserve reduced-motion and low-end performance.
- **JRN-06 Icon contract — proposed:** align semantic ownership, accessibility and state-driven animation; static icon remains default.
- **JRN-07 Cross-platform/performance QA — proposed:** validate Desktop/Mobile composition, Tablet review gates, browser behavior and target-device performance.
- **DOC-01 documentation reconciliation — proposed:** this umbrella spec is canonical for experience behavior; ARCHITECTURE.md remains ADR authority, COMPONENT_AND_PATTERN_GOVERNANCE.md remains reuse policy, PLATFORM_CAPABILITY_MATRIX.md remains capability policy and PWA_RUNTIME_RELEASE.md remains update lifecycle authority.

Sequence: JRN-01 contract complete → JRN-02 page host and two ready workflows → JRN-03 safe return/resource lifecycle → JRN-04 Home quick-action boundary → JRN-05/JRN-06 interaction system → JRN-07 validation. Motion/icon visual details can be explored in parallel as design studies, but implementation must not get ahead of approved contracts.

## Technical invariants
Preserve auth/session, module registry and stable IDs, snapshot/cache/offline contracts, scanner engine/lifecycle, Stocktake persistence/export, Import parsing/precision/conflict handling, overlay lifecycle, PWA update-safety and GitHub Pages deployment boundaries. Scanner stabilization is closed; reopen only for a reproducible defect, measured bottleneck or new requirement.

## Verification discipline
Distinguish source inspection, automated CI, browser emulation, physical-device acceptance, owner approval, merge and deployment. Evidence for one gate does not imply completion of another.
