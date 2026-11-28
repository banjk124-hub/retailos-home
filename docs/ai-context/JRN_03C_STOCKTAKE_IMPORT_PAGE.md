# JRN-03C — Stocktake Import Page Extraction

**Status:** Implementation in progress on `feat/jrn-03c-stocktake-import-page`  
**Base:** JRN-03B merge `ff36f4b1105c00051a2ed38ddfe0b09480acf3f5`  
**Scope:** Move Stocktake Import mount/entry ownership from the Home overlay to the authenticated Journey Page Host.  
**Out of scope:** Parser/OOXML precision redesign, merge/conflict rule changes, IndexedDB schema migration, output format changes, global quick actions, backend adoption, Home's other overlays, JRN-03D cross-Page cleanup.

## 1. Existing feature ownership — preserve

`StocktakeImportModule` remains the feature coordinator and retains:

- Employee code resolution.
- Workbook parsing, exact numeric precision and source fingerprinting.
- Duplicate-file and same-name/different-content detection.
- Zone conflict review and merge semantics.
- Dirty-zone editing, validation, save/cancel and output readiness.
- Dedicated IndexedDB store `retailos-stocktake-import`, history restoration and legacy record compatibility.
- TXT and ZIP output, clipboard fallback and download lifecycle.
- PWA update blocker `stocktake-import` and update-safety notifications.

The extraction changes only Page composition, navigation ownership, modal framing and Journey exit safety. No business-data state moves into Home, Journey stack or a global store.

## 2. Page and Shell composition

- Register a lazy `StocktakeImportPage` resolver under the existing canonical `RetailModuleId` `stocktake-import`.
- Keep the existing `MODULE_REGISTRY.availability === 'ready'` check as the runtime readiness gate.
- Home's Module Library remains the entry point, but selecting Import dispatches typed Journey `push` with the same ephemeral Home return context used by Stocktake: active section, search query and scroll position.
- Remove Home's Import lazy import, memo wrapper, open boolean, close callback, overlay mount and Import-specific body-scroll-lock condition.
- The Import Page registers its own Shell navigation model. Home dispatches `pop`; the persistent Desktop Dock remains fixed on the left and workspace content remains to its right. Mobile retains the existing adaptive navigation.
- The existing Import coordinator is mounted unchanged by the new Page composition.

## 3. Journey Exit Guard contract

The coordinator registers owner-scoped guard `stocktake-import`, separate from the existing PWA update blocker.

| State | Journey policy | Reason |
|---|---|---|
| Workbook parse/merge/save, history read, ZIP export, clear-history operation active | `wait`, then re-evaluate | Never unmount during an active feature operation |
| Pending import review, clear-history confirmation or new-session confirmation | `stay` | User must resolve/cancel the in-feature decision |
| Dirty zone edits or result not successfully persisted to local history | Native confirm | Explicit consent before discarding in-memory changes/results |
| Persisted result, no dirty edits, no pending decision or active operation | `allow` | Safe Page exit |

- Waiters resolve only when `busy`, `historyBusy` and `historyExportingId` are all clear. Journey re-evaluates the live state after the wait.
- Unmount cleanup resolves any outstanding waiters; Journey's owner-registration check fails closed if the Page has already unmounted.
- Pending conflict review is not silently discarded; the user must cancel or confirm it before leaving.
- A failed local history write leaves `result && !historyPersisted` protected by an explicit discard confirmation.
- PWA activation safety remains independently owned by `registerPwaUpdateBlocker('stocktake-import', ...)`.

## 4. Presentation and scroll lifecycle

- The main Import surface becomes a non-modal Page workspace; remove root `role=dialog` and `aria-modal` semantics.
- The Page itself remains scrollable and does not acquire a permanent body-scroll lock.
- Body scrolling is locked only for nested pending-import review, clear-history confirmation and new-session confirmation overlays.
- Preserve the existing review/confirmation dialogs, preview screen, sticky header, zone navigation, table scroll, responsive behavior and safe-area spacing.
- The Import header's Home action dispatches Journey `pop`; history view's back action remains an in-feature transition to the Import view.

## 5. Regression boundaries

Must remain unchanged:

- Parser recognition, OOXML numeric precision, quantity normalization and source metadata.
- Duplicate fingerprints, same-name/different-content detection and zone conflict rules.
- Row validation, dirty edit baseline, save/cancel behavior and output bytes.
- IndexedDB database name/version/object store and stored history record shape.
- TXT filenames, ZIP filename, content compatibility, clipboard fallback and download cleanup.
- PWA update blocker registration and all update lifecycle semantics.
- Stable module identity `stocktake-import`; no duplicate feature ID registry.
- Stocktake Page and scanner lifecycle behavior from JRN-03B.

## 6. Verification gates

Automated contracts and browser coverage must verify:

- Home no longer imports or mounts `StocktakeImportModule`.
- Registry resolves `stocktake-import` lazily through the existing ready-state gate.
- Import Page registers the persistent Shell navigation model and returns Home through Journey `pop`.
- Home return context is captured/restored without persisting business data in the Journey stack.
- Exit guard waits for active parse/save/history/export work, stays during unresolved confirmations and protects dirty/unpersisted results.
- PWA update blocker remains separate and unchanged.
- Main Import workspace is not a modal; nested review/confirmation surfaces remain modal.
- Existing import/edit/validation/conflict/history/TXT/ZIP browser workflows remain green.
- Playwright covers dirty-edit discard cancellation/acceptance and pending-conflict navigation blocking.
- Exact-head CI: preflight, TypeScript, production/Pages builds, bundle baseline comparison and responsive/runtime Playwright.

Physical-device QA remains a separate acceptance gate. No device certification or deployment is implied by this implementation branch.

## 7. Next slices

1. Complete JRN-03C exact-head CI and browser QA; merge only after review.
2. JRN-03D removes any remaining Home-owned feature mounts and performs integrated Stocktake + Import cross-Page regression.
