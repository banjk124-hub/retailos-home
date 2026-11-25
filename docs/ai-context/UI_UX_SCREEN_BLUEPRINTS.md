# UI/UX Screen Blueprints — Batch 00G

**Status:** Screen-level implementation blueprints proposed; owner acceptance and 00H migration/acceptance gate remain open.
**Source baseline:** `main` at `2003ea24966755d0ad4e0298b34422b053267e77`
**Architecture baseline:** 00B–00F documentation on `docs/uiux-architecture-00b-00c`
**Purpose:** Convert the source-traced screen map and component ownership audit into implementable screen contracts. This document defines the target experience, not current implementation facts.

## 1. Design intent and operating constraints

RetailOS is an operational workspace for retail staff, not a marketing dashboard or a reskinned AppSheet. The target experience combines a composed desktop workspace, task-focused mobile screens and restrained spatial motion. It must remain legible, fast and predictable during repetitive store operations.

### 1.1 Visual and interaction direction

- Strong information hierarchy: operational context first, primary task second, supporting detail third.
- Desktop may use asymmetric composition, persistent navigation, dense work areas and contextual side panels where they improve task throughput.
- Mobile reorganizes content into a focused vertical flow; it is not a scaled desktop layout.
- Use real photography as a deliberate brand/atmosphere accent, not as a background behind dense operational data or essential controls.
- Use glass/translucency selectively for navigation, floating controls and transient overlays. Data tables and long-form work surfaces should prioritize contrast and clarity over blur.
- Motion communicates hierarchy, continuity and state. It must not delay input acknowledgement, data entry or navigation.
- RetailOS red remains a brand/action accent. Status colors retain semantic meaning and are not decorative.
- The current logo, wordmark, copy, icon mapping, component implementations and styles are not visually protected; redesign them if the approved experience benefits. Product identity and operational meaning must remain recognizable.

### 1.2 Device and performance targets

| Context | Layout behavior | Performance requirement |
|---|---|---|
| Desktop office, wide | Persistent sidebar/rail, global header, workspace canvas; optional contextual inspector | Stable dense layout; keyboard-first interaction; no unnecessary full-screen transitions |
| Desktop narrow | Collapsible navigation; toolbar wraps or moves secondary actions into overflow | No horizontal page overflow; preserve primary actions |
| Tablet landscape | Compact rail or collapsible sidebar; workspace remains primary | Touch and keyboard both usable |
| Tablet portrait | Navigation collapses; content becomes single-column or master/detail with explicit selection | Avoid tiny controls and cramped multi-column forms |
| Mobile, portrait | Bottom navigation for top-level destinations; one primary task surface; sheets for secondary selection | First feedback immediate; safe-area and keyboard aware |
| Mobile, landscape | Task-focused layout; controls remain reachable above keyboard/browser chrome | No fixed-height assumptions |
| Low-end Android | Reduce blur, image decode and simultaneous motion; prefer CSS transforms/opacity | No large synchronous work on input path; lazy-load non-critical screens/assets |

Use responsive breakpoints as starting design thresholds, not device detection. Components must adapt to their available container width. Support browser zoom and text scaling.

### 1.3 Shared state and interaction contract

Do not compress independent state dimensions into one boolean. Screens should expose only the dimensions relevant to their task:

- UI readiness: ready / integrating / unavailable.
- Data: loading / loaded / stale / missing / error.
- Connectivity: online / offline / unknown.
- Permission: unknown / prompt / granted / denied / unsupported.
- Operation: idle / pending / success / error.
- Persistence: not applicable / unsaved / saving / saved / failed.
- Validation: valid / warning / invalid / blocked.
- Update safety: safe / blocked with reason / waiting for confirmation.

Every interactive control:
1. Responds to the initiating input immediately with a visible pressed, selected, pending or focused state.
2. Announces asynchronous work as pending before expensive work where a paint boundary is required.
3. Disables duplicate submission while an operation is genuinely in flight.
4. Reports success only after the underlying operation completes.
5. Explains non-obvious disabled states and preserves keyboard/touch parity.
6. Does not discard dirty work without an explicit feature-owned decision.

### 1.4 Global shell and surface contract

The shell owns authenticated context, primary navigation, workspace outlet and global transient surfaces. It does not own feature business state.

**Target composition**
- `AppShell`: authenticated frame and responsive layout.
- `PrimaryNavigation`: DesktopNavigation or MobileNavigation; one source of destination identity.
- `GlobalHeader`: employee/department context, global search entry, connectivity and global actions.
- `WorkspaceOutlet`: renders the selected destination without duplicating the module registry.
- `GlobalOverlayHost`: only for truly global overlays; feature workflows retain their own local overlay ownership.
- `ToastRegion`: global operation feedback with source/owner metadata.

**Navigation destinations:** Home, Module Library, Activity and Settings retain their current stable top-level identities. Activity remains an honest empty/unavailable workspace until a real activity source is defined. Do not synthesize activity records.

**Navigation contract:** URL/screen identity is authoritative for destination. Scroll position may be restored within a workspace but must not silently change the active route. Back closes the topmost dismissible transient surface first, then performs feature-approved local navigation, then workspace history, then Home. Never restore camera acquisition, permission prompts or sensitive operational payloads from a URL.

## 2. Blueprint template and implementation rules

Each blueprint defines:
- Purpose and primary user outcome.
- Information hierarchy and layout.
- Component composition and ownership.
- Interaction and state matrix.
- Responsive behavior.
- Accessibility and motion.
- Data/persistence boundaries.
- Acceptance tests and regression gates.

Shared components must be built only where the same semantic responsibility is genuinely reused. A visual resemblance alone does not justify a shared abstraction. Feature-owned state and persistence stay in the feature.

## 3. P0 — App Shell and navigation

### 3.1 Purpose

Provide a stable frame for authenticated work, clear destination orientation and consistent access to global actions without forcing every feature into the same page template.

### 3.2 Desktop blueprint

- Left: persistent navigation rail/sidebar with brand mark, destination labels, active state and a clear collapse control.
- Top: compact GlobalHeader with current employee/department context, search entry, connectivity/update indication and profile/settings access.
- Center: WorkspaceOutlet with a bounded readable content width for overview/settings and a fluid width for data-heavy workflows.
- Optional right contextual inspector only when the active workspace has a real secondary task; it must not be permanently reserved empty space.
- Navigation active state uses stable route identity, not scroll position.
- Sidebar collapse state is a presentation preference, not a second navigation model.

### 3.3 Mobile blueprint

- Top header shows current workspace title/context and only the highest-value global action(s).
- Bottom navigation exposes the approved top-level destinations; avoid duplicating every module as a bottom tab.
- Global search may open a dedicated search surface or full-screen sheet.
- Secondary navigation and filters use a sheet/drawer with clear close and selection behavior.
- Keep the main task above the bottom navigation and account for safe-area insets.
- Do not show a desktop sidebar hidden behind an invisible off-canvas state as the only navigation mechanism.

### 3.4 Component contract

| Component | Responsibility | API/behavior contract |
|---|---|---|
| AppShell | Authenticated frame | Receives session context and active destination; no domain data fetching |
| DesktopNavigation | Persistent desktop destinations | Items derive from canonical destination config; keyboard navigable; collapse state controlled |
| MobileNavigation | Touch-first top-level navigation | Same destination IDs as desktop; safe-area aware; current destination announced |
| GlobalHeader | Global context/actions | Receives employee/department, connectivity and update summary; does not own their persistence |
| WorkspaceHeader | Workspace title and local actions | Title, description, breadcrumbs, primary action and optional toolbar slot |
| WorkspaceOutlet | Destination composition | Lazy-loads feature/workspace entry; preserves existing chunk boundaries |
| ToastRegion | Operation feedback | Receives completed operation result; supports dismiss and screen-reader announcement |

Do not create a second module registry. Destination metadata must reference the existing stable IDs or an explicitly approved top-level destination map.

### 3.5 States and acceptance

- Auth boot/loading, unauthenticated, authenticated, logout transition and Home chunk loading remain distinct.
- Offline status is visible but does not block local workflows.
- Unknown/unavailable destinations show an honest unavailable state, not a fabricated screen.
- Keyboard: tab order follows visual hierarchy; active destination has `aria-current`; collapse control has accessible name and state.
- Back/forward, direct URL/reload, focus restoration and dirty-work guards are tested.
- Test at wide desktop, narrow desktop, tablet portrait/landscape, Android browser/PWA and iOS Safari/Home Screen PWA.
- Preserve auth/session, boot-health, logout camera release, PWA transition blockers and Vite Pages base path.

## 4. P0 — Login and identity handoff

### Purpose and hierarchy

A short, focused employee sign-in task. Identity confirmation is a distinct transition, not an extra dashboard screen.

### Desktop

- Use a balanced split composition: brand/photographic story panel and compact login panel.
- Keep the employee code input and submit action visually dominant.
- The decorative panel may collapse or simplify at narrow widths; it must never constrain the form.

### Mobile

- Prioritize the form, numeric keyboard and matched employee preview.
- Keep submit visible without requiring excessive scroll; adapt when the keyboard opens.
- Photography is optional and must not load before the critical form if it harms startup.

### Components and state

- LoginScreen owns composition.
- EmployeeCodeField owns input presentation only.
- EmployeeMatchPreview displays locally matched employee/department.
- LoginFeedback displays validation/authentication outcome.
- IdentityHandoff is a short, cancellable only by the existing root lifecycle transition; respect reduced motion.

| State | Required presentation | Rule |
|---|---|---|
| idle | Empty/entered employee code and optional match preview | Do not imply authentication before submit |
| submitting | Immediate pending feedback and protected submit | Prevent duplicate submit |
| error | Specific, non-sensitive error announcement | Preserve focus and allow correction |
| success | Confirm identity and transition | Only after local authentication succeeds |
| boot/chunk error | Recoverable app-level error | Keep AppErrorBoundary/root behavior |

Preserve local employee lookup, numeric input handling, session persistence, department mapping, boot-health signaling and logout semantics. Do not add password, remember-me, remote identity provider or account recovery without a separate product requirement.

### Acceptance

- Numeric keypad and IME behavior verified on iOS/Android.
- Error is announced; focus remains useful.
- Reduced motion removes nonessential delay.
- Session restore/logout and offline local-auth behavior unchanged.
- No image/font dependency blocks form interaction.

## 5. P0 — Home Overview

### Purpose

Answer three questions quickly: what is the current operational context, what needs attention, and what can the employee do next?

### Information hierarchy

1. Workspace greeting/context: employee, department and data freshness.
2. Priority notices backed by current snapshot notice rules.
3. High-frequency quick actions that lead to real workflows.
4. Module discovery entry and recently used destinations only if a trustworthy source exists.
5. Secondary operational context, not decorative KPI cards.

Do not show invented totals, activity, schedules or performance metrics. Calendar preview is not a live calendar integration and must not be presented as one.

### Desktop composition

- WorkspaceHeader with greeting/context and data freshness.
- Main column: priority notices and actionable work cards.
- Secondary column: quick actions and module shortcuts, sized to actual content.
- Optional photographic/brand accent is confined to a non-critical hero region; avoid large image backgrounds behind operational text.
- Empty space is intentional only when it improves scanning; do not fill it with fake metrics.

### Mobile composition

- Compact context header.
- Priority notices in a vertical stack with clear severity and action.
- Quick actions in a compact grid/list, reachable without a large hero.
- Module Library entry below the immediate tasks.
- No fixed multi-column layout; avoid nested horizontal carousels for essential actions.

### State matrix

| State | Presentation |
|---|---|
| snapshot loading | Skeleton shaped like the final notice content; no false zero values |
| fresh data | Show source-backed notices and last-updated context if available |
| stale data | Explicit stale label; retain usable cached information |
| missing source | Explain which content is unavailable; do not report no issues |
| read error | Error state distinct from empty |
| offline | Offline indicator plus cached/local action availability |
| no notices | Calm empty state only when all required sources were read successfully |
| no quick action | Omit rather than show dead action |

### Ownership and acceptance

- Home owns overview composition and view state.
- Snapshot service and notice rules remain data/domain owners.
- Module registry remains the only module source.
- Barcode lookup remains a separate task entry and preserves cached lookup semantics.
- Preserve Home cold/warm performance and cache batching tests.
- Validate that quick actions work with keyboard, touch and reduced motion.

## 6. P0 — Module Library

### Purpose

Discover real RetailOS workflows, understand their readiness and open a supported destination.

### Desktop

- WorkspaceHeader with title, concise description and search.
- Category navigation as a compact side list or horizontal category strip depending on available width.
- Main area uses a responsive card/list grid with consistent metadata hierarchy.
- Cards show module title, one-line purpose, readiness state and action.
- Ready workflows receive a clear primary action. Integrating/planned workflows explain availability without masquerading as executable.

### Mobile

- Search at top and category selection as horizontally scrollable chips only when the full selected state remains accessible; otherwise use a sheet.
- One-column cards with large touch target and explicit status.
- Avoid nested card buttons; one clear activation target per card.

### Component and data contract

- ModuleLibraryWorkspace consumes the canonical module registry.
- ModuleCategoryNavigation filters by existing library group IDs.
- ModuleCard displays registry-backed metadata and availability.
- ModuleAvailabilityBadge maps the canonical readiness state; do not infer readiness from data source presence.
- Search filters title/description/group; no duplicate registry or local hardcoded module list.

### Readiness truth

- Current registry has nine workflow IDs in five groups.
- Only Stocktake and Stocktake Import have dedicated feature workflows in the audited tree.
- Inventory, Price, Products, Orders, Delivery, Sales and Product Dates remain integrating/registry-only unless source is updated and re-audited.
- Stocktake Import currently has workStatus in-progress despite a ready availability field; expose the distinction without collapsing the two states.

### Acceptance

- Every item either opens a confirmed workflow or gives truthful integrating/unavailable information.
- Search empty state differs from no modules.
- Keyboard search, category selection, focus return and screen reader status are tested.
- Existing stable IDs and RetailModuleId/ModuleDataId distinction remain unchanged.

## 7. P0 — Stocktake workspace

### Purpose

Support the complete local stocktake lifecycle: choose session/zone, capture entries, review, export and inspect history.

### Desktop blueprint

- WorkspaceHeader: Stocktake title, current session/zone context and primary action.
- Main work area: responsive data table/list with barcode, item/quantity and row actions.
- Secondary context panel: zone/session summary, status and next action where useful.
- Capture controls are persistent and easy to reach; scanner is an explicit task mode, not a permanent camera background.
- Review/export mode emphasizes validation and output preview over capture controls.

### Mobile blueprint

- Single-column task flow with clear session/zone header.
- Scan/manual entry controls are thumb reachable.
- Rows become compact cards or horizontally scrollable data rows only when all key values remain discoverable.
- Editing opens a focused row editor/sheet; preserve unsaved edits on dismissal decisions.
- History/export are secondary screens, not compressed into the capture screen.

### Feature-owned views and components

| View | Composition | Primary action |
|---|---|---|
| Session/zone home | Session summary, zone list, history/export entry | Open or resume zone |
| Capture | Scanner/manual entry, current zone context, recent entries | Save entry |
| Review | Entry table/list, validation, output summary | Confirm export |
| History | Revisions and action history | Inspect revision |
| Exports | Previously exported files | Download export |

### State and behavior

Preserve all existing states: local initialization, employee/session error, active session, draft/exported/superseded zone, replacement confirmation, scanner open/closing, manual entry/edit, saving/deleting/exporting, empty history/exports and destructive clear confirmation.

- Explicit zone replacement creates a new revision; prior revisions remain in history.
- Scanner result returns only after the existing scanner close lifecycle completes.
- Manual and scanner input converge on the same persistence path while retaining source identity.
- Validate barcode and quantity before IndexedDB write.
- Export requires at least one ARTICLE row and explicit confirmation.
- Exported revision remains locked; redo uses a new revision.
- History/review pagination remains batched.
- Clear-all copy states the exact local scope being deleted.

### Acceptance and protected boundaries

Do not change IndexedDB schema, zone revision model, validation, entry persistence, export payload, camera lease, scanner engine or PWA update blocker. Keep scanner as a protected feature-owned task shell; do not merge Home Scanner and Stocktake Scanner into one universal workflow component.

Run `scripts/test-stocktake-import.mjs` only for import changes; Stocktake-specific test scripts must be selected from the actual changed boundary. Run scanner presentation/lifecycle regression only if scanner presentation changes. Verify offline, reload, history restore, explicit export and physical-device camera handoff.

## 8. P0 — Stocktake Import workspace

### Purpose

Import workbooks locally, resolve conflicts explicitly, review/edit rows and produce truthful TXT/ZIP output.

### Desktop blueprint

- WorkspaceHeader with import action and session state.
- Import summary/validation region above the data workspace.
- Zone navigator in a stable left column; data table in the main area.
- Preview/output region appears as a contextual panel or dialog, not as a permanently competing column.
- History is a distinct workspace view or tab within the feature, preserving clear return path.
- Multi-zone export status remains visible without obscuring the data editor.

### Mobile blueprint

- Import and history are distinct focused views.
- Zone selection opens a sheet/list; selected zone context remains visible in the editor.
- Table rows become stacked review cards or an explicitly scrollable table with clear column labels.
- Editing opens a focused editor; save/cancel and dirty state remain explicit.
- TXT preview uses a readable, selectable text surface; copy and download are separate actions.
- ZIP/export progress and per-zone result remain visible and non-blocking where safe.

### Component contract

- ImportWorkspace owns view composition.
- WorkbookPicker invokes the native file input; local parsing only.
- ImportSummary shows counts/issues from parser results.
- ConflictReview owns the pending incoming data decision surface; active session remains unchanged until confirmation.
- ZoneNavigator controls selected zone.
- ImportDataGrid owns row presentation; feature owns edit/validation state.
- TxtPreview presents exact generated payload read-only.
- ExportActions invoke copy/download/ZIP and show completion only after success.
- ImportHistory owns restore and historical export actions.

### State matrix

Idle/file picker; parsing; pending conflict; no active result; summary; selected zone; invalid rows/blocking issue; editing/dirty/saving/saved; TXT preview; clipboard pending/success/manual fallback; TXT downloaded; ZIP exporting/exported; history loading/empty/populated; restore; clear-history confirmation; error and non-blocking notice.

### Invariants

- Workbooks are parsed locally; do not upload source workbook data.
- Source row order and duplicates follow the parser contract.
- Same-name/different-content and zone conflicts remain explicit.
- Pending conflict data cannot mutate active session before confirmation.
- History persistence failure is never presented as success.
- Product name remains review metadata and does not alter TXT payload.
- Dirty/invalid zones cannot be exported.
- All-zone ZIP requires every zone valid and saved.
- Zone navigator and data workspace retain separate viewport/scroll responsibilities.
- Preserve decimal precision, duplicate behavior, IndexedDB history, TXT/ZIP payload and restore semantics.

### Acceptance

Run `scripts/test-stocktake-import.mjs`; add UI tests for conflict confirmation, dirty edit/cancel, invalid export block, clipboard fallback, ZIP completion, history restore and persistence failure. Verify desktop dense table and mobile editing on physical devices. Check large workbook parsing does not block input feedback or produce unbounded render work.

## 9. P0 — Scanner presentation entry points

Scanner is a protected operational capability. This blueprint changes only the visual shell and integration affordances.

### Home quick lookup

- Present manual search as a first-class path on desktop and unsupported-camera devices.
- On supported mobile, offer a clear choice between manual lookup and barcode scan.
- Keep the camera launch gesture direct and preserve existing permission/lease acquisition timing.
- Show camera state and close affordance without obscuring preview geometry.
- Result view clearly distinguishes loading, found, not found, incomplete source data and read error.

### Stocktake scanner

- Keep capture context (session/zone) visible where safe.
- Provide a clear close/cancel action and a return path to the originating task.
- Do not share the entire Home lookup shell if its workflow semantics differ.

### Strict non-goals

No change to `useScannerEngine`, camera lease, `getUserMedia`, `applyConstraints`, decoder, worker/runtime, lifecycle coordinator, preview geometry, validation or camera recovery policy. Do not reopen SC-01–SC-05. Any scanner visual change must run the directly relevant scanner UI/lifecycle regression suite and be tested on real supported devices.

## 10. P1 — Settings and Update Center

### Settings workspace

- Settings is a real workspace on desktop, not a modal that covers the entire app.
- Desktop: category navigation plus a focused settings content panel.
- Mobile: settings category list → focused detail screen with a clear back label.
- Scanner Settings remains owned by scanner feature and is presented through a deliberate route/surface, not copied into a second settings model.
- Appearance/performance options appear only when backed by persisted supported preferences.

### Update Center

- Present current build/release state, available update details, download action, progress, staged state and activation action.
- Download consent and activation consent remain separate decisions.
- Deferred state and blocker reason remain visible and truthful.
- Never imply an update is installed merely because it is downloaded/staged.
- Keep multi-window safety, business-safe blockers, Service Worker staging/activation and rollback under the PWA runtime.

### Acceptance

PWA tests are mandatory if shell/update presentation changes. Verify defer, download, stage, activate, blocker, multi-window and rollback behavior. No change to service-worker lifecycle or release contract within a presentation-only slice.

## 11. P1 — Global Search and Notifications

### Global Search

- Search is an entry point into supported products/modules, not a fabricated universal search across data that has no index.
- Search scope and result type are explicit.
- Preserve Home barcode lookup as a separate cached product lookup path unless a separately tested integration contract is approved.
- Empty, loading, no-match, partial-source and read-error states remain distinct.
- Keyboard shortcut is optional; if added, it must not conflict with browser or assistive-technology shortcuts.

### Notifications

- Notification Center shows only actual snapshot notices or real push/subscription state.
- Distinguish an operational notice from a push-permission prompt.
- Notice detail remains feature-owned and accessible.
- No fabricated activity feed, calendar entries or unread counts.
- Popover is non-modal; modal detail uses a separate dialog contract.

## 12. P2 — Activity and future workspace template

### Activity

Current source displays “Chưa có hoạt động”; no verified activity event source is established by this audit. Keep Activity gated. It may show a clearly labelled unavailable/empty explanation, but do not create sample events or infer actions from local UI state.

Before implementation, define:
- Event source and retention.
- Actor identity and permissions.
- Event schema and ordering.
- Offline/partial synchronization semantics.
- Privacy and operational audit requirements.

### Future module template

A future workflow may adopt WorkspaceHeader, PageToolbar, FilterBar, DataWorkspace, DetailPanel, Empty/Loading/Error surfaces and operation feedback only after its data contract, readiness and workflow states are defined. The template is a composition recipe, not a universal mega-component.

## 13. Shared component API and ownership contracts

These are behavioral contracts, not final TypeScript signatures. Exact props/types are to be confirmed during 00H and implementation design.

| Component | Required inputs | Required behavior | Owner |
|---|---|---|---|
| Button / IconButton | intent, size, disabled reason, loading, accessible label | Immediate feedback, keyboard/touch parity, no duplicate action | Design system |
| TextField / SearchField | value, label, description, error, input mode | Controlled value, visible focus/error, IME-safe | Design system; validation remains feature-owned |
| Badge / Status | semantic status, label | Consistent mapping; never color-only | Design system |
| Surface / Panel / Card | semantic role, density, interactive state | No implicit business behavior; material is role-based | Design system |
| Dialog / Sheet / Popover | owner, open state, dismissal policy, labelled title | Focus, Escape/backdrop rules, body lock coordination, safe area | Shared primitive + feature owner |
| Loading / Empty / Error / Offline | status, message, optional retry/action | Distinct truth; retry only when valid | Design system |
| WorkspaceHeader / Toolbar | context, primary action, secondary actions | Responsive action priority and overflow | Shared pattern |
| DataWorkspace | columns/rows/selection/editing contract | Responsive density, accessible headers, bounded rendering | Shared pattern; data state feature-owned |
| Toast / InlineFeedback | operation result, severity, persistence | Announce result only after completion | Shared pattern |

No generic component may own IndexedDB, module readiness, authentication, scanner lifecycle, update lifecycle or feature validation.

## 14. Accessibility, motion and visual performance

### Accessibility

- All controls have programmatic names; icon-only controls require an accessible label.
- Active navigation uses `aria-current`; status changes use appropriate live-region behavior without announcing every render.
- Dialogs have accessible names, focus entry/return and tested Escape policy.
- Do not claim full modal accessibility until focus containment and nested overlay behavior are implemented and verified.
- Tables have semantic headers and meaningful row/column labels; mobile transformations retain the same relationships.
- Support keyboard-only use, 200% zoom, reduced motion, contrast review and touch targets appropriate to the platform.
- Error messages are associated with the relevant input; color is never the sole error indicator.

### Motion contract

- Motion should express state continuity, hierarchy and spatial relationship, not decoration.
- Prefer transform and opacity; avoid animating layout, large shadows, filters and backdrop blur continuously.
- Immediate control feedback must not wait for a route transition or animation.
- Short local feedback may use restrained scale/opacity; workspace transitions should be brief and interruptible.
- Sheets/dialogs must respect close policy and reduced motion.
- Reduced-motion mode removes nonessential movement and parallax; preserve essential state feedback.
- Power-conserve mode reduces blur, large image effects and repeated motion.
- No autoplaying video or continuously animated background on operational screens.

### Imagery and materials

- Use responsive, locally versioned assets with explicit dimensions/aspect ratio and lazy loading below the fold.
- Photography must not carry essential information or reduce text contrast.
- Blur is limited to transient surfaces/navigation; data tables and form surfaces use opaque/high-contrast material.
- Provide a solid fallback when backdrop-filter is unsupported or expensive.
- Avoid shipping a large image/font asset on the critical login or Home path without measured benefit.

### Performance acceptance

For each migrated screen capture:
- Build ID, device/OS/browser and tab/PWA mode.
- Cold and warm navigation.
- Input-to-first-feedback.
- Long tasks and layout shift.
- Scroll performance and table/list behavior.
- Initial and lazy chunk sizes.
- Image/font transfer and decode cost.
- CPU/memory observation for blur and motion.
- Before/after screenshots or recording.

Do not claim low-end-device acceptance from desktop CI or source inspection alone.

## 15. Overlay and navigation behavior matrix

| Surface | Modal? | Escape/backdrop | Scroll lock | Focus policy |
|---|---|---|---|---|
| Global search full-screen mobile | Yes | Close if no destructive/dirty action | Shared lock | Focus search on open; return to trigger |
| Notification popover | No | Escape/outside click closes | No | Return to trigger; arrow/tab behavior defined |
| Notice detail | Yes | Escape if safe; backdrop policy explicit | Shared lock | Label, focus entry/return |
| Module category sheet | Yes on mobile; responsive panel on desktop | Close if no pending action | Shared lock if modal | Return to category trigger |
| Settings workspace | No modal on desktop; focused screen on mobile | Back follows workspace history | No global lock | Heading focus on destination change |
| Scanner camera surface | Feature modal | Feature-owned close gate | Existing scanner/overlay contract | Preserve current scanner focus and lifecycle |
| Stocktake/Import editor | Feature-defined | Dirty state requires explicit decision | Feature-owned surface coordinated by shared lock | Preserve editor context |
| Update confirmation | Modal only when explicit confirmation required | No implicit activation on Escape/backdrop | Shared lock | Focus return to Update Center action |

The shared body-scroll-lock service remains canonical. Do not add local body overflow save/restore logic. A global overlay stack/focus manager is not assumed to exist; 00H must decide whether to implement one or keep a smaller explicit contract based on verified consumers.

## 16. Migration slices and dependencies

Do not migrate all screens in one change. Recommended order:

1. **Foundation validation:** finalize token roles, typography, semantic status, motion and CSS ownership; resolve 00H gates.
2. **Shell skeleton:** AppShell, route/screen identity adapter, desktop/mobile navigation and workspace outlet; no feature redesign yet.
3. **Login:** independent presentation slice; auth/session behavior unchanged.
4. **Home Overview:** move overview content out of the long-scroll assumption; retain snapshot/cache/notice behavior.
5. **Module Library:** consume the existing registry; do not invent workflows.
6. **Settings/Update Center:** settings presentation first; PWA lifecycle untouched.
7. **Stocktake:** one feature-owned workflow migration.
8. **Stocktake Import:** separate migration because parser, conflict, dirty state and export are distinct.
9. **Scanner presentation:** only if included in the approved slice; protected engine untouched.
10. **Consolidation:** selector/cascade audit, remove verified dead styles/assets and update canonical docs.

Each slice must identify exact consumers, source files, data ownership, tests, visual evidence and rollback commit. Do not create a permanent legacy/new parallel styling system.

## 17. Acceptance matrix for 00G consumers

| Screen | Desktop | Tablet | Mobile | State coverage | Regression evidence |
|---|---|---|---|---|---|
| App Shell/navigation | Required | Required | Required | Auth, offline, unavailable, history | Home performance, bundle, interaction, overlay |
| Login | Required | Required | Required | Idle, match, pending, error, success | Auth/session and boot tests |
| Home Overview | Required | Required | Required | Fresh, stale, missing, error, offline, empty | Home performance/cache batching |
| Module Library | Required | Required | Required | Search, empty, ready, integrating | Registry and navigation tests |
| Stocktake | Required | Required | Required | Session/zone/capture/review/history/export | Stocktake + scanner boundary tests as applicable |
| Stocktake Import | Required | Required | Required | Parse/conflict/dirty/invalid/export/history/error | `test-stocktake-import.mjs` |
| Scanner presentation | Required where applicable | Required | Required | Permission/start/scan/close/error | Relevant scanner UI/lifecycle tests |
| Settings/Update Center | Required | Required | Required | Deferred/downloading/staged/blocked/activate | PWA release tests |
| Notifications | Required | Required | Required | Loading/empty/unavailable/push permission | Notification and overlay tests |
| Activity | Gated | Gated | Gated | No-source unavailable state only | No implementation until event source approved |

### Cross-screen regression suite

Run relevant existing tests based on touched boundary:
- `scripts/test-ui-interaction-immediacy.mjs`
- `scripts/test-home-performance.mjs`
- `scripts/test-home-cache-batching.mjs`
- `scripts/test-bundle-boundaries.mjs`
- `scripts/test-body-scroll-lock.mjs`
- `scripts/test-overlay-layout-contract.mjs`
- `scripts/test-stocktake-import.mjs`
- Scanner presentation/lifecycle tests only when scanner UI integration changes.
- PWA cache/runtime/platform tests when shell/update behavior changes.

Final implementation PR must run repository preflight, TypeScript, production build and GitHub Pages build. Physical desktop, iOS and Android checks remain separate acceptance evidence.

## 18. Open decisions carried into 00H

1. Accept or revise the 00E route/screen identity and browser-history contract.
2. Decide desktop navigation form (persistent sidebar vs compact rail) after one representative high-fidelity shell prototype.
3. Approve typography after Vietnamese glyph, weight, load and physical-device review; no font is selected by this blueprint.
4. Approve final color/status contrast and photography direction.
5. Decide whether a shared focus/overlay stack is required; source audit confirms it is not fully implemented.
6. Define activity event source before any Activity implementation.
7. Decide exact screen ownership/API boundaries and route-level lazy-loading strategy.
8. Confirm device matrix and low-end reference device(s).
9. Confirm whether the first implementation slice is Shell or Design System foundation, based on source dependency and visual prototype.

## 19. 00G exit criteria

- [x] P0/P1 screen blueprints cover desktop, tablet and mobile.
- [x] Layout hierarchy, component composition and feature ownership are specified.
- [x] Loading, empty, error, stale/offline, dirty and operation states are specified where relevant.
- [x] Accessibility, reduced-motion, safe-area and low-end performance contracts are documented.
- [x] Scanner, Stocktake, Import, Auth and PWA protected boundaries are explicit.
- [x] Migration order and regression suite are defined.
- [ ] High-fidelity visual prototype and owner acceptance.
- [ ] 00H acceptance/migration blueprint approved.
- [ ] Source implementation and device validation; intentionally not part of 00G.

**Completion statement:** 00G is a documentation blueprint, not a source-code implementation or approval to start broad UI changes. Proceed to 00H to turn these blueprints into an acceptance matrix, exact migration slices, rollback plan and owner decision gate.
