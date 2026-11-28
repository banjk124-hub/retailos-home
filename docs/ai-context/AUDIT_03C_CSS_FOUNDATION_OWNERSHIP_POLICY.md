# AUDIT-03C — CSS Foundation Ownership Policy

**Status:** Source-level policy audit complete; browser-computed acceptance remains pending  
**Audited ref:** `main` at `6a5f9d272a3ba1aeaf05b8e2da653d693c11c069`  
**Previous phase:** AUDIT-03B merged by PR #205  
**Scope:** Define ownership contracts for reset/base, semantic tokens, focus, interactions, motion/reduced-motion and adaptive power mode. Review existing static/browser test coverage and record token-consumer evidence.  
**Changes:** Documentation only. No CSS, TypeScript, runtime, test, import-order, dependency or deployment changes.

## 1. Executive result

RetailOS already has the principal foundation building blocks:
- `base.css`: global reset/document defaults.
- `theme.css`: canonical semantic tokens and compatibility aliases.
- `interactions.css`: shared button press/transition behavior.
- `shared/motion/motion.css` and Motion provider: shared motion primitives and reduced-motion signal.
- `useAdaptiveAppearance`: root `data-power-mode` from battery/device constraints.
- Feature CSS boundaries for Login, Home, Settings, Stocktake, Stocktake Import, Scanner, Navigation, Surface and PWA.

The issue is ownership overlap, not absence of a foundation:
1. `theme.css` contains substantial Home, Login/department and component presentation rules in addition to tokens.
2. `base.css`, `theme.css` and lazy-loaded `home-redesign.css` all set document-level, form-control or focus behavior.
3. Shared interaction behavior is repeated across `interactions.css`, `adaptive-appearance.css`, `mobile-tuning.css` and feature styles.
4. Reduced-motion is observed by both Motion and Adaptive Appearance; reduced-motion also currently contributes to `data-power-mode="conserve"`.
5. Existing browser evidence is useful, but its CSS cascade trace is heuristic, not an authoritative winning-declaration report.

**Decision:** adopt Section 3 as the target ownership contract. Keep current declarations in place until browser evidence is satisfied. This audit does not authorize cleanup.

## 2. Source evidence at audited SHA

### 2.1 Global foundation imports

`src/main.tsx` imports global CSS in this exact order: `base.css` → `responsive.css` → `theme.css` → `interactions.css` → `mobile-tuning.css` → `performance.css` → `adaptive-appearance.css` → `native-experience.css` → shared `brand.css` → shared `motion.css` → shared `LiquidDock.css`.

This order is part of the current runtime cascade. AUDIT-03C does not reorder it.

### 2.2 Confirmed ownership overlaps

#### C03C-01 — `theme.css` is not token-only

**Confirmed:** Alongside canonical semantic tokens and 14 compatibility aliases, `theme.css` defines global `body` typography/color and focus-visible styling; `.eyebrow`; Home selectors such as `.app-shell`, `.topbar`, `.metric-card`, `.panel-card`, `.toast-message`; department presentation states; Login department showcase selectors; and related keyframes.

**Assessment:** token authority and feature presentation share one global stylesheet.

**Target:** `theme.css` owns token declarations, compatibility aliases and semantic mappings. Feature selectors belong to feature CSS; shared primitive selectors belong to the shared component owner; document defaults/focus belong to the foundation owner. Move rules only in bounded groups after computed-style parity is captured.

#### C03C-02 — document and focus baselines have multiple declarations

**Confirmed:**
- `base.css` defines `:root`, universal box sizing, `html`, `body`, form-control font inheritance, and focus-visible outlines for button/input/select.
- `theme.css` defines `body` color/font/size/line-height and another button/input/select focus-visible rule using semantic focus tokens.
- `home-redesign.css`, loaded by lazy Home, defines global `html` scroll behavior, global `body` min-height/background/tap-highlight, `button` font inheritance and global `:where(button, a, input, select, [role="button"]):focus-visible`.

**Assessment:** the same global element can receive declarations from several ownership domains. Home CSS can affect non-Home routes after it has loaded. The actual winner depends on specificity, source order, media conditions and interaction state.

**Target:** document reset, box sizing, document/body defaults and global keyboard-focus baseline → foundation/base; semantic values → theme; Home-specific behavior → Home root namespace. Preserve current focus appearance until browser parity baseline exists.

#### C03C-03 — shared interaction semantics are distributed

**Confirmed:**
- `interactions.css` applies transitions and active scaling to enabled buttons and selected Home controls.
- `adaptive-appearance.css` adds app-shell button/link transition timing, active transforms and mobile touch target rules.
- `mobile-tuning.css` adds global touch-action, transition-duration and animation-duration overrides.
- `native-experience.css` and feature styles define component-specific interaction states.

**Assessment:** a global button can receive multiple transition/active declarations. Some feature exceptions are legitimate, but the shared interaction owner is not the only place controlling generic press behavior.

**Target:** generic shared press/hover/transition semantics → `interactions.css`; component-specific state/geometry → component or feature CSS; responsive target sizes → component owner, with shared minimum only where semantics match. Preserve native form-control and accessibility behavior.

#### C03C-04 — reduced-motion and power-conserve are related but distinct signals

**Confirmed:**
- `useMotionPreferences` reads and observes `(prefers-reduced-motion: reduce)`.
- `MotionProvider` writes `data-motion-preference="reduced|full"` on `document.documentElement`.
- `useAdaptiveAppearance` independently reads and observes the same media preference.
- Adaptive Appearance combines reduced-motion, low battery and constrained-device signals into `isLowPower`, then writes `data-power-mode="conserve|normal"` on the document root.
- Motion, Performance, Adaptive Appearance, Native Experience, Home, Navigation and feature styles contain reduced-motion rules; Adaptive Appearance also has explicit `:root[data-power-mode="conserve"]` rules.

**Assessment:** two root policy signals exist, but reduced-motion also activates power-conserve. They are not interchangeable:
- reduced-motion is an accessibility preference and must always be honored;
- power-conserve is an adaptive rendering policy and may respond to battery/device constraints.

The current coupling is an observed implementation choice, not a confirmed defect. Do not change it in this audit.

**Target:** Motion owns user motion preference and shared presets; Adaptive Appearance owns battery/device constraints and `data-power-mode`. Feature CSS may disable local nonessential animation but may not override reduced-motion. Any change to the coupling requires a separate behavior decision and regression tests.

#### C03C-05 — browser evidence is useful but not a complete cascade oracle

**Confirmed:**
- `playwright.config.ts` runs Chromium against Pages-equivalent preview URL `/retailos-home/`.
- `.github/workflows/ci.yml` installs Chromium, runs `npm run test:browser` and uploads JSON/PNG evidence.
- `tests/browser/runtime-evidence.spec.ts` captures Login, Home, Settings, Update Center, Scanner Preferences, Stocktake and Stocktake Import; it uses seven viewport profiles including 1440×900, 1024×768, 390×844, 360×740 and 844×390.
- Runtime capture records computed styles, CSS rules, CSSOM access failures, screenshots, geometry, resources, paint and long-task entries. It checks horizontal overflow, duplicate IDs, browser/console errors and failed requests.
- `tests/browser/login-responsive.spec.ts` checks Login focus-visible, reduced-motion and power-conserve.
- `scripts/test-design-foundation-contract.mjs` is in `npm run preflight` and checks semantic tokens, selected foreground contrast against white, focus contracts, selected feature token consumers, Surface contracts and motion/power-mode hooks.

**Limitations from source inspection:**
- The `cascadeTrace` specificity calculator is explicitly approximate; complex `:is()`, `:not()`, `:has()` and cascade layers need manual review.
- The trace considers a subset of visible nodes/properties; pseudo-element computed styles are not separate targets.
- A selector's `querySelectorAll` match count does not prove it wins a property in a given state.
- Cross-origin/unreadable CSSOM sheets are recorded as unreadable, not fully traced.
- Login reduced-motion checks do not establish equivalent assertions for every Home, Settings, Stocktake and Import target.
- Chromium automation is not physical iOS Safari or Android Chrome acceptance.

**Assessment:** extend the existing harness surgically. Do not treat its approximate cascade trace as the authoritative winner map.

## 3. CSS Foundation ownership policy

| Concern | Authoritative owner | Permitted responsibility | Must not become owner of |
|---|---|---|---|
| Reset/document baseline | `src/styles/base.css` | Box sizing, document/body defaults, baseline font inheritance, baseline focus-visible contract, selection | Home/feature layout, token registry, feature-specific button states |
| Semantic tokens | `src/styles/theme.css` | Canonical color, typography, spacing, radius, elevation, layout and focus token values; temporary aliases | Home/Login/department component presentation |
| Shared interaction | `src/styles/interactions.css` | Generic enabled-control press/hover/transition semantics where behavior is shared | Feature geometry, global responsive layout |
| Motion system | `src/shared/motion/*` | Motion timing/easing/distance presets, reusable motion components, shared reduced-motion response | Device/battery detection, feature layout |
| Adaptive appearance | `useAdaptiveAppearance.ts` + `adaptive-appearance.css` | Battery/device constraints, root power-mode state, nonessential effect reduction | User preference ownership or arbitrary feature redesign |
| Performance adaptation | `src/styles/performance.css` | Narrow capability/viewport reductions for expensive effects | Generic motion timing, component-specific layout |
| Feature presentation | Feature-owned CSS | Component layout, states, responsive behavior and feature-specific animation | Global document resets or another feature's selectors |
| Shared component presentation | Component-owned CSS | Reusable visuals and interaction states for actual consumers | Global feature layout or unrelated component overrides |
| Legacy responsive overrides | `mobile-tuning.css` (temporary) | Existing compatibility overrides while migration evidence is incomplete | New feature styling or new global policy |

### 3.1 Token contract

1. Canonical semantic tokens are the public design-system vocabulary. New source should prefer existing `--color-*`, `--font-*`, `--space-*`, `--radius-*`, `--elevation-*`, `--focus-*` and `--layout-*` roles.
2. Compatibility aliases remain until complete consumer inventory and browser parity are verified.
3. Do not add new consumers to legacy aliases where an equivalent canonical token exists.
4. Do not create another root token namespace when a canonical role already expresses the same meaning. Existing Home-local `--ro-*` and `--retail-*` namespaces remain untouched pending a separate review.
5. Preserve resolved values in fallback chains until migration is explicitly tested. No bulk replacement.

### 3.2 Focus and keyboard contract

- Global focus-visible baseline is owned by the foundation layer.
- Component-specific focus may enhance but must not remove the baseline without an equivalent or stronger accessible indicator.
- Pointer focus and keyboard focus are distinct test states.
- Inspect at least `outline-style`, `outline-width`, `outline-offset` and required focus shadow.
- Existing Login focus visuals are a feature-level enhancement and must remain intact.

### 3.3 Interaction contract

- Shared press feedback must be immediate, short and nonessential; never rely on animation to communicate success/error/selection.
- Feature components may define local responses when lifecycle/control semantics differ.
- Reduced-motion suppresses nonessential transition/animation behavior, including feature effects.
- Power-conserve may further reduce expensive decoration, blur, shadows or continuous animation, but may not weaken focus visibility or touch usability.

### 3.4 Motion and adaptive contract

- Motion timing/easing tokens and reusable primitives remain centralized in shared Motion.
- Reduced-motion is read from platform preference and exposed by MotionProvider.
- Adaptive Appearance owns battery/device constraints and root power-mode attribute.
- Existing reduced-motion → power-conserve coupling is preserved until separately reviewed.
- Feature-level reduced-motion rules are permitted for local animations; do not add duplicate global policy.
- No new perpetual/decorative animation in foundation work.

### 3.5 Responsive ownership contract

- Breakpoint values and layout behavior must have an identifiable owner.
- Feature layout belongs to feature CSS; shared breakpoints are reserved for genuinely shared components.
- `mobile-tuning.css` is legacy compatibility debt, not the destination for new responsive rules.
- Preserve current import order and lazy feature loading until before/after browser evidence supports migration.

## 4. Token alias consumer evidence (source search at audited SHA)

This is a code-search-index inventory of source files containing alias references outside `theme.css`. It locates known consumers but must be reconciled against a full local `rg` run before alias retirement. Counts are matching source files, not declaration counts.

| Alias | Indexed source consumer files outside theme | Evidence / disposition |
|---|---:|---|
| `--color-success` | 1 | `native-experience.css` fallback at line 253; retain |
| `--color-warning` | 1 | `adaptive-appearance.css` fallback at line 92; retain |
| `--color-error` | 2 | `native-experience.css` line 257; `adaptive-appearance.css` lines 79, 98; retain |
| `--color-info` | 0 | No indexed source consumer outside token declarations; candidate review only |
| `--color-neutral` | 0 | No indexed source consumer outside token declarations; candidate review only |
| `--text-primary` | 3 | `login-experience.css`, `native-experience.css`, Stocktake Import CSS; retain |
| `--text-secondary` | 4 | `login-experience.css`, `native-experience.css`, `adaptive-appearance.css`, Stocktake Import CSS; retain |
| `--text-muted` | 1 | `login-experience.css`; retain |
| `--surface-page` | 0 | No indexed source consumer outside token declarations; candidate review only |
| `--surface-card` | 0 | No indexed source consumer outside token declarations; candidate review only |
| `--surface-raised` | 1 | `native-experience.css` fallback at line 105; retain |
| `--surface-muted` | 1 | `adaptive-appearance.css` lines 62, 85; retain |
| `--surface-input` | 0 | No indexed source consumer outside token declarations; candidate review only |
| `--border-soft` | 2 | `native-experience.css` lines 104, 234; `adaptive-appearance.css` lines 60, 84; retain |

Interpretation:
- Zero means no consumer appeared in the indexed source search result; it does not authorize deletion.
- Indexed hits include nested fallback expressions such as `var(--color-status-danger, var(--color-error))`; canonical value wins when defined and the alias remains a fallback bridge.
- Stocktake Import also uses older unrelated aliases such as `--border-subtle`, `--surface-elevated` and `--surface-secondary`. Those are outside this 14-token list and need a separate token-family audit.
- Before removal, run the full local command in AUDIT-03B Section 9.5, inspect all matches including style-string references, update the consumer map and run static + browser regression checks.

## 5. Browser evidence disposition

| Surface | Existing automated evidence | Disposition |
|---|---|---|
| Login | Responsive viewports, focus-visible, reduced-motion, power-conserve | Strong baseline; exact merge-SHA run not verified |
| Home | Seven viewport captures, geometry/overflow, computed styles and CSS rule inventory | Broad capture; no authoritative per-property winner assertion |
| Settings / Update Center | Desktop/mobile route reachability and runtime capture | Reachability exists; focus/property contract incomplete |
| Stocktake | Mobile workflow reachability and runtime capture; tablet scanner capability guard | Workflow coverage exists; presentation property contract incomplete |
| Stocktake Import | Mobile workflow reachability and runtime capture | Reachability exists; populated/error-state property contract incomplete |
| Pre-Home vs post-Home | No dedicated same-document route-sequence assertion identified | Missing |
| Pseudo-element styles | Not separately captured by current helper | Missing |
| Browser engines | CI installs Chromium | Chromium automation only; no Safari/WebKit or Firefox claim |
| Physical devices | PW-01 deferred by owner | Not part of this audit; not passed |

### Required browser acceptance additions before selector migration

1. Same-document Home leakage test: capture Login or Settings baseline; enter Home so lazy CSS loads; return to the same route without reload; compare the same global controls/document properties.
2. Focus contract: keyboard-tab representative controls on Login, Home, Settings, Stocktake and Stocktake Import; record computed focus values and matched rule/source.
3. Motion contract: verify representative shared/feature controls under default and `prefers-reduced-motion: reduce`; verify root `data-motion-preference`.
4. Power-conserve contract: observe root `data-power-mode="conserve"`; verify only documented effects are reduced and focus/target-size behavior is unchanged.
5. Home property trace: topbar, spotlight, module card, search field, mobile navigation, toast and modal across desktop/tablet/mobile/narrow landscape.
6. Pseudo-element spot checks for critical `::before`/`::after` surfaces.

Extend the existing runtime evidence suite in place where practical. Keep its CSSOM trace explicitly heuristic unless a proper cascade evaluator or DevTools matched-style protocol is used.

## 6. Findings and priorities

| ID | Priority | Finding | Decision |
|---|---|---|---|
| C03C-01 | P1 | `theme.css` combines token authority with Home/department/Login presentation | Establish token-only target; defer rule moves |
| C03C-02 | P0 | Base/theme/Home contain overlapping document and focus declarations | Preserve behavior; capture route evidence first |
| C03C-03 | P1 | Generic interactions overlap across global and adaptive styles | Keep shared owner; do not consolidate yet |
| C03C-04 | P1 | Reduced-motion is observed twice and also contributes to power-conserve | Preserve behavior; review coupling separately |
| C03C-05 | P1 | Existing browser cascade trace is approximate | Use as inventory; add targeted assertions before migration |
| C03C-06 | P2 | Four aliases have no indexed source consumers outside theme | Candidate review only; no deletion |
| C03C-07 | P2 | Stocktake Import has older token vocabulary outside the 14 aliases | Separate token-family inventory; preserve behavior |

## 7. Guardrails

- No visual redesign, palette/font selection, imagery or material-system decision.
- No stylesheet import reordering, broad selector scoping, bulk token replacement or file-size-driven cleanup.
- No alias removal based only on code-search zero results.
- Preserve Login, Scanner, Stocktake, Stocktake Import, Navigation, Settings, PWA update lifecycle and business/runtime contracts.
- No scanner engine/camera lifecycle, persistence, import parsing, authentication, data contract, Vite base path or service-worker changes.
- No new dependency, CSS framework or generic audit abstraction.
- Do not claim browser/CI/physical-device acceptance without evidence for the exact audited commit.

## 8. Completion gate

**AUDIT-03C source ownership policy: complete.**  
**Token consumer discovery: partial, index-backed; full local reconciliation outstanding.**  
**Browser evidence harness review: complete at source level.**  
**Browser computed acceptance at merge SHA: not verified.**  
**Same-document Home leakage test and cross-feature focus/motion assertions: outstanding.**  
**CSS cleanup/migration: not started.**

Next safe action is to run the existing CI browser evidence against exact main SHA and add the missing focused browser assertions before any P0 selector migration. If tests cannot run or reach a route/state, preserve the corresponding CSS unchanged and record the gap.
