# Xuất file — module status and handoff

**Display name:** Xuất file  
**Stable module ID:** `stocktake-import`  
**Library:** Kiểm kê  
**Implementation directory:** `src/features/stocktake-import/`  
**Dedicated IndexedDB:** `retailos-stocktake-import`  
**Current status:** PR #70–#73 merged and deployed (user-confirmed). Workspace v2 is in draft PR #74; not merged/deployed. CI #544 passed on prior head `f3ca833b91eda77b9c4be298ae0be634a2394c97`; latest head `f96dc58e6ea78f993a76ca1f581a150742ea5313` awaits CI. Physical-device QA remains pending.  
**PR #70 baseline:** `b9cc4ce9a848acd51027dff64f5620f65e660a4b`  
**Current main after PR #73:** `629c31c28e808cd5c3181c42b7d29e611a8ad890`  
**PR #70:** https://github.com/banjk124-hub/retailos-home/pull/70  
**PR #71 merge:** `1c1afb5d2a9c89b955340735cf3f5e77a7f138b9`  
**Current workspace v2 branch:** `feat/stocktake-import-workspace-v2`  
**Current PR:** https://github.com/banjk124-hub/retailos-home/pull/74 (draft; CI pending; physical desktop/iOS/Android QA pending)

## 1. Purpose and current capability

The module reads local `.xlsx` workbooks, detects tables and zones, normalizes rows, allows per-zone manual correction and save, then exports one Stocktake-compatible TXT per zone or a ZIP containing all zones.

Current PR #70 includes:
- Excel display-precision-aware decimal handling without a JavaScript floating-point round trip.
- Code resolution priority: BARCODE → CODE → GOLDCODE → TILLCODE, with legacy MÃ VẠCH retained only as the final compatibility fallback; unresolved rows remain visible for correction.
- Variable header aliases, different table layouts across sheets, multiple blocks per sheet, same-zone aggregation and blocking diagnostics for unsupported blocks.
- Per-zone edit/save, isolated import history, invalid/unsaved export guards and history restore.
- Zone-only TXT filenames and fixed ZIP filename. Confirmed by user: remove date/time only from filenames; retain the existing date/time fields in the `NHAN VIEN` content line unchanged.
- Desktop two-column workspace, mobile stacked layout, lightweight motion and reduced-motion support.
- Follow-up UX: one continuous zone workspace with the review/edit table as the primary surface. TXT Preview opens as a dedicated view inside the selected-zone workspace; it is no longer an inline disclosure below the table. Readonly TXT textarea scopes Ctrl+A to output content.
- Follow-up: multi-file `.xlsx` selection and additive import sessions. SHA-256 source fingerprints detect identical files; duplicate zones across separate source files are staged for explicit merge/skip confirmation. Source file provenance is retained per row and in session history.
- Follow-up UX: action-specific loading feedback, success/warning/info notices, and explicit distinction between in-memory changes and IndexedDB-persisted history. Motion uses transform/opacity, reduced-motion and power-conserve guards; mobile sticky header avoids backdrop blur.
- Operator QA refinement (PR #73): remove the persistent notice banner in favor of centered transient confirmation; move Copy and per-zone TXT Download beside Edit; align Add file and New session; place ZIP near the zone list heading only for multi-zone sessions.
- Workspace v2 (PR #74 draft): unique product-code metrics (session-wide and per zone), optional product-name column, per-zone action status, dedicated TXT preview view, compact contextual ZIP action, fixed-height desktop workspace with independent scrolling and compact mobile layout.

## 2. Lifecycle metadata

The registry's `availability` answers whether an employee can open the workflow. The optional `workStatus` answers where engineering work stands. These are separate dimensions:
- `planned`: not implemented.
- `in-progress`: implementation or acceptance is still active.
- `paused`: intentionally suspended; preserve all state and data.
- `operational`: accepted and released; no active feature work.
- `maintenance`: released, with bounded maintenance/fixes ongoing.

`workStatus` is informational only. It must not change routing, module visibility, permission checks, data loading, scanner behavior or runtime execution. The current value is `in-progress`.

## 3. Isolation contract — do not cross

**Owned by this module**
- `src/features/stocktake-import/**`
- `scripts/test-stocktake-import.mjs`
- `docs/ai-context/STOCKTAKE_FILE_IMPORT.md`
- This status record: `docs/ai-context/modules/EXPORT_FILE.md`
- Its registry entry in `src/features/home/moduleRegistry.ts` (shared file; edit only this entry and its type metadata).

**Private resources**
- Stable workflow ID: `stocktake-import`.
- IndexedDB database: `retailos-stocktake-import`.
- Import history and editable row snapshots are module-owned.
- File parsing and TXT/ZIP generation run locally in the browser.

**Protected external boundaries**
- Existing `StocktakeModule`, its IndexedDB/store, scan/manual-entry/save/export flows.
- Shared Scanner Engine, camera acquisition/leases/lifecycle, decoder contracts and scanner presentation.
- Shared snapshot service/cache, `ModuleDataId`, Apps Script manifest and remote sync.
- Authentication/session semantics, global navigation behavior, service worker, Vite base path and deployment configuration.

Do not rename the stable module ID, database name, IndexedDB schema, or output record contract as a cosmetic change. Any required migration must be separately designed, backward-compatible, tested and explicitly reviewed.

## 4. Parallel-work rules

1. Every independently developed module or engine uses its own feature branch and PR.
2. Do not share mutable module-local state, caches, IDs, IndexedDB stores or service instances across modules.
3. Shared registry edits must be additive and narrowly scoped. Do not reorganize the registry while implementing this module.
4. A change to a shared contract requires identification of every consumer, an explicit compatibility plan and regression tests for unaffected consumers.
5. Do not cherry-pick or merge another feature branch into this one without checking the base/head graph and auditing the combined diff.
6. A paused or incomplete module must remain buildable and isolated. Do not introduce half-wired imports, global flags, startup side effects or dependencies that make other modules wait for it.
7. Never infer that device QA passed from CI. Record desktop, iOS and Android evidence separately.

## 5. Current release gates

- [x] PR #70 TypeScript, production build, Pages build and full preflight passed on code commit `55c49995875ba4e8d9a605e60ba1a58c8cff3080` (run #461); later recorded head change was documentation-only.
- [x] PR #70 merged into main at `b9cc4ce9a848acd51027dff64f5620f65e660a4b`; RetailOS CI run #466 and Pages deploy run #85 succeeded. User confirmed deployment and operational testing.
- [x] User confirmed: remove date/time only from filenames; preserve date/time in the `NHAN VIEN` content line.
- [ ] Compare Excel displayed quantity values with exported TXT, including `19,236` and fixed-decimal/General formats.
- [x] PR #70 acceptance and operational testing confirmed by the user.
- [x] PR #71 TypeScript, production/Pages builds and full preflight passed on code commit `37b5f69d8dedcd36ed8a9273131eb60b78bd0f13` (GitHub Actions run #509).
- [x] PR #72 unified-workspace and state implementation passed CI #534.
- [x] PR #73 operator-action layout and transient feedback passed CI #540 on `1f41319fa7c14d4b7d6a4577e576e6fc70cb3eb2`; user confirms merge and deployment.
- [x] PR #74 full preflight, TypeScript, production and Pages build passed in CI #544 on prior head `f3ca833b91eda77b9c4be298ae0be634a2394c97`.
- [ ] Rerun CI on latest PR #74 head `f96dc58e6ea78f993a76ca1f581a150742ea5313`.
- [ ] Manual desktop Chrome/Edge, iOS Safari/PWA and Android Chrome/PWA acceptance.
- [ ] Verify variable header positions, multiple blocks and same-zone aggregation; confirm unsupported blocks block export.
- [ ] Verify per-zone correction, save, history restore, individual TXT and ZIP.
- [ ] Manual QA on desktop Chrome/Edge, iOS Safari/PWA and Android Chrome/PWA.
- [ ] Audit final diff and obtain explicit approval before merge/deploy.

## 6. Resume protocol — mandatory when returning to this module

When the user says “tiếp tục Xuất file” or asks to resume this module:

1. Read this document first, then `STOCKTAKE_FILE_IMPORT.md`, ADR-029/ADR-030/ADR-033 and the current top of `AI_HANDOFF.md`.
2. Query GitHub for PR #74 and branch `feat/stocktake-import-workspace-v2`; verify actual state, base SHA, head SHA, changed files and CI. Treat recorded SHAs as historical checkpoints, not assumed current state.
3. Audit current `main` and PR diff. Confirm no unexpected changes to scanner, Stocktake core, snapshot/cache, auth or deployment.
4. Inspect the actual parser, store, module component, registry entry and regression tests. Do not rely solely on this summary.
5. Reconcile user-reported changes or newly merged PRs before editing. Do not overwrite newer work with this document.
6. Run `npm run preflight` and record exact run/commit evidence. Repeat physical-device QA for affected surfaces.
7. Update this file, detailed contract, roadmap and handoff with exact changed files, current status, evidence, unresolved decisions and next step.
8. Do not merge or deploy without explicit user approval.

## 7. Current follow-up implementation

**PR #74 branch:** `feat/stocktake-import-workspace-v2`  
**PR:** https://github.com/banjk124-hub/retailos-home/pull/74 (draft)  
**Base main:** `629c31c28e808cd5c3181c42b7d29e611a8ad890`  
**Current code head:** `1ef449e4663ee00837aebebada6e9fa8ae0f9b3e` (documentation/test synchronization may advance it)

- Replace the previous output-first/editor-second mutually exclusive layers with one continuous zone workspace.
- Keep the data table as the primary work surface. Read-only review and inline edit share the same table; cancel restores the edit baseline and save persists the corrected zone.
- Keep TXT Preview as a dedicated selected-zone view with an explicit return-to-table action. Operator Copy and per-zone Download remain beside Edit in the zone heading.
- Keep the generated zone content as the single payload for preview, Clipboard copy, individual TXT download and ZIP.
- Distinguish in-memory session changes from IndexedDB persistence. A failed history write must remain visibly unsaved and must not be presented as persisted.
- Provide action-specific loading feedback for import, zone save, ZIP generation, history clear and history re-export. Use centered, non-blocking, auto-dismissing feedback for notices and separate persistent error alerts. Save/copy confirmation appears only after successful completion.
- Refine visual hierarchy, compact text containers, semantic color, responsive zone navigation and restrained motion. ZIP is a compact action beside the zone-list heading and is hidden for single-zone sessions. Respect reduced-motion and power-conserve modes; avoid expensive sticky-header blur on mobile.
- Count unique mapped product codes by normalized barcode value, not row count. Duplicates across zones count once globally; blank codes do not count. Each zone displays its own unique-code count.
- Parse optional product names from `TÊN SẢN PHẨM`, `SẢN PHẨM`, `TÊN` and supported English headers. Display the column between code and actual quantity only when present; do not add product names to the downstream TXT format.
- Keep the application frame fixed to the viewport; the content area, zone list and table own bounded scroll regions. Desktop is the primary wide workspace; mobile remains compact and touch-operable.
- Preserve parser precision, code source precedence, duplicate rows, source fingerprints, additive session merge/skip, provenance, history compatibility, NHAN VIEN timestamp and output filenames.
- No intended changes to the existing Stocktake scanner, Scanner Engine, camera lifecycle, snapshot/cache, auth, service worker or deployment configuration.

### Verification and remaining acceptance

- [x] Stocktake import regression suite, including unified-workspace and state assertions.
- [x] Full preflight, TypeScript, production build and GitHub Pages build (CI #534).
- [x] Existing scanner regression suite in CI #524.
- [ ] Manual desktop Chrome/Edge visual and functional QA.
- [ ] Manual iOS Safari/PWA and Android Chrome/PWA QA.
- [ ] Real workbook end-to-end validation for multi-file merge/skip, IndexedDB restore, TXT/ZIP parity and Clipboard fallback.
- [ ] Final PR review and explicit user approval before merge/deploy.

Do not merge/deploy until the user explicitly approves.
