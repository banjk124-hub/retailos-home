# RetailOS PWA runtime and user-approved release architecture

**Status:** The complete-asset staging and rollback foundation from PR #119 is merged and deployed (deployment confirmed by the user). A source audit of the deployed `main` snapshot found that the current update consent boundary is in the wrong place. This document is the canonical contract for future PWA runtime, release, offline and deployment work. The target user-approved download flow described below is **not yet implemented**.

## 1. Product contract

RetailOS must behave like an operating system with versioned application releases, not like a website that silently replaces its running code.

There are two independent lifecycle domains:

1. **Application Release Lifecycle:** application shell, UI/UX, components, modules, business logic, runtime libraries, workers, WASM, fonts, icons, images and other resources required to run the release.
2. **Data Lifecycle:** lookup data, snapshots, operational records, calculated/derived data, IndexedDB content and data refresh/recalculation.

A new application capability or a new mechanism that changes how data is processed is an application change. New records, refreshed snapshots, lookup results or recalculation using existing mechanisms are data changes.

**Data-only activity must never trigger an application release, Service Worker activation, application reload or release-cache cleanup.** Application deployment must not clear or rewrite business data.

## 2. Required update experience

The user must see release information and explicitly approve downloading the new application payload. Consent is for the download; there is no second activation confirmation.

Required flow:

1. **Discover:** detect that a newer release is available. Discovery may retrieve small release metadata, but must not download the new application runtime payload.
2. **Explain:** show a release information view before download:
   - current version and available version;
   - new capabilities and modules;
   - UI/UX and workflow changes;
   - fixes and performance/security improvements;
   - compatibility notes, known limitations and important operational warnings;
   - estimated download size where available.
3. **Ask once:** user chooses to download/update or defer. Deferring leaves the current release selected and usable. No runtime asset staging begins before approval.
4. **Download and stage:** after approval, download the complete release payload into isolated staging storage. Show progress, downloaded/total bytes where measurable, and actionable failure/retry state.
5. **Verify:** verify every required resource and release identity/integrity. A partial, corrupt or incompatible payload is not ready and cannot activate.
6. **Auto-activate:** after successful verification, activate the new release automatically. Do not ask for a second confirmation. Coordinate a safe handoff so an active operational action or unsaved user input is not silently lost; if safe handoff is not yet possible, defer activation until the app reaches a safe point.
7. **Boot health:** start the new release and report health against its exact build ID.
8. **Rollback:** if the new release fails its boot-health contract, restore the last-known-good release and its own assets without touching business data.

The user may continue using the old release while a new release is merely available or being downloaded. If download fails or the device goes offline, discard only the incomplete staging payload and keep the old release selected and usable.

## 3. Consent boundary and Service Worker design constraint

**Current implementation does not satisfy the required consent boundary.**

The browser's Service Worker update lifecycle is important: once a changed worker script is discovered and installed, its `install` event runs automatically. The current worker performs full shell and asset precache inside that event. Therefore the current sequence is:

`detect worker update → automatically download/precache all assets → waiting worker → show prompt → user accepts activation`

The required sequence is:

`discover release metadata → show release notes → user approves → download/stage all runtime assets → verify → auto-activate`

The current UI asks for permission to activate a release that has already been downloaded; it does **not** ask permission before downloading. It also provides only generic update copy, not structured release notes.

Future implementation must separate release discovery/control-plane from the application payload. Investigate and implement a design where the existing active release remains the serving runtime while the approved payload is staged in release-specific storage. The browser may still need to fetch a small Service Worker control script as part of its own update mechanism; that control-plane fetch must not be confused with downloading the new application's modules, UI, libraries and media. No substantial runtime payload may be staged before user approval.

Do not assume that moving `skipWaiting()` or changing the React prompt alone solves this problem. The consent boundary must be enforced by the actual download/staging mechanism and covered by runtime tests.

## 4. Release manifest and release notes

Every deployable application release must publish a machine-readable release manifest alongside human-readable notes. At minimum it identifies:

- immutable `buildId` / release ID;
- semantic or user-facing version;
- release publication timestamp;
- minimum compatible runtime/data-contract version where applicable;
- complete runtime asset inventory, including paths and integrity metadata (for example content hash and byte size);
- release-note sections: new capabilities/modules, UI/UX changes, fixes, performance/security changes, compatibility notes, known limitations and operational warnings.

The release information shown to staff must be derived from the manifest/release notes for that exact candidate release, not hardcoded generic text. Missing or invalid metadata must fail closed: do not start downloading or activating an unidentifiable release.

Release notes are part of the deployment contract. Every PR intended for a user-visible release must state the user-facing changes or explicitly state that it contains no user-visible change. Deployment must publish the matching notes and payload as one coherent release.

## 5. Runtime asset inventory

The Vite build plugin in `vite.config.ts` currently creates the deployment-specific Service Worker and injects:

- `BUILD_ID`: GitHub commit SHA prefix in CI/deployment; local build identifier for local builds.
- `APP_BASE`: Vite deployment base, including GitHub Pages `/retailos-home/`.
- `ASSET_PATHS`: emitted Vite assets under `assets/` plus files recursively under `public/`, excluding source maps.

The inventory includes JavaScript chunks, CSS, imported images/fonts and `zxing-wasm/reader/zxing_reader.wasm?url`. WASM is a required runtime dependency, not an optional online download.

The maintained worker source is `src/sw/service-worker.template.js`. Never edit generated `dist/sw.js` directly.

The release inventory must cover every resource needed by every feature, including modules not opened during the current session. Lazy loading may defer module evaluation/initialization to reduce startup and memory cost, but it must not defer the first network download of a release resource until the user opens that module. **Lazy execution is allowed; lazy first-time downloading after release activation is not.**

External runtime dependencies must either be bundled/version-pinned and included in the inventory or explicitly declared as online-only capabilities. A release cannot claim fully offline runtime if a required dependency is omitted.

## 6. Staging, integrity and activation invariants

- Each release has isolated shell and asset storage. Never mix assets from different release IDs.
- Download into staging storage that cannot become the serving release until every required item is present and verified.
- Verify response status, expected size/hash where available, cache read-back, release ID and manifest completeness.
- Bound download concurrency/batch size for mobile memory/network constraints; report progress without blocking the old application.
- On quota, network, integrity or storage failure, clean only the failed candidate's staging data. Preserve the active release and its caches.
- Activation is atomic from the application's perspective: the selected shell and every referenced runtime asset must belong to the same release.
- After approval and successful verification, activation is automatic. There is no second user action for switching.
- Protect unsaved operational work and coordinate multiple open RetailOS windows/tabs. A blocked handoff must be visible and retryable; do not silently claim the update completed.
- Keep the previous known-good release until the new build passes health verification. Do not clean rollback assets early.

The exact technical mechanism (message-driven staging, release-specific caches, worker handoff or another browser-compatible design) must be selected only after source audit and platform testing. Preserve the product contract even if browser constraints require a different implementation from the current PR #119 design.

## 7. Current source audit — deployed main after PR #119

This is an audit of source behavior, not a claim of physical-device acceptance.

### Implemented foundation

- Vite inventories emitted/public runtime assets, including ZXing WASM.
- The current Service Worker install handler downloads the shell and complete asset inventory in batches, then verifies cache read-back.
- Failed installation deletes only the candidate release's partial shell/assets caches.
- Active release shell and assets are pinned to release-specific caches.
- Previous release caches are retained through boot probation.
- Matching-build boot failure can select the previous cached release; matching-build healthy boot allows old-cache cleanup.
- The update prompt is centralized in `PwaUpdatePrompt`.
- Data snapshots and business records are not part of the immutable release asset inventory.

### Gaps against the product contract

1. **Consent happens too late:** full asset download occurs in the Service Worker `install` event before the prompt is shown. The user currently approves activation, not download.
2. **Release notes are absent:** `PwaUpdatePrompt` displays generic text and does not show versioned capabilities, UI/UX changes, fixes, warnings or estimated size.
3. **Activation is user-triggered:** the current `Cập nhật` button sends `SKIP_WAITING`; activation and reload follow. The required behavior is one consent before download, then automatic activation after verified staging.
4. **Progress UX is absent:** there is no user-facing staged-download progress/retry contract.
5. **Automated tests validate the current install-time precache behavior:** they prove asset staging and rollback mechanics, but do not prove that no application payload is downloaded before user consent, nor that release notes are displayed and bound to the exact build.
6. **Physical-device acceptance is separate:** source tests do not prove Android/iOS browser behavior, storage quota behavior, offline operation or safe handoff on real devices.

Do not describe the current implementation as fully matching the user-approved download flow until these gaps are implemented and verified.

## 8. Data lifecycle boundary

Data refresh belongs to data services and snapshot lifecycle, not the Service Worker release manifest.

- Do not put API responses, user-specific records, lookup data, snapshots or calculated business records in immutable release asset caches.
- Do not increment `BUILD_ID` for snapshot refresh, lookup refresh or recalculation using existing application logic.
- Do not stage/activate an application release, reload the page or clear release caches for data-only updates.
- Preserve IndexedDB/local persistence, offline records, authentication/session semantics and explicit-save behavior across application releases.
- A new calculation engine, data-processing mechanism, feature, module or schema-aware capability is an application change and must ship through the release process.
- If an application release requires a data-schema migration, declare a versioned migration and compatibility/rollback plan. Do not disguise it as an ordinary data refresh.

## 9. Required automated regression coverage

Tests must assert behavior, not merely search for source strings.

- Discovery can obtain release metadata without downloading the candidate runtime payload.
- Before explicit user approval, candidate JS/CSS/WASM/media/module assets are not fetched or staged.
- Deferring the update leaves the current release and offline behavior unchanged.
- After approval, every manifest asset is downloaded and verified, including lazy module chunks and WASM.
- Download progress and retry/error states are correct; failed or interrupted staging cannot change the active release.
- A complete candidate becomes ready and auto-activates without a second confirmation.
- Activation does not mix release assets or discard the last-known-good release before healthy boot.
- New-build boot failure rolls back to the previous shell and its matching assets, including offline.
- Data-only refresh/recalculation does not change build ID, trigger release staging, reload, or delete data.
- Release notes shown to the user match the exact candidate build ID.
- Multi-tab behavior and unsaved-work handoff are deterministic and tested.

Existing regression scripts:
- `scripts/test-pwa-cache-policy.mjs`
- `scripts/test-pwa-worker-runtime.mjs`
- `scripts/test-pwa-platform-compatibility.mjs`

Extend or replace assertions that encode install-time asset downloading as the desired consent policy. Keep the valuable cache isolation, offline and rollback regression coverage.

## 10. Physical release acceptance

CI/VM tests do not establish physical-device acceptance.

| Platform | Required checks |
|---|---|
| Android Chrome tab + installed PWA | Defer update; confirm no runtime payload download; approve update; observe progress; complete staging; open every module offline; interrupt download; verify old release; test rollback |
| iOS Safari + Home Screen PWA | Same consent, progress, offline, activation and rollback checks; verify safe handoff and no unexpected reload |
| Desktop Chrome/Edge | Fresh install, defer/approve paths, multiple windows, complete offline payload, storage pressure and rollback |
| Low-end Android | Memory/storage pressure, bounded download concurrency, background/foreground during staging, no partial activation |

Record build IDs, device model, OS, browser version, install mode, network state, payload size, consent action, progress/failure behavior, offline result and rollback outcome. Do not infer physical acceptance from CI.

## 11. Mandatory change-control and deployment rules

For every future RetailOS code change, module addition, UI/UX change, runtime dependency, build configuration change or deployment:

1. Read this document before implementation and before release/deploy work.
2. Classify the change as Application Lifecycle, Data Lifecycle or both. State why.
3. If it adds or changes application capability/runtime resources, include it in the release manifest and user-facing release notes.
4. Keep the active release usable while the candidate is discovered, approved, downloaded and verified.
5. Never download the full candidate application payload before explicit user approval.
6. Never activate before complete integrity verification; after approval and verification, activation must be automatic without a second confirmation.
7. Preserve old-release offline operation, business data and last-known-good rollback.
8. Add regression coverage for the changed contract and run the full preflight on the final PR head.
9. Verify the deployment artifact contains the exact manifest, notes and complete asset inventory for the same build.
10. Record what was tested, what remains unverified and the rollback path. Never claim physical-device acceptance without device evidence.

This contract applies to all modules and future versions, not only scanner or PWA-specific tasks. Repository documentation is the durable source of truth; do not rely on chat history alone.
