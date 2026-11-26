# RetailOS Component & Pattern Governance

**Authority:** Governance for shared foundations, components, patterns and feature-owned experiences.  
**Parent authority:** RETAILOS_PRODUCT_SKILL.md.  
**Status:** Active; does not authorize implementation or migration by itself.

## 1. Purpose
Prevent duplicate solutions without forcing unrelated workflows into one visual or technical abstraction. Reuse is based on equivalent responsibility, semantics, state behavior, accessibility and lifecycle—not merely similar appearance.

## 2. Ownership layers
1. **Design decisions:** visual language and interaction choices for a particular experience; owned by the relevant product/experience decision, not prescribed by this component register.
2. **Shared foundations:** tokens, platform adapters and low-level primitives with proven cross-feature semantics.
3. **Shared components:** components with multiple real consumers and a stable contract.
4. **Reusable patterns:** repeated solutions to interaction/workflow concerns; implementation may differ by feature.
5. **Feature-owned experience:** feature-specific composition, components, state, validation, persistence and lifecycle.

A feature-owned component is not a failure of reuse. Keep ownership local when workflow semantics or lifecycle differ.

## 3. Reuse decision test
- Is the responsibility genuinely the same?
- Are inputs, outputs, semantics and accessibility behavior equivalent?
- Are state ownership, async behavior, errors and lifecycle compatible?
- Do consumers need the same extension points?
- Does reuse reduce total complexity rather than merely line count?
- Can a change be made without surprising unrelated consumers?

If a material answer is no, retain separate feature-owned implementations and share only the proven lower-level primitive or contract.

## 4. Promotion lifecycle
`LOCAL → CANDIDATE → SHARED → DEPRECATED → RETIRED`

- **LOCAL:** owned by one feature.
- **CANDIDATE:** potential reuse identified; no shared API promise.
- **SHARED:** at least two real consumers, documented owner, contract, tests and migration compatibility.
- **DEPRECATED:** replacement/removal planned; consumers and exit criteria recorded.
- **RETIRED:** no active consumers, behavior migrated and regression evidence retained.

Do not promote speculative components for hypothetical future modules.

## 5. Required shared contract
Document responsibility/non-responsibilities, owner, public props/events, semantic variants, state ownership, accessibility/focus/keyboard/touch, responsive constraints, async cancellation/cleanup, dependencies/performance/fallback, consumers/tests/migration/deprecation.

Do not use this register to mandate card structures, typography, colors, surface materials, density, motion style or a universal page composition. Those are contextual creative decisions.

## 6. Change and removal
Before changing a shared contract, enumerate consumers, identify persisted/async/accessibility/lifecycle contracts, state compatibility/migration, add regression coverage and provide rollback where risk warrants it. Update the component registry/decision record and deprecation register. Deletion requires evidence of no live consumers or completed migration.

## 7. Acceptance checklist
- [ ] Correct ownership layer selected.
- [ ] Reuse test passed, or feature ownership justified.
- [ ] No duplicate source of truth or competing lifecycle manager.
- [ ] Public contract and accessibility behavior documented.
- [ ] Consumers and regressions identified.
- [ ] Performance/fallback cost acceptable.
- [ ] Tests and migration/rollback evidence exist.
- [ ] Canonical docs and status updated.
