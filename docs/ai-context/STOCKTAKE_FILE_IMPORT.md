# Xuất file — implementation contract

**Display name:** Xuất file.
**Stable module ID:** `stocktake-import` (do not rename without a data migration plan).
**Status:** PR #70 and PR #71 are merged. UX/workspace refinement is in draft PR #72; not merged/deployed. CI #524 passed on head `13ae9a96e270642d5349041f5d01bfd8a7a542f4`; physical-device QA remains pending.
**Main baseline:** `b9cc4ce9a848acd51027dff64f5620f65e660a4b`.
**Business/session implementation:** PR #71 merged at `1c1afb5d2a9c89b955340735cf3f5e77a7f138b9`.
**Current UX branch:** `feat/stocktake-import-native-workspace`.
**Current UX PR:** https://github.com/banjk124-hub/retailos-home/pull/72 (draft; CI #524 passed on `13ae9a96e270642d5349041f5d01bfd8a7a542f4`; manual desktop/iOS/Android QA pending).
**Dedicated module record:** `docs/ai-context/modules/EXPORT_FILE.md`.

## 1. Goal

Provide an independent local workflow inside the existing **Kiểm kê** library. It accepts an Excel workbook from the device, extracts product barcodes and quantities, resolves one zone per data sheet, previews Stocktake-compatible output, and exports one TXT file per zone.

The feature must work without a network connection after the PWA has loaded. Follow-up source fingerprinting uses Web Crypto SHA-256 locally; workbook contents remain on-device.

## 2. Ownership and isolation

- `RetailModuleId` identifies business workflows; `ModuleDataId` identifies server snapshot datasets. These are deliberately separate.
- `stocktake-import` is a local-only workflow and must never be added to `MODULE_DATA_IDS`, the Apps Script manifest, or snapshot synchronization.
- The existing `StocktakeModule` remains an independent workflow.
- Import history uses a separate IndexedDB database: `retailos-stocktake-import`.
- Do not clear or migrate `retailos-stocktake` when clearing import history.
- Scanner Engine, camera lease/lifecycle, scanner contracts, stocktake entry schema, and current manual/scanner workflows are protected.

## 3. Input contract

Current reader accepts OOXML `.xlsx` workbooks. It reads:
- `xl/workbook.xml` and workbook relationships to enumerate sheets.
- Shared strings, inline strings and worksheet cell values.
- Cell style IDs to identify percentage-formatted numeric values.
- Scan worksheet rows for header-like table blocks without a fixed row cutoff; resolve each block independently.

Column detection:
- Resolve each row using the first non-empty value in this order: `BARCODE` → `CODE` → `GOLDCODE` → `TILLCODE`.
- Retain legacy `MÃ VẠCH` as a final compatibility fallback only when all four preferred source fields are absent/empty in the row.
- Store the resolved code and its actual source field in `barcodeSource`; manual corrections are marked `manual`.
- Recognize common Vietnamese/English aliases and detect each table block's columns independently.
- Quantity candidates include operational Vietnamese/English aliases for counted, actual-result and quantity fields.
- Header detection recognizes the four explicit code columns independently; it does not relabel or overwrite their original source fields.
- A row with no usable code is retained with a validation issue for manual correction; it is never silently dropped.

Data rules:
- Preserve barcode strings and leading zeroes when present in the workbook cell value; for numeric barcode cells, honor simple Excel zero-padding formats (e.g. `0000000000000`) when present.
- Preserve every source row, including duplicate barcodes. No deduplication or aggregation.
- Preserve raw numeric XML quantity tokens and apply Excel number-format precision using decimal-string arithmetic; do not round-trip through JavaScript floating-point numbers.
- For General format, follow Excel's 15-significant-digit behavior. Convert unambiguous decimal-comma edits to decimal-point output on save; ambiguous or incomplete input is rejected.
- For percentage-formatted numeric cells, convert Excel's stored fraction to its displayed percentage value and append `%` (e.g. `0.125` → `12.5%`).
- Missing barcode/quantity and invalid quantity values are reported with source row numbers; malformed rows are never silently dropped.

## 4. Zone resolution

- Prefer a consistent explicit `VÙNG` / `ZONE` column when present; if a recognizable sheet name also exists, it must match the column value.
- Otherwise use a recognizable sheet name such as `BT01` or `540`.
- As a final fallback, inspect non-header metadata near the top of the sheet for a recognizable zone token.
- Each detected table block must resolve to exactly one zone. If one block contains multiple distinct zone values, report a blocking diagnostic; represent those zones as separate blocks.
- Multiple recognized blocks in the same sheet are supported. Blocks resolving to the same zone across sheets are aggregated into one zone output while preserving source order and duplicates.
- Generic names such as `Sheet1` are not treated as zone codes.
- Alphabetic-plus-numeric codes split into prefix and number (e.g. `BT01` → `BT`, `01`).
- Numeric-only codes are currently serialized as `ADRESSE,,540`. This is a compatibility assumption requiring business confirmation.

## 5. Output contract

Output mirrors the existing Stocktake text format:
- `NHAN VIEN,<employeeCode>,YYYY/MM/DD,HH:mm:ss`
- `ADRESSE,<prefix>,<number>`
- One `ARTICLE,<barcode>,<quantity>` line for every source data row.

Each zone becomes its own UTF-8 TXT file. Multi-zone export downloads a ZIP archive containing those independent TXT files; each zone can also be downloaded individually.

## 6. Preview, history and cache

- Preview displays the generated output and extracted barcode/quantity rows before export.
- Import history stores the generated output, row-level source data, correction state and workbook diagnostics; the source workbook itself is not retained.
- History can restore and re-download previous output.
- Clear-history affects only `retailos-stocktake-import`.
- If IndexedDB history persistence fails, the parsed preview must remain available for immediate export.

## 7. Current limitations and acceptance questions

- Legacy binary `.xls` is not supported by the current reader.
- Numeric-only zone output `ADRESSE,,540` needs confirmation against the downstream import system.
- Percentage output includes a literal `%`; confirm that downstream parser accepts this representation.
- A single detected table block must resolve to one zone. Multiple zone values inside one block are not auto-split.
- No interactive column-mapping wizard exists yet; unsupported blocks provide sheet/row/column guidance so the operator can rename source headers and re-import.
- Unsupported populated blocks block the entire workbook export to prevent silent partial output.
- Real-device QA is required for iOS Safari/PWA and Android Chrome/PWA: local file picker, workbook memory use, IndexedDB, Blob downloads and ZIP downloads.
- Validate both supplied workbook examples and a multi-sheet workbook with multiple zones before release.

## 8. Verification

The feature adds `scripts/test-stocktake-import.mjs` to `npm run preflight`. The test covers pure header/zone/quantity/output rules and static offline/isolation guards. Full CI must also pass TypeScript, production build, GitHub Pages build and all existing scanner regression tests.

CI is not a substitute for physical-device file-picker/download QA or downstream acceptance of the TXT output.


## Follow-up hardening — desktop, decimal fidelity and editable review (2026-11-10)

**Implementation branch:** `feat/stocktake-import-desktop-editor`; PR pending.

- Output filenames now identify the zone only: `BT01.txt`, `540.txt`; ZIP name is `KIEM_KE_IMPORT.zip`. The `NHAN VIEN` date/time record inside TXT is retained for compatibility with the existing Stocktake file contract; confirm separately if that record should also change.
- Excel numeric cells are formatted from their exact OOXML decimal token using the cell's number format. The formatter rounds to the displayed decimal precision without converting the quantity through JavaScript `Number`; General format follows Excel's 15-significant-digit behavior.
- `BARCODE` is preferred; if blank, the same row's `GOLDCODE` is used. If neither is present, the row is retained with an actionable validation issue so an operator can correct it.
- Header detection recognizes more operational aliases, scans all worksheet rows, supports different layouts across sheets and multiple table blocks within one sheet, and aggregates tables for the same zone into one TXT. Unsupported header blocks are reported with sheet, row and suggested column names; partial workbook export is blocked to prevent silent omissions.
- A per-zone edit/save workflow persists row-level changes in the module's isolated IndexedDB history. Export is blocked for unsaved or invalid rows.
- Workflow IDs are now defined independently of snapshot IDs. Import history remains in `retailos-stocktake-import`, isolated from the shared snapshot database and Stocktake's own local data.
- Desktop uses a wide two-column zone/workspace layout; mobile retains a stacked layout. Lightweight transitions and `prefers-reduced-motion` support are included. The table is paginated at 100 rows per page.

**Acceptance still required:** verify decimal examples against the original Excel display, material GOLDCODE rows, mixed-layout/multi-table workbook, same-zone aggregation, edit/save/restore, and desktop browser download behavior. Also confirm whether date/time should remain inside the `NHAN VIEN` line.


## Operational review additions

- A zone can contain several recognized table blocks in one sheet, and the same zone can be assembled from different sheets. The parser preserves source sheet and row references in the review table.
- Each detected table block is resolved independently. If a workbook contains a header-like block that cannot be mapped, the parser reports its sheet and row and blocks export of the workbook to prevent partial output.
- Manual correction is scoped to one zone at a time. Unsaved edits prevent changing zones, replacing the workbook, opening history or closing the module. Save writes corrected row values into the import-only history record.
- Decimal-comma values typed during correction are normalized to decimal-point output on save. An incomplete decimal such as `19,` is rejected.
- Zone-only naming applies to current exports and history re-downloads. The date/time in the `NHAN VIEN` content line is intentionally retained until the downstream consumer is confirmed not to require it.
- Desktop layout uses a two-column zone navigator and editor workspace. Mobile uses a stacked layout; row review is paginated to keep large workbooks responsive.


**Contract reconciliation (2026-11-10):** The original PR #69 parser limitations above have been superseded where noted by PR #70. In particular, header scanning is no longer limited to the first 40 rows; table blocks are detected independently; same-zone blocks across sheets are aggregated; BARCODE falls back to same-row GOLDCODE; and history stores editable row-level data. The remaining one-zone-per-block limitation and lack of an interactive mapping wizard are intentional and documented.


## 9. Follow-up — unified workspace, interaction states and additive multi-file sessions

**Business/session implementation:** PR #71 merged into main at `1c1afb5d2a9c89b955340735cf3f5e77a7f138b9`.
**Current UX branch:** `feat/stocktake-import-native-workspace`.
**Current UX PR:** https://github.com/banjk124-hub/retailos-home/pull/72 (draft).
**Current CI:** RetailOS CI run #524 passed on `13ae9a96e270642d5349041f5d01bfd8a7a542f4`. This includes the full preflight, TypeScript, production build, GitHub Pages build and existing scanner regression suite. Physical-device QA is not implied by CI.

### Unified workspace contract

- Keep the existing module shell, import area, zone navigator, selected-zone identity and business data. The UX redesign must not alter parser or session semantics.
- Use one continuous zone workspace. The review/edit table is the primary surface; there is no separate Output/Editor mode and no mutually exclusive `zoneLayer` state.
- Read-only review and edit mode share the same table. Entering edit mode changes the row controls in place; cancel restores the edit baseline; save persists the corrected zone.
- Generated TXT is a secondary, expandable inspector (`details`) below the table. It is not a second workspace. It uses the same `activeZone.content` payload as Copy, per-zone Download and ZIP generation.
- Keep interactive Copy/Download controls outside the `summary` disclosure trigger for valid keyboard and assistive-technology semantics.
- TXT preview/copy/download are unavailable while the active zone is invalid, editing, dirty/unsaved, or the workbook has blocking issues. ZIP remains guarded across all zones.
- Keep the zone navigator stable while editing. A dirty zone cannot be abandoned, replaced by another import, or exported until the operator saves or cancels.
- Keep the table paginated at 100 rows. Preserve source filename, fingerprint prefix, sheet and source-row provenance.

### Workflow and state contract

- Preserve the business sequence: Import → Review → Edit (optional) → Confirm/save → Export. A preview is an inspection surface, not a separate workflow state.
- Separate in-memory data changes from IndexedDB persistence. A failed history write must never be presented as saved; the active in-memory session may remain available but is explicitly marked as not persisted.
- Keep action-level loading feedback for workbook import, zone save, ZIP generation, history clear and history re-export. Do not report success until the operation completes.
- Notices have semantic success, warning and information treatments. Errors remain separate alert states. Loading, disabled, invalid, dirty, saved and completed states must not be represented by the same visual treatment.
- Keep `outputReady`, row validation, dirty-zone checks and workbook blocking diagnostics as the source of truth for export guards.

### Visual and motion contract

- Use the shared RetailOS motion tokens where available. Prefer transform/opacity transitions; avoid layout-thrashing animation, continuous decorative motion and unnecessary remounts.
- Use restrained 260–360 ms spatial transitions for workspace reveal and disclosure content, with clear pressed/active feedback on buttons and icon-bearing controls.
- Respect `prefers-reduced-motion` and `data-power-mode="conserve"`. On narrow/mobile layouts, avoid expensive sticky-header backdrop blur.
- Maintain visual hierarchy by purpose: red for primary workflow actions, blue for technical/TXT inspection, green for persisted/valid states, amber for pending/unsaved states and red error treatment for invalid data.
- Compact text containers to their content. Avoid wide empty cards around short labels; use unused space only when it provides useful status, metadata or an actionable control.
- Desktop uses a zone navigator beside the workspace. Mobile stacks the navigator and workspace, keeps zone navigation horizontally accessible, and preserves table horizontal scrolling.

### Code-source precedence

`BARCODE` → `CODE` → `GOLDCODE` → `TILLCODE` → legacy `MÃ VẠCH` final fallback → manual correction if no value exists. The source tag must reflect the field actually selected.

### Multi-file and session contract

- One file picker selection can contain multiple `.xlsx` files. Parse them sequentially to limit peak memory on mobile devices.
- A user may add more files to the active import session without replacing previously accepted sources.
- A session preserves its original `importedAt` so the `NHAN VIEN` line does not silently change when files are appended.
- Every file is parsed independently using the existing workbook parser. Multiple sheets/blocks within one workbook continue to aggregate by zone as before.
- Each source file receives a local SHA-256 fingerprint. Exact duplicate content is staged and shown to the operator; it is not imported again.
- Same filename with different content is a separate warning and requires explicit confirmation.
- If a new source file contains a zone already present in the session, or another file in the same batch contains that zone, stage the incoming batch and ask the operator to confirm. Never silently merge or replace.
- Conflict review supports explicit merge of all listed duplicate-zone rows or skipping the duplicate-zone additions while retaining non-conflicting zones. Existing rows are never replaced.
- Rows retain `sourceFileName`, `sourceFileId` (16-character SHA-256 prefix), `sourceSheet` and `sourceRow` provenance. The history record stores optional `sourceFiles` metadata with the full fingerprint, size and lastModified. Old history records without this field remain readable.
- The session is updated only after the operator confirms the staged batch. Parse failure or cancellation leaves the active session unchanged.
- If an active zone has unsaved edits, adding files is blocked until save or cancel.
- A new session is an explicit action. It clears only the active workspace; saved history remains available.

### Follow-up verification gates

- [x] Unified editor/preview workspace static regression assertions.
- [x] Semantic notice states, IndexedDB-persisted status and action-specific loading feedback covered by source assertions.
- [x] TypeScript, production build, GitHub Pages build and full preflight passed in CI #524 on `13ae9a96e270642d5349041f5d01bfd8a7a542f4`.
- [x] Existing scanner regression suite passed in the same preflight; no scanner source files were changed.
- [ ] Desktop Chrome/Edge visual and functional QA.
- [ ] iOS Safari/PWA QA: viewport behavior, disclosure interaction, file picker, Clipboard fallback, downloads and history restore.
- [ ] Android Chrome/PWA QA: low/mid-tier performance, file picker, Clipboard, download and history restore.
- [ ] Full IndexedDB session save/history restore and duplicate-file/duplicate-zone end-to-end QA.
- [ ] Confirm TXT preview/copy/download/ZIP payload parity with real workbooks.
- [ ] Audit final diff and obtain explicit approval before merge/deploy.
