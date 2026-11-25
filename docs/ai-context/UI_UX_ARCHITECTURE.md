# RetailOS UI/UX Architecture and Design System Contract

**Status:** Proposed target architecture. This document becomes canonical only after review/acceptance.
**Audit baseline:** `main` at `2003ea24966755d0ad4e0298b34422b053267e77`
**Date:** 2026-11-25
**Purpose:** Define the product-wide visual, interaction, component, layout, motion, accessibility, performance and extension rules that every current and future RetailOS screen must follow.

## 1. Product design objective

RetailOS is an operational workspace for supermarket and store operations, not a collection of unrelated AppSheet-like forms.

The final product must synthesize the strongest usable qualities of both approved visual references into a distinct RetailOS visual and interaction language. The references are inputs, not templates to copy. RetailOS must retain its own brand identity, operational clarity and recognizable interaction grammar.

Technology choices are means to that product outcome, not preservation goals. The team may adopt, replace or combine frameworks, routers, component systems and specialist libraries when evidence shows they are needed. The architecture must remain coherent: one clear owner per concern, one canonical token/component layer and no indefinite parallel systems or CSS override stacks.

The interface must make operational work:
- Clear: the user knows where they are, what state the work is in and what action comes next.
- Fast: common actions are direct, visible and require minimal navigation.
- Dense where useful: desktop uses available width for real work; mobile keeps one primary task in focus.
- Consistent: the same action, state and component have the same behavior across modules.
- Expressive: photography, material, depth and motion create product identity without obscuring information.
- Durable: new modules can be added without inventing a separate visual language.
- Efficient: low-end devices remain usable without relying on GPU-heavy blur, continuous animation or excessive image payloads.

The product is not optimized for decorative novelty. Business clarity, operational safety and responsiveness outrank visual effects.

## 2. Design reference authority and interpretation

The project owner assigned separate responsibilities to the two supplied references. The governing contract is [UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md](./UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md).

- **Image reference = structural/visual composition.** Use its modular composition, deliberate hierarchy, varied proportions, negative space, dimensional surfaces and intentional light/dark treatments as quality references.
- **Video reference = temporal/interaction behavior.** Use its observed progressive content readiness, stable framing, interaction feedback and state transitions as motion/experience references. Do not infer exact durations, easing, gesture physics or hidden logic.
- **RetailOS = product authority.** RetailOS defines its own brand, Vietnamese operational language, business semantics, data truth, component ownership and platform architecture.

These sources must not be blended into one copied palette or product design. Do not import the image's amber/yellow palette or the video's green palette as RetailOS brand tokens. Do not copy the source products' health, finance, shopping-assistant or recommendation semantics.

### 2.1 Structural principles

- Modular composition with intentional information hierarchy.
- Asymmetric allocation only where it communicates task priority.
- Strong card/surface role differentiation; avoid identical repeated dashboard tiles.
- Layered surfaces and controlled material depth.
- Compact, discoverable navigation appropriate to each viewport.
- Selective authentic retail imagery, never a substitute for operational information.
- Consistent RetailOS identity across desktop, tablet and mobile.

### 2.2 Motion principles

- Progressive reveal only when driven by real content readiness.
- Stable geometry while content changes.
- Motion communicates cause, focus, destination or state; it never creates business state.
- First visual acknowledgement is immediate; motion never blocks input or task completion.
- Exact timings and choreography are specified in M0-B after inspecting feature state contracts.

### 2.3 Motion/performance constraint

The target is premium motion on desktop office devices and smooth operation on mobile, including mid-range and lower-end hardware.

Rules:
- Prefer transform and opacity.
- Avoid animating layout, large shadows, filters, background positions and large lists continuously.
- Avoid animating every table row or every card on screen.
- Do not use backdrop blur as a default material for every surface.
- Respect `prefers-reduced-motion` and the app's power-conserve behavior.
- Motion is presentation-only; it must not trigger duplicate requests, writes, subscriptions or platform lifecycle actions.
- Async results must be tied to current request/session identity; stale responses cannot replace newer state.
- Interrupted transitions converge to the current source state.
- Scanner frame/decode cadence and camera lifecycle never wait for decorative UI animation.

## 3. Architecture principles

### 3.1 Outcome-first technology, clear ownership

Choose technology by the quality of the result and the total cost of ownership—not by a native-first or keep-the-current-stack rule.

1. Browser-native capabilities are candidates for standard behavior when they provide the best compatibility and UX.
2. React and existing shared systems are candidates when they provide the cleanest reusable application structure.
3. Frameworks, routers and specialist libraries are valid choices when they materially improve navigation, composition, motion, accessibility, maintainability or delivery quality.
4. Feature-owned components are appropriate when workflow, state or lifecycle requires specialization.

Every choice must have a compatibility/fallback plan, measured performance profile and explicit ownership. Prefer one canonical implementation per responsibility; when replacing a system, migrate consumers and retire the superseded system instead of maintaining parallel stacks.

### 3.2 Single design language, multiple workspace layouts

RetailOS must not force every feature into one generic card layout.

Use a shared design language with a small number of layout patterns:
- Overview workspace.
- Search/results workspace.
- Data table/editor workspace.
- Capture/scanner workspace.
- Review/approval workspace.
- Import/export workspace.
- Settings/preferences workspace.
- History/activity workspace.

A feature chooses the pattern that matches its task. It does not invent new global tokens or navigation rules.

### 3.3 Separate structure, appearance, behavior and business logic

- Structure: layout and information hierarchy.
- Appearance: tokens, typography, color, material, image and icon.
- Behavior: interaction, focus, keyboard, motion and responsive state.
- Business logic: validation, persistence, APIs, permissions and operational rules.

A visual redesign may change the first three, but must not silently change the fourth.

### 3.4 Explicit ownership

- App Shell owns global navigation, workspace outlet, global header and cross-screen context.
- Design System owns tokens, primitives, reusable components and interaction patterns.
- Shared Platform owns cross-feature overlay coordination, motion preferences, download lifecycle and PWA integration.
- Feature modules own workflow content, feature state, validation, persistence and feature-specific error states.
- Domain/platform contracts own Scanner, PWA release, authentication, snapshot and local data invariants.

Do not create a universal component that takes dozens of unrelated props to imitate every feature.

## 4. Design System layers

Target source organization (proposal; do not move code until a migration plan is accepted):

```text
src/
├── app/
│   ├── shell/
│   ├── navigation/
│   ├── routing/
│   └── state/
│
├── design-system/
│   ├── tokens/
│   ├── typography/
│   ├── materials/
│   ├── primitives/
│   ├── components/
│   ├── patterns/
│   └── motion/
│
├── shared/
│   ├── overlays/
│   ├── feedback/
│   ├── forms/
│   ├── media/
│   └── platform/
│
└── features/
    ├── auth/
    ├── home/
    ├── search/
    ├── notifications/
    ├── settings/
    ├── scanner/
    ├── stocktake/
    └── stocktake-import/
```

This is the target conceptual ownership map. Existing paths remain authoritative until each migration slice is implemented, tested and accepted.

### 4.1 Foundations / tokens

The canonical token contract must define:
- Brand colors and semantic colors.
- Surface levels and material roles.
- Typography family, scale, weight, line height and numeric typography.
- Spacing scale.
- Radius scale.
- Border and divider roles.
- Elevation/shadow roles.
- Focus ring.
- Breakpoints and container-query conventions.
- Motion duration/easing/distance.
- Z-index/layer order.
- Safe-area and viewport sizing.
- Light/dark or adaptive appearance rules if approved.

No feature should invent raw colors, arbitrary radii or one-off spacing when a semantic token exists.

Token names must describe meaning, not a specific component or current color value. Example roles: `surface-page`, `surface-panel`, `text-primary`, `text-muted`, `border-subtle`, `action-primary`, `status-warning`.

### 4.2 Typography

Typography must support Vietnamese operational text, long product names, numeric codes, quantities, dates and dense tables.

Requirements:
- Vietnamese diacritics must render correctly at all weights used.
- Numeric values should use tabular numerals where comparison matters.
- Avoid excessive uppercase/letter spacing for operational content.
- Define heading, body, label, metadata and data-cell roles.
- Font must be self-hosted WOFF2 or otherwise have a documented offline/fallback plan.
- Candidate font selection must be validated on Windows, iOS and Android before it becomes canonical.

Be Vietnam Pro is a candidate, not an accepted final font until glyph coverage, weight availability, rendering, file size and offline behavior are checked.

### 4.3 Materials and surfaces

Use a small material vocabulary:
- Base: opaque, stable, low-cost content surface.
- Raised: clear separation from page background.
- Frosted: selective translucent surface where background context matters.
- Floating: navigation or controls that must remain above content.
- Dark/brand: high-contrast hero or capture surface.

Material rules:
- Blur is opt-in, not a global default.
- On coarse-pointer/mobile/low-power devices, provide a visually coherent no-blur surface.
- Surface opacity must preserve text and status contrast.
- Do not stack multiple translucent layers without a hierarchy reason.
- Use real photography as a controlled visual asset with responsive sizes, not a full-screen download on every route.

### 4.4 Primitives

Expected primitives:
- Button, IconButton, Link.
- TextInput, SearchInput, Select, Checkbox, Radio, Switch.
- Field, FieldMessage, FormSection.
- Badge/StatusIndicator.
- Surface/Panel.
- Divider.
- Skeleton/LoadingIndicator.
- EmptyState.
- InlineAlert.
- Progress.
- Table primitives where native table semantics are appropriate.

Use native HTML controls where they satisfy the task. Custom wrappers should add shared styling/accessibility behavior, not obscure the native element or create an unnecessary component abstraction.

### 4.5 Shared components

Expected reusable components:
- AppHeader and responsive primary navigation.
- Breadcrumb / WorkspaceHeader.
- Search overlay and result list.
- Notification surface.
- Dialog / confirmation pattern.
- Popover / contextual menu pattern.
- Toast / inline feedback.
- Data freshness indicator.
- Module card / module status.
- Page toolbar / filter bar.
- Empty/loading/error states.
- Responsive table shell.
- Image/photography frame.
- Update Center entry and status.

Each component must have a documented API, variants, states, responsive behavior, accessibility behavior and usage boundaries.

### 4.6 Patterns

Patterns compose primitives/components into a repeatable task structure:
- Overview + priority actions.
- Search + filters + results.
- List/detail.
- Table + toolbar + row actions.
- Capture + live feedback.
- Edit + validation + save/cancel.
- Import + conflict review + commit.
- Export + preview + copy/download.
- History + restore/re-export.
- Settings category + detail.

Feature code should reuse patterns when the interaction model is the same, while keeping business rules in the owning feature.

## 5. Layout and navigation contract

### 5.1 App Shell

The authenticated shell provides:
- Global context (employee, department, current workspace).
- Global search entry.
- Notification entry.
- Profile/settings entry.
- Primary navigation.
- Workspace outlet.
- Global offline/update status where relevant.

The shell must not render every module's UI or own their business state.

### 5.2 Desktop

Desktop is a work environment, not a stretched phone layout.

Use:
- Persistent sidebar or compact rail when it materially improves navigation.
- Wide work surfaces for data-heavy tasks.
- Multi-column layouts where information is meaningfully related.
- Contextual right-side panels only when they improve task continuity.
- Keyboard-operable navigation and shortcuts where appropriate.
- Content max-width only where readability benefits; data workspaces may need full available width.

### 5.3 Mobile

Mobile is task-focused:
- Primary action is reachable without scrolling where practical.
- Navigation does not cover content or conflict with the keyboard.
- Full-screen workflow surfaces are allowed for Scanner, Stocktake or focused tasks.
- Use safe-area insets and dynamic viewport fallbacks.
- Touch target and scroll behavior are explicit.
- Avoid squeezing desktop tables into unreadable narrow columns; use responsive column policy, horizontal scrolling only when justified, or a mobile row-detail pattern.

### 5.4 Tablet and short viewports

Tablet must be treated as an adaptive workspace, not a midpoint breakpoint.
Short landscape, split-screen, keyboard-open and browser-chrome changes must be included in viewport testing.

### 5.5 Navigation and browser history

Target navigation is workspace-based. The source-grounded route and history proposal is specified in [UI_UX_SCREEN_MAP.md §9](./UI_UX_SCREEN_MAP.md); it remains an owner-acceptance gate, not an implemented router.

- Use stable workspace paths mapped to existing module/library IDs; do not create a parallel business registry.
- Start with one small typed adapter over the browser History API. Add a router dependency only after a demonstrated need for nested matching, loaders, route boundaries or complex deep-link ownership.
- Workspace navigation changes create route history entries. Reload/direct URL restores the workspace identity and safe non-sensitive view context.
- Transient overlays do not become route destinations. A blocking dismissible overlay may use a same-URL history-state marker so browser Back closes it without changing workspace path; popovers/toasts remain local.
- Forward restoration is opt-in. Camera/permission surfaces and unsaved operational drafts must never reopen automatically.
- Feature-local steps and dirty state remain feature-owned; the shell asks the feature for a navigation guard rather than inspecting its internals.
- Unknown/unavailable destinations resolve truthfully and provide a safe path to Home.

## 6. Interaction and state contract

Every screen specification must identify:
- Initial state.
- Loading state.
- Success state.
- Empty state.
- Stale/offline state.
- Error state.
- Permission state.
- Validation state.
- Unsaved/dirty state.
- Disabled/blocked state.
- Exit/cancel state.

The state dimensions must remain separate: UI readiness, data freshness, permission, connectivity, operation, persistence, validation and PWA update safety.

Interaction rules:
- Direct action: one user intent should cause one action; no wake-up tap.
- Immediate acknowledgement: visible feedback begins immediately.
- Async feedback: pending state precedes expensive work.
- Truthful success: success only after the operation completes.
- Reversibility: destructive or replacement actions require explicit confirmation and a recovery/history path where business rules require it.
- Focus: focus enters a new modal context and returns to the trigger where appropriate.
- Keyboard: Tab, Shift+Tab, Enter, Space, Escape and arrow-key patterns are documented for each control.
- Touch: no hover-only actions.
- Error: state what failed and what the user can do next.

## 7. Overlay and native API policy

Existing canonical contract: `UI_OVERLAY_ARCHITECTURE.md`.

- Prefer native HTML Dialog semantics for standard modal behavior after compatibility and lifecycle validation; retain feature-owned custom surfaces for specialized camera/data workspaces.
- Use Popover API as progressive enhancement for non-modal anchored surfaces.
- Use custom React surfaces where a feature needs specialized camera, bounded workspace, nested review or complex close lifecycle.
- All modal behavior must preserve the single shared body scroll-lock owner, safe-area layout, focus entry/return and nested surface semantics. Full focus containment is not currently implemented; do not claim it until tested.
- Do not use Popover for modal confirmations.
- Do not add a generic overlay stack/focus manager unless traced nested use cases prove that native dialog semantics plus feature-owned close/back contracts are insufficient.\n- Do not migrate every existing overlay in one global change.
- Native APIs must be wrapped only where the wrapper adds consistent ownership/accessibility/fallback behavior.

## 8. Motion system contract

Existing canonical implementation: `src/shared/motion/`.

Motion is part of interaction feedback, not a decoration layer.

### 8.1 Motion vocabulary

- Press: tactile acknowledgement.
- Hover/focus: subtle affordance.
- Enter: introduce a new surface.
- Exit: remove a surface without losing context.
- Shared element/spatial: connect a trigger to its destination when supported and appropriate.
- Progress: show ongoing work.
- State change: communicate success, warning, invalid or selected state.

### 8.2 Motion limits

Proposed starting ranges (must be tuned through device tests):
- Press: 80–140ms.
- Hover/focus: 100–160ms.
- Small component: 140–220ms.
- Dialog/sheet: 180–260ms.
- Workspace transition: 200–320ms.
- Hero reveal: 300–450ms.

Do not add pre-start delays to interactive feedback. Stagger only non-critical decorative content and only when it does not delay task availability.

### 8.3 Implementation order

1. CSS transform/opacity with existing Motion tokens.
2. Existing React Motion components/presets for shared behavior.
3. Document View Transition API as an optional progressive enhancement after route/screen boundaries are defined.
4. New animation library only if a concrete interaction cannot be implemented maintainably with the above and a bounded prototype proves its value.

No Framer Motion or GSAP dependency is approved by this document.

## 9. Photography, imagery and icon contract

- Use genuine photography for login/brand/category moments where it strengthens the product.
- Keep operational tables, status and action areas readable and low-noise.
- Use image variants and responsive sources; lazy-load below-the-fold imagery.
- Avoid shipping large background images to every module.
- Use local versioned assets where offline reliability matters.
- Every asset must have owner, intended role, aspect ratio, focal point, fallback and performance budget.
- Lucide React remains the icon source; use the shared icon registry/presets for semantic consistency.
- Do not use icons as the only label for a critical business action unless the context is unambiguous and accessible name is supplied.

## 10. Accessibility and localization

Mandatory:
- Semantic HTML and accessible names.
- Visible keyboard focus.
- Keyboard operation for every interactive control.
- Screen-reader announcement for status and errors.
- Contrast for text, controls and statuses.
- Reduced motion support.
- Zoom and text scaling without clipped content.
- Safe-area and keyboard-safe layouts.
- Vietnamese labels and product terminology consistent with operational usage.
- Dates, numbers, decimal separators and quantities formatted by locale without altering source values or business contracts.

No component is “done” because it looks correct in a screenshot.

## 11. Performance contract

Performance must be evaluated on:
- Office desktop.
- Typical iPhone/Android.
- Mid-range Android.
- Low-end Android profile.

Required measurements during implementation:
- Initial transferred bytes and lazy chunk boundaries.
- LCP/INP/CLS where relevant.
- Input-to-first-feedback.
- Cold and warm workspace entry.
- Long task duration and scroll frame stability.
- Memory/CPU impact of blur, imagery, animation and large tables.
- Offline load and local persistence behavior.

Implementation rules:
- Lazy-load feature workspaces and heavy exports.
- Do not load large dependencies on login/Home entry without need.
- Avoid unnecessary global state/event bus/animation runtime.
- Avoid full-list re-render and unbounded tables; use existing batching/virtualization only when justified by measured volume.
- Prefer transform/opacity and static surfaces on low-power devices.
- Avoid unnecessary backdrop-filter and continuous animation.
- Keep scanner decoding/camera cadence independent from presentation.

Performance target values must be set from a reproducible baseline and representative devices; do not invent universal p95 claims before measurement.

## 12. Future module extension contract

Every new module must follow this contribution sequence:

1. Define workflow purpose, user roles and operational outcome.
2. Declare module identity using the existing module registry contract; do not invent a parallel module list.
3. Define data source, freshness, offline behavior, permission and persistence ownership.
4. Select an approved workspace pattern.
5. Reuse existing tokens, primitives, components and motion vocabulary.
6. Define screen map and interaction/state table.
7. Define desktop, tablet and mobile layouts.
8. Define empty/loading/stale/error/permission/unsaved/blocked states.
9. Define accessibility, keyboard and focus behavior.
10. Define lazy-loading and bundle boundaries.
11. Add focused component/interaction/responsive tests.
12. Add the module to the navigation and acceptance matrix only when the workflow is genuinely available.
13. Update the owning canonical document; do not create another competing design-system guide.

### New component gate

Create a new shared component only when:
- At least two use cases share the same structure and behavior, or
- One cross-cutting use case requires a consistent platform contract, or
- A specialized workflow has complexity that cannot be expressed cleanly by existing patterns.

Before creating it, check existing primitives, shared components and browser-native APIs.

## 13. Documentation ownership and source-of-truth hierarchy

The UI/UX documentation set must remain small and non-duplicative.

| Document | Owns | Must not duplicate |
|---|---|---|
| `UI_UX_ARCHITECTURE.md` (this document) | Product-wide design principles, system layers, tokens/components/patterns, layout, motion, accessibility, performance and extension rules | Feature business logic and per-PR history |
| `UI_UX_TECHNOLOGY_AUDIT.md` | Dependency/browser API inventory, compatibility and install/no-install decisions | Full design system specification |
| `UI_UX_SCREEN_MAP.md` | Current screens, workflows, states, navigation and target screen inventory | Detailed parser/data contracts |
| `UI_UX_IMPLEMENTATION_PLAN.md` | Ordered delivery phases, dependencies, acceptance and rollback | Repeated implementation history |
| `UI_OVERLAY_ARCHITECTURE.md` | Overlay lifecycle, scroll lock, viewport and ownership | General component catalog |
| `UI_INTERACTION_RESPONSIVENESS_AUDIT.md` | Input response findings and source-level regression rules | New design direction |
| `SCANNER_ENGINE.md` | Scanner runtime and integration contract | UI system-wide principles |
| `PWA_RUNTIME_RELEASE.md` | Application release lifecycle and safety | Generic UI update styling |

When an issue is domain-specific, update its canonical domain document and link from this architecture. Do not create duplicate specifications.

### Required content for every future screen specification

- Screen ID, owner and status.
- Purpose and user outcome.
- Entry/exit/navigation paths.
- Information hierarchy and layout.
- Primary/secondary actions.
- Component inventory and tokens.
- State table and transition diagram.
- Validation and error handling.
- Persistence/data freshness/offline behavior.
- Responsive behavior by form factor.
- Motion and reduced-motion behavior.
- Accessibility/focus/keyboard behavior.
- Performance/bundle constraints.
- Regression tests and physical acceptance.

## 14. Full presentation-layer redesign authority

The redesign is authorized to replace, remove, rewrite, reorder or completely reconstruct **any presentational element** when necessary to achieve the approved target experience. This is not limited to rearranging existing components or reskinning the current UI.

The editable presentation scope includes, without limitation:
- All visible text: headings, labels, helper copy, descriptions, empty-state copy, error messages, tooltips and microcopy.
- Status presentation: names, wording, colors, badges, icons, hierarchy and visual grouping. The underlying state meaning, transition rules and truthfulness must remain correct.
- Information architecture and composition: content order, grouping, density, alignment, navigation placement, screen hierarchy and responsive arrangement.
- Components and interaction patterns: cards, panels, tables, menus, dialogs, drawers, sheets, tabs, navigation, search, filters, forms and feedback surfaces.
- Brand presentation: logo mark, wordmark, lockups, brand motion, imagery, illustration and visual motifs. The product name and organizational identity must not be changed without an explicit product decision.
- Controls and assets: icons, buttons, inputs, switches, selectors, typography, fonts, surfaces, borders, shadows, materials, animations and transitions.
- Existing shared UI systems: Brand, Glass, Motion, Icons, LiquidDock and current CSS/component implementations may be retained, refactored, replaced or retired based on the target design and audit evidence.

**No current visual artifact is grandfathered in.** Existing implementation is a source of behavior and technical evidence, not a visual constraint. A new design may depart substantially from the current screen if it improves clarity, efficiency, accessibility, consistency and the combined reference direction.

### Boundary between presentation freedom and protected contracts

Visual freedom does not authorize accidental changes to domain behavior. Before replacing an element, identify whether it owns only presentation or also owns a protected behavior/data contract.

- Text and status wording may change; the underlying business status, validation result, permission, operation outcome and data freshness must remain truthful.
- A button may be redesigned, moved or replaced; its action, authorization, idempotency and completion semantics must remain intact.
- An icon or logo may be replaced; stable module IDs, route identity, employee identity and product naming contracts remain unchanged unless separately decided.
- A component may be removed or rebuilt; its persistence, keyboard/focus behavior, scroll-lock ownership, event lifecycle and feature integration must be preserved or deliberately migrated.
- A screen may be reordered or split; unsaved work, browser history, deep links, offline access and workflow transitions must remain valid.
- A visual state may be redesigned; no fake success, fabricated activity, misleading empty state or false availability may be introduced.

Every major replacement must include an old-to-new responsibility map, consumer/callsite inventory, migration steps, regression coverage and a removal plan for the superseded implementation. Do not keep old and new versions active indefinitely merely to avoid cleanup.

## 15. Decision governance

Status labels:
- **Observed:** verified in source or test.
- **Proposal:** recommended but not accepted.
- **Accepted:** explicitly approved architecture/product decision.
- **Implemented:** source exists and is verified.
- **Validated:** relevant automated and/or physical acceptance evidence exists; specify which.
- **Deprecated:** replacement is identified and migration completed.

A proposal does not become an implementation contract merely because it appears in a plan.

Changes to tokens, component APIs, route identity, global navigation or shared layout require:
- affected screen/component list,
- compatibility impact,
- migration sequence,
- visual/functional regression plan,
- rollback plan,
- updated canonical docs.

## 16. Acceptance definition

The design system and new UI/UX are complete only when:
- Existing and future screens share the same token and component vocabulary.
- Each screen has a defined information hierarchy and state model.
- Desktop, tablet, mobile and short viewport layouts are documented and tested.
- Native APIs are used where they simplify standard behavior and have fallbacks.
- No redundant framework or dependency is added without evidence.
- Motion is consistent, reduced-motion aware and performant on lower-end devices.
- Photography and visual depth strengthen the brand without obscuring operations.
- All interactive controls work, are accessible and provide immediate feedback.
- Feature business contracts remain unchanged unless separately approved.
- CI, browser testing and physical-device acceptance are reported separately.

## 17. Current acceptance boundary

This document is a target architecture proposal created during documentation batches 00B/00C. It does not mean the new design system, shell, routes, tokens, components or screen layouts have already been implemented or physically accepted.


## M0 reference authority and motion correctness

M0 follows [UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md](./UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md): the supplied image is the structural/compositional reference; the supplied video is the motion/feedback/state reference; RetailOS remains authoritative for brand, business semantics, data truth and architecture. These sources must not be blended into a copied palette or product behavior.

Motion is presentation-only. Feature/controller state changes first; animation reflects the already-derived state. Animation completion must never commit business data or advance a workflow. Async results must be tied to the current request/session generation; stale responses cannot overwrite newer data. Transitions must not trigger duplicate fetches, writes, subscriptions or camera lifecycle operations. Latest state wins, interruption converges to source state, and reduced-motion/low-performance fallbacks preserve function. Existing feature ownership, overlay/body-lock and PWA/Scanner contracts remain authoritative.
## 3.5 Evolving design architecture — accepted product principle

RetailOS uses an **open, evolving design system**, not a closed component catalogue or a fixed visual template. Shared consistency defines the product's recognizable language and quality bar; it does not require every workspace to use the same layout, component inventory or interaction pattern.

The architecture has three complementary layers:

1. **Core Foundation** — brand identity, semantic color meaning, typography principles, visual hierarchy, spacing/rhythm conventions, accessibility, responsive principles, motion philosophy and performance expectations. These establish coherence, not a finite list of permitted components or layouts.
2. **Shared Design System** — reusable tokens, primitives, components and patterns that have demonstrated cross-feature value. This layer is intentionally extensible: new tokens, variants, components and patterns may be proposed, added, evolved, deprecated or retired as product needs change.
3. **Feature Experience** — feature-owned compositions, specialized controls, layouts and interactions designed for a particular operational task. A feature may create a new solution when the shared system does not fit; it is not required to force its workflow into an existing generic component.

### Contribution and evolution rules

- Start from the user task and operational truth, not from the current component inventory.
- Reuse a shared component when its semantic responsibility and behavior genuinely match. Visual resemblance alone is not sufficient.
- Create a feature-owned component or pattern when the task needs a distinct interaction, information density, lifecycle or performance profile.
- Validate the new solution in its owning feature before considering it for shared adoption.
- Promote it to shared only when reuse is real and the abstraction remains coherent across consumers. Do not promote merely to increase the shared catalogue.
- A shared contribution must document its semantic purpose, API, variants, states, accessibility, responsive behavior, performance implications, ownership and migration impact.
- Existing shared components may gain variants or be redesigned when evidence supports it. Shared status is not a prohibition on change.
- Feature-specific exceptions are allowed when justified by task requirements; document the reason and keep them within the feature boundary.
- When a shared primitive or pattern is replaced, migrate its consumers and retire the old implementation instead of maintaining indefinite parallel systems.

### Consistency without uniformity

Consistency means recognizable RetailOS identity, coherent semantic state, predictable interaction feedback, accessible behavior and compatible quality/performance standards. It does **not** mean identical page templates, card grids, colors, navigation arrangements or controls across all workspaces.

A Scanner capture surface, Stocktake workbench and Import review workspace should be recognizably RetailOS while remaining optimized for their different jobs. The system must support both shared solutions and purpose-built feature experiences.

This principle supersedes any interpretation of the component inventory or expected-component lists as a closed or mandatory catalogue.
