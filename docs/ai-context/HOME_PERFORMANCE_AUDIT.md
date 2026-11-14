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

## Direct dependency review

Direct runtime dependencies currently have identified source use:
- `react`, `react-dom`: app runtime.
- `lucide-react`: application icon registry and feature components.
- `@zxing/library`: production scanner decoder and scanner regression fixtures.
- `jszip`: Stocktake Import OOXML parsing and export generation.
- `pptxgenjs`: export generation.

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
