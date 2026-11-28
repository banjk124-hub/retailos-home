# JRN-03B — Stocktake Page Extraction

**Status:** Merged and verified  
**PR:** #216  
**Merge:** `ff36f4b1105c00051a2ed38ddfe0b09480acf3f5`  
**Verification:** exact-head CI run `46122314448`, post-merge main CI run `46122598245`, and Pages deployment run `46122598308` succeeded  
**Base:** JRN-03A merge `3920216dcea8ae04baa774cc62cc0d11c5f3ec77`  
**Scope:** Move Stocktake mount/entry ownership from Home overlay to the authenticated Journey Page Host.  
**Explicitly out of scope:** Stocktake Import (JRN-03C), Home removal of Import overlay, Stocktake business/store schema redesign, scanner engine changes, URL/browser history, JRN-04 Global Quick Actions, visual redesign.

## 1. Source audit and ownership decision

The existing `StocktakeModule` already owns the operational workflow and must remain the feature coordinator:

- Employee resolution and active session initialization.
- Zone/revision lifecycle, entries, review, history/logs and export.
- `stocktakeStore` reads/writes and existing data format.
- Camera lease request, scanner open/close, capability checks and `StocktakeScannerExitGate`.
- PWA update blocker `stocktake` and update-safety notifications.

The Home-only responsibilities being removed for Stocktake are the open boolean, close callback, lazy module import/memo wrapper, overlay mount and the associated Home body-scroll-lock condition.

The Stocktake presentation previously declared a modal dialog and full-viewport backdrop. It is now a Page workspace. The scanner and destructive confirmation surfaces remain feature-owned overlays.

## 2. Page composition

- `journeyPageRegistry.tsx` registers a lazy `StocktakePage` resolver for canonical module ID `stocktake`.
- The existing resolver still requires both a concrete Page resolver and `MODULE_REGISTRY.availability === 'ready'`.
- `StocktakePage` passes the authenticated employee and resolved platform to the existing `StocktakeModule`.
- The active Page registers its own Shell navigation model. The persistent Dock remains outside the Page subtree; its Home action dispatches `pop`.
- The Stocktake header's Home action also dispatches `pop`. Internal `onBackHome` remains an in-feature transition to the Stocktake landing screen, not a RetailOS Home navigation.
- Home launches Stocktake with typed `push` and captures only ephemeral `HomeReturnContext`: active Home section, module search query and current scroll position. No business/session data is placed in the Journey stack.
- When Home is restored, `ActivePageHost` passes the stored context to Home; Home seeds its existing UI state and module-library search. No new persistence schema is introduced.
- `returnFocusKey` is intentionally omitted: the launch control exists only inside the dismissed module-library dialog and is not a stable, visible focus target after Home remounts.

## 3. Exit safety contract

The Stocktake Page registers an owner-scoped Journey Exit Guard. It reads a current-state ref so the guard does not evaluate stale React closures.

| Current state | Navigation policy | Reason |
|---|---|---|
| Storage/read/write operation busy | `wait`, then re-evaluate | Do not unmount while feature-owned operations are active |
| Scanner open | `stay` | User closes scanner through its own exit gate; camera stream release is not bypassed |
| Pending zone replacement or clear confirmation | `stay` | Resolve/cancel the in-feature confirmation first |
| Editing/manual input, barcode, non-default quantity or zone input | Native confirm | User explicitly accepts discarding the unfinished input or stays |
| No active operation, confirmation or unfinished input | `allow` | Safe Page exit |

The `wait` callback resolves only when the coordinator's `busy` state becomes false; the Journey Controller then re-evaluates the guard. The guard does not inspect or mutate the feature store.

The PWA update blocker remains registered separately with its existing rules. Navigation safety and update-activation safety are distinct controls.

## 4. Resource and presentation lifecycle

- The module no longer locks body scrolling for the entire lifetime of the Page.
- The shared body-scroll lock is enabled only while the scanner or a destructive confirmation overlay is open; the Page workspace itself remains scrollable.
- Camera lease cancellation remains in the existing close/unmount/platform-change cleanup.
- `StocktakeScannerExitGate` still requires scanner lifecycle shutdown and presentation completion before the scanner parent closes the surface.
- Scanner overlay and destructive confirmation backdrops remain fixed overlays; the main Stocktake workspace no longer uses `position: fixed`, `role=dialog` or `aria-modal`.

## 5. Regression boundaries

Must remain unchanged:

- Local store schema and IndexedDB records.
- Employee/session identity and active-session selection.
- Zone revisions, superseded zones, entry sequencing and duplicate barcode behavior.
- Action logs, review pagination, export bytes/file naming and prior-export downloads.
- Scanner platform capability policy and runtime device checks.
- PWA update blocker registration and notifications.
- Stocktake Import still launches through its existing Home-owned overlay until JRN-03C.

## 6. Verification gates

Automated checks added/updated for:

- Home no longer owns the Stocktake Page mount.
- Typed destination and Home return-context capture/restore.
- Page resolver/readiness contract and active Page Shell navigation registration.
- Exit Guard wait/stay/confirm branches and separate PWA blocker.
- Scanner lease/exit-gate ownership and scanner-only body-scroll lock.
- Page semantics and workspace layout; nested scanner/confirmation overlays remain.
- Existing Stocktake workflow/store/presentation regression checks.
- Playwright: existing zone/entry/review/export/history workflow, plus Page navigation, dirty-input guard dismiss/accept and Home context restoration.

CI must pass on the exact final PR head: preflight, TypeScript, production/Pages builds, bundle baseline comparison and responsive/runtime Playwright. Manual desktop/mobile review and real-device camera QA remain separate acceptance gates. No deployment or physical-device certification is claimed by this source change.

## 7. Next slices

1. JRN-03B is merged. Keep its scanner lifecycle, Stocktake store and update-safety ownership unchanged.
2. JRN-03C extracts Stocktake Import with guard coverage for busy/history operations, dirty edits, pending import confirmation, unpersisted results and clear/new-session confirmations.
3. JRN-03D removes any remaining Home-owned workflow mounts and runs cross-Page integration QA.
