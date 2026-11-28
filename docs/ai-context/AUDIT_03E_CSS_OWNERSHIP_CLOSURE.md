# AUDIT-03E — CSS Ownership Closure & Cross-device Acceptance

**Status:** Chromium/source closure complete; physical iOS Safari and Android Chrome acceptance pending  
**Baseline:** `main` at `a8d9ad0c67c4613ff7ddb88912f9120cb9381b6e` (PR #207 and #208 merged)  
**Branch:** `audit-03e-css-ownership-closure`  
**Scope:** Re-audit the merged CSS ownership changes on main, reconcile stale phase records, classify remaining broad selectors, and define the physical-device acceptance boundary.  
**Implementation policy:** No production CSS or runtime changes unless a reproducible cross-surface regression is demonstrated. This phase does not authorize blanket selector rewriting or stylesheet consolidation.

## 1. Executive result

AUDIT-03C and AUDIT-03D are accepted on Chromium CI after merge.

Verified on main:
- PR #207 browser acceptance evidence and PR #208 Home CSS ownership migration are both merged.
- RetailOS CI #2025 (run ID `46108324793`, commit `a8d9ad0c67c4613ff7ddb88912f9120cb9381b6e`) passed.
- All 15 Playwright browser tests passed, including same-document Login → Home lazy load → Logout, keyboard focus, reduced motion, power-conserve, pseudo-element capture, matched-rule capture, runtime evidence and Stocktake/Stocktake Import workflows.
- The same-document evidence reports `postLogoutDifferences: []` and `postLogoutComputedStyleParity: true`.
- Build and deploy workflow #200 (run ID `46108324771`) succeeded for the same main commit.
- The 390×844 evidence returns document background, body tap-highlight, Login typography and wrapper geometry to the fresh Login baseline after Logout.
- Seven Home viewport profiles report no horizontal overflow in the runtime evidence suite.

This establishes Chromium CI acceptance. It does **not** establish physical-device acceptance.

## 2. Ownership state on merged main

| Area | Current owner / behavior | AUDIT-03E disposition |
|---|---|---|
| Global reset and document defaults | `base.css` and shared foundation imports | Retain; no ownership regression found in this phase |
| Semantic tokens and compatibility aliases | `theme.css` | Retain; full alias-consumer reconciliation remains a separate task |
| Shared interaction and adaptive motion | `interactions.css`, `adaptive-appearance.css`, shared Motion | Retain; no policy changes |
| Home-only `--ro-*` tokens | `.home-presentation-root` in `home-redesign.css` | Scoped by AUDIT-03D |
| Home-only `--retail-*` tokens | `.home-presentation-root` in `home-engine.css` | Scoped by AUDIT-03D |
| Home focus-visible extension | `:where(.home-presentation-root) :where(...):focus-visible` | Scoped; preserves low selector specificity |
| Home tap-highlight suppression | `.home-presentation-root` | Scoped; body baseline remains unchanged |
| Home viewport backdrop | `:root:has(.home-presentation-root)` behind `@supports selector(...)` | Conditional while Home is mounted; retain pending Safari device check |
| Legacy Home `.topbar` typography in `home.css` | `.home-presentation-root :where(.topbar)` | Scoped without increasing specificity |
| Login/Home scene wrappers | `.retailos-scene`, `.retailos-interface` | Intentionally shared by Login and authenticated shell; do not move into Home scope |
| Home presentation selectors | Several feature-class selectors remain unprefixed in lazy Home styles | Class consumers are currently Home-owned; record as future scope candidates, not a demonstrated cross-feature defect |

## 3. Residual broad-selector review

The following selectors remain in lazy Home CSS: `.app-shell`, `.topbar`, `.topbar-action-button`, `.icon-button`, `.content-wrap`, `.toast-message`, `.offline-banner` and `.activity-empty`, alongside Home-specific presentation classes.

Source review found:
- Home's actual `.topbar`, `.icon-button`, toast and related presentation consumers are in `HomeScreen.tsx`.
- Stocktake uses its distinct `.stocktake-icon-button` class.
- Stocktake Import uses its distinct `.stocktake-import-icon-button` class.
- Shared Login/Home wrappers are separate from the Home presentation root and remain intentionally shared.
- The browser's same-document parity assertion detects actual Login computed-style leakage after the lazy Home stylesheet has loaded and after Home unmounts. That assertion passes on merged main.

**Decision:** do not mass-prefix every selector in the Home stylesheets in this phase. A selector being syntactically unqualified does not by itself prove a runtime collision. A blanket rewrite would increase cascade churn and risk changing intended specificity. Keep the remaining selectors on the watch list; scope individual selector families only when a non-Home consumer or computed-style regression is demonstrated.

## 4. Cross-device acceptance boundary

Not executed by GitHub Actions or this source audit:
- Physical iOS Safari (including safe-area behavior and `:has()` support/fallback).
- Physical Android Chrome.
- Mid/low-range device performance and touch response.

Manual acceptance checklist for the device owner:
1. Fresh Login → authenticate → Home → Logout → Login; verify Login background, typography and touch feedback are unchanged after return.
2. Verify Home viewport background and sticky topbar at portrait and landscape orientations.
3. Verify safe-area spacing on notched iOS devices and bottom navigation clearance.
4. Tab through Home controls and confirm the focus ring remains visible.
5. Enable reduced-motion and confirm decorative motion is suppressed without removing interaction feedback.
6. Verify Home, Stocktake and Stocktake Import controls retain their own geometry and visual states after Home has been visited.
7. Repeat on a mid/low-range Android device; check scroll smoothness, first interaction latency and thermal/battery-sensitive behavior.

Record device model, OS/browser version, viewport, pass/fail and screenshots/video for each run. Do not mark physical acceptance complete based on desktop device emulation alone.

## 5. Guardrails and non-goals

- Do not alter CSS import order.
- Do not change authentication, routing, module workflows, scanner, stocktake or business logic.
- Do not remove shared Login/Home wrapper declarations without a separate ownership proof.
- Do not treat lazy stylesheet presence in `document.styleSheets` as leakage; compare computed styles and actual rendered behavior.
- Do not treat the existing approximate CSSOM cascade trace as a complete cascade oracle.
- Do not claim iOS/Android acceptance from Chromium evidence.
- Do not perform blanket CSS consolidation or rename classes in this phase.

## 6. Acceptance and closure decision

| Gate | Result |
|---|---|
| Merged-main source review | PASS |
| P0 Login parity after Home unmount | PASS |
| Chromium browser suite | PASS — 15/15 |
| TypeScript and production build | PASS |
| Bundle/runtime regression evidence | PASS in CI workflow |
| PWA build/deploy workflow | PASS |
| Physical iOS Safari | PENDING |
| Physical Android Chrome | PENDING |

**AUDIT-03E decision:** source and Chromium ownership closure are complete. No production code change is justified by the residual-selector review. Physical-device validation remains explicitly pending and must be recorded separately; it is not a reason to reopen the fixed P0 migration.

