# UI/UX Rebuild Implementation Plan

**Status:** Proposed delivery plan; 00B–00H documentation is complete on the current documentation branch. Owner approval and source implementation remain open.
**Baseline:** `main` at `2003ea24966755d0ad4e0298b34422b053267e77`
**Working documentation branch:** `docs/uiux-architecture-00b-00c`
**Scope:** Full RetailOS visual and interaction redesign, from application shell to smallest reusable control, while preserving current business and platform contracts.

## 1. Objective

Deliver one coherent RetailOS experience that:
- Replaces the current long-scroll/overlay-heavy Home composition with a clear application shell and workspace navigation.
- Rebuilds screen hierarchy, layout, typography, materials, imagery, components and interaction behavior.
- Uses browser-native APIs and existing dependencies where they are sufficient.
- Adds a new dependency or specialized component only after a concrete gap is demonstrated.
- Works across desktop office, tablet, iOS, Android and low-end devices.
- Allows future modules to follow the same design language without redesigning the shell each time.
- Preserves authentication, data, Scanner Engine, Stocktake, Import and PWA release contracts.

This is a product-wide presentation and interaction rebuild, not a rewrite of the data/backend/platform architecture.

## 2. Baseline findings that shape the plan

1. Current Home is a single long-scroll screen with section navigation: Home, Module, Activity and Settings.
2. Module Library has 5 groups and 9 workflow IDs. Seven entries are currently marked integrating; only Stocktake and Stocktake Import have dedicated workflows in the audited feature tree.
3. Login, Home, Scanner, Stocktake and Stocktake Import already have working feature-owned UI and state.
4. Shared Brand, Glass, Motion, Icon and LiquidDock systems already exist.
5. The current CSS tree has 25 CSS files, including multiple Home stylesheet generations and a global import stack.
6. There is no installed UI framework, animation library, router, chart library, data-grid library or form library.
7. Browser-native Dialog, Popover and Document View Transition are not currently the established implementation.
8. There are existing source-level tests for overlays, input immediacy, Home performance, bundle boundaries, Scanner, Stocktake Import and PWA behavior.

Implication: rebuild by establishing a system and migrating feature surfaces in controlled slices. Do not start by installing a component framework or rewriting every screen in one branch.

## 2.1 Redesign authority and scope

This project is a full presentation and interaction redesign, not a preservation exercise. Any existing presentational element may be rewritten, replaced, relocated, removed or rebuilt when required by the target experience.

This authority explicitly includes:
- Text, labels, headings, helper copy, status names, empty/error/loading messages and microcopy.
- Status visualizations, badges, indicators, colors, iconography and their placement.
- Screen order, content hierarchy, navigation composition, layout, density and responsive structure.
- Components, patterns, controls, buttons, forms, tables, dialogs, sheets, menus and feedback surfaces.
- Logo mark, wordmark, brand lockup, icon set, photography, illustrations, typography, fonts, materials, motion and visual effects.
- Existing shared systems and stylesheets, including Brand, Glass, Motion, Icons, LiquidDock and legacy Home CSS.

The target is not to make the existing UI look newer. It is to create a coherent RetailOS product language by combining the strongest qualities of both references and redesigning every screen and interaction around operational use.

For each screen, review from the blank-page perspective first: what information belongs here, what is primary, what can be removed, what should be combined or separated, and what interaction best serves the task? Only then map existing behaviors and implementation contracts onto the new design.

**Non-negotiable boundary:** presentation may change freely; business meaning and protected platform contracts may not change accidentally. Status semantics, permissions, validation, action outcomes, data truth, module IDs, employee/session identity, Scanner Engine lifecycle, Stocktake/Import persistence and PWA release safety must be preserved or migrated under a separate explicit plan.

Every replacement must document:
1. Existing responsibility and all consumers/callsites.
2. Target replacement and its interaction/state contract.
3. Data, persistence, accessibility and lifecycle behavior to preserve.
4. Migration and regression tests.
5. Deletion criteria for obsolete components/styles/assets.
6. Rollback path.

Do not retain an old logo, icon, button, component, text string or layout merely because it is already implemented. Do not delete a working behavior simply because its current presentation is being replaced.

## 3. Delivery principles

- One canonical design system.
- One canonical module registry.
- One route/screen identity contract.
- One motion vocabulary.
- One semantic state vocabulary.
- Feature-owned business logic and persistence.
- Outcome-first technology selection: native APIs, existing dependencies and new frameworks/libraries are all eligible; choose by evidence, not ideology.
- A framework, router or specialist library may be added or replace current code when it materially improves the intended experience or reduces complexity/risk.
- Every adoption must include a consolidation plan; do not create parallel component, routing, animation or styling systems without a bounded migration reason.
- Shared components only for genuinely shared structure/behavior.
- Visual parity is not enough; workflows and failure states must remain correct.
- Each slice is independently reviewable, testable and reversible.
- No merge or production deployment without explicit owner approval.

## 4. Phase plan

### Phase 00 — Audit and product architecture

| Batch | Deliverable | Exit condition |
|---|---|---|
| 00A | Reference interpretation | Visual/motion intent separated from literal copying |
| 00B | Technology and browser capability audit | Dependencies, native APIs, compatibility and install gate documented |
| 00C | Screen/interaction map | Existing screens, states, workflows and target screen inventory traced |
| 00D | [Design System specification](./UI_UX_DESIGN_SYSTEM_SPEC.md) | Current token/material/brand/motion audit and target system contract documented; final visual validation gates identified |
| 00E | Information Architecture and Navigation | Shell, route identity, workspace hierarchy, back behavior and deep-link policy decided |
| 00F | [Component inventory and ownership](./UI_UX_COMPONENT_AUDIT.md) | Source-level inventory, ownership, keep/refactor/replace/create decisions and migration risks documented; selector/callsite/device proof gates remain open |
| 00G | [Screen blueprints](./UI_UX_SCREEN_BLUEPRINTS.md) | P0/P1 screens have desktop/tablet/mobile layout, interaction, state, ownership, accessibility and performance contracts |
| 00H | [Acceptance and migration blueprint](./UI_UX_ACCEPTANCE_MIGRATION_BLUEPRINT.md) | Acceptance matrix, protected boundaries, migration slices, regression/device gates and rollback documented; owner decisions remain explicit gates |

Do not begin broad UI source changes before 00G–00H are sufficiently specified and the proposed 00E navigation contract is accepted.

### Technology and design-system decision gate (applies across Phase 00–10)

The audit's initial native-first recommendations are starting hypotheses, not restrictions. During 00D–00F, re-evaluate the stack, brand assets, typography, component systems, materials and motion against the combined reference direction and RetailOS product requirements. If the current React/CSS/native foundation cannot deliver the required navigation, composition, motion, accessibility or responsive behavior cleanly, select and integrate a suitable framework/router/library. Record alternatives, compatibility, bundle/runtime cost, ownership, migration, tests and rollback. Paid services or changes to protected data/backend/security contracts remain separate approval gates.

A selected technology must simplify or materially improve the final system. It must not become another permanent layer beside an existing subsystem that performs the same job.

### Phase 01 — Design System foundation

Deliver:
- Semantic design tokens.
- Typography and Vietnamese font validation.
- Color and status semantics.
- Surface/material roles.
- Spacing/radius/elevation/focus tokens.
- Motion tokens and reduced-motion policy.
- CSS layer/import ownership.
- Component documentation format.

Implementation constraints:
- Brand mark, wordmark, Lucide registry, Glass and Motion are candidates, not mandatory survivors; retain, replace or consolidate based on target design and evidence.
- Reuse or replace current token/material/motion systems through one canonical ownership model; do not create a second parallel system.
- Do not migrate every component at once.
- Remove legacy CSS only after selector, consumer and computed-style usage is verified.

Acceptance:
- Token coverage for all current P0 surfaces.
- No unexplained hardcoded colors/radii/spacing in newly touched components.
- Existing Home/Scanner/Stocktake/Import tests remain green.
- Desktop and mobile screenshots reviewed.
- No unjustified UI dependency. A justified framework/library is permitted under the Technology decision gate and must be included in the migration and acceptance evidence.

### Phase 02 — App Shell and navigation

Deliver:
- AppShell.
- Global Header.
- Desktop navigation (sidebar or rail).
- Mobile navigation.
- Workspace outlet.
- Breadcrumb/context header.
- Global status and update entry.
- Typed navigation adapter and browser-history behavior.

Decision gate:
- Start with History API adapter if it covers route matching, browser back/forward, reload restoration and deep-link needs.
- Add a routing package only if nested route/data-loader/error-boundary needs justify it.

Acceptance:
- Login/session flow preserved.
- Browser back/forward behaves predictably.
- Direct route/reload behavior is defined.
- Unsaved feature work is not discarded by navigation.
- Navigation remains available without a wake-up tap.
- Shell works at desktop, tablet, narrow mobile and short landscape.

### Phase 03 — Authentication redesign

Deliver:
- Login composition.
- Identity recognition.
- Loading/error/success states.
- Responsive photography/brand placement.
- Keyboard/IME behavior.

Preserve:
- Local authentication and employee directory.
- Session persistence.
- Employee/department mapping.
- Boot-health signaling and PWA transition blockers.

Acceptance:
- Login works offline under current local-auth model.
- Vietnamese text and employee codes render correctly.
- No regression in session restore/logout.
- Motion does not delay first feedback.

### Phase 04 — Home Overview redesign

Deliver:
- Operational overview hierarchy.
- Priority notices.
- Quick actions.
- Recent/priority work area.
- Module discovery entry.
- Data freshness and offline semantics.

Remove the assumption that Home must be a long dashboard with every category and action on one page. The exact Home layout is decided in 00G.

Preserve:
- Snapshot-first data loading.
- Notice rules and truthful loading/empty/unavailable states.
- Cached barcode lookup.
- Existing Home UI persistence only where it remains useful.
- Existing lazy-loading and bundle boundaries.

Acceptance:
- Home answers: current context, priority work and next action.
- No fake metrics or fabricated activity.
- Search and quick lookup remain immediate.
- Cold/warm Home navigation tested.
- Home performance baseline compared.

### Phase 05 — Module Library and global search

Deliver:
- Module Library workspace.
- Category navigation.
- Search/filter.
- Recent/favorites only if their data model is explicitly defined.
- Module availability and integration states.
- Global product/module search contract.

Preserve:
- Stable RetailModule IDs.
- Separation of RetailModuleId and ModuleDataId.
- Current registry ownership.
- Truthful integrating/ready status.

Acceptance:
- Every registry item routes to a real workflow or displays a truthful unavailable/integrating state.
- No duplicate registry/list.
- Search behavior and keyboard support verified.
- No false claim that a data snapshot means a workflow is complete.

### Phase 06 — Shared workspace patterns

Implement reusable patterns in order of demonstrated reuse:
1. WorkspaceHeader and PageToolbar.
2. Search/filter/results.
3. Summary/metric strip only where data is real.
4. Responsive data table and row action patterns.
5. Detail/review/edit patterns.
6. Dialog/confirmation and contextual popover.
7. Loading/empty/stale/error/permission feedback.
8. History/restore pattern.

A shared component must have an API/variant contract and at least two consumers or a justified cross-platform ownership reason.

### Phase 07 — Existing operational feature presentation

Migrate one feature at a time.

| Feature | Presentation scope | Protected domain contract |
|---|---|---|
| Home Barcode Lookup | Search/result surface and scanner entry | Scanner Engine, camera lease, decoder validation, snapshot lookup |
| Scanner Settings | Settings hierarchy and controls | Existing scanner settings persistence and shared scanner session |
| Stocktake | Session/zone/scan/review/history/export layout | IndexedDB schema, zone revision, entry validation, explicit export, camera lifecycle |
| Stocktake Import | Import/conflict/workspace/table/preview/history layout | Parser, decimal precision, duplicate behavior, IndexedDB history, TXT/ZIP payload |

Scanner is a protected feature. Only presentation and integration boundary may change. Do not reopen scanner internals or change camera/decode behavior as part of visual work.

### Phase 08 — Notifications, Activity and Settings

Deliver:
- Notification Center.
- Activity history only when a real activity source exists.
- Profile and settings hierarchy.
- Appearance/performance preferences only when supported by persisted settings.
- Update Center visual integration.

Current Activity and Calendar content are placeholders. Do not invent data or imply live scheduling/notifications where no source exists.

Preserve:
- Push permission and subscription lifecycle.
- Update Center state and consent semantics.
- PWA update blockers and safe handoff.

### Phase 09 — Future module templates

When Inventory, Price, Products, Orders, Delivery, Sales or Product Dates workflows are implemented:
- Select an approved workspace pattern.
- Define the workflow's data contract and readiness.
- Use existing tokens/components.
- Add screen map and state model.
- Add module-specific acceptance.
- Avoid creating a new top-level design language.

This phase is not permission to implement business workflows that are not currently specified.

### Phase 10 — Consolidation and release readiness

Deliver:
- CSS ownership consolidation.
- Removal of verified dead styles/components only.
- Updated project map and canonical docs.
- Visual regression baseline.
- Responsive and accessibility matrix.
- Bundle report comparison.
- CI and physical-device evidence.
- Rollback and release notes preparation when promoting a completed version.

## 5. Priority and sequencing

Priority:
- **P0:** App Shell, Login, Home, Module Library, Scanner lookup presentation, Stocktake, Stocktake Import, Update Center safety.
- **P1:** Global Search, Notifications, Settings, shared workspace patterns.
- **P2:** Activity and future module templates once real data/workflows exist.

The sequence is dependency-based, not a calendar estimate. Design System and Navigation decisions precede screen migration; shared patterns precede repeated feature rebuilds.

## 6. Change impact and protected boundary matrix

| Area | UI changes allowed | Changes requiring separate approval/plan |
|---|---|---|
| Auth | Layout, typography, visual feedback, responsive composition | Auth algorithm, employee directory, session schema/persistence |
| Home | Layout, information hierarchy, navigation presentation | Snapshot API, cache contract, notice rules |
| Module Registry | Visual availability/status presentation | IDs, data source identity, workflow readiness semantics |
| Scanner | Scanner shell, controls layout, status presentation | Camera lease, getUserMedia constraints, lifecycle, decoder, validation |
| Stocktake | Screen layout, controls, responsive table and feedback | IndexedDB schema, zone revision, entry persistence, export payload |
| Stocktake Import | Workspace layout, table presentation, feedback | Parser, precision, source precedence, conflict semantics, history schema, TXT/ZIP |
| Overlay | Presentation and approved native API wrapper | Shared scroll-lock ownership, focus stack, nested close semantics |
| PWA | Update Center presentation | Service Worker install/staging/activation/cache/rollback contract |
| Build | CSS/assets and approved component code | Vite base path, release manifest, deployment workflow |

## 7. Test and acceptance matrix

### 7.1 Automated tests

Use existing scripts where applicable:

- `scripts/test-ui-interaction-immediacy.mjs`
- `scripts/test-overlay-layout-contract.mjs`
- `scripts/test-body-scroll-lock.mjs`
- `scripts/test-home-performance.mjs`
- `scripts/test-home-cache-batching.mjs`
- `scripts/test-bundle-boundaries.mjs`
- `scripts/test-stocktake-import.mjs`
- Existing Scanner regression scripts selected by the changed presentation boundary.
- PWA release/cache/runtime tests for any Update Center or shell lifecycle change.

Run `npm run preflight`, TypeScript, production build and Pages build on the final implementation PR head. This documentation branch has not run local npm commands or browser tests.

### 7.2 Visual/responsive matrix

| Environment | Required checks |
|---|---|
| Desktop Chrome | Standard office width, narrow window, zoom and keyboard |
| Desktop Edge | Same shell and data-workspace checks |
| Tablet | Portrait/landscape and touch |
| Android Chrome | Browser tab and installed PWA |
| iOS Safari | Browser tab, keyboard, browser chrome and safe area |
| iOS Home Screen PWA | Standalone viewport, safe areas, update and offline |
| Low-end Android | Cold load, scroll, open/close, long list/table and image loading |

### 7.3 Workflow regression

- Login, session restore and logout.
- Home search and section/workspace navigation.
- Snapshot loading, missing, stale and unavailable states.
- Notification open/close and push permission.
- Scanner open, permission, scan, close, background/foreground and retry.
- Stocktake create/resume/scan/manual edit/review/export/history.
- Import single/multiple workbook, conflict review, save/cancel, preview, copy, TXT, ZIP and history restore.
- PWA defer/download/stage/activate and blocker behavior.
- Offline and reload behavior.

### 7.4 Performance evidence

For each major slice record:
- Commit/build ID.
- Device, OS, browser and PWA/tab mode.
- Cold/warm state.
- Bundle report and actual network trace where relevant.
- Input-to-first-feedback.
- Long tasks, layout shift and scroll behavior.
- Memory/CPU observations for blur, images and motion.
- Before/after screenshot or short recording.

Do not report device acceptance from CI alone.

## 8. Rollout and rollback policy

- Work on isolated feature branches from current main.
- Keep each implementation slice narrow and reversible.
- Avoid mixing UI refactor with business logic or data schema changes.
- Preserve the current production/development baseline until each slice is accepted.
- Use feature-level rollback where possible.
- Keep release lifecycle changes separate from UI changes.
- Do not merge or deploy without explicit user approval.
- Development GitHub Pages deployment is not production-account promotion.

Rollback checklist:
1. Identify last accepted main commit.
2. Revert only the affected UI slice.
3. Confirm module IDs, persisted data and PWA release contract are unchanged.
4. Run relevant tests and build.
5. Verify the old screen remains reachable and functional.

## 9. Documentation goals and required technical documents

The technical documentation must answer five questions for every implementation task:

1. **What should be built?** Product purpose, screen hierarchy and target interaction.
2. **How should it be built?** Existing library/API, component contract, tokens, layout and ownership.
3. **What must not change?** Business, data, persistence, permission, Scanner and PWA contracts.
4. **How is it verified?** Automated, browser, responsive, accessibility, performance and physical-device checks.
5. **How can it be extended?** The repeatable recipe for adding a screen, component or module without breaking the design system.

Required document set:

| Document | Goal | Required content |
|---|---|---|
| `UI_UX_ARCHITECTURE.md` | Product-wide UI contract | Design principles, system layers, tokens, materials, components, patterns, layout, motion, accessibility, performance, extension and governance |
| `UI_UX_TECHNOLOGY_AUDIT.md` | Technology decisions | Direct dependencies, browser APIs, compatibility, keep/refactor/replace/create/install decisions and proof gates |
| `UI_UX_SCREEN_MAP.md` | Screen and workflow truth | AS-IS screens, navigation, actions, states, errors, ownership and TO-BE screen inventory |
| `UI_UX_IMPLEMENTATION_PLAN.md` | Delivery sequence | Phases, priorities, dependencies, files/areas, acceptance, risk and rollback |
| Screen specifications (one per meaningful screen or coherent feature group) | Implementable design blueprint | Layout at desktop/tablet/mobile, content hierarchy, component inventory, state transitions, responsive and accessibility behavior |
| Component specifications (only for shared components) | Reusable API contract | Purpose, props, variants, states, responsive rules, accessibility, motion, examples and anti-patterns |
| `UI_OVERLAY_ARCHITECTURE.md` | Overlay lifecycle | Shared scroll lock, modal/popover behavior, viewport and ownership |
| `UI_INTERACTION_RESPONSIVENESS_AUDIT.md` | Input response | First feedback, intentional delays and regression assertions |
| `PWA_RUNTIME_RELEASE.md` | Release safety | Consent, staging, activation, blockers, boot health and rollback |
| `SCANNER_ENGINE.md` | Scanner runtime | Engine/session/camera/decoder contract |

Do not create a document for every small component. Group related component contracts where practical. Do not duplicate feature data contracts into the UI documents.

### 9.1 Screen specification template

Each screen specification must contain:
- ID, title, owner and status.
- Purpose and user outcome.
- Entry points and exit/back behavior.
- Desktop/tablet/mobile layout.
- Content hierarchy and visual priority.
- Primary/secondary actions.
- Component inventory and token usage.
- State table and state-transition diagram.
- Loading/empty/stale/error/permission/validation/unsaved/blocked behavior.
- Data source, persistence and offline behavior.
- Motion/reduced-motion.
- Keyboard/focus/accessibility.
- Performance/bundle constraints.
- Tests and physical acceptance.

### 9.2 Component specification template

Each shared component specification must contain:
- Component name and owner.
- Problem solved and when not to use it.
- API/props and defaults.
- Variants and state model.
- Semantic HTML/browser-native behavior.
- Responsive behavior.
- Accessibility and keyboard behavior.
- Motion contract.
- Performance constraints.
- Usage examples and anti-patterns.
- Tests and consumers.

## 10. Definition of done for the full rebuild

- The app has one coherent shell and workspace navigation model.
- Every implemented screen follows the canonical design system.
- No future module needs to invent colors, typography, spacing, motion or navigation rules.
- New modules can select a documented workspace pattern and reuse shared components.
- Existing workflows preserve data and business behavior.
- All visible actions are functional and have immediate feedback.
- Desktop, tablet, iOS, Android and low-end layouts are accepted.
- Browser-native APIs have compatibility fallbacks.
- New dependencies are justified and approved.
- CSS ownership is understandable and no longer relies on indefinite override layering.
- Documentation is accurate, current, non-duplicative and sufficient to implement without reconstructing the entire chat history.

## 11. Current execution status

- Batch 00B technology audit: source and official-document research complete; local/browser/device execution not performed.
- Batch 00C screen map: source trace and target inventory complete; physical validation not performed.
- 00D: source-level design-system audit and proposed specification documented in `UI_UX_DESIGN_SYSTEM_SPEC.md`; contrast/font/device validation remains open.
- 00E: source-grounded information architecture/navigation decision documented in `UI_UX_SCREEN_MAP.md` §9; implementation not started and owner acceptance remains open.
- 00F: source-level component inventory and ownership decisions documented in `UI_UX_COMPONENT_AUDIT.md`; selector-level CSS audit, complete consumer graph and physical validation remain open.
- 00G: screen-level blueprints documented in `UI_UX_SCREEN_BLUEPRINTS.md`; high-fidelity prototype and owner acceptance remain open.
- 00H: acceptance/migration blueprint documented in `UI_UX_ACCEPTANCE_MIGRATION_BLUEPRINT.md`; owner approval, high-fidelity prototype and device targets remain open.
- Application source changes: none in this documentation batch.
- Dependencies installed: none.
- Merge/deploy: not performed.
