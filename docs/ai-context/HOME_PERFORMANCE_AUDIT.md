# Home performance and technical-debt audit

## Scope and baseline

- Baseline: `main` at PR #103 merge commit `3262edfe37ac4de2b34fcb24d747bf1356a8e8f5`.
- Focus: Home startup work, render propagation into navigation/module surfaces, IndexedDB snapshot reads, Home-owned timers, CSS layering and direct dependencies.
- Source baseline observed: `HomeScreen.tsx` is 895 lines with 21 state hooks, 13 effects, 5 memo hooks and a large conditional overlay tree.
- Home imports five feature stylesheets: `home.css`, `home-ux.css`, `home-engine.css`, `home-redesign.css` and `home-architecture.css`. Together they are about 79 KB of source CSS before minification/compression.
- A selector scan found repeated selector declarations across these stylesheets. Repeated selectors are not automatically dead code: media-query variants and deliberate cascade overrides must be preserved until their computed-style ownership is traced.
- The lockfile has 147 package entries and six direct runtime dependencies. Current source search confirms usage of React, Lucide, ZXing, JSZip and PptxGenJS. No direct runtime dependency is removed in this first slice.

## Confirmed hot paths and changes

### Snapshot notice startup

Before:
- Home requested all eight module snapshots with eight independent calls to `getCachedModuleSnapshot`.
- The notice calculator only consumed `inventory`, `product-dates` and `sales`.
- Each individual read opened and closed an IndexedDB connection and created its own readonly transaction.
- Notice calculation normalized each row into a new object array, then created additional filtered arrays to count matches.

Changed:
- Added `getCachedModuleSnapshots(moduleIds)`, using one IndexedDB connection and one readonly transaction with targeted `get` requests.
- Home now requests only the three snapshot IDs required by the notice rules.
- Notice rules count directly from source records without allocating normalized row arrays.
- Snapshot read failures are reported as unavailable; the previous partial state is no longer meaningful for a single transaction.

### Home render propagation

Before:
- The calendar clock updated Home state every 60 seconds even when the user was not interacting with the calendar. Because the state lived in HomeScreen, this re-rendered the full Home tree.
- LiquidDock received a newly-created items array, action object and callback on every Home render.

Changed:
- Calendar date state now synchronizes at local midnight and when the document becomes visible, instead of every minute. Opening the calendar also refreshes the date.
- Home dock item definitions are stable; its action and navigation callbacks are memoized.
- LiquidDock is memoized so unrelated Home state changes do not re-render the dock. Its own context-driven motion preference and keyboard interaction updates remain active.

### Search and library render isolation

Before:
- The search input state and module filtering lived in `HomeScreen`.
- Every search keystroke updated the 895-line HomeScreen component, causing its header, spotlight, calendar, overlays and dock subtree to be reconciled along with the module list.
- The library engine was memoized, but the surrounding Home component still owned the high-frequency search state.

Changed:
- Extracted `HomeModuleLibrarySection` as a memoized feature component with its own search state and derived module groups.
- Home now receives only a stable callback that updates the persisted search value; typing no longer updates HomeScreen state.
- The selected library captures the already-filtered module list when opened instead of recalculating it from Home's search state.
- Moved the shared `ModuleLibraryGroup` type into the canonical module registry and stopped rebuilding a partial library object in the click handler.
- Removed the unused `getModulesForLibrary` helper after repository search found no callers.
- Removed the unused `activeFilter` field from persisted Home UI state. Existing localStorage records remain readable because unknown legacy properties are ignored.
- Changed the initial Home UI state read to a lazy `useState` initializer; `readHomeUiState()` is no longer evaluated as a `useRef` argument on every Home render.

- The Home screen also had two independent `scroll` listeners: one tracked the active section and one persisted scroll position. Consolidated them into one passive listener while retaining requestAnimationFrame coalescing for layout reads and the existing 140 ms persistence debounce.

### Home CSS dead-code and cascade cleanup

Before:
- The Home-only `home.css` stylesheet was 22,209 source bytes and still contained legacy sidebar, welcome/hero, metric-card, old module-grid, activity-row and attention-list layouts that no longer exist in the current Home markup.
- The notification popover base rule was duplicated byte-for-byte.
- Responsive `lower-grid` declarations repeated the same one-column definition already set by the base rule. The tablet topbar width also repeated the architecture stylesheet's base width.

Changed:
- Removed 16,358 bytes of selectors confirmed to have no current Home markup owner; retained the active shell, topbar, notification, search, library, activity panel, footer, toast and selected-module styles.
- Removed the exact duplicate notification popover rule.
- Removed redundant lower-grid breakpoint declarations and the duplicate tablet topbar width override.
- Did not flatten the five Home stylesheets or remove other repeated selectors whose breakpoint/state cascade still needs inspection.

### Globally loaded legacy CSS

The same retired Home layouts were still referenced by the globally imported `theme.css`, `interactions.css`, `mobile-tuning.css`, `performance.css`, `adaptive-appearance.css` and `responsive.css`.

Changed:
- Removed dead selector rules and pruned dead branches from grouped `:is()`, `:where()` and comma-separated selectors while retaining active selectors in mixed rules.
- Removed 22,044 additional source bytes across the six global stylesheets. The largest reductions were `mobile-tuning.css` (87,143 → 76,215 bytes) and `responsive.css` (12,331 → 5,612 bytes).
- Across the Home-only and global stylesheets, 38,402 source CSS bytes were removed (about 26.9% of their combined pre-cleanup source size).
- Active controls, current spotlight/library components, panel surfaces, dock, notification/calendar overlays and reduced-motion/performance selectors were retained.
- CSS contract tests now assert that retired layout selectors do not reappear in the globally loaded stylesheets.

## Direct dependency review

Direct runtime dependencies currently have identified source use:
- `react`, `react-dom`: app runtime.
- `lucide-react`: application icon registry and feature components.
- `@zxing/library`: production scanner decoder and scanner regression fixtures.
- `jszip`: Stocktake Import OOXML parsing and export generation.
- `pptxgenjs`: export generation.

- Removed unused dev dependency `@playwright/test`: repository search found no maintained test imports, Playwright config, CLI script or workflow use. Historical implementation notes record a one-off manual Playwright 1.64.1 Chromium visual-QA session, but no current project automation depends on the package. Its isolated `playwright` and `playwright-core` lock entries were removed with it; re-add Playwright when a maintained E2E suite is introduced.
- Recomputed lockfile dependency reachability from all remaining root dependencies and devDependencies: every remaining package entry is reachable; no orphan package entry remains.

This is not yet a full transitive dependency-pruning pass. Do not remove transitive packages directly from the lockfile; only change top-level dependencies through package metadata and a reproducible lockfile update after proving no runtime/test/build path needs them.

## Remaining audit and acceptance

- Split Home's monolithic state/render ownership into stable memoized feature surfaces only where prop/state boundaries can be proven. Avoid a wholesale rewrite.
- Profile Home's first render, search typing, scroll navigation, calendar, notifications, dock, overlay opening and module transitions on desktop, Android and iOS.
- Inspect module import graphs and generated Vite manifest for feature code or CSS that enters the Home chunk without being needed at startup.
- Trace duplicate CSS selectors to actual cascade ownership and computed styles. Remove only proven dead declarations; preserve responsive and reduced-motion behavior.
- Search for duplicate helpers, hooks, services and registries; consolidate only when contracts and owners match.
- Review direct and transitive dependencies against actual imports, test scripts and build tooling.
- Compare before/after initial entry gzip, Home dynamic closure, parse/compile cost, long tasks, interaction latency and render duration. Bundle gzip alone is not a runtime-performance proof.
- Keep scanner camera/decoder contracts, auth/session, module IDs, Apps Script payloads, IndexedDB schemas, service-worker lifecycle and GitHub Pages base path unchanged.

Automated source-contract tests are not physical-device performance acceptance. Record actual browser/device traces before claiming that end-user lag is resolved.
