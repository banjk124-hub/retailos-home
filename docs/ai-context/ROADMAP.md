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

The canonical Journey/Shell/Page contract is `EXPERIENCE_SYSTEM_SPEC.md`; ADRs remain in `ARCHITECTURE.md`. The implemented pattern is **Single-App, Multi-Page, Persistent Shell**.

**JRN-01 → JRN-03D core ownership/lifecycle — complete on main**
- JRN-01 contract (#211), JRN-02 persistent Shell navigation (#212), JRN-03A JourneyController/Page Host (#215), JRN-03B Stocktake Page (#216), JRN-03C Stocktake Import Page (#217).
- JRN-03D-A/B/C audit, ownership contracts and integrated browser QA (#218–220).
- JRN-03D-D1 scanner exit/camera handoff (#221), D2 Mobile Feature shortcuts (#222), D3 Shell-owned Module Library (#223).
- UX-01 Module Library refinement (#224).
- Current main: `f8a3c511fcc9d7575b4da4b5f839d8eeee846c99`; main CI #2150 and Pages Build & Deploy #216 passed.

**Explicitly deferred**
- **D4 Page Snapshot/Restore:** postponed. Do not add Page capture/restore, keep-alive, generic snapshot persistence or global state to preserve UI state. First define source-of-truth, freshness/version, invalidation and reconciliation rules, with fixtures for data changes while a Page is inactive.
- **D5 overlay visual consistency:** separate UX follow-up; not required to close the current ownership/lifecycle scope.
- Physical-device acceptance remains separate from browser/CI evidence.

**Remaining roadmap**
- JRN-04 Global Quick Actions: proposed; no extraction of Quick Search, Scanner, Settings, Calendar or Notifications is implied.
- JRN-06 shared System Data: audit source contracts first; no backend/realtime/global-store decision.
- JRN-07 Experience System: proposed; visual direction remains open and owner-approved per scope.
- JRN-08 broader cross-platform/device QA remains separate from completed browser integration coverage.

## Technical invariants
Preserve auth/session, module registry and stable IDs, snapshot/cache/offline contracts, scanner engine/lifecycle, Stocktake persistence/export, Import parsing/precision/conflict handling, overlay lifecycle, PWA update-safety and GitHub Pages deployment boundaries. Scanner stabilization is closed; reopen only for a reproducible defect, measured bottleneck or new requirement.

## Verification discipline
Distinguish source inspection, automated CI, browser emulation, physical-device acceptance, owner approval, merge and deployment. Evidence for one gate does not imply completion of another.
