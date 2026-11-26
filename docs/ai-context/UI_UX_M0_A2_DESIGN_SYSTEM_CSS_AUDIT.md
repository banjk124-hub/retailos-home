# M0-A2 — Design System & CSS Audit

**Repository:** `banjk124-hub/retailos-home`  
**Baseline:** `main` at `a5ef3ffe176adfcfb3ccb7cf68941dd197de33d6`  
**Branch:** `audit/m0-a2-design-system-css`  
**Scope:** Design-token, stylesheet inventory/import ownership, cascade risk, typography, retail imagery and CSS delivery/performance audit. Documentation only.

## 1. Executive result

M0-A2 confirms that RetailOS already has a substantial presentation foundation, but the current runtime is the accumulation of several visual generations rather than one consistently owned design system.

The most important findings are:

1. **24 tracked CSS files totaling 365,141 bytes (~356.6 KiB) at the audited main baseline.** The byte count is raw source size, not compressed network transfer or parsed CSS cost.
2. **13 stylesheets are imported at the root entrypoint**, followed by five additional Home stylesheets. The root/Home cascade is therefore broad and order-sensitive before feature-specific lazy stylesheets are considered.
3. **`mobile-tuning.css` is 87,269 bytes (23.9% of all tracked CSS)** and contains many global/mobile overrides, including broad input rules and repeated reduced-motion handling. Size alone does not prove unused code.
4. **Home is the clearest cascade ownership hotspot:** five ordered stylesheet generations (`home.css`, `home-ux.css`, `home-engine.css`, `home-redesign.css`, `home-architecture.css`) style overlapping selectors and the same structural surface.
5. **Design tokens are not yet a clean single source.** `theme.css` contains canonical semantic roles and compatibility aliases, but older aliases, local root token blocks, direct hex/RGBA values and competing brand aliases remain in global and feature CSS.
6. **Typography is not finalized or bundled.** Current UI stack is Inter/Segoe UI/Roboto/Helvetica/Arial. Be Vietnam Pro is a well-supported candidate with Vietnamese subset and SIL OFL 1.1, but it has not been visually compared or selected for RetailOS.
7. **Authentic retail imagery is absent from the tracked runtime asset tree.** The only tracked image/vector-like asset is `public/icon.svg`. No retail photography or bundled font file is shipped at this baseline.
8. **Performance adaptations already exist** (blur removal, animation suppression, power-conserve and reduced-motion), but the rules are distributed across multiple stylesheets and overlap. This is an ownership/verification problem, not proof that the app is currently slow.
9. **No computed-style/browser screenshot audit was executed in this environment.** GitHub source inspection and CI metadata do not expose the running app's computed CSS winners, paint cost or real-device behavior. This remains an explicit runtime verification gate; it is not claimed complete.

**Overall disposition:** retain the current foundation while consolidating ownership in bounded steps. Do not replace the whole CSS system, delete the mobile override file, add a framework, or select palette/font/images solely from static source evidence.

## 2. Evidence and method

Inspected:
- Current recursive Git tree and all 24 tracked CSS paths/sizes at baseline `a5ef3ffe176adfcfb3ccb7cf68941dd197de33d6`.
- `src/main.tsx` global stylesheet import order.
- `HomeScreen.tsx`, Login, Stocktake and Stocktake Import direct CSS imports.
- Global theme, responsive, mobile, interaction, performance, adaptive appearance and native experience styles.
- Brand, Motion, Glass tokens/materials, LiquidDock, PWA prompt and feature stylesheets.
- `index.html`, `vite.config.ts`, package manifest and tracked image/font assets.
- Governing M0 specification and historical Phase 00/01 records as evidence only.

Evidence labels:
- **Confirmed:** direct source/tree fact.
- **Assessment:** architectural conclusion from confirmed source.
- **Not verified:** requires rendered browser, computed styles, actual network/build artifacts or physical devices.

Raw CSS byte totals are source-tree metrics. They do not equal gzip/Brotli transfer size, parsed CSS bytes, CSSOM size or render cost.

## 3. Complete stylesheet inventory

### 3.1 Tracked CSS files

| Owner / file | Bytes | % of CSS | Disposition |
|---|---:|---:|---|
| `src/styles/mobile-tuning.css` | 87,269 | 23.9% | CONSOLIDATE after consumer/cascade proof |
| `src/features/stocktake-import/components/stocktake-import.css` | 51,156 | 14.0% | KEEP feature-owned; decompose only internally if justified |
| `src/styles/login-experience.css` | 24,511 | 6.7% | KEEP Login-owned; align tokens incrementally |
| `src/styles/home.css` | 22,209 | 6.1% | CONSOLIDATE with Home generations |
| `src/styles/home-ux.css` | 21,704 | 5.9% | CONSOLIDATE with Home generations |
| `src/styles/theme.css` | 16,227 | 4.4% | KEEP as semantic token authority; clean aliases in stages |
| `src/styles/responsive.css` | 12,331 | 3.4% | CONSOLIDATE responsive ownership |
| `src/styles/home-engine.css` | 12,113 | 3.3% | CONSOLIDATE with Home generations |
| `src/shared/navigation/LiquidDock.css` | 11,945 | 3.3% | KEEP while LiquidDock is active |
| `src/features/stocktake/components/stocktake.css` | 12,037 | 3.3% | KEEP feature-owned |
| `src/shared/motion/motion.css` | 11,112 | 3.0% | KEEP motion preference/token owner |
| `src/shared/components/glass/glass.materials.css` | 10,553 | 2.9% | KEEP selective material implementation |
| `src/shared/pwa/pwa-update-prompt.css` | 10,644 | 2.9% | KEEP PWA presentation-owned |
| `src/styles/home-redesign.css` | 10,215 | 2.8% | CONSOLIDATE with Home generations |
| `src/features/scanner/scanner-transition.css` | 8,723 | 2.4% | KEEP scanner presentation-only |
| `src/styles/native-experience.css` | 8,314 | 2.3% | CONSOLIDATE with shared interaction/motion ownership |
| `src/styles/scanner-settings.css` | 7,113 | 1.9% | KEEP Settings/Scanner preferences ownership |
| `src/shared/brand/brand.css` | 6,645 | 1.8% | KEEP Brand identity owner |
| `src/shared/components/glass/glass.tokens.css` | 6,454 | 1.8% | KEEP material tokens; reconcile with semantic foundation |
| `src/styles/adaptive-appearance.css` | 5,502 | 1.5% | KEEP behavior; consolidate duplicate performance/reduced-motion rules |
| `src/styles/home-architecture.css` | 3,236 | 0.9% | CONSOLIDATE with Home generations |
| `src/styles/performance.css` | 2,391 | 0.7% | CONSOLIDATE overlapping power/blur policy after tests |
| `src/styles/interactions.css` | 1,600 | 0.4% | KEEP intent; consolidate shared interaction rules |
| `src/styles/base.css` | 1,137 | 0.3% | CONSOLIDATE legacy globals into canonical foundation |

**Total:** 365,141 bytes across 24 tracked CSS files.

### 3.2 Import ownership and order

**Root entrypoint — `src/main.tsx`, 13 imports in source order:**

1. `src/styles/base.css`
2. `src/styles/responsive.css`
3. `src/styles/theme.css`
4. `src/styles/interactions.css`
5. `src/styles/mobile-tuning.css`
6. `src/styles/performance.css`
7. `src/styles/adaptive-appearance.css`
8. `src/styles/native-experience.css`
9. `src/shared/brand/brand.css`
10. `src/shared/motion/motion.css`
11. `src/shared/components/glass/glass.tokens.css`
12. `src/shared/components/glass/glass.materials.css`
13. `src/shared/navigation/LiquidDock.css`

**Feature imports confirmed:**

| Feature owner | Stylesheet(s) | Loading boundary |
|---|---|---|
| HomeScreen | `home.css` → `home-ux.css` → `home-engine.css` → `home-redesign.css` → `home-architecture.css` | Home lazy-loaded after auth; all five styles imported by HomeScreen |
| LoginExperience | `login-experience.css` | Login experience |
| SettingsHub / ScannerSettingsPanel | `scanner-settings.css` | Settings/scanner settings lazy feature boundary |
| BarcodeScanner / StocktakeScanner | `scanner-transition.css` | Scanner presentation feature |
| StocktakeModule | `stocktake.css` | Stocktake feature |
| StocktakeImportModule | `stocktake-import.css` | Import feature |
| PwaUpdatePrompt | `pwa-update-prompt.css` | Root-mounted PWA prompt |

The 24-file inventory is fully accounted for by root and feature stylesheet ownership at the inspected source baseline. The actual emitted CSS chunk graph and whether Vite extracts/duplicates CSS per chunk must be confirmed from a production build artifact; source import count alone does not establish transfer behavior.

## 4. Cascade and ownership findings

### 4.1 Home is a five-generation cascade

The five Home stylesheets are imported in a deterministic order and contain repeated rules for shared structures such as `.app-shell`, `.content-wrap`, `.home-spotlight`, `.topbar`, `.library-engine` and responsive navigation/layout classes.

Confirmed examples:
- `home.css` establishes the original shell, sidebar, topbar, content, hero, metrics, module and toast styles.
- `home-ux.css` overrides notification and spotlight presentation, including explicit animation suppression and later feature rules.
- `home-engine.css` redefines root-level `--retail-*` values and Home layout/spotlight structure.
- `home-redesign.css` defines another root-level `--ro-*` palette/radius/easing vocabulary and redefines `.app-shell`, global element styles and responsive behavior.
- `home-architecture.css` again adjusts Home content width, module-library grids, topbar and availability labels.

**Assessment:** this is the highest-priority stylesheet consolidation target. It is not safe to simply concatenate/delete four files: some later declarations are the only active layout implementation and some are intentional breakpoint/state overrides. First extract a selector/property ownership map and preserve computed output at representative states.

### 4.2 Global/mobile cascade overlap

- `base.css` declares a legacy blue/gray palette and global typography defaults.
- `theme.css` later establishes RetailOS semantic red/neutral/status tokens and overrides several legacy variables.
- `responsive.css` contains legacy layout selectors and breakpoint rules including 1500px, 1200px, 940px and 700px.
- `mobile-tuning.css` contains extensive mobile overrides, input font-size !important rules, repeated interaction timing aliases, and many feature selectors beyond Home.
- `interactions.css`, `native-experience.css`, `adaptive-appearance.css` and `performance.css` all contribute transition, active-state, animation or reduced-motion behavior.

**Confirmed risk:** the same semantic concern (responsive geometry, interaction response, power-conserve, blur reduction, reduced motion) is expressed in multiple files. This makes the effective result difficult to reason about and increases the risk of a later change silently overriding another.

**Not proven:** exact computed winner per element, media-query combination, pseudo-state, portal, browser engine or power preference. No deletion decision is made from selector text alone.

### 4.3 Legacy and token collision signals

The inspected source contains several competing variable vocabularies:
- Canonical semantic roles: `--color-brand-*`, `--color-text-*`, `--color-surface-*`, `--color-status-*`.
- Historical aliases: `--retail-red`, `--retail-ink`, `--text-primary`, `--surface-page`, `--color-success`, `--blue`, `--blue-dark`.
- Home-local root vocabularies: `--retail-*` in `home-engine.css`, `--ro-*` in `home-redesign.css`.
- Glass-local RGB/material vocabulary: `--glass-*`.
- Brand-local aliases: `--retailos-brand-*`.
- Motion-local tokens: `--motion-*`, plus legacy aliases in mobile styles.

Some are legitimate subsystem tokens; the problem is not the existence of namespaces. The risk is multiple owners expressing the same brand, semantic color, typography or interaction role with divergent literals.

**Decision:** `theme.css` remains the current semantic foundation authority; preserve compatibility aliases until all consumers migrate. Glass and Motion keep specialized tokens for their own physical/material and temporal contracts. Home-local root tokens should be migrated into semantic roles or explicit feature tokens only after a property/callsite map confirms equivalent meaning.

## 5. Brand and semantic color readiness

### 5.1 Current facts

- Current canonical brand primary is `#d92736`, deep is `#a91829`, soft is `#fff0f1`.
- `home-engine.css` declares another red family (`#d91e30`, `#9f1426`).
- `home-redesign.css` declares another (`#e51f2d`, `#a90f22`).
- Brand, Glass and feature styles also contain direct color literals and translucent overlays.
- Semantic status colors exist: success, warning, danger, info and neutral.
- Existing Phase 01 contrast checks covered selected solid foreground tokens on pure white. They do not validate every tinted surface, translucent Glass composition, gradient, image, disabled state or feature state.

### 5.2 Disposition

**KEEP:** semantic status distinction and the existing canonical token roles.

**DO NOT YET LOCK:** final burgundy HEX family, surface tonal palette, gradients, light/dark balance or contrast pairs. The owner-confirmed direction is burgundy/dark red, not a specific value.

**Required palette comparison:** compare at least two controlled burgundy families on real Login, Home, Library, Stocktake, Import and Settings surfaces. Include normal/hover/focus/pressed/disabled/success/warning/error, text, chart/data and overlay states. Verify WCAG contrast on actual composited backgrounds, not only pure white.

The final palette must remain recognizably RetailOS, not a generic all-red interface. Brand color is an accent and hierarchy tool, not the background for every panel.

## 6. Typography audit

### 6.1 Current source facts

- `theme.css` currently declares `Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
- `base.css` has a separate Inter/system stack.
- No `@font-face` declaration or font file is present in the inspected tracked tree.
- `--font-family-ui` and `--font-family-data` roles already exist; semantic typography sizes/weights/line heights and tabular numeral intent are present.
- Existing Login and feature CSS still include many direct px sizes, including small metadata; mobile overrides partially raise some small labels.

### 6.2 Candidate evaluation

**Leading candidate for controlled prototype:** Be Vietnam Pro. The upstream Google Fonts metadata identifies the Vietnamese subset and OFL license; the upstream project describes refined Vietnamese diacritic forms. Fontsource documents OFL-1.1 and self-hosting/package guidance. This makes it a practical candidate for a self-hosted PWA, not an automatic selection. Sources:
- Google Fonts upstream metadata: https://github.com/google/fonts/blob/main/ofl/bevietnampro/METADATA.pb
- License: https://github.com/google/fonts/blob/main/ofl/bevietnampro/OFL.txt
- Fontsource family details: https://fontsource.org/fonts/be-vietnam-pro/about
- Upstream project: https://github.com/bettergui/BeVietnamPro

**Comparison baseline:** current Inter/system stack. A second candidate such as Noto Sans may be included only if the same specimen test shows a meaningful difference.

### 6.3 Required specimen and performance test

Compare current stack vs Be Vietnam Pro at 400/500/600/700 on:
- Vietnamese stacked diacritics: `ắ ằ ẳ ẵ ặ ấ ầ ẩ ẫ ậ ế ề ể ễ ệ ố ồ ổ ỗ ộ ớ ờ ở ỡ ợ ứ ừ ử ữ ự`.
- Retail labels and long text: `Kiểm kê hàng hóa`, `Nhập dữ liệu kiểm kê`, `Thay đổi giá bán`, `Không có dữ liệu phù hợp`.
- Dense table headers, barcode/product identifiers, employee names, department names, dates and currency.
- Numerals with tabular alignment for quantity, price and stock.

Evaluate glyph correctness, dấu placement at 11–14px, wrapping, line height, weight distinction, perceived density, WOFF2 bytes, cache reuse, font-display behavior, fallback shift and offline first render.

**Recommended implementation shape if accepted later:** self-host WOFF2 in the repository, subset to Latin + Vietnamese as licensed/generated upstream files permit, use only needed weights, declare explicit `font-display: swap`, preload only the critical regular face if measurements justify it, and retain a stable system fallback. Do not use a remote runtime font service.

No font is downloaded, bundled or selected by M0-A2.

## 7. Retail imagery and asset pipeline

### 7.1 Current source facts

- Recursive source tree contains only `public/icon.svg` among common image/vector/font asset extensions.
- No retail photography, WebP/AVIF image, WOFF/WOFF2/TTF/OTF font or local image library is present in the inspected tracked tree.
- `index.html` uses `lang="vi"`, viewport-fit cover and the current light theme-color.
- Vite's `retailos-pwa-artifacts` plugin enumerates generated `assets/*` and non-shell public files into the release asset manifest with size and SHA-256. This is a useful integrity/caching foundation for versioned local imagery.

### 7.2 Target asset policy

Authentic retail imagery should be an authored visual anchor, not a wallpaper layer behind dense controls.

Required policy:
1. Use owned, commissioned or explicitly licensed imagery; record source, license, permitted use, attribution if required and replacement terms.
2. Prefer local/versioned delivery through the existing Vite build and PWA asset manifest; no core workflow should depend on a third-party image URL.
3. Provide responsive variants/crops for desktop, tablet and mobile; use AVIF/WebP with fallback only where browser/build support justifies it.
4. Use `srcset`/sizes or equivalent responsive asset selection; do not download desktop hero dimensions on small devices.
5. Set intrinsic dimensions/aspect ratio to prevent layout shift; define object-position per crop.
6. Lazy-load below-the-fold/editorial images; keep only the first viewport's meaningful hero image eager when justified.
7. Compress and measure decoded dimensions, transfer bytes and decode cost; large photography can cost more memory than its compressed file size suggests.
8. Include local placeholder/fallback and ensure offline PWA behavior. Image failure must not block login, stocktake, import, scanner or data operations.
9. Avoid multiple full-viewport background images, large transparent PNG overlays and continuous parallax as defaults.

**Image role map for prototype planning:**
- Login: one authentic operational/editorial image can anchor the brand story without compromising form contrast.
- Home: a restrained retail/operations image or crop can support the primary operational message; do not invent KPIs.
- Module Library: small contextual crops only if they improve category recognition; icons may remain more efficient.
- Stocktake/Import: task clarity and data density take precedence; photography is optional and should not consume workspace area.
- Settings: no decorative image requirement.

No image vendor, stock source or asset is approved by this audit.

## 8. Materials, motion and low-end performance

### 8.1 Existing performance controls

Confirmed source includes:
- Glass material blur and saturation variables with `data-power-mode="conserve"` overrides.
- `performance.css` and `adaptive-appearance.css` remove blur from many surfaces on smaller/coarse-pointer contexts and power-conserve mode.
- `motion.css`, global responsive styles, native experience and feature styles implement reduced-motion behavior.
- `mobile-tuning.css` changes interaction duration aliases and includes additional animation/transition rules.
- Native experience and Home styles include decorative gradients, pseudo-elements, orbits and animations.
- Scanner presentation transitions are separate from camera teardown; scanner engine remains protected.

### 8.2 Risks to measure

- Multiple blur/backdrop surfaces can increase compositing cost, especially over large moving/translucent regions.
- Large fixed pseudo-element backgrounds and animated transforms may increase paint/compositing work.
- Several reduced-motion/power-conserve rules can conflict by source order and specificity; a reduced duration is not always equivalent to removing a costly effect.
- `will-change` and transform promotion must be temporary and evidence-driven, not blanket defaults.
- Motion policy and input feedback are spread across global and feature CSS. Consolidation must not change immediate feedback or feature lifecycle semantics.

### 8.3 Required performance budget

No numeric budget is approved yet. Establish baseline measurements on a mid-range desktop and representative lower-end Android device before choosing thresholds:
- CSS transfer size (gzip/Brotli) and parsed CSS;
- first contentful/meaningful paint and layout shift;
- image transfer/decode/memory;
- long tasks and interaction latency;
- frame stability during representative transitions/scroll;
- memory under Home + operational feature navigation;
- reduced-motion and power-conserve correctness.

Use browser performance traces and physical devices. CI build size is useful but does not replace runtime profiling.

## 9. KEEP / CONSOLIDATE / REPLACE / RETIRE matrix

| Area | Decision | Rationale / condition |
|---|---|---|
| `theme.css` semantic roles | **KEEP** | Existing canonical token foundation; migrate consumers and aliases incrementally |
| `base.css` legacy globals | **CONSOLIDATE** | Remove competing global palette/type declarations only after verifying consumer and fallback behavior |
| `responsive.css` + `mobile-tuning.css` | **CONSOLIDATE** | Responsive ownership fragmented; preserve every meaningful breakpoint/state and mobile form behavior |
| `mobile-tuning.css` file itself | **KEEP temporarily / CONSOLIDATE in batches** | Large and high-risk; not proven dead; no whole-file deletion |
| Five Home stylesheets | **CONSOLIDATE** | Highest cascade hotspot; merge by structural owner after computed-style and screenshot parity |
| Login stylesheet | **KEEP** | Feature-owned and currently comparatively bounded; migrate remaining tokens/type roles after font/palette decision |
| Stocktake stylesheet | **KEEP** | Feature-owned operational density and camera presentation |
| Stocktake Import stylesheet | **KEEP** | Large because workflow is dense; preserve editable grid, conflict, validation and output states |
| Brand CSS | **KEEP** | Single brand-mark/wordmark owner; reconcile literal aliases to semantic tokens |
| Motion CSS | **KEEP** | Preference/timing owner; later consolidate duplicated policy rules without changing choreography |
| Glass tokens/materials | **KEEP selectively** | Existing subsystem; retain only materials that provide distinct visual value after surface comparison |
| LiquidDock CSS | **KEEP until nav presentation is replaced** | Active component; its current role is Home navigation, not future route contract |
| Performance/adaptive/native styles | **CONSOLIDATE** | Duplicate blur, motion, power and global presentation rules; preserve device fallback behavior |
| PWA prompt CSS | **KEEP** | Release lifecycle presentation is isolated and protected |
| Scanner transition CSS | **KEEP** | Scanner presentation-only contract, not engine |
| Scanner Settings CSS | **KEEP pending Settings redesign** | Shared Settings/scanner preference surface |
| Font family | **EVALUATE** | Be Vietnam Pro is candidate; no adoption before visual and byte comparison |
| Brand palette | **EVALUATE** | Burgundy direction accepted; exact values remain open |
| Retail imagery | **ADOPT ASSET PIPELINE, NOT VENDOR** | Local licensed/versioned responsive images; no remote runtime dependency |
| New CSS framework/component library | **DEFER** | No evidence of a gap that justifies dependency cost |
| New font/image CDN runtime dependency | **REJECT for core PWA path** | Offline and predictable first render require local assets |

No CSS file is marked RETIRE at this stage. A safe retirement decision requires proof of no source/runtime consumers and no computed contribution.

## 10. Priority findings and action plan

| ID | Priority | Finding | Required action |
|---|---|---|---|
| A2-01 | Critical | Five Home CSS generations style overlapping structures | Build selector/property ownership map and rendered parity baseline before consolidation |
| A2-02 | Critical | Mobile overrides are 23.9% of tracked CSS and include broad rules | Partition by owner (global responsive, Login, Home, operational features) with tests; do not delete by size |
| A2-03 | High | Root import order makes global CSS source-order-sensitive | Document import contract; move to fewer explicit owners only after browser parity |
| A2-04 | High | Token vocabulary duplicates canonical roles and local aliases | Establish token mapping and migrate consumers in small value-preserving batches |
| A2-05 | High | Three competing Home red families remain | Compare burgundy palettes on all surfaces; use one approved semantic family after owner review |
| A2-06 | High | Typography not bundled and Vietnamese rendering not visually validated | Compare current stack with Be Vietnam Pro using real content and WOFF2 budget |
| A2-07 | High | No retail photography assets exist in the runtime tree | Establish license/asset manifest, crops, optimization and offline fallback |
| A2-08 | High | Blur/reduced-motion/power rules overlap across files | Map policy ownership and profile actual runtime before consolidating |
| A2-09 | Medium | Several global rules remain in feature/brand/Home CSS | Separate global semantic foundations from feature-specific presentation |
| A2-10 | Medium | CSS source bytes do not reveal emitted chunk transfer | Inspect production build artifacts and compressed CSS by entry/feature |
| A2-11 | Medium | Responsive thresholds differ by stylesheet | Preserve task-specific breakpoints but document semantic viewport behavior; do not force one breakpoint for all features |
| A2-12 | Medium | Contrast checks are partial | Test actual composited text/control states, imagery, gradients, Glass and status colors |

### Recommended execution order

1. **A2.1 — Runtime evidence:** run current main in browser, capture desktop/tablet/mobile screenshots and computed-style snapshots for Login, Home, Library, Stocktake, Import and Settings; record console/network errors.
2. **A2.2 — Selector ownership:** parse all CSS selectors and declarations; trace TSX class consumers, dynamic classes, portals and media/state variants; create property-level owner matrix.
3. **A2.3 — Token reconciliation:** map legacy/local tokens to canonical roles; mark semantic mismatch and preserve legitimate Glass/Motion subsystem namespaces.
4. **A2.4 — Typography specimen:** compare current stack and Be Vietnam Pro, local WOFF2 subsets and real Vietnamese data density.
5. **A2.5 — Imagery pipeline:** establish asset rights metadata, crop variants, optimization, offline and fallback behavior.
6. **A2.6 — First safe consolidation slice:** only after visual parity evidence, choose the smallest high-value area (likely Home style generations or duplicate global motion/blur policy) and add Playwright coverage.
7. Re-run preflight, TypeScript, Pages build, bundle comparison and browser/device checks; record exact before/after evidence.

## 11. Verification gaps and completion boundary

### Completed in this source audit
- [x] Enumerate all 24 tracked CSS files and raw byte sizes.
- [x] Confirm root CSS import order.
- [x] Confirm Home and feature CSS ownership/imports.
- [x] Identify high-risk cascade and repeated token vocabularies.
- [x] Inspect current brand/status/token and typography declarations.
- [x] Inspect font and image asset presence in tracked tree.
- [x] Inspect Vite release asset-manifest handling.
- [x] Map existing Glass/Motion/power-conserve/reduced-motion policy owners.
- [x] Produce KEEP / CONSOLIDATE / REPLACE / RETIRE matrix and priority plan.

### Not completed — requires running application/browser or device
- [ ] Computed-style winner matrix for all target surfaces and states.
- [ ] Screenshot review at 1440, 1280, 1024, 768, 390, 360 and short landscape.
- [ ] Selector/property-level duplicate and unused-rule proof.
- [ ] Emitted production CSS chunk sizes and compressed transfer bytes.
- [ ] Font specimen visual comparison and actual WOFF2 payload.
- [ ] Licensed image selection and responsive crop validation.
- [ ] Paint/compositing, interaction latency, memory and frame profiling.
- [ ] Physical iOS/Android low/mid-range acceptance.

**M0-A2 source/design-system audit result:** the source inventory and decision matrix are complete. The full M0-A2 exit gate remains open until runtime/computed-style and visual/performance evidence above is collected. Static GitHub source access cannot honestly certify these runtime items.

## 12. Next phase dependencies

M0-A3 Motion Audit may proceed in parallel at the source/documentation level, but motion token/choreography changes must wait for A2.1 runtime evidence because existing motion, reduced-motion and power-conserve rules overlap.

M0-A4 Runtime/Performance Audit should collect the runtime measurements listed above and close the browser/device gaps. The first CSS consolidation implementation must not begin until A2.1–A2.3 establish a reproducible baseline.

M0-A5 technology decisions remain open. No new framework, font runtime service, image CDN, CSS framework or animation package is justified by this audit.

## 13. Sources and references

Repository evidence:
- `src/main.tsx`, `src/styles/*.css`, `src/shared/*/*.css`, feature CSS files listed in section 3.
- `src/features/home/HomeScreen.tsx`, `src/features/auth/screens/LoginExperience.tsx`, Stocktake and Stocktake Import components.
- `index.html`, `vite.config.ts`, `package.json`.
- `UI_UX_M0_GOVERNING_SPEC.md` — active authority.
- `UI_UX_M0_A_SOURCE_BASELINE_AUDIT.md` — current screen/source baseline.
- `UI_UX_PHASE_00_AUDIT.md` and `UI_UX_PHASE_01_FOUNDATION.md` — historical source evidence only.

External font evidence:
- https://github.com/google/fonts/blob/main/ofl/bevietnampro/METADATA.pb
- https://github.com/google/fonts/blob/main/ofl/bevietnampro/OFL.txt
- https://fontsource.org/fonts/be-vietnam-pro/about
- https://github.com/bettergui/BeVietnamPro

No runtime source, CSS, asset, dependency, business logic, persistence, scanner engine, PWA lifecycle, deployment or production state is modified by this audit.


## 11. Runtime evidence — first CI capture (2026-11-26)

**Collector:** `tests/browser/runtime-evidence.spec.ts`  
**Source:** CI run [#1608](https://github.com/banjk124-hub/retailos-home/actions/runs/45751754448), exact head `7b5ac10f2e781a473896a5085cd1891436653dd0`; merged to main by `46eb2876c2a18f39e69a13dec86dc001dcadb8ff`.  
**Artifact:** `retailos-ui-runtime-evidence` (PNG + JSON, 9.24 MB archive; generated 2026-11-26 03:55 UTC).  
**CI result:** success. Preflight, PR-base build, bundle comparison, Chromium installation, responsive/runtime tests and artifact uploads all passed.

### 11.1 Confirmed runtime results

- Login captured at 1440×900.
- Authenticated Home captured at 1440×900, 1280×800, 1024×768, 768×1024, 390×844, 360×740 and 844×390.
- Settings, Library, Stocktake and Import interaction surfaces each produced a screenshot and JSON capture at 390×844.
- Browser page errors: 0.
- Console errors: 0.
- Failed requests: 0.
- Home horizontal overflow: 0 CSS pixels at all seven tested viewports.
- Duplicate DOM IDs: none in the captured Login/Home/feature states.
- Captured computed font stack remains Inter/system fallback; this is not a font-family visual comparison.
- The Home capture reports 1,970 CSSOM rules with 1,409 zero-match selectors at desktop; feature captures report different totals as lazy stylesheets load (e.g. Import: 2,344 rules / 1,728 zero-match selectors).

### 11.2 Interpretation limits — do not overclaim

The current feature navigation opens operational surfaces as overlays/drawers over Home. The screenshots and DOM captures therefore prove the observed overlay state at the captured viewport; they do **not** prove a standalone full-page route or every internal interaction state for each feature.

The current collector records DOM geometry, a selected computed-style property set, CSSOM selector text, stylesheet origin, media/group condition and document-wide selector match count. It does **not** yet provide:
- a per-element, per-property declaration/cascade winner trace (including specificity, source order, `!important`, pseudo-state and inherited values);
- exhaustive state coverage (open/closed/hover/focus/pressed/disabled, nested dialogs, scroll positions and data-loaded states);
- CSS transfer size per emitted chunk with gzip/Brotli comparison;
- navigation/resource timing, LCP/CLS/INP, long-task, paint/compositing or memory profiles;
- a Be Vietnam Pro vs Inter specimen rendered and measured in the same production build;
- physical-device measurements on representative low-end Android hardware.

A zero-match CSS selector is only a candidate for investigation. It may be active under another viewport, pseudo-state, DOM route, feature load, browser condition or dynamic class. **No rule may be retired from this count alone.**

### 11.3 Visual inspection observations

The first artifact was visually inspected as screenshots, not inferred from JSON alone:
- Home renders at all tested viewport dimensions without horizontal document overflow.
- At 390×844, Stocktake opens as a bottom-sheet style overlay while the Home content remains behind it; this confirms the overlay ownership noted above.
- Library and Settings likewise retain the Home surface behind their overlay presentation.
- Import opens a compact operational overlay/panel; this capture is not sufficient to assess its complete desktop/tablet layout or all import workflow states.
- The screenshot set is suitable as a first baseline, but it is not yet an acceptance review of all responsive feature states.

### 11.4 Required next instrumentation and review

Before the first CSS consolidation batch, extend the collector to:
1. record explicit UI state identity (active dialog/drawer, owning feature, trigger, open/closed state) and assert that each intended feature surface was actually reached;
2. record matched declarations for representative visible elements and key properties, preserving selector, stylesheet, media condition, specificity, source order and importance alongside the browser-computed result;
3. capture loaded CSS resource sizes and production asset/chunk metadata, then calculate raw, gzip and Brotli sizes reproducibly;
4. collect browser Performance API navigation/resource/paint/layout-shift/long-task entries where supported, clearly labelling unsupported metrics;
5. add repeatable typography specimens and palette comparison pages/states without changing production tokens;
6. expand viewport/state coverage and add independent feature-shell coverage only where the product's existing navigation architecture supports it; do not invent routes or alter module ownership to satisfy the test;
7. review screenshots and evidence before marking any selector KEEP / CONSOLIDATE / RETIRE.

**M0-A2 status:** source inventory and first browser baseline are complete. Runtime capture is now available and has passed CI. The phase remains **IN PROGRESS**: declaration-level cascade tracing, compressed CSS delivery, typography/palette comparison and meaningful runtime/device performance evidence are outstanding. No production CSS consolidation, font selection, palette lock or asset rollout is authorized by this evidence.


### 11.5 Production CSS delivery evidence

The same CI run produced a production Vite manifest and bundle report for both PR base and current build. The comparison is byte-identical (no application source changed in the collector PR).

| Emitted CSS asset | Raw bytes | Gzip estimate |
|---|---:|---:|
| Initial entry CSS `index-eg8HbfT8.css` | 184,450 | 33,833 |
| Home CSS `HomeScreen-Clo8TzLy.css` | 61,698 | 12,967 |
| Stocktake Import CSS `StocktakeImportModule-DT0zH9yJ.css` | 45,027 | 7,684 |
| Stocktake CSS `StocktakeModule-BgupU28_.css` | 11,874 | 2,941 |
| Scanner settings CSS `scanner-settings-B2Oi1WUG.css` | 6,803 | 1,840 |
| Scanner preview binding CSS `useScannerPreviewRegionBinding-BQ3FTI0D.css` | 7,287 | 1,644 |

The emitted CSS files total **317,139 raw bytes (~309.7 KiB)** and **60,909 bytes (~59.5 KiB) gzip estimate** when summing per-file gzip outputs. The entry CSS is the largest single CSS asset. This is build-artifact evidence, not a measurement of actual transfer in a particular browser session; per-file gzip estimates do not include HTTP content negotiation, caching, Brotli, request headers or compression behavior at the hosting edge.

The full release artifact report lists 30 files, 1,918,252 raw bytes and 676,768 bytes gzip estimate (per-file sum). Initial JS entry closure is 398,451 raw / 100,783 gzip estimate. Scanner WASM remains a separately emitted 946,860-byte raw / 411,054-byte gzip-estimate asset; this is existing scanner delivery, not part of the CSS consolidation scope.

The CI base-vs-current bundle comparison is exactly zero delta for entrypoint raw/gzip and total raw/gzip. This confirms the evidence-tooling change did not alter the application bundle.

**Decision:** emitted CSS size is now measured. It identifies the entry CSS and Home CSS as the two largest CSS payloads, but does not justify deletion or re-partitioning without selector/property ownership and visual regression evidence.


## 10. Runtime evidence — CI run #1614

**Exact source commit:** `807705dfb98b7b1143eee230a33e47e18022f274`  
**CI run:** #1614 / `45753970838` — completed successfully.  
**Artifacts:** `retailos-ui-runtime-evidence` (10.6 MB ZIP; 50.2 MB uncompressed) and `retailos-bundle-analysis`.  
**Environment:** synthetic local session, Chromium / Playwright, GitHub Pages production build. This is lab evidence, not physical-device acceptance.

### 10.1 Runtime health and responsive geometry

- Browser/page errors: **0**.
- Console errors: **0**.
- Failed requests: **0**.
- Duplicate IDs: **0** across captured states.
- Home horizontal overflow: **0 px** at all seven tested viewports: 1440×900, 1280×800, 1024×768, 768×1024, 390×844, 360×740 and 844×390.
- Login captured at desktop, tablet, mobile, compact mobile and short landscape.
- Home captured at all seven viewports; Settings, Library, Stocktake and Import captured as reachable overlays at 390×844.
- Feature captures remain overlay states over Home. They do not prove standalone route behavior or every internal workflow state.

### 10.2 Actual emitted CSS / CSSOM

The Home runtime page exposed **two emitted stylesheet resources**, not thirteen independent browser stylesheets:
- `index-eg8HbfT8.css`: 765 CSS rules.
- `HomeScreen-Clo8TzLy.css`: 432 CSS rules.

The source import graph and production CSS chunk graph are different views of ownership. Root imports are consolidated by Vite into the entry CSS chunk; Home's lazy feature styles are emitted as a separate Home CSS chunk.

Observed CSSOM counts by state:
| State / viewport | CSS rules | Zero-match selectors |
|---|---:|---:|
| Login 1440×900 | 765 | 638 |
| Home 1440×900 | 1,197 | 897 |
| Home 1280×800 | 1,197 | 897 |
| Home 1024×768 | 1,216 | 908 |
| Home 768×1024 | 1,253 | 933 |
| Home 390×844 | 1,791 | 1,302 |
| Home 360×740 | 1,847 | 1,337 |
| Home 844×390 | 1,288 | 968 |
| Settings 390×844 | 1,853 | 1,343 |
| Library 390×844 | 1,791 | 1,256 |
| Stocktake 390×844 | 1,931 | 1,409 |
| Import 390×844 | 2,149 | 1,611 |

Zero-match means no current element matched the selector in that captured state. It does not account for every state, interaction, portal, pseudo-element, route, conditional class or future module. It is not a deletion list.

### 10.3 Declaration trace and collector correction

The first declaration-level artifact contains 180 visible DOM nodes per state (bounded sample) and records 688 declaration candidates across the selected properties for Home desktop. Computed values are recorded beside candidate declarations.

**Audit correction:** inspection of the first artifact revealed that the specificity tokenizer was over-escaped in the test collector, producing incorrect specificity tuples for ordinary class selectors. The collector was corrected in commit `83bf99f56695f3e4a15f80a3ce705c667d723f05`; its new CI run must pass and its artifact must be inspected before specificity data is used. The original #1614 trace remains valid for selectors, declarations, source stylesheet, conditions and computed styles, but **its specificity values are invalid and must not be used**.

Even after the correction, specificity remains approximate: selector-list handling, complex `:is()`/`:not()`/`:has()` arguments, cascade layers, pseudo-elements, inherited declarations and `@container` conditions are not a complete browser cascade implementation. Candidate ordering is diagnostic, not a guaranteed winner simulation. The browser's computed style remains authoritative for the final value; declaration ownership requires manual source reconciliation.

### 10.4 Visual review notes (observed, not yet change authorization)

- Desktop Home is horizontally stable, but the hero's alert/notice surface and decorative calendar artwork visually compete in the right half; their relative hierarchy and clipping deserve a focused design review.
- Mobile Home has no horizontal overflow, but the floating bottom navigation visibly overlays the first module card/action area. This is an interaction/available-viewport issue to verify against intended dock behavior, not a CSS cleanup candidate.
- Import overlay occupies most of the mobile viewport and leaves substantial blank space in the captured empty state. Confirm whether this is intentional sheet behavior before redesigning.
- These are visual observations from synthetic session screenshots; no production CSS has been changed.

### 10.5 Bundle comparison

The same CI run reports no bundle delta between base and current:
- Initial entrypoint closure: 398,451 raw / 100,783 per-file gzip-estimate bytes.
- All emitted files: 1,918,252 raw / 676,769 per-file gzip-estimate bytes.
- Delta: 0 bytes for both metrics.

These are per-file gzip estimates, not measured Brotli or actual transfer sizes. Navigation/resource timing in the synthetic local run is not suitable for network-performance conclusions; same-origin cached resources report zero transfer size in several captures. Physical low-end device profiling remains open.

### 10.6 Current disposition

1. Keep all current production CSS and tokens unchanged.
2. Corrected declaration trace must be regenerated and inspected before a cascade ownership matrix is accepted.
3. Next evidence batch: selector/property ownership grouped by emitted CSS resource and source file; verify actual winner samples against computed style; add Brotli estimates; then build controlled typography/palette specimens without changing production assets.
4. No CSS selector or stylesheet is approved for retirement yet.


## 10.7 Corrected cascade trace and Brotli verification — CI run #1619

**Source commit:** `ed735e20285606ded9e5a762731aaed88313f81a`  
**CI run:** #1619 / `45754955994` — all preflight, production builds, bundle analysis, Playwright runtime capture and artifact upload steps passed.  
**Runtime artifact:** `retailos-ui-runtime-evidence`, 10,581,372 bytes.  
**Bundle artifact:** `retailos-bundle-analysis`, 8,216 bytes.

### Runtime health confirmation

The regenerated artifact confirms:
- Aggregate browser/page errors: **0**.
- Failed requests: **0**.
- Duplicate IDs: **0** in every captured JSON state.
- Home horizontal overflow: **0 px** at all seven tested viewport sizes.
- Cascade trace: up to 180 visible DOM nodes per state, with declaration candidates grouped by computed property and stylesheet.

This remains a synthetic Chromium test with a seeded local session. It does not establish real-device performance, live backend behavior, or all possible UI states.

### Corrected specificity trace

The over-escaped tokenizer was corrected and regenerated in #1619. Ordinary class selector `.retailos-scene` now records specificity `[0,1,0]`, as expected. The corrected trace contains:
- Home desktop: 180 sampled nodes, 688 declaration candidates; 447 candidates from `index-eg8HbfT8.css`, 241 from `HomeScreen-Clo8TzLy.css`.
- Home mobile (390×844): 180 sampled nodes, 746 declaration candidates; 381 from `index-eg8HbfT8.css`, 365 from `HomeScreen-Clo8TzLy.css`.

A literal declaration-value comparison matched the computed property string for 342/688 desktop candidates and 335/747 mobile candidates. **This is not a winner-rate metric**: shorthand expansion, inheritance, CSS variables, normalization and cascade layers mean equal strings or candidate order do not prove declaration ownership. The trace is useful for narrowing source review, not automated cascade resolution.

### Bundle size with Brotli

CI measured per-file compression estimates for 30 emitted files:
| Metric | Size |
|---|---:|
| Total raw | 1,918,252 bytes |
| Per-file gzip sum | 676,759 bytes |
| Per-file Brotli sum (quality 11) | 553,587 bytes |
| Initial entry closure raw | 398,451 bytes |
| Initial entry closure gzip | 100,781 bytes |
| Initial entry closure Brotli | 86,526 bytes |

Baseline and current JSON summaries match exactly for raw and gzip metrics. Initial entrypoint closure metrics are also identical. Total Brotli differs by **-9 bytes** (baseline 553,596; current 553,587), while raw and gzip totals are unchanged. This tiny difference is attributable to emitted file content such as release-manifest metadata and is not evidence of a meaningful bundle regression or optimization. Per-file sums do not model shared compression dictionaries or prove actual CDN/browser transfer size.

**Follow-up correction:** the generated Markdown comparison initially omitted Brotli despite the JSON report containing it. The next audit batch adds `entrypointBrotliBytes` to the summary and includes both entrypoint and total Brotli deltas in `compare-bundle-reports.mjs`. This is reporting completeness only; it does not alter the application bundle.

### Visual and geometry observations

The 390×844 Home capture shows the LiquidDock fixed at approximately `y=769` with a 56 px control height. It visually overlays the first module card's lower content while the page continues scrolling beneath it. This is a concrete geometry finding to review against the intended dock contract; it is not yet approved for a production CSS patch.

The desktop Home hero also needs a separate hierarchy review between the notice panel and decorative calendar artwork. The empty Import overlay is large relative to its captured empty-state content. These remain design-review findings, not automatic defects.

### Disposition after #1619

1. Keep production stylesheets and tokens unchanged.
2. Accept corrected selector/declaration trace as diagnostic evidence only; no automated CSS retirement.
3. Complete CSS ownership reconciliation using source-file imports and runtime candidates, including inherited/custom-property and cascade-layer limitations.
4. Fix the comparison report's Brotli omission and rerun CI.
5. Build isolated, test-only typography and palette specimens. Do not ship a font, image asset or palette change until visual, licensing, loading and low-end-device criteria are met.
6. Investigate the mobile dock/content overlap as a bounded UI issue, preserving the existing LiquidDock behavior and navigation semantics.


## 10.8 Mobile dock overlap — measured geometry

The latest #1621 artifact confirms a specific overlap in the initial Home viewport at 390×844:

| Element | Measured rectangle |
|---|---|
| First Library group card | x=14, y=578, w=362, h=210 |
| LiquidDock | x=12, y=758, w=366, h=78 |
| Vertical intersection | **30 px** |

The dock covers the bottom 30 px of the first module card at the initial scroll position. The screenshot shows the card's lower action/link area visually passing underneath the dock. This is not inferred from CSS source alone; it is supported by the captured DOM rectangles and screenshot.

The Home content container has a computed bottom padding of 108 px in this capture, but that only protects the end of the scrollable content; it does not prevent a fixed dock from intersecting a card at the current initial scroll position. Increasing bottom padding alone is therefore not a complete fix.

The dock is intentionally fixed and owns navigation semantics. Do not change it to static/sticky, hide it opportunistically, or alter its interaction model as a quick workaround. Next step is a bounded Playwright experiment with alternative *content layout spacing/initial viewport composition* and exact before/after rectangles at 390×844, 360×740, and short landscape. Any candidate must preserve all module actions, avoid introducing a large dead gap, and retain safe-area behavior. No production CSS change is included in this audit batch.

## 10.9 Runtime CSS ownership snapshot

For the sampled visible nodes, the declaration trace groups candidates by the two emitted CSS resources actually loaded on Home:
- `index-eg8HbfT8.css`: shared application styles and global foundations.
- `HomeScreen-Clo8TzLy.css`: Home feature styles.

At 390×844, 382 sampled declaration candidates originate from the shared resource and 365 from the Home resource. At 1440×900, the split is 447 and 241 respectively. These are candidate counts across the sampled nodes/properties, **not selector counts, stylesheet contribution percentages, or winning declarations**.

The mobile capture contains repeated selectors across both emitted resources, including `.app-shell`, `.app-shell .home-spotlight`, `.app-shell .spotlight-main-content`, `.app-shell .spotlight-notifications`, `.topbar`, `.topbar-actions`, `.search-field` and `.section-heading p`. This validates the cascade hotspot at runtime but does not establish duplication as accidental: media conditions, selector specificity, source order, custom properties and responsive overrides still need source-level reconciliation.

No selector or stylesheet is approved for retirement based on these counts.
