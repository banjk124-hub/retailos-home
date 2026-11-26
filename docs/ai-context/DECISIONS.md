# RetailOS Product & Cross-Domain Decision Register

**Authority:** Product and cross-domain decisions, owner confirmations and rejected options.  
**Architecture ADR authority:** ARCHITECTURE.md.  
**Subsystem decisions:** owning domain contracts and their history files.  
**Rule:** Do not duplicate architecture ADRs or subsystem-specific technical specifications here.

## 1. Decision status
- **Owner-confirmed:** explicitly stated by the product owner for the stated scope.
- **Accepted:** approved decision with defined scope and evidence.
- **Proposed:** awaiting validation or owner approval.
- **Experimental:** isolated prototype; not production authority.
- **Rejected:** evaluated and not selected; reopen only with new evidence and a recorded trigger.
- **Superseded:** replaced by a newer decision; retain the historical record and link to successor.

An open PR, prototype or green CI does not make a proposal accepted.

## 2. Required decision record
Every material product/cross-domain decision records ID, date, owner and scope; problem/context and constraints; options considered; decision and explicit non-decisions; evidence and trade-offs; affected contracts, consumers and dependencies; rollout, validation and rollback; and reconsideration trigger or superseding decision.

Architecture-specific ADRs continue in ARCHITECTURE.md. Scanner decisions remain in SCANNER_ENGINE.md / SCANNER_HISTORY.md.

## 3. Owner-confirmed product decisions

### PD-001 — RetailOS is an OS-like retail operations workspace
**Status:** Owner-confirmed  
**Scope:** Product identity and all product surfaces  
**Decision:** RetailOS must not become a generic admin dashboard or an AppSheet reskin. It owns its retail semantics, data truth, workflows and visual language.  
**Source:** Product owner direction; see RETAILOS_PRODUCT_SKILL.md and PROJECT_CONTEXT.md.

### PD-002 — Approved reference roles and RetailOS identity
**Status:** Owner-confirmed  
**Scope:** Product and experience direction  
**Decision:** Burgundy/dark-red is the dominant brand identity; Vietnamese-first typography and authentic retail imagery are required directions. The supplied image guides art direction/composition; the supplied video guides motion, animation, transitions and interaction feedback. Adapt rather than copy. RetailOS owns business meaning, brand semantics and architecture.  
**Non-decisions:** Exact final HEX palette, font family, image vendor/licensing and motion timing remain evidence-gated.  
**Source:** UI_UX_M0_GOVERNING_SPEC.md.

### PD-003 — Open and extensible technology/design system
**Status:** Owner-confirmed  
**Scope:** Design system, frontend, runtime, tooling and future extensions  
**Decision:** Do not freeze architecture or technology to the current implementation. New browsers, libraries, frameworks, design systems and tools may be explored when they solve a real need; adoption requires source prototype, compatibility/performance/cost/license/maintenance evidence and the relevant approval.  
**Source:** Product owner clarification and RETAILOS_PRODUCT_SKILL.md.

### PD-004 — Reuse by equivalent purpose, preserve feature-specific experience
**Status:** Owner-confirmed  
**Scope:** Components, patterns and feature architecture  
**Decision:** Reuse solutions when responsibility, semantics and behavior are genuinely the same. Do not force distinct workflows into a shared visual/component abstraction. Shared promotion requires proven cross-feature value and a stable contract.  
**Source:** Product owner clarification; see COMPONENT_AND_PATTERN_GOVERNANCE.md.

### PD-005 — Source-code prototypes are the visual validation path
**Status:** Owner-confirmed  
**Scope:** UI/UX M0 and future visual/interaction validation  
**Decision:** Build and inspect prototypes directly in RetailOS source/runtime. Figma is not a required dependency, blocker or acceptance surface. External design tools may be optional aids only when they materially help and never replace source-backed implementation evidence.  
**Source:** Explicit owner instruction rejecting Figma dependency.

### PD-006 — Evidence-based removal and continuity
**Status:** Owner-confirmed  
**Scope:** Code, dependencies, documents, experiments and technical debt  
**Decision:** Remove incorrect or unnecessary elements only after tracing consumers, behavior, replacement, risks, regression tests and rollback. Preserve unique historical rationale; do not keep obsolete instructions active.  
**Source:** Product owner clarification; see DEPRECATION_REGISTER.md.

## 4. Proposed decisions

### PD-007 — Canonical document ownership model
**Status:** Proposed in BATCH 01; owner review pending  
**Decision:** Use INDEX as navigation, Product Skill as product-wide workflow, M0 spec as UI/UX authority, ARCHITECTURE as project ADR authority, DECISIONS as product/cross-domain decision register, and dedicated component/technology/glossary/deprecation registers.  
**Acceptance:** Owner review of BATCH 01 PR and consistency validation.

## 5. Rejected and superseded options

| ID | Option | Status | Why | Reconsider only when |
|---|---|---|---|---|
| RJ-001 | Figma as required M0 prototype/acceptance workflow | REJECTED | Owner requires direct source-code prototypes; Figma access must not block progress. | Owner explicitly changes the workflow; optional Figma use never becomes a dependency by implication. |
| RJ-002 | Copy reference palette/layout/product semantics into RetailOS | REJECTED | References guide separate aspects of craft; RetailOS retains its own brand and retail semantics. | No reconsideration for copying; new references may be studied under PD-002. |
| RJ-003 | One universal layout/component system for every feature | REJECTED | Similar appearance does not prove equivalent workflow, state or lifecycle. | New evidence demonstrates a genuinely shared semantic contract for a bounded responsibility. |
| RJ-004 | Reopen retired Scanner Worker/production diagnostics for visual redesign | REJECTED | Scanner stabilization is closed; presentation work must not reopen engine internals. | Reproducible scanner defect, measured bottleneck or new explicit requirement; then use Scanner domain governance and benchmark evidence. |
| RJ-005 | Broad CSS/dependency deletion based only on file size or age | REJECTED | Size/age does not prove unused behavior or safe removal. | Consumer/cascade/runtime evidence and tested migration are supplied. |

## 6. Review and change control
- Check this register before re-proposing a rejected or superseded approach.
- New evidence must be linked; repetition is not evidence.
- A new owner decision supersedes only the stated scope; preserve unrelated decisions.
- Update this register and the owning technical document in the same change set.
- Do not mark proposals accepted without explicit owner approval where required.
