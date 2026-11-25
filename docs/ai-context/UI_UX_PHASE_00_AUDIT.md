# UI/UX Phase 00 — Repository Audit and Decision Closure

**Status:** Phase 00 source/documentation reconciliation in progress. This record is the current audit baseline; it does not authorize application-source migration.
**Audited repository:** `banjk124-hub/retailos-home`
**Audited ref:** `main` at `588d8f937525acb29ebb7b0de97a9b1dcf61c0c7` (merge commit for PR #159)
**Audit date:** 2026-11-25
**Change scope:** Documentation/architecture governance plus retirement of one confirmed unimported CSS file and three unused Motion public APIs. No bundled runtime style, active component behavior, dependency, business logic, Scanner Engine, persistence, PWA lifecycle or deployment behavior is intentionally changed.

## 1. Executive result

The existing 00B–00H material provides a substantial design and migration blueprint, but Phase 00 was not operationally closed. Several current-state documents still referenced an obsolete documentation PR, the old `main` baseline, and Figma as an active M0-A workstream. Source inspection also confirms that the proposed App Shell, route adapter, formal design-system foundation and shared focus/overlay stack are not implemented as described by the target architecture.

**Decision:** treat the current documents as architecture proposals and source-audit evidence, not proof that the target UI has shipped. Complete documentation reconciliation and source ownership/consumer tracing before authorizing the first runtime slice.

## 2. Verified repository baseline

- PR #159, `docs(ui): define evolving design-system architecture`, is merged. Merge commit: `588d8f937525acb29ebb7b0de97a9b1dcf61c0c7`.
- PR #159 head: `27966f571dd25ec15e6815ce034f6799c8ad47f8`; PR-triggered RetailOS CI #1465 completed successfully.
- After merge, RetailOS CI #1466 and GitHub Pages deployment #159 both completed successfully on `588d8f937525acb29ebb7b0de97a9b1dcf61c0c7`. These do not establish physical-device acceptance.
- The current default branch tree resolves at the merge commit above; recursive tree response was not truncated (260 files).
- PR #157 remains open and draft, targets an older base (`2003ea24966755d0ad4e0298b34422b053267e77`) and contains only a legacy Login CSS adjustment. It is not an approved redesign slice and is not a dependency of Phase 00. Do not merge it by default; re-evaluate or close it when its owner confirms it is superseded.
- Phase 00 audit branch head `19ad166ed17fe82e3dfbbd2ef833ca64b67ced8c` passed RetailOS CI #1486, including local-equivalent preflight, TypeScript/production and Pages builds, and bundle comparison. This is CI evidence, not browser/device acceptance.
- No production deployment or production promotion is authorized by this audit.

## 3. Source-grounded AS-IS findings

### 3.1 Application composition and navigation

- `src/main.tsx` mounts `App` inside React StrictMode, error boundary and Motion providers; `PwaUpdatePrompt` is mounted alongside the app.
- `src/App.tsx` owns the current authentication journey (`login` → `identity` → `home`), session restoration, logout, boot-health signaling and PWA transition blocker registration.
- Home is lazy-loaded from `src/App.tsx`. `HomeScreen` currently owns section navigation IDs `home`, `modules`, `activity`, `settings`, local UI state and feature-surface entry points.
- Current source does not establish a route-based multi-workspace application or a typed browser-history adapter. The route/history contract in 00E/00H remains a target decision, not an implemented capability.
- Settings, notification details, calendar, module group and operational workflows currently use Home-owned state and overlay/sheet entry points. Do not describe them as independently routed destinations until implemented.

### 3.2 Feature and platform ownership

- Auth/session logic is feature-owned under `src/features/auth`; keep employee lookup, session persistence and identity handoff outside presentation components.
- Home/module metadata and readiness are owned by `src/features/home/moduleRegistry.ts`; preserve stable module IDs and readiness truth.
- Stocktake and Stocktake Import have feature-owned components/services and separate persistence/workflow contracts. They are not interchangeable generic data-grid use cases.
- Scanner presentation entry points are feature-owned, while camera/session/decoder/recovery behavior remains protected by `SCANNER_ENGINE.md`. Do not reopen SC-01–SC-05 as part of UI redesign.
- PWA update presentation is in `src/shared/pwa/PwaUpdatePrompt.tsx`; staging, activation, blockers, service worker and rollback remain governed by `PWA_RUNTIME_RELEASE.md`.

### 3.3 Existing presentation systems and style ownership

- Shared source currently includes Brand, Glass, Motion, Icon, LiquidDock, adaptive appearance, body-scroll-lock and PWA presentation systems.
- `src/main.tsx` imports the global base/responsive/theme/interaction/mobile/performance/adaptive/native styles and shared Brand/Motion/Glass/Dock styles.
- `HomeScreen.tsx` imports five Home stylesheet generations: `home.css`, `home-ux.css`, `home-engine.css`, `home-redesign.css`, and `home-architecture.css`. This confirms a cascade/ownership hotspot, not that any particular selector is dead.
- The audited `main` baseline contained 16 files under `src/styles/`; the working audit branch removes the unimported `home-phase2.css`, leaving 15. The branch tree contains 24 CSS files overall. File count, size, age or naming is not proof of unused CSS.
- The current shared components are candidates for redesign, replacement or retirement; none is automatically the target design system merely because it exists.

### 3.4 Partial shared-consumer trace

A focused GitHub code-search pass confirmed these direct consumers on the audited source tree:

| Shared API | Confirmed source consumers | Audit implication |
|---|---|---|
| `GlassSurface` | `MotionButton`, `LiquidDock`, `LoginDock`, `LoginForm`, `ModuleLibraryEngine`, `HomeScreen` | Not safe to retire based on a single-screen review; trace wrapper composition and CSS dependencies. |
| `MotionCard` | `ModuleLibraryEngine` | Current direct usage is narrow; still inspect wrapper semantics and CSS before removal. |
| `MotionPage` | `LoginExperience` | Login transition dependency must be considered in a Login slice. |
| `MotionSheet` | `HomeScreen` | Home owns the module-library sheet entry; preserve its close/lock lifecycle. |
| `BrandMotion` | `App`, `LoginHero` | Identity and Login have separate motion callsites. |
| `LiquidDock` | `HomeScreen` | Current section navigation is Home-owned, not a global route shell. |
| `useBodyScrollLock` | `HomeScreen`, `SettingsHub`, `ScannerSettingsPanel`, `StocktakeModule`, `StocktakeImportModule` | Shared lock is cross-feature infrastructure; do not fork it during overlay redesign. |

The public Motion barrel also exposed `MOTION_TOKENS`, `resolveMotionPhase` and `attachMotionPhaseVariables`, but repository-wide source search found no consumer beyond their own declarations/barrel exports. These unused APIs were removed on the Phase 00 branch; the active `MotionPhase`/`MotionState` types, presets, config, wrappers and `getMotionOrigin` remain.

This is a targeted direct-import map, not a complete transitive runtime consumer graph. It does not cover every export, dynamic class, portal, CSS selector, runtime branch or indirect composition. The 00F full consumer/cascade audit remains open.

### 3.5 CSS import graph and selector-level findings

The source import graph was checked at the audited baseline. Import ownership and order are:

| Import owner | Stylesheets in source order | Result |
|---|---|---|
| `src/main.tsx` | `base.css`, `responsive.css`, `theme.css`, `interactions.css`, `mobile-tuning.css`, `performance.css`, `adaptive-appearance.css`, `native-experience.css`, then Brand, Motion, Glass tokens/materials and LiquidDock CSS | Global presentation is layered through a fixed entrypoint; global selectors and tokens are cross-feature. |
| `LoginExperience.tsx` | `login-experience.css` | Login-owned presentation. |
| `HomeScreen.tsx` | `home.css` → `home-ux.css` → `home-engine.css` → `home-redesign.css` → `home-architecture.css` | Five active Home generations are imported in this order. |
| `SettingsHub.tsx`, `ScannerSettingsPanel.tsx` | `scanner-settings.css` | Shared settings presentation; not Scanner Engine. |
| `BarcodeScanner.tsx`, `StocktakeScanner.tsx` | `scanner-transition.css` | Shared scanner presentation transition stylesheet; engine remains protected. |
| `StocktakeModule.tsx` | `stocktake.css` | Feature-owned. |
| `StocktakeImportModule.tsx` | `stocktake-import.css` | Feature-owned. |
| `PwaUpdatePrompt.tsx` | `pwa-update-prompt.css` | PWA release presentation; lifecycle contract protected. |

**Confirmed orphan retired:** `src/styles/home-phase2.css` existed at the parent `main` baseline but had no import/reference in application source; its only code-search hit was documentation. It was removed on this branch. The branch tree now has 24 CSS files, all accounted for in the import graph; no unreferenced CSS file remains.

**Confirmed cascade hotspot:** a static selector comparison across the five active Home stylesheets found 39 exact selector strings repeated across more than one file. Examples include `.app-shell`, `.topbar`, `.content-wrap`, `.section-heading`, `.search-field`, `.home-spotlight`, `.spotlight-main-content`, `.spotlight-notifications`, `.library-engine` and `.topbar-dock`. These overlaps are not automatically defects: later declarations may be intentional responsive/state overrides. They do mean ownership and source order must be documented before consolidation.

**Legacy selector candidates:** repository code search returned only stylesheet matches (no current JSX/TSX consumer) for selectors such as `.sidebar`, `.hero-card`, `.metrics-grid`, `.module-card`, `.module-grid`, `.login-screen`, `.login-showcase`, `.activity-row` and `.attention-item`. This is evidence of likely legacy CSS, not permission to delete whole blocks: global tokens, responsive fallbacks, selectors used by non-TSX markup and runtime-composed classes still require verification.

**Limits of this pass:** GitHub code search and static selector comparison do not compute browser styles, enumerate every dynamic class string, evaluate CSS cascade layers/specificity under all media states, or inspect portals and runtime-generated DOM. No claim of full computed-style proof or visual regression coverage is made. Broad removal of `theme.css`, `responsive.css` or `mobile-tuning.css` remains blocked.

### 3.6 Overlay/focus ownership findings

- `UI_OVERLAY_ARCHITECTURE.md` confirms the shared layer owns only reference-counted body-scroll locking; content, close behavior and feature state remain feature-owned.
- Home has separate Escape/focus effects for Calendar, Notice Detail and Module Library; focus is moved on open and returned to the trigger/fallback on close for these surfaces.
- SettingsHub and ScannerSettingsPanel move focus to their close/back controls and own Escape/backdrop handling locally.
- The current implementation uses custom `div` backdrops with `role="dialog"`/`aria-modal="true"` rather than a shared focus-trap manager. The overlay specification explicitly states focus containment is not proven.
- Existing automated tests prove body-lock reference counting and selected viewport/layout contracts, not Tab/Shift+Tab containment, topmost Escape behavior across arbitrary nested surfaces or screen-reader focus order.

**Recommendation:** keep `bodyScrollLock.js` as the only shared scroll-lock coordinator. Prefer native `<dialog>` semantics for standard modal dialogs where compatibility and lifecycle tests pass. Keep Scanner, Stocktake and Import as feature-owned specialized surfaces. Do not create a generic overlay stack/focus manager by default; first prove a nested case that cannot be safely handled by native dialog semantics plus the feature owner's explicit close/back contract. Browser and physical-device focus/scroll acceptance remains mandatory.

### 3.7 Validation infrastructure

- `scripts/preflight.mjs` runs broad scanner, Home, overlay, interaction, Stocktake Import, production build, GitHub Pages build, bundle-boundary and PWA checks.
- Existing focused tests cover body-scroll-lock and overlay viewport/layout contracts. The inspected preflight does not establish a dedicated browser-history/navigation regression suite or a general focus-trap/overlay-stack suite.
- `scripts/test-overlay-layout-contract.mjs` asserts selected CSS selectors and Home scanner lock integration; it is not a full computed-style, selector-usage or visual regression audit.
- Automated checks do not replace desktop/tablet/mobile browser review, accessibility evaluation or physical-device acceptance.

## 4. Architecture decisions closed for this redesign

1. **Scope:** product-wide presentation and interaction redesign; not a backend, data, auth, Scanner Engine or PWA runtime rewrite.
2. **Reference roles:** supplied image = structural/compositional reference; supplied video = motion/feedback/state reference; RetailOS remains authority for brand, business semantics, data truth and architecture.
3. **Implementation workflow:** source-first in the existing React/Vite repository. Figma is optional reference material, not a prerequisite, deliverable dependency or acceptance gate.
4. **Design-system model:** open and evolving three-layer model — Core Foundation, Shared Design System, Feature Experience. The component inventory is not a closed whitelist.
5. **Feature freedom:** purpose-built layouts/components are valid when the operational task requires them. Reuse is based on semantic responsibility and behavior, not visual resemblance.
6. **Consistency:** recognizable RetailOS identity, semantic state, interaction quality, accessibility, responsive behavior and performance; not identical layouts or controls.
7. **Motion:** presentation-only. It cannot commit business state, duplicate data work, control camera lifecycle or allow stale async results to overwrite current state. Reduced-motion and low-performance fallbacks preserve function.
8. **Protected domains:** auth/session, module identity/readiness, snapshot/cache, Scanner Engine, Stocktake/Import persistence/output, shared body-scroll-lock and PWA release safety remain owned by their current domains.
9. **Delivery:** bounded, independently reviewable source slices; no broad rewrite, merge or deployment without the corresponding owner authorization and acceptance evidence.
10. **Scanner:** runtime stabilization is closed and issue-driven only. Scanner presentation may be included as a separately bounded surface; engine internals are excluded.

## 5. Decisions still open — do not silently treat proposals as accepted

| ID | Decision / evidence needed | Current disposition | Gate |
|---|---|---|---|
| P00-01 | Route identity, History API adapter, back/forward, reload, deep links and unknown paths | 00E defines a typed History API adapter and stable workspace paths; same-URL transient history entries are now specified for Back-dismissable overlays. Owner acceptance remains open. | Before Shell implementation |
| P00-02 | Desktop navigation form and workspace composition | 00E recommends persistent collapsible rail/sidebar on desktop, adaptive rail/drawer on tablet and compact bottom navigation on mobile. Exact widths/composition require visual validation and owner acceptance. | Before Shell implementation |
| P00-03 | Typography and Vietnamese glyph/weight/load/offline validation | No final font decision | Before foundation implementation |
| P00-04 | Final brand palette, semantic status contrast, material and photography direction | Principles accepted; exact values/asset direction remain open | Before foundation implementation |
| P00-05 | Shared focus manager/overlay stack | Shared reference-counted body lock is implemented. Focus entry/return and Escape handling are feature-local; no focus containment or shared stack exists. Recommend native `dialog` for standard modal surfaces and feature-owned custom surfaces for scanner/data workspaces; do not add a generic overlay manager unless real nested-stack cases cannot be handled by these contracts. | Validate native dialog compatibility and nested feature cases before Shell implementation |
| P00-06 | Full selector-level CSS usage/computed-style audit | Not completed | Mandatory before broad CSS deletion/consolidation |
| P00-07 | Complete shared component/export consumer graph, including dynamic class/portal use | Partial inventory only | Mandatory before retiring shared systems |
| P00-08 | Exact desktop/tablet/iOS/Android/low-end reference device matrix | A repeatable viewport baseline is now documented in 00H (320–1920px widths); physical reference device models and OS/browser versions remain unconfirmed. | Before device acceptance |
| P00-09 | First source slice ordering and exact scope | Recommend foundation validation → shell skeleton, but dependent on P00-01–04 | Owner authorization required |
| P00-10 | Activity event source/schema/retention/permissions | No verified event source | Keep Activity gated |
| P00-11 | Open PR #157 disposition | Stale draft on old base; not a required dependency | Owner decision; do not merge by default |

## 6. Migration boundary and order

Recommended order after the open gates are resolved:

1. **Foundation validation:** confirm visual language, semantic tokens, typography, contrast, materials, motion and CSS ownership without creating a parallel token system.
2. **Shell/navigation skeleton:** only after route/history, destination identity, navigation form and unsaved-work behavior are accepted.
3. **Login presentation:** preserve local auth, employee lookup, session restore and identity handoff.
4. **Home Overview and Module Library:** preserve snapshot/cache behavior, module registry IDs/readiness and truthful workflow availability.
5. **Settings/Update Center:** presentation adapter only; preserve consent, staging, blocker, activation, boot-health and rollback.
6. **Stocktake:** independent feature-owned workflow migration.
7. **Stocktake Import:** separate migration preserving parser, conflicts, decimal precision, history and TXT/ZIP output.
8. **Scanner presentation:** optional isolated slice; engine and camera lifecycle unchanged.
9. **Notifications/Search:** only real notice/search sources and supported scope.
10. **Consolidation and release acceptance:** only after consumers migrate; run regression, responsive, accessibility, performance, offline/PWA and device checks.

Each slice must name exact files/callsites, owners, protected contracts, tests, visual evidence, bundle impact and rollback.

## 7. Phase 00 exit checklist

- [x] PR #159 merge and current main baseline verified.
- [x] Canonical design-system evolution principle verified in the merged docs.
- [x] Current app entry, auth journey, Home navigation, feature ownership and shared presentation systems inspected.
- [x] Existing preflight and overlay/body-lock test coverage inspected.
- [x] Product-wide scope, reference roles, source-first workflow, feature freedom and protected boundaries consolidated.
- [x] Stale PR/baseline/Figma status conflicts identified.
- [x] Update PROJECT_CONTEXT, IMPLEMENTATION_STATUS and ROADMAP to the verified current state.
- [x] Reconcile stale PR #156 / Figma / old-baseline statements across the active plan and 00H blueprint; historical audit baselines are explicitly labelled as original evidence.
- [x] Map direct shared component imports/exports and account for all CSS files in the static import graph.
- [x] Retire the unimported `home-phase2.css` orphan and three unconsumed Motion public APIs.
- [x] Identify repeated Home selectors and legacy CSS-only selector candidates.
- [ ] Complete selector-to-element matching and browser computed-style/cascade validation across responsive and state combinations; broad legacy CSS retirement remains blocked.
- [x] Refine the 00E browser-history proposal to distinguish workspace routes from same-URL transient overlay entries and non-restorable camera/permission state.
- [ ] Owner explicitly accepts remaining P00 decisions and authorizes the first source slice.
- [ ] Confirm device matrix and visual acceptance method.

**Phase 00 status:** architecture principles are closed; repository/documentation reconciliation and source-level cleanup audits remain in progress. No Phase 01/02 implementation is authorized until the required owner decisions and scope gates are met.
