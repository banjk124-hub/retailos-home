# UI-03 — CSS Consolidation

**Status:** Complete. UI-03 merged to main in PR #180; final documentation HEAD passed CI run #1817.
**Branch:** `refactor/ui-03-css-consolidation`
**Baseline:** `main` at UI-02 merge `4a98d3cd304f095dc6057499b69e5bf19f166948`
**Scope:** reduce CSS duplication and obsolete rules while preserving rendered output, responsive behavior, accessibility, feature ownership and lazy-loading boundaries.

## 1. Objective and non-goals

UI-03 is a source-maintainability migration, not a visual redesign.

Objectives:
- Establish one accountable owner for each CSS concern and stylesheet import.
- Identify exact duplicate declarations and selectors with verified consumer status.
- Remove only rules proven unused across static and dynamic class construction.
- Reduce cascade coupling incrementally, with a browser baseline for any change that can affect computed styles.
- Preserve feature CSS loading boundaries and the runtime contracts owned by Home, Login, Scanner, Stocktake, Import, Navigation, Surface, Motion and PWA.

Non-goals:
- No new visual language, palette, typography, component library or material system.
- No blanket rewrite or deletion of `mobile-tuning.css`.
- No merging all stylesheets into one global bundle.
- No CSS framework, preprocessor or dependency addition.
- No scanner engine, business logic, component state, persistence or PWA lifecycle changes.

## 2. Refreshed source inventory

Baseline at UI-02 merge: **25 CSS files, 346,206 source bytes**. Current UI-03 branch after the first migration slices: **24 CSS files, 338,204 source bytes** (8,002 bytes / 2.31% lower). This is raw tracked source size, not gzip/Brotli transfer, CSSOM size or render cost. The reduction includes retired selectors; Home stylesheet consolidation itself preserves declarations and order.

| Owner / stylesheet | Bytes | Initial disposition |
|---|---:|---|
| `src/styles/mobile-tuning.css` | 83,462 | Global legacy/override hotspot; inspect by concern and consumer |
| `src/features/stocktake-import/components/stocktake-import.css` | 50,965 | Keep feature-owned; inspect internally only with component evidence |
| `src/styles/login-experience.css` | 24,956 | Keep Login-owned |
| `src/styles/home.css` | 21,544 | Home cascade; ownership consolidation candidate |
| `src/styles/home-ux.css` | 21,161 | Home cascade; ownership consolidation candidate |
| `src/styles/theme.css` | 15,061 | Semantic token authority; preserve compatibility aliases until consumers migrate |
| `src/styles/responsive.css` | 12,060 | Global responsive rules; trace overlap before moving |
| `src/styles/home-engine.css` | 12,013 | Home cascade; ownership consolidation candidate |
| `src/features/stocktake/components/stocktake.css` | 11,822 | Keep Stocktake-owned |
| `src/shared/navigation/LiquidDock.css` | 11,676 | Keep dock presentation-owned |
| `src/shared/motion/motion.css` | 11,112 | Keep Motion preference and phase contracts |
| `src/shared/pwa/pwa-update-prompt.css` | 10,616 | Keep PWA presentation-owned |
| `src/styles/home-redesign.css` | 9,663 | Home cascade; ownership consolidation candidate |
| `src/features/scanner/scanner-transition.css` | 8,467 | Keep scanner presentation-only; engine boundary protected |
| `src/styles/native-experience.css` | 7,885 | Trace overlap with shared interaction/motion owners |
| `src/styles/scanner-settings.css` | 6,975 | Keep Settings/Scanner preferences-owned |
| `src/shared/brand/brand.css` | 6,645 | Keep Brand identity-owned |
| `src/styles/adaptive-appearance.css` | 4,402 | Preserve power/reduced-motion behavior; inspect overlap |
| `src/shared/navigation/ShellNavigation.css` | 3,591 | Keep ShellNavigation-owned |
| `src/styles/home-architecture.css` | 3,239 | Baseline-only file; its rules are now appended to `home-redesign.css` at the same cascade position and the separate import/file is retired |
| `src/styles/login-compact-landscape.css` | 2,830 | Keep Login-owned; imported by LoginExperience |
| `src/shared/components/surface/surface.css` | 2,340 | Keep semantic Surface primitive-owned |
| `src/styles/interactions.css` | 1,600 | Trace common interaction ownership |
| `src/styles/base.css` | 1,107 | Global reset/base foundation |
| `src/styles/performance.css` | 1,014 | Preserve device/performance policy; inspect overlap |

## 3. Current import ownership

The 24 current tracked stylesheets are accounted for by the following source import boundaries:

| Import owner | Stylesheets |
|---|---|
| `src/main.tsx` | `base.css`, `responsive.css`, `theme.css`, `interactions.css`, `mobile-tuning.css`, `performance.css`, `adaptive-appearance.css`, `native-experience.css`, `brand.css`, `motion.css`, `LiquidDock.css` |
| `HomeScreen.tsx` | `home.css`, `home-ux.css`, `home-engine.css`, `home-redesign.css` (includes the former architecture layer appended after the Home presentation rules) |
| `LoginExperience.tsx` | `login-experience.css`, `login-compact-landscape.css` |
| `Surface.tsx` | `surface.css` |
| `ShellNavigation.tsx` | `ShellNavigation.css` |
| `PwaUpdatePrompt.tsx` | `pwa-update-prompt.css` |
| Scanner presentation | `scanner-transition.css` (BarcodeScanner and StocktakeScanner) |
| Settings/Scanner preferences | `scanner-settings.css` |
| Stocktake | `stocktake.css` |
| Stocktake Import | `stocktake-import.css` |

The source import graph is confirmed at this baseline. Vite's emitted CSS chunk composition and actual transfer sizes must still be read from the production build artifact; source import ownership does not prove the final network graph.

## 4. Confirmed hotspots and risk

### 4.1 Home cascade

Four ordered Home stylesheets now total **64,989 bytes**. The former `home-architecture.css` was concatenated to the end of `home-redesign.css`, immediately before removing its import and source file. This preserves the original order `home.css` → `home-ux.css` → `home-engine.css` → `home-redesign.css` → former architecture rules. No selector/declaration was rewritten as part of this file consolidation. Repeated selector names remain intentional cascade layers unless separately proven redundant.

### 4.2 Global override layers

`mobile-tuning.css` is the largest file at **83,462 bytes**. `responsive.css`, `adaptive-appearance.css`, `interactions.css`, `native-experience.css` and `performance.css` also participate in global layout, interaction, motion and device adaptation.

Do not delete or move rules based on file size, age, selector repetition or naming. Preserve touch target, input, safe-area, reduced-motion, power-conserve, focus, active-state and lower-end-device behavior.

### 4.3 Feature boundaries

Stocktake Import, Stocktake, Scanner, Login, Settings, PWA, Surface, Motion, Brand and Navigation styles remain owned by their feature/shared presentation boundaries. Do not move feature CSS into the global entrypoint merely to reduce file count. Keep lazy feature loading and CSS chunk boundaries intact.

### 4.4 Dead-selector evidence status

The nine selector families listed in UI-03B are the only additional removals accepted in this slice. No broader dead-selector cleanup is authorized yet. `home-phase2.css` was already absent before this migration. Continue tracing dynamically composed class names, conditional states, pseudo-elements, portals, test-only contracts and CSS-to-CSS references before retiring further selectors.

## 5. UI-03B — Legacy selector retirement

The previous source audit and current repository-wide code-search pass found no application-source consumer for these nine legacy class names; search matches were confined to CSS and historical documentation:

- `.sidebar`
- `.hero-card`
- `.metrics-grid`
- `.module-card`
- `.module-grid`
- `.login-screen`
- `.login-showcase`
- `.activity-row`
- `.attention-item`

The corresponding selector rules were removed from the active CSS files. Where a selector list also contained active presentation classes, only the retired branch was removed. The Home replacement classes, semantic surface roles, Login Experience classes, navigation, feature-owned styles, reduced-motion rules and power-mode contracts were left in place.

Added `scripts/test-ui-03-legacy-selectors.mjs` and wired it into `scripts/preflight.mjs`. The guard checks that:
- none of the nine class tokens has a literal source consumer under `src/`;
- none of the nine class selectors remains in tracked CSS under `src/`.

This is a repository-source guard, not proof about markup injected by an external runtime or browser extension. No such dependency is known in the current application. CI and browser regression evidence remain required before this retirement is considered verified.

## 6. UI-03D — Home stylesheet ownership consolidation

The five-file Home import chain had an explicit architecture layer after the Home presentation layer. The architecture file contained both unique rules and intentional overrides of `.content-wrap.home-content`, `.library-engine`, `.library-engine__group`, `.library-engine__footer`, `.topbar.home-topbar` and `.spotlight-main-content`.

Implementation:
- Appended the complete former `home-architecture.css` contents to the end of `home-redesign.css`.
- Kept the appended block after all original Home presentation rules, preserving its former cascade position.
- Removed the `home-architecture.css` import from `HomeScreen.tsx` and deleted the standalone file.
- Added preflight assertions for the retired import/file and for representative architecture-owned rules retained in the consolidated stylesheet.

This is an ownership/file consolidation, not a wholesale declaration deduplication. The overlapping rules are retained because later declarations intentionally override earlier layout values at breakpoints. One exact duplicate reduced-motion rule for `.library-engine__group` was removed because the same selector/property/value is already present in `home-engine.css`; the preflight guard prevents its return. The Home chain is now four stylesheets and the overall source inventory is 24 files.

## 7. Validation evidence — pre-consolidation checkpoint

CI run [#1809](https://github.com/banjk124-hub/retailos-home/actions/runs/45851661174) passed on the prior UI-03 checkpoint HEAD `2b8f281c6825605df6d4872bcf3bf71c01fbfbac`. Its artifacts recorded:
- preflight, TypeScript/production build, bundle comparison and Playwright responsive/runtime evidence all passed;
- runtime evidence reported no browser errors and no failed requests;
- horizontal overflow was zero at 1440×900, 1280×800, 1024×768, 768×1024, 390×844, 360×740 and short-landscape viewports;
- Login responsive checks captured desktop, tablet, mobile, compact mobile and short-landscape states;
- feature runtime captures included Home, Login, Library, Settings, Stocktake and Import.

Bundle comparison at that checkpoint against PR base:
- entrypoint raw: -4,558 bytes (-1.2%); entrypoint gzip: -845 bytes (-0.9%);
- total raw: -7,126 bytes (-0.4%); total gzip: -1,290 bytes (-0.2%).

This evidence predates the Home stylesheet consolidation commit. It is supporting baseline evidence only, not validation of the current branch HEAD. Physical iOS/Android and low-end device acceptance are not established by Playwright viewport emulation.

## 8. Execution slices

1. **UI-03A — Inventory and ownership baseline**
   - Refresh the exact stylesheet list, byte counts and import ownership.
   - Identify global versus feature-local ownership and high-risk cascade clusters.
   - Complete when every tracked stylesheet has a verified import owner and a documented risk classification.
2. **UI-03B — Selector consumer audit**
   - Extract selector inventory and trace class/ID/attribute references through TSX/TS/JS, templates, generated class construction, tests and CSS-to-CSS references.
   - Classify each candidate as USED, DYNAMIC/UNKNOWN, TEST/CONTRACT-REFERENCED or PROVEN-UNUSED.
   - Static search is a candidate detector, not a deletion authority.
3. **UI-03C — Safe dead-rule retirement**
   - Remove only PROVEN-UNUSED rules with a focused regression test and a reviewable before/after diff.
   - Do not remove selectors used by runtime-generated states or external DOM contracts.
4. **UI-03D — Cascade ownership consolidation**
   - Start with one bounded cluster (Home or global interaction/performance), not a wholesale rewrite.
   - Establish representative browser screenshots/computed-style evidence before moving or merging rules.
   - Preserve source order, specificity, media-query semantics, pseudo-states and responsive output.
5. **UI-03E — Cross-device regression and closure**
   - Run type/build/preflight, browser interaction and responsive evidence, bundle comparison and feature-specific tests relevant to changed styles.
   - Verify desktop, tablet, iOS/Android viewport emulation and lower-end-device fallback behavior; distinguish emulation from physical-device acceptance.
   - Update this phase record and PROJECT_MAP only after source ownership and exact-head CI are verified.

## 9. Acceptance gates

- No unowned stylesheet or unexplained CSS import.
- Every removed selector has a documented consumer trace and is classified PROVEN-UNUSED.
- No unreviewed broad selector, token, breakpoint, focus, touch, reduced-motion or power-mode behavior is removed.
- No feature lazy-loading boundary or emitted CSS chunk regression.
- No horizontal overflow, broken interaction, lost focus indication or viewport-specific regression in the exercised routes.
- Exact final commit passes the relevant CI checks; report browser/device evidence separately.
- No merge or deployment without explicit authorization.

## 10. Initial implementation decision

UI-03A, the bounded UI-03B selector retirement and the first UI-03D Home stylesheet ownership consolidation are implemented. Exact-head CI must validate the consolidated branch before closure. Do not expand into a wholesale Home/global cascade rewrite; the next safe work is evidence-led duplicate/unused-rule classification and any remaining narrowly justified cleanup.


## 8. Final closure — merged UI-03

- PR #180 merged to main at merge commit `7b679da9bbd3b3a21b50711a8b56be8ca14e2e54`.
- Final documentation HEAD `c85cad4cebbb37e2909f47658a7eff91331b4484` passed CI run [#1817](https://github.com/banjk124-hub/retailos-home/actions/runs/45853511261).
- Code/test HEAD `932ab5f7560b30efeb7a7b19fd40e189d6b06623` passed CI run [#1816](https://github.com/banjk124-hub/retailos-home/actions/runs/45853178428), including preflight, TypeScript/production build, bundle comparison and Playwright runtime evidence.
- Browser runtime evidence: zero browser errors, zero failed requests and zero horizontal overflow across seven tested desktop/tablet/mobile/short-landscape viewports.
- Browser viewport emulation does not constitute physical iOS/Android or lower-end-device acceptance.
