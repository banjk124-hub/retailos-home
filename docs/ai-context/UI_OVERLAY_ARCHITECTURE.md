# RetailOS UI overlay and viewport architecture

**Status:** Implemented on PR #102 branch `fix/ux-cross-platform-core-audit`; automated checks are recorded in the PR. Physical-device acceptance remains pending.

## Scope and ownership

This document is the source of truth for modal/overlay lifecycle, page scroll locking and viewport-safe overlay layout. Feature modules own their content and close behavior; the shared layer owns only cross-overlay scroll-lock coordination. It does not own scanner camera lifecycle, module business state or feature presentation.

| Surface | Owner | Modal behavior | Background scroll lock |
|---|---|---|---|
| Home barcode camera | `HomeScreen` + `BarcodeScanner` | Full-screen camera surface | Home owns lock while `isBarcodeScannerOpen` |
| Barcode lookup result | `HomeScreen` | Dialog | Home owns lock while result exists |
| Calendar | `HomeScreen` | Dialog with exit state | Home owns lock until close transition completes |
| Notification detail | `HomeScreen` | Dialog with exit state | Home owns lock until detail is removed |
| Module library | `HomeScreen` + `MotionSheet` | Sheet/dialog | Home owns lock until exit animation completes |
| Settings | `SettingsHub` | Dialog | Home + SettingsHub acquire coordinated locks |
| Scanner settings | `ScannerSettingsPanel` | Dialog | Home + panel acquire coordinated locks |
| Scanner QA | `ScannerQaMonitor` | Dialog | Home + monitor acquire coordinated locks |
| Stocktake | `StocktakeModule` | Full-screen on mobile, centered panel on desktop | Module acquires lock |
| Stocktake Import | `StocktakeImportModule` | Full-screen on mobile, workspace panel on desktop | Module acquires lock |
| Notification popover | `HomeScreen` | Non-modal anchored popover | No page lock by design |

## Shared scroll-lock contract

- `src/shared/services/bodyScrollLock.js` is the single lock manager.
- `acquireBodyScrollLock(document)` increments a per-document reference count and captures the original inline `body.style.overflow` on the first acquisition.
- Each acquisition returns an idempotent release callback.
- The original inline overflow value is restored only when the final owner releases.
- Separate documents have independent state.
- `src/shared/hooks/useBodyScrollLock.ts` binds acquisition/release to React effect lifecycle.
- Home holds a parent lock across full-screen/modal handoffs so switching Settings → Scanner QA/Scanner Settings or Library → Stocktake does not momentarily unlock the page. Child surfaces may acquire their own lock safely.
- Do not add independent `previousOverflow` snapshot/restore logic to a new overlay. Use the shared hook or explicitly document why the surface is non-modal.

## Layout and responsive contract

- Modal backdrops use fixed viewport positioning and account for all applicable safe-area edges.
- Height constraints use dynamic viewport units (`dvh`) with safe-area deductions where content must fit above browser chrome.
- A backdrop that may contain an oversized panel must itself remain scrollable; modal content must have a bounded height and an intentional internal scroll region.
- Scrollable inner regions use `overscroll-behavior: contain`; use `-webkit-overflow-scrolling: touch` for iOS scroll containers where appropriate.
- Do not use a mobile-only fixed height without checking short landscape viewports and browser chrome changes.
- Preserve per-feature visual ownership and CSS chunk boundaries. The owning lazy component imports its required stylesheet.

## Current implementation files

- Lock service: `src/shared/services/bodyScrollLock.js`
- Type declaration: `src/shared/services/bodyScrollLock.d.ts`
- React hook: `src/shared/hooks/useBodyScrollLock.ts`
- Home owner/state: `src/features/home/HomeScreen.tsx`
- Settings styles: `src/styles/scanner-settings.css`
- Scanner QA styles: `src/styles/scanner-qa-monitor.css`
- Home overlay styles: `src/styles/mobile-tuning.css`, `src/styles/home-ux.css`
- Stocktake styles: `src/features/stocktake/components/stocktake.css`
- Stocktake Import styles: `src/features/stocktake-import/components/stocktake-import.css`

## Accessibility and known boundaries

- Dialogs retain semantic `role="dialog"`, `aria-modal="true"` and a valid accessible label.
- Close actions must be keyboard reachable; Escape closes the active dialog where implemented.
- Focus moves to a close/action control on open in the Home, Settings, Scanner Settings and QA flows.
- A reusable focus-trap/stack manager is not implemented. Do not claim complete WCAG modal focus containment until it is added and tested.
- The shared body lock coordinates inline body overflow; it does not replace physical iOS Safari scroll testing. Verify touch scroll containment and page position restoration on real devices.
- Nested confirmation/review surfaces are owned by their parent feature overlay and must not independently unlock the page when dismissed.

## Regression tests

Run `npm run preflight`. Relevant source-level tests:

- `scripts/test-body-scroll-lock.mjs`: reference counting, out-of-order release, idempotence, restoration and independent documents.
- `scripts/test-overlay-layout-contract.mjs`: safe-area, dynamic viewport, backdrop scrolling, long content and Home scanner lock wiring.

Automated source-contract tests do not prove browser rendering or device touch behavior. The device matrix lives in `UI_OVERLAY_ACCEPTANCE.md`.
