# RetailOS PWA runtime and user-approved release architecture

**Status:** Runtime implementation is present on branch `feat/pwa-consent-gated-release-runtime`, based on `main` after PR #119. PR #120 was closed as superseded and its documentation contract is incorporated here. CI #1126 on the previous head exposed a Vite output-plugin ordering failure; the branch now runs the release artifact plugin after Vite build plugins and protects that ordering with a regression assertion. Fresh exact-head CI, PR review and physical Android/iOS/Desktop acceptance remain pending. This is the canonical source of truth for every future application release and deployment.

## 1. Product contract

RetailOS has two independent lifecycle domains:

1. **Application Release Lifecycle:** application shell, UI/UX, components, modules, business logic, runtime libraries, workers, WASM, fonts, icons, images and every resource required to run the application.
2. **Data Lifecycle:** lookup data, snapshots, operational records, calculated/derived data, IndexedDB content and data refresh/recalculation.

A new capability, module, UI/UX behavior, runtime dependency or new mechanism that changes how data is processed is an application change. New records, refreshed snapshots, lookup results and recalculation using existing application logic are data changes.

**Data-only activity must never trigger an application release, Service Worker activation, application reload or release-cache cleanup.** Application deployment must not clear or rewrite business data.

## 2. Required update experience

The required user journey is:

1. **Discover:** detect a newer build. Fetch only small release metadata; do not fetch candidate JS/CSS/WASM/media/module payload.
2. **Explain:** display current and candidate version, release title/summary, new capabilities/modules, UI/UX changes, fixes, compatibility notes, operational warnings and estimated payload size.
3. **Ask once:** user explicitly approves download or defers. Deferring keeps the active release selected and usable.
4. **Stage:** after approval, download every required application resource into isolated candidate caches. Show progress by bytes and resource count.
5. **Verify:** verify response status, exact byte size, SHA-256 and manifest completeness; read every cache write back and verify its bytes and root navigation alias before persisting the staged marker. Revalidate staged bytes from cache immediately before activation, without requiring network access. A partial/corrupt/evicted candidate cannot activate.
6. **Auto-activate:** after successful staging, automatically activate when the application is at a safe handoff point and no other RetailOS window blocks takeover. There is no second confirmation.
7. **Boot health:** the new app reports healthy startup for its exact build ID.
8. **Rollback:** if boot health fails, restore the last-known-good shell and matching assets. Never touch business data.

The active release remains available while a candidate is discovered, deferred, downloaded or rejected. If the download fails or connectivity is lost, only the candidate's partial caches are removed.

## 3. Release discovery and consent boundary

The browser downloads a changed Service Worker control script as part of its update mechanism. That script is control-plane code, not the application payload. For an update, its `install` event must complete without downloading the candidate runtime.

Current implementation:

- A first installation (no active Service Worker) stages its initial shell/runtime so the first installation can become offline-capable.
- An update installation detects an existing `self.registration.active` and does **not** stage the candidate payload.
- The new worker becomes waiting while the old worker continues serving the selected release.
- The active app asks the waiting worker for `GET_RELEASE_INFO`. The candidate worker fetches only `release-manifest.json?build=<BUILD_ID>`, validates it and returns the manifest.
- The UI displays the exact manifest notes and estimated size. No candidate application resource is fetched before the user selects **Tải và cập nhật**.
- Deferring hides the candidate prompt for the current page session; the old release remains active and the candidate can be reviewed again later.

Do not move precache back into the update `install` event. Do not assume that moving `skipWaiting()` or changing the React prompt alone establishes consent.

### One-time migration bridge

Devices currently running the PR #119 client do not yet understand `GET_RELEASE_INFO` or `STAGE_RELEASE`. For the first rollout only, the new worker treats that old client's explicit `SKIP_WAITING` action as consent to stage the candidate, then activates after staging. The legacy client cannot display the new release notes or byte progress because its UI predates this protocol. This is a one-time compatibility bridge; after the device has loaded this release, subsequent updates use the complete consent/release-notes/progress flow.

If a legacy-bridge download fails, the old release and its data remain intact. Since the old UI cannot display the new stage-failure message, reload the old app to re-open the update action and retry. Do not clear browser storage.

## 4. Build-bound release manifest and notes

Every application build publishes `release-manifest.json`, generated by `vite.config.ts` from the exact output bundle and `release-notes.json`. The `retailos-pwa-artifacts` plugin must use Vite's `enforce: 'post'` ordering so its `generateBundle` hook runs after Vite's HTML/build plugins have emitted the finalized `index.html`. Keep the explicit fail-closed check for the final HTML asset; never substitute source HTML or silently omit it. A regression assertion in `scripts/test-pwa-cache-policy.mjs` protects this ordering.

Use SemVer for the user-facing version: patch for fixes, minor for backward-compatible features/modules and major for breaking application/data contracts. Keep `package.json`, `package-lock.json` and `release-notes.json` versions identical; the build and preflight must fail on mismatch.

Manifest fields include:

- `schemaVersion`, immutable `buildId`, Vite `base`, `publishedAt`, user-facing `version`;
- `title`, `summary`, `sections`, `compatibility` and `warnings`;
- `resources[]`: relative `path`, cache class (`shell` or `assets`), exact byte `size` and SHA-256 digest.

The inventory includes:
- `index.html`, `manifest.webmanifest` and `icon.svg` as shell resources;
- all emitted Vite chunks/assets, CSS, imported images/fonts and WASM;
- all files recursively under `public/` except source maps and the three shell resources.

The ZXing `zxing_reader-*.wasm` binary is a required resource. Lazy module evaluation is allowed; lazy first-time network downloading after activation is not.

`release-notes.json` is the human-authored source for the candidate notes. Its `version` must match `package.json` and `package-lock.json`; the build-policy regression checks this. Every user-visible release must update the notes. If a change has no user-visible impact, state that explicitly rather than reusing stale feature claims.

Missing/mismatched metadata, duplicate paths, missing resources, invalid hashes or incomplete shell inventory fail closed before staging.

## 5. Candidate staging and integrity

The maintained worker source is `src/sw/service-worker.template.js`. Never edit generated `dist/sw.js` directly.

- Candidate caches are isolated by build ID: `retailos-pwa-shell-<BUILD_ID>` and `retailos-pwa-assets-<BUILD_ID>`.
- The waiting worker handles `STAGE_RELEASE` only after explicit consent.
- Resources are downloaded in sequential batches of two to cap concurrent network/body-buffer memory on low-end devices. Before starting, the worker checks `navigator.storage.estimate()` where available and requires approximately 10% headroom beyond the candidate size so the old release can remain cached. The estimate is advisory; Cache API writes remain authoritative.
- Each response must be successful and non-opaque; the worker checks exact byte length and SHA-256 before writing it to the candidate cache.
- Shell and asset resources are written only to their intended release caches. The root navigation alias is created from the verified `index.html`.
- The worker verifies every expected cache entry and writes a staged-release marker only after all resources are present.
- The active worker continues to serve only the active release while staging runs.
- On network, quota, response, size, digest or cache failure, the worker removes only the candidate shell/assets and staged marker. The active release is not changed.
- If a user closes/reloads the app while the same waiting worker is still staging, the new page joins the in-progress stage, receives current progress and does not start a duplicate download. Progress/completion/failure are broadcast to RetailOS clients.
- If the worker is terminated before staging completes, the active release remains untouched. Partial candidate caches are cleaned on the next explicit retry; the user may need to approve that retry again.
- If a user closes the app after successful staging, the staged marker survives. On the next app launch, `GET_RELEASE_INFO` reports `staged: true`; the UI resumes safe auto-activation without asking for download consent again.

The manifest itself is small control-plane metadata and is fetched with a build-specific query to avoid stale HTTP cache responses. It is not part of business-data storage or the immutable runtime asset cache.

## 6. Safe handoff and automatic activation

After `RELEASE_STAGED`, `PwaUpdatePrompt` invokes the activation coordinator automatically. No second user click is required.

The shared `updateSafety.ts` registry supports module-owned blockers. Current integrations cover:

- **Camera platform:** the shared camera lease service blocks while a camera request is pending or any live camera lease exists. This covers Home and Stocktake scanner sessions, including permission/acquisition before the video element mounts.
- **Stocktake:** blocks while a read/write operation is busy, scanner is open, a zone confirmation is pending, or barcode/zone/entry edits remain in progress.
- **Stocktake Import:** blocks during import/save/export/history operations, active row editing, dirty zones, pending import conflict review, unsaved history or confirmation dialogs.
- **Application transitions:** blocks while login/home identity transitions or logout/data cleanup are running.
- **Module data lifecycle:** blocks while Apps Script manifest/snapshot synchronization or IndexedDB module-data cleanup is in progress; this defers activation but never couples data refresh to app release.
- **Push setup:** blocks while browser notification permission, Service Worker readiness, Push subscription or subscription registration is in progress.
- **Generic interaction guard:** tracks dirty native form fields, active text editing/contenteditable surfaces and pending file selections. Async forms call `markPwaUpdateFormSaved(form)` only after successful persistence; auto-saved fields/forms may opt out with `data-retailos-update-safe`.

Modules with non-DOM unsaved state must register a blocker and call `notifyPwaUpdateSafetyChanged()` whenever their safe/unsafe state changes. Do not rely only on DOM inspection for future modules.

The worker separately checks all same-origin clients within the RetailOS base path. Another open RetailOS tab/window blocks takeover. The UI shows the reason and retries when the current tab regains focus/visibility or a module signals that its operation is safe. Do not forcibly close another tab or silently discard its state.

Once safe and single-client, the app sends `ACTIVATE_RELEASE`; the worker confirms the staged marker and calls `skipWaiting()`. The controller change triggers one reload.

## 7. Boot health and rollback

Activation does not immediately delete the previous release.

- The worker records the previous active release before selecting the new build.
- `PwaUpdatePrompt` reports `APP_BOOT_OK` with the exact build ID after the app root mounts.
- `AppErrorBoundary` reports `APP_BOOT_FAILED` only before root health is established.
- The HTML bootstrap watchdog reports failure if healthy startup is not observed within 30 seconds.
- A matching new-build health report permits cleanup of old release caches and obsolete previous/staged markers, but retains the active-release pointer for the next update.
- A matching new-build failure selects the recorded previous release, removes the failed candidate caches and navigates the client back to the old cached shell.
- A rolled-back app reporting healthy cannot mark the failed new build healthy or delete its own caches.
- If no previous release exists, the worker reports `UPDATE_ROLLBACK_UNAVAILABLE`; never claim rollback succeeded.

Rollback protects the application release only. It must not delete, migrate or rewrite IndexedDB, authentication/session state, Stocktake history, Stocktake Import history or business snapshots.

## 8. Data lifecycle boundary

- Do not put API responses, user-specific records, lookup data, snapshots or calculated business records in immutable release asset caches.
- Do not increment `BUILD_ID` for snapshot refresh, lookup refresh or recalculation using existing application logic.
- Do not stage/activate an application release, reload the page or clear release caches for data-only updates.
- Preserve IndexedDB/local persistence, offline records, authentication/session semantics and explicit-save behavior across releases.
- A new calculation engine, processing mechanism, feature, module or schema-aware capability is an application change and must ship through the release process.
- If a release requires a data-schema migration, declare a versioned migration and compatibility/rollback plan.

## 9. Automated regression coverage

The following scripts are part of `npm run preflight`:

- `scripts/test-pwa-cache-policy.mjs`: manifest, SHA-256 inventory, WASM presence, consent boundary, release notes/version parity, app-wide blockers and data lifecycle separation.
- `scripts/test-pwa-worker-runtime.mjs`: no payload download on update install, metadata-only discovery, consent-gated staging, progress, complete cache verification, retry cleanup, multi-window handoff, staged-resume, legacy bridge, offline rollback and first-install behavior.
- `scripts/test-pwa-platform-compatibility.mjs`: GitHub Pages base path, iOS safe areas, responsive update UI, reduced motion and inline camera compatibility.

The full release gate is final-head `npm run preflight`, TypeScript, production build, GitHub Pages build and CI. Source-contract/VM tests do not prove actual browser storage behavior or device acceptance.

## 10. Physical release acceptance

| Platform | Required checks |
|---|---|
| Android Chrome tab + installed PWA | First install; defer without payload download; approve and observe progress; close/reopen during staging; interrupt network; open every module offline; scanner/WASM offline; safe handoff; rollback |
| iOS Safari + Home Screen PWA | Same consent/progress/resume/offline/rollback checks; camera lease guard; safe-area prompt; no unexpected reload |
| Desktop Chrome/Edge | Fresh install, defer/approve, multiple windows, complete offline payload, storage quota pressure and rollback |
| Low-end Android | Bounded download concurrency, memory/storage pressure, background/foreground during staging, no partial activation |

Record build IDs, device model, OS, browser version, install mode, network state, payload size, consent action, progress/failure behavior, offline result and rollback outcome. CI/VM tests do not establish physical-device acceptance.

## 11. Mandatory change-control and deployment rules

For every future RetailOS code change, module addition, UI/UX change, runtime dependency, build configuration change or deployment:

1. Read this document before implementation and release/deploy work.
2. Classify the work as Application Lifecycle, Data Lifecycle or both.
3. If it adds or changes application capability/runtime resources, include them in the release manifest and update `release-notes.json`.
4. Keep the active release usable while the candidate is discovered, approved, downloaded and verified.
5. Never download the full candidate application payload before explicit user approval (first install is the initial-install exception).
6. Never activate before complete integrity verification; after approval and verification, activation is automatic without a second confirmation.
7. Preserve old-release offline operation, safe handoff, business data and last-known-good rollback.
8. Add regression coverage and run full preflight on the final PR head.
9. Verify the deployment artifact contains the exact manifest, notes and complete asset inventory for the same build.
10. Record tests, unverified paths, physical acceptance and rollback instructions. Never claim device acceptance without device evidence.

This contract applies to all modules and future versions, not only scanner or PWA-specific tasks. Repository documentation is the durable source of truth; do not rely on chat history alone.
