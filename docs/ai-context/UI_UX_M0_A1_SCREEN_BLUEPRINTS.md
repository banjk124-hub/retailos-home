# M0-A1 — Screen Blueprint Pack (Batch A1.1)

**Baseline:** `main` at `c46cfcc788e923d0f4c787ec8e15f2783a8e74af`  
**Working branch:** `feat/m0-a-operational-screen-blueprints`  
**Status:** Source-grounded structural and operational blueprint; not an owner-approved visual design or production implementation.

## 0. Design intent

RetailOS must read as a premium retail operations workspace: burgundy/dark-red identity, Vietnamese-first typography, authentic retail imagery and distinct compositions per workflow. The reference image informs art direction and composition; the video informs motion and interaction. Neither is copied literally.

This pack defines what each screen must communicate and how it should recompose at desktop, tablet and mobile. Exact HEX palette, typeface, licensed image selection, detailed component styling and motion timings remain open pending visual exploration and owner acceptance.

## 1. Shared composition rules

### 1.1 Brand and visual hierarchy
- Use a restrained burgundy brand anchor for identity, primary actions and selected navigation—not as a full-bleed color on every panel.
- Build depth from neutral surfaces, layered elevation, deliberate light/dark zones and selective glass treatment.
- Use authentic retail photography as an editorial anchor: supermarket aisle, shelf, warehouse/logistics or real retail operations. Photography must never reduce legibility of dense controls or become a remote dependency for core work.
- Vietnamese is the interface language. Validate diacritics at compact sizes, long department/module labels, currency/date formatting and tabular numerals.
- Do not use fake KPI numbers, fabricated activity, imaginary module readiness or generic filler copy.

### 1.2 Responsive composition
| Context | Composition rule |
|---|---|
| Desktop ≥1280 | Persistent compact navigation; broad work area; multiple information regions where useful; dense operational data remains readable; keyboard-first affordances. |
| Laptop / compact desktop 1024–1279 | Preserve workspace hierarchy; reduce secondary rails before shrinking type; avoid horizontal overflow. |
| Tablet 768–1023 | Recompose into a single primary column or two deliberate regions; move secondary navigation/actions into compact rails or sheets; do not compress desktop split layouts blindly. |
| Mobile 360–430 | Task-first single column; contextual top bar and bottom action/navigation; touch-safe spacing; safe-area and keyboard-aware; no decorative content ahead of the current task. |
| Short landscape | Prioritize task controls and scrollable content; prevent fixed docks/sheets from covering the primary action. |

Validation widths: 1440, 1280, 1024, 768, 390, 360 CSS px and 844×390 short landscape.

### 1.3 Reusable only when proven
Shared identity, semantic status, focus, button/input behavior, motion contracts and navigation affordances should be consistent. Feature compositions remain independently authored where their task and data density differ. Do not create a universal card or mega-shell that forces all modules into the same layout.

## 2. Screen 01 — Login / Employee Identity

**Source owners:** `LoginExperience.tsx`, `LoginHero.tsx`, `LoginForm.tsx`, `LoginDock.tsx`, local employee directory/auth services.

### User objective
Identify an employee using the existing local employee-code authentication flow and establish the employee session before entering Home.

### Content hierarchy
1. RetailOS brand mark and concise welcome statement.
2. Editorial retail image/visual anchor that establishes the retail environment without competing with the form.
3. Employee code field with live employee/department match preview when available.
4. Primary action “Đăng nhập”; truthful submitting, invalid-code and success states.
5. Compact utility dock for the actions that already exist in LoginDock.

### Desktop
- Use an editorial split composition: image/brand narrative occupies a controlled region; authentication panel is the clear focal surface.
- Keep the employee field and primary action visible without scrolling at standard desktop height.
- Avoid making the form look like a generic SaaS email/password card.

### Tablet
- Prefer a deliberate stacked composition over a narrow two-column squeeze.
- Keep image treatment shorter and less dominant; center the form with a readable maximum width.
- Utility dock must not collide with the form in short landscape.

### Mobile
- Keep the employee-code action above the fold where practical.
- Image is a cropped contextual header/side visual, not a full-screen wallpaper that pushes the form below the fold.
- Dock must respect safe areas and software keyboard behavior.

### Real states and prohibitions
- Existing states: idle, submitting, invalid/error, matched employee/department preview, success/authenticating.
- Authentication is local; do not add password, OTP, remember-login or remote account concepts unless product requirements and source contracts are explicitly changed.
- Success transition must not own or delay authentication/session state; respect reduced motion.

## 3. Screen 02 — App Shell / Operational Workspace Frame

**Current source status:** No separate route-based App Shell is implemented. Root journey is Login → Identity Recognition → lazy Home. Current Home navigation uses section scroll for Home/Module/Activity and opens Settings as an overlay.

### Purpose
Provide the stable spatial frame around operational workspaces, not a second dashboard and not a new business state owner.

### Proposed information architecture (design proposal only)
- **Global identity:** RetailOS mark, current workspace title, employee identity/department and connection/update status where truthful.
- **Primary navigation:** Home, Module Library, Activity (only when it has real content/ownership), Settings.
- **Workspace canvas:** active feature surface, preserving its own density and interaction model.
- **Context actions:** global search, barcode/manual lookup or notification entry only where existing source behavior supports them.
- **System feedback:** offline, pending update, permission and error notices remain non-blocking and use their existing source owners.

### Desktop
- Persistent compact navigation rail or top/side hybrid.
- Workspace header carries title, context and only the actions relevant to that workspace.
- Canvas uses available width for real operational information; no forced hero/KPI row on every page.

### Tablet
- Collapsible rail or compact navigation bar.
- Preserve current workspace identity while secondary controls move into an overflow/sheet.
- Workspace must remain visually distinct from modal overlays.

### Mobile
- Compact top bar plus task-oriented bottom navigation or dock.
- Navigation should not cover feature-owned primary actions; active task state remains visible.
- Full-screen operational modules can own their own navigation/back affordance.

### Protected boundaries
- Do not implement router migration or change navigation IDs in this design batch.
- Preserve auth/session identity, module registry IDs/readiness, overlay/body-scroll-lock/focus, PWA boot/update lifecycle and lazy-loading boundaries.
- Activity is currently a placeholder; do not imply an event feed exists.

## 4. Screen 03 — Home / Operational Overview

**Source owner:** `HomeScreen.tsx`; current state and behavior also involve `homeStateStore`, snapshot notice rules, cached module snapshots, notification/push setup, calendar and update center stores.

### User objective
Orient the employee, surface actionable system/data notices and provide a fast path into the relevant operational workflow.

### Content hierarchy
1. Workspace greeting and department identity; do not let a greeting dominate the workspace.
2. High-priority truthful notice(s) derived from snapshot notice rules and their actual status.
3. Quick operational entry points: Module Library, manual product lookup and scanner where supported.
4. Contextual daily/retail imagery or editorial visual anchor, with real operational purpose.
5. Calendar/agenda only as a truthful calendar surface; current agenda empty state remains “Chưa có lịch cho ngày này.”
6. Activity only as a truthful empty state until a real event source exists.
7. Compact system footer/status, not a second control center.

### Desktop
- Use an asymmetric editorial composition: one clear lead region for current operational context, supporting notice/agenda regions and a compact quick-action zone.
- Prioritize real alerts and workflow entry points over decorative metric tiles.
- Avoid placing all content into equal-width cards.

### Tablet
- Reflow lead region and supporting panels into two tiers.
- Secondary agenda/notice details may collapse, but critical status and quick entry remain visible.
- Do not shrink text or create narrow columns.

### Mobile
- Single-column priority order: urgent notice → primary task shortcuts → modules/agenda.
- Secondary notices can expand locally.
- Scanner/manual lookup remains a contextual action; scanner support is device-gated by existing capability logic.

### Data truth and state matrix
| UI element | Source of truth | Allowed states |
|---|---|---|
| Snapshot notices | `calculateSnapshotNotices`, cached module snapshots | loading, ready, empty, unavailable; individual notice details |
| Offline state | Root/App props and PWA/network source | online / offline |
| Update badge | `updateCenterStore` | pending actionable count; exact release status |
| Calendar agenda | Current calendar state | selected date/month; truthful empty state |
| Activity | No verified feed in current source | empty placeholder only |
| Scanner affordance | `isScannerSupportedDevice` and scanner capability | supported / unavailable; never imply engine ready before session flow |

### Risk
HomeScreen is structurally overloaded. This blueprint does not authorize extracting or rewriting its state. Any future component split must map each state producer, consumer, effect and cleanup first.

## 5. Screen 04 — Module Library

**Source owners:** `HomeModuleLibrarySection.tsx`, `ModuleLibraryEngine.tsx`, `moduleRegistry.ts`.

### User objective
Find the right operational workflow quickly, understand what is available and enter the selected workflow without misleading readiness claims.

### Source-backed groups
1. Kiểm soát hàng hóa — Tồn kho, Giá & vốn, Danh mục hàng hóa.
2. Xử lý hàng hóa — Nhập / xuất hàng, Điều chuyển hàng.
3. Doanh số — Doanh số.
4. Date sản phẩm — Date sản phẩm.
5. Kiểm kê — Kiểm kê, Xuất file (Stocktake Import).

### Composition
- Use a strong library title/search region and grouped editorial sections.
- Group hierarchy should be visible before individual module details.
- Use compact module rows/tiles with icon, Vietnamese title, concise description and truthful availability/work status.
- Search must remain the fastest path for a known module.
- Distinguish “snapshot data exists” from “complete operational workflow UI exists”; current registry explicitly models this distinction.
- Keep ready workflows visually discoverable without falsely presenting integrating modules as operational.

### Desktop
- Search and group index can occupy a compact side/top region; module content uses a responsive grid with varied card proportions only when hierarchy benefits.
- Do not display all modules as equal “ready” tiles.

### Tablet
- Grouped two-column layout where width allows; otherwise one column with persistent search.
- Keep descriptions readable and availability labels attached to the module they qualify.

### Mobile
- Search first; grouped vertical lists with clear section labels.
- Avoid nested horizontal carousels for core module discovery.
- Selected module entry remains a direct, clear action.

### Module truth table
| Module ID | Label | Current availability | Design treatment |
|---|---|---|---|
| inventory | Tồn kho | integrating | Clearly marked as integrating; do not present as complete workflow |
| price | Giá & vốn | integrating | Clearly marked as integrating |
| products | Danh mục hàng hóa | integrating | Clearly marked as integrating |
| orders | Nhập / xuất hàng | integrating | Clearly marked as integrating |
| delivery | Điều chuyển hàng | integrating | Clearly marked as integrating |
| sales | Doanh số | integrating | Clearly marked as integrating |
| product-dates | Date sản phẩm | integrating | Clearly marked as integrating |
| stocktake | Kiểm kê | ready | Operational entry |
| stocktake-import | Xuất file | ready; workStatus in-progress | Operational entry with truthful work-status distinction |

**Important:** preserve all stable IDs and current registry semantics. No redesign may infer “ready” solely from snapshot support.


## 6. Screen 05 — Stocktake / Kiểm kê

**Source owners:** `src/features/stocktake/components/StocktakeModule.tsx`, stocktake types, IndexedDB-backed `stocktakeLocalStore`, export service and the existing Scanner Engine integration.

### User objective
Record physical stock by zone, review the captured entries, preserve revisions and export a zone file without losing the audit trail.

### Workspace composition
- Treat Stocktake as a focused operational workspace, not a Home dashboard card.
- Keep employee/session identity and current zone/revision visible but subordinate to the capture task.
- The scan/capture surface owns the primary workspace while a zone is active; review, history and exported files are separate task states.
- Dense operational information uses aligned tabular/list rows, not decorative cards.

### Source-backed screen states
| State | Source behavior | Visual treatment |
|---|---|---|
| Home / session | Session, zones, exports and local employee identity; entry actions for history and exported files | Session overview with zone entry, recent zones and explicit local-storage context |
| Scan / capture | Active zone, revision, barcode/manual input, quantity, recent entries; scanner only on supported devices | Capture-first surface; barcode and quantity controls remain immediately reachable |
| Review | Current zone entries, sequence/source, validation and TXT preview | Clear review hierarchy with edit/delete and export actions attached to each entry |
| History | Zones/revisions and action log | Chronological audit list; distinguish active, exported and superseded revisions |
| Exports | Saved file metadata and export action | File-oriented list with zone, revision, timestamp and count |
| Busy / error / confirm | Loading state, error feedback, replace-zone confirmation, clear-data confirmation | Blocking only when required; destructive actions state their exact scope |

### Data and interaction invariants
- Zone status is `draft`, `exported` or `superseded`; exported revision is locked. Re-entering an exported zone may create a new revision, not mutate the exported revision.
- Entries retain barcode, quantity, sequence, timestamp and source (`scan` / `manual`); edits retain edit timestamp.
- Data and logs are local to the device. Do not imply cloud sync or shared live inventory.
- Camera permission, camera lease, scanner session and decoder remain owned by the existing Scanner Engine contract; presentation cannot control engine lifecycle.
- Preserve explicit save behavior, history, export formatting and destructive-confirmation semantics.

### Responsive composition
- Desktop: capture panel and recent entries can share a deliberate two-region workspace; review/history use a readable full-width list with bounded content width.
- Tablet: prioritize the capture panel and collapse secondary history/context into a sheet or secondary view.
- Mobile: single-column capture, large touch-safe barcode/quantity controls, recent entries below the primary action; fixed controls must not cover keyboard or safe-area content.
- Do not add a persistent bottom dock if it competes with scanner controls or the software keyboard.

## 7. Screen 06 — Stocktake Import / Xuất file

**Source owners:** `StocktakeImportModule.tsx`, workbook parser, import session/conflict logic, IndexedDB-backed import history and output builder.

### User objective
Import one or more source workbooks, inspect parsed zones and rows, resolve conflicts, edit invalid or incorrect data, then copy/download per-zone TXT output or ZIP without silently losing unsaved changes.

### Workspace composition
- Import is a data-review and output workstation. Its primary visual hierarchy is source-file intake → parse summary → zone navigation → row validation/editing → output.
- Keep source identity and summary metrics visible: source files, zone count, total rows and unique product count.
- Zone navigation is persistent on wide screens and becomes a compact selector/list on narrow screens.
- The active zone owns its own row table, validation status and output actions; do not make the entire page a generic file-upload card.

### Source-backed screen states
| State | Source behavior | Visual treatment |
|---|---|---|
| Import / empty | Workbook selection; local on-device processing; offline-capable notice | Clear drop/select affordance and explain local processing without implying server upload |
| Parsing / busy | Import action and progress/busy feedback | Disable conflicting actions and expose a truthful live status |
| Pending supplementary import | Duplicate-file, same-name/different-content and zone-conflict review | Explicit conflict groups; user can cancel, skip duplicate zones or merge where supported |
| Parsed result | Source summary, zones, row counts, unique products, warnings/blocking issues | Summary plus zone workspace; distinguish warnings from blockers |
| Zone review | Select zone; inspect row-level values and issues | Dense editable table with row/issue context and zone-level summary |
| Edit | Begin/cancel edit; dirty-zone tracking; save only when changed | Persistent unsaved indicator; do not hide dirty state on navigation |
| TXT preview | Read-only output content | Dedicated preview state with back-to-table action and copy affordance |
| History | Persisted import sessions and source metadata | Chronological session list; restore a prior result without confusing it with the active session |
| New-session / clear confirm | Confirmation before replacing active work or clearing history | Explicit scope and consequences; never silently discard current session |

### Data and interaction invariants
- Parsing, workbook tolerance, numeric precision, source fingerprints and output formatting are business contracts; redesign only presentation.
- Duplicate source files are skipped; same-name/different-content and zone conflicts require explicit review.
- Dirty edits must be saved before export; export actions are disabled when output is invalid or a zone has unsaved changes.
- Preserve multi-file additive import, zone conflict handling, row-level issues and history persistence.
- TXT preview is read-only; copy/download/ZIP actions must report truthful completion states.
- Processing occurs locally in the browser; do not imply source workbook upload to a server.

### Responsive composition
- Desktop: three-part layout (source/session summary, zone navigation, active-zone table/output) when width permits; keep output actions aligned to the active zone.
- Tablet: summary above a compact zone selector and active table; avoid squeezing the full navigation rail beside a dense grid.
- Mobile: source and summary first, zone selector as a compact horizontal/list control, row review as readable stacked records or horizontally contained table; output actions remain reachable without covering content.
- Editing and dirty-state feedback must remain visible when the virtual keyboard is open.

## 8. Screen 07 — Settings / Update Center

**Source owners:** `SettingsHub.tsx`, `updateCenterStore.ts`, PWA update services and the shared update-blocker/activation lifecycle.

### User objective
Manage system preferences and understand the exact state of an available or deferred application update, while retaining control over download and activation.

### Settings composition
- Settings is currently a modal overlay, not a separate route.
- Present system settings as concise, grouped actions: Update Center and Scanner settings are current source-backed destinations.
- Keep the employee/workspace context and close/back affordance clear; preserve focus return and body-scroll lock.

### Update Center state model
| Status | Source truth | UI treatment |
|---|---|---|
| No entry | No update-center record | Honest empty state: no saved update |
| available | New build metadata is available | Explain version/release notes and offer explicit download action |
| deferred | Employee deferred the update | Show as pending in Update Center; do not force download |
| downloading | Download in progress | Progress, completed/total bytes and truthful failure handling |
| staged | Candidate is staged and awaits explicit activation confirmation | Distinguish downloaded from activated; show activation action only under safe handoff |
| error | Last operation failed | Explain error and provide supported retry/recovery path |
| activation blocked | Business blocker is active (camera lease, unsaved work, transitions, etc.) | Explain why activation is blocked; never imply the update is lost or safe to force |

### Data and interaction invariants
- Download consent and activation consent are separate. Staging never authorizes activation.
- Clearing blockers never auto-activates; activation requires explicit employee action and worker multi-window/safe-handoff guards.
- Deferral is persistent per build/device; Update Center badge reflects the stored `inCenter` state, not an invented notification count.
- Preserve BUILD_ID/manifest integrity, release cache isolation, boot health/rollback and all business data.
- Settings/Update Center presentation must not bypass camera leases, Stocktake/Import dirty state or app-level transitions.

### Responsive composition
- Desktop: settings as a compact preference surface; Update Center can use a structured release detail panel with progress and release notes.
- Tablet: retain a readable modal/sheet with a distinct nested Update Center view and clear back navigation.
- Mobile: full-height sheet/dialog with safe-area handling, scrollable release details and a persistent but non-obstructive primary action.
- During active business work, notices remain non-blocking; do not introduce forced full-screen takeover.

## 9. Screen-to-source ownership map

| Screen | Source truth | Presentation may change | Must not change in A1 |
|---|---|---|---|
| Login | local auth, employee directory, session | hierarchy, imagery, typography, layout, feedback | auth rules, session payload, employee identity |
| App Shell | root auth journey, Home nav IDs, feature open/close callbacks | spatial frame, responsive nav composition, visual hierarchy | route migration, IDs, lifecycle contracts |
| Home | snapshot notices, cache, calendar, update center, scanner capability | section composition, imagery, responsive layout | notice rules, data ownership, camera lease, update semantics |
| Module Library | registry, groups, availability, search | grouping presentation, card/list composition, responsive layout | IDs, metadata truth, readiness semantics |
| Stocktake | local session/zones/entries/logs/exports, Scanner Engine | composition, data hierarchy, responsive capture/review | revisions, explicit save, export lock, camera/session lifecycle |
| Stocktake Import | parser/session/conflict/history/output | file intake, zone navigation, review/edit/output composition | parser precision, conflicts, dirty state, persistence, TXT/ZIP output |
| Settings / Update Center | settings overlay, updateCenterStore, PWA update service | grouping, release detail, progress and responsive surface | consent, staging, activation, blockers, integrity, rollback |

## 10. Owner decisions still required

1. Exact burgundy family and semantic palette: propose alternatives on real surfaces; no final HEX selected.
2. Vietnamese typeface: compare at small UI sizes and dense data; no font selected.
3. Retail imagery direction: confirm image subject/crop and licensing source before packaging assets.
4. Shell navigation concept: approve persistent rail/top hybrid vs compact bottom/dock behavior per viewport.
5. Home composition: approve the balance between editorial retail image, operational notices and module entry points.

## 11. Visual review gates

A1.1/A1.2 blueprint work is complete when:
- All seven representative surfaces have individual, source-grounded composition and responsive rules.
- Every displayed control, status and metric maps to source truth or is explicitly marked proposed.
- No invented workflow, event, KPI or authentication behavior is introduced.
- Visual direction is distinguishable from generic admin UI and preserves feature-specific composition.

A1.3 remains open:
- Build high-fidelity editable visual prototypes for the seven screens.
- Compare burgundy palette and Vietnamese font candidates on actual text density.
- Select licensed retail image assets and test responsive crop/performance/offline fallback.
- Obtain owner visual acceptance before production-facing UI changes.

## 12. Implementation boundary

This pack is a design blueprint only. It does not change application source, business logic, navigation, CSS tokens, dependencies, PWA lifecycle, persistence, Scanner Engine or deployment. It is not an M0 completion claim.
