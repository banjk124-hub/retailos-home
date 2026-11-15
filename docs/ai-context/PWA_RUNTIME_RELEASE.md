# RetailOS PWA runtime and release architecture

**Status:** Implemented on branch `feat/pwa-offline-release-architecture`; final CI and physical-device acceptance are pending. This is the canonical source of truth for PWA runtime, offline guarantees, release staging, activation and rollback.

## 1. Product-level invariants

RetailOS has two independent update domains:

1. **Application release:** HTML, JavaScript, CSS, WASM, fonts, icons and other immutable runtime assets. A new application release must be fully downloaded and verified before it can replace the active release.
2. **Business data release:** snapshots, operational data, lookup results and derived/calculated data. These update through their own data contracts and must not trigger an application release, Service Worker replacement or full application reload.

A data refresh is not an application deployment. An application deployment is not permission to clear or rebuild business data.

## 2. Runtime asset inventory

The Vite build plugin in `vite.config.ts` creates the deployment-specific Service Worker and injects:

- `BUILD_ID`: GitHub commit SHA prefix in CI/deployment; a local build identifier for local builds.
- `APP_BASE`: the Vite deployment base, including GitHub Pages `/retailos-home/`.
- `ASSET_PATHS`: every emitted Vite asset under `assets/` except source maps, plus every file in `public/` except source maps.

The emitted bundle inventory includes JS chunks, CSS, imported images/fonts and the imported `zxing-wasm/reader/zxing_reader.wasm?url` binary. The `.wasm` file is a required runtime asset, not an optional network dependency.

The maintained worker source is only `src/sw/service-worker.template.js`. Never edit generated `dist/sw.js`.

## 3. Release cache layout

Each release owns separate immutable caches:

- `retailos-pwa-shell-<BUILD_ID>`: app base, `index.html`, manifest and app icon.
- `retailos-pwa-assets-<BUILD_ID>`: all emitted Vite assets and public runtime files.
- `retailos-pwa-state`: the active-release pointer used to select the serving shell and to preserve rollback selection.

A release must never write new build assets into a previous release's cache. IndexedDB, localStorage, authentication state, stocktake history and business snapshots are not part of these release caches.

## 4. Atomic staged installation

The Service Worker `install` event performs the following transaction:

1. Open the new release's shell and asset caches.
2. Download all shell URLs with `Cache.addAll`.
3. Download every URL in the generated asset manifest, including WASM.
4. Verify that every expected URL can be read back from its intended cache.
5. Resolve the install event only after all steps succeed.

If any request fails, returns an unusable response, or cannot be cached/verified, installation rejects and the partial caches for that new build are deleted. The currently active worker and its caches remain untouched. The incomplete worker never reaches the waiting/update-ready state.

This is the critical offline guarantee: **a release is not eligible for activation until all required application runtime assets are local.** A user who is already offline keeps using the active release; an interrupted download does not replace it.

## 5. Active release pinning

The active worker serves its selected release's cached app shell first for navigation. For asset requests it checks the selected release's asset cache before searching retained release caches; this prevents an older same-URL public file from shadowing the current release while still allowing rollback to load old hashed assets. It must not fetch a newly deployed `index.html` from the network while the old worker is still active; otherwise new HTML could reference chunks that the active release has not staged.

The new release is adopted only after:
- its install/precache verification has completed;
- the user accepts the ready update;
- the worker passes the existing same-app multi-window guard;
- the new worker activates and the page reloads once.

The update checker remains centralized in `PwaUpdatePrompt` and `serviceWorkerRegistration`. Checks run at startup, on return to the foreground and when connectivity returns. Registration uses the Vite base path and `updateViaCache: 'none'`.

The current UI deliberately retains an explicit **Cập nhật** action as the safe handoff boundary. Once accepted, Service Worker activation and page reload are automatic. Do not silently interrupt an active workflow to force an update.

## 6. Boot health and rollback protection

Activation does not immediately delete the previous release.

- The new worker retains the prior shell and asset caches during a probation period.
- `PwaUpdatePrompt` reports `APP_BOOT_OK` with the exact build ID after the React application tree mounts.
- `AppErrorBoundary` reports `APP_BOOT_FAILED` only before the root has reported healthy; later feature/runtime errors do not invalidate an already accepted release.
- A small build-injected bootstrap watchdog reports `APP_BOOT_FAILED` if the page does not report healthy within 30 seconds.
- The worker accepts a failure report only from its own build ID. A matching current-build health report permits cleanup; a previous application loaded during rollback is recognized only as the selected active release and cannot mark the failed new release healthy.
- On failure, the worker changes the active-release pointer to the previous release and navigates the client. Navigation then serves the previous cached shell; old content-hashed assets remain available through cache lookup.
- Only a matching `APP_BOOT_OK` from the new current build allows deletion of previous release caches and the active-release pointer. A rolled-back build reporting healthy leaves its selected caches intact.

Rollback protects the application release only. It must not delete, migrate or rewrite business data. If no previous cached shell exists, the worker reports `UPDATE_ROLLBACK_UNAVAILABLE`; this limitation must be surfaced rather than claiming rollback succeeded.

## 7. Offline behavior and limits

### Guaranteed by the release contract
- Once a release has completed installation, all emitted application assets, including lazy feature chunks and ZXing WASM, are available locally.
- Opening Scanner does not need to download the WASM binary from the Internet.
- Loss of connectivity during an update leaves the old active release usable.
- An incomplete or failed new release is not activated.
- Business data refresh remains independent of application release state.

### Important migration limitation
A device running an older release that predates full precaching cannot retroactively gain missing offline assets while it is offline. It must complete one successful online staged update first. Until then, the old release can only use resources it already has locally (including any browser cache entries). Do not claim otherwise.

Offline application runtime does not imply offline authentication against a remote identity source, live server data refresh, push delivery or remote API availability. Those capabilities retain their own online/offline contracts.

## 8. Data update boundary

Data refresh is owned by the existing data services and snapshot lifecycle, not by the Service Worker release manifest.

- Do not put API responses, user-specific data, snapshots or calculated business records in the immutable release asset cache.
- Do not increment `BUILD_ID` for a snapshot refresh or recalculation.
- Do not send `SKIP_WAITING`, reload the page or clear release caches for data-only updates.
- Preserve existing IndexedDB/local persistence and explicit-save semantics.
- If a data schema change requires an application change, version and migrate that data contract explicitly; do not disguise it as an ordinary snapshot refresh.

## 9. Regression and release acceptance

Automated source/runtime coverage:
- `scripts/test-pwa-cache-policy.mjs`: manifest, precache, build identity, boot-health and rollback policy.
- `scripts/test-pwa-worker-runtime.mjs`: install-time asset staging, WASM availability, old-release retention, multi-window guard, offline rollback shell/assets and normal network pass-through.
- `scripts/test-pwa-platform-compatibility.mjs`: base-path registration, iOS safe area, Android/iOS shell and inline camera compatibility.
- Full `npm run preflight`, TypeScript, production build and Pages build.

Physical acceptance is separate from CI:

| Platform | Required checks |
|---|---|
| Android Chrome tab + installed PWA | First install online; WASM present in cache; scanner opens offline; interrupted update retains old app; completed update is detected and activated; rollback path |
| iOS Safari + Home Screen PWA | Same staged update/offline checks; camera preview remains inline; update prompt and reload behavior |
| Desktop Chrome/Edge | Fresh install, all-assets precache, single/multiple-window update guard, offline shell and rollback |
| Low-end Android | Memory/storage pressure during precache; scanner initialization offline; no partial-release activation |

Record app build ID, platform/browser version, install mode, online/offline state and test outcome. CI/VM tests do not establish physical-device acceptance.

## 10. Change-control rules for future work

Before changing this architecture:
1. Read this document and the three PWA regression scripts.
2. Keep the worker template, Vite asset manifest, build ID injection, update UI and tests synchronized.
3. Add every new runtime file type or external runtime dependency to the asset inventory and offline tests.
4. Never make a release eligible for activation while a required runtime asset is missing.
5. Never delete the previous release before matching-build boot health.
6. Never couple data-only refresh to app release lifecycle.
7. Preserve the GitHub Pages base path and same-app multi-window guard.
8. Run full CI on the final PR head and complete physical iOS/Android acceptance before declaring the release architecture production-accepted.
