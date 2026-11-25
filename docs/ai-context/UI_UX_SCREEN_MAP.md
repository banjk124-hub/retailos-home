> **Documentation authority notice (2026-11-25):** This file is retained as historical source evidence, design exploration or implementation record. It is not an independent governing standard or current status source. For all current and future RetailOS work, follow [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md), then consult this file only when its specific evidence is relevant. If this file conflicts with the Product Skill, current source or an explicitly accepted owner decision, do not follow the stale instruction; reconcile the evidence into the governing standard first.

---

# UI/UX Screen and Interaction Map — Batch 00C

**Status:** Source-traced AS-IS map and TO-BE information-architecture proposal; 00E completed, 00F component ownership audit documented separately.
**Original audit baseline:** `main` at `2003ea24966755d0ad4e0298b34422b053267e77`
**Current source revalidation:** selected App/Auth/Home and feature-ownership facts were rechecked at `588d8f937525acb29ebb7b0de97a9b1dcf61c0c7`; see [UI_UX_PHASE_00_AUDIT.md](./UI_UX_PHASE_00_AUDIT.md). This does not replace a complete callsite/runtime graph.
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

## 1.1 Redesign scope

The AS-IS map records existing behavior; it does not constrain the TO-BE visual result. During redesign, every visible and interactive layer may be reconsidered or replaced, including copy, status wording and presentation, content order, layout, navigation, components, logo/wordmark, icons, buttons, controls, typography, imagery, materials and motion.

Use the screen map to recover behavior and contracts—not to reproduce current appearance. For every TO-BE screen, start with the desired user outcome and information hierarchy, then decide which existing behaviors/components should be retained, migrated, replaced or removed.

Any visual replacement must preserve the truth of the underlying state and action. A redesigned status label must still map to the same business state; a redesigned control must preserve its action/permission semantics; a replaced component must not silently drop persistence, keyboard, focus, offline or lifecycle behavior.

No current component, logo, icon, button, wording or layout is visually protected. Domain/data contracts and the explicitly protected platform boundaries remain protected unless a separate migration plan is approved.

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


## 9. Batch 00E — Information Architecture and Navigation decision

**Status:** Source-grounded architecture decision; implementation proposal, not yet implemented.
**Original decision baseline:** `main` at `2003ea24966755d0ad4e0298b34422b053267e77`. Selected Home navigation and module-registry facts were rechecked at `588d8f937525acb29ebb7b0de97a9b1dcf61c0c7` on 2026-11-25; see `UI_UX_PHASE_00_AUDIT.md`.
**Purpose:** Define how RetailOS is organized as an operational workspace, how users move between work, and which navigation state belongs in the URL, browser history, feature state or transient overlay.

### 9.1 Source facts that constrain the decision

The current implementation is not a route-based application:
- `App.tsx` owns login, identity recognition, authenticated Home mount, logout and PWA transition safety.
- `HomeScreen.tsx` owns a single long-scroll page, section-derived active navigation, the module library, quick lookup and multiple overlays.
- Current navigation IDs are `home`, `modules`, `activity`, `settings`. Home/Modules/Activity scroll to sections; Settings opens an overlay.
- `homeStateStore.ts` persists `activeNav`, search and `scrollY` under `retailos.homeUi.v1`.
- `moduleRegistry.ts` owns 5 library IDs and 9 workflow IDs. Workflow IDs and library IDs are separate identities. Seven workflows are marked `integrating`; Stocktake and Stocktake Import have dedicated feature workflows.
- Module Library search filters registry metadata; selecting a library group opens a sheet. It does not currently route to a separate module workspace.
- Stocktake and Stocktake Import already own multi-state workflows and persistence. Their internal state must remain feature-owned.
- Scanner and manual barcode lookup are contextual quick actions, not module-library destinations.

These are implementation facts, not the target structure. In particular, the current scroll position and overlay state must not become the long-term application navigation model.

### 9.2 Product information hierarchy — accepted 00E target

RetailOS is organized around **workspaces and tasks**, not around a dashboard containing every feature.

1. **Application level:** authenticated identity, global navigation, global search/quick lookup, notifications, connectivity and release/update context.
2. **Primary workspace level:** Home Overview, Module Library, Activity (only when backed by real activity data), Settings.
3. **Operational workspace level:** a real module workflow such as Stocktake or Stocktake Import.
4. **Feature-local level:** the workflow's own steps, tabs, filters, review state, history and dialogs.
5. **Transient action level:** scanner, barcode result, confirmation, notice detail and contextual popovers.

A workspace must have one clear purpose, one primary action and a visible current context. Do not put every module's controls on Home or make every small interaction a new route.

### 9.3 Target shell composition

**Desktop / office**
- Persistent application frame with a compact, collapsible primary navigation rail/sidebar.
- Global header owns current workspace context, employee/department identity, global search/quick lookup entry, notifications and profile/settings entry.
- Main workspace uses the available width; data-heavy workflows may use a two-column or master/detail composition where it improves throughput.
- Breadcrumbs or a clear workspace title identify the current location and parent. Do not use breadcrumbs as a substitute for primary navigation.
- Sidebar remains available without overlaying the work area. At narrow desktop widths it may collapse to icon rail with accessible labels/tooltips.

**Tablet**
- Navigation may use a compact rail or drawer according to available width and input mode.
- Preserve workspace context and keep the primary action visible.
- Do not simply scale the desktop sidebar and dense desktop columns down.

**Mobile**
- One primary task/workspace occupies the screen.
- Use a compact bottom navigation for top-level destinations, with safe-area padding; the global quick lookup/scanner action remains directly reachable but must not obscure navigation or the active task.
- Use a contextual top bar for back, title and essential actions.
- Secondary navigation belongs in a sheet/drawer or within the workspace, not a miniature desktop sidebar.
- Avoid floating controls over editable tables, bottom actions, keyboard or system gesture areas.

**Responsive behavior is based on available space and interaction constraints, not device labels alone.** The final breakpoints and exact visual treatment remain a 00G/00H validation task.

### 9.4 Primary destinations and route identity

Use these stable, human-readable destination identities as the target route contract. They are URL identities, not new business IDs.

| Destination | Target path | Owner | Navigation behavior |
|---|---|---|---|
| Home Overview | `/home` | Home feature | Primary destination |
| Module Library | `/modules` | Home/Module Library | Search, category discovery and readiness |
| Library group | `/modules/:libraryId` | Module Library | Optional deep link to a selected group; ID must be validated against registry |
| Operational workflow | `/workspaces/:moduleId` | Feature router/registry adapter | Only open a workflow that actually exists and is ready |
| Activity | `/activity` | Activity feature | Keep unavailable/empty truth explicit; do not fabricate records |
| Settings | `/settings` | Settings feature | Addressable workspace; may retain a dialog presentation only when entry context and history semantics are correct |

**Route identity rules**
- Existing `ModuleLibraryId` and `RetailModuleId` values remain unchanged. Route parameters must validate against these registries; do not create a second module registry.
- Snapshot/cache IDs are not route IDs and must not be inferred from workflow IDs.
- Unknown paths resolve to a deliberate not-found/unsupported state with a safe route back to Home; never silently open a different module.
- A registry item marked `integrating` must not navigate to a fake workspace. Show a truthful status/detail view and a clear return path.
- Only `stocktake` and `stocktake-import` are confirmed dedicated operational workflows in this audit baseline. Other module paths remain unavailable until their feature screens and contracts exist.
- Preserve the product name and employee/session identity; presentation labels can change independently from stable IDs.

### 9.5 Navigation history and back behavior

Adopt browser-native History API behind one typed navigation adapter as the initial implementation candidate. Do not add a routing dependency unless the later route/error/loading requirements demonstrate a concrete gap.

History semantics:


**History-state implementation note (proposal; owner acceptance still required):** the adapter should distinguish workspace route entries from same-URL transient entries. Store only a small typed marker (for example, entry kind, overlay owner/id and restoration policy) in `history.state`; never serialize employee data, barcode results, workbook contents, dirty form payloads or camera/session handles. Route parsing remains the authority for workspace identity. The adapter should expose one topmost-back dispatch contract to feature owners rather than importing feature internals into the shell.
- Primary destination changes and opening a full operational workspace create navigable history entries.
- Selecting a library group may create a history entry when it is a shareable/discoverable destination; closing/back returns to the library and restores search/category context.
- Internal feature steps (e.g. Stocktake home → scan → review; Import import → history) remain owned by the feature state machine. They may intercept Back only when the feature explicitly defines a safe transition.
- Transient overlays do not become route destinations. A popover, toast or inline disclosure stays local and does not create a history entry.
- A blocking, dismissible surface that must close on browser Back may add a **same-URL transient history entry** containing only a non-sensitive overlay token/owner marker. The URL path remains the current workspace; this is history state, not a route.
- Back consumes only the topmost registered dismissible transient entry. The owning feature performs its normal close/cleanup path; the shell must not directly mutate feature state or bypass dirty-work guards.
- Forward restoration is opt-in per overlay type. Scanner/camera surfaces, permission prompts, destructive confirmations and unsaved operational drafts are never automatically reopened. If Forward reaches a non-restorable transient marker, normalize that entry to the current workspace state without reacquiring resources.
- A surface that cannot safely participate in this contract remains outside browser history; its explicit close/Escape behavior stays feature-owned. Do not make every popover a history entry.
- Back priority: close the topmost dismissible transient surface; otherwise leave the current feature-local step if that feature supports safe back; otherwise navigate to the previous workspace/history entry; if no safe previous entry exists, go to `/home`.
- Escape and browser Back are not interchangeable when the feature has unsaved work or a destructive/irreversible operation. Confirm or block navigation using the owning feature's existing rules.
- Forward navigation restores the previous workspace where safe. Do not resurrect a stale camera session or reopen a permission prompt automatically.
- Reload/direct URL must restore the destination and its non-sensitive view context. It must not claim that an unsaved draft was persisted.
- Never place employee secrets, raw workbook data, barcode result payloads or unsaved operational data in the URL.

### 9.6 State ownership and persistence

| State | Owner | Persistence / URL rule |
|---|---|---|
| Authenticated employee/session | Auth services | Existing session store only; not route state |
| Current top-level destination | App navigation adapter | URL + browser history |
| Selected library group | Module Library | URL when shareable; validate ID |
| Library search/filter | Module Library | Local view state; optional query params only after explicit UX decision |
| Current workflow identity | Feature router/registry adapter | URL path uses stable workflow ID |
| Workflow step, dirty edits, selection | Feature module | Feature-owned state/persistence; never duplicate in shell |
| Scanner camera/session lifecycle | Scanner platform/feature | Transient, never restored by URL/history |
| Barcode lookup result | Lookup feature | Transient/local state; never serialize result payload to URL |
| Global notices/update state | Existing notification/PWA owners | Existing stores/events remain authoritative |
| Scroll position | Workspace/feature | Restore opportunistically per workspace; do not use global scrollY as route identity |

The existing `retailos.homeUi.v1` storage may be migrated only for useful Home search/scroll preferences. The `activeNav` field is legacy section-navigation state and must not override a valid URL on startup. Any storage migration must be versioned and preserve safe fallback behavior.

### 9.7 Entry, exit and unsaved-work policy

- A full workspace has a stable title, parent destination and explicit Back/Home path.
- The shell must not unmount a feature merely because a global overlay or unrelated Home state changed.
- Before leaving a feature with dirty/unsaved work, ask the feature owner for a navigation guard decision. The shell does not inspect feature internals or guess.
- A successful save/export is confirmed only by the feature's actual completion result.
- Cancel/close behavior remains feature-owned for Stocktake, Import, Scanner and destructive dialogs.
- Opening Scanner from quick lookup is an action transition, not a route to a second scanner implementation. Preserve the existing camera lease and engine integration.
- Logout retains the existing release-camera, session-clear and cache-clear sequence.

### 9.8 Destination inventory and readiness

| Destination / surface | 00E disposition | Reason |
|---|---|---|
| Home Overview | P0 workspace | Operational starting point; content hierarchy redesigned in 00G |
| Module Library | P0 workspace | Canonical discovery surface for current and future modules |
| Stocktake | P0 operational workspace | Existing dedicated workflow and persistence |
| Stocktake Import | P0 operational workspace | Existing dedicated workflow and persistence |
| Settings | P0 workspace/surface | Existing settings and Update Center contracts |
| Scanner / Barcode Lookup | P0 transient action | Preserve scanner lifecycle; not a duplicate module route |
| Notifications | P1 global surface | Existing snapshot notices and push setup; keep source truth |
| Activity | P2 / gated | Current UI is empty placeholder; promote only when a real activity source exists |
| Inventory, Price, Products, Orders, Delivery, Sales, Product Dates | Future / gated | Registry entries are not proof of complete workflows |

### 9.9 Migration sequence

1. Implement a typed route/destination contract and route parser without changing feature UI.
2. Add the App Shell frame and workspace outlet; keep current Home and features mounted through an adapter.
3. Map Home and Module Library to their destinations; migrate Home section state without allowing legacy `activeNav` to override URL.
4. Mount Stocktake and Stocktake Import as full workspaces through existing feature entry components; retain their internal state machines and persistence.
5. Move Settings into its destination while preserving Update Center and scanner settings behavior.
6. Add navigation guards and topmost-overlay Back behavior using existing overlay ownership; do not create a second scroll-lock manager.
7. Retire old section-scroll navigation and LiquidDock only after all consumers, keyboard behavior and responsive navigation are migrated and regression-tested.

Do not implement this migration during 00E. It is a Phase 02 implementation task after 00F–00H and explicit acceptance.

### 9.10 00E exit criteria

- [x] Current navigation, registry identities and feature boundaries traced to source.
- [x] Product hierarchy and destination classes defined.
- [x] Desktop/tablet/mobile shell responsibilities specified.
- [x] Route identity and module readiness rules defined.
- [x] Browser Back/Forward, reload, deep-link and unknown-route behavior specified.
- [x] State ownership and URL serialization boundaries defined.
- [x] Dirty-work and transient overlay policy defined.
- [x] Migration sequence and protected boundaries documented.
- [ ] 00F component ownership inventory completed.
- [ ] 00G screen blueprints completed.
- [ ] 00H acceptance/migration plan approved.
- [ ] User acceptance of this proposed IA before implementation.

**00E completion means the architecture decision is documented. It does not mean routing, App Shell or navigation has been implemented or tested.**
