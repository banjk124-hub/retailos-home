# RetailOS Experience Build Standard

**Authority:** Sole UI/UX implementation direction for RetailOS. This document replaces the former M0 audit-and-gate workflow.
**Status:** Greenfield Experience rebuild in progress. Existing business behavior remains protected; existing presentation is not the design foundation.

## 1. Product direction

RetailOS is a bespoke retail operations environment—not an AppSheet reskin or generic admin dashboard. Build a distinctive OS-like experience with:
- Burgundy/dark-red brand identity.
- Vietnamese-first typography with correct diacritics and dense-data readability.
- Authentic retail photography used deliberately, with licensed/local assets and offline-safe fallbacks.
- Feature-specific compositions: Login, Home, Stocktake, Import and Settings must not be forced into one generic card template.
- Professional desktop workspaces, adaptive tablet layouts and task-focused mobile flows.
- Purposeful motion and interaction feedback, with reduced-motion and low-power fallbacks.

The supplied image is an art-direction/composition reference. The supplied video is a motion/interaction reference. Adapt their qualities; do not copy their product semantics or exact layouts.

## 2. Greenfield boundary

Rebuild the **Experience Layer** as a new product surface. Do not incrementally restyle, extend, or inherit the legacy UI as the foundation.

**Preserve the Business Core unless a separate approved change is required:**
- Authentication, employee identity, session lifecycle and permissions.
- Module registry, stable module IDs and truthful readiness.
- Business workflows, data contracts, persistence, IndexedDB, cache and offline semantics.
- Scanner Engine, camera lifecycle, decoder and validation contracts.
- Stocktake and Import processing, revisions, conflicts, dirty-edit and export behavior.
- Overlay lifecycle, focus/body-scroll-lock behavior and PWA update/release safety.
- Lazy-loading boundaries, Vite base path and deployment contracts.

**Rebuild the Experience Layer:**
- Design language, typography, color/surface/material tokens and motion rules.
- App Shell, navigation, Home and Module Library.
- Login presentation and identity handoff.
- Feature workspaces for Stocktake, Import, Settings and subsequent modules.
- Responsive composition, interaction states and feature-owned components.

Connect the new presentation to the protected Business Core through thin adapters at real integration boundaries. Do not duplicate business logic or create speculative architecture.

### How to inspect legacy source

Inspect existing code only to identify:
1. Business behavior and user actions that must remain available.
2. Data/API/session/persistence contracts and lifecycle ownership.
3. Protected operational constraints and verified defects.

Do **not** use legacy screenshots, CSS structure, component hierarchy or visual composition as the target. Do not run another broad legacy CSS/cascade audit before building. A concrete regression or integration issue may justify a narrowly scoped source investigation.

## 3. Implementation sequence

1. **Experience foundation:** define only the tokens/primitives required by the first real surfaces; isolate new styles and components from legacy CSS.
2. **App Shell:** create new navigation, responsive workspace frame and system-level states while retaining existing session/business orchestration.
3. **Home and Library:** build the new operational landing experience and module discovery using real registry/readiness data.
4. **Operational workspaces:** migrate Stocktake and Import presentation while preserving their engines, persistence and transactional behavior.
5. **Settings and system UX:** update center, notifications, offline/error/recovery and permissions.
6. **Integration and acceptance:** remove legacy presentation only after its consumers are migrated and the new workflows pass acceptance.

Each slice must produce a visible, working source/runtime result. Documentation, mockups, audits or tests alone do not count as implementation progress.

## 4. Design and runtime acceptance

- Desktop, tablet and mobile are composed intentionally; do not merely scale one layout.
- Every control has a real action and truthful state.
- Use real source data; never invent readiness, metrics or operational events.
- Motion acknowledges input or explains state. It must not delay input, scanner lifecycle, persistence or business feedback.
- Respect reduced motion, safe areas, keyboard behavior and accessible names/focus/contrast.
- Prefer CSS transforms/opacity and native platform capabilities where suitable. Use blur, glass, large imagery and elaborate motion selectively, based on measured value and cost.
- Test representative average/low-end devices before accepting expensive visual effects.
- Images must have usage rights, responsive crops, compression, local/versioned delivery and offline fallback. Core operations cannot depend on remote imagery.

## 5. Lean test and CI policy

Tests protect behavior; they are not a parallel audit product.

**During a feature slice**
- Run the smallest relevant unit/contract test set.
- Run TypeScript and the production Pages build once for the integrated batch.
- Use a compact Playwright suite for real user journeys: Login, authenticated Home, and the workflow being changed.
- Cover representative desktop, tablet and mobile profiles. Add another viewport only when a specific layout risk requires it.
- Keep screenshots/traces on failure. Do not generate full DOM dumps, CSS selector/cascade inventories, all-page screenshots or runtime-evidence archives on every CI run.

**Regression scope**
- Scanner regression suite runs when Scanner source/contracts change, or at the planned integration/release gate. Scanner is closed; UI-only work must not reopen or repeatedly revalidate its internals.
- Stocktake/Import, PWA, overlay and persistence contract tests run when their source/contracts change and at integration/release gates.
- Full regression runs before major integration acceptance and production promotion, not after every documentation or small visual edit.
- Do not repeat successful checks because an unrelated file changed. Do not start overlapping CI runs; finish one coherent batch before pushing.

**Evidence**
- CI reports the exact commit and checks. Browser emulation is not physical-device acceptance.
- Physical desktop/mobile QA is performed on a coherent vertical slice and before release acceptance.
- A failing test must be traced to a real behavior defect or a defective test. Remove brittle implementation-detail assertions rather than patching CSS solely to satisfy a bad test.

## 6. Documentation ownership

- This file: UI/UX direction, greenfield boundary, build sequence and test policy.
- `RETAILOS_PRODUCT_SKILL.md`: cross-project engineering workflow and protected contracts.
- `IMPLEMENTATION_STATUS.md`: verified current state only.
- `AI_HANDOFF.md`: concise next action for the next session.
- `ROADMAP.md`: upcoming deliverables, not a second design specification.
- `INDEX.md`: navigation only.
- Domain contracts: scanner, PWA, Stocktake, Import, overlays and performance invariants.

Do not recreate M0/M1 audit phases, duplicate design authorities, or require a legacy UI audit as a prerequisite to implementation. If a new decision is needed, record it once in the owning decision register.
