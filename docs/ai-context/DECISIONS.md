# RetailOS Product & Cross-Domain Decision Register

**Authority:** Product/cross-domain owner decisions, proposals and rejected options.  
**Architecture ADR authority:** ARCHITECTURE.md.  
**Subsystem decisions:** owning domain contracts and history files.

## 1. Decision status
- **Owner-confirmed:** explicitly stated by the owner for the stated scope.
- **Accepted:** approved decision with defined scope and evidence.
- **Proposed:** awaiting validation or owner approval.
- **Experimental:** isolated prototype, not production authority.
- **Rejected:** not selected; reopen only with new evidence and a recorded trigger.
- **Superseded:** replaced by a newer direction; retain history.

A prototype, open PR, green CI or owner silence does not make a proposal accepted.

## 2. Required decision record
Record ID/date, owner and scope; problem/context; options; decision and non-decisions; evidence/trade-offs; affected contracts/consumers; validation/rollout/rollback; reconsideration trigger.

## 3. Owner-confirmed decisions

### PD-001 — RetailOS is an OS-like retail operations workspace
**Status:** Owner-confirmed  
**Decision:** RetailOS must not become a generic admin dashboard or AppSheet reskin. It owns retail semantics, data truth, workflows and product experience.

### PD-002 — Open creative direction; no mandatory global aesthetic
**Status:** Owner-confirmed  
**Date:** 2026-11-26  
**Decision:** The owner withdraws the previous global visual direction and requests a reset of the design/experience governance. No replacement visual language is selected. Minimal, Liquid Glass, burgundy/dark-red, retail photography or any other style must not be used as a default or hidden constraint. Palette, typography, imagery, composition, layout, density, iconography, surfaces/materials, motion and component appearance are creative decisions to be explored in context and approved for a stated scope.
**Required process:** Experience discovery → creative exploration → concept/prototype → technical feasibility → explicit owner review/approval → implementation → QA.
**Approval rule:** AI may recommend, compare and prototype; it may not mark a decision Owner-approved. Approval for one screen does not imply a product-wide system.
**Supersedes:** former PD-002 direction in prior revisions and the active-status claim of UI_UX_M0_GOVERNING_SPEC.md. Former details remain historical only.

### PD-003 — Technical invariants remain protected
**Status:** Owner-confirmed  
**Decision:** Preserve identity/session, data/persistence, module IDs, scanner lifecycle, import/export contracts, PWA release safety, accessibility, responsive behavior and performance constraints. Change only through evidence, impact analysis, migration and appropriate owner approval.

### PD-004 — Reuse by equivalent purpose, preserve feature-specific experience
**Status:** Owner-confirmed  
**Decision:** Reuse solutions when responsibility, semantics and behavior are genuinely the same. Do not force distinct workflows into one visual or component abstraction. Promote shared components only after real consumers and a stable contract demonstrate value.

### PD-005 — Source/runtime prototypes are preferred for implementation feasibility
**Status:** Owner-confirmed  
**Decision:** When interaction, responsive behavior, data or technical feasibility matters, validate in the actual RetailOS source/runtime. External design tools are optional aids, not required dependencies or acceptance blockers.

### PD-006 — Evidence-based removal and continuity
**Status:** Owner-confirmed  
**Decision:** Remove incorrect or unnecessary items only after tracing consumers, behavior, replacement, risks, regression evidence and rollback. Preserve unique historical rationale.


### PD-007 — Shared RetailOS identity, platform-specific capabilities and presentation
**Status:** Owner-confirmed  
**Date:** 2026-11-27  
**Decision:** RetailOS maintains one coherent brand identity and consistent meaning for shared business concepts, but Desktop, Tablet and Mobile are distinct product contexts. A workflow available on one platform is not automatically required on another; capabilities may be platform-specific or shared according to task fit, operating environment, input/output capabilities, permissions, security and operational value. Shared domain/data/state and business rules should remain shared when they represent the same underlying business operation, while shells, navigation, information architecture, layout, density, component composition and platform-specific workflows may differ. Responsive behavior adapts within each platform presentation; it does not enforce feature parity or one universal layout. Installed PWA mode should prefer standalone where supported; fullscreen/immersive behavior is conditional and must respect OS/browser constraints and provide a fallback.

**Non-decisions:** This does not select a visual style, palette, typography, imagery or motion language; does not require duplicated applications or duplicated business logic; does not declare current source to have separate Desktop/Mobile shells; and does not require every feature to be available everywhere.

**Implementation requirements:** Define a platform capability matrix for relevant workflows; distinguish unsupported platform capability from implementation/data/permission/runtime states; use capability detection rather than User-Agent-only classification; preserve stable business/data contracts; validate installed PWA behavior on target OS/browser combinations. Architecture and migration details belong in ARCHITECTURE.md and feature contracts.

### PD-008 — Shared-by-default feature scope and isolated platform presentation
**Status:** Owner-confirmed  
**Date:** 2026-11-27  
**Decision:** Unless a feature request explicitly names a platform, a newly requested workflow/capability is shared by Desktop and Mobile. A request explicitly scoped to Desktop or Mobile creates a platform-only capability. Current Home business workflows (inventory, price, products, orders, delivery, sales, product dates, Stocktake and Stocktake Import) are shared across Desktop and Mobile. Camera barcode scanning and its camera-only entry point, descriptions/instructions, text and presentation CSS are Mobile-only; manual barcode lookup remains shared. Shared UI/UX journeys, identity, terminology, status semantics, domain/data/state, validation and business rules remain common where the purpose and operation are the same. Desktop and Mobile own their presentation composition, layout, spacing, component arrangement and platform-specific navigation; equivalent shared workflows must produce the same business result. A platform-specific presentation change must not alter the other platform. A shared contract change must be implemented consistently and regression-verified on both Desktop and Mobile.

**Tablet non-decision:** Tablet remains `review-required`; do not automatically inherit Desktop or Mobile support. Existing iPad camera behavior is implementation evidence, not approval of the Tablet product policy.

**Implementation requirements:** Every workflow declares platform availability separately from engineering readiness, data state, permissions and runtime capability. Platform scope is product policy; API/permission availability is runtime capability. Responsive breakpoints adapt a selected platform presentation and must not decide product availability. CSS must be owned by shared foundation, platform presentation or feature presentation; do not accumulate cross-platform override patches.

**Canonical matrix:** `PLATFORM_CAPABILITY_MATRIX.md`. Detailed architecture remains in ARCHITECTURE.md ADR-030.

## 4. Superseded and rejected options

| ID | Option | Status | Rationale / reconsideration |
|---|---|---|---|
| PD-OLD-STYLE | Burgundy identity + mandatory retail imagery + previous reference-led direction | SUPERSEDED | Owner withdrew this global direction on 2026-11-26. No automatic replacement. |
| RJ-001 | Figma as required M0 prototype/acceptance workflow | REJECTED | Optional tools must not block source/runtime validation. |
| RJ-002 | Copy reference product semantics/layout into RetailOS | REJECTED | References do not override RetailOS business meaning or owner intent. |
| RJ-003 | One universal layout/component system for every feature | REJECTED | Similar appearance does not prove equivalent workflow, state or lifecycle. |
| RJ-004 | Reopen retired Scanner Worker/production diagnostics for visual redesign | REJECTED | Scanner stabilization is closed; presentation work must not reopen engine internals. |
| RJ-005 | Broad CSS/dependency deletion based only on file size or age | REJECTED | Removal requires consumer, cascade/runtime, migration and regression evidence. |

## 5. Review and change control
Update this register when the owner confirms, rejects or supersedes a material product/cross-domain decision. Keep technical ADRs in ARCHITECTURE.md and detailed subsystem contracts in their domain documents. Do not duplicate detailed implementation specifications here.
