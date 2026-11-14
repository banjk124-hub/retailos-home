# RetailOS bundle, code-splitting and PWA cache architecture

## Scope

This document records the production loading and update contracts introduced by the P0–P5 performance work. The goal is to reduce work on the login path, load feature code only when requested, and make deployed PWA assets deterministic and reclaimable.

## Build observability (P0)

- Vite emits `.vite/manifest.json` for dependency-graph inspection.
- `npm run preflight` produces `dist/bundle-report.md` and `dist/bundle-report.json` after the Pages build.
- CI builds the exact PR base SHA with its original toolchain, reconstructs the legacy entry closure from `index.html`, and compares it with the current manifest-based build.
- CI uploads baseline/current reports and the before/after comparison as the `retailos-bundle-analysis` artifact.
- The report distinguishes static entry closure from dynamic entry chunks. Per-file gzip sums are estimates, not browser transfer measurements.
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
- The worker is registered centrally by `PwaUpdatePrompt` with `updateViaCache: 'none'`.
- Update checks run at startup, when the app returns to the foreground, and when connectivity returns.
- A newly installed worker waits. The user must explicitly accept an update; the worker then verifies there are no other open RetailOS windows before calling `skipWaiting()`. This prevents one tab from replacing assets while another tab is still using the old application.
- On activation, only RetailOS-owned old cache namespaces are deleted. IndexedDB databases and business snapshots are not touched.
- Navigation uses Network First with cached app-shell fallback.
- Build-manifest JS/CSS/font/image assets and same-origin public media are included in the current release allowlist and use Cache First. Old hashed assets are not copied into the new release cache.
- Push subscriptions reuse the centrally registered worker. Feature code must not register the same worker independently with different options.

## Protected contracts

- No change to scanner camera ownership, lifecycle, decoder validation, temporal recognition, adaptive A1–A3 policies, ROI, or module presentation ownership.
- No change to Stocktake persistence, IndexedDB schema, import history, or explicit save semantics.
- No automatic worker takeover or reload without user acceptance.
- No deployment or merge is implied by this implementation branch.

## Validation and acceptance (P5)

Required automated validation:
- TypeScript and production Vite build.
- GitHub Pages build with `/retailos-home/` base.
- Existing full preflight suite.
- Bundle manifest/report generation.
- PWA cache policy tests.

Required release validation after deployment:
1. Fresh install: worker installs and controls the app without an unsolicited reload.
2. Second release: update prompt appears after worker update is detected.
3. One open tab: accepting update activates the new worker and reloads once.
4. Multiple tabs: update is blocked with a clear message until other RetailOS windows close.
5. Offline: cached app shell and current hashed assets remain available.
6. Old cache namespaces, including legacy `retailos-shell-v10`, are removed after successful activation.
7. Push subscription still uses the active registration.
8. Login, Home, Stocktake, Stocktake Import, scanner, Settings and QA Monitor load their lazy chunks on demand.
9. Scanner lifecycle and stocktake persistence regression suites remain green.

Real-device transfer and rendering performance must be measured after deployment; CI bundle sizes alone do not prove runtime improvement.
