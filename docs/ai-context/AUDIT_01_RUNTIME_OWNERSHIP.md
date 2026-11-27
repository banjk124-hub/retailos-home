# AUDIT-01 — Runtime & Ownership Baseline

**Status:** Static source audit completed; runtime measurements remain open  
**Audited ref:** `main`  
**Audited commit:** `e58bce634b9ff67e95250d36c8653593680463e9`  
**Audit branch:** `audit/audit-01-runtime-ownership`  
**Scope:** Application boot path, module loading boundaries, CSS ownership/import graph, shared/feature dependency direction, runtime-sensitive orchestration points.

## 1. Executive result

The application already has meaningful boundaries: feature roots for Auth, Home, Scanner, Stocktake and Stocktake Import; a platform scanner runtime; shared camera/session services; lazy-loaded Home modules; and a centralized PWA update-safety contract.

The main debt is not a lack of folders or components. It is that **source ownership and runtime ownership do not yet align cleanly**:

1. Root entrypoint imports a broad set of global CSS and shared presentation CSS before the user enters a feature.
2. Home is lazy-loaded as a route-like feature, but its module is still a large orchestration surface with cross-feature launch state and lifecycle coordination.
3. Global CSS and Home CSS remain broad, order-sensitive layers. File size is a hotspot indicator, not proof of dead code or performance impact.
4. Some shared modules depend on feature-owned types, which reverses the intended dependency direction.
5. The current static source view cannot establish emitted CSS/JS bytes, actual browser render cost, or computed-style winners. These require a production build and browser/device measurements.

No business logic, persistence schema, scanner lifecycle, camera acquisition, PWA update semantics or deployed artifacts were changed in this audit.

## 2. Verified baseline

| Item | Observed |
|---|---:|
| Main commit | `e58bce634b9ff67e95250d36c8653593680463e9` |
| Tracked files in recursive tree | 295 |
| Tracked CSS files | 29 |
| Tracked CSS source bytes | 338,808 |
| `src/styles/` CSS | 18 files / 221,413 bytes |
| `src/shared/` CSS | 6 files / 45,980 bytes |
| `src/features/` CSS | 5 files / 71,415 bytes |
| Direct production dependencies | 6 |
| Build scripts | `build`, `build:pages`, `analyze:bundle` |

These are repository source-tree measurements, not compressed transfer size, parsed CSS size, or runtime memory.

## 3. Runtime entry and module-loading map

### 3.1 Root boot path

`src/main.tsx` currently imports, in order:

- `App`
- Global styles: `base.css`, `responsive.css`, `theme.css`, `interactions.css`, `mobile-tuning.css`, `performance.css`, `adaptive-appearance.css`, `native-experience.css`
- Shared presentation styles: Brand, Motion and LiquidDock
- Motion providers, error boundary and `PwaUpdatePrompt`

`src/App.tsx` statically imports Login Experience, auth/session services, data cache cleanup, department config, Brand/Motion/Icon services, camera session release and PWA update safety. It lazy-loads only `HomeScreen`.

**Finding R01 — Root presentation is broad (HIGH confidence).** Eight global stylesheets plus three shared presentation styles are imported at the root. They are therefore part of the root CSS dependency graph regardless of whether a user is still at Login or has entered Home. Whether Vite emits them as one CSS asset or multiple assets must be measured from `dist/.vite/manifest.json` and network traces.

**Finding R02 — PWA update UI is root-mounted and eagerly imported (MEDIUM confidence).** `PwaUpdatePrompt` is imported and rendered alongside `App` in `main.tsx`. Its controller is substantial and remains active at the application root. This may be correct for update safety and cross-feature blockers; do not move it solely to reduce the initial bundle. First measure its emitted chunk and evaluate whether controller/runtime and visible presentation can be separated without changing lifecycle behavior.

### 3.2 Lazy feature boundaries

`App.tsx` lazy-loads `HomeScreen`. Inside `HomeScreen`, the following roots are lazy-loaded:

- BarcodeScanner
- StocktakeModule
- StocktakeImportModule
- SettingsHub
- ScannerSettingsPanel

The feature modules use dynamic imports for heavier export dependencies where applicable: Stocktake Import dynamically imports JSZip; export formats dynamically import PptxGenJS.

**Finding R03 — Feature code splitting exists and must be preserved (HIGH confidence).** The current boundaries are meaningful. Any restructuring must not accidentally make scanner, stocktake, import/export or settings eagerly load on the Login/initial Home path.

**Open measurement:** Confirm actual JS and CSS chunk mapping, initial transfer, per-feature transfer, and whether any lazy feature stylesheet is pulled into the initial CSS graph.

## 4. Ownership and dependency findings

### 4.1 Home orchestration

`HomeScreen.tsx` is 43,775 source bytes. It owns or coordinates:

- Home navigation state and selection
- Calendar and notification/notice overlays
- Snapshot notices and push-notification setup
- Barcode lookup and scanner entry
- Camera lease handoff and scanner settings
- Settings, Stocktake and Stocktake Import launch/close state
- Body scroll lock aggregation and feedback
- Home composition and feature-root mounting

Existing extracted units include Home hooks, `homeStateStore`, `snapshotNoticeRules`, `HomeModuleLibrarySection`, `ModuleLibraryEngine` and `ShellNavigation`.

**Finding O01 — Home is a cross-feature composition/orchestration hotspot (HIGH confidence).** The size alone is not the defect. The architectural risk is that Home owns both its own experience and several feature entry/lifecycle concerns. Future work should separate feature launch contracts and shell-level overlay policy from Home-only presentation, while keeping Home as the owner of Home-specific navigation and composition.

### 4.2 Shared-to-feature dependency inversion

Static import search found:

- `src/shared/config/departments.ts` imports the `DepartmentId` type from `src/features/auth/types.ts`.
- `src/shared/icons/icon.registry.ts` imports `ModuleLibraryId` and `RetailModuleId` types from `src/features/home/moduleRegistry.ts`.

**Finding O02 — Shared foundation references feature-owned types (HIGH confidence).** This is a direct dependency-direction violation: shared contracts should not require Auth or Home feature implementation types. The likely correction is to place stable cross-feature identity types/contracts in a neutral domain/application-contract location, or have feature-owned adapters map into shared primitives. Do not move types until all consumers and public contracts are traced.

### 4.3 Scanner platform boundary

Scanner React integration lives under `src/features/scanner`; the lower-level scanner session, decoder, camera health, geometry, image processing and lifecycle code lives under `src/platform/scanner`. Both platform scanner and features use `src/shared/services/cameraSession.ts`.

**Finding O03 — Scanner has a clearer platform/feature split than most UI areas (HIGH confidence).** Preserve this boundary. Scanner UI should own interaction and presentation; platform scanner should own camera/decoder/session mechanics. AUDIT-01 does not authorize changing scanner internals.

### 4.4 Shared navigation

Home imports `ShellNavigation`, which adapts shared destination identity into desktop and touch presentations. `LiquidDock` is used by `ShellNavigation`; it is not evidence of a second competing navigation system. The root imports `LiquidDock.css`, while `ShellNavigation.css` is imported by its component.

**Finding O04 — Navigation component hierarchy is intentional but naming is implementation-biased (MEDIUM confidence).** The shared contract is destination identity + active state + selection callback. Visual variants remain a shell presentation concern. Do not remove LiquidDock based on name or CSS location.

## 5. CSS ownership and cascade baseline

### 5.1 Root and Home CSS

Root imports eight global stylesheets and three shared presentation styles. Home imports four ordered stylesheets:

1. `home.css`
2. `home-ux.css`
3. `home-engine.css`
4. `home-redesign.css`

The recursive tree contains 29 CSS files / 338,808 source bytes. `mobile-tuning.css` is 80,308 bytes, the largest global stylesheet. The Home stylesheet group totals 64,989 bytes.

**Finding C01 — Global override layer is the primary CSS ownership hotspot (HIGH confidence).** `mobile-tuning.css` is root-imported and large. It contains broad element selectors and cross-surface responsive rules. It is not safe to delete or rewrite based on size or duplicate selector text. Each rule needs consumer mapping and computed-style proof.

**Finding C02 — Home has four ordered presentation generations (HIGH confidence).** Four files are imported in sequence by Home. This creates order-sensitive cascade ownership. Before consolidating, classify rules by surface/feature, determine the final computed owner across viewport and state, and prove no visual/interaction regressions.

**Finding C03 — Global and feature-owned CSS need separate treatment (HIGH confidence).** `stocktake-import.css` is 50,965 bytes but is imported by its own lazy feature root. Its size does not make it global legacy. Keep its ownership feature-local unless evidence shows cross-feature leakage or internal duplication.

### 5.2 Token authority

`theme.css` contains multiple generations of semantic names and compatibility aliases in the same root token declaration (brand aliases, older `--retail-*`/generic names, and newer `--color-*` semantic roles). Motion tokens are separately owned by the Motion foundation, while `mobile-tuning.css` defines legacy aliases that point back to Motion tokens.

**Finding C04 — Token authority is only partially normalized (HIGH confidence).** A canonical semantic layer exists, but compatibility aliases remain. A future design-system reset should define one authoritative token contract and a documented migration/compatibility policy. Do not change actual values or select a new aesthetic in AUDIT-01.

## 6. Performance risks vs measured performance

| Area | Static evidence | What is not yet proven |
|---|---|---|
| Initial CSS | 11 root CSS imports (8 global + Brand/Motion/LiquidDock) | Actual emitted CSS files, compressed bytes, render-blocking behavior |
| Initial JS | App/Login and PWA prompt statically imported; Home lazy | Actual initial JS chunk size, PWA prompt chunk weight |
| Feature chunks | Scanner/Stocktake/Import/Settings lazy roots | Actual feature chunk and CSS payload sizes |
| React rendering | Large Home state surface; feature roots memoized | Commit frequency, wasted renders, long tasks |
| CSS cascade | Large mobile override + four Home generations | Computed winners and layout/paint cost by viewport/state |
| Images/fonts | No claim made in this pass | Asset transfer, decode, font loading and LCP impact |

**No performance score or runtime improvement claim is made.** These require repeatable measurements on a production build and representative devices.

## 7. Audit gaps and required next measurements

AUDIT-01 static mapping is complete enough to identify architecture hotspots, but runtime proof remains open:

1. Run the exact `build:pages` production build and capture Vite manifest.
2. Record initial JS/CSS and per-feature chunk sizes (raw + gzip/Brotli where available).
3. Use browser traces for Login → Home → Scanner → Stocktake → Import → Settings.
4. Capture CSS computed-style winners for representative desktop, mobile and narrow/low-height states.
5. Measure React commits, long tasks, layout/paint and memory during those journeys.
6. Trace all CSS import edges and feature-to-feature imports; verify no unrecorded cross-feature coupling.
7. Trace PWA update controller initialization and its required global blockers before proposing any lazy boundary.

## 8. Recommended follow-on order

1. **AUDIT-02 — Shared vs Feature-owned contracts:** resolve dependency inversion and define ownership contracts before moving code.
2. **AUDIT-03 — CSS & Design foundation:** rule ownership, token authority and cascade reduction with computed-style evidence.
3. **AUDIT-04 — Component & Interaction:** isolate shell/overlay/feature lifecycle responsibilities without introducing a generic framework unless multiple real consumers justify it.
4. **AUDIT-05 — Performance:** optimize only after baseline metrics and per-route cost are available.
5. **AUDIT-06 — Closure:** regression evidence, documentation reconciliation and acceptance.

## 9. Guardrails

- Do not change business rules, storage formats, scanner/camera lifecycle, PWA update protocol or ETL/data contracts in this UI architecture audit.
- Do not turn visual similarity into a reason to share a component.
- Do not create a generic overlay/component framework without multiple proven consumers and a clear contract.
- Do not delete CSS by size or duplicate selector count alone.
- Do not claim runtime improvement from source byte reduction.
- Do not select or resurrect a global visual direction. The design language and imagery direction remain open for owner decision.
- No merge or deploy is included in this phase.
