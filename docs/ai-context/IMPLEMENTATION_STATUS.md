# Current implementation status — 2026-11-26

**Repository:** `banjk124-hub/retailos-home`  
**Active branch:** `feat/retailos-greenfield-experience`  
**PR:** [#174 — Greenfield Experience rebuild](https://github.com/banjk124-hub/retailos-home/pull/174)  
**UI/UX authority:** [EXPERIENCE_BUILD_STANDARD.md](./EXPERIENCE_BUILD_STANDARD.md)  
**Engineering authority:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)

## Product and architecture boundary
- RetailOS Experience Layer is being rebuilt greenfield; the legacy UI is not the design foundation.
- Business Core remains protected: authentication/session, employee identity, module registry/readiness, business workflows, persistence/offline semantics, Scanner Engine, Stocktake/Import contracts, PWA update safety and Pages deployment contract.
- No merge, deployment or production promotion is authorized. PR #174 remains Draft and unmerged.

## Implemented Experience slices
- **Login:** responsive employee Login presentation; existing employee-code authentication and session handoff retained.
- **Authenticated App Shell:** desktop workspace rail, topbar, department/workspace identity, connection state, navigation, employee/logout and install actions; mobile topbar and safe-area-aware footer navigation.
- **Operational Home:** employee/department context, direct launch grid derived from the real Module Registry, truthful ready/integrating states and snapshot-backed operational notices.
- **Module Library:** five registry-backed groups, Vietnamese search/filter and truthful readiness counts.
- **Library Detail:** group overview, real module readiness and source context; Stocktake and Stocktake Import launch their existing workflows.
- **Activity Center:** live snapshot-derived notices and persisted PWA update state. General event history remains explicitly unavailable until a real event-log source is connected.
- **Settings Experience:** new settings hierarchy for the actual Update Center and Scanner Settings controls. Existing update action/state contracts and scanner preference storage/handoff remain the owners.
- **Stocktake workspace:** greenfield responsive presentation for session/zone entry, scanning, review, history and exports. Existing Stocktake session, revision, IndexedDB, scanner handoff and export logic remain unchanged.
- **Stocktake Import workspace:** greenfield responsive workbook/import workspace, zone navigation, review table, TXT preview and history presentation. Parser, local fingerprinting, staged conflict confirmation, dirty-edit guards, IndexedDB history and TXT/ZIP output remain unchanged.
- **Workspace integration:** Import content wrapper no longer creates a second semantic `main` landmark; both operational modules retain their existing dialog and close contracts.
- **Integration corrections:** one semantic `main` landmark in the authenticated experience; Activity update signals route directly to Update Center; Settings returns focus to its invoking control after close.

## Operational workspace implementation
- Added isolated presentation stylesheets: `stocktake-experience.css` and `stocktake-import-experience.css`; existing feature styles remain loaded for behavior-compatible components, with the new Experience layer owning the responsive visual treatment.
- Desktop workspaces use expanded task surfaces; mobile uses viewport-filling layouts with safe-area padding, bounded scrolling and touch-sized controls. Reduced-motion preferences are respected.
- No changes to Stocktake/Import service, parser, session, persistence, scanner, revision/conflict, validation or output code.
- Browser regression added for Library → Stocktake and Library → Xuất file entry, responsive desktop surface sizing and single `main` landmark.

## Integration verification
- CI #1693 passed on `8117d1904ba291a927e864213e5d4b40c34daf47` (Settings Experience implementation).
- CI #1695 passed on `b09ea271fb58fcf0ed9b7626cf4f1d491567652c` (integration corrections and browser coverage).
- CI #1695: change-scoped preflight passed; TypeScript and GitHub Pages production build passed; Playwright browser suite passed **11/11**.
- Browser coverage includes Login, authenticated desktop/mobile shell, horizontal overflow/runtime errors, real module readiness, Library Detail and focus restore, Activity event-log truthfulness, Settings → Update Center → Scanner Settings, one main landmark, settings focus restoration and direct Activity → Update Center routing.
- Browser emulation is not physical-device acceptance. Desktop, tablet, Android Chrome/PWA and iOS Safari/PWA acceptance remain outstanding.

## Remaining work
1. Complete automated CI validation and cross-workspace regression for the Stocktake and Stocktake Import presentation migration; fix any integration regressions found.
2. Perform coherent vertical-slice physical QA on representative desktop, tablet, average/low-end Android and iOS devices; validate touch scroll, safe areas, focus, camera and PWA update behavior.
3. Complete owner visual acceptance before merge/release decisions.

## Scanner and release
Scanner stabilization and ecosystem cleanup remain closed. Do not reopen SC-01–SC-05 for UI redesign. See [SCANNER_ENGINE.md](./SCANNER_ENGINE.md) and [SCANNER_HISTORY.md](./SCANNER_HISTORY.md).
CI, browser emulation, physical-device QA, owner visual acceptance, merge, deployment and production transfer are separate gates.
