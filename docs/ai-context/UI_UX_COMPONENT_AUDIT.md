# UI/UX Component Inventory and Ownership Audit — Batch 00F

**Status:** Initial source-level component inventory and migration decisions recorded; complete consumer/cascade proof remains open. One confirmed unimported CSS file is retired on the Phase 00 audit branch; no component or application runtime code changed.
**Original audit baseline:** `main` at `2003ea24966755d0ad4e0298b34422b053267e77`
**Original audit date:** 2026-11-25
**Current source revalidation:** see [UI_UX_PHASE_00_AUDIT.md](./UI_UX_PHASE_00_AUDIT.md), audited at `588d8f937525acb29ebb7b0de97a9b1dcf61c0c7`. The original detailed inventory is not a claim that the complete runtime consumer graph or selector-level CSS audit is closed.
**Purpose:** Identify the current UI component system, ownership, consumers, duplication, coupling, migration disposition and the shared component contracts required by the 00E workspace architecture.

## 1. Audit method and evidence boundary

This audit used the recursive Git tree, source files, import/export surfaces, GitHub code-search results, package manifest and existing source-contract tests. It inspected the app entry/auth flow, Home and Module Library, settings/update center, Scanner presentation, Stocktake, Stocktake Import, Brand, Glass, Motion, Icons, LiquidDock, overlay coordination and PWA update presentation.

Evidence labels:
- **Confirmed:** directly visible in the audited source or test.
- **Assessment:** architectural interpretation of confirmed source.
- **Open:** requires selector-level CSS tracing, runtime/browser inspection, physical-device testing or a complete all-consumer callsite scan.

This is not a visual QA report, computed-style audit, accessibility certification or proof that a component is unused. No component, style, dependency or source file was deleted or modified.

## 2. Executive findings

1. The codebase already has reusable UI subsystems—Brand, Glass, Motion, Icons and LiquidDock—but their boundaries are not consistently applied. Some screens use shared wrappers; others use direct Lucide components, feature-local CSS and hand-built overlay markup.
2. `HomeScreen.tsx` is the largest coupling point in the current UI. It owns the Home overview, notifications, calendar, library sheet, settings entry, quick lookup, scanner entry, Stocktake/Import launch, toast and section-scroll navigation in one component. Its source size is approximately 54 KB.
3. The two operational feature components are also large feature-owned compositions: Stocktake approximately 32.6 KB and Stocktake Import approximately 46.3 KB. Their internal workflow state and persistence must remain feature-owned; presentation can be decomposed without extracting domain state into generic shell components.
4. `GlassSurface` is a generic element wrapper with material/tone attributes, not a complete surface system. It does not by itself guarantee semantic HTML, keyboard behavior, modal behavior or accessible interaction.
5. Motion has multiple wrappers and presets, but CSS animations and local feature transitions also exist. A wrapper's presence does not prove that a transition is centralized.
6. Icon rendering has two public render paths (`Icon` and `MotionIcon`) alongside direct `lucide-react` imports. The semantic registries exist, but they are not yet the sole rendering path.
7. `LiquidDock` is tightly coupled to the current Home section-navigation model and a central quick-action slot. It is a replaceable navigation presentation, not the future navigation contract.
8. Overlay lifecycle is partly shared (reference-counted body scroll lock) and partly duplicated across owners. A reusable focus-trap/overlay-stack manager is explicitly not implemented in the overlay architecture document.
9. The audited main baseline had 25 CSS files; the Phase 00 branch has 24 after retiring an unimported Home Phase 2 stylesheet. `mobile-tuning.css` is 87,143 bytes at the audited baseline, and multiple active Home stylesheet generations remain high-risk ownership/cascade areas. File size alone does not prove dead CSS or duplicate selectors.
10. Existing lazy-loading and regression tests are important architecture, not incidental implementation. A visual rebuild must preserve code-splitting boundaries and the existing scanner, PWA, Stocktake and Import behavior.

## 3. Current component and subsystem inventory

### 3.1 Application and authentication

| Component / owner | Current responsibility | Current consumers / evidence | 00F disposition |
|---|---|---|---|
| `App` (`src/App.tsx`) | Auth journey, identity recognition, Home lazy mount, offline/install state, logout cleanup, PWA transition blocker and boot-health signaling | Root entry from `main.tsx` | **Refactor** into a thin app composition + authenticated shell boundary. Keep auth/session, logout order, boot health and update-safety responsibilities intact. |
| `UnifiedIdentityView` (local to App) | Employee/department recognition transition and brand presentation | App auth journey only | **Refactor/replace presentation**. Keep the identity handoff state and timing semantics; visual treatment is fully replaceable. |
| `AmbientBackground`, `PageGlassDock` (local to App) | Decorative global background layers | App identity/home scenes | **Replace or remove after design review**. Decorative-only; verify every CSS consumer before deletion. |
| `LoginExperience` | Login interaction/state orchestration, local authentication, matched employee preview, success/error transition | App unauthenticated branch | **Keep behavior; refactor composition**. Auth algorithm, employee lookup and session contract are protected. |
| `LoginHero`, `LoginForm`, `LoginDock` | Login presentation, input/feedback and help surface | LoginExperience | **Replace/refactor presentation** against 00G. Keep numeric employee-code handling, submit feedback, error announcement, local-only authentication and camera-permission explanation truth. |

### 3.2 Home, Module Library and settings

| Component / owner | Current responsibility | Current consumers / evidence | 00F disposition |
|---|---|---|---|
| `HomeScreen` | Home overview, snapshot notice state, notification popover/detail, calendar, library sheet, quick lookup, scanner, Settings, Stocktake/Import launch, section nav, toast and logout | Lazy-loaded by App | **Refactor first**. Split by ownership and workspace composition; do not move snapshot rules, lookup contracts, camera lease or feature state into a generic component. |
| `HomeModuleLibrarySection` | Search, registry filtering, group construction | HomeScreen | **Refactor/keep responsibility** as a Module Library workspace section. It must continue using the single registry. |
| `ModuleLibraryEngine` | Renders grouped library cards and invokes open callback | HomeModuleLibrarySection | **Replace presentation / keep data contract**. It is coupled to GlassSurface + MotionCard and should become a reusable catalog/list pattern only if more than one consumer needs it. |
| `moduleRegistry.ts` | Canonical module/library IDs, labels, grouping, source and availability metadata | Home and icon registry | **Keep as single source of truth**. Do not create a parallel route registry. Extend only with navigation metadata that is genuinely needed and does not redefine readiness. |
| `homeStateStore.ts` | Persists active section, search and global scrollY | HomeScreen | **Refactor/migrate selectively**. Search and per-workspace scroll may remain useful; legacy `activeNav` must not override URL destination after 00E routing. Version any storage migration. |
| `SettingsHub` | Settings dialog, Update Center entry and Scanner Settings entry | Lazy-loaded by HomeScreen | **Refactor** into Settings workspace composition. Keep Update Center state/event contract and scanner settings delegation. |
| `UpdateCenterView` (local to SettingsHub) | Reads update-center store, shows release metadata/progress and requests download/activation | SettingsHub | **Refactor presentation; keep state adapter**. Download/activation consent, staged state and block reasons remain owned by PWA runtime. |
| Home Activity panel | Current empty activity placeholder | HomeScreen | **Do not promote as a data-driven reusable component yet**. Activity destination remains gated until a real source exists. |
| Calendar preview/modal | Calendar date picker; agenda is explicitly empty | HomeScreen | **Replace or remove after product decision**. Do not imply event scheduling or calendar integration. |

### 3.3 Operational feature presentation

| Component / owner | Current responsibility | Current consumers / evidence | 00F disposition |
|---|---|---|---|
| `BarcodeScanner` | Home full-screen scanner presentation around shared scanner hook/session | Lazy-loaded by HomeScreen | **Presentation-only refactor**. Preserve `useScannerEngine`, camera lease, lifecycle milestones, preview binding, decoder validation and close gate exactly. No scanner-engine work is part of 00F. |
| `ScannerSettingsPanel` | Scanner preferences UI, symbology toggles, beep and vibration controls | SettingsHub lazy entry | **Presentation refactor**. Preserve settings store, supported-state logic and cross-feature shared settings. |
| `StocktakeScanner` | Stocktake-owned camera presentation | StocktakeModule | **Keep feature-owned presentation boundary**; share only visual primitives with Home scanner. Do not force both camera experiences into one giant configurable scanner component. Preserve exit gate and shared engine contracts. |
| `StocktakeModule` | Stocktake session, zone, scan, review, history and export workflow UI | Lazy-loaded by HomeScreen | **Refactor composition by screen/pattern** while keeping state machine, IndexedDB operations, zone revisions, explicit save/export, PWA blocker and scanner integration inside the feature boundary. |
| `StocktakeImportModule` | Workbook import, conflict review, zone selection, editable table, TXT preview, copy/download/ZIP and history | Lazy-loaded by HomeScreen | **Refactor composition by workspace region**. Preserve parser, source ordering, duplicate/conflict rules, decimal handling, dirty state, IndexedDB history, TXT/ZIP output and PWA blocker. Keep JSZip deferred. |
| Feature-owned tables/forms | Dense editable data and workflow controls | Stocktake and Import | **Create shared primitives only after 00G proves common contracts**. Do not abstract two superficially similar tables into one generic grid before their edit, validation, pagination and persistence semantics are mapped. |

### 3.4 Shared presentation systems

| System | Current source/API | Current state | 00F disposition |
|---|---|---|---|
| Brand | `Brand`, `BrandMark`, `BrandWordmark`, `BrandMotion`, `BRAND_CONFIG` | Reusable lockup and SVG mark; used in Login, identity, Home and background | **Keep identity configuration; replace visual assets/lockup if target design requires**. BrandMotion should not force the final logo to animate in every context. |
| Experience Background | `ExperienceBackground`, background config | Full-scene decorative backdrop for login/home | **Replace or reduce**. Make photography/editorial imagery an optional layer, not a required background effect or data dependency. |
| Glass | `GlassSurface`, `GlassMaterial`, token/material CSS | Six material variants: soft, frosted, elevated, floating, control, dark; generic polymorphic wrapper | **Refactor/possibly replace** with semantic Surface/Panel/Popover primitives. Keep blur selective; do not migrate the Glass name or six variants by default. |
| Motion | `MotionProvider`, `MotionBoundary`, `MotionPresence`, `MotionPage`, `MotionSheet`, `MotionButton`, `MotionCard`, tokens/presets/transitions | Shared reduced-motion context and data-attribute CSS; local animation systems also remain | **Consolidate** into one small motion contract. Keep preference detection and reduced-motion support; remove wrappers that do not provide distinct value after callsite tracing. |
| Icons | `Icon`, `MotionIcon`, `icon.registry.ts`, presets/types | Semantic registry for departments, modules, libraries and Home nav; direct Lucide imports also used | **Keep semantic registry; consolidate rendering API**. Motion is opt-in. Do not force animation on every icon. |
| LiquidDock | `LiquidDock`, Item, Indicator, interaction hook and types | Floating bottom dock with central action, keyboard navigation and keyboard-aware hiding | **Replace as navigation presentation**. Its current section IDs and center action do not define the 00E route contract. Preserve quick lookup as a separate global action. |
| AppErrorBoundary | Shared React error boundary and boot-failure notification | Root boundary and local scanner fallback | **Keep**, improve visual fallback later. Preserve PWA boot failure reporting and build identity. |
| Body scroll lock | `useBodyScrollLock` + reference-counted `acquireBodyScrollLock` | Single shared manager, multiple owners | **Keep as canonical service**. Do not introduce another overflow snapshot/restore implementation. |
| PWA Update Prompt | `PwaUpdatePrompt` + PWA store/runtime services | Global release state controller and visible prompt; mounted from main | **Keep controller and release contract; refactor view/integration later**. Do not move activation decisions into App Shell or Settings presentation. |

### 3.5 Confirmed direct consumer graph — static import/search pass

The following is the direct source-consumer map confirmed against the audited tree. It is deliberately not labelled a complete transitive runtime graph.

| Shared export / service | Direct consumers confirmed | Consequence for migration |
|---|---|---|
| `GlassSurface` | `MotionButton`, `LiquidDock`, `LoginDock`, `LoginForm`, `ModuleLibraryEngine`, `HomeScreen` | Cross-feature presentation dependency; migrate consumers before retiring Glass CSS/API. |
| `MotionPresence` | `BrandMotion`, `MotionCard`, `LoginForm` | Keep enter/exit behavior and state semantics stable until these consumers migrate. |
| `MotionButton` | `LoginForm` | Narrow current consumer; assess whether its Glass composition is still useful in the target Login design. |
| `MotionPage` | `LoginExperience` | Login transition dependency. |
| `MotionSheet` | `HomeScreen` | Home module-library sheet and its exit/scroll-lock lifecycle. |
| `MotionProvider` / `MotionBoundary` | `main.tsx`; Boundary consumes Provider state | App-root preference and reduced-motion boundary. |
| `Brand` / `BrandMark` | App identity, LoginHero, HomeScreen, ExperienceBackground | Brand lockup and mark have multiple surfaces; replace assets without losing identity semantics. |
| `BrandMotion` | `App.tsx`, `LoginHero` | Separate identity and Login motion callsites. |
| `ExperienceBackground` | `App.tsx` | Global scene/background presentation. |
| `Icon` / semantic icon registry | LoginDock, LoginHero, App, LoginForm, HomeScreen and feature metadata | Preserve semantic module/department mapping; direct Lucide imports remain elsewhere. |
| `MotionIcon` | App, Login components, Home, LiquidDock and other feature presentation | Motion remains opt-in; not all icons need animation. |
| `LiquidDock` | `HomeScreen` | Current section-navigation presentation only; not a route registry. |
| `AppErrorBoundary` | `main.tsx`, `HomeScreen`, `StocktakeModule` | Root and feature fallback responsibilities must remain intact. |
| `useBodyScrollLock` | `HomeScreen`, `SettingsHub`, `ScannerSettingsPanel`, `StocktakeModule`, `StocktakeImportModule` | Shared cross-feature service; do not fork or replace without an overlay ownership migration. |
| `PwaUpdatePrompt` | `main.tsx` | Global presentation adapter; PWA release controller remains protected. |

Static search does not resolve every alias/re-export, conditional/dynamic import, JSX spread, portal, runtime class construction or CSS-only selector. The remaining graph must be completed before retiring any shared export or broad stylesheet family.

## 4. Shared component API assessment

### 4.1 GlassSurface is not a semantic design-system primitive

Confirmed API: polymorphic `as`, required `material`, optional `tone`, `interactive`, `className`; it forwards remaining props and emits class/data attributes.

Assessment:
- It can wrap a button or nav, but does not select correct semantics by itself.
- It does not own focus, keyboard, modal, loading or disabled-state policy.
- The `interactive` flag is a styling hint, not proof of an accessible interaction contract.
- Its material enum encodes current visual vocabulary, not task meaning.

Decision: do not simply rename GlassSurface to Surface. 00G/00H should define semantic primitives such as PageSurface, Panel, ActionSurface and OverlaySurface only where their contracts differ. Prefer native elements and explicit action semantics.

### 4.2 Motion wrappers overlap in purpose

Phase 00 consumer tracing found no runtime consumer for the exported `MOTION_TOKENS` object or the imperative helpers `resolveMotionPhase` and `attachMotionPhaseVariables`; the only matches were their own declarations and barrel exports. These three unused public APIs are removed on the Phase 00 branch. Active motion wrappers, phase/state types, presets, config and `getMotionOrigin` remain. This does not consolidate or redesign the active Motion system.

Confirmed:
- `MotionPresence` adds motion preset/state/phase attributes to a configurable element.
- `MotionCard` is a thin wrapper around MotionPresence.
- `MotionPage` adds page preset/active/phase attributes.
- `MotionSheet` adds origin coordinates and enter/exit state.
- `MotionButton` composes GlassSurface with motion attributes.
- `BrandMotion` composes MotionPresence.
- Login and Home also use hand-authored transitions and CSS classes.

Assessment: wrappers are useful only when they encode behavior that is genuinely reused. Several are attribute adapters and may not warrant dedicated React components once the new motion vocabulary is defined.

Decision: retain one preference/context owner and a small number of semantic transition primitives; avoid one wrapper per visual element. Feature transitions remain feature-owned when lifecycle milestones are tied to domain cleanup (especially Scanner close).

### 4.3 Icon paths need one contract

Confirmed:
- Semantic registry maps DepartmentId, RetailModuleId, ModuleLibraryId and Home navigation keys to Lucide icon components.
- `Icon` handles size, stroke and accessible label.
- `MotionIcon` wraps Icon with variant/state data attributes.
- Screens and features also import Lucide icons directly.

Decision:
- Keep one semantic icon registry for product/domain meaning.
- Keep a simple static Icon renderer as the default.
- Make motion an opt-in presentation modifier, not a parallel mandatory renderer.
- Use direct Lucide imports for truly local one-off actions only if this does not fragment repeated semantic meanings.
- Do not change the icon library/dependency until a visual and bundle comparison supports it.

### 4.4 Overlay primitives and ownership gap

Confirmed:
- Body scroll locking is reference-counted and shared.
- Overlay content and close behavior remain owned by Home, Settings, Scanner Settings, Stocktake and Import.
- Modal semantics/focus behavior are implemented locally to varying degrees.
- `UI_OVERLAY_ARCHITECTURE.md` explicitly states a reusable focus-trap/stack manager is not implemented.

Decision:
- Keep feature ownership and the existing body-lock service.
- 00G/00H must define a single overlay contract for Dialog, Sheet, Popover and nested confirmation, including topmost Escape handling, focus entry/return, focus containment, backdrop policy, safe-area viewport and nested ownership.
- Only create a shared overlay stack/focus manager if the contract and current callsites demonstrate it is necessary. Do not silently add a second body-lock service.
- Do not use a single all-purpose Overlay component with dozens of props.

## 5. CSS and visual ownership audit

### 5.1 Confirmed stylesheet inventory

The audited `main` baseline contains 25 CSS files; the Phase 00 audit branch contains 24 after removal of one unreferenced file:

| Area | Files | Size / note |
|---|---|---|
| Global foundations | `base.css`, `theme.css`, `responsive.css`, `interactions.css`, `mobile-tuning.css`, `performance.css`, `adaptive-appearance.css`, `native-experience.css` | Eight stylesheets imported by `main.tsx`; `mobile-tuning.css` is 87,143 bytes |
| Active Home generations | `home.css`, `home-ux.css`, `home-engine.css`, `home-redesign.css`, `home-architecture.css` | Five imported files; 39 repeated selector strings across the five-file cascade. `home-phase2.css` was unimported and is retired on the Phase 00 branch. |
| Login | `login-experience.css` | 22,218 bytes; imported by LoginExperience |
| Scanner settings | `scanner-settings.css` | 7,113 bytes; imported by SettingsHub and ScannerSettingsPanel |
| Scanner transition | `scanner-transition.css` | 8,723 bytes; imported by Home BarcodeScanner and StocktakeScanner |
| Stocktake | `stocktake.css` | 12,037 bytes; imported by StocktakeModule |
| Stocktake Import | `stocktake-import.css` | 50,389 bytes; imported by StocktakeImportModule |
| Brand / Glass / Motion / Navigation / PWA | `brand.css`, `glass.tokens.css`, `glass.materials.css`, `motion.css`, `LiquidDock.css`, `pwa-update-prompt.css` | Shared styles imported at app entry or by the owning lazy feature |

### 5.2 Confirmed import ownership

- `main.tsx` imports the eight global stylesheets plus Brand, Motion, Glass tokens/materials and LiquidDock styles.
- `LoginExperience` imports login CSS.
- `SettingsHub` and `ScannerSettingsPanel` both import scanner-settings CSS.
- `BarcodeScanner` and `StocktakeScanner` import the shared scanner transition stylesheet.
- Stocktake and Stocktake Import each import their own feature stylesheet.
- The current Home style ownership spans multiple Home CSS files; the global `mobile-tuning.css` also contains important Home overlay contracts.

### 5.3 Required next action before deleting or consolidating CSS

No bundled CSS file is approved for deletion by this inventory. The Phase 00 audit branch retires only `home-phase2.css`, proven absent from the source import graph. Before any further removal:
1. Build selector-to-element usage mapping across JSX/TSX, templates and runtime-generated class names.
2. Identify duplicate selectors, specificity collisions, media-query overlap and `!important` overrides.
3. Capture computed styles for representative desktop/tablet/mobile states.
4. Verify lazy-feature stylesheet loading and ensure feature CSS does not leak globally.
5. Migrate selectors into one canonical owner before removing old imports.
6. Run overlay, responsive, feature and visual regression checks.

The source-level inventory confirms fragmentation and high maintenance risk; it does not prove that any particular selector/file is dead.

## 6. Coupling and complexity hotspots

| Hotspot | Evidence | Risk | Required response |
|---|---|---|---|
| HomeScreen orchestration | ~54 KB component; many local states and multiple workflow launchers/overlays | Shell/navigation, overview, notifications and workflow entry are coupled | Split by ownership and destination; keep feature state out of shell |
| Home CSS | Five active Home stylesheets plus global mobile overrides | Cascade order and visual ownership difficult to reason about | Establish one Home/workspace style owner and retire generations only after selector audit |
| SettingsHub | Settings + Update Center + scanner settings routing in one dialog flow | Settings destination and nested detail navigation coupled | Convert to workspace navigation while preserving PWA and scanner settings contracts |
| StocktakeModule | ~32.6 KB, multiple screens and workflow states | Presentation changes can accidentally change save/revision/export transitions | Extract screen composition/presentational regions; keep state machine/service calls in feature |
| StocktakeImportModule | ~46.3 KB, import, conflict, table editing, output and history | UI abstraction can corrupt dirty/validation/export/persistence semantics | Decompose by workflow region; preserve feature-local state and exact output contract |
| Scanner UI duplication | Home and Stocktake have separate camera shells but shared engine | Forcing both into one configurable component risks lifecycle coupling | Share only stable presentation primitives; retain two feature-owned shells and existing engine integration |
| Overlay behavior | Multiple local backdrops/Escape/focus handlers; shared body lock; no focus stack | Nested surfaces can disagree about topmost Escape and focus return | Define overlay stack/focus contract before broad migration |
| Icon rendering | Registry + Icon + MotionIcon + direct Lucide imports | Repeated meanings can drift; motion is inconsistently applied | One static render contract with semantic registry; motion opt-in |
| Material abstraction | GlassSurface generic wrapper and many direct material CSS surfaces | Material labels can become a visual constraint instead of task semantics | Define semantic surface roles; blur remains selective |
| PWA UI | Global PwaUpdatePrompt controller plus Settings UpdateCenter view/store events | Presentation could accidentally absorb release logic | Keep runtime controller and release state independent of shell/UI |

## 7. Target ownership map

The target conceptual structure below is aligned with 00E and 00D. It is not a mandate to move every file immediately.

```text
App / Platform
├── Auth boundary
│   ├── Login workspace
│   └── Identity transition
│
├── App Shell
│   ├── Global Header
│   ├── Primary Navigation
│   │   ├── Desktop Navigation
│   │   └── Mobile Navigation
│   ├── Workspace Outlet
│   └── Global Actions / Notification entry
│
├── Design System
│   ├── Tokens / Typography / Materials
│   ├── Primitive controls
│   ├── Semantic components
│   ├── Workspace patterns
│   ├── Overlay primitives
│   └── Motion preference + transitions
│
├── Shared Platform UI
│   ├── Error boundary
│   ├── Body scroll lock
│   ├── PWA update view adapter
│   └── Download / feedback utilities
│
└── Feature Workspaces
    ├── Home Overview
    ├── Module Library
    ├── Settings
    ├── Stocktake
    ├── Stocktake Import
    └── Scanner feature presentation
        └── Shared Scanner Engine remains outside Design System
```

Ownership rules:
- App Shell owns route context, global navigation and workspace mounting—not feature data or workflow state.
- Design System owns reusable visual/interaction contracts—not business logic or persistence.
- Shared Platform owns cross-feature lifecycle services—not feature presentation.
- Feature modules own their workflow, validation, persistence, data states and specialized presentation.
- Scanner Engine, PWA release, authentication/session, snapshot/cache, Stocktake and Import contracts remain domain/platform-owned.
- A shared component is justified by repeated behavior/structure or a cross-platform contract—not merely by similar JSX.

## 8. Target component inventory to specify in 00G/00H

Priority is based on the 00E architecture and current workflows.

| Priority | Component/pattern | Required contract | Notes |
|---|---|---|---|
| P0 | AppShell / WorkspaceOutlet | Mounting, route context, global frame and loading/error boundary | Must not own feature state |
| P0 | DesktopNavigation / MobileNavigation | Destination identity, active state, keyboard/touch and responsive behavior | Replace LiquidDock as navigation presentation |
| P0 | GlobalHeader / WorkspaceHeader | Employee/department context, workspace title, global actions and back behavior | Avoid duplicate identity/header layers |
| P0 | Button / IconButton / LinkAction | Intent, size, pending/disabled, keyboard, focus and immediate feedback | Native semantics first |
| P0 | Icon / semantic icon registry | Static default, accessible label, size and optional motion | One rendering contract |
| P0 | TextField / SearchField | Label, hint/error, input mode, clear, IME and mobile keyboard behavior | Search and barcode lookup are initial consumers |
| P0 | Status / Badge / InlineFeedback | Separate UI readiness, data freshness, operation, validation and persistence states | Never collapse all states to one badge |
| P0 | Surface / Panel / Card | Semantic surface roles, border/elevation/material and responsive behavior | Glass is optional, not the component API |
| P0 | Dialog / Sheet / Popover | Overlay ownership, focus, Escape, backdrop, scroll lock and nested policy | Reconcile with UI_OVERLAY_ARCHITECTURE |
| P0 | Loading / Empty / Error / Offline states | Truthful data and operation state, retry and accessibility announcements | Shared visual pattern, feature-specific copy |
| P0 | Data workspace / responsive table | Density, sticky regions, row actions, keyboard, horizontal/vertical scroll and pagination | Define separately for Stocktake and Import first |
| P1 | WorkspaceToolbar / FilterBar | Search/filter/action grouping and responsive collapse | Reuse only after 2+ proven consumers |
| P1 | Notification item / Notification panel | Priority, source/date, unread/empty/loading/error and action | Snapshot truth + push state remain separate |
| P1 | UpdateCenter presentation | Release summary, progress, defer/download/activate and blocked reason | PWA runtime remains controller |
| P1 | Toast / operation feedback | Pending/success/error timing and action result semantics | Do not report success before completion |
| P2 | Activity timeline | Event schema, actor, timestamp and pagination | Blocked until real activity source |
| P2 | Metric/KPI card | Source, period, freshness, unit and empty/error | No fake metrics; not a universal dashboard card |

Do not create all components as a framework up front. Implement only after 00G screen blueprints show actual consumers and APIs.

## 9. Migration decisions and sequence

1. Establish route/shell boundaries from 00E; do not migrate navigation presentation before the destination contract is accepted.
2. Build semantic tokens and primitives from 00D/00G; do not preserve Glass as the design-system root by default.
3. Split Home orchestration into workspace-owned regions while keeping existing data services and lazy feature entry points.
4. Replace LiquidDock only when Desktop/Mobile Navigation can cover keyboard, quick lookup, safe areas and active destination semantics.
5. Migrate Settings/Update Center as presentation adapters; keep PWA release controller untouched.
6. Migrate Stocktake and Import presentation independently, with workflow regression at each slice.
7. Migrate Scanner presentation only after its shell blueprint; do not change scanner hooks, platform services, decoder, camera acquisition, lifecycle, ROI or exit gates.
8. Consolidate icon and motion wrappers based on full consumer mapping.
9. Consolidate CSS only after selector/cascade proof.
10. Delete superseded components/assets/styles only when all consumers are migrated and tests prove the replacement.

## 10. Regression and acceptance requirements

### Existing automated checks to preserve

- `scripts/test-ui-interaction-immediacy.mjs`
- `scripts/test-home-performance.mjs`
- `scripts/test-home-cache-batching.mjs`
- `scripts/test-bundle-boundaries.mjs`
- `scripts/test-body-scroll-lock.mjs`
- `scripts/test-overlay-layout-contract.mjs`
- `scripts/test-stocktake-import.mjs`
- Relevant Scanner presentation/lifecycle regression scripts only when the Scanner presentation boundary changes; no Scanner engine refactor is authorized by 00F.
- PWA cache/runtime/platform compatibility checks if Update Center or App Shell integration changes.

### Source-audit checks still open

- Complete transitive import/callsite graph for every exported shared component and each CSS selector.
- JSX/runtime-generated class selector coverage and computed-style collision analysis.
- Full accessibility audit including focus containment, screen-reader announcement order and keyboard traversal.
- Desktop/tablet/mobile screenshots and physical-device performance.
- Bundle before/after measurements for any shared library or code-splitting change.

### Acceptance gates

- [x] Inventory current shared and feature-owned UI systems.
- [x] Record keep/refactor/replace/create dispositions.
- [x] Identify major coupling and CSS ownership risks.
- [x] Identify shared component contracts required by 00E workspaces.
- [x] Define feature/platform boundaries and migration order.
- [x] Map existing regression tests to future component migration.
- [ ] Full selector-level CSS usage/dead-style audit.
- [ ] Complete runtime consumer graph for every shared export.
- [x] 00G screen blueprints define screen-level composition, state and ownership contracts; exact source callsite/API proof remains an implementation prerequisite.
- [x] 00H acceptance/migration blueprint documented; owner approval remains open.
- [ ] Owner acceptance before implementation.

**00F completion means the source-level inventory and ownership decisions are documented. No shared component or bundled CSS family is approved for immediate deletion or replacement solely by this audit.**
## 20. Design-system evolution and contribution governance

The component inventory is an audit of what exists today, not a cap on what RetailOS may build. The shared system must evolve with operational requirements.

- Core Foundation defines identity and quality principles; it is not a fixed component whitelist.
- Shared components are reusable solutions with explicit semantic responsibility.
- Feature-owned components are valid first-class architecture when a workflow needs specialized behavior, density, lifecycle or performance.
- New features may create new controls, patterns, tokens or variants when existing shared solutions are insufficient.
- A feature-owned solution may remain local or become a Shared Candidate after real cross-feature reuse is demonstrated.
- Do not generalize from visual similarity alone; compare semantics, state, accessibility and interaction behavior.
- Do not force feature workflows into generic components or create mega-components to avoid adding a new component.
- Shared components may evolve or be replaced. Migrate consumers and retire superseded implementations rather than preserving parallel systems indefinitely.

Use the lifecycle: Experimental → Feature-owned → Shared Candidate → Shared Stable → Deprecated → Retired. Not every component passes through every state; feature-owned may remain local permanently.

A contribution to Shared Stable must include its problem/consumer evidence, semantic contract, API/variants/states, responsive and accessibility behavior, motion policy, performance impact, tests, ownership and migration/rollback plan. The purpose is controlled evolution, not bureaucracy.
