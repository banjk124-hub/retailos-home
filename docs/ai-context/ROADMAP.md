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
- **CSS-01 CSS ownership migration — bounded/closed with retained debt:** CSS-01A/B inventory and audit, bounded CSS-01C retirements and CSS-01D regression checks are recorded; remaining `.mobile-nav` declaration groups were intentionally retained where safe isolation was not demonstrated. See `CSS_01_CSS_OWNERSHIP_MIGRATION.md` and `AUDIT_03E_CSS_OWNERSHIP_CLOSURE.md`.
- **AUDIT-03A production CSS baseline — proposed:** measure production CSS delivery and bundle composition before deciding whether optimization is warranted.
- **UI-04 feature presentation migration — complete:** UI-04A–F are merged. See UI_UX_PHASE_04_FEATURE_PRESENTATION.md.
- **UI-03 CSS consolidation — complete:** merged in PR #180; see UI_UX_PHASE_03_CSS_CONSOLIDATION.md.

## Experience system and Journey workstream

The canonical Journey/Shell/Page contract is `EXPERIENCE_SYSTEM_SPEC.md`; ADRs remain in `ARCHITECTURE.md`. The implemented pattern is **Single-App, Multi-Page, Persistent Shell**.

**JRN-01 → JRN-03D core ownership/lifecycle — complete on main**
- JRN-01 contract (#211), JRN-02 persistent Shell navigation (#212), JRN-03A JourneyController/Page Host (#215), JRN-03B Stocktake Page (#216), JRN-03C Stocktake Import Page (#217).
- JRN-03D-A/B/C audit, ownership contracts and integrated browser QA (#218–220).
- JRN-03D-D1 scanner exit/camera handoff (#221), D2 Mobile Feature shortcuts (#222), D3 Shell-owned Module Library (#223).
- UX-01 Module Library refinement (#224); Desktop Dock-connected Library tree and Feature Page shortcut styling are complete in PRs #227–228; Home uses its own Library anchor action.
- Latest runtime merge in this sequence: PR #228, merge commit `6f3ee077e4a4b45af47b4490aa32a93ef639c59f`. The older CI/Pages evidence above applies to its stated baseline only.

**Explicitly deferred**
- **D4 Page Snapshot/Restore:** postponed. Do not add Page capture/restore, keep-alive, generic snapshot persistence or global state to preserve UI state. First define source-of-truth, freshness/version, invalidation and reconciliation rules, with fixtures for data changes while a Page is inactive.
- **D5 overlay visual consistency:** separate UX follow-up; not required to close the current ownership/lifecycle scope.
- Physical-device acceptance remains separate from browser/CI evidence.

**JRN-05 — Application Journey & Page Transition (new owner-directed priority)**
- First define the total journey from Login → authenticated Home, Home ↔ each ready Feature Page, Feature Page ↔ Feature Page, and Logout → Login.
- Treat App authentication/session transitions and authenticated Page-stack transitions as separate ownership layers.
- Every edge must define both Exit and Enter, trigger, guard, handoff, failure/recovery and readiness before interaction.
- Use Home → Logout → Login as the quality reference for motion analysis, not as a universal animation preset. Different transition families require distinct choreography.
- Sequence: JRN-05A source audit/map → JRN-05B global in/out contract → JRN-05C logout reference analysis → JRN-05D transition-family/acceptance criteria → JRN-05E bounded implementation and regression.
- Detailed durations, easing, per-component motion and Page-specific choreography are deferred until the global journey contract is approved. No universal timing is selected.
- Preserve JRN-01–03D architecture: persistent Shell, typed JourneyController, active-Page-only host, feature-owned state/guards. No Page Snapshot/Restore or keep-alive.
- Canonical specification: `EXPERIENCE_SYSTEM_SPEC.md`, section 13.

**Remaining roadmap**
- JRN-04 Global Quick Actions: proposed; no extraction of Quick Search, Scanner, Settings, Calendar or Notifications is implied.
- JRN-06 shared System Data: audit source contracts first; no backend/realtime/global-store decision.
- JRN-07 Experience System: proposed; visual direction remains open and owner-approved per scope. Detailed motion system work follows JRN-05 global journey contract.
- JRN-08 broader cross-platform/device QA remains separate from completed browser integration coverage.

## Technical invariants
Preserve auth/session, module registry and stable IDs, snapshot/cache/offline contracts, scanner engine/lifecycle, Stocktake persistence/export, Import parsing/precision/conflict handling, overlay lifecycle, PWA update-safety and GitHub Pages deployment boundaries. Scanner stabilization is closed; reopen only for a reproducible defect, measured bottleneck or new requirement.

## Verification discipline
Distinguish source inspection, automated CI, browser emulation, physical-device acceptance, owner approval, merge and deployment. Evidence for one gate does not imply completion of another.
