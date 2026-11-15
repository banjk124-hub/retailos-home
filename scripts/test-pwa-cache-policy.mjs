import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [
  worker,
  vite,
  registration,
  push,
  prompt,
  errorBoundary,
  wasmAdapter,
  updateSafety,
  app,
  homeScreen,
  dataService,
  stocktakeModule,
  stocktakeImportModule,
  cameraSession,
  builtWorker,
  builtManifestText,
  releaseNotesText,
  packageText,
  packageLockText,
] = await Promise.all([
  read('../src/sw/service-worker.template.js'),
  read('../vite.config.ts'),
  read('../src/shared/pwa/serviceWorkerRegistration.ts'),
  read('../src/features/notifications/pushNotifications.ts'),
  read('../src/shared/pwa/PwaUpdatePrompt.tsx'),
  read('../src/shared/components/AppErrorBoundary.tsx'),
  read('../src/platform/scanner/decoders/zxingWasmDecoder.ts'),
  read('../src/shared/pwa/updateSafety.ts'),
  read('../src/App.tsx'),
  read('../src/features/home/HomeScreen.tsx'),
  read('../src/features/data/moduleDataService.ts'),
  read('../src/features/stocktake/components/StocktakeModule.tsx'),
  read('../src/features/stocktake-import/components/StocktakeImportModule.tsx'),
  read('../src/shared/services/cameraSession.ts'),
  read('../dist/sw.js'),
  read('../dist/release-manifest.json'),
  read('../release-notes.json'),
  read('../package.json'),
  read('../package-lock.json'),
]);
const builtManifest = JSON.parse(builtManifestText);
const releaseNotes = JSON.parse(releaseNotesText);
const packageJson = JSON.parse(packageText);
const packageLock = JSON.parse(packageLockText);

assert.match(worker, /retailos-pwa-/);
assert.match(worker, /ASSET_URLS\.has\(url\.href\)/);
assert.match(worker, /navigator\.storage\?\.estimate/);
const installHandler = worker.slice(worker.indexOf("self.addEventListener('install'"), worker.indexOf("self.addEventListener('message'"));
assert.match(installHandler, /self\.registration\.active/);
assert.match(installHandler, /if \(!self\.registration\.active && !previousRelease\) await stageCandidate\(null\)/,
  'only a first install may stage automatically; an update install must wait for consent');
assert.doesNotMatch(installHandler, /addAll|addAllInBatches/,
  'the browser-triggered update install must not download the candidate runtime payload');
assert.match(worker, /GET_RELEASE_INFO/);
assert.match(worker, /STAGE_RELEASE/);
assert.match(worker, /ACTIVATE_RELEASE/);
assert.match(worker, /SKIP_WAITING/,
  'legacy clients must retain a one-time consent-compatible migration path');
assert.match(worker, /RELEASE_DOWNLOAD_PROGRESS/);
assert.match(worker, /RELEASE_STAGED/);
assert.match(worker, /RELEASE_STAGE_FAILED/);
assert.match(worker, /crypto\.subtle\.digest\('SHA-256'/);
assert.match(worker, /async function verifyStagedResources/);
assert.match(worker, /await verifyStagedResources\(manifest\.resources\)/,
  'staging must verify cache read-back and revalidate an existing staged candidate before reusing it');
assert.match(worker, /await verifyStagedResources\(staged\.resources\)/,
  'activation must revalidate cached candidate bytes without requiring a network fetch');
assert.match(worker, /UPDATE_BLOCKED_MULTIPLE_CLIENTS/);
assert.match(worker, /APP_BOOT_OK/);
assert.match(worker, /APP_BOOT_FAILED/);
assert.match(worker, /findPreviousRelease/);
assert.match(worker, /activeAssets\.match\(request\)/);
assert.doesNotMatch(worker, /caches\.match\(request\)/,
  'runtime assets from different releases must never be mixed');

assert.match(vite, /createHash\('sha256'\)/);
assert.match(vite, /release-manifest\.json/);
assert.match(vite, /release-notes\.json/);
assert.match(vite, /describeResource/);
assert.match(vite, /assetResources/);
assert.match(vite, /enforce:\s*'post'/, 'release manifest generation must run after Vite emits the finalized HTML shell');
assert.match(vite, /generateBundle:\s*\{\s*order:\s*'post'/s,
  'release manifest hashes must be calculated after every Rollup generateBundle hook has finalized output bytes');
assert.match(wasmAdapter, /zxing-wasm\/reader\/zxing_reader\.wasm\?url/);
assert.equal(builtManifest.schemaVersion, 1);
assert.ok(builtManifest.buildId);
assert.ok(builtManifest.version);
assert.ok(builtManifest.resources.some((item) => /zxing_reader-[^/]+\.wasm$/.test(item.path)),
  'the actual Pages release manifest must include the emitted ZXing WASM binary');
assert.ok(builtManifest.resources.every((item) => (
  Number.isInteger(item.size) && item.size >= 0 && /^[a-f0-9]{64}$/.test(item.sha256)
)), 'every built resource must carry byte size and SHA-256 integrity metadata');
assert.ok(builtManifest.resources.some((item) => item.path === 'index.html' && item.cache === 'shell'));
assert.ok(builtManifest.resources.some((item) => item.path === 'manifest.webmanifest' && item.cache === 'shell'));
assert.ok(builtManifest.resources.some((item) => item.path === 'icon.svg' && item.cache === 'shell'));
assert.equal(builtManifest.version, releaseNotes.version, 'release metadata must bind to the reviewed release notes');
assert.equal(packageJson.version, releaseNotes.version, 'package version and release notes version must stay synchronized');
assert.equal(packageLock.packages[''].version, packageJson.version, 'package lock version must match package.json');
assert.match(builtWorker, /const BUILD_ID = '[^']+'/);
const workerBuildId = builtWorker.match(/const BUILD_ID = '([^']+)'/)?.[1];
const workerBase = builtWorker.match(/const APP_BASE = '([^']+)'/)?.[1];
const workerAssetPaths = builtWorker.match(/const ASSET_PATHS = (\[[\s\S]*?\]);/)?.[1];
assert.equal(workerBuildId, builtManifest.buildId, 'Service Worker and release manifest must share one build ID');
assert.equal(workerBase, builtManifest.base, 'Service Worker and release manifest must share one Vite base');
assert.ok(workerAssetPaths, 'generated worker must contain its exact asset routing inventory');
assert.deepEqual(
  JSON.parse(workerAssetPaths),
  builtManifest.resources.filter((item) => item.cache === 'assets').map((item) => item.path),
  'worker routing inventory and staged release manifest must cover the same asset paths',
);
for (const resource of builtManifest.resources) {
  const bytes = await readFile(new URL('../dist/' + resource.path, import.meta.url));
  assert.equal(bytes.byteLength, resource.size, 'built resource size must match manifest: ' + resource.path);
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    resource.sha256,
    'built resource SHA-256 must match manifest: ' + resource.path,
  );
}

assert.match(prompt, /GET_RELEASE_INFO/);
const sameBuildBranch = prompt.indexOf("if (nextManifest.buildId === __RETAILOS_BUILD_ID__)");
const manifestValidationBranch = prompt.indexOf("nextManifest.schemaVersion !== 1");
assert.ok(sameBuildBranch > manifestValidationBranch,
  'same-build handling must run only after manifest structure validation');
const sameBuildHandling = prompt.slice(sameBuildBranch, prompt.indexOf("const persistedUpdate = readUpdateCenterEntry();", sameBuildBranch));
assert.match(sameBuildHandling, /setWaitingWorker\(null\)/,
  'a same-build waiting worker must be dismissed without showing a manifest error');
assert.match(sameBuildHandling, /waitingWorkerRef\.current = null/);
assert.match(sameBuildHandling, /setManifest\(null\)/);
assert.doesNotMatch(sameBuildHandling, /setPhase\('error'\)|Manifest phiên bản không hợp lệ/,
  'a matching build ID is a no-update state, never an invalid-manifest failure');
assert.match(prompt, /STAGE_RELEASE/);
assert.match(prompt, /ACTIVATE_RELEASE/);
assert.match(prompt, /Tải và cập nhật/);
assert.match(prompt, /Lưu ý vận hành/);
assert.match(prompt, /RELEASE_DOWNLOAD_PROGRESS/);
assert.match(prompt, /Đã tải và xác minh toàn bộ tài nguyên/);
assert.match(prompt, /response\.staged === true/);
const rejectedStageHandler = prompt.slice(prompt.indexOf("event.data?.type === 'UPDATE_NOT_STAGED'"));
assert.match(rejectedStageHandler, /stagedRef\.current = false/,
  'an integrity rejection must clear the UI staged flag before a consented retry');
assert.match(rejectedStageHandler, /isApplyingUpdate\.current = false/,
  'an integrity rejection must clear the activation-in-progress flag');
assert.match(prompt, /getPwaUpdateBlockReason/);
assert.doesNotMatch(prompt, /Bản mới đã được tải và xác minh/);
assert.match(updateSafety, /registerPwaUpdateBlocker/);
assert.match(updateSafety, /dirtyFormFields/);
assert.match(updateSafety, /markPwaUpdateFormSaved/);
const savedFormHandler = updateSafety.slice(updateSafety.indexOf('export function markPwaUpdateFormSaved'));
assert.match(savedFormHandler, /fieldBaselines\.set\(control, currentFieldValue\(control\)\)/,
  'a successful save must advance dirty-field baselines to the saved values');
assert.match(updateSafety, /if \(event\.defaultPrevented\)/,
  'a cancelled native form reset must not clear unsaved-field blockers');
assert.match(updateSafety, /data-retailos-update-safe/);
assert.match(dataService, /registerPwaUpdateBlocker\('module-data-lifecycle'/);
assert.match(dataService, /beginModuleDataOperation/);
assert.match(dataService, /endModuleDataOperation/);
assert.match(updateSafety, /srcObject/);
assert.match(app, /registerPwaUpdateBlocker\('app-transition'/);
assert.match(stocktakeModule, /registerPwaUpdateBlocker\('stocktake'/);
assert.match(stocktakeImportModule, /registerPwaUpdateBlocker\('stocktake-import'/);
assert.match(cameraSession, /registerPwaUpdateBlocker\('camera-session'/);
assert.match(cameraSession, /notifyPwaUpdateSafetyChanged/);
assert.match(errorBoundary, /APP_BOOT_FAILED/);
assert.match(errorBoundary, /retailosBootHealthy/);
assert.match(app, /type: 'APP_BOOT_OK'/);
assert.match(app, /onBootReady=\{reportBootHealthy\}/);
assert.match(homeScreen, /onBootReady\(\)/,
  'the Home surface must acknowledge boot only after it has committed');
assert.doesNotMatch(prompt, /APP_BOOT_OK|reportHealthyBoot/,
  'the update prompt must not acknowledge healthy boot before the primary app surface is ready');

assert.match(registration, /updateViaCache:\s*'none'/);
assert.match(registration, /import\.meta\.env\.BASE_URL\s*\+\s*'sw\.js'/);
assert.match(push, /registerRetailOsServiceWorker/);
assert.match(push, /registerPwaUpdateBlocker\('push-subscription'/);
assert.match(push, /notifyPwaUpdateSafetyChanged/);
assert.doesNotMatch(dataService, /registerRetailOsServiceWorker|SKIP_WAITING|APP_BOOT_OK|APP_BOOT_FAILED/,
  'data refresh services must not control application release activation or boot lifecycle');


// Update Center lifecycle: download consent is distinct from activation consent.
const updateStore = await read('../src/shared/pwa/updateCenterStore.ts');
const settingsHub = await read('../src/features/home/components/SettingsHub.tsx');
const dockItem = await read('../src/shared/navigation/LiquidDockItem.tsx');
assert.match(updateStore, /localStorage\.setItem\(STORAGE_KEY/,
  'update deferral metadata must persist beyond the current React page session');
assert.match(updateStore, /inCenter/);
assert.match(updateStore, /return entry\?\.inCenter \? 1 : 0/,
  'the Settings badge must only represent an update explicitly deferred into Update Center');
assert.match(updateStore, /retailos\.pwa\.update-center\.v1/);
assert.match(prompt, /status: 'deferred'/,
  'deferral must be persisted for the exact candidate BUILD_ID');
assert.match(prompt, /onClick=\{tryActivate\}/,
  'activation must be reachable only through an explicit user action');
assert.match(prompt, /onClick=\{tryActivate\}/,
  'activation must remain behind an explicit user click');
assert.match(prompt, /action === 'download' \|\| action === 'activate'/,
  'Update Center activation commands must be explicit UI actions, not lifecycle side effects');
assert.doesNotMatch(prompt, /RetailOS sẽ tự thử lại/,
  'activation failures must not promise or trigger automatic retries');
assert.match(prompt, /retailos:update-center-action/,
  'Update Center actions must be routed to the existing Service Worker lifecycle');
assert.match(settingsHub, /function UpdateCenterView/,
  'Settings must provide a dedicated Update Center view, not merely reopen the prompt');
assert.match(settingsHub, /current\.currentVersion/);
assert.match(settingsHub, /current\.lastError/);
assert.match(settingsHub, /requestUpdateAction\('activate'\)/);
assert.match(settingsHub, /requestUpdateAction\('download'\)/);
assert.match(homeScreen, /pendingUpdate\?\.buildId === __RETAILOS_BUILD_ID__/,
  'the pending entry must be cleared only after the primary Home surface reports healthy boot');
assert.match(prompt, /persistCandidate\('deferred', true\)/,
  'only explicit defer/collapse actions pin the candidate into Update Center');
assert.match(prompt, /isBusinessBusy/);
assert.match(prompt, /is-modal/);
assert.match(prompt, /is-busy/);
assert.match(settingsHub, /Trung tâm cập nhật/);
assert.match(settingsHub, /UPDATE_CENTER_CHANGED_EVENT/);
assert.match(dockItem, /liquid-dock__notice-badge/,
  'pending actionable update notices must render a numeric badge on Settings');

console.log('PWA consent boundary, release manifest integrity, full-runtime inventory and data-lifecycle isolation tests passed.');
