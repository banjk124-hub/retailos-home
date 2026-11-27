# AUDIT-03 — CSS & Design Foundation Audit

**Status:** Static source audit complete; implementation not started  
**Baseline:** `main` at `2be395543d7d9b584ba56f2119c0679d3e156223` (AUDIT-02 merge)  
**Branch:** `audit/audit-03-css-design-foundation`  
**Scope:** CSS inventory/import ownership, token authority, cascade risk, feature isolation, typography/assets, motion/accessibility policy and performance verification gates.

## 1. Executive result

AUDIT-03 confirms that RetailOS has a functioning design foundation and an existing CSS consolidation history, but the current stylesheet system still contains overlapping generations and a few global ownership hotspots.

Confirmed baseline:
- **29 tracked CSS files / 338,808 source bytes.** This is raw repository source, not gzip/Brotli transfer, parsed CSSOM size or render cost.
- **11 stylesheets are imported from `main.tsx`**, contributing approximately **144,?** raw source bytes. They are global before feature rendering.
- Home loads four ordered stylesheets through its lazy feature entry: `home.css`, `home-ux.css`, `home-engine.css`, `home-redesign.css` — **64,989 bytes**.
- `mobile-tuning.css` is **80,308 bytes** (about 23.7% of all tracked CSS), globally imported and contains 2,720 lines, 40 media blocks, 28 keyframe declarations and 25 `!important` declarations.
- `theme.css` has 151 custom-property declaration occurrences across 137 unique names. Fourteen compatibility names are declared twice, first as legacy literals and later as aliases to semantic tokens.
- `stocktake-import.css` is **50,965 bytes** (about 15.0% of all tracked CSS) but remains correctly feature-owned and imported by Stocktake Import.
- The tracked runtime asset tree contains only `public/icon.svg` and `public/manifest.webmanifest`; no bundled font or photographic asset is currently present.
- Existing contract tests already guard semantic tokens, Surface variants, WCAG AA contrast checks on white, reduced-motion/power-mode hooks and token consumption by selected features.

**Assessment:** Do not start another blanket CSS consolidation. UI-03 already performed a source-maintainability consolidation and UI-04 separated key feature presentation boundaries. The next useful work is narrower: verify the live cascade, reduce global override authority where evidence supports it, and establish a clear token/ownership contract without selecting a new visual language.

## 2. Evidence and method

Inspected:
- Recursive Git tree and all current CSS paths/sizes.
- `main.tsx` global CSS import order.
- Home, Login, Stocktake, Stocktake Import, Scanner presentation, Surface, Shell Navigation and PWA prompt CSS import sites.
- `theme.css`, `mobile-tuning.css`, `responsive.css`, `adaptive-appearance.css`, `performance.css`, `native-experience.css`, interaction and motion foundations.
- Existing `test-design-foundation-contract.mjs`.
- Existing UI-03 CSS consolidation and UI-04 feature presentation records.

Evidence labels:
- **Confirmed:** directly observed in the tracked source/tree.
- **Assessment:** architecture conclusion from those observations.
- **Not verified:** requires a browser build, computed-style capture, network trace, or physical-device measurement.

## 3. CSS inventory and delivery ownership

### 3.1 Largest files

| Stylesheet | Source bytes | % of total | Current owner / disposition |
|---|---:|---:|---|
| `src/styles/mobile-tuning.css` | 80,308 | 23.7% | Global legacy/override hotspot; retain until each rule has an owner and parity proof |
| `src/features/stocktake-import/components/stocktake-import.css` | 50,965 | 15.0% | Keep Stocktake Import-owned |
| `src/styles/login-experience.css` | 21,998 | 6.5% | Keep Login-owned |
| `src/styles/home-ux.css` | 21,136 | 6.2% | Home presentation generation |
| `src/styles/home.css` | 19,251 | 5.7% | Home presentation generation |
| `src/styles/theme.css` | 14,676 | 4.3% | Semantic token authority candidate; compatibility aliases remain |
| `src/styles/home-redesign.css` | 12,589 | 3.7% | Home presentation generation |
| `src/styles/home-engine.css` | 12,013 | 3.5% | Home layout generation |
| `src/shared/navigation/LiquidDock.css` | 11,676 | 3.4% | Navigation presentation-owned |
| `src/shared/motion/motion.css` | 11,112 | 3.3% | Shared motion and preference policy |

### 3.2 Current import map

| Import boundary | Stylesheets | Notes |
|---|---|---|
| `src/main.tsx` | base, responsive, theme, interactions, mobile-tuning, performance, adaptive-appearance, native-experience, brand, motion, LiquidDock | 11 eager global CSS imports |
| `HomeScreen.tsx` | home, home-ux, home-engine, home-redesign | Four ordered files; Home is lazy-loaded |
| `LoginExperience.tsx` | login-experience, login-compact-landscape | Login-owned |
| `Surface.tsx` | surface | Shared primitive-owned |
| `ShellNavigation.tsx` | ShellNavigation | Navigation-owned |
| `PwaUpdatePrompt.tsx` | pwa-update-prompt | Root-mounted PWA feature |
| Scanner presentation | barcode-scanner-presentation, scanner-shared-controls | Home Scanner and Stocktake Scanner remain distinct compositions |
| Stocktake Scanner | stocktake-scanner-presentation, scanner-shared-controls | Feature-owned layout plus narrow shared torch control |
| Stocktake | stocktake | Feature-owned |
| Stocktake Import | stocktake-import | Feature-owned |
| Settings Hub / Scanner Preferences | settings-hub, settings-dialog, scanner-preferences | Shared dialog shell; distinct content presentation |

The root eager import group totals roughly 144.7 KB of raw CSS source. This is not a statement about actual emitted chunk size: Vite may deduplicate or emit CSS differently. Verify with the production manifest and network waterfall before making delivery changes.

### 3.3 Ownership disposition

- Keep Login, Scanner, Stocktake, Stocktake Import, PWA, Navigation, Surface and Motion feature/shared-owned files at their current boundaries unless a concrete cross-feature contract is demonstrated.
- Keep Home's four CSS files ordered until a rendered cascade baseline proves that declarations can be consolidated or retired.
- Do not move all feature CSS to the root. Preserve lazy feature CSS loading.
- Do not split Stocktake Import based on byte size alone; its parser/review/edit/history/export workflows are a cohesive feature surface.

## 4. Findings

### F03-01 — Global mobile override stylesheet is the main cascade risk

**Confirmed:** `mobile-tuning.css` is 80,308 bytes, globally imported, 2,720 lines, with 40 media blocks, 28 keyframes and 25 `!important` declarations. It contains broad selectors such as `button`, `input`, `select`, `textarea`, `.app-shell`, Login selectors and Home selectors.

**Assessment:** This file is not simply a mobile stylesheet. It has accumulated cross-feature behavior and visual overrides, so a change can affect unrelated screens and override feature-owned styles. It is the highest-priority target for an ownership map, not for immediate deletion.

**Action:** classify each rule into reset/base, shared interaction, responsive layout, feature presentation, accessibility, or obsolete candidate. Move only one verified group at a time with before/after browser evidence.

### F03-02 — Theme token authority is split between canonical roles and compatibility aliases

**Confirmed:** `theme.css` contains 151 declarations across 137 unique custom-property names. Fourteen names are repeated at two locations (for example `--text-primary`, `--surface-card`, `--color-success` and `--border-soft`); the later block remaps legacy names to semantic roles.

**Assessment:** the compatibility layer is intentional, but duplicate declarations inside the same root scope make the winning value depend on source order and can obscure whether a consumer is still legacy or already semantic. Other CSS files also declare local root aliases, including Home's own `--retail-*` and `--ro-*` namespaces.

**Action:** establish a canonical token registry and consumer migration map. Retire aliases only after code search, runtime visual parity and contract tests prove no remaining dependency. Do not rename public token names in bulk.

### F03-03 — Home still has an order-sensitive four-generation cascade

**Confirmed:** Home imports four CSS files in sequence, totaling 64,989 source bytes. They cover overlapping Home shell, navigation, cards, layout, responsive and motion selectors.

**Assessment:** this is a cascade coupling hotspot even after the prior UI-03 consolidation. File order is part of current behavior. Raw byte count does not tell which declarations win in the browser.

**Action:** capture representative computed-style winners and selector ownership for desktop, tablet, mobile and narrow landscape. Consolidate only exact duplicate/dead rules or move a selector group to one clear Home owner.

### F03-04 — Root foundation responsibilities overlap

**Confirmed:** root loads `responsive.css`, `mobile-tuning.css`, `performance.css`, `adaptive-appearance.css`, `native-experience.css`, `interactions.css` and shared Motion. Several contain responsive, touch, animation, reduced-motion, power-conserve, blur or interaction rules. `mobile-tuning.css` itself defines reduced-motion handling; Motion and adaptive styles also contain preference behavior.

**Assessment:** policy is distributed. The risk is conflicting precedence and incomplete feature coverage, not proof of measurable slowness.

**Action:** assign explicit owners:
- reset, document defaults and focus baseline → base;
- design tokens and semantic roles → theme;
- shared interaction semantics → interactions / shared primitives;
- motion timing and reduced-motion preference → Motion;
- device/power adaptation → one adaptive policy owner;
- responsive layout → feature stylesheet or a narrowly scoped shared breakpoint utility.

Do not merge these files until exact selector and media-query overlap is documented.

### F03-05 — Feature CSS ownership is materially better after UI-04

**Confirmed:** Login, Scanner, Stocktake, Stocktake Import, Surface, Shell Navigation and PWA prompt import their own stylesheets. Scanner presentation has separate Home and Stocktake files plus a 575-byte shared torch-control stylesheet.

**Assessment:** this is a sound direction. Preserve the feature boundaries. Shared CSS should express shared semantics, not simply reuse a selector because two components look similar.

**Action:** retain this ownership map as a regression contract. Any new cross-feature stylesheet requires at least two real consumers with matching state, accessibility and lifecycle semantics.

### F03-06 — Existing token tests are useful but not a substitute for visual/runtime verification

**Confirmed:** `test-design-foundation-contract.mjs` checks required semantic token presence, selected token contrast against white, Login/Home token usage, selected feature token consumers, Surface variants, focus/disabled/error states and reduced-motion/power-mode hooks.

**Assessment:** static tests prevent contract drift, but they do not calculate full foreground/background contrast pairs, inspect the computed cascade, prove CSS chunk boundaries, or detect visual regressions on actual viewport/device combinations.

**Action:** extend tests only around identified contracts. Add browser checks for computed-style invariants and screenshots where a migration changes visible output. Avoid a generic CSS lint framework unless it solves a demonstrated gap.

### F03-07 — Typography and imagery are not yet a selected design direction

**Confirmed:** the tracked runtime asset tree contains `public/icon.svg` and `public/manifest.webmanifest`; no bundled font or photographic image is present. CSS uses system/Inter-family declarations and existing visual treatments.

**Assessment:** the codebase does not currently ship a dedicated font or retail photography system. This is a discovery, not a recommendation to add assets now.

**Action:** keep typography, palette, imagery and material decisions open. Any future design-system proposal should be evaluated against Vietnamese glyph coverage, font licensing, file size, offline behavior, readability and mid-range mobile performance before adoption.

## 5. What is not established

This audit is static source analysis. It does **not** establish:
- actual CSS bytes transferred after gzip/Brotli;
- exact Vite CSS chunk composition or whether CSS is duplicated across emitted chunks;
- computed-style winners or unused selectors in the live UI;
- style recalculation, layout, paint, compositing or long-task cost;
- visual parity across real browsers, iOS Safari, Android Chrome or low-end devices;
- whether any stylesheet can safely be removed.

These require production-build artifact inspection, browser DevTools/Playwright evidence and representative physical-device validation.

## 6. Recommended implementation roadmap

| Phase | Scope | Completion gate |
|---|---|---|
| AUDIT-03A | CSS delivery baseline: production manifest, emitted CSS chunks, compressed transfer and import graph | Reproducible baseline artifacts; no source changes |
| AUDIT-03B | Cascade ownership map: root/global selectors, mobile-tuning groups, Home order and token alias consumers | Each high-risk selector group has one owner and known consumers |
| AUDIT-03C | Foundation policy alignment: token authority, focus, interaction, motion/reduced-motion and power-conserve contracts | Static tests plus browser-computed contract checks pass |
| AUDIT-03D | Bounded cleanup candidates | Each patch has before/after screenshot and computed-style parity; no broad deletion |
| AUDIT-03E | Design direction readiness (not redesign) | Typography, imagery and visual language remain decision inputs for a separately approved design exploration |

## 7. Guardrails

- No visual redesign, palette/font selection, imagery addition or material-system decision in AUDIT-03.
- No blanket rewrite, file-size-driven deletion or global CSS import expansion.
- Preserve Home/Login/Scanner/Stocktake/Import/PWA lazy-loading and feature presentation boundaries.
- Preserve keyboard focus, WCAG contrast, reduced motion, power-conserve, touch behavior, safe-area and compact-landscape handling.
- No scanner engine, camera lifecycle, business state, persistence, update blocker or service-worker changes.
- No new framework, CSS preprocessor, runtime dependency or design-system abstraction without a proven need.
- No performance claim without emitted bundle/network and runtime measurements.

## 8. Final disposition

**AUDIT-03 static audit: complete.**  
**Implementation: not started.**

The highest-value next implementation target is **03A**, because it establishes what CSS actually ships before any source consolidation or deletion is considered.
