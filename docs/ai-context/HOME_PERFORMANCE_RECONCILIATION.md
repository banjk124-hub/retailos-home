# Home Performance Reconciliation — PR #104 / #105

## Purpose

This branch reconciles the Home performance audit in PR #104 with the narrower render/cache and shared-download improvements in PR #105. It is a review branch only; it does not authorize merge or deployment.

## Baseline

Both source PRs were created from `main` commit `3262edfe37ac4de2b34fcb24d747bf1356a8e8f5`. This branch is based on that same baseline and keeps both original PR branches unchanged.

## Selected implementation

- Use the targeted Home notice snapshot set: `inventory`, `product-dates`, and `sales`.
- Use one IndexedDB connection and one readonly transaction for requested batch reads.
- Keep the transaction helper scoped to IndexedDB request work; do not await network or unrelated asynchronous work inside an active transaction.
- Keep Home module search/filter state inside the memoized `HomeModuleLibrarySection`.
- Keep the selected library module list captured when the library opens.
- Keep memoized boundaries around scanner, stocktake, stocktake import, settings and QA feature trees, with stable callbacks.
- Keep `LiquidDock` memoized at its own component boundary and use stable Home dock/action props.
- Use one shared Blob/object-URL download lifecycle across Stocktake, Stocktake Import, Scanner QA and snapshot exports. Preserve Stocktake Import's 1,500ms object-URL cleanup delay.
- Keep JSZip deferred for Stocktake Import parsing/export paths.
- Retain Playwright dependencies until the project has a maintained replacement for browser E2E/visual QA.

## Intentionally excluded

- No IndexedDB schema or version change.
- No scanner decoder, camera lease, camera lifecycle, auth/session or permission contract change.
- No new worker, queue, event bus, telemetry service or global state layer.
- No removal of Playwright.
- No change to Apps Script payloads, module IDs or business rules.
- No deployment or merge to `main`.

## CSS scope

The broad Home stylesheet cleanup from PR #104 is intentionally excluded from this branch. All 11 affected stylesheets remain at the common main baseline. CSS cleanup should be handled as a separate change after selector-usage, cascade and computed-style review, followed by physical QA on desktop, Android Chrome/PWA and iOS Safari/Home Screen PWA.

## Error semantics

- Home notice batch read is atomic at the IndexedDB transaction level. A request/transaction failure is surfaced as unavailable rather than silently reported as an empty notice set.
- Barcode lookup uses the same batch read. If the shared transaction fails, it reports the affected lookup sources as failed; it does not claim that the barcode was simply not found.
- Missing snapshot records are not treated as read errors; only returned records are evaluated.

## Validation

Preflight includes:
- Home performance and snapshot-notice regression contracts.
- Home cache batching and shared download lifecycle contracts.
- UI interaction immediacy and lazy-loading feedback contracts.
- Bundle boundary and PWA cache policy contracts.
- Existing scanner, Stocktake, overlay, TypeScript and production/Pages build checks.

CI success proves only the automated contracts represented in the repository. It does not prove physical-device rendering, iOS camera recovery or real-world p95 input latency.

## Physical acceptance gate

Before merge, record device model, OS, browser/PWA mode and cold/warm state. Test:
- Home first load and repeated navigation.
- Search typing and clearing.
- Calendar, notice and library open/close.
- Cold and warm lazy feature loading.
- Stocktake and Stocktake Import import/save/export/history.
- Barcode lookup with complete, missing and unreadable snapshots.
- Scanner open/close and background/foreground recovery.
- Reduced-motion behavior.
