# Platform Experience & Architecture Audit

**Date:** 2026-11-27  
**Repository:** `banjk124-hub/retailos-home`  
**Audited baseline:** `main` at `6925cf968ea2b9c37377856abaf4c4a2ca6785a0`  
**Decision authority:** `DECISIONS.md` PD-007 and `ARCHITECTURE.md` ADR-030  
**Scope:** static source audit for platform capability, shell/navigation, PWA runtime/display context, CSS ownership and migration readiness.

## 1. Executive result

The owner-confirmed direction is consistent with the product's current domain boundaries. The implementation is still primarily **one shared React experience with responsive presentation variants**, not independently owned Desktop and Mobile products. The owner has now confirmed PA-02: all nine current Home workflows are shared Desktop/Mobile; camera scanner and its dedicated copy/CSS are Mobile-only; manual lookup remains shared; Tablet remains review-required.

Confirmed today:
- One shared LoginExperience and one HomeScreen serve all form factors.
- One ShellNavigation component renders desktop-rail and mobile-dock presentations; CSS chooses which is visible.
- Home's workflow registry contains nine workflows and now carries explicit Desktop/Mobile platform policy metadata. All nine are shared; Tablet remains review-required. The current library has no platform filter because no current workflow is Desktop-only or Mobile-only.
- Barcode camera access is explicitly restricted to Android/iOS-classified devices; manual lookup remains available as the fallback. Stocktake similarly exposes camera scanning only on those devices and retains manual barcode entry.
- The PWA manifest requests `display: standalone`; installed mode is not equivalent to guaranteed fullscreen.
- Responsive policy is distributed across global responsive/mobile CSS and feature-owned styles. Several distinct viewport thresholds currently control different behavior.

Not established:
- The owner-approved Desktop/Mobile capability matrix is recorded in `PLATFORM_CAPABILITY_MATRIX.md`; typed metadata is added to the Home registry in this workstream. Tablet remains explicitly review-required.
- No independently owned DesktopShell and MobileShell components were found in the inspected application entry/Home/navigation path.
- Physical device behavior, OS-specific display modes, browser chrome and keyboard behavior have not been accepted by this static audit.
- No production CSS output/compressed-transfer baseline or computed-style/browser evidence was generated in this remote source review.

**Disposition:** source audit complete and PA-02 matrix owner-confirmed. Typed policy metadata is being added without activating a platform filter because all current Home workflows are shared Desktop/Mobile. Do not begin broad CSS rewrite or create a second application. Next design SH-01 presentation ownership using the shared-core/independent-presentation contract.

## 2. Platform capability audit

### 2.1 Current workflow inventory

The source registry in `src/features/home/moduleRegistry.ts` declares nine workflows and now carries a typed `platformAvailability` policy independent from `dataSource`, engineering `availability` and `workStatus`. `HomeModuleLibrarySection` still filters only by search text; this is intentional because all nine current workflows are shared Desktop/Mobile. A future platform-only workflow must not be added until a platform context resolver/filter is implemented and tested.

| Workflow / capability | Source evidence | Current platform behavior established by source | Audit classification |
|---|---|---|---|
| Tồn kho | `moduleRegistry.ts` | Shared entry; typed policy Desktop/Mobile available | Shared Desktop + Mobile |
| Giá & vốn | `moduleRegistry.ts` | Shared entry; typed policy Desktop/Mobile available | Shared Desktop + Mobile |
| Danh mục hàng hóa | `moduleRegistry.ts` | Shared entry; typed policy Desktop/Mobile available | Shared Desktop + Mobile |
| Nhập / xuất hàng | `moduleRegistry.ts` | Shared entry; typed policy Desktop/Mobile available | Shared Desktop + Mobile |
| Điều chuyển hàng | `moduleRegistry.ts` | Shared entry; typed policy Desktop/Mobile available | Shared Desktop + Mobile |
| Doanh số | `moduleRegistry.ts` | Shared entry; typed policy Desktop/Mobile available | Shared Desktop + Mobile |
| Date sản phẩm | `moduleRegistry.ts` | Shared entry; typed policy Desktop/Mobile available | Shared Desktop + Mobile |
| Kiểm kê | `StocktakeModule.tsx` | Shared workflow; camera is a separate Mobile-only capability; manual input remains shared | Shared Desktop + Mobile; camera Mobile-only |
| Xuất file kiểm kê | `StocktakeImportModule.tsx` | Local workbook processing/history, typed policy Desktop/Mobile available | Shared Desktop + Mobile |
| Tra cứu thủ công | `HomeScreen.tsx` | Shared manual lookup action | Shared Desktop + Mobile |
| Quét barcode bằng camera | `scannerCapabilities.ts` | Mobile-only product policy; current runtime detector still uses UA/iPad touch fallback | Mobile-only; Tablet review-required |
| Cài đặt / Update Center | `SettingsHub.tsx` / `PwaUpdatePrompt.tsx` | Shared settings and update-safety journey | Shared Desktop + Mobile |
| Push notifications | Home push integration | Runtime/API/permission/install state, not platform-exclusive | Runtime-dependent across platforms |

**Important distinction:** the six registry entries marked `integrating` are engineering availability states, not proof of a complete operational workflow. `ready` is also not a platform availability declaration. Do not use either field to infer platform support.

### 2.2 Capability policy gaps

- The registry now has typed `platformAvailability` metadata. A runtime platform resolver/filter is not implemented yet; it is not needed for the current all-shared module set and must precede any platform-only module.
- Camera scanner product policy is now represented as Mobile-only separately from runtime device/API/permission detection. Tablet remains review-required; the existing iPad touch heuristic is not a Tablet product decision.
- The scanner check uses User-Agent plus iPad touch detection. It correctly accounts for one iPadOS quirk, but it does not distinguish API capability, permission state, camera availability and product policy as separate dimensions.
- The same feature library is rendered across viewport sizes; the source does not currently hide or replace complete workflows by platform.
- The Activity section is a static empty state in the inspected Home source, not a functional platform-specific activity workflow.

**Implementation:** a small typed platform availability policy is now added to the Home registry. It does not alter engineering readiness or data status and does not yet activate filtering. Keep business workflow IDs and data contracts platform-neutral. Platform availability must be resolved by a platform context/presentation policy, not by duplicating domain logic or encoding platform rules in CSS.

## 3. Shell and navigation audit

### 3.1 Current ownership

- `src/App.tsx` owns a single auth journey: login → identity → Home. It mounts one `LoginExperience` and lazy-loads one `HomeScreen`.
- `LoginExperience.tsx` composes one `LoginHero` and one `LoginForm`; the same component is adjusted by responsive CSS. No platform-specific Login composition was found in the inspected entry path.
- `HomeScreen.tsx` owns one Home experience, one destination set (`home`, `modules`, `activity`, plus Settings action) and one `useHomeNavigation` state/scroll model.
- `ShellNavigation.tsx` renders both desktop and mobile navigation DOM variants from the same props/state. `ShellNavigation.css` shows the persistent rail above 900px and the bottom dock at 900px and below.
- `LiquidDock` is therefore a mobile/compact presentation component, not an independently owned Mobile Shell. The desktop rail is another presentation of the same destination model.

### 3.2 Current responsive thresholds

| Concern | Current threshold | Source | Meaning |
|---|---:|---|---|
| Home navigation presentation | 900px | `ShellNavigation.css` | Rail vs bottom dock |
| Home spotlight collapse/expand | 700px | `useHomeSpotlightViewport.ts` | Notification grouping behavior |
| Dock width treatment | 701–1099px / <=700px | `LiquidDock.css` | Width/position adaptation |
| Legacy/general responsive composition | 1200 / 940 / 700 / 370px | `responsive.css` | Many unrelated layout adjustments |
| Mobile tuning | 700 / 380 / 360px and others | `mobile-tuning.css` | Global cross-feature overrides |
| Login compact landscape | <=900px and height <=520px | `login-compact-landscape.css` | Login-specific landscape treatment |
| PWA update prompt | 560px | `pwa-update-prompt.css` | Prompt sizing |

These are layout thresholds, not a consistent Desktop/Tablet/Mobile capability model. In particular, 700px and 900px create different transitions inside Home, and Tablet behavior is currently an emergent result of CSS rather than a documented product context.

### 3.3 Finding

**FPA-01 — One shared shell with responsive variants (confirmed).**  
Current source does not yet implement independently owned Desktop and Mobile shells. This is not automatically a defect: it is a current-state observation. The owner-approved target permits independent shells where workflows and operating contexts justify them.

**FPA-02 — Navigation destinations are shared (confirmed).**  
Desktop rail and mobile dock receive the same `items`, `activeId`, `onSelect` and action. No platform-specific destination policy exists.

**FPA-03 — Breakpoints currently imply platform behavior (confirmed).**  
The navigation switch is viewport-width based. The scanner capability is user-agent based. Neither alone is a complete capability/presentation selector.

**Owner direction:** preserve one domain/navigation destination identity model where semantics match. Desktop and Mobile may own separate shell/navigation presentation and layout composition while using the same destination identity and shared business state. Do not duplicate Home's state machine or module registry merely to get two layouts.

## 4. PWA runtime and display-context audit

### 4.1 Confirmed

- `public/manifest.webmanifest` declares `display: standalone`, `start_url: ./` and `scope: ./`.
- `index.html` uses `viewport-fit=cover`, which allows the layout to account for display cutouts/safe areas.
- The app listens for `beforeinstallprompt` and checks `(display-mode: standalone)` to suppress an install action when already installed in standalone mode.
- Existing CSS uses safe-area insets and dynamic viewport units in multiple overlays, navigation and update prompt rules.
- The PWA update architecture is consent-gated and protects active business workflows; this audit does not propose changes to that lifecycle.

### 4.2 Not established / risks

- The manifest does not request `fullscreen`; current installed-mode target is standalone. Standalone may continue to show OS/browser system UI and must not be described as guaranteed immersive fullscreen.
- In the inspected app entry, display-mode is checked only in the install-prompt event handler. No complete display-mode state service or Desktop/Tablet/Mobile presentation policy was found.
- `viewport-fit=cover` and safe-area CSS do not by themselves prove correct behavior with iOS Safari, iOS Home Screen PWA, Android Chrome, desktop-installed PWA, virtual keyboard, orientation changes or split-screen.
- The current PWA update prompt has a narrow-screen CSS adaptation, but this is not evidence of a platform-specific release experience.
- The historical status text at the top of `PWA_RUNTIME_RELEASE.md` is dated 2026-11-16 and must be refreshed separately against current PR/CI/runtime state before being treated as current. This audit does not rewrite its release history.

**Recommendation:** retain standalone as the default installed mode. Treat fullscreen as an optional, workflow-specific capability requiring a real use case, browser support check, user expectation review and tested fallback. Do not switch manifest display mode to fullscreen as a general design fix.

## 5. CSS ownership audit

- Root `src/main.tsx` imports 11 CSS files eagerly, including global `responsive.css` and `mobile-tuning.css`.
- `mobile-tuning.css` is a global file with broad selectors and multiple media-query groups; it is not isolated to a Mobile Shell. Its presence is a cascade/ownership risk, not proof that the file can be removed.
- Login owns `login-experience.css` and `login-compact-landscape.css`, but its responsive behavior also depends on global responsive/mobile styles.
- Home owns four feature stylesheets and uses global foundation/mobile rules in addition to feature-owned CSS.
- Navigation owns `ShellNavigation.css` and `LiquidDock.css`; the former switches between the rail and dock at 900px.
- Stocktake and Stocktake Import retain feature-owned stylesheets and should remain so unless actual shared consumers demonstrate a stable contract.
- PWA update prompt owns its own CSS and uses a 560px adaptation.
- Platform capability must not be inferred from a CSS selector or media query. CSS should style a selected presentation; it should not be the source of business/workflow availability truth.

**Recommendation:** keep three explicit layers in the future ownership map: shared foundations, platform presentation, and feature-owned presentation. Move rules only after tracing cascade, imports, consumers and computed-style parity.

## 6. Findings and severity

| ID | Finding | Severity | Evidence / consequence |
|---|---|---|---|
| FPA-01 | One shared App/Login/Home composition, not independent shells | Medium | Target permits separation, but current implementation uses one composition |
| FPA-02 | Same navigation destinations on Desktop and Mobile | Low / product decision pending | No platform capability filtering |
| FPA-03 | Multiple unrelated breakpoints control layout and some interaction behavior | Medium | Tablet experience is emergent; widths do not define operating capability |
| FPA-04 | Platform availability was previously absent from registry; typed policy metadata is now added | Resolved in this PR | Product policy is separate from readiness, data, permissions and runtime states |
| FPA-05 | Scanner runtime detector uses User-Agent/touch heuristic | Medium / follow-up | Product policy is now Mobile-only; runtime device/API/permission detection and Tablet validation remain separate |
| FPA-06 | Standalone PWA mode is configured; fullscreen is not the manifest target | Low | Do not assume immersive behavior; physical acceptance pending |
| FPA-07 | Global mobile CSS crosses feature ownership | High | Risk of accidental cross-platform regressions; not safe to delete wholesale |
| FPA-08 | Physical platform acceptance is absent from this audit | High validation gap | Browser/source inspection cannot establish OS behavior |

## 7. Recommended target architecture (no source change in this audit)

1. **Shared product/domain core:** identity, workflow IDs, business rules, data contracts, persistence and operation state.
2. **Platform capability policy:** explicit per-workflow availability and capability reasons, independent from engineering progress/data readiness/permission/connectivity.
3. **Platform presentation roots:** Desktop and Mobile have independently owned shell/presentation roots for their different operating patterns; shared app identity, workflow IDs, business state and domain use cases remain common. Tablet has an explicit review gate.
4. **Feature presentation:** feature-owned workflow UI may have platform-specific variants while sharing domain operations and validation.
5. **Responsive adaptation:** viewport/orientation changes adapt the chosen presentation; they do not decide whether a workflow exists.
6. **PWA platform adapter:** expose installed/display-mode, relevant API support, permissions and lifecycle signals without embedding OS assumptions into domain logic.
7. **Shared visual identity:** brand and business semantics remain coherent; visual composition and information density can vary by platform.

Avoid a `DesktopApp` and `MobileApp` fork that duplicates business logic. Keep the application/session boundary shared, but make Desktop/Mobile presentation composition independently changeable. Avoid a universal component abstraction that forces unlike workflows into the same layout.

## 8. Migration plan and gates

| Phase | Work | Exit criteria | Status |
|---|---|---|---|
| PA-01 | Capability inventory and source audit | Current workflow and capability evidence mapped; gaps recorded | Complete — static source audit |
| PA-02 | Owner review of Desktop/Tablet/Mobile capability matrix | Each relevant workflow marked Desktop / Tablet / Mobile / shared / not offered, with rationale | Complete — owner-confirmed; see PLATFORM_CAPABILITY_MATRIX.md |
| SH-01 | Shell/navigation ownership design | Shared identity/state contract and separate presentation boundaries defined from evidence | In progress — initial navigation renderers separated; App/Home roots remain shared; see SH-01_SHELL_PRESENTATION_OWNERSHIP.md |
| PW-01 | PWA display/runtime validation | Installed mode, system UI, safe area, viewport, keyboard, orientation and fallback tested on target OS/browser | Source audit complete; device validation pending |
| CSS-01 | CSS ownership map | Shared foundation/platform/feature layers mapped; cascade and import order evidenced | Static map started; computed-style/runtime baseline pending |
| MIG-01 | Bounded migration proposal | Before/after architecture, files, rollback and regression plan approved | Blocked by SH-01, PW-01 and CSS-01 |

### Owner-confirmed platform matrix

| Workflow | Desktop | Tablet | Mobile | Rationale / operational context |
|---|---|---|---|---|
| Tồn kho | Available | Review required | Available | Shared workflow and business result |
| Giá & vốn | Available | Review required | Available | Shared workflow and business result |
| Danh mục hàng hóa | Available | Review required | Available | Shared workflow and business result |
| Nhập / xuất hàng | Available | Review required | Available | Shared workflow and business result |
| Điều chuyển hàng | Available | Review required | Available | Shared workflow and business result |
| Doanh số | Available | Review required | Available | Shared workflow and business result |
| Date sản phẩm | Available | Review required | Available | Shared workflow and business result |
| Kiểm kê | Available | Review required | Available | Shared workflow; camera scanning is a separate Mobile-only capability |
| Xuất file kiểm kê | Available | Review required | Available | Shared workflow and business result |
| Tra cứu thủ công | Available | Review required | Available | Shared lookup operation and result |
| Quét camera barcode | Not offered | Review required | Available | Mobile-only; Tablet/iPad policy is not inferred from the current detector |
| Cài đặt / Update Center | Available | Review required | Available | Shared update-safety journey |
| Push notifications | Runtime-dependent | Runtime-dependent | Runtime-dependent | Browser API, permission, installation and OS/browser conditions |

## 9. Protected invariants and explicit non-goals

No changes are made to:
- Auth/session/employee identity and department semantics.
- Stable module/workflow IDs, registry business meaning or data snapshot contracts.
- Scanner Engine, camera lease/lifecycle, decoder, ROI, worker or recovery policy.
- Stocktake persistence, revisions, history, validation and export format.
- Stocktake Import parsing, precision, conflict resolution, dirty edits, persistence and output.
- Overlay focus/body-scroll-lock ownership.
- PWA update consent, candidate staging, integrity, activation, boot-health and rollback.
- Vite/GitHub Pages base path, lazy-loading or deployment boundaries.

This audit does not select visual style, palette, typography, imagery, motion language, or require a full-screen manifest mode. It does not authorize broad CSS deletion or application-source migration.

## 10. Evidence and limitations

- Source inspected on GitHub at the exact main baseline above.
- Static source evidence includes App, main entry, module registry/library, Home navigation, ShellNavigation/LiquidDock, Login, Scanner capability gate, Stocktake, Stocktake Import, PWA manifest/update entry and responsive CSS.
- No local checkout or production build was executed in this audit; no emitted bundle, compressed transfer size, computed styles, browser screenshots, Playwright run or physical device test is claimed.
- `PWA_RUNTIME_RELEASE.md` contains dated historical status at its top; revalidate that separately before relying on its PR/CI statements.
- The owner must decide the unresolved workflow/platform matrix before a capability filter is implemented.

## 11. Final disposition

**Platform Experience & Architecture Audit: source-inspection complete; PA-02 matrix owner-confirmed and typed registry metadata added in the current PR.**

SH-01 has begun with an isolated Desktop/Mobile navigation rendering boundary and shared destination contract. The authenticated App and Home composition roots remain shared; this slice does not claim complete independent shells or implement a platform capability resolver/filter. Next work is the authenticated shell boundary and incremental Home presentation composition, followed by CSS-01 ownership migration and PW-01 physical PWA validation. No broad migration should begin until the relevant boundaries and regression evidence are defined.
