# AUDIT-03B — CSS Cascade Ownership Map

**Status:** Static ownership/cascade inventory complete; no cleanup or runtime changes proposed in this phase  
**Audited ref:** `main` at `8b204a20d0959e291e4835f5977f0b313e56ab60`  
**Method:** Recursive Git tree, source import-site inspection, selector inventory and cross-file selector overlap scan. Selector parsing is heuristic; this is not a CSS AST or computed-style audit.

## 1. Executive result

The current tree contains **34 tracked CSS files / 335,052 source bytes**. The earlier AUDIT-03 static inventory figures are historical and should not be reused as current-main totals.

Confirmed current-main delivery ownership:
- Root eager group: 11 imports from `src/main.tsx`, **143,796 bytes** raw source.
- Home: four ordered CSS imports from `HomeScreen.tsx`, **64,330 bytes** raw source; Home itself is a lazy feature entry.
- `mobile-tuning.css`: **76,291 bytes**, 587 selector/header blocks detected by a lightweight scan. It is a mixed global + Home + shared overlay stylesheet, not a mobile-only feature stylesheet.
- Stocktake Import CSS: **50,965 bytes**, remains feature-owned.
- The production AUDIT-03A baseline measured 9 emitted CSS chunks. This audit does not infer that source file boundaries map one-to-one to production chunks.

**Primary finding:** ownership is mostly feature-local for Login, Scanner, Stocktake, Stocktake Import, Surface, Navigation and PWA. The principal cascade risk is concentrated in three places: global `mobile-tuning.css`, Home's four-file ordered cascade (especially `home-redesign.css` global selectors), and duplicated cross-cutting interaction/motion policies.

## 2. Current ownership map

### 2.1 Root eager CSS

Imported in this exact order by `src/main.tsx`:

| Order | File | Bytes | Proposed responsibility / finding |
|---:|---|---:|---|
| 1 | `src/styles/base.css` | 1,107 | Document defaults, box sizing, baseline typography and focus reset. Contains global `html`, `body`, form-control and universal selectors. |
| 2 | `src/styles/responsive.css` | 7,817 | Legacy responsive layout rules. Contains broad Home-era layout selectors; ownership should be narrowed before future edits. |
| 3 | `src/styles/theme.css` | 14,499 | Canonical semantic token authority plus compatibility aliases and a small set of legacy semantic component rules. |
| 4 | `src/styles/interactions.css` | 1,586 | Shared button interaction timing/press state and Home-specific readable metadata overrides. Responsibility is mixed. |
| 5 | `src/styles/mobile-tuning.css` | 76,291 | Global responsive/legacy override hotspot; also contains Home, calendar, notifications, modal, dock and residual Login selectors. |
| 6 | `src/styles/performance.css` | 987 | Device/viewport motion and shadow reductions. Overlaps with adaptive appearance and motion policy. |
| 7 | `src/styles/adaptive-appearance.css` | 4,191 | Power-conserve, touch target and app-library adaptation; also repeats interaction and reduced-motion behavior. |
| 8 | `src/styles/native-experience.css` | 7,885 | Background and shared native-like interaction styling; includes Home-specific selectors and its own reduced-motion rules. |
| 9 | `src/shared/brand/brand.css` | 6,645 | Brand primitives and department identity. |
| 10 | `src/shared/motion/motion.css` | 11,112 | Shared motion primitives and motion-state policy. Other global files still declare overlapping motion behavior. |
| 11 | `src/shared/navigation/LiquidDock.css` | 11,676 | Shared navigation/dock presentation; verify its global selectors remain limited to navigation primitives. |

Root eager raw source total: **143,796 bytes**.

### 2.2 Feature/shared-owned stylesheets

| Owner | Stylesheets | Ownership disposition |
|---|---|---|
| Home | `home.css`, `home-ux.css`, `home-engine.css`, `home-redesign.css` | Preserve order until browser cascade winners are captured. Do not consolidate based on source overlap alone. |
| Login | `login-experience.css`, `login-compact-landscape.css` | Keep Login-owned. `mobile-tuning.css` retains a small residual Login selector group; verify whether still live before retirement. |
| Scanner | `barcode-scanner-presentation.css`, `scanner-shared-controls.css` | Keep Scanner presentation isolated. Do not mix with camera/runtime ownership. |
| Stocktake | `stocktake.css`, `stocktake-scanner-presentation.css` | Keep Stocktake-owned. |
| Stocktake Import | `stocktake-import.css` | Keep cohesive and feature-owned despite size. |
| Settings | `settings-hub.css`, `settings-dialog.css`, `scanner-preferences.css` | Keep Settings/dialog/preference boundaries; only share rules with demonstrated shared semantics. |
| Shared primitives | `surface.css`, `motion.css`, `brand.css` | Shared owner; consumers should use semantic contracts rather than duplicate local implementations. |
| Navigation | `LiquidDock.css`, `DesktopShellNavigation.css`, `MobileShellNavigation.css`, `TabletShellNavigation.css` | Keep platform presentation split and shared identity contract intact. |
| PWA | `pwa-update-prompt.css` | Keep PWA update UI isolated. No update lifecycle changes in AUDIT-03B. |
| Platform Home presentations | `DesktopHomePresentation.css`, `MobileHomePresentation.css`, `TabletHomeCompatibilityPresentation.css` | Files are currently tiny (55–56 bytes each); verify whether these are intentional placeholders before assigning substantive styling. |

## 3. Cascade findings

### C03B-01 — `mobile-tuning.css` has mixed ownership, not a single mobile owner

**Confirmed**
- 76,291 source bytes and 587 selector/header blocks in a lightweight selector scan.
- Broad selectors include `button, a, input, select, textarea`, `html`, `body`, `input`, `select` and `textarea`.
- Selector groups target Home shell/cards/metrics/navigation, calendar, notification popovers, modal surfaces, dock and residual Login presentation.
- Exact normalized selector overlap scan found 57 selectors also present in `home.css`, 7 in `home-ux.css`, 11 in `home-engine.css`, and 13 in `home-redesign.css`.

**Assessment**
This stylesheet has accumulated several ownership domains and broad specificity overrides. Selector overlap is a review signal, not proof of conflicting declarations: property-level winners and media conditions have not yet been verified in a browser.

**Ownership target**
- Document defaults → `base.css`.
- Shared interaction semantics → `interactions.css` or shared primitive owner.
- Responsive layout → the owning feature stylesheet, except for narrowly defined shared breakpoint utilities.
- Home presentation → Home's feature CSS.
- Calendar/notification/modal styles → the component/feature that owns those surfaces.
- Residual Login selectors → Login owner, only after runtime parity is demonstrated.

Do not move or delete rules in this phase.

### C03B-02 — Home cascade has both order coupling and a global-selector boundary leak

**Confirmed**
- `HomeScreen.tsx` imports, in order: `home.css` → `home-ux.css` → `home-engine.css` → `home-redesign.css`.
- Combined source size: 64,330 bytes.
- The lightweight overlap scan found exact normalized selectors across these files: Home base ↔ redesign 8; Home base ↔ engine 1; UX ↔ engine 5; engine ↔ redesign 12; UX ↔ redesign 1. These counts are selector intersections, not declaration conflicts.
- `home-redesign.css` includes global selectors for `html`, `body`, `button, a, input, select`, `button`, a global focus selector using `:where(...)`, and `*, *::before, *::after`.

**Assessment**
The four-file import order is part of the current cascade contract. More importantly, a stylesheet imported by the Home feature still applies document-wide when loaded: its global selectors cross the Home ownership boundary. The global reset/focus declarations are therefore not truly Home-local.

**Ownership target**
- Keep Home component selectors under an explicit Home root or feature namespace.
- Move document-wide reset/focus rules only to the foundation owner after comparing computed styles.
- Preserve the existing import order until desktop/mobile/narrow-landscape computed-style baselines exist.

### C03B-03 — Interaction, motion and adaptive policies are distributed

**Confirmed**
- `base.css`, `interactions.css`, `adaptive-appearance.css`, `native-experience.css`, `performance.css`, `mobile-tuning.css` and shared `motion.css` each contain parts of focus, active, transition, reduced-motion, animation or power-conserve behavior.
- `interactions.css` defines button active scaling and transition timing.
- `adaptive-appearance.css` defines app-shell button/link active and transition behavior, touch target minimums and reduced-motion rules.
- `native-experience.css` defines .ro-button interaction states and reduced-motion rules.
- `performance.css` disables selected effects at device/viewport breakpoints and under reduced motion.
- `mobile-tuning.css` contains broad reduced-motion handling.
- `motion.css` already provides shared motion primitives and reduced-motion/power-conserve hooks.

**Assessment**
There is no single obvious authority for every interaction/motion policy. The same control may receive multiple transition or active-state declarations, with specificity and source order determining the winner. This is a maintainability/cascade risk; no runtime defect or measurable performance regression is established.

**Ownership target**
- Focus baseline → foundation contract, with component-level exceptions documented.
- Shared press/hover semantics → interaction primitive owner.
- Motion presets/timing and reduced-motion → shared Motion.
- Power-conserve/device capability adaptations → one adaptive policy owner.
- Feature-specific animations → feature stylesheet, with shared preference policy respected.

### C03B-04 — Theme token aliases are deliberate but still create migration ambiguity

**Confirmed**
- `theme.css` contains 151 custom-property declaration occurrences across 137 unique names.
- Fourteen compatibility names are each declared twice: `--color-success`, `--color-warning`, `--color-error`, `--color-info`, `--color-neutral`, `--text-primary`, `--text-secondary`, `--text-muted`, `--surface-page`, `--surface-card`, `--surface-raised`, `--surface-muted`, `--surface-input`, `--border-soft`.
- The later declarations remap these names to canonical semantic roles.
- `test-design-foundation-contract.mjs` asserts required semantic tokens, selected contrast values, focus contracts, Login/Home token consumption, Surface variants and reduced-motion/power-mode hooks. It does not provide a complete inventory of every legacy alias consumer.

**Assessment**
The alias layer is intentional compatibility, not automatically dead code. Removal based on declaration duplication alone would risk breaking older consumers.

**Ownership target**
- Canonical token registry → `theme.css`.
- Compatibility aliases → temporary bridge with explicit consumer inventory.
- Consumer migration → one token family at a time, guarded by static and browser checks.
- No bulk rename or alias retirement in AUDIT-03B.

### C03B-05 — Feature ownership boundaries are mostly sound

**Confirmed**
Login, Scanner, Stocktake, Stocktake Import, Surface, Shell Navigation and PWA update prompt have identifiable presentation files. Scanner Home/Stocktake presentation is separated, with a small shared-controls stylesheet.

**Assessment**
This is a sound architecture direction. The main exception is global cross-feature overrides from root CSS and Home's global selectors, not a reason to collapse feature CSS into a shared bundle.

**Ownership target**
Keep feature boundaries. Shared styles require at least two consumers with matching interaction, accessibility and lifecycle semantics.

## 4. Priority ownership register

| Priority | Selector group / file | Current owner | Target owner | Evidence required before any move |
|---|---|---|---|---|
| P0 | Global document/form selectors in `mobile-tuning.css` | Global override file | Base/foundation | Computed styles on Login, Home, Settings, Stocktake and Import |
| P0 | Global `html/body/button/universal/focus` selectors in `home-redesign.css` | Home file, global effect | Base/foundation | Before/after focus, form and document computed styles on both pre-Home and post-Home routes |
| P1 | Home selectors duplicated across 4 files and mobile tuning | Multi-file Home cascade | One Home owner per selector group | Property-level winner map at desktop, tablet, mobile and narrow landscape |
| P1 | Reduced-motion and active/transition rules across root files | Distributed | Motion + interaction + adaptive owners | Computed animation/transition values under normal, reduced-motion and conserve modes |
| P1 | 14 duplicated theme compatibility token names | Theme bridge | Canonical semantic roles + temporary alias bridge | Full consumer search and token contract tests |
| P2 | Residual Login selectors in mobile tuning | Global override file | Login feature | Route/state screenshots and selector usage confirmation |
| P2 | Tiny platform Home presentation CSS files | Platform presentation paths | Keep platform owner pending evidence | Confirm imports and whether intentionally empty placeholders |

## 5. What is not established

This is a static source ownership audit. It does not establish:
- which declaration wins for a given element/property in the browser;
- whether overlapping selectors conflict in actual matched states;
- whether selectors are unused or safe to remove;
- style recalculation, layout, paint, compositing or interaction latency;
- visual parity across viewport/device/browser combinations;
- actual runtime effect of Home's global selectors after lazy stylesheet loading.

No stylesheet has been modified, removed, reordered or consolidated.

## 6. AUDIT-03C entry criteria

Before 03C changes policy or source, capture:
1. Computed-style snapshots for representative global controls and surfaces on Login, Home, Settings, Stocktake and Stocktake Import.
2. Home cascade winners for topbar, spotlight, module card, search field, mobile navigation, toast and modal at desktop, tablet, mobile and narrow landscape.
3. Focus-visible and reduced-motion values under default, `prefers-reduced-motion: reduce` and `data-power-mode="conserve"`.
4. A complete search-backed consumer map for the 14 compatibility aliases.
5. Browser regression evidence for any selector boundary change.

## 7. Guardrails

- No visual redesign, palette/font selection, imagery or material-system decision.
- No blanket CSS rewrite, file-size-driven deletion or import-order change.
- Preserve feature CSS ownership and lazy-loading boundaries.
- Preserve Login, Scanner, Stocktake, Stocktake Import, PWA update lifecycle and all business/runtime contracts.
- No scanner engine/camera lifecycle, persistence, import parsing, authentication, data contract or service-worker changes.
- No new dependency, CSS framework or abstraction.
- Do not label a selector “unused” without coverage evidence; do not label overlapping selectors a conflict without computed-style evidence.

## 8. Disposition

**AUDIT-03B static ownership map: complete at source level.**  
**Runtime/computed cascade validation: outstanding.**  
**Cleanup implementation: not started.**

Next safe step: AUDIT-03C should establish the foundation ownership policy and browser-computed contracts from this map. It must not begin broad cleanup until the 03B evidence gates are satisfied.


## 9. Supplemental evidence protocol (AUDIT-03C prerequisite)

This section makes the static findings actionable without treating the static scan as runtime proof. It is a capture specification, not evidence that the captures have already been performed.

### 9.1 Browser capture matrix

Use the same production-equivalent build and a pinned browser version for each comparison. Record commit SHA, browser/version, OS, viewport CSS pixels, device scale factor, route, application state and preference state with every capture. Do not compare screenshots or computed styles from different source SHAs as if they were one baseline.

| Surface / route | Representative targets | Required states |
|---|---|---|
| Login | page root, heading/body text, text input, primary action, department selector, focus ring | initial, validation/error, keyboard focus |
| Home | topbar, spotlight/hero, module card, search field, mobile navigation, toast, modal | initial, hover where supported, active, focus-visible, overlay open |
| Settings | page shell, settings row/control, dialog, destructive/secondary action | initial, dialog open, keyboard focus |
| Stocktake | page shell, scanner entry/action presentation, data surface, status/feedback | initial, representative active state |
| Stocktake Import | page shell, import drop/input, preview/table, conflict/error state, primary action | initial, populated preview, validation/conflict |

Viewport profiles (CSS pixels; do not substitute device labels for actual dimensions):
- Desktop: 1440 × 900.
- Tablet: 1024 × 768.
- Mobile portrait: 390 × 844.
- Narrow landscape: 844 × 390.

If a target route or state cannot be reached without production credentials or operational data, record it as blocked and capture the nearest safe state. Never fabricate a state or use live business data merely to complete the matrix.

### 9.2 Computed-style property contract

For each representative target, record the resolved value and the winning stylesheet/rule (where DevTools protocol exposes it) for:
- typography: `font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`;
- surface: `color`, `background-color`, `border-color`, `border-radius`, `box-shadow`;
- geometry: `display`, `position`, `width`, `min-height`, `padding`, `gap`, `z-index`;
- interaction: `outline-style`, `outline-width`, `outline-offset`, `transition-property`, `transition-duration`, `transform`, `opacity`;
- motion: computed animation name/duration/iteration and transition values.

A computed value without its matched rule/source is useful for parity but insufficient to assign ownership. Record both when available. For each selector overlap, compare the same element/property/state/media condition; do not mark a conflict merely because selector text appears in multiple files.

### 9.3 Preference and cascade states

Capture each applicable route in these three preference states:
1. Default: no forced reduced-motion or power-conserve attribute.
2. Reduced motion: emulate `prefers-reduced-motion: reduce`.
3. Power conserve: set `data-power-mode="conserve"` on the actual element used by the application contract; verify the root/ancestor placement from source before capture.

Also capture keyboard-only focus-visible separately from pointer focus. Record browser emulation settings; do not assume an operating-system preference is reflected in the test browser.

### 9.4 Pre-Home / post-Home global leakage check

For at least one non-Home route (Login or Settings):
1. Open a fresh page and capture baseline computed styles before Home has ever loaded.
2. Navigate to Home and wait for its lazy CSS to load.
3. Navigate back to the same non-Home route without reloading the document.
4. Re-capture the exact same elements and properties.
5. Compare stylesheet/rule winners and computed values.

A difference after Home CSS loads is evidence of cross-route cascade influence, not automatically a user-visible defect. Reproduce with a fresh document and record route order to distinguish lazy-style persistence from route-specific state.

### 9.5 Alias registry: confirmed canonical mapping vs pending consumer coverage

The mappings below are read from the later compatibility-alias declarations in `src/styles/theme.css`. They establish the intended alias target, not the complete set of consumers or proof that all consumers are migrated.

| Compatibility alias | Canonical target | Current audit disposition |
|---|---|---|
| `--color-success` | `--color-status-success` | retain; search all CSS/TS/TSX consumers |
| `--color-warning` | `--color-status-warning` | retain; search all CSS/TS/TSX consumers |
| `--color-error` | `--color-status-danger` | retain; search all CSS/TS/TSX consumers |
| `--color-info` | `--color-status-info` | retain; search all CSS/TS/TSX consumers |
| `--color-neutral` | `--color-status-neutral` | retain; search all CSS/TS/TSX consumers |
| `--text-primary` | `--color-text-primary` | retain; search all CSS/TS/TSX consumers |
| `--text-secondary` | `--color-text-secondary` | retain; search all CSS/TS/TSX consumers |
| `--text-muted` | `--color-text-tertiary` | retain; search all CSS/TS/TSX consumers |
| `--surface-page` | `--color-surface-canvas` | retain; search all CSS/TS/TSX consumers |
| `--surface-card` | `--color-surface-panel` | retain; search all CSS/TS/TSX consumers |
| `--surface-raised` | `--color-surface-raised` | retain; self-named canonical target; inspect for redundant indirection before any migration |
| `--surface-muted` | `--color-surface-subtle` | retain; search all CSS/TS/TSX consumers |
| `--surface-input` | `--color-surface-input` | retain; self-named canonical target; inspect for redundant indirection before any migration |
| `--border-soft` | `--color-border-subtle` | retain; search all CSS/TS/TSX consumers |

Known fallback/compatibility consumption is already asserted in `scripts/test-design-foundation-contract.mjs` for selected Login, native-experience, adaptive-appearance, Stocktake Import and theme body declarations. Those assertions are a targeted contract, not a repository-wide consumer inventory.

Required completion artifact before alias retirement:
- one row per alias consumer with file, line, selector/component, current alias, replacement token and migration status;
- separate counts for direct CSS `var(--alias)`, nested fallback `var(--canonical, var(--alias))`, and non-CSS string references;
- test coverage for each migrated consumer family;
- zero unresolved consumers before removing an alias.

Suggested local inventory command (run from repository root; review matches rather than bulk-replacing):
```sh
rg -n --hidden --glob '!node_modules/**' --glob '!dist/**' --glob '*.{css,ts,tsx}' \
  -- '--(color-success|color-warning|color-error|color-info|color-neutral|text-primary|text-secondary|text-muted|surface-page|surface-card|surface-raised|surface-muted|surface-input|border-soft)\b' src
```

### 9.6 Browser evidence record format

Store evidence outside production source, grouped by exact audited SHA. Minimum record:

| Field | Required value |
|---|---|
| Audit SHA | Full Git commit SHA |
| Build | Command and build result; identify Pages-equivalent base path |
| Browser | Name and exact version |
| Environment | OS, viewport, device scale factor |
| Route/state | Route, interaction state and route navigation sequence |
| Preferences | Default / reduced-motion / power-conserve |
| Target | Stable selector or accessible role/name |
| Property | Computed value |
| Winner | Matched selector, source file and line when available |
| Artifact | Screenshot/trace/JSON path or attached CI artifact |
| Result | Pass / difference / blocked, with concise reason |

A screenshot alone does not prove the cascade winner. A computed-style dump alone does not prove visual parity. Use both for high-risk global selector changes.

### 9.7 Gate decision

AUDIT-03C may define the CSS foundation ownership policy from the static map, but any implementation that moves, removes, scopes or reorders selectors remains blocked until:
- all P0 global selector groups have pre/post route evidence;
- the Home property-level winner map covers the listed surfaces and viewport profiles;
- reduced-motion and power-conserve behavior is verified for the same target elements;
- the 14-alias consumer inventory is complete for any alias proposed for retirement;
- relevant browser regression checks pass on the exact candidate commit.

If browser automation is unavailable for a route/state, document the gap and keep the corresponding rule unchanged. Do not replace missing browser evidence with selector-regex output.

## 10. Supplemental disposition

The supplemental protocol and canonical alias target registry are documentation additions only. They do not change the original AUDIT-03B findings:
- static source ownership inventory: complete;
- complete alias consumer map: outstanding;
- browser computed-style/cascade evidence: outstanding;
- runtime cleanup or stylesheet migration: not started.
