# UI/UX Screen and Interaction Map — Batch 00C

**Status:** Source-traced AS-IS map and TO-BE information-architecture proposal.
**Audit baseline:** `main` at `2003ea24966755d0ad4e0298b34422b053267e77`
**Audit date:** 2026-11-25
**Purpose:** Describe every confirmed screen/surface, entry point, interaction and important state transition before redesigning layout or navigation.

## 1. Scope and evidence rules

This document is derived from the current source tree, not from intended future modules.

- **AS-IS** means confirmed in the audited source.
- **TO-BE** means a design target that still requires wireframes, interaction specs and acceptance.
- A module registry entry does not prove a complete workflow exists.
- An empty state or placeholder is documented as such; it must not be redesigned as if live data existed.
- Business logic, data contracts, scanner runtime and persistence remain owned by their current feature/domain contracts.
- This map records UI behavior; it does not authorize changing stable IDs, API payloads, IndexedDB schemas or PWA lifecycle.

## 2. Current application journey

### 2.1 Root journey

```text
Browser / PWA launch
  └─ App boot
      ├─ No valid EmployeeSession
      │   └─ Login Experience
      │       └─ Local employee validation
      │           └─ Identity Recognition
      │               └─ Home Workspace
      └─ Existing EmployeeSession
          └─ Home Workspace
```

Confirmed root states in `src/App.tsx`:

| State | Entry condition | UI / action | Exit |
|---|---|---|---|
| login | No session or invalid department | LoginExperience | Successful local authentication |
| identity | Authentication succeeds | Employee identity recognition and brand motion | Identity hold completes |
| home | Existing or newly authenticated session | Lazy-loaded HomeScreen | Logout |
| logout transition | Logout initiated | Camera stream released; transition blocker active | Session and cached module data cleared; return to login |
| Home chunk loading | Authenticated HomeScreen is lazy-loaded | Visible loading surface | HomeScreen mounted |
| offline | `navigator.onLine` is false | Offline status/banner | Online event |

Protected root behavior:
- `readSession`, `saveSession`, `clearSession` own session persistence.
- Local employee lookup/authentication belongs to auth services.
- Home readiness reports to the Service Worker using the current BUILD_ID.
- PWA update blockers prevent release handoff during app transitions.
- Logout releases the camera stream before completing session cleanup.

### 2.2 Login Experience

Owner: `src/features/auth/screens/LoginExperience.tsx`

Current component composition:
- `LoginHero`
- `LoginForm`
- `LoginDock`
- Existing Brand, Glass and Motion components

State machine:

```text
idle
 ├─ input changes ───────────────> idle (clear prior error)
 └─ submit valid non-empty code ─> submitting
                                  ├─ local auth failure ─> error
                                  └─ local auth success ─> success
                                                          └─ authenticated callback
                                                             └─ identity recognition
```

Confirmed interactions:
- Employee code input is numeric-only at input handling.
- Employee and department preview appear when a local employee match is found.
- Submit sets a visible submitting state before local authentication runs.
- Error is announced with an alert; success announces that the workspace is opening.
- Reduced-motion preference skips the short handoff delays.

Not present in the audited login form:
- Password entry.
- A separate remember-login checkbox.
- Remote identity-provider authentication.
- A complete account-recovery workflow.

Do not add these behaviors in the redesign unless separately approved as product requirements.

TO-BE direction:
- Keep the login task short and visually distinct from the authenticated workspace.
- Desktop may use a split hero/form composition; mobile must prioritize the form and keyboard-safe layout.
- Error, loading, matched employee and success states must have explicit visual contracts.
- Photography/brand imagery is an enhancement, never a dependency for completing login.

## 3. Current Home Workspace and navigation

Owner: `src/features/home/HomeScreen.tsx`

### 3.1 Home is currently one long-scroll page

The current top-level navigation IDs are:

| ID | Label | Current behavior |
|---|---|---|
| home | Trang chủ | Scroll to Home top |
| modules | Module | Scroll to the module library section |
| activity | Hoạt động | Scroll to the activity section |
| settings | Cài đặt | Open Settings overlay |

The Home page currently contains:
1. Topbar with brand, employee, department, online/offline indicator, install action when available, notifications and logout.
2. Offline banner when disconnected.
3. Spotlight area with RetailOS messaging, snapshot alerts, department context and a calendar preview.
4. Module Library with search and five category cards/groups.
5. Activity area currently showing “Chưa có hoạt động”.
6. Footer and version label.
7. Floating LiquidDock with primary navigation and a central quick-lookup action.

The active navigation state is derived from scroll position and persisted with search text and scrollY in `retailos.homeUi.v1`.

**Important:** this is section navigation, not a route-based multi-screen application. The current module library opens a group sheet; it does not navigate every module into a distinct routed workspace.

### 3.2 Home quick lookup

Entry: central LiquidDock action.

- Desktop / unsupported scanner device: opens manual product lookup.
- Scanner-supported device: action exposes manual search and barcode scan choices.
- Barcode scan requests a camera lease in the initiating user gesture, unlocks scanner audio and mounts the shared BarcodeScanner.
- Manual lookup opens the result surface with an empty query.
- A scanned barcode opens the same result surface with a query and starts cached lookup.

Lookup state:
- idle input / empty query
- loading (records is null)
- results
- no result
- incomplete result due to missing snapshot sources
- local data read error
- closed

Lookup uses cached module snapshots. It must not present “not found” when a required snapshot read failed.

### 3.3 Module Library

Owner: `HomeModuleLibrarySection`, `ModuleLibraryEngine`, `moduleRegistry.ts`.

Five current library groups:

| Library ID | Group | Module IDs |
|---|---|---|
| goods-control | Kiểm soát hàng hóa | inventory, price, products |
| goods-processing | Xử lý hàng hóa | orders, delivery |
| sales | Doanh số | sales |
| product-dates | Date sản phẩm | product-dates |
| stocktake | Kiểm kê | stocktake, stocktake-import |

Nine registered workflow IDs:

| Workflow ID | Current label | Data source | Current availability | Source-backed status |
|---|---|---|---|---|
| inventory | Tồn kho | snapshot | integrating | Registry entry only; no complete workflow screen confirmed in this audit |
| price | Giá & vốn | snapshot | integrating | Registry entry only |
| products | Danh mục hàng hóa | snapshot | integrating | Registry entry only |
| orders | Nhập / xuất hàng | snapshot | integrating | Registry entry only |
| delivery | Điều chuyển hàng | snapshot | integrating | Registry entry only |
| sales | Doanh số | snapshot | integrating | Registry entry only |
| product-dates | Date sản phẩm | snapshot | integrating | Registry entry only |
| stocktake | Kiểm kê | snapshot | ready | Dedicated Stocktake workflow exists |
| stocktake-import | Xuất file | local | ready | Dedicated Stocktake Import workflow exists; workStatus currently in-progress |

The registry explicitly separates workflow identity from snapshot identity and documents that data source and UI availability are independent.

Current Library interactions:
- Search filters modules by title, description and group.
- Empty search result is explicit.
- Selecting a library opens a MotionSheet/modal with the selected group’s modules.
- The selected module subset is captured when the library opens.
- Closing returns focus to the original trigger when it remains mounted.

TO-BE direction:
- Library becomes a navigable discovery workspace with category, search and availability semantics.
- A module card must state its readiness truthfully.
- Ready, integrating, planned and unavailable states must not be visually conflated.
- The new system must support future modules through registry metadata and reusable workspace patterns without requiring new global layout code for every module.

## 4. Current Home overlays and secondary surfaces

| Surface ID | Owner | Entry | Current UI type | Important states / behavior |
|---|---|---|---|---|
| notifications-popover | HomeScreen | Topbar bell | Non-modal anchored popover | open/closing; snapshot loading/ready/empty/unavailable; list of priority notices; optional push setup |
| notice-detail | HomeScreen | Select snapshot notice | Modal dialog | open/closing; Escape; focus return to trigger |
| calendar | HomeScreen | Calendar preview tile | Modal dialog | month navigation; selected date; close animation; agenda currently always says no calendar exists |
| module-library-sheet | HomeScreen + MotionSheet | Select library group | Modal sheet/dialog | enter/exit; origin-aware motion; selected group; Escape; focus return |
| settings | SettingsHub | Dock Settings | Modal surface | open/close; Escape; backdrop close |
| update-center | SettingsHub | Settings → Update Center | Nested view within Settings | empty/current release; deferred/downloading/staged/error; download and activation actions |
| scanner-settings | ScannerSettingsPanel | Settings → Scanner Settings | Modal surface | device preference controls; owned by scanner feature |
| home-barcode-scanner | BarcodeScanner | Dock quick lookup → scan | Full-screen camera dialog | permission, startup, scanning, error/retry, torch, close lifecycle |
| barcode-lookup | HomeScreen | Scan result or manual lookup | Modal result surface | query, loading, records, partial data, empty, error, close |

### 4.1 Overlay ownership rules

Existing canonical source: `UI_OVERLAY_ARCHITECTURE.md`.

- Home owns Home overlay state and its page scroll lock.
- Settings and Scanner Settings own their content and close behavior.
- Stocktake and Stocktake Import own their own feature overlays and local work state.
- The shared body-scroll-lock service coordinates nested locks; do not add local body overflow snapshot/restore logic.
- Notification popover is intentionally non-modal and does not lock the page.
- Focus trapping/stack management is not fully implemented; do not claim complete modal accessibility until separately implemented and tested.

### 4.2 Update Center states

The Update Center is not a generic notification. It is governed by the PWA release contract.

Current visible release states:
- no release stored in Update Center
- deferred
- downloading with progress
- staged and waiting for explicit activation confirmation
- error / activation blocked

The design must preserve the separate user decisions for download consent and activation consent, persistent deferral, business-safe blockers, multi-window safety and rollback. See `PWA_RUNTIME_RELEASE.md`.

## 5. Stocktake workflow map

Owner: `src/features/stocktake/components/StocktakeModule.tsx`

Current screen enum:

| State | Purpose | Key interactions |
|---|---|---|
| home | Session and zone overview | Enter zone, open action history, open exported files, resume a zone |
| scan | Capture and manual entry | Open scanner, accept barcode, edit barcode/quantity, save entry, return to home/review |
| review | Inspect zone entries and output preview | Edit/delete entries, load more rows, confirm export, return to scan |
| history | Zone revisions and action log | Review revision history and load more log records |
| exports | Previously exported files | Download a previous export |

Important transitions:
- Entering a zone validates the zone code.
- A previously used zone requires explicit replacement confirmation and creates a new revision; old revisions remain in history.
- Resuming a draft opens scan; resuming an exported revision opens review.
- Scanner detection fills the barcode field and returns to the scan screen after scanner exit lifecycle completes.
- Manual entry and scanner entry use the same entry persistence path but retain source identity.
- Entry save validates barcode and quantity before IndexedDB writes.
- Review export requires at least one ARTICLE row and explicit operator confirmation.
- Exported revisions are locked; redo is performed through a new revision.
- History and review lists are rendered in batches of 100.
- Clear-all confirmation explicitly describes that only Stocktake local data is deleted.

Important states:
- initial local initialization/loading
- missing employee code / initialization error
- active session
- zone draft / exported / superseded
- pending zone replacement
- scanner open/closing
- manual entry / edit entry
- saving / deleting / exporting
- empty zone / empty history / empty exports
- destructive clear confirmation

Persistence and PWA update blockers are part of the workflow contract. Do not redesign the screen by removing the explicit-save or confirmation states.

## 6. Stocktake Import workflow map

Owner: `src/features/stocktake-import/components/StocktakeImportModule.tsx`

Current top-level view enum:

| View | Purpose | Key interactions |
|---|---|---|
| import | Import and process workbooks | Select one or more XLSX files, inspect summary, select zone, review/edit rows, preview TXT, copy/download, ZIP export |
| history | Browse saved local sessions | Restore session, re-export ZIP, clear local history |

Import workflow:
1. Select one or more local XLSX workbooks using a native file input.
2. Parse locally in the browser; do not upload workbook data to a server.
3. Detect duplicate files, same-name/different-content cases and zone conflicts.
4. If conflicts exist, hold incoming data in a pending review state. The active session remains unchanged until explicit confirmation.
5. Commit/merge or skip duplicate zones according to the selected action.
6. Persist session/history in the feature-owned IndexedDB store.
7. Select a zone and inspect rows.
8. Edit barcode/quantity in the same table; track dirty state.
9. Save or cancel edits. Dirty/invalid zones cannot be exported.
10. Preview the generated TXT, copy it, download one zone or export all zones as ZIP.
11. Restore saved history or re-export a historical ZIP.

Confirmed UI states:
- import idle / file picker
- parsing / busy action
- pending conflict review
- no active result
- result summary
- selected zone
- invalid rows / workbook blocking issues
- editing / dirty / saved
- TXT preview
- clipboard pending / success / manual-copy fallback
- TXT downloaded / ZIP exported
- history loading / empty / populated
- restore
- clear-history confirmation
- error and non-blocking notice

Key invariants:
- Source row order and duplicates are preserved by the parser contract.
- Workbook parsing and file processing are local.
- History persistence failure must not be shown as successful persistence.
- Product names are review metadata and do not alter the downstream TXT output contract.
- All-zone ZIP requires every zone to be valid and saved.
- The zone navigator and data workspace have separate viewport/scroll responsibilities.
- A file operation must not be reported successful before it completes.

Canonical domain contracts: `STOCKTAKE_FILE_IMPORT.md` and `modules/EXPORT_FILE.md`. This screen map does not replace them.

## 7. Cross-cutting interaction/state model

Every future screen and component must model relevant state dimensions separately:

| Dimension | Examples |
|---|---|
| uiStatus | implemented, integrating, unavailable |
| dataStatus | loading, loaded, stale, missing, error |
| permissionStatus | unknown, prompt, allowed, denied, unsupported |
| connectivityStatus | online, offline, unknown |
| operationStatus | idle, loading, success, error |
| persistenceStatus | not-applicable, unsaved, saving, saved, failed |
| validationStatus | valid, warning, invalid, blocked |
| updateSafetyStatus | safe, blocked with reason, waiting for confirmation |

Do not collapse these into a single `available` or `isReady` boolean.

### Interaction response contract

- A control acknowledges the input immediately with a visible state change.
- Expensive asynchronous work begins only after the pending state is visible where a paint boundary is required.
- The user must not need a second “wake-up” tap to reveal a hidden control.
- Disabled controls explain the relevant reason when the reason is not self-evident.
- Empty, stale, missing, error and permission-denied states are distinct.
- Success feedback is emitted only after the underlying operation completes.
- Escape/backdrop dismissal is permitted only where the owning workflow allows cancellation.
- Focus returns to the initiating control when appropriate.
- Touch targets, safe areas and keyboard avoidance are part of the component contract.

Existing source: `UI_INTERACTION_RESPONSIVENESS_AUDIT.md`, `UI_OVERLAY_ARCHITECTURE.md`, `ACCEPTANCE_CHECKLIST.md`.

## 8. Target information architecture (TO-BE proposal)

The future UI must move from “one long Home page plus overlays” to a consistent application shell and explicit workspaces.

```text
RetailOS App
├─ Authentication
│  ├─ Login
│  ├─ Identity recognition
│  └─ Session recovery/error
│
└─ Authenticated App Shell
   ├─ Global Header
   │  ├─ Context / employee / department
   │  ├─ Global search
   │  ├─ Notifications
   │  └─ Profile / settings
   │
   ├─ Primary Navigation
   │  ├─ Home
   │  ├─ Module Library
   │  ├─ Activity
   │  └─ Settings
   │
   └─ Workspace Outlet
      ├─ Home Overview
      ├─ Module Library
      ├─ Inventory Workspace (when implemented)
      ├─ Price Workspace (when implemented)
      ├─ Product Workspace (when implemented)
      ├─ Orders Workspace (when implemented)
      ├─ Delivery Workspace (when implemented)
      ├─ Sales Workspace (when implemented)
      ├─ Product Dates Workspace (when implemented)
      ├─ Stocktake Workspace
      └─ Stocktake Import Workspace
```

This is a target navigation model, not an accepted route implementation. The route strategy must be decided in the architecture phase. A small typed History API adapter is the default candidate; add a router dependency only if nested routes, deep links, loaders, route-level error boundaries or route data ownership justify it.

### Workspace layout contract

Each workspace must declare:
- Screen identity and title.
- Parent navigation and breadcrumb/context.
- Primary task and primary action.
- Secondary actions and overflow policy.
- Data source and freshness semantics.
- State model and persistence ownership.
- Empty/loading/stale/error/permission states.
- Responsive layout mode.
- Motion entry/exit behavior.
- Back/close behavior and unsaved-work guard.
- Accessibility/focus contract.
- Feature-specific performance constraints.

### Responsive intent

| Form factor | Target layout behavior |
|---|---|
| Desktop office | Persistent navigation where useful; wide multi-column workspace; use extra width for work surfaces, not enlarged mobile cards |
| Tablet | Adaptive navigation and compact multi-column workspace; preserve touch reachability |
| Mobile | Single-column task flow, bottom navigation where useful, full-screen workflow surfaces when they improve focus |
| Short landscape / keyboard open | Viewport-bounded surfaces, internal scroll regions, no hidden primary actions |

Breakpoints must be chosen from content fit and interaction ergonomics, not from device names alone. Component behavior should use Container Queries where the component's available width matters.

## 9. Proposed screen inventory for future specification

The following screens must receive a dedicated screen specification before implementation.

| Screen ID | Target screen | Priority | Current status |
|---|---|---:|---|
| AUTH-LOGIN | Login | P0 | Exists; redesign presentation |
| AUTH-IDENTITY | Identity transition | P1 | Exists; simplify only after motion spec |
| APP-SHELL | Global shell/header/navigation | P0 | Partial/current Home chrome |
| HOME-OVERVIEW | Operational Home | P0 | Exists as long-scroll page; restructure |
| MODULE-LIBRARY | Module discovery and search | P0 | Exists; redesign as workspace |
| GLOBAL-SEARCH | Cross-module/product search | P1 | Only Home local product lookup exists |
| ACTIVITY | Activity history | P2 | Empty placeholder |
| NOTIFICATIONS | Snapshot notices and push setup | P1 | Partial; source notices exist |
| UPDATE-CENTER | PWA update control | P0 platform-critical | Exists; preserve release contract |
| SETTINGS | Preferences and system settings | P1 | Partial; Update Center and Scanner Settings entry points |
| SCANNER-LOOKUP | Home barcode lookup | P0 operational | Exists; presentation-only redesign |
| STOCKTAKE | Stocktake workflow | P0 operational | Exists; redesign without data behavior changes |
| STOCKTAKE-IMPORT | Workbook import/export | P0 operational | Exists; redesign without parser/output/history changes |
| INVENTORY | Inventory workflow | Later | Registry only / integrating |
| PRICE | Price and cost workflow | Later | Registry only / integrating |
| PRODUCTS | Product catalog workflow | Later | Registry only / integrating |
| ORDERS | Order workflow | Later | Registry only / integrating |
| DELIVERY | Transfer/delivery workflow | Later | Registry only / integrating |
| SALES | Sales workflow | Later | Registry only / integrating |
| PRODUCT-DATES | Product date workflow | Later | Registry only / integrating |

## 10. Traceability and source map

| Concern | Primary source |
|---|---|
| Root auth/session/identity | `src/App.tsx` |
| Login states | `src/features/auth/screens/LoginExperience.tsx`, LoginForm, LoginHero |
| Home layout/navigation/overlays | `src/features/home/HomeScreen.tsx` |
| Home UI persistence | `src/features/home/homeStateStore.ts` |
| Module IDs/groups/readiness | `src/features/home/moduleRegistry.ts` |
| Library search | `src/features/home/components/HomeModuleLibrarySection.tsx` |
| Dock behavior | `src/shared/navigation/LiquidDock.tsx` |
| Settings and Update Center | `src/features/home/components/SettingsHub.tsx` |
| Home scanner | `src/features/scanner/components/BarcodeScanner.tsx` |
| Stocktake screens | `src/features/stocktake/components/StocktakeModule.tsx` |
| Stocktake persistence | `src/features/stocktake/services/stocktakeLocalStore.ts` |
| Stocktake Import screens | `src/features/stocktake-import/components/StocktakeImportModule.tsx` |
| Import parser/history | `src/features/stocktake-import/services/` |
| Overlay lifecycle | `UI_OVERLAY_ARCHITECTURE.md` |
| Input response | `UI_INTERACTION_RESPONSIVENESS_AUDIT.md` |
| PWA release lifecycle | `PWA_RUNTIME_RELEASE.md` |
| Scanner contracts | `SCANNER_ENGINE.md` |
| Import business contract | `STOCKTAKE_FILE_IMPORT.md` |

## 11. Exit criteria — Batch 00C

- [x] Root auth/session journey traced.
- [x] Home navigation and section behavior traced.
- [x] Module registry IDs, groups and availability mapped.
- [x] Home overlays and their ownership mapped.
- [x] Scanner lookup handoff mapped.
- [x] Stocktake screens and major transitions mapped.
- [x] Stocktake Import views, conflict review, edit/save/preview/export/history mapped.
- [x] Existing placeholders and incomplete modules explicitly identified.
- [x] TO-BE workspace architecture and screen inventory proposed.
- [ ] Physical-device interaction validation: not performed in this documentation audit.
- [ ] Detailed wireframes and per-screen acceptance specs: next design phase, not part of 00C.
