# Xuất file — module status and handoff

**Display name:** Xuất file  
**Stable module ID:** `stocktake-import`  
**Library:** Kiểm kê  
**Implementation directory:** `src/features/stocktake-import/`  
**Dedicated IndexedDB:** `retailos-stocktake-import`  
**Current status:** In progress — PR #70 open, not merged or deployed  
**Branch:** `feat/stocktake-import-desktop-editor`  
**Base:** `main` at `853f79607f770000a506f7c1836f1131133497b6`  
**Last verified PR head:** `bfb9172082d72abbb3eeb6add74b9df63088c222` (governance/name update; check GitHub for any later head)  
**PR:** https://github.com/banjk124-hub/retailos-home/pull/70

## 1. Purpose and current capability

The module reads local `.xlsx` workbooks, detects tables and zones, normalizes rows, allows per-zone manual correction and save, then exports one Stocktake-compatible TXT per zone or a ZIP containing all zones.

Current PR #70 includes:
- Excel display-precision-aware decimal handling without a JavaScript floating-point round trip.
- BARCODE preference with same-row GOLDCODE fallback; unresolved rows remain visible for correction.
- Variable header aliases, different table layouts across sheets, multiple blocks per sheet, same-zone aggregation and blocking diagnostics for unsupported blocks.
- Per-zone edit/save, isolated import history, invalid/unsaved export guards and history restore.
- Zone-only TXT filenames and fixed ZIP filename. Date/time remains in the `NHAN VIEN` content line pending downstream compatibility confirmation.
- Desktop two-column workspace, mobile stacked layout, lightweight motion and reduced-motion support.

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
- [ ] Re-run CI after the current module-governance/name update.
- [ ] Confirm whether date/time remains in the `NHAN VIEN` line. Until confirmed, preserve it.
- [ ] Compare Excel displayed quantity values with exported TXT, including `19,236` and fixed-decimal/General formats.
- [ ] Verify BARCODE-empty/GOLDCODE-present material rows.
- [ ] Verify variable header positions, multiple blocks and same-zone aggregation; confirm unsupported blocks block export.
- [ ] Verify per-zone correction, save, history restore, individual TXT and ZIP.
- [ ] Manual QA on desktop Chrome/Edge, iOS Safari/PWA and Android Chrome/PWA.
- [ ] Audit final diff and obtain explicit approval before merge/deploy.

## 6. Resume protocol — mandatory when returning to this module

When the user says “tiếp tục Xuất file” or asks to resume this module:

1. Read this document first, then `STOCKTAKE_FILE_IMPORT.md`, ADR-029/ADR-030 and the current top of `AI_HANDOFF.md`.
2. Query GitHub for PR #70 and branch `feat/stocktake-import-desktop-editor`; verify actual state, base SHA, head SHA, changed files and CI. Treat recorded SHAs as historical checkpoints, not assumed current state.
3. Audit current `main` and PR diff. Confirm no unexpected changes to scanner, Stocktake core, snapshot/cache, auth or deployment.
4. Inspect the actual parser, store, module component, registry entry and regression tests. Do not rely solely on this summary.
5. Reconcile user-reported changes or newly merged PRs before editing. Do not overwrite newer work with this document.
6. Run `npm run preflight` and record exact run/commit evidence. Repeat physical-device QA for affected surfaces.
7. Update this file, detailed contract, roadmap and handoff with exact changed files, current status, evidence, unresolved decisions and next step.
8. Do not merge or deploy without explicit user approval.

## 7. Next technical step

Complete the remaining audit and CI after the current PR update. Resolve the outstanding TXT date/time question before changing the downstream content contract. Then present the final acceptance checklist and wait for approval to merge/deploy.