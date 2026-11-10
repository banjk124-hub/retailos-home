# Nạp file kiểm kê — implementation contract

**Status:** Implementation in PR #69; RetailOS CI run #448 passed; not merged or deployed.
**Base:** `main` at `16e296cc5d1074a15a179f186b5db7c2b37c2131`.
**Feature branch:** `feat/stocktake-file-import`.

## 1. Goal

Provide an independent local workflow inside the existing **Kiểm kê** library. It accepts an Excel workbook from the device, extracts product barcodes and quantities, resolves one zone per data sheet, previews Stocktake-compatible output, and exports one TXT file per zone.

The feature must work without a network connection after the PWA has loaded.

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
- Header rows in the first 40 rows of each sheet.

Column detection:
- Prefer explicit `BARCODE`, `BAR CODE`, `PRODUCT BARCODE`, `EAN`, `UPC` or `GTIN`.
- Only fall back to `MÃ VẠCH` when an explicit barcode column is absent.
- Quantity candidates include `SỐ LƯỢNG`, `QUANTITY`, `QTY` and `SL`.
- The parser does not map `CODE` into `BARCODE`.
- If fallback `MÃ VẠCH` is identical on every data row, fail closed because it may be a zone label rather than a product barcode.

Data rules:
- Preserve barcode strings and leading zeroes when present in the workbook cell value; for numeric barcode cells, honor simple Excel zero-padding formats (e.g. `0000000000000`) when present.
- Preserve every source row, including duplicate barcodes. No deduplication or aggregation.
- Preserve raw numeric XML quantity tokens to avoid JavaScript floating-point conversion.
- Convert text decimal comma to decimal point. Ambiguous mixed separators are rejected.
- For percentage-formatted numeric cells, convert Excel's stored fraction to its displayed percentage value and append `%` (e.g. `0.125` → `12.5%`).
- Missing barcode/quantity and invalid quantity values are reported with source row numbers; malformed rows are never silently dropped.

## 4. Zone resolution

- Prefer a consistent explicit `VÙNG` / `ZONE` column when present; if a recognizable sheet name also exists, it must match the column value.
- Otherwise use a recognizable sheet name such as `BT01` or `540`.
- As a final fallback, inspect non-header metadata near the top of the sheet for a recognizable zone token.
- One sheet must resolve to exactly one zone. Multiple distinct values in one zone column fail safely; separate zones should be represented by separate sheets.
- Generic names such as `Sheet1` are not treated as zone codes.
- Duplicate zone codes across sheets fail closed rather than overwrite/merge files.
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
- Import history stores generated output only; the source workbook itself is not retained.
- History can restore and re-download previous output.
- Clear-history affects only `retailos-stocktake-import`.
- If IndexedDB history persistence fails, the parsed preview must remain available for immediate export.

## 7. Current limitations and acceptance questions

- Legacy binary `.xls` is not supported by the current reader.
- Numeric-only zone output `ADRESSE,,540` needs confirmation against the downstream import system.
- Percentage output includes a literal `%`; confirm that downstream parser accepts this representation.
- Header detection is bounded to the first 40 rows; zone metadata lookup is bounded to the first 12 rows before the header.
- Real-device QA is required for iOS Safari/PWA and Android Chrome/PWA: local file picker, workbook memory use, IndexedDB, Blob downloads and ZIP downloads.
- Validate both supplied workbook examples and a multi-sheet workbook with multiple zones before release.

## 8. Verification

The feature adds `scripts/test-stocktake-import.mjs` to `npm run preflight`. The test covers pure header/zone/quantity/output rules and static offline/isolation guards. Full CI must also pass TypeScript, production build, GitHub Pages build and all existing scanner regression tests.

CI is not a substitute for physical-device file-picker/download QA or downstream acceptance of the TXT output.
