# CSS-01 — CSS Ownership Migration

**Status:** CSS-01A/B complete. CSS-01C is closed with three bounded runtime CSS retirement slices (PR #198, #199 and #201) plus orphan keyframe cleanup (PR #200). CSS-01D passed on the exact PR #199 and PR #201 heads. Remaining `.mobile-nav` / `.mobile-nav-icon` declarations are intentionally retained: their markup consumer is absent from tracked source, but safe selector-block isolation was not demonstrated without risking grouped-selector/cascade changes. CSS-01E documentation/status closeout is prepared in the current docs-only branch and awaits its own review/merge; no broad CSS ownership rewrite or import-boundary change was made.
**Baseline:** `main` at `7e787576d2ad1013eb2e2e8f0cbed3efd7d3d02f` (2026-11-28).
**PW-01:** Deferred by owner. No reproducible device defect has been observed in current acceptance; physical-device validation is not claimed complete and is not a prerequisite for the static CSS ownership audit.
**Scope:** Evidence-led ownership mapping and bounded CSS migration after SH-01. This is not a visual redesign.

## 1. Objective and invariants

Establish a verifiable ownership model across:
1. Shared foundation — reset, semantic tokens, generic interaction/accessibility primitives, brand/motion primitives with genuinely shared consumers.
2. Platform presentation — Desktop, Mobile and Tablet compatibility composition and navigation styling. Platform capability policy remains in TypeScript, never CSS.
3. Feature presentation — Login, Home, Settings, Scanner, Stocktake, Stocktake Import, PWA Update Center and other workflow-local styles.

Preserve:
- CSS source/import order and selector specificity unless a before/after computed-style comparison proves the change equivalent.
- Existing responsive behavior, safe-area handling, touch targets, focus-visible, reduced-motion and power-conserve contracts.
- Lazy-loaded feature CSS boundaries and emitted CSS chunk behavior.
- SH-01 ownership: Home remains one shared stateful controller; platform roots own presentation composition. Do not duplicate business state.
- Feature-owned styles remain local unless multiple real consumers demonstrate a stable shared semantic contract.
- Scanner engine/lifecycle, Stocktake/Import business logic, auth/session, PWA release lifecycle and domain/data behavior are outside scope.

## 2. CSS-01A — Source inventory at baseline

Repository inspection found **34 tracked CSS files totaling 342,568 source bytes**. These are raw source sizes, not compressed transfer size, CSSOM size or render cost.

| Ownership layer | Stylesheet | Bytes | Current disposition |
|---|---|---:|---|
| Shared foundation / global | `src/styles/base.css` | 1,107 | Keep global reset/base |
| Shared foundation / global | `src/styles/theme.css` | 14,676 | Semantic token and legacy theme authority; audit aliases/consumers |
| Shared foundation / global | `src/styles/interactions.css` | 1,586 | Cross-cutting interaction rules; audit scope and duplication |
| Global responsive | `src/styles/responsive.css` | 10,467 | Global legacy responsive composition; high cascade risk |
| Global responsive | `src/styles/mobile-tuning.css` | 80,308 | High-risk mixed global override layer; do not wholesale move/delete |
| Shared performance | `src/styles/performance.css` | 1,000 | Preserve low-end/performance behavior |
| Shared adaptive behavior | `src/styles/adaptive-appearance.css` | 4,191 | Preserve power mode, input and reduced-motion behavior |
| Shared interaction/presentation | `src/styles/native-experience.css` | 7,885 | Mixed global app selectors and interaction primitives; audit consumer scope |
| Auth journey | `src/styles/auth-journey.css` | 3,134 | App/auth journey-owned |
| Login | `src/styles/login-experience.css` | 21,998 | Login-owned |
| Login | `src/styles/login-compact-landscape.css` | 2,830 | Login-owned responsive variant |
| Home | `src/styles/home.css` | 19,251 | Home-owned; ordered cascade |
| Home | `src/styles/home-ux.css` | 21,136 | Home-owned; ordered cascade |
| Home | `src/styles/home-engine.css` | 12,013 | Home-owned; ordered cascade |
| Home | `src/styles/home-redesign.css` | 12,589 | Home-owned; ordered cascade |
| Platform presentation | `src/platform/home/presentations/DesktopHomePresentation.css` | 56 | Desktop root; currently composition marker only |
| Platform presentation | `src/platform/home/presentations/MobileHomePresentation.css` | 55 | Mobile root; currently composition marker only |
| Platform compatibility | `src/platform/home/presentations/TabletHomeCompatibilityPresentation.css` | 55 | Tablet compatibility root; not a Tablet product approval |
| Navigation / Desktop | `src/shared/navigation/DesktopShellNavigation.css` | 2,784 | Desktop navigation-owned |
| Navigation / Mobile | `src/shared/navigation/MobileShellNavigation.css` | 746 | Mobile navigation-owned |
| Navigation / Tablet | `src/shared/navigation/TabletShellNavigation.css` | 3,655 | Temporary Tablet compatibility navigation |
| Navigation / dock | `src/shared/navigation/LiquidDock.css` | 11,676 | Shared navigation/dock presentation; imported at app entry |
| Brand | `src/shared/brand/brand.css` | 6,645 | Brand-owned shared primitive |
| Motion | `src/shared/motion/motion.css` | 11,112 | Motion preference/tokens/presets; preserve contracts |
| Surface | `src/shared/components/surface/surface.css` | 2,340 | Surface primitive-owned |
| PWA | `src/shared/pwa/pwa-update-prompt.css` | 10,616 | PWA Update Center-owned; release lifecycle protected |
| Settings shared shell | `src/styles/settings-dialog.css` | 1,863 | Shared dialog shell used by Settings Hub and Scanner Preferences |
| Settings Hub | `src/styles/settings-hub.css` | 1,708 | Settings Hub-owned |
| Scanner Preferences | `src/styles/scanner-preferences.css` | 3,671 | Scanner Preferences-owned; separate from camera runtime policy |
| Home Scanner | `src/features/scanner/barcode-scanner-presentation.css` | 4,815 | Home camera surface-owned |
| Scanner shared control | `src/features/scanner/scanner-shared-controls.css` | 575 | Minimal shared torch-control styling; two real consumers |
| Stocktake Scanner | `src/features/stocktake/components/stocktake-scanner-presentation.css` | 5,955 | Stocktake camera surface-owned |
| Stocktake | `src/features/stocktake/components/stocktake.css` | 9,105 | Stocktake workflow-owned |
| Stocktake Import | `src/features/stocktake-import/components/stocktake-import.css` | 50,965 | Import workflow-owned; keep local |

## 3. Import-owner map

| Import boundary | CSS imports | Loading/ownership notes |
|---|---|---|
| `src/main.tsx` | `base.css`, `responsive.css`, `theme.css`, `interactions.css`, `mobile-tuning.css`, `performance.css`, `adaptive-appearance.css`, `native-experience.css`, `brand.css`, `motion.css`, `LiquidDock.css` | 11 eager app-wide imports; order is part of current cascade |
| `src/App.tsx` | `auth-journey.css` | Authenticated app journey |
| `LoginExperience.tsx` | `login-experience.css`, `login-compact-landscape.css` | Login feature |
| `HomeScreen.tsx` | `home.css`, `home-ux.css`, `home-engine.css`, `home-redesign.css` | Four ordered Home sheets; Home is lazy-loaded at authenticated shell |
| Desktop/Mobile/Tablet Home roots | one corresponding presentation CSS each | Separate presentation ownership seam; current rules are minimal markers |
| Desktop/Mobile/Tablet navigation components | one corresponding navigation CSS each | Platform navigation roots; Tablet remains compatibility only |
| `Surface.tsx` | `surface.css` | Shared primitive |
| `PwaUpdatePrompt.tsx` | `pwa-update-prompt.css` | PWA update presentation |
| `SettingsHub.tsx` | `settings-dialog.css`, `settings-hub.css` | Shared dialog foundation then Settings-owned rules |
| `ScannerSettingsPanel.tsx` | `settings-dialog.css`, `scanner-preferences.css` | Shared dialog foundation then preference-owned rules |
| `BarcodeScanner.tsx` | `barcode-scanner-presentation.css`, `scanner-shared-controls.css` | Lazy Home scanner presentation |
| `StocktakeScanner.tsx` | `stocktake-scanner-presentation.css`, `scanner-shared-controls.css` | Stocktake-owned scanner presentation |
| `StocktakePresentation.tsx` | `stocktake.css` | Stocktake workspace |
| `StocktakeImportPresentation.tsx` | `stocktake-import.css` | Import workflow |

The import graph above is source-confirmed on this branch. Vite-emitted CSS chunk composition and actual network transfer must be measured from the production build before any lazy/eager import boundary is changed.

## 4. Confirmed ownership risks

### 4.1 Global override concentration

`mobile-tuning.css` is 80,308 bytes and contains broad rules touching Login, Home, navigation and multiple shared selectors. Its name does not make it Mobile presentation-owned. It is a mixed global legacy override file; classify rule-by-rule by consumer and responsibility.

`responsive.css` also changes Login and Home composition at several width thresholds (including 1200, 940 and 700px). Those are responsive layout decisions, not capability policy.

`native-experience.css`, `adaptive-appearance.css`, `interactions.css` and `performance.css` overlap in the broader areas of interaction, motion, power-conserve and responsive behavior. Similar selector names alone do not prove duplicate declarations or equivalent behavior.

### 4.2 Platform presentation seam

SH-01 established independent Desktop/Mobile/Tablet root components and navigation components. The three Home root stylesheets currently contain only the root marker selector; they do not yet own substantial Home feature layout. CSS-01 must not claim that feature-level CSS has already migrated merely because the root components exist.

### 4.3 Existing feature ownership to preserve

UI-04 already established dedicated ownership for Settings Hub, Scanner Preferences, Home Scanner, Stocktake Scanner, Stocktake and Stocktake Import. The minimal shared scanner control stylesheet has two real consumers. These are existing contracts, not targets for centralization.

### 4.4 Prior CSS consolidation is not authorization for a rewrite

UI-03 already retired nine proven-unused legacy selector families and consolidated the former Home architecture stylesheet into the end of `home-redesign.css`. Its earlier inventory is stale relative to this baseline. This CSS-01 inventory supersedes the old file count and records current ownership without repeating the UI-03 cleanup.

## 5. CSS-01 execution sequence

| Slice | Scope | Exit criteria |
|---|---|---|
| CSS-01A | Refresh stylesheet inventory and import-owner map | All tracked CSS files have a current owner, size and source import boundary |
| CSS-01B | Selector/consumer and cascade trace | Global override clusters are classified USED, DYNAMIC/UNKNOWN, TEST/CONTRACT-REFERENCED or PROVEN-UNUSED; imports/order/media/specificity are recorded |
| CSS-01C | Bounded ownership migration | Move only a small, independently verifiable cluster; preserve cascade order and feature loading boundaries |
| CSS-01D | Automated/browser regression | Exact-head preflight, TypeScript, production/Pages build, bundle comparison and responsive/runtime evidence pass |
| CSS-01E | Documentation/status closure | Ownership map and current project status reflect verified source and CI; no unsupported physical-device claim |

## 6. CSS-01B audit targets and order

1. Trace the root cascade from `main.tsx`: `base` → `responsive` → `theme` → `interactions` → `mobile-tuning` → `performance` → `adaptive-appearance` → `native-experience` → Brand → Motion → LiquidDock.
2. Trace the Home chain separately: `home.css` → `home-ux.css` → `home-engine.css` → `home-redesign.css`; compare with the Home presentation roots and ShellNavigation imports.
3. Audit broad global selectors in `mobile-tuning.css` and `responsive.css` against current TSX consumers, including conditionally rendered, dynamically composed, portal and pseudo-state classes.
4. Trace cross-cutting interaction/performance selectors across `interactions.css`, `native-experience.css`, `adaptive-appearance.css`, `performance.css` and `motion.css`.
5. Do not begin with Stocktake Import or Scanner feature CSS: those have clear feature ownership and high workflow regression cost.

## 7. Protected boundaries / explicit non-goals

- No visual redesign, palette, typography or design-system selection.
- No blanket move/delete of `mobile-tuning.css` or `responsive.css`.
- No changes to scanner engine, decoder, camera lease/lifecycle, Stocktake persistence/history/export, Import parsing/precision/conflict rules, auth/session, PWA update lifecycle or business data contracts.
- No new CSS framework, preprocessor, runtime styling library or dependency.
- No globalize feature-owned CSS for line-count or file-count reduction.
- No merge or deploy without explicit owner approval.

## 8. Evidence limits

- Source inventory and import-owner mapping are static source evidence.
- CSS source byte counts are not emitted bundle sizes or network transfer metrics.
- Browser viewport emulation is not physical iOS/Android acceptance.
- PW-01 remains deferred, not passed. Reopen physical validation if a reproducible device/browser defect, a material platform-sensitive CSS change or an explicit release acceptance requirement appears.


## 9. CSS-01B — Consumer and cascade trace (static source pass)

**Audit ref:** `206637af0b6fc7b7bad81e925daa7e16fa25a8e6`  
**Method:** Read current stylesheet source and the current TSX owners for Login, Home, Home library, Home navigation and Desktop/Mobile/Tablet shell navigation. Extracted selector blocks and literal/template `className` tokens. This is a static source trace, not runtime CSSOM or computed-style proof.

### 9.1 Root cascade and rule volume

| Stylesheet | Source bytes | Selector blocks | Trace result |
|---|---:|---:|---|
| `responsive.css` | 10,467 | 181 | Cross-feature responsive composition: Login, Home, sidebar/navigation, metrics and notifications |
| `mobile-tuning.css` | 80,306 | 703 | Mixed legacy override layer; Login, Home, navigation, spotlight, calendar, notification and app-library rules |
| `interactions.css` | 1,584 | 8 | Small cross-cutting state/interaction rules; overlaps several Home class families |
| `native-experience.css` | 7,885 | 50 | Shared app shell, buttons, search, transition, push-notification and icon-motion contracts |
| `adaptive-appearance.css` | 4,191 | 34 | Adaptive/energy rules touching Home composition and notification states |
| `performance.css` | 1,000 | 10 | Low-cost visual effects and ambient layers; preserve until device/runtime evidence says otherwise |
| `motion.css` | 11,112 | 91 | Shared motion primitives, semantic motion classes and icon variants |
| `home.css` | 19,251 | 192 | Base Home layout and component rules |
| `home-ux.css` | 21,136 | 149 | Home interaction, notifications, library, scanner result and calendar rules |
| `home-engine.css` | 12,011 | 98 | Current Home library engine and shell composition |
| `home-redesign.css` | 12,587 | 113 | Later Home surface/presentation overrides plus reduced-motion and loading surface rules |

Selector-block counts are source parser counts, not unique CSSOM rules. Nested at-rules and grouped selectors mean they must not be interpreted as one selector = one independent behavior.

### 9.2 Confirmed consumer families

| Consumer / source | Current class families observed | Ownership interpretation |
|---|---|---|
| `LoginExperience.tsx` | `login-experience`, `login-experience__*`, `is-authenticating`, ambient/layout classes | Current Login screen root |
| `LoginForm.tsx` | `login-panel__*`, `login-form__*`, `ro-button*`, `motion-energy-sweep` | Current Login form/panel; feature-owned |
| `LoginHero.tsx` | `login-hero__*` | Current Login hero; feature-owned |
| `HomeScreen.tsx` | Home shell, topbar, spotlight, notifications, calendar, library, barcode result, notice detail, toast and loading classes; includes conditional/template-generated class families | Shared Home controller with platform presentation root; not evidence of platform-specific feature CSS |
| `HomeModuleLibrarySection.tsx` | `app-library-section`, `app-library-heading`, `search-field`, `home-search-field`, empty-state classes | Home library feature |
| `ModuleLibraryEngine.tsx` | `library-engine__*` and dynamic tone modifier | Home library engine; dynamic modifier must be included in consumer checks |
| Desktop navigation | `desktop-shell-navigation__*`, `is-active` | Desktop navigation-owned |
| Mobile navigation | `mobile-shell-navigation` | Mobile navigation component boundary |
| Tablet compatibility navigation | `shell-navigation__*`, `shell-navigation--tablet-compat` | Temporary Tablet compatibility only |

The current Login component uses the `.login-experience` and BEM class families. The legacy Login selector clusters formerly present in `responsive.css` and `mobile-tuning.css` were retired in PR #198 and PR #199 after tracked-source consumer searches. Current Login feature styles remain in `login-experience.css` and `login-compact-landscape.css`; no Login TSX, auth behavior or import boundary was changed.

The current navigation components expose platform-specific class families (`.desktop-shell-navigation`, `.mobile-shell-navigation`, Tablet compatibility classes) and render the shared `.liquid-dock`. Legacy `.mobile-nav` and `.mobile-nav-icon` rules remain in global and Home stylesheets, with no current TSX/JS/test consumer found by repository-wide code search. They are **PROVEN-UNUSED as legacy markup selectors in tracked source**, but their remaining declaration groups are not yet approved for removal: inspect grouped selectors and media/cascade effects before a separate bounded migration.

### 9.3 Cascade and breakpoint dependencies

- The 11 eager imports in `main.tsx` remain in their existing order. The broad global sheets load before the Home feature's four ordered sheets; shared Brand/Motion/LiquidDock are loaded later in the root entry chain.
- `responsive.css` contains desktop/tablet/mobile transitions, including max-width 1200px, 940px and 700px, plus compact-width behavior. It now retains Home shell, sidebar and metric/grid composition; the obsolete Login-specific rules were retired by PR #199. It is not a Mobile-only sheet.
- `mobile-tuning.css` contains repeated max-width 700px and compact-width blocks, repeated reduced-motion handling, base interaction declarations and later Home/spotlight/calendar/library rules. Later blocks intentionally override earlier values in the same file; flattening or reordering changes the cascade.
- The Home chain is ordered `home.css` → `home-ux.css` → `home-engine.css` → `home-redesign.css`. The chain contains intentional cross-file selector reuse (for example `.app-shell`, `.topbar`, `.content-wrap`, `.spotlight-art`, `.panel-card`, `.mobile-nav`, `.search-field`). Selector reuse alone is not duplication.
- `prefers-reduced-motion` is handled in more than one layer, including global/adaptive and Home presentation CSS. Preserve the combined behavior; do not remove a local rule based only on finding a global reduced-motion rule.
- `performance.css`, `adaptive-appearance.css`, `native-experience.css` and `motion.css` each have distinct but intersecting responsibilities. Similar ambient, motion or interaction class names are not proof of equivalent declarations.

### 9.4 Preliminary classification

| Cluster | Classification | Evidence / action |
|---|---|---|
| Current Home shell and Home library class families | **USED** | Present in current Home TSX and Home CSS chain; retain Home ownership |
| Current Login feature class families | **USED** | Present in Login TSX; retain Login feature CSS ownership |
| Desktop/Mobile/Tablet navigation class families | **USED** | Present in corresponding navigation components; keep platform boundaries |
| `.login-shell`, `.showcase-copy`, generic legacy Login form classes in global responsive sheets | **DYNAMIC/UNKNOWN — legacy candidate** | Not found in sampled current Login TSX vocabulary; require whole-repository and test/runtime proof before retirement |
| `.mobile-nav` / `.mobile-nav-icon` global rules | **DYNAMIC/UNKNOWN — legacy candidate** | Current navigation uses platform component class families; verify all render paths and runtime DOM before retirement |
| Dynamic Home modifier classes (department, tone, state, notice status, selected/active) | **DYNAMIC/UNKNOWN** | Built through template literals/conditional expressions; token extraction alone cannot prove each runtime value |
| Focus, active, hover, pseudo-elements, media and reduced-motion selectors | **TEST/CONTRACT-REFERENCED** | Must be checked through keyboard, pointer, touch, viewport and motion-preference behavior, not only static class usage |
| Any selector with no discovered TSX token | **Not automatically PROVEN-UNUSED** | Search tests, non-TSX templates, portal/third-party output, data attributes and generated class names before deletion |

The `.mobile-nav` / `.mobile-nav-icon` vocabulary is **PROVEN-UNUSED as legacy markup selectors in tracked source** by repository-wide search, but that classification does not prove each remaining declaration block is safe to remove. Grouped selectors, responsive/reduced-motion contexts and shared declarations still require isolated, reviewable edits before retirement.

### 9.5 CSS-01B remaining verification gates

1. Complete repository-wide consumer search for legacy Login/navigation selectors, including non-TSX source, tests, story/demo fixtures and generated class expressions.
2. Inspect all relevant component source for conditional/template class construction and portal/modal output; static literal-token extraction is not exhaustive.
3. Run the current production build and inspect emitted CSS chunks to establish eager/lazy loading and actual CSS asset composition before any import-boundary change.
4. Capture browser computed-style and responsive behavior at representative widths (desktop, tablet compatibility, mobile and compact mobile), including keyboard focus, active/hover/touch, safe-area and reduced-motion states.
5. Only after these checks classify a candidate as PROVEN-UNUSED or select a bounded CSS-01C migration cluster.

**CSS-01B outcome:** Root/Home cascade and primary consumer families are mapped; high-risk legacy candidates and behavior contracts are identified. Full repository-wide dead-selector proof and computed-style evidence remain open. No runtime CSS changes are authorized by this audit slice.


## 10. CSS-01B — Repository-wide consumer verification and CI evidence

### 10.1 Repository-wide search result

GitHub code search was run against the current repository default branch (same CSS/source baseline as this docs-only PR). The search covered the high-risk legacy Login and navigation selector families and representative Home/shared selectors. Results:

| Selector family | Repository-wide code-search result | Classification |
|---|---|---|
| `.login-shell`, `.showcase-copy`, `.login-heading` | Retired from `responsive.css` and `mobile-tuning.css` by PR #198/#199; current Login TSX uses `.login-experience` / BEM classes | **RETIRED**; keep current feature-owned Login styles |
| `.field-label`, `.reveal-button`, `.login-security-note`, `.login-progress` | Legacy declarations removed in PR #198/#199; historical documentation may still mention old vocabulary | **RETIRED**; keep historical documentation untouched |
| `.input-wrap` | Legacy `.input-wrap` declarations removed in PR #199; current consumer is `.login-form__input-wrap` in `LoginForm.tsx` and current Login styles | **RETIRED**; do not confuse with current BEM class |
| `.mobile-nav`, `.mobile-nav-icon` | Found in global stylesheet rules only; no current TSX/JS/test consumer returned | **PROVEN-UNUSED in tracked source** for the legacy navigation markup |
| `.desktop-shell-navigation__*`, `.mobile-shell-navigation`, `.shell-navigation__*` | Current platform navigation component class families exist in source | **USED**; preserve platform-specific ownership |
| `.spotlight-art` | Used in current `HomeScreen.tsx` and multiple ordered Home stylesheets | **USED**; cross-file declarations are not dead duplicates |
| `.metric-card`, `.side-nav-item` | Current Home presentation and supporting stylesheet/test contract references | **USED / TEST-CONTRACT-REFERENCED**; preserve |

“PROVEN-UNUSED” here is bounded to the tracked application source and test corpus returned by repository-wide code search at the audited baseline. It does not mean a selector is safe to delete without reviewing its declaration block, media context, animation references and visual effect. The next migration must remove only the isolated declaration cluster with before/after evidence.

### 10.2 CSS-01C migration and regression evidence

- PR #198 merged: retired the first bounded set of legacy Login overrides from `mobile-tuning.css` (merge `ec10d1ceaa05ff95a232d3ad276866b63e612282`).
- PR #199 merged: retired remaining legacy Login responsive rules and the obsolete `.login-identity-dock` selector cluster (merge `2c2a5b60e87c05b06153fb534a0a4bbdc5c77e5`).
- PR #200 merged: removed orphan `login-identity-*` keyframes and refreshed CSS-01 documentation (merge `b0b36487c27239fa283b380767e43ec4092f928f`).
- PR #201 merged: retired the first bounded `.mobile-nav` legacy selector groups from Home/global presentation CSS (merge `7e787576d2ad1013eb2e2e8f0cbed3efd7d3d02f`). Exact PR #201 head `88fee8c6ca6374941bc5d47a57a9291547c986e5`, CI #1990 passed.
- PR #202 was closed unmerged after the proposed selector rewrite failed review for safe formatting/block-boundary preservation; no changes were accepted.
- Exact PR #199 head `e1e84f55829d374d676233ebefeff97dc72c3863`, RetailOS CI run #1985 — passed: preflight, PR-base production build and bundle comparison, Playwright Chromium installation, responsive/runtime evidence suite and artifact uploads.
- The merge changed only `responsive.css` and `mobile-tuning.css`; no imports, TSX, feature CSS boundaries or business behavior changed.
- Post-merge source review found two orphaned `login-identity-*` keyframe definitions left after PR #199; this PR removes them. No current Login DOM consumer references these keyframes.

### 10.3 Existing CI/browser evidence

The PR head `a9c11d67ada2c792f77705d8a2525a37cbe5c05d` completed RetailOS CI run **#1974** successfully:

- Local-equivalent preflight — passed
- PR-base production build and bundle comparison — passed
- Playwright Chromium install — passed
- Responsive and runtime evidence tests against Pages build — passed
- Evidence artifacts uploaded:
  - `retailos-bundle-analysis` (artifact ID `15195289480`)
  - `retailos-ui-runtime-evidence` (artifact ID `15195134951`)

This confirms the current baseline build and existing responsive/runtime test suite execute successfully. It does **not** establish a before/after CSS migration comparison because this PR has not changed runtime CSS. The uploaded bundle analysis is a baseline artifact, not a claim that all individual emitted CSS chunks have been manually inspected.

### 10.4 CSS-01B / CSS-01C exit assessment

- Repository-wide source search has confirmed a bounded set of obsolete legacy Login and navigation selector families.
- Current Home and platform navigation consumer families have positive source references.
- Current PR CI has passed preflight, production/Pages build, bundle comparison and Playwright responsive/runtime evidence.
- CSS-01C has made bounded runtime CSS deletions; import order and feature loading boundaries remain unchanged.

**CSS-01B static audit is complete for the audited selector clusters. CSS-01C is closed after three bounded runtime CSS retirement slices and orphan keyframe cleanup. CSS-01D passed on exact PR #199 and PR #201 heads.** The remaining `.mobile-nav` / `.mobile-nav-icon` declarations are intentionally retained. PR #201 retired the first isolated Home/navigation groups; the remaining groups are interleaved with shared selectors and responsive/reduced-motion rules. A subsequent automated isolation attempt was rejected and PR #202 was closed unmerged because the generated diff did not preserve CSS block boundaries and formatting with sufficient confidence. No source changes from PR #202 were accepted. Further retirement requires a selector-aware, reviewable patch plus exact-head browser/bundle evidence; it is not a blocker for closing CSS-01C.
