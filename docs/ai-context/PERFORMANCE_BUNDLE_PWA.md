# RetailOS bundle, code-splitting and PWA cache architecture

## Scope

This document records the production loading and update contracts introduced by the P0–P5 performance work. The goal is to reduce work on the login path, load feature code only when requested, and make deployed PWA assets deterministic and reclaimable.

## Build observability (P0)

- Vite emits `.vite/manifest.json` for dependency-graph inspection.
- `npm run preflight` produces `dist/bundle-report.md` and `dist/bundle-report.json` after the Pages build.
- CI builds the exact PR base SHA with its original toolchain, reconstructs the legacy entry closure from `index.html`, and compares it with the current manifest-based build.
- CI uploads baseline/current reports and the before/after comparison as the `retailos-bundle-analysis` artifact.
- The report distinguishes initial static entry closure, each dynamic entry chunk, its incremental bytes beyond the eager entry, and its full static dependency/CSS closure. Shared eager dependencies are excluded from incremental estimates to avoid double-counting. Per-file gzip sums are estimates, not browser transfer measurements.
- Use browser Network/Performance traces for actual transferred bytes, parse/compile time, FCP and LCP.

## Loading boundaries (P1–P2)

- Login remains the eager entry experience.
- Authenticated `HomeScreen` is loaded with React lazy/Suspense after the identity transition.
- Stocktake, Stocktake Import, Home barcode scanner, Settings, Scanner QA Monitor and Scanner Settings are separate lazy feature boundaries.
- The ZXing decoder implementation is dynamically imported only after the first usable camera frame has been published. This keeps the heavy decoder chunk out of the scanner presentation's initial dependency graph and allows preview reveal while decoder code loads; SCANNING still waits for decoder initialization.
- `jszip` and `pptxgenjs` remain dynamically imported by the export actions.
- Feature CSS is imported by its owning lazy component where ownership is unambiguous. Shared tokens, reset, typography and cross-screen foundation styles remain in the app entry.
- Do not add broad `manualChunks` rules without evidence from the generated manifest. Splitting a file is not equivalent to deferring its download.

## Service worker lifecycle (P3–P4)

- `src/sw/service-worker.template.js` is the only maintained worker source. Vite emits `dist/sw.js` and injects a deployment-specific build ID, app base path and current hashed asset allowlist.
- The worker is registered centrally by `PwaUpdatePrompt` with `updateViaCache: 'none'` and the Vite `BASE_URL`, so the GitHub Pages project path is preserved on desktop, Android and iOS.
- Update checks run at startup, when the app returns to the foreground, and when connectivity returns.
- A newly installed worker waits. The user must explicitly accept an update; the worker then verifies there are no other open RetailOS windows **inside this RetailOS project path** before calling `skipWaiting()`. Other GitHub Pages projects on the same origin do not block this deployment. This prevents one RetailOS tab from replacing assets while another RetailOS tab is still using the old application.
- On activation, only RetailOS-owned old cache namespaces are deleted. IndexedDB databases and business snapshots are not touched.
- Navigation uses Network First with cached app-shell fallback. Cache writes are best-effort: Cache Storage quota/write failures must not discard a successful network response.
- Cache Storage read failures fall through to network. If the device is offline and the shell cache is unavailable, navigation cannot be guaranteed.
- Build-manifest JS/CSS/font/image assets and same-origin public media are included in the current release allowlist and use Cache First. Assets are cached on first successful use, not all precached at install. A module/chunk never opened before going offline may therefore still require a network connection. Old hashed assets are not copied into the new release cache.
- Push subscriptions reuse the centrally registered worker. Feature code must not register the same worker independently with different options.

## Protected contracts

- No change to scanner camera ownership, lifecycle, decoder validation, temporal recognition, adaptive A1–A3 policies, ROI, or module presentation ownership.
- No change to Stocktake persistence, IndexedDB schema, import history, or explicit save semantics.
- No automatic worker takeover or reload without user acceptance.
- Update observers are removed on component unmount; the shared registration promise prevents duplicate registration during React StrictMode remounts.
- No deployment or merge is implied by this implementation branch.

## Validation and acceptance (P5)

Required automated validation:
- TypeScript and production Vite build.
- GitHub Pages build with `/retailos-home/` base.
- Existing full preflight suite.
- Bundle manifest/report generation.
- PWA cache policy tests.

## Cross-platform acceptance matrix

The app shell, Vite base path, service-worker registration contract, iOS viewport safe-area behavior, responsive update prompt and inline scanner video behavior are covered by the automated compatibility contract test. This is source-level coverage, not proof of real-device behavior.

| Platform | Browser / installation mode | Required device acceptance |
|---|---|---|
| Desktop | Chrome and Edge; browser tab and installed PWA where available | Fresh install, update prompt, one-tab update, multi-tab lock, offline shell, lazy feature loading, push where supported |
| Android | Chrome tab and installed PWA | Camera permission and preview, background/resume, update prompt, multiple tabs, offline cached features, push permission and click-through |
| iOS / iPadOS | Safari tab and Home Screen web app | Safe-area layout, standalone launch, camera inline preview, background/resume, update detection/acceptance, offline cached features; verify push only on supported installed-web-app versions |

Required release validation after deployment:
1. Fresh install on each platform: worker installs and controls the app without an unsolicited reload.
2. Publish a second release: update prompt appears after worker update is detected.
3. One open RetailOS tab: accepting update activates the new worker and reloads once.
4. Multiple RetailOS tabs/windows: update is blocked with a clear message until other RetailOS windows close.
5. Open a module once, then go offline: app shell and previously fetched allowlisted assets remain available.
6. Open a never-before-loaded lazy module while offline: verify graceful error/retry behavior; do not claim this chunk is precached.
7. Open another same-origin project path: it must not block a RetailOS update.
8. Old cache namespaces, including legacy `retailos-shell-v10`, are removed after successful activation.
9. Push subscription and notification click-through still use the active registration on supported platforms.
10. Login, Home, Stocktake, Stocktake Import, scanner, Settings and QA Monitor load their lazy chunks on demand.
11. Scanner lifecycle, camera resume and stocktake persistence regression suites remain green.

Real-device transfer, camera behavior and rendering performance must be measured after deployment. CI bundle sizes and VM worker tests do not prove iOS/Android runtime behavior; A4 is not device-accepted until this matrix is executed on physical devices.


## Home and module render isolation follow-up

Home startup notice calculation and barcode lookup use `getCachedModuleSnapshots()` to read the required records with one IndexedDB database open and one readonly transaction. The single-record `getCachedModuleSnapshot()` API remains available for callers that need one record.

Home memoizes its lazy feature boundaries (scanner, Stocktake, Stocktake Import, Settings, Scanner QA and Scanner Settings). Stable callbacks are passed to these boundaries so unrelated Home state changes do not force the feature subtree to render again. LiquidDock receives a stable item list and is memoized; its active item still updates when navigation changes.

This is a render-isolation optimization, not a claim that the entire Home page has been split into independent components. Remaining Home render fan-out and CSS cascade debt are tracked in `HOME_PERFORMANCE_DEBT_AUDIT.md`. Verify actual React commits and browser frame timing on physical desktop, Android and iOS devices before claiming a measured latency improvement.
