# M0-A1 — Source Architecture Audit

**Repository:** `banjk124-hub/retailos-home`  
**Baseline:** `main` at `c46cfcc788e923d0f4c787ec8e15f2783a8e74af`  
**Audit branch:** `audit/m0-a1-source-architecture`  
**Status:** Source-level architecture audit completed for the inspected application, Home, feature, shared UI and lifecycle boundaries. Runtime profiling, complete transitive dependency graph and computed-style review remain separate gates.

## 1. Purpose and decision boundary

M0-A1 determines how the current source is structured, where state and presentation responsibilities live, which boundaries must be protected, and what can safely evolve to support the owner-confirmed RetailOS design direction.

The two owner references define:
- **Visual language:** one recognizable application identity with screen-specific compositions; concise Vietnamese content; purposeful imagery, icons and data visualization; a consistent design system without forcing every feature into the same card/dashboard layout.
- **Motion language:** motion and feedback are contextual to interaction, loading and state transitions; it is not continuous decoration and must remain usable across desktop, tablet, mobile and lower-powered devices.

This audit does not approve a final palette, font, image source, motion library, router or component framework. It does not modify runtime code, business logic, persistence, module IDs, scanner internals or PWA lifecycle.

Evidence labels:
- **Confirmed:** directly inspected source or an existing source/test contract.
- **Assessment:** architectural interpretation of confirmed evidence.
- **Not proven:** requires complete callsite tracing, browser execution, profiling or physical-device validation.

## 2. Executive assessment

1. **The current React/Vite application is a viable foundation.** No source evidence demonstrates a need to replace React 18, TypeScript 5 or Vite 6, or to add a large UI framework.
2. **The root application is a stateful journey controller, not a route shell.** `App.tsx` owns Login → Identity Recognition → Home, session restoration, logout cleanup, install/offline state, boot-health reporting and PWA transition blockers. Home is lazy-loaded.
3. **Home is the main architecture concentration point.** `HomeScreen.tsx` is approximately 54 KB and combines multiple UI domains and entry points. It should be decomposed by ownership, not rewritten as a generic dashboard or reduced by arbitrary file splitting.
4. **Business workflows already have feature boundaries.** Stocktake and Stocktake Import own their workflows and persistence. Their internal state must not migrate into a generic shell or shared table without proven semantic equivalence.
5. **Shared UI foundations exist but are unevenly applied.** Brand, Glass, Motion, Icons, LiquidDock, body-scroll locking and error boundaries exist. Their presence does not mean all UI behavior is centralized or their abstractions are all worth preserving.
6. **The design system is fragmented across stylesheet layers.** Global foundations are imported from `main.tsx`; Home adds five CSS files. Existing audit evidence records repeated selector strings and a very large mobile override layer. Actual computed winners and runtime effects are not proven by static inspection alone.
7. **Navigation architecture is not yet an implemented multi-workspace shell.** Home section IDs and LiquidDock currently represent section navigation and quick actions. They must not be mistaken for a route registry.
8. **The most useful next work is bounded and evidence-led:** establish explicit screen/workspace ownership, consolidate visual tokens and component contracts after CSS/callsite tracing, then prototype a representative feature slice. Do not add dependencies before a measured gap is demonstrated.

## 3. Application composition and lifecycle

### 3.1 Root journey

**Confirmed source:** `src/main.tsx`, `src/App.tsx`, `src/features/auth/screens/LoginExperience.tsx`.

| Concern | Current owner | Source behavior | Redesign boundary |
|---|---|---|---|
| React root | `main.tsx` | StrictMode, AppErrorBoundary, MotionProvider, MotionBoundary, App, PwaUpdatePrompt | Keep root error and motion preference providers unless a proven replacement is specified. |
| Authentication journey | `App.tsx` | `login`, `identity`, `home` states | Presentation may change; journey and session semantics remain. |
| Session | auth session store + App | Existing session restores directly to Home; logout clears session/name and cached module data | Preserve order and failure handling. |
| Employee recognition | `UnifiedIdentityView` in App | Shows employee/department before Home | Presentation can evolve; identity truth and handoff timing remain. |
| Home loading | lazy import + Suspense | Home chunk is loaded after authentication; visible loading fallback | Preserve lazy boundary and meaningful loading state. |
| Offline/install | App | Online/offline listener and install prompt state | Keep state truthful; do not duplicate in shell. |
| PWA boot health | App + PWA safety services | Reports boot healthy and registers transition blocker | Protected lifecycle contract. |
| Logout | App | Releases camera, starts leave transition, clears session/name/cache, then returns to Login | Do not move cleanup into visual components. |

**Assessment:** App is currently the journey and lifecycle coordinator. It should remain thin in presentation responsibility, but a new shell proposal must not silently absorb session, boot-health, update-safety or cleanup logic.

### 3.2 Navigation and shell

**Confirmed source:** `HomeScreen.tsx`, `moduleRegistry.ts`, `LiquidDock.tsx`.

- Home navigation IDs currently include `home`, `modules`, `activity`, `settings`.
- Home, Modules and Activity are section-oriented; Settings opens an overlay.
- Module selection opens a group sheet rather than navigating to a distinct route.
- LiquidDock renders supplied items and an optional central action. It does not own a canonical route registry.
- Module registry owns stable workflow and library IDs/readiness metadata.

**Assessment:** a persistent desktop rail, tablet compact navigation and mobile bottom navigation may be explored as responsive shell presentations. The route/history contract is not implemented and must be decided separately. Do not change IDs, introduce a parallel registry or make an architectural router migration part of a visual-only slice.

## 4. Home responsibility map

**Confirmed source:** `src/features/home/HomeScreen.tsx` (approximately 54 KB; source inspected).

| Responsibility cluster | Existing owner/source evidence | Correct future ownership direction |
|---|---|---|
| Home composition and section navigation | HomeScreen | Home workspace composition + navigation adapter |
| Snapshot notices and notice detail | HomeScreen + snapshot notice rules/data snapshot service | Notice feature/presentation with rules and snapshot source kept separate |
| Notifications and push setup | HomeScreen + notification services | Notification surface and notification service; no fabricated activity feed |
| Calendar date selection | HomeScreen | Calendar preview only while no real agenda source exists |
| Module search and grouping | HomeModuleLibrarySection + moduleRegistry | Module Library owns query/filter presentation; registry remains canonical |
| Library sheet and selected group | HomeScreen + MotionSheet | Overlay presentation/entry state separated from module metadata |
| Scanner launch and camera lease request | HomeScreen + scanner services | Global/contextual action adapter; scanner feature owns camera presentation; engine protected |
| Manual barcode lookup | HomeScreen + barcode lookup service | Lookup feature/service boundary; preserve request identity and cached lookup behavior |
| Stocktake launch | HomeScreen lazy boundary | Stocktake feature owns workflow and persistence |
| Stocktake Import launch | HomeScreen lazy boundary | Import feature owns parser/review/output/history |
| Settings launch | HomeScreen → lazy SettingsHub | Settings feature owns settings presentation; PWA state remains PWA-owned |
| Toast and announcement | HomeScreen | Feedback primitive may be shared after semantic contract is proven |
| Overlay close and scroll lock | HomeScreen + feature surfaces + shared body lock | Explicit per-overlay lifecycle and shared canonical body lock |

**Primary architectural risk:** HomeScreen owns too many unrelated interaction states and directly coordinates feature entry, overlay lifecycles and several global actions. This creates high change coupling: a visual change to the shell can unintentionally affect feature entry or cleanup.

**Required approach:** map each state variable and effect to its domain, then extract a boundary only when it can own its own state, cleanup and tests. Do not create a generic Home controller that merely relocates the same coupling.

## 5. Module registry and readiness truth

**Confirmed source:** `src/features/home/moduleRegistry.ts`.

- Five library group IDs are defined in `MODULE_LIBRARY_IDS`.
- Nine workflow IDs are defined in `RETAIL_MODULE_IDS`.
- Each workflow records source type (`snapshot` or `local`) and UI availability (`integrating` or `ready`); optional workStatus is informational.
- Registry comments explicitly distinguish snapshot data support from a complete workflow UI.
- Current source connects dedicated operational workspaces for Stocktake and Stocktake Import. Other registry entries are not proof of completed workflows.
- The library section filters registry metadata and passes grouped modules to ModuleLibraryEngine.

**Decision:** registry remains the single source of truth for IDs and readiness. A future navigation layer may reference stable IDs, but must not duplicate or reinterpret them. Visual status labels must continue to distinguish data availability from workflow readiness.

## 6. Feature ownership and protected contracts

### 6.1 Stocktake

**Confirmed owners:** `StocktakeModule.tsx`, stocktake services/types/CSS, StocktakeScanner.

Stocktake owns session, zone, scan, review, history and export presentation, local persistence, zone revisions, explicit save/export and PWA transition blocking. Scanner presentation is feature-owned while camera/session/decoder behavior is shared and protected.

**Design consequence:** this is a task workspace, not a generic KPI dashboard. Use task-first composition, dense but readable lists/tables, clear zone/session state and explicit primary actions. Keep workflow state and persistence inside the feature.

### 6.2 Stocktake Import

**Confirmed owners:** `StocktakeImportModule.tsx`, parser/session/store/CSS.

The feature owns workbook parsing, source ordering, conflict review, editable data, dirty state, persistence/history, TXT preview/copy/download/ZIP output and PWA transition blocking. JSZip is intentionally deferred by existing bundle-boundary tests.

**Design consequence:** treat import as a data-preparation workspace with a distinct review/validation/output hierarchy. Do not force it into Stocktake's scan-oriented layout or a generic editable grid. Preserve precision, conflict and dirty-edit behavior.

### 6.3 Scanner

Scanner stabilization is closed. Presentation entry points may be restyled, but scanner engine/session/camera/decoder/ROI/lifecycle/recovery contracts are protected. Do not reopen SC-01–SC-05 as part of this UI architecture audit.

### 6.4 Settings and Update Center

**Confirmed owners:** SettingsHub, updateCenterStore and PWA update services.

Update Center statuses include available, deferred, downloading, staged and error. Download consent and activation consent are separate; activation can be blocked by camera lease, dirty work or transitions. Clearing a blocker must not imply automatic activation.

**Design consequence:** Settings is a preference/system workspace; Update Center is a release lifecycle surface, not a generic notification card. UI may change; controller, consent and safe activation contracts remain PWA-owned.

## 7. Shared UI subsystem audit

| Subsystem | Confirmed current role | Assessment and M0 disposition |
|---|---|---|
| Brand | Brand/BrandMark/BrandMotion used across App, Login and Home | Keep identity configuration; imagery/lockup can evolve. Do not animate every logo instance by default. |
| ExperienceBackground | Global scene background for Login/Home | Presentation-only; can be replaced by editorial imagery/neutral surfaces after asset and performance policy exists. |
| GlassSurface | Polymorphic wrapper with material/tone/data attributes | Not a semantic component system; does not own focus, keyboard or modal behavior. Keep only where useful; define semantic surfaces by behavior, not material name. |
| Motion | Provider/preferences, Boundary, Presence, Page, Sheet, Button, Card, tokens/presets/transitions | Keep reduced-motion preference ownership. Consolidate only after complete consumer tracing; wrappers must encode distinct reusable behavior. |
| Icons | Lucide + semantic department/module/library/navigation registries; Icon and MotionIcon | Keep semantic mapping. Static icon should be default; motion is opt-in. Do not replace package without visual/bundle evidence. |
| LiquidDock | Floating nav with keyboard navigation, central action and keyboard-aware hiding | Current navigation presentation is coupled to section model; not a future route contract. Replace presentation only after shell direction is proven. |
| Body scroll lock | useBodyScrollLock backed by shared reference-counted service | Canonical shared service. Do not introduce a second lock manager or independent overflow snapshot/restore. |
| AppErrorBoundary | Root and feature error fallback | Keep error isolation and PWA boot-failure semantics. |
| PwaUpdatePrompt | Global update presentation adapter | Keep PWA controller/lifecycle; presentation can evolve separately. |

### 7.1 Overlay architecture

Confirmed overlay owners include Home notices/calendar/library, SettingsHub, ScannerSettingsPanel, Stocktake and Stocktake Import. They use custom backdrops/dialog markup and shared body-scroll locking, but focus containment/topmost Escape behavior across arbitrary nested surfaces is not proven by current tests.

Existing architecture evidence explicitly says:
- use the shared body-scroll-lock service;
- do not add a second lock implementation;
- define Dialog/Sheet/Popover/nested confirmation contracts for Escape, focus entry/return/containment, backdrop, safe-area viewport and nested ownership;
- only add a shared overlay stack/focus manager if the contract and callsites demonstrate it is necessary.

**M0 disposition:** preserve current owners and lock service. Treat focus management and nested overlay behavior as an explicit verification gap before broad overlay redesign.

## 8. State, persistence and data ownership

| State category | Existing owner | Architectural rule |
|---|---|---|
| Employee session/last login | Auth stores + App | Auth identity is not Home UI state. |
| Home section/search/scroll | homeStateStore + HomeScreen | Persisted presentation preference; version if migrated. |
| Snapshot data | module data service/cache | UI must not invent freshness or live data. |
| Snapshot notices | snapshotNoticeRules + Home | Derived signals remain separate from presentation. |
| Scanner/camera session | shared scanner/camera services | Never duplicate lifecycle or camera ownership in a new shell. |
| Stocktake work | Stocktake feature stores/services | Keep feature-owned revisions, entries, history and explicit save/export. |
| Import work/history | Import feature stores/services/IndexedDB | Preserve parser and persistence semantics; no lossy generic table abstraction. |
| Update lifecycle | PWA update store/services | Separate download, staging, defer and activation consent. |
| Overlay lock | shared body scroll lock | Single canonical service with coordinated owners. |

**Assessment:** the future shell should own global composition and navigation presentation, not business state or persistence. Feature modules should remain independently testable and lazily loadable.

## 9. Code splitting and dependency boundaries

**Confirmed package baseline:** React 18.3.1, React DOM 18.3.1, TypeScript 5.7.2, Vite 6.4.5, Lucide React 0.468.0, Playwright 1.64.1; current dependencies also include zxing-wasm, jszip and pptxgenjs.

Confirmed lazy boundaries in Home include BarcodeScanner, StocktakeModule, StocktakeImportModule, SettingsHub and ScannerSettingsPanel. Existing bundle-boundary tests guard against eagerly importing these features and defer JSZip/PPTX generation dependencies until needed.

**Decision:**
- Keep React + TypeScript + Vite as the current baseline.
- Do not add a UI component framework, router or animation package as part of M0-A1.
- Preserve feature lazy loading and deferred export dependencies.
- Evaluate a router only if a real multi-workspace navigation requirement and safe history/session behavior are specified.
- Evaluate chart/image/motion libraries only against a concrete feature need and measured bundle/runtime cost.

## 10. Testing and verification architecture

**Confirmed current coverage:**
- Playwright browser smoke is focused on Login at desktop, tablet, mobile, compact mobile and short landscape.
- Existing Login tests assert overflow, keyboard focus, focus visuals, reduced-motion and power-conserve presentation.
- Existing source-contract tests guard design foundation, UI interaction immediacy and bundle boundaries.
- Existing docs state CI is not physical-device acceptance.

**Coverage gaps:**
- No equivalent browser visual/interaction suite was found for Home, Module Library, Stocktake, Import or Settings/Update Center in the inspected test inventory.
- Nested overlay focus containment/topmost Escape behavior is not proven.
- Responsive shell behavior is not proven because a separate route-based shell does not yet exist.
- Static source inspection does not prove paint/compositing cost, real image decode behavior, interaction latency or low-end-device frame stability.

**Required test model for future UI work:**
1. TypeScript + production/Pages build + source contract tests.
2. Playwright per changed feature: representative states, interactions, viewport overflow, keyboard/focus, reduced motion and screenshots.
3. Bundle boundary comparison for lazy features and image assets.
4. Physical-device acceptance for actual mobile OS/browser behavior; do not label browser evidence as device acceptance.

## 11. Findings and severity

| ID | Severity | Finding | Required action |
|---|---|---|---|
| A1-01 | High | HomeScreen combines multiple unrelated state domains and feature entry points. | Produce state/effect ownership map; extract only bounded owners with tests. |
| A1-02 | High | Shell/navigation is section-based; no route-based workspace shell exists. | Define shell/navigation contract before route migration; retain stable IDs. |
| A1-03 | High | CSS layering and selector ownership remain high-risk. | Complete selector/cascade/computed-style audit in M0-A2; no bulk deletion. |
| A1-04 | High | Overlay ownership is distributed; focus containment/nested Escape is not proven. | Define and test per-surface overlay contract; retain canonical body lock. |
| A1-05 | High | Feature workflows are large but must remain independently owned. | Decompose presentation inside Stocktake/Import without moving domain state. |
| A1-06 | Medium | Shared Glass/Motion wrappers are partly visual adapters and inconsistently used. | Trace all consumers before consolidating; semantic contracts before new abstractions. |
| A1-07 | Medium | Module registry and route semantics could be accidentally conflated. | Keep registry as single truth; do not create parallel IDs/readiness. |
| A1-08 | Medium | Browser tests cover Login but not all operational surfaces. | Add feature-level Playwright suites as prototypes/implementation slices are accepted. |
| A1-09 | Medium | No approved Vietnamese font or shipped retail photography baseline. | Resolve in M0-A2/A5 with glyph, licensing, offline and payload evidence. |
| A1-10 | Medium | Dependency additions could inflate bundle and duplicate existing foundations. | Technology decision record required before adopting new packages. |

## 12. Recommended target responsibility model

This is a responsibility model, not a mandate to create every directory or component immediately.

- **App/root:** session journey, boot health, logout orchestration, PWA blockers and global providers.
- **Workspace shell:** responsive navigation presentation, global workspace frame and feature entry points; no business persistence.
- **Home feature:** operational overview and its truthful snapshot-derived signals.
- **Module Library feature:** discovery/search/grouping driven by the canonical registry.
- **Feature workspaces:** Stocktake, Import, Settings/Update Center and Scanner presentation own their task-specific UI state and cleanup.
- **Design system:** tokens, typography, semantic controls/surfaces, icon semantics and motion preferences/primitives.
- **Shared platform services:** session, snapshot/cache, camera/scanner, body-scroll lock, PWA lifecycle and persistence services retain their current authoritative owners.

Shared components should be created only when multiple consumers have the same semantic behavior, state contract, accessibility behavior and responsive requirements—not merely similar appearance.

## 13. M0-A1 completion checklist

- [x] Inspect root entry, auth journey, Home composition and navigation source.
- [x] Map Home state/interaction responsibility clusters.
- [x] Inspect module registry and readiness truth.
- [x] Inspect Stocktake, Import, Settings/Update Center and protected feature boundaries.
- [x] Inspect Brand, Glass, Motion, Icons, LiquidDock, overlay and body-lock ownership.
- [x] Inspect persistence/state ownership and lazy-loading/dependency boundaries.
- [x] Record current test coverage and explicit verification gaps.
- [x] Define findings, severity and target responsibility model.
- [ ] Runtime/computed-style and responsive screenshot review (M0-A2/runtime evidence).
- [ ] Complete transitive consumer graph and selector-level CSS ownership (M0-A2).
- [ ] Browser/physical-device profiling and visual acceptance (later prototype/QA gates).

**M0-A1 result:** source-level architecture audit is complete for the inspected ownership boundaries. The remaining unchecked items are deliberately assigned to CSS/runtime/performance verification; they are not silently claimed as complete.

## 14. Next gate

Proceed to **M0-A2 — Design System & CSS Audit**:
1. Inventory actual imported CSS files and their byte sizes from the current source.
2. Trace duplicate selector families, token declarations and import order.
3. Determine ownership and computed winners at representative viewports/states using the running application.
4. Audit typography and Vietnamese font candidates separately from palette decisions.
5. Define image asset licensing, optimization, responsive crop and offline fallback policy.
6. Produce a keep/consolidate/replace/retire matrix. Do not delete CSS until runtime and consumer evidence supports it.

No application source, dependency, business logic, persistence, module ID, scanner engine, PWA lifecycle, deployment or production state is changed by this audit.
