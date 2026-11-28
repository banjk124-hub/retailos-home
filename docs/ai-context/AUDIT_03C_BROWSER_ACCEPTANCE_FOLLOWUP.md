# AUDIT-03C — Browser Acceptance Evidence Follow-up

**Status:** Browser evidence follow-up under CI correction; P0 CSS migration gate remains closed  
**Baseline:** main after PR #206 merge at 3cfb5a755c145c277498e04a9e1f7dfaeb2ad12b  
**Related policy:** AUDIT_03C_CSS_FOUNDATION_OWNERSHIP_POLICY.md in PR #206  
**Scope:** Playwright evidence only. No CSS, runtime, import-order, dependency, or deployment changes.

## 1. Existing CI artifact inspection

Inspected retailos-ui-runtime-evidence from RetailOS CI run #2003 (run ID 46102656874), head SHA 2b63051ed6676290d0eea54cf888b10af496e916.

Artifact contents:
- 15 runtime JSON captures, including Login, seven Home viewport profiles, Settings, Update Center, Scanner Preferences, Stocktake, Stocktake Import and library states.
- PNG screenshots for the captured surfaces.
- health-summary.json.

Observed health summary:
- Browser/console errors: 0.
- Failed requests: 0.
- Duplicate DOM IDs: 0 in the individual captures.
- Horizontal overflow: 0 for all seven Home viewport profiles.

The existing artifact is useful for layout/runtime reachability and broad CSS inventory. It does not contain a same-document Login → Home lazy-load → logout → Login comparison, dedicated cross-feature focus assertions, a cross-feature reduced-motion contract, a power-conserve focus/geometry parity check, separate pseudo-element snapshots, or a browser matched-rule evidence report.

## 2. Existing coverage versus remaining evidence

| Evidence area | Existing coverage | Follow-up |
|---|---|---|
| Login focus | Existing responsive suite tabs through Login input and submit; checks outline and focus shadow | Retain existing test; no duplicate Login test added |
| Home leakage | Login and Home are captured in separate page loads; no same-document return-to-Login comparison | Added same-document logout diagnostic |
| Home focus | Runtime geometry only | Added keyboard :focus-visible assertion |
| Settings focus | Dialog reachability only | Added keyboard focus assertion inside dialog |
| Stocktake focus | Workflow reachability only | Added keyboard focus assertion inside dialog |
| Stocktake Import focus | Workflow reachability only | Added keyboard focus assertion inside dialog |
| Reduced motion | Existing Login-only reduced-motion assertions | Added Home, Settings, Stocktake and Stocktake Import checks |
| Power-conserve | Existing Login backdrop assertions | Added Home focus indicator and geometry parity check |
| Pseudo-elements | Not separately recorded | Added Home ::before and ::after computed-style evidence |
| Cascade provenance | Existing CSSOM specificity trace is heuristic | Added Chromium CDP matched declarations plus browser-resolved computed values |

## 3. Same-document Home leakage diagnostic

The new test captures:
1. A fresh Login baseline in a separate page.
2. Home after seeding the authenticated session and loading the lazy Home chunk.
3. Login after clicking Logout in that same Home page, without reloading it.

It records computed document/body/button properties and the stylesheet list at each point. The diagnostic is a normal passing evidence test: it records the measured parity result without converting a known mismatch into an expected-failure test or hiding the finding.

**Latest measured result (CI #2020, run ID `46106621347`, HEAD `52dfb32930c9bd101e0fb34210acf325569e28f2`): `postLogoutComputedStyleParity: false`.** The Home lazy stylesheet remains attached, but that residue is expected under Vite and is diagnostic only. The actual post-logout differences are `body.backgroundColor` (transparent → `rgb(246, 241, 242)`) and `body.webkitTapHighlightColor` (`rgba(0, 0, 0, 0.18)` → transparent). The source is confirmed in `src/styles/home-redesign.css`: unscoped `body` sets both declarations. The same artifact identifies the Home first button as `.topbar-action-button.notification-button`; its 10px/15px typography is inherited from `.topbar`, while Login returns to 16px/24px after Logout. Wrapper geometry returns to baseline. CI #2021 adds CDP inherited-rule evidence and passes 15/15 tests.

## 4. Focus, motion and adaptive evidence

The new suite uses actual keyboard Tab navigation to activate :focus-visible and verifies a visible outline or focus shadow on:
- Home logout action.
- Settings dialog first action.
- Stocktake dialog first action.
- Stocktake Import dialog first action.

Reduced-motion coverage verifies the Motion root signal and power-conserve signal, then checks computed transition and animation durations on representative controls in Home, Settings, Stocktake and Stocktake Import.

Power-conserve coverage compares the same focused Home control before and after switching the root power-mode attribute. Focus outline, focus shadow and control geometry must remain unchanged.

## 5. Pseudo-element and matched-rule evidence

The suite separately captures computed styles for:
- .app-shell::before
- .spotlight-art::after

It also uses Chromium DevTools Protocol:
- CSS.getMatchedStylesForNode to preserve matching declarations and source candidates.
- CSS.getComputedStyleForNode to preserve browser-resolved property values.

**Important limitation:** CDP matched declarations plus computed values are stronger than the existing approximate CSSOM specificity trace, but this report does not claim an independently calculated winner for shorthand expansion, cascade layers or CSS-variable resolution. Those cases remain manual DevTools review items. No selector migration may rely on the old heuristic alone.

## 6. Gate and decision — historical pre-merge snapshot

The status in this section records the decision at the time of the original AUDIT-03C follow-up. It is superseded by Section 9 below.

- Existing responsive/runtime evidence remains valid for the assertions it actually performs.
- The new browser suite adds the missing route-sequence, focus, reduced-motion, power-mode, pseudo-element and CDP matched-rule captures.
- The same-document leakage diagnostic passes as an evidence-capture test, but its measured parity result is **false**. This is an outstanding P0 finding, not a green acceptance result.
- Browser acceptance is still Chromium automation, not physical iOS Safari or Android Chrome validation.
- Full token alias consumer reconciliation remains separate and outstanding.

**Decision:** the required Chromium browser evidence is now complete and reviewed. The remaining P0 global leakage is source-attributed to Home's unscoped `body` declarations. AUDIT-03D is now permitted as a separate, narrowly scoped ownership migration; no unrelated P0 selector or compatibility alias is authorized for cleanup.


## 7. PR #206 merge and CI #2007 failure triage

PR #206 merged as commit `3cfb5a755c145c277498e04a9e1f7dfaeb2ad12b`. Its diff is documentation-only; no CSS/runtime/test behavior changed on main. PR #207 was authored against the preceding main SHA `6a5f9d272a3ba1aeaf05b8e2da653d693c11c069`; the branch remains mergeable against the updated main and the two changesets do not overlap.

CI run #2007 (run ID `46103550003`) completed with:
- TypeScript and production build: passed.
- Local-equivalent preflight: passed.
- PR-base bundle build/comparison: passed.
- Browser/runtime evidence: failed (6 failed, 9 passed).

Failure classification:
1. Five new acceptance tests failed in the shared `openHome()` setup because the helper set a 390×844 viewport but did not emulate the mobile platform identity. The existing runtime harness explicitly emulates pointer/hover media queries, `navigator.maxTouchPoints`, user agent and screen dimensions before asserting `data-retailos-platform="mobile"`. This was a test-fixture defect, not evidence of a product regression.
2. The same-document diagnostic marked itself expected-failure only after setup and compared stylesheet arrays by object identity. Both behaviors made the diagnostic unreliable. The correction records style-property differences and added/remaining lazy stylesheet URLs separately; it reports parity as evidence instead of forcing a red CI result for a known P0 finding.
3. The existing runtime evidence test timed out clicking the animated Stocktake library tile because its bounding box did not stabilize. The correction retains visibility assertions and uses a forced click only on the already-visible library tile whose continuous decorative transform prevents Playwright's stability heuristic from completing.

The corrections are test-only. No production CSS, runtime component, import order, dependency, or business behavior is changed. Browser acceptance remains Chromium automation; physical iOS Safari/Android Chrome acceptance is not claimed.

**CI status as of 2026-11-28:** run #2013 (`46105082726`) failed in the browser suite. Its two failures were traced to an unstable power-mode `box-shadow` sample taken during transition and a test-timeout configuration error: the numeric third argument passed to `test()` was not the Playwright timeout. The follow-up commit `e3088a55f3c822bd89bd5de8917f004e815682b5` moved the timeout to `test.setTimeout(90_000)`. CI #2015 (`46105448616`) then passed preflight, TypeScript/production builds, bundle comparison, and all 15 browser tests (53.0 seconds total; runtime evidence capture 30.4 seconds). The power-mode comparison now runs with reduced motion and passed; focus visibility, dimensions and both pseudo-element snapshots were recorded.

**Current gate:** browser CI is green on `e3088a5`, but AUDIT-03C's P0 ownership/parity gate is still open because the actual same-document capture reports `postLogoutParity: false`. Keep P0 selectors and aliases unchanged; do not begin AUDIT-03D.


## 8. AUDIT-03C final evidence and AUDIT-03D migration boundary

### 8.1 Confirmed source ownership

| Source | Declaration / selector | Evidence | Classification |
|---|---|---|---|
| `src/styles/home-redesign.css` | Global `body { background: #f6f1f2; -webkit-tap-highlight-color: transparent; }` | Same-document Login → Home → Logout; both body properties remain changed after Logout | **P0 leakage — migrate** |
| `src/styles/home.css` | Global `.topbar` includes `font-size: 10px` | CDP inherited matched-rule trace shows `.topbar` as font-size owner; source scan identifies this rule | P1 selector scope — preserve active Home typography |
| `src/styles/home-redesign.css` | Global `html`, `button,a,input,select`, `button`, and global focus-visible rule | Duplicates foundation rules for scroll behavior, font inheritance and touch action; focus extension also matches anchors/role buttons | P1 ownership overlap — scope/remove only with parity |
| `src/styles/home-redesign.css` | Global reduced-motion universal selector | Equivalent global policy exists in `adaptive-appearance.css` | Duplicate global policy — remove from lazy Home CSS |
| `src/styles/home-redesign.css`, `src/styles/home-engine.css` | `:root` custom-property blocks (`--ro-*`, `--retail-*`) | Consumers belong to Home presentation CSS | Global token namespace — scope to Home presentation root |
| `src/styles/home-redesign.css` | `.retailos-scene`, `.retailos-interface` wrapper rules | Fresh Login and post-logout geometry match; shared static wrapper styles also exist | No current parity defect; retain pending a separate deduplication review |

### 8.2 Measured evidence

- CI #2016 (run ID `46105741615`, HEAD `6582d79944654488fdd3c1404fa98fbb72ea66db`): 15/15 browser tests passed.
- CI #2020 (run ID `46106621347`, HEAD `52dfb32930c9bd101e0fb34210acf325569e28f2`): 15/15 browser tests passed; same-document evidence expanded to capture button identity, body typography and wrapper geometry.
- CI #2021 (run ID `46106915074`, HEAD `c31d5af9458bd91aeb07a07f5c3ce8ffd04df85e`): 15/15 browser tests passed; CDP now includes inherited ancestor declarations.
- CI #2022 (run ID `46107478858`, HEAD `c3240c37b96de1a4e7b7e9dd2e5846ef7f9bd5d3`): preflight, TypeScript/production builds, bundle comparison and all 15 browser tests passed (45.6 seconds). Bundle comparison: raw bytes -145; gzip estimate -29 bytes.
- In the measured 390×844 Login → Home → Logout sequence, Login body background/tap-highlight differences persist; the Home button's 10px/15px typography is active only while Home is mounted; shared wrapper geometry returns to 390×844 after Logout.
- The Home logout target measures 42×44 CSS pixels. The existing focus ring is visible (3px outline, 3px offset); this is captured evidence, not a claim of physical-device touch acceptance.
- All evidence is Chromium automation. Physical iOS Safari and Android Chrome acceptance remains outstanding.

### 8.3 AUDIT-03D merged implementation

The stacked AUDIT-03D branch scopes Home-only tokens and focus/tap-highlight rules to `.home-presentation-root`, conditions the viewport background on the Home root being present, removes duplicate global base/touch/reduced-motion declarations from the lazy Home stylesheet, and scopes the legacy `.topbar` rule without increasing its specificity.

The same-document test now requires:
1. Home retains its intended viewport background and transparent tap-highlight behavior.
2. The document body remains at its fresh Login baseline while Home is mounted.
3. After Logout, html/body/button/wrapper computed styles return to the fresh Login baseline.
4. Vite's remaining lazy stylesheet is recorded but does not itself fail parity.

No business logic, authentication, runtime routing, import order, dependencies, scanner or stocktake behavior was changed. AUDIT-03D merged through PR #208 and is accepted on main after CI #2025 passed all 15 browser tests and confirmed post-logout computed-style parity.
