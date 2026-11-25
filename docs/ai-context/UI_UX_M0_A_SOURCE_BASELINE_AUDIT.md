# M0-A — Source Baseline Audit (Batch A0)

**Repository:** `banjk124-hub/retailos-home`  
**Baseline:** `main` at `4e654ffb519d8b124f3edbbbda4f65fe550052ef` (2026-11-26)  
**Branch:** `feat/m0-a-source-audit-foundation`  
**Scope:** Source ownership and current-screen baseline for M0-A. This is an audit and implementation gate, not an accepted redesign or a source migration.

## 1. Executive findings

1. RetailOS currently has a working Login → Identity Recognition → Home journey, but no implemented route-based App Shell. Authenticated Home is still a long-scroll workspace with section navigation and overlays.
2. `HomeScreen.tsx` is the highest structural concentration risk: approximately 54 KB and owns Home composition plus several unrelated interaction/state domains (navigation, notifications, snapshot notices, calendar, module library, scanner launch, barcode lookup and feature overlays).
3. The visual foundation is only partially aligned with the owner-confirmed direction. The current primary token is `#d92736`, with deep `#a91829`; this is not yet an accepted final burgundy palette. The current UI font stack is Inter/Segoe UI/Roboto/Arial; no Vietnamese font candidate has been selected.
4. The checked-in public asset tree contains only `public/icon.svg` and `public/manifest.webmanifest`; no retail photography assets are currently shipped in `public/` or `src/assets/`. The current Home spotlight uses CSS illustration/orbit treatment and icon-led content rather than authentic retail photography.
5. CSS ownership is layered and high-risk for broad restyling: 14 stylesheet imports are present in `src/main.tsx`; Home adds five feature stylesheets; `src/styles/mobile-tuning.css` is 87,267 bytes. Existing Phase 00/01 evidence already identifies selector overlap, but static matching alone cannot determine computed winners across viewport/state.
6. Browser verification currently has a responsive Login smoke suite at five viewports. The repository tree contains no equivalent Home/Module Library/Stocktake/Import/Settings visual suite. CI is not physical-device acceptance.
7. Business workflows are feature-owned. Stocktake and Stocktake Import have dedicated components and persistence/services. Scanner stabilization is closed; redesign only its presentation and do not reopen engine internals.

## 2. Verified source ownership

| Surface / concern | Current owner(s) | Verified behavior / boundary |
|---|---|---|
| Root boot and auth journey | `src/App.tsx`; auth services | Reads employee session, shows Login, Identity Recognition, then lazy-loads Home. Logout releases camera, clears session/name and cached module data. PWA boot-health and update-blocker behavior live here. |
| Login | `LoginExperience.tsx`, `LoginHero.tsx`, `LoginForm.tsx`, `LoginDock.tsx` | Local employee-code authentication and employee/department preview. No password, remember-login checkbox or remote identity provider exists in this source flow. Do not invent these behaviors in visual work. |
| Home workspace | `src/features/home/HomeScreen.tsx` | Long-scroll page; owns Home navigation state, snapshot notices, calendar, notifications/push setup, Library sheet, scanner/manual lookup launch and Settings/feature overlays. |
| Module Library | `HomeModuleLibrarySection.tsx`, `ModuleLibraryEngine.tsx`, `moduleRegistry.ts` | Search filters registry metadata; five library groups and nine workflow IDs. Only Stocktake and Stocktake Import have dedicated operational screens. Other registry entries are not proof of implemented workflows. |
| Settings / Update Center | `SettingsHub.tsx`, `updateCenterStore.ts`, PWA update services | Settings is a modal surface; Update Center has real download/staged/deferred/error/activation-blocked states. Preserve consent and safe-activation contracts. |
| Scanner presentation | Home scanner surfaces and scanner feature components | Contextual quick action; shared Scanner Engine/session/camera contract. Engine lifecycle, decoder, camera lease and ROI are protected. |
| Stocktake | `StocktakeModule.tsx`, stocktake services/types/CSS | Feature-owned home/scan/review/history/export states and local persistence. |
| Stocktake Import | `StocktakeImportModule.tsx`, parser/session/store/CSS | Feature-owned parsing, review/conflict/dirty-edit/persistence/output flow. Keep parsing and data precision unchanged. |
| Global visual foundation | `src/main.tsx`, `src/styles/theme.css`, `src/shared/{brand,motion,components/glass,navigation}` | Shared tokens, Brand, Glass, Motion and LiquidDock are already in use. Existing consumers must be traced before changing semantics. |

## 3. Current screen and information architecture

### AS-IS
- Root journey: Login → Identity Recognition → Home; existing valid sessions enter Home directly.
- Home navigation IDs: `home`, `modules`, `activity`, `settings`. The first three scroll to sections; Settings opens an overlay.
- Home contains topbar, offline banner, spotlight/alerts/calendar, Module Library, Activity placeholder and footer.
- Activity currently renders “Chưa có hoạt động”; calendar agenda currently renders “Chưa có lịch cho ngày này.” These are truthful empty states, not live activity/calendar feeds.
- Module selection opens a group sheet; it does not navigate to a separate module workspace.
- Stocktake and Stocktake Import are the two confirmed operational workspaces; scanner and barcode lookup are contextual actions.
- Update Center is nested inside Settings and owns a release lifecycle, not a generic notification.

### TO-BE direction (not yet implemented or accepted as screen designs)
M0-A must produce distinct, source-grounded screens for Login, App Shell, Home, Module Library, Stocktake, Import and Settings/Update Center. Each must preserve source truth and feature ownership. Do not implement a generic dashboard or force all workflows into identical card layouts.

## 4. Visual foundation audit

| Dimension | Current source evidence | M0-A disposition |
|---|---|---|
| Brand color | `--brand-color-primary: #d92736`; deep `#a91829`; semantic tokens alias these values | Reconcile exact burgundy family and contrast pairs against approved brand assets and real surfaces. Do not globally recolor by find/replace. |
| Typography | `--font-family-ui: Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | Font remains open. Compare Vietnamese glyphs/diacritics, small metadata, long labels, numbers/tables, WOFF2 size, license, fallback and offline behavior before selection. |
| Retail imagery | No checked-in retail photo in `public/` or `src/assets/` at baseline | Establish licensed, optimized, responsive local/versioned assets and offline fallback. Core operations must not depend on remote images. |
| Composition | Home spotlight is CSS-led, icon/abstract-orbit based; current styles contain legacy dashboard patterns and multiple Home stylesheet generations | Recompose each screen around its real task; preserve no decorative metrics or fictional operational content. |
| Materials | Existing Glass/blur/motion foundations are active | Keep selectively; measure compositing contrast, low-power fallback and runtime cost. Do not blanket-apply or blanket-remove. |
| Motion | Shared Motion foundation exists; Home and feature styles still own choreography | M0-A records structural needs; exact choreography belongs to M0-B and must be measured. |

## 5. CSS and verification risk

- `src/main.tsx` imports global base/responsive/theme/interactions/mobile/performance/adaptive/native styles plus Brand, Motion, Glass and LiquidDock styles.
- `HomeScreen.tsx` imports `home.css`, `home-ux.css`, `home-engine.css`, `home-redesign.css`, `home-architecture.css` in sequence.
- `mobile-tuning.css` is 87,267 bytes; it includes broad legacy selectors and responsive overrides. It must not be deleted or rewritten based on size alone.
- Existing design foundation contract test guards token ownership and reduced-motion/power-conserve contracts.
- Existing Playwright browser suite covers Login at 1440×900, 900×1024, 390×844, 360×740 and 844×390. It does not establish visual acceptance for the other M0 surfaces.
- Required next evidence: computed styles and screenshots for each representative surface/state, plus overflow, focus, keyboard, touch, reduced-motion and responsive checks.

## 6. Open risks / findings

| ID | Severity | Finding | Required treatment |
|---|---|---|---|
| M0A-01 | High | No implemented App Shell/workspace routing; Home is still section-scroll navigation. | Design the Shell as a separate representative surface; route architecture remains a later implementation decision unless source evidence proves a minimal safe slice is needed. |
| M0A-02 | High | HomeScreen owns too many cross-surface states and concerns. | Build a component/state ownership map before extraction. Avoid a speculative rewrite; extract only when ownership and regression boundaries are explicit. |
| M0A-03 | High | CSS cascade has multiple global and feature layers, including a large mobile override file. | Audit selector ownership and computed winners per viewport/state before any deletion or bulk migration. |
| M0A-04 | High | Current brand tokens are not yet accepted as final burgundy anchors. | Produce palette alternatives and real-surface contrast matrix; do not hardcode a new palette prematurely. |
| M0A-05 | High | Retail photography is absent from shipped public/source assets. | Select licensed source assets, optimize and version them, define crop/responsive/offline policy before integrating. |
| M0A-06 | Medium | Font stack is still Inter/system fallback; Vietnamese candidate remains unselected. | Compare candidate font rendering and payload/licensing before adoption. |
| M0A-07 | Medium | Activity and calendar are placeholders. | Retain truthful empty states; do not create fake data or controls. |
| M0A-08 | Medium | Responsive browser tests are Login-only. | Extend browser coverage surface-by-surface; keep physical-device acceptance separate. |
| M0A-09 | Medium | PR #157 is still an open Draft based on an older main baseline. | Reconcile its exact diff against merged PR #162 and current main; do not merge as a separate visual authority. |

## 7. M0-A execution sequence

### Batch A0 — Source baseline (this batch)
- [x] Verify merged documentation baseline and current main SHA.
- [x] Revalidate root/Auth/Home/Library/Settings/Stocktake source ownership.
- [x] Inventory source stylesheets, shared foundations, assets and browser-test coverage.
- [x] Record factual findings and protected boundaries.
- [ ] Complete detailed computed-style/screenshot review across all representative surfaces.

### Batch A1 — Visual direction and screen blueprints
1. Produce distinct high-fidelity desktop/tablet/mobile compositions for Login, Shell, Home and Module Library.
2. Use burgundy identity, Vietnamese-first typography candidate comparisons and authentic retail imagery direction; exact color/font/assets remain evidence-gated.
3. Map every visible action, metric, readiness label and state to a real source owner.
4. Review with owner before changing production-facing source layouts.

### Batch A2 — Operational screens
1. Produce Stocktake and Import compositions against their real states and data density.
2. Produce Settings/Update Center with exact release lifecycle states.
3. Redesign Scanner presentation only, preserving shared engine/session/camera contracts.

### Batch A3 — Acceptance and first implementation slice
1. Select the first owner-approved screen and viewport.
2. Implement one bounded feature-owned slice; do not start global CSS cleanup.
3. Add Playwright coverage for the implemented screen and its state transitions.
4. Inspect screenshots/computed styles at 1440, 1280, 1024, 768, 390, 360 and short landscape.
5. Run design contract, TypeScript, production/Pages builds and relevant feature tests.
6. Record owner visual acceptance separately from CI and physical-device checks.

## 8. Explicit non-decisions

- No exact burgundy HEX, Vietnamese font family or image vendor has been selected by this audit.
- No router, CSS framework, component library, icon package or motion dependency is adopted/replaced by this audit.
- No source UI, business logic, API, persistence, module IDs, scanner runtime or PWA release behavior is changed in Batch A0.
- No deployment or production promotion is authorized.
- M0-A does not complete M0; M0-B, M0-C and M0-D remain open.

## 9. Baseline source references

- `src/main.tsx` — global stylesheet order and root providers.
- `src/App.tsx` — auth journey, lazy Home, PWA boot and logout.
- `src/features/auth/screens/LoginExperience.tsx` and Login components.
- `src/features/home/HomeScreen.tsx` — Home composition and interaction/state ownership.
- `src/features/home/moduleRegistry.ts` — library/workflow IDs and readiness metadata.
- `src/features/home/components/HomeModuleLibrarySection.tsx`, `ModuleLibraryEngine.tsx`.
- `src/features/home/components/SettingsHub.tsx`, `src/shared/pwa/updateCenterStore.ts`.
- `src/features/stocktake/components/StocktakeModule.tsx` and stocktake services.
- `src/features/stocktake-import/components/StocktakeImportModule.tsx` and import services.
- `src/styles/theme.css`, `base.css`, `responsive.css`, `mobile-tuning.css`, Home and Login styles.
- `tests/browser/login-responsive.spec.ts`, `playwright.config.ts`, `scripts/test-design-foundation-contract.mjs`.
