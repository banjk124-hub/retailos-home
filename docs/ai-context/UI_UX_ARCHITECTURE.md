# RetailOS UI/UX Architecture and Design System Contract

**Status:** Proposed target architecture. This document becomes canonical only after review/acceptance.
**Audit baseline:** `main` at `2003ea24966755d0ad4e0298b34422b053267e77`
**Date:** 2026-11-25
**Purpose:** Define the product-wide visual, interaction, component, layout, motion, accessibility, performance and extension rules that every current and future RetailOS screen must follow.

## 1. Product design objective

RetailOS is an operational workspace for supermarket and store operations, not a collection of unrelated AppSheet-like forms.

The interface must make operational work:
- Clear: the user knows where they are, what state the work is in and what action comes next.
- Fast: common actions are direct, visible and require minimal navigation.
- Dense where useful: desktop uses available width for real work; mobile keeps one primary task in focus.
- Consistent: the same action, state and component have the same behavior across modules.
- Expressive: photography, material, depth and motion create product identity without obscuring information.
- Durable: new modules can be added without inventing a separate visual language.
- Efficient: low-end devices remain usable without relying on GPU-heavy blur, continuous animation or excessive image payloads.

The product is not optimized for decorative novelty. Business clarity, operational safety and responsiveness outrank visual effects.

## 2. Design references and interpretation

Reference set supplied by the project owner:
- Pinterest visual reference: https://pin.it/2KpGqGCos
- Video reference: `ScreenRecording_11-24-2026 20-25-21_1.mp4`

### 2.1 Visual language to carry forward

- Modular composition: distinct work areas with clear hierarchy.
- Asymmetric composition where information priority justifies different space allocation.
- Strong card hierarchy: primary task, summary, secondary information and supporting action are not visually equal.
- Layered surfaces and restrained material depth.
- Compact navigation that remains discoverable and directly operable.
- Selective real photography as an editorial/brand layer, not a replacement for operational information.
- A consistent visual identity across desktop and mobile.

Do not copy the reference palette, product-specific cards, exact layout or branded assets. RetailOS keeps its own red/white brand identity and Vietnamese operational language.

### 2.2 Motion language to carry forward

- Spatial UI: surfaces have a clear relationship in depth and hierarchy.
- Soft Motion: transitions communicate cause and destination, not decoration.
- Progressive reveal: content becomes available in understandable stages.
- Layered interface: overlays and workspaces feel connected to their trigger/context.
- Floating navigation only where it remains reachable and does not cover work.

The video is a short screen recording, not a complete interaction specification. Only observed behavior and agreed design intent may be treated as requirements; do not invent hidden gestures or unobserved transitions.

### 2.3 Motion/performance constraint

The target is premium motion on desktop office devices and smooth operation on mobile, including mid-range and lower-end hardware.

Rules:
- Prefer transform and opacity.
- Avoid animating layout, large shadows, filters, background positions and large lists continuously.
- Avoid animating every table row or every card on screen.
- Do not use backdrop blur as a default material for every surface.
- Respect `prefers-reduced-motion` and the app's power-conserve behavior.
- First visual acknowledgement must be immediate; the animation may continue after feedback begins.
- Scanner frame/decode cadence and camera lifecycle must never wait for decorative UI animation.

## 3. Architecture principles

### 3.1 Native-first, React-owned, feature-specialized

1. Browser Native: use HTML, CSS and Web APIs for standard behavior.
2. Shared React UI: use the existing shared systems for reusable application components.
3. Feature UI: create specialized components only where business workflow, state or lifecycle requires them.

A native API is not automatically the right answer for every context. It must fit the behavior and have a compatibility/fallback plan.

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

Target navigation is workspace-based. Before implementation, define:
- Stable route IDs and mapping to existing module IDs.
- Which screens deserve a URL.
- Back behavior from overlays vs workspace navigation.
- Refresh/reopen behavior.
- Deep-link behavior and permission checks.
- Scroll restoration.
- Unsaved-work guard.
- Unknown route and unavailable module behavior.

Default proposal: start with a small typed navigation adapter over the browser History API. Add a routing dependency only after a demonstrated need for nested route matching, loaders, route boundaries or complex deep-link ownership.

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

- Use HTML Dialog as the first candidate for standard modal behavior.
- Use Popover API as progressive enhancement for non-modal anchored surfaces.
- Use custom React surfaces where a feature needs specialized camera, bounded workspace, nested review or complex close lifecycle.
- All modal behavior must preserve shared body scroll-lock ownership, safe-area layout, focus restoration and nested surface semantics.
- Do not use Popover for modal confirmations.
- Do not migrate every existing overlay in one global change.
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

## 14. Decision governance

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

## 15. Acceptance definition

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

## 16. Current acceptance boundary

This document is a target architecture proposal created during documentation batches 00B/00C. It does not mean the new design system, shell, routes, tokens, components or screen layouts have already been implemented or physically accepted.
