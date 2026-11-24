# Architecture decision register

This document contains cross-feature and cross-system architecture decisions. Scanner-specific runtime design and subsystem invariants live in [SCANNER_ENGINE.md](./SCANNER_ENGINE.md); Scanner decision history and implementation rationale live in [SCANNER_HISTORY.md](./SCANNER_HISTORY.md).

Scanner-specific ADRs were moved to the Scanner archive to keep this register focused and avoid maintaining a second Scanner specification. Current project-wide ADRs remain here.

## ADR-029 — Shared cross-feature overlay scroll-lock and viewport contract (2026-11-14)

**Status:** Implemented on Draft PR #102; automated regression coverage added. Physical desktop/Android/iOS acceptance is pending.

### Context
Home and several lazy-loaded feature surfaces independently captured and restored `document.body.style.overflow`. Independent snapshot/restore logic could release a lock still owned by another active overlay. The Home full-screen Barcode Scanner was not included in the Home-owned lock state. Calendar and result surfaces also needed consistent dynamic-viewport and safe-area handling.

### Decision
- Use `src/shared/services/bodyScrollLock.js` as the only body scroll-lock coordinator. It reference-counts active owners per document, restores the original inline overflow only after the final release and returns an idempotent release callback.
- Use `useBodyScrollLock(active)` from `src/shared/hooks/useBodyScrollLock.ts` in React surfaces.
- Home owns the lock across modal states, including the full-screen Barcode Scanner, lookup, calendar, notice, library, Settings, QA, Stocktake and Stocktake Import. Child surfaces may acquire nested locks safely.
- Notification popover remains non-modal and does not lock page scrolling.
- Modal/backdrop layouts must account for safe areas, dynamic viewport height, reachable overflow and independent inner scrolling.
- Feature components own their presentation and business state; shared lock manager does not own camera/session lifecycle or modal close policy.

### Protected contracts
No changes to scanner camera lease, camera lifecycle, decoder, barcode validation, Stocktake IndexedDB schema/persistence, Stocktake Import history/output format, authentication, Apps Script data contracts, service worker or deployment configuration.

### Verification
- Regression tests: `scripts/test-body-scroll-lock.mjs` and `scripts/test-overlay-layout-contract.mjs`, both registered in preflight.
- Full CI status must be read from the latest PR #102 head. Prior CI runs are not evidence for later commits.
- Physical acceptance matrix: `docs/ai-context/UI_OVERLAY_ACCEPTANCE.md`.

### Known limitations
- A reusable focus-trap/dialog-stack manager is not implemented.
- Body overflow locking and touch-scroll behavior still require physical iOS Safari/Home Screen PWA validation.
- This ADR does not claim complete WCAG modal conformance or device acceptance.

---

## Historical implementation note — PR #46 shared preview experiment (2026-11-08)

PR #46 briefly introduced an engine-owned shared preview curtain and `ScannerPreviewSurface`. Physical-device testing exposed iOS native-video sizing and Android transition regressions; PR 47A reverted that shared presentation. Retain this record as historical evidence only. The current rule is ADR-015: engine-owned technical frame readiness, module-owned visual presentation, and no DOM geometry gate.


## Conceptual boundaries
1. **App shell** — session/auth boundary, global navigation, layout, notifications and app-wide state.
2. **Module registry** — canonical module identity and metadata. Stable IDs must not be casually renamed.
3. **Module library** — search, grouping, discovery, favorites/recent items where supported, and truthful availability.
4. **Feature UI** — actual workflows for inventory, pricing, products, orders, delivery, sales, expiry/date, stocktake, etc. Do not claim a workflow exists merely because a tile exists.
5. **Data services** — Apps Script/API contract, snapshots, IndexedDB, synchronization and error handling.
6. **Platform layer** — PWA installability, service worker, offline cache, camera permissions and deployment base path.

## State dimensions must remain separate
- `uiStatus`: implemented / integrating / unavailable (use the project's actual enum if one exists).
- `dataStatus`: loaded / stale / missing / error.
- `permissionStatus`: allowed / denied / unknown.
- `connectivityStatus`: online / offline / unknown.
- `operationStatus`: idle / loading / success / error.

Do not collapse these into a single boolean such as `available`.

## Critical invariants to verify before edits
- Stable module IDs and their relation to `moduleDataService`.
- Apps Script request/response payloads and auth/session behavior.
- IndexedDB database/store/version and snapshot invalidation behavior.
- Barcode library and camera permission/error paths.
- Push notification registration and service-worker message handling.
- Vite `base` path and GitHub Pages workflow.
- Existing responsive CSS import order and component class contracts.

## UI/UX direction
- Mobile-first, operationally clear, fast, accessible.
- Avoid narrow left-aligned content with unused space.
- Use responsive grid with explicit minmax(0, 1fr), deliberate breakpoints, safe-area insets, and adequate touch targets.
- Use translucency only where it improves hierarchy; avoid blur on every surface.
- Keep hierarchy, status, action and data freshness distinguishable.
- Do not use fake metrics, fake notifications, fake demo interactions, or misleading readiness labels.
- Build a tokenized design system and migrate gradually; do not keep adding permanent override files indefinitely.

## Deployment safety
- Never push/deploy without user approval.
- Verify build commands from `package.json` and `vite.config.ts` first.
- Check Git diff and exclude secrets, generated artifacts, `node_modules`, and user data.


## ADR-028 — Separate business workflow identity from snapshot identity and add local Stocktake import (2026-11-10)

**Status:** PR #69 and PR #70 merged/deployed; PR #70 accepted by user. Main baseline for follow-up: `b9cc4ce9a848acd51027dff64f5620f65e660a4b`.

### Context

The Home module registry currently typed every workflow ID as `ModuleDataId`. That conflates two different concepts:
- a business workflow that can be opened by an employee;
- a server-provided snapshot dataset that can be synchronized and cached.

The new `Xuất file` workflow is local-only. It reads a workbook from the device and does not require a server snapshot. Adding it to `MODULE_DATA_IDS` would incorrectly make it part of the Apps Script manifest and snapshot synchronization contract.

### Decision

- Introduce `RetailModuleId` for business workflow identity, with `ModuleDataId` retained as the snapshot-data identity.
- Add `stocktake-import` to the existing Kiểm kê library as a separate ready/local workflow.
- Keep the importer separate from `StocktakeModule`; do not modify Stocktake entry persistence, scanner, camera lifecycle or existing manual/scanner/export flows.
- Parse OOXML `.xlsx` in the browser using the existing JSZip dependency and browser XML APIs. Do not upload the workbook or make network requests.
- Store import history/output in its own IndexedDB database, `retailos-stocktake-import`.
- Preview output before export. Multi-zone output is a ZIP containing one TXT per zone; individual zone downloads remain available.
- Preserve duplicate rows and exact source row order. Prefer the explicit BARCODE column over MÃ VẠCH.

### Data and output constraints

- Preserve raw numeric XML tokens to avoid JavaScript floating-point loss.
- Convert textual decimal commas to dots; reject mixed/ambiguous separators.
- Convert percentage-formatted numeric cells from Excel's stored fraction to displayed percent text (e.g. 0.125 → 12.5%).
- Resolve zone codes from recognizable sheet names or top-of-sheet metadata.
- Numeric-only zones currently map to `ADRESSE,,<number>`; this and literal percent suffix compatibility require business acceptance.

### Protected scope

No changes to Scanner Engine, camera/session/lifecycle contracts, Stocktake scanner, existing Stocktake IndexedDB schema, Stocktake save/export behavior, authentication, snapshot API, or deployment configuration.

### Acceptance

See `docs/ai-context/STOCKTAKE_FILE_IMPORT.md`. Required checks include full `npm run preflight`, both supplied workbook fixtures, multi-sheet/multi-zone coverage, iOS Safari/PWA and Android Chrome/PWA file-picker/download QA, and confirmation that the downstream system accepts numeric-only zone and percentage representations.


## ADR-029 — Stocktake import accuracy, layout tolerance and editable zone review (2026-11-10)

**Status:** PR #70 (`feat/stocktake-import-desktop-editor`) merged and accepted. See `docs/ai-context/modules/EXPORT_FILE.md` for current follow-up status.

### Context

After PR #69 was merged and deployed, practical use exposed four correctness/usability gaps: Excel decimal display values were not preserved, material rows could lack a sales barcode but have GOLDCODE, workbooks could contain varying table layouts, and there was no saved manual correction step. Desktop use also needs a wider working surface.

### Decision

- Keep the importer a standalone business workflow. `RetailModuleId` must be defined independently from `ModuleDataId`; importer history stays in its own IndexedDB database.
- Treat OOXML numeric values as decimal strings. Apply the cell's Excel number format and precision using string-based decimal rounding; never round-trip the quantity through JavaScript floating-point numbers.
- PR #70 baseline resolution was BARCODE → GOLDCODE → legacy MÃ VẠCH. The follow-up contract extends this to BARCODE → CODE → GOLDCODE → TILLCODE → legacy MÃ VẠCH final fallback. Missing code/quantity rows remain visible and editable; they are not silently discarded.
- Detect table headers independently across each sheet and each table block. Merge all recognized blocks that resolve to the same zone while preserving row order and duplicates. If a block is unsupported or zone resolution is ambiguous, show a diagnostic and block all exports rather than silently exporting a partial workbook.
- Require explicit per-zone save before export. Persist edited rows and diagnostics with the import history record.
- Use zone-only filenames and ZIP names. Keep the existing date/time in the `NHAN VIEN` content record until downstream format compatibility is confirmed.
- Provide a wide desktop workspace, a stacked mobile layout, short opacity/transform transitions, and reduced-motion support.

### Acceptance

Validate Excel display parity for integer, fixed-decimal, General and percent formats; GOLDCODE fallback; missing-code correction; multiple layouts/tables in one workbook; aggregation of same-zone tables; save/restore; and file downloads on desktop, iOS and Android. Confirm whether the date/time content record remains required.


## ADR-030 — Independent module work lifecycle and handoff (2026-11-10)

**Status:** Implemented and merged in PR #70.

### Decision

- Keep business workflow availability (`availability`) separate from engineering progress (`workStatus`). A module can be usable while still receiving follow-up development, or be paused without changing runtime behavior.
- `workStatus` is optional registry metadata with values `planned`, `in-progress`, `paused`, `operational` and `maintenance`. It is informational only; it must not gate rendering, routing, data loading, permissions or module execution.
- Each independently developed module owns a dedicated status/contract document recording its stable ID, current branch/PR/base/head, implementation state, verified evidence, pending acceptance, owned files, protected boundaries and exact resume procedure.
- Parallel module/engine work uses separate branches and PRs. Module-owned files and isolated storage may be changed only within their scope. Shared contracts require explicit cross-module design and regression coverage.
- Pausing a module is a documentation/metadata state change, not teardown/reset. Never clear local data, alter stable IDs or rewrite history as a side effect.

### Protected boundary for Xuất file

- Stable runtime ID: `stocktake-import`; dedicated storage: `retailos-stocktake-import`.
- No dependency on Stocktake local store, scanner engine, camera lifecycle, shared snapshot cache, snapshot IDs, authentication semantics or deployment configuration.
- Keep implementation under `src/features/stocktake-import/`; shared registry metadata is the only intended shared integration point.
- Resume by reading the dedicated module record, checking branch/PR head against GitHub, auditing the current diff and changed files, then rerunning full preflight. Never resume from stale notes alone.


## ADR-031 — Output layer transition and additive multi-file import sessions (2026-11-10)

**Status:** PR #71 business/session implementation merged. The two-layer presentation decision below is historical and is superseded by ADR-032. Additive multi-file, provenance, timestamp and output-payload decisions remain active.

### Context

After PR #70 was deployed and accepted, the operator requested a faster output workflow and the ability to combine multiple independent workbooks in one working session. The extension must preserve the stable editor, zone navigation, local history, numeric fidelity and the surrounding module UI.

### Decisions

- Keep the current module shell and zone list. Add two mutually exclusive layers only inside the selected zone workspace: TXT Output as the front/default layer and the existing review/editor table as the back layer.
- Do not show both layers at once and do not replace the whole module view when switching. The transition is local to the zone content component.
- Use a readonly textarea as a scoped text-selection fallback. Ctrl+A is explicitly handled only on the focused textarea and selects only its contents; never programmatically select the PWA document.
- Use one output payload for preview, Clipboard copy, individual TXT download and ZIP entry generation.
- Extend row code precedence to BARCODE → CODE → GOLDCODE → TILLCODE, retaining legacy MÃ VẠCH only as the final backward-compatibility fallback.
- Accept multiple workbooks in one picker action and append files to the active session. Parse sequentially on mobile to constrain peak memory.
- Fingerprint each source file locally with SHA-256. Identical files are staged as duplicates; same-name/different-content files are separately flagged.
- Stage the entire incoming batch before mutating the active session. A parse error or cancellation leaves the current session untouched.
- Same-zone data from different files requires explicit conflict confirmation. Merge appends rows in source order and preserves duplicates; skip leaves existing zone data unchanged while accepting non-conflicting zones. Never silently replace or deduplicate rows.
- Persist source file metadata and per-row file/sheet/row provenance as additive optional history fields. Keep old history records readable without an IndexedDB schema migration.
- Keep the session's original import timestamp stable so additive imports do not rewrite the `NHAN VIEN` line.

### Protected scope

No changes to the existing Stocktake module, scanner engine, camera lifecycle, snapshot synchronization, authentication, service worker or deployment configuration.

### Acceptance

Run full preflight and test all source precedence, multi-file, duplicate-file, duplicate-zone merge/skip, history restore, output payload parity, scoped textarea selection and Clipboard fallback cases. Perform manual QA on desktop Chrome/Edge, iOS Safari/PWA and Android Chrome/PWA before release.

## ADR-032 — Unified Stocktake Import workspace and interaction state (2026-11-10)

**Status:** PR #72 merged into main at `036fb89d8e3bcc79e39cdd56f45979e872a800cf`; PR #73 merged/deployed at `629c31c28e808cd5c3181c42b7d29e611a8ad890` (user-confirmed). Workspace v2 is proposed in draft PR #74; CI and physical-device acceptance pending.

### Context

The Output and Editor layers in ADR-031 represented two views of the same zone data, but switching between them split one continuous task into separate work modes. The module also needed clearer feedback for asynchronous actions, persistence, validation and completion, with a more expressive but lightweight visual and motion system.

### Decisions

- Supersede ADR-031's mutually exclusive Output/Editor layer presentation. Keep one continuous selected-zone workspace.
- The review/edit table is the primary work surface. Read-only review and inline edit share the same table; editing changes the row controls in place. Cancel restores the captured edit baseline; save persists the updated zone.
- TXT Preview is a dedicated view inside the selected-zone workspace, replacing the table until the operator returns to it. It is not a separate data model. Preview, Clipboard copy, individual TXT download and ZIP all consume the same generated zone payload.
- Keep TXT Preview as a read-only inspector. Copy and per-zone Download are primary operator actions in the selected-zone heading beside Edit; they must not require scrolling to the preview.
- Separate in-memory session state from IndexedDB persistence. A failed history write cannot be represented as persisted; keep the in-memory data recoverable while showing the unsaved persistence state.
- Provide action-specific progress feedback for import, zone save, ZIP generation, history clear and history re-export. Success/warning/info notices use a centered, non-blocking popup that auto-dismisses after approximately 2.6 seconds; errors remain separate visible alert states. Never show success before an operation completes.
- Keep Add file and New session side by side when a session exists; initial file selection remains full-width. The all-zone ZIP action is a compact control beside the zone-list heading and appears only for sessions with more than one zone.
- Preserve validation and export invariants: dirty or invalid zones and workbook-level blocking issues prevent the corresponding export; all-zone ZIP requires every zone to be valid and saved.
- Use semantic visual hierarchy rather than a uniform treatment: red for primary actions, blue for TXT/technical inspection, green for valid/persisted state, amber for pending/unsaved state and red for errors. Compact containers to their content and use empty space only for useful metadata or actions.
- Use restrained transform/opacity motion and shared motion tokens where available. Respect prefers-reduced-motion and the app's power-conserve mode. Avoid continuous decorative animation, unnecessary remounts and expensive sticky-header blur on mobile.
- Keep the desktop zone-navigation/workspace relationship and adapt the navigation/workspace for narrow screens without changing the data workflow.

### Preserved business and platform boundaries

- No change to workbook parsing, Excel decimal precision, header/zone resolution, code-source precedence, duplicate preservation, SHA-256 fingerprinting, multi-file staging, merge/skip semantics, source provenance, IndexedDB schema/history compatibility, session timestamp or TXT/ZIP output payload.
- No change to the existing Stocktake scanner, Scanner Engine, camera lifecycle, snapshot/cache, authentication, service worker or deployment configuration.

### Acceptance

- CI #534 passed the unified-workspace assertions, full preflight, TypeScript, production build, GitHub Pages build and existing scanner regression suite.
- PR #73 operator-QA layout and feedback refinements passed CI #540 and were merged/deployed by the user at `629c31c28e808cd5c3181c42b7d29e611a8ad890`.
- PR #74 proposes workspace v2: unique product metrics, optional product names, per-zone action state, dedicated TXT preview and viewport-owned scrolling. CI and physical-device QA remain pending.
- Do not merge or deploy until the user explicitly approves.



## ADR-033 — Stocktake Import workspace v2: product identity, action states and viewport ownership (2026-11-10)

**Status:** Proposed in draft PR #74 (`feat/stocktake-import-workspace-v2`), based on deployed main `629c31c28e808cd5c3181c42b7d29e611a8ad890`. CI #545 passed full preflight, TypeScript, production and Pages builds on code head `c61746272f2b31cd8be222cc4012e38de1ce3ddc`. Physical-device QA pending.

### Context

Operator testing after PR #73 identified that the ZIP action could overlap the editor at some desktop viewport sizes, the module frame required excessive page scrolling, and the workflow did not expose action completion on each zone. Operational review also needs a unique product count distinct from row count and optional product names from some source workbooks.

### Decisions

- Place the compact ZIP action beside the zone-list heading. Render it only when the current session has more than one zone. Keep the existing ZIP payload, one TXT per zone, and all export guards unchanged.
- Use a fixed viewport-bounded modal frame. The content region, zone navigator and data table own independent bounded scroll regions. Desktop prioritizes a wide two-column layout; mobile uses a compact stacked navigator and touch-operable controls.
- Track each zone's latest action state independently: Ready, Saved, Copied, TXT downloaded, ZIP exported, Dirty or Invalid. Data edits invalidate prior output action confirmation. A canceled edit returns the unchanged baseline to Ready; history restore marks the persisted zone Saved.
- Count product identity from the resolved code field, independent of the source column. Normalize with Unicode NFKC, trim surrounding whitespace and compare case-insensitively. Preserve punctuation and leading zeroes. Ignore blank identifiers. Count globally across all zones and separately per zone; keep row count independent and preserve duplicate rows.
- Recognize optional product-name headers `TÊN SẢN PHẨM`, `SẢN PHẨM`, exact `TÊN`, `TÊN HÀNG`, and supported English equivalents. Carry `productName` as an optional row field through session merge and IndexedDB history. Render its table column between code and actual quantity only when present in the zone.
- Product name is review metadata only; do not alter the downstream Stocktake TXT `ARTICLE` record or employee/date/zone output format.
- Replace the inline TXT disclosure with a dedicated selected-zone preview view and explicit return-to-table transition. Keep the selected zone and navigator context.
- Keep IndexedDB schema version unchanged because `productName` is an optional additive field; older history rows remain valid.

### Protected boundaries

- No change to Excel numeric precision, code-source precedence, zone detection, source fingerprints/provenance, duplicate preservation, multi-file merge/skip, output filename, TXT payload, session timestamp or export validation.
- No change to Scanner Engine, camera lifecycle, existing Stocktake workflow/store, auth, snapshot/cache, service worker or deployment configuration.

### Acceptance

- Parser tests cover optional product-name aliases and unique product-code counting, including duplicates across zones, case normalization, whitespace and blanks.
- Full preflight, TypeScript, production and Pages builds pass.
- Real workbooks with and without product-name columns retain correct table shape and identical TXT output contract.
- Desktop Chrome/Edge at multiple viewport heights verifies no overlap, no accidental whole-frame scrolling and usable bounded table/zone-list scrolling.
- iOS Safari/PWA and Android Chrome/PWA verify compact layout, touch targets, preview navigation, file picker, clipboard and downloads.
- PR remains unmerged until CI, manual QA and explicit user approval are complete.


## ADR-040 — User-approved application payload download and automatic activation (2026-11-15)

**Status:** Accepted product/architecture contract; current implementation is incomplete. PR #119's offline staging and rollback foundation is merged/deployed, but the consent boundary and release-information UX require a follow-up implementation.

### Context
Post-deployment source audit found that the Service Worker `install` event downloads the complete asset inventory immediately when the browser installs a changed worker. The React update prompt appears only after this staging and currently asks the user to activate the already-downloaded release. It also displays generic text rather than build-bound release notes.

### Decision
- Discovering a release and showing its metadata must not download the candidate application's full runtime payload.
- Before any candidate runtime payload is downloaded/staged, show the user the exact candidate version and release notes: new capabilities/modules, UI/UX changes, fixes, performance/security changes, compatibility notes and operational warnings. The user explicitly approves once.
- Deferring leaves the selected release fully usable, including its existing offline capabilities.
- After approval, download and verify the complete release payload: shell, every module/lazy chunk, UI assets, fonts, media, workers, WASM and runtime dependencies. Lazy evaluation is allowed; first-time network download after activation is not.
- Once complete and verified, automatically activate the candidate; there is no second confirmation. Coordinate a safe handoff around unsaved work and multiple open clients.
- Keep the old release selected and operational during staging. On download/integrity failure, discard only candidate staging. Retain last-known-good assets until the new build reports healthy; rollback must not mutate business data.
- Publish a build-bound release manifest and release notes with every application deployment. Missing/mismatched release metadata blocks staging/activation.
- Keep Application Release Lifecycle separate from Data Lifecycle. Data-only lookup/snapshot refresh and recalculation using existing logic never trigger app update/reload. A new processing mechanism or capability is an application release change.

### Protected boundaries
- No application release may become active with missing runtime assets.
- No full candidate payload download before explicit user consent.
- Historical ADR-041 rule superseded by ADR-042: successful staging does not authorize activation; explicit confirmation is required at a safe handoff.
- No clearing/migration of business data as part of ordinary release activation or rollback.
- No claim of offline/device acceptance based only on source assertions or CI.

### Current implementation gaps
- Full precache currently occurs inside Service Worker `install`, before consent.
- The current prompt has no versioned release notes or download progress and asks for activation after download.
- Existing tests do not assert the pre-consent no-download boundary or automatic activation after approved staging.
- Follow-up must redesign the staging boundary around actual browser Service Worker semantics; a prompt-only change is insufficient.

### Acceptance
See the mandatory source-of-truth matrix in [PWA_RUNTIME_RELEASE.md](./PWA_RUNTIME_RELEASE.md). Extend tests to cover discovery-only, no-download-before-consent, defer/offline preservation, full payload staging, integrity failure, automatic activation, safe handoff, boot rollback and data lifecycle isolation. Complete Android, iOS and desktop physical acceptance separately.

## ADR-041 — Consent-gated PWA release staging and safe automatic activation (2026-11-15)

**Status:** Implemented on branch `feat/pwa-consent-gated-release-runtime`; final CI and physical-device acceptance pending. No production deployment is claimed.

### Context

PR #119 delivered full offline asset inventory, release-specific caches, boot health and rollback, but its Service Worker `install` event downloaded the complete candidate payload before the update prompt. The user had asked to approve the download itself, review release notes, then have the verified update activate automatically without a second confirmation.

### Decision

- Vite emits a build-bound `release-manifest.json` from the exact output resources and `release-notes.json`. Every resource includes path, cache class, byte size and SHA-256. Package, lockfile and release-note versions must match under SemVer.
- An update Service Worker install downloads no application payload. It waits while the current worker continues serving the active release. First install (no active worker) is the only automatic full-stage case.
- The waiting worker exposes metadata-only `GET_RELEASE_INFO`. The UI shows current/candidate versions, release notes, compatibility/warnings and estimated size. Only explicit user consent sends `STAGE_RELEASE`.
- Candidate resources are fetched in batches of two after an advisory storage-budget preflight, verified by status/size/SHA-256 and cached in build-isolated shell/assets caches. The worker reads every cache entry back and rechecks byte size/SHA-256 plus the root navigation alias before persisting the staged marker. Immediately before activation, it revalidates all staged bytes from cache without a network dependency; corruption/eviction deletes only candidate caches and requires a new user-approved staging attempt. The old release remains selected.
- A shared in-worker staging promise lets reloaded/concurrent clients join the same download and receive progress instead of starting duplicate downloads. A staged marker allows a later app launch to restore the candidate without renewed download consent; activation still requires a separate explicit user confirmation.
- After `RELEASE_STAGED`, the app waits for module blockers to clear and for the worker's multi-window guard, then presents an explicit activation confirmation. Clearing blockers never requests activation automatically.
- Shared blockers cover the camera lease service, Stocktake, Stocktake Import, module snapshot sync/IndexedDB cleanup, push subscription setup and app-level transitions. Native form dirtiness is tracked; asynchronous forms advance each control's baseline to its current saved value only after successful save through `markPwaUpdateFormSaved`, while auto-saved fields may opt out with `data-retailos-update-safe`. A cancelled native reset does not clear dirty blockers. Future modules with non-DOM unsaved/critical state must register their own blocker.
- Matching-build boot health and last-known-good rollback remain authoritative. The login surface or mounted HomeScreen acknowledges health; the update prompt cannot report healthy before the primary application surface is ready. Root render failures before that acknowledgement remain eligible for rollback. Healthy boot cleans old release caches and obsolete previous/staged markers while retaining the active-release pointer for the next update. Release activation/rollback never mutates business data.
- The PR #119 client receives a one-time compatibility bridge: its explicit `SKIP_WAITING` action is interpreted as consent to stage before activation. Its old UI cannot show release notes/progress until it loads the new client.

### Protected boundaries

- No candidate runtime payload before consent on update.
- No activation with incomplete or invalid manifest/resources.
- No cross-release asset mixing.
- No forced reload during camera leases, unsaved Stocktake/Stocktake Import work or app transitions.
- No takeover while another RetailOS window is active.
- No data-only update may trigger app release lifecycle.
- No claim of physical offline/device acceptance based on CI alone.

### Verification

- `scripts/test-pwa-cache-policy.mjs`: manifest, hash inventory, WASM, consent boundary, notes/version parity, safety blockers and data separation.
- `scripts/test-pwa-worker-runtime.mjs`: update install without payload, metadata discovery, staging, progress, staged resume, failure cleanup, legacy bridge, multi-window retry, offline rollback and first install.
- `scripts/test-pwa-platform-compatibility.mjs`: Pages base path, responsive/safe-area/reduced-motion update UI and scanner inline compatibility.
- Worker runtime regression mutates a staged cache entry after successful staging and proves activation is blocked, candidate caches are discarded, and a consented restage succeeds.
- Vite release artifact plugin uses `enforce: 'post'` and `generateBundle: { order: 'post', handler }`, ensuring the final `index.html` and final emitted chunk bytes exist before manifest hashing. CI #1126 exposed the missing HTML ordering; CI #1162 exposed a post-hook chunk byte mismatch (manifest 59,043 bytes vs final HomeScreen asset 60,023 bytes). The cache-policy test protects both ordering contracts. RetailOS CI #1184 passed on final PR head `1212b8f73b21e699bff053cfc3b8a1ee48652aa7`, including preflight, TypeScript, production/Pages builds, manifest byte/hash parity, worker runtime, platform compatibility, main-only production deployment guard and bundle comparison.
- Physical Android/iOS/Desktop/low-end Android acceptance remains required before merge/deployment.


## ADR-042 — PWA Update Center and explicit business-safe activation (2026-11-15)

**Status:** Implementation in progress on `feat/pwa-update-center-safe-handoff`; automated CI and physical acceptance pending.

### Context
The previous release contract auto-activated after verified staging when blockers cleared. That conflated consent to download with consent to replace the running app and allowed a deferred candidate to reappear after reload because deferral lived only in a component ref.

### Decision
- Separate download consent from activation consent. `RELEASE_STAGED` records readiness only; it never authorizes `ACTIVATE_RELEASE`.
- Persist deferral per device and BUILD_ID. Deferring before staging prevents payload download; deferring after staging may retain verified bytes but keeps the old release active.
- Surface deferred work in Settings → Update Center with a numeric Settings badge.
- Show a compact expandable corner notice while business blockers exist; show a centered confirmation only when the application is at a safe handoff.
- Clearing a blocker never activates automatically. Only the explicit activation action can request takeover.
- Forced-update behavior remains unsupported until an authoritative, validated policy publisher is implemented; optional is the fail-safe default.

### Protected invariants
No changes to release cache isolation, manifest resource integrity, first-install staging, boot health/rollback, business data/IndexedDB, auth/session, module IDs, Apps Script contracts or production deployment controls.

### Acceptance
Persistent defer across reload/reopen; no download before consent; no auto-activation after stage/reopen/blocker-clear; explicit confirm only when safe; Settings badge/Update Center consistency; busy compact notification and idle centered dialog; worker multi-window/integrity/rollback regressions; physical Android/iOS/Desktop QA.
