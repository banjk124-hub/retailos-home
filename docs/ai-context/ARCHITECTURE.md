# Architecture notes and invariants

This file is a working contract, not a substitute for inspecting current source. Verify every path and interface before changing it.

## Conceptual boundaries
1. **App shell** — session/auth boundary, global navigation, layout, notifications and app-wide state.
2. **Module registry** — canonical module identity and metadata. Stable IDs must not be casually renamed.
3. **Module library** — search, grouping, discovery, favorites/recent items where supported, and truthful availability.
4. **Feature UI** — actual workflows for inventory, pricing, products, orders, delivery, sales, expiry/date, stocktake, etc. Do not claim a workflow exists merely because a tile exists.
5. **Data services** — Apps Script/API contract, snapshots, IndexedDB, synchronization and error handling.
6. **Platform layer** — PWA installability, service worker, offline cache, camera permissions and deployment base path.

## State dimensions must remain separate
- `uiStatus`: implemented / integrating / unavailable (use the project's actual enum if one exists).
- `dataStatus`: loaded / stale / missing / error.
- `permissionStatus`: allowed / denied / unknown.
- `connectivityStatus`: online / offline / unknown.
- `operationStatus`: idle / loading / success / error.

Do not collapse these into a single boolean such as `available`.

## Critical invariants to verify before edits
- Stable module IDs and their relation to `moduleDataService`.
- Apps Script request/response payloads and auth/session behavior.
- IndexedDB database/store/version and snapshot invalidation behavior.
- Barcode library and camera permission/error paths.
- Push notification registration and service-worker message handling.
- Vite `base` path and GitHub Pages workflow.
- Existing responsive CSS import order and component class contracts.

## UI/UX direction
- Mobile-first, operationally clear, fast, accessible.
- Avoid narrow left-aligned content with unused space.
- Use responsive grid with explicit minmax(0, 1fr), deliberate breakpoints, safe-area insets, and adequate touch targets.
- Use translucency only where it improves hierarchy; avoid blur on every surface.
- Keep hierarchy, status, action and data freshness distinguishable.
- Do not use fake metrics, fake notifications, fake demo interactions, or misleading readiness labels.
- Build a tokenized design system and migrate gradually; do not keep adding permanent override files indefinitely.

## Deployment safety
- Never push/deploy without user approval.
- Verify build commands from `package.json` and `vite.config.ts` first.
- Check Git diff and exclude secrets, generated artifacts, `node_modules`, and user data.


## Scanner invariants (Phase 1.2)
- Supported store symbologies: EAN-13, EAN-8 and CODE-128. The decoder must whitelist these explicitly; verify the installed ZXing API before importing types or adding dependencies.
- One active decoder per scanner session. Start, pause, resume and close must be idempotent; stale asynchronous work must not attach a stream or deliver callbacks after cancellation.
- Validate decoded format and payload before invoking feature callbacks. EAN values are format-specific; CODE-128 remains an opaque string and must not be coerced to numeric.
- Scanner layer must not require catalog existence. Unknown barcodes remain valid operational input where the consuming workflow permits them.
- Preserve Home cached lookup, Stocktake form-fill/explicit-save semantics, duplicate Stocktake rows, and manual entry.
- Do not tune resolution/decode interval until actual device settings and scan latency are measured.
- See `ROADMAP.md` for phase acceptance criteria and `DECISIONS.md` for accepted decisions.
