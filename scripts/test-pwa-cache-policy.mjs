import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const worker = await readFile(new URL('../src/sw/service-worker.template.js', import.meta.url), 'utf8');
const vite = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8');
const registration = await readFile(new URL('../src/shared/pwa/serviceWorkerRegistration.ts', import.meta.url), 'utf8');
const push = await readFile(new URL('../src/features/notifications/pushNotifications.ts', import.meta.url), 'utf8');
const prompt = await readFile(new URL('../src/shared/pwa/PwaUpdatePrompt.tsx', import.meta.url), 'utf8');
const errorBoundary = await readFile(new URL('../src/shared/components/AppErrorBoundary.tsx', import.meta.url), 'utf8');
const wasmAdapter = await readFile(new URL('../src/platform/scanner/decoders/zxingWasmDecoder.ts', import.meta.url), 'utf8');
const builtWorker = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8');

assert.match(worker, /retailos-pwa-/);
assert.match(worker, /ASSET_URLS\.has\(url\.href\)/);
const installHandler = worker.slice(worker.indexOf("self.addEventListener('install'"), worker.indexOf("self.addEventListener('message'"));
assert.match(installHandler, /shellCache\.addAll\(SHELL_URLS\)/);
assert.match(installHandler, /addAllInBatches\(assetCache, \[\.\.\.ASSET_URLS\]\)/,
  'a new release must precache every emitted asset before installation completes');
assert.match(worker, /async function addAllInBatches/);
assert.match(installHandler, /missingAssets\.some/);
assert.match(installHandler, /caches\.delete\(ASSET_CACHE\)/,
  'an incomplete release must discard only its own partial cache');
assert.match(vite, /BUILD_ID/);
assert.match(vite, /__RETAILOS_BUILD_ID__/);
assert.match(vite, /Object\.keys\(bundle\).*assets/);
assert.match(vite, /publicAssets\.push/);
assert.match(wasmAdapter, /zxing-wasm\/reader\/zxing_reader\.wasm\?url/);
const builtAssetManifest = builtWorker.match(/const ASSET_PATHS = (\\[[\\s\\S]*?\\]);/)?.[1];
assert.ok(builtAssetManifest, 'production worker must contain the generated build asset manifest');
assert.ok(JSON.parse(builtAssetManifest).some((asset) => /zxing_reader-[^/]+\\.wasm$/.test(asset)),
  'the actual GitHub Pages worker manifest must contain the emitted ZXing WASM binary');
assert.match(vite, /transformIndexHtml/);
assert.match(vite, /APP_BOOT_FAILED/);
assert.match(worker, /APP_BOOT_OK/);
assert.match(worker, /APP_BOOT_FAILED/);
assert.match(worker, /findPreviousRelease/);
assert.match(worker, /readActiveRelease/);
assert.match(worker, /writeActiveRelease/);
assert.match(worker, /readPreviousRelease/);
assert.match(worker, /writePreviousRelease/);
assert.match(worker, /activeAssets\.match\(request\)/,
  'only the selected release asset cache may serve app runtime files');
assert.doesNotMatch(worker, /caches\.match\(request\)/,
  'runtime assets from different releases must never be mixed');
assert.match(worker, /self\.clients\.claim\(\)/);
assert.match(worker, /SKIP_WAITING/);
assert.match(worker, /UPDATE_BLOCKED_MULTIPLE_CLIENTS/);
assert.match(worker, /APP_BOOT_OK/);
assert.match(registration, /updateViaCache:\s*'none'/);
assert.match(push, /registerRetailOsServiceWorker/);
assert.match(prompt, /registerRetailOsServiceWorker/);
assert.match(prompt, /APP_BOOT_OK/);
assert.match(prompt, /controllerchange/);
assert.match(prompt, /Bản mới đã được tải và xác minh/);
assert.match(prompt, /registration\?\.removeEventListener\('updatefound'/);
assert.match(prompt, /installingWorker\?\.removeEventListener\('statechange'/);
assert.match(errorBoundary, /APP_BOOT_FAILED/);
assert.match(errorBoundary, /retailosBootHealthy/);
console.log('PWA staged-release, offline precache and rollback policy tests passed.');
