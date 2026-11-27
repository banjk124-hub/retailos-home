# SH-01 — Shell & Presentation Ownership

**Status:** SH-01B, SH-01C and SH-01D implementation slices are present on `refactor/sh-01b-authenticated-shell`; exact-head CI and browser regression evidence are pending.
**Baseline:** `main` at `ae0ee4cde5ce8ccd160b77cf5198dbb103b82b45` (2026-11-27).
**Product policy:** PA-02 / PD-008 / ADR-030 and `PLATFORM_CAPABILITY_MATRIX.md`.

## 1. Baseline reconciliation

PR #192 was merged by GitHub into `audit/platform-experience-architecture`, not directly into `main`. The inspected `main` baseline therefore still contained the combined responsive `ShellNavigation` and did not contain the PR #192 Desktop/Mobile renderer files. This SH-01 continuation is based on the current `main` commit and ports the navigation ownership work into the new implementation branch before continuing.

## 2. Audited ownership before SH-01

- `App.tsx` owned session/auth state, login and identity journey state, online/offline state, install prompt, app-transition update blocker, camera release and cache cleanup on logout. It also rendered the authenticated background, identity recognition view, Home lazy boundary and loading fallback.
- `HomeScreen.tsx` owned one Home workflow state tree: navigation, notifications, settings, manual barcode lookup, camera scanner lifecycle request, calendar, library, Stocktake, Stocktake Import and overlays.
- `ShellNavigation.tsx` combined Desktop rail and Mobile dock in one component and relied on CSS media queries to select the visible renderer.
- Scanner runtime detection includes iPadOS touch heuristics. That is not sufficient authority to offer camera scanning on Tablet.
- `useHomeSpotlightViewport` uses viewport width for compact notification behavior. This remains responsive adaptation, not a platform capability selector.

## 3. SH-01B — Authenticated App Shell

Implemented:
- Added `src/platform/shell/AuthenticatedAppShell.tsx` as the authenticated presentation composition boundary.
- Moved authenticated background composition, identity recognition presentation, Home lazy-loading boundary and Home loading fallback out of `App.tsx`.
- `App.tsx` remains the single owner of session/auth state, authentication/logout actions, online/offline and install state, transition timing, camera release, cache cleanup and PWA update-safety blocker.
- The shell receives state and callbacks through typed props. It does not import or mutate session storage, cache cleanup or update-safety services.
- Home remains lazy-loaded at the authenticated shell boundary; the identity journey does not mount Home early.

Protected:
- Session read/save/clear and employee/department validation.
- Logout camera release, transition delay and cached module data cleanup.
- App-transition PWA update blocker, boot-health reporting and update-safety notifications.
- Home boot-ready and update-center entry cleanup behavior.

## 4. SH-01C — Explicit Platform Presentation Roots

Implemented:
- Added `useRetailPlatform()` and `resolveRetailPlatform()` in `src/shared/platform/platformContext.ts`.
- Classification uses active pointer/hover capabilities plus touch capability and the physical screen short edge. It does not use viewport breakpoints or User-Agent as the platform policy.
- Fine pointer + hover resolves to Desktop. Coarse touch resolves to Mobile on a short screen edge below 600 CSS pixels, and Tablet on a short edge at/above 600 CSS pixels. Ambiguous/unknown input contexts conservatively resolve to Tablet.
- Added independent `DesktopHomePresentation`, `MobileHomePresentation` and `TabletHomeCompatibilityPresentation` roots. Desktop and Mobile have separate ownership components and stylesheet entry points; they currently use `display: contents` to preserve the existing DOM layout while establishing a safe composition seam for CSS-01 and bounded feature migration.
- `AuthenticatedAppShell` resolves the active platform once and passes it to Home. `HomeScreen` remains the single shared stateful Home controller; it does not fork business state.
- `ShellNavigation` now explicitly renders only the Desktop rail or Mobile dock for those contexts. Tablet temporarily retains the prior responsive shell as a compatibility fallback; this is not a Tablet product design or approval.
- Camera scanner affordances and scanner settings entry/copy are offered only when the resolved context is Mobile **and** the existing scanner runtime detector reports support. Manual barcode lookup remains available across all contexts.
- Tablet therefore does not inherit Mobile scanner capability even where the legacy runtime detector recognizes iPadOS.

Important classification limitation:
- The resolver selects an interaction/presentation context, not a definitive hardware identity. A touch-first Tablet is review-required; a device using a fine pointer + hover follows Desktop interaction presentation. PW-01 must validate real devices and installed PWA modes before any stronger hardware claim.
- Tablet's current navigation remains a temporary legacy compatibility surface. No new Tablet information architecture is approved.
- Settings shared foundation CSS still contains historical scanner-settings class names because Update Center and Settings share the stylesheet. Scanner-specific menu markup is hidden outside Mobile; selector/style ownership is a CSS-01 task.

## 5. SH-01D — Integration and regression boundary

Required automated checks, registered in `npm run preflight`:
- `test-sh-01-authenticated-shell.mjs`: App retains session/auth and PWA lifecycle ownership; authenticated shell only composes presentation.
- `test-sh-01-platform-presentation.mjs`: resolver signals, Desktop/Mobile/Tablet roots, scanner Mobile-only gate and Tablet-safe settings entry.
- `test-shell-navigation-contract.mjs`: one shared destination contract with explicit Desktop/Mobile renderers and Tablet compatibility renderer.

Existing preflight continues to cover UI-02 navigation/notice/calendar/lookup ownership, UI-04 feature presentation, scanner lifecycle and runtime contracts, Stocktake/import, overlay scroll lock, PWA lifecycle, bundle boundaries and production/Pages builds.

Exact-head CI, Playwright screenshots/runtime evidence and physical device validation must be recorded separately. A successful static contract test does not certify actual visual equivalence, iOS/Android behavior or low-end performance.

## 6. Ownership contract after SH-01

| Responsibility | Owner |
|---|---|
| Auth/session, identity, logout and PWA lifecycle | `App.tsx` / shared services |
| Authenticated scene and journey rendering | `AuthenticatedAppShell` |
| Platform context snapshot | `shared/platform/platformContext.ts` |
| Home workflow state and shared business orchestration | `HomeScreen` |
| Desktop Home presentation boundary | `DesktopHomePresentation` |
| Mobile Home presentation boundary | `MobileHomePresentation` |
| Tablet compatibility boundary | `TabletHomeCompatibilityPresentation` |
| Desktop navigation rendering | `DesktopShellNavigation` |
| Mobile navigation rendering | `MobileShellNavigation` |
| Tablet temporary navigation fallback | `TabletShellNavigation` |
| Feature/domain state and operation results | Existing feature/domain owners |

## 7. Explicit non-goals and next phases

- SH-01 does not duplicate Home state, module registry, domain services or feature workflow implementations.
- SH-01 does not redesign visuals, rewrite CSS globally, change scanner engine/camera lifecycle, modify Stocktake persistence/export, or change PWA update lifecycle.
- CSS-01 owns the measured migration of global/mobile-tuning/feature selectors into shared foundation, platform presentation and feature presentation layers.
- PW-01 owns physical PWA runtime acceptance (standalone/display-mode, safe areas, dynamic viewport, keyboard, orientation, permissions and OS/browser lifecycle).
- MIG-01 owns subsequent feature-by-feature presentation migration after the roots and CSS ownership map are verified.

## 8. Rollback

Revert the SH-01 branch commits. Restore the original `App.tsx` authenticated render, original `ShellNavigation.tsx` and `ShellNavigation.css`, remove the platform context/root components and restore Home/Settings props. Existing auth/session, domain, data, scanner, Stocktake and PWA service contracts remain unchanged.
