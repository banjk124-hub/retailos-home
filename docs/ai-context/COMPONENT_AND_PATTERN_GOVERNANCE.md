# RetailOS Component & Pattern Governance

**Authority:** Canonical governance for shared foundations, components, patterns and feature-owned experiences.  
**Parent authority:** `RETAILOS_PRODUCT_SKILL.md`; UI direction remains in `UI_UX_M0_GOVERNING_SPEC.md`.  
**Status:** Active governance standard; does not authorize implementation or migration by itself.

## 1. Purpose

Prevent duplicate solutions without forcing unrelated workflows into one visual or technical abstraction. Reuse is based on equivalent responsibility, semantics, state behavior and lifecycle—not merely similar appearance.

## 2. Ownership layers

1. **Design language** — brand, semantic color, typography, spacing, surfaces, imagery, responsive behavior, motion and accessibility.
2. **Shared foundations** — tokens, platform adapters and low-level primitives with cross-feature semantics.
3. **Shared components** — components with proven use by multiple independent features and a stable contract.
4. **Reusable patterns** — documented solutions for repeated interaction or workflow concerns; may be composed from different feature components.
5. **Feature-owned experience** — feature-specific composition, components, state, validation, persistence and lifecycle.

A feature-owned component is not a failure of reuse. Keep ownership local when workflow semantics or lifecycle differ.

## 3. Reuse decision test

Before creating or promoting an abstraction, answer:

- Is the responsibility genuinely the same?
- Are inputs, outputs, semantics and accessibility behavior equivalent?
- Are state ownership, async behavior, error handling and lifecycle compatible?
- Do consumers need the same extension points?
- Does reuse reduce total complexity rather than merely reduce line count?
- Can a change be made without surprising unrelated consumers?

If any material answer is no, retain separate feature-owned implementations and share only the proven lower-level primitive or contract.

## 4. Promotion lifecycle

`LOCAL → CANDIDATE → SHARED → DEPRECATED → RETIRED`

- **LOCAL:** owned by one feature.
- **CANDIDATE:** potential reuse identified; no shared API promise.
- **SHARED:** at least two real consumers, documented owner, contract, tests and migration compatibility.
- **DEPRECATED:** replacement or removal planned; consumers and deadline/exit criteria recorded.
- **RETIRED:** no active consumers, behavior migrated and regression evidence retained.

Do not promote speculative components for hypothetical future modules.

## 5. Required contract for shared components

Document only what is needed to safely use and maintain it:
- Responsibility and explicit non-responsibilities.
- Owning package/module and maintainer.
- Public props/events and semantic variants.
- State ownership and controlled/uncontrolled behavior.
- Accessibility, focus, keyboard, touch and reduced-motion behavior.
- Responsive constraints and content-density assumptions.
- Async, cancellation, interruption and cleanup behavior where relevant.
- Dependencies, performance cost and fallback.
- Consumers, tests, migration notes and deprecation path.

Avoid universal mega-components, boolean-prop explosion, hidden business logic, duplicate token systems and styling overrides that compete with feature ownership.

## 6. Visual consistency without homogenization

Consistency means common brand, terminology, semantic states, accessibility and interaction quality. It does not require identical layout, density, card structure or component composition across Login, Home, Stocktake, Import and Settings.

Reuse a component only when it improves the task and preserves each feature's visual and operational intent. Feature-specific art direction is allowed within the approved RetailOS identity.

## 7. Change and removal

Before changing a shared contract:
1. Enumerate consumers and callsites.
2. Identify persisted, async, accessibility and lifecycle contracts.
3. State compatibility and migration strategy.
4. Add regression coverage for affected consumers.
5. Provide rollback or staged rollout where risk warrants it.
6. Update the component registry/decision record and deprecation register.

Deletion requires evidence of no live consumers or a completed migration. See `DEPRECATION_REGISTER.md`.

## 8. Acceptance checklist

- [ ] Correct ownership layer selected.
- [ ] Reuse test passed, or feature ownership explicitly justified.
- [ ] No duplicate source of truth or competing lifecycle manager.
- [ ] Public contract and accessibility behavior documented.
- [ ] Consumers and regressions identified.
- [ ] Performance/fallback cost is acceptable.
- [ ] Tests and migration/rollback evidence exist.
- [ ] Canonical docs and status are updated.
