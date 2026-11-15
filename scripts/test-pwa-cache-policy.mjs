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

console.log('PWA consent boundary, release manifest integrity, full-runtime inventory and data-lifecycle isolation tests passed.');
