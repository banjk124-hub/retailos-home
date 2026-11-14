# Home performance and technical-debt audit

## Scope

This follow-up targets Home's impact on downstream lazy modules, repeated IndexedDB work, dependency necessity, and duplicate/legacy styling. It preserves the existing React/Vite/PWA architecture and the current module-data contract.

## Confirmed changes in this branch

- Added `getCachedModuleSnapshots()`: reads only the requested snapshot keys through one database open and one readonly transaction instead of opening the database once per module.
- Home startup notice calculation now uses the batch reader for its eight known module IDs.
- Barcode lookup now uses the same batch reader for its four source modules.
- Memoized the lazy scanner, Stocktake, Stocktake Import, Settings, Scanner QA and Scanner Settings component boundaries. Stable callbacks are passed so Home state changes do not automatically re-render these feature trees.
- Stabilized the LiquidDock item list at module scope, memoized the dock, and stabilized its navigation callback.
- Removed five unused Lucide icon imports from HomeScreen.
- Consolidated repeated Blob/object-URL download mechanics from Stocktake, Stocktake Import, Scanner QA and snapshot export into `src/shared/downloadFile.ts`, preserving the Stocktake Import 1,500 ms URL cleanup delay and existing MIME types.

## Confirmed technical-debt findings

### Home render fan-out

`HomeScreen.tsx` is approximately 895 lines and owns navigation, search, snapshot notices, calendar, notifications, push setup, scanner lifecycle handoff, library selection, Stocktake visibility, and several overlays. Its state updates still reconcile the main Home page tree. The lazy feature boundaries and dock are now isolated, but the main page sections have not yet been split into independent memoized components.

Do not split the entire file by line count alone. Use React Profiler and browser Performance traces to identify which subtrees actually commit during search, scroll, modal open/close, and module operation. Extract only boundaries with measured render cost and stable props.

### IndexedDB snapshot reads

Previously Home called the single-record API eight times through `Promise.allSettled`, and barcode lookup called it four times. Each call independently opened and closed the same IndexedDB database. The new batch reader reduces each operation to one database open and one readonly transaction while fetching only the requested keys (eight for Home, four for barcode lookup). The single-record API remains intact for existing callers.

The batch operation is transaction-level: if the database read itself fails, the whole batch fails and Home reports the snapshot state as unavailable. Missing individual snapshot records remain normal and are not treated as read errors.

### CSS cascade and legacy rules

A source-level scan found 199 selectors repeated across the six Home stylesheets plus responsive and mobile-tuning styles. Most are intentional overrides across base, redesign, responsive and mobile layers; repeated selectors are not automatically duplicate code. The large global `mobile-tuning.css` file is approximately 87 KB of source text and contains both login and legacy Home rules.

A small number of old Home class names (for example `.hero-card`, `.module-grid`, `.welcome-section`, and `.sidebar`) currently appear in CSS search results without matching Home JSX results. This is a lead for a dead-style audit, not enough evidence to delete rules from the global cascade. Before removing or consolidating CSS, verify every class across all source files, dynamic class construction, overlays, login views, responsive breakpoints, and actual computed styles on desktop/iOS/Android.

No mass CSS rewrite was performed in this branch.

### Direct dependency audit

Every direct runtime dependency in `package.json` has a current use:

- `react` / `react-dom`: application runtime.
- `lucide-react`: shared icon registry and feature UI.
- `@zxing/library`: production scanner decoder and decoder regression tests.
- `jszip`: Stocktake Import archive parsing/export and snapshot XLSX export.
- `pptxgenjs`: snapshot PowerPoint export, loaded dynamically at export time.

The build/test dependencies are referenced by the Vite config, TypeScript build, Playwright/test scripts or Node tooling. No direct dependency was removed because there is no proven unused package. `jszip` and `pptxgenjs` must remain deferred from the eager login/Home path.

## Remaining work and acceptance gates

1. Profile Home on a low/mid-range Android device and iPhone: cold launch, warm launch, scroll, search, notification open/close, calendar, scanner open/close, Stocktake open, and interaction while a module is active.
2. Record React commit counts/durations and browser long tasks. Compare p50/p95 input-to-first-feedback and dropped frames; animation duration remains excluded from input latency.
3. Isolate only measured expensive Home sections. Keep business behavior and module state ownership unchanged.
4. Complete a source-wide dead CSS selector audit before deleting legacy styles. Consolidate only rules with equivalent behavior and verified responsive coverage.
5. Continue dependency audit against the lockfile and production bundle manifest. Remove packages only when both runtime and tooling references are absent and the feature contract is preserved.
6. Scanner ZXing decode remains synchronous on the main thread; measure it separately before considering decoder architecture changes.

Automated source-contract tests validate the batch reader and memo boundaries. They do not replace TypeScript/build CI, React Profiler traces, or physical-device acceptance.
