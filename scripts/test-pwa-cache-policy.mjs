import assert from 'node:assert/strict';
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
  dataService,
  builtWorker,
  builtManifestText,
  releaseNotesText,
  packageText,
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
  read('../src/features/data/moduleDataService.ts'),
  read('../dist/sw.js'),
  read('../dist/release-manifest.json'),
  read('../release-notes.json'),
  read('../package.json'),
]);
const builtManifest = JSON.parse(builtManifestText);
const releaseNotes = JSON.parse(releaseNotesText);
const packageJson = JSON.parse(packageText);

assert.match(worker, /retailos-pwa-/);
assert.match(worker, /ASSET_URLS.has(url.href)/);
const installHandler = worker.slice(worker.indexOf("self.addEventListener('install'"), worker.indexOf("self.addEventListener('message'"));
assert.match(installHandler, /readActiveRelease/);
assert.match(installHandler, /findPreviousRelease/);
assert.match(installHandler, /if (!previous) await stageCandidate(null)/,
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
assert.match(worker, /crypto.subtle.digest('SHA-256'/);
assert.match(worker, /UPDATE_BLOCKED_MULTIPLE_CLIENTS/);
assert.match(worker, /APP_BOOT_OK/);
assert.match(worker, /APP_BOOT_FAILED/);
assert.match(worker, /findPreviousRelease/);
assert.match(worker, /activeAssets.match(request)/);
assert.doesNotMatch(worker, /caches.match(request)/,
  'runtime assets from different releases must never be mixed');

assert.match(vite, /createHash('sha256')/);
assert.match(vite, /release-manifest.json/);
assert.match(vite, /release-notes.json/);
assert.match(vite, /describeResource/);
assert.match(vite, /publicAssets|assetResources/);
assert.match(wasmAdapter, /zxing-wasm/reader/zxing_reader.wasm?url/);
assert.equal(builtManifest.schemaVersion, 1);
assert.ok(builtManifest.buildId);
assert.ok(builtManifest.version);
assert.ok(builtManifest.resources.some((item) => /zxing_reader-[^/]+.wasm$/.test(item.path)),
  'the actual Pages release manifest must include the emitted ZXing WASM binary');
assert.ok(builtManifest.resources.every((item) => (
  Number.isInteger(item.size) && item.size >= 0 && /^[a-f0-9]{64}$/.test(item.sha256)
)), 'every built resource must carry byte size and SHA-256 integrity metadata');
assert.ok(builtManifest.resources.some((item) => item.path === 'index.html' && item.cache === 'shell'));
assert.ok(builtManifest.resources.some((item) => item.path === 'manifest.webmanifest' && item.cache === 'shell'));
assert.ok(builtManifest.resources.some((item) => item.path === 'icon.svg' && item.cache === 'shell'));
assert.equal(builtManifest.version, releaseNotes.version, 'release metadata must bind to the reviewed release notes');
assert.equal(packageJson.version, releaseNotes.version, 'package version and release notes version must stay synchronized');
assert.match(builtWorker, /const BUILD_ID = '[^']+'/);

assert.match(prompt, /GET_RELEASE_INFO/);
assert.match(prompt, /STAGE_RELEASE/);
assert.match(prompt, /ACTIVATE_RELEASE/);
assert.match(prompt, /Tải và cập nhật/);
assert.match(prompt, /Lưu ý vận hành/);
assert.match(prompt, /RELEASE_DOWNLOAD_PROGRESS/);
assert.match(prompt, /Đã tải và xác minh toàn bộ tài nguyên/);
assert.match(prompt, /getPwaUpdateBlockReason/);
assert.doesNotMatch(prompt, /Bản mới đã được tải và xác minh/);
assert.match(updateSafety, /registerPwaUpdateBlocker/);
assert.match(updateSafety, /srcObject/);
assert.match(app, /registerPwaUpdateBlocker('app-transition'/);
assert.match(errorBoundary, /APP_BOOT_FAILED/);
assert.match(errorBoundary, /retailosBootHealthy/);

assert.match(registration, /updateViaCache:s*'none'/);
assert.match(registration, /import.meta.env.BASE_URLs*+s*'sw.js'/);
assert.match(push, /registerRetailOsServiceWorker/);
assert.doesNotMatch(dataService, /registerRetailOsServiceWorker|SKIP_WAITING|APP_BOOT_OK|APP_BOOT_FAILED/,
  'data refresh services must not control application release activation or boot lifecycle');

console.log('PWA consent boundary, release manifest integrity, full-runtime inventory and data-lifecycle isolation tests passed.');
