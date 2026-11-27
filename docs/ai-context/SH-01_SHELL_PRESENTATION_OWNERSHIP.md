# SH-01 — Shell & Presentation Ownership

**Status:** Initial navigation ownership boundary implemented on the stacked SH-01 branch. Full application-shell and Home presentation separation remains in progress.

## Purpose

Establish independent Desktop and Mobile presentation ownership without creating separate applications or duplicating business behavior.

## Audited baseline

- `App.tsx` owns the authenticated session boundary, login/identity journey, online/offline state, install prompt, transition state and PWA update-safety blocker. It lazy-loads one `HomeScreen`.
- `HomeScreen.tsx` is still a large composition boundary. It coordinates Home navigation, notifications, Settings, manual barcode lookup, camera scanner, Stocktake, Stocktake Import, overlays and the main Home content.
- `ShellNavigation.tsx` previously rendered both Desktop rail and Mobile dock in one component and relied on CSS media queries to show one.
- Desktop and Mobile share destination IDs and navigation callbacks. Those semantics must remain shared.
- `useHomeSpotlightViewport` uses a viewport media query for compact presentation behavior. It must not become a source of platform capability policy.
- Scanner device detection is a separate runtime implementation detail. It does not resolve the product's Tablet policy.

## Ownership contract

| Layer | Shared ownership | Platform-owned responsibility |
|---|---|---|
| App/session | Auth/session lifecycle, employee identity, logout, update safety | No duplicated session state |
| Domain and data | Business rules, workflow IDs, data contracts, persistence and results | No platform-specific business forks |
| Navigation contract | Destination identity, active destination, callbacks, labels and notice counts | Rendering, layout and interaction composition |
| Shell presentation | Shared identity, terminology and status semantics | Desktop and Mobile shell composition, navigation and layout |
| Feature presentation | Shared use cases and operation outcomes | Platform-specific information architecture and component composition |
| Styling | Semantic tokens and truly shared primitives | Platform presentation styles, then feature styles |

## Implemented in this slice

- Extracted `DesktopShellNavigation` as the owner of the persistent Desktop navigation rail.
- Extracted `MobileShellNavigation` as the owner of the Mobile dock presentation.
- Retained `ShellNavigation` as a compatibility composition boundary. It passes the same typed navigation contract to both renderers.
- Split the combined stylesheet into `DesktopShellNavigation.css` and `MobileShellNavigation.css`.
- Preserved destination IDs, active state, disabled state, notice counts, action callbacks, keyboard behavior, safe-area handling and current responsive thresholds.
- Added/updated the shell-navigation ownership contract test, still registered in preflight.

## Explicit limitations — not yet complete

- This is the first ownership seam, **not proof of two fully independent application shells**.
- `App.tsx` and `HomeScreen.tsx` remain shared composition roots. Their extraction requires a separate audited migration of shell-level state and view responsibilities.
- The current media-query adapter continues to select which navigation renderer is visible. It affects presentation only; it must never gate feature capability.
- Tablet remains review-required. No Tablet-specific product or scanner support is implied by the existing breakpoint behavior.
- Global CSS and feature CSS have not been migrated in this phase; that belongs to CSS-01.
- No visual redesign, scanner engine change, domain-state migration or PWA lifecycle change is included.

## Validation contract

- Navigation contract tests must prove both renderers consume the same destination contract.
- Desktop renderer owns only Desktop navigation markup/styles; Mobile renderer owns only Mobile dock markup/styles.
- No duplicated destination registry, navigation state or business callback implementation.
- Existing preflight, TypeScript, production build, bundle checks and Playwright regression suite must pass on the exact SH-01 head.
- Browser viewport tests are not physical iOS/Android acceptance. Physical-device and PWA runtime checks remain in PW-01.

## Next SH-01 work

1. Define the authenticated shell composition boundary around the existing shared session/auth state.
2. Separate Desktop and Mobile shell roots without duplicating Home business state or lazy feature lifecycle.
3. Move navigation ownership from a CSS-selected compatibility wrapper to explicit presentation composition once a platform presentation context can be resolved without guessing Tablet capability.
4. Extract platform-specific Home layout composition incrementally; do not copy the full `HomeScreen` stateful workflow tree.
5. Keep CSS ownership migration in CSS-01 and feature-by-feature migration in MIG-01.

## Rollback

Revert the SH-01 navigation extraction commit(s) and restore the previous `ShellNavigation.tsx` plus combined stylesheet. The shared `LiquidDock`, destination contract, Home navigation state and all feature workflows remain unchanged.
