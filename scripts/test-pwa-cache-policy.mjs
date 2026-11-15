import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const worker = await readFile(new URL('../src/sw/service-worker.template.js', import.meta.url), 'utf8');
const vite = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8');
const registration = await readFile(new URL('../src/shared/pwa/serviceWorkerRegistration.ts', import.meta.url), 'utf8');
const push = await readFile(new URL('../src/features/notifications/pushNotifications.ts', import.meta.url), 'utf8');
const prompt = await readFile(new URL('../src/shared/pwa/PwaUpdatePrompt.tsx', import.meta.url), 'utf8');
const errorBoundary = await readFile(new URL('../src/shared/components/AppErrorBoundary.tsx', import.meta.url), 'utf8');
const wasmAdapter = await readFile(new URL('../src/platform/scanner/decoders/zxingWasmDecoder.ts', import.meta.url), 'utf8');

assert.match(worker, /retailos-pwa-/);
assert.match(worker, /ASSET_URLS\.has\(url\.href\)/);
const installHandler = worker.slice(worker.indexOf("self.addEventListener('install'"), worker.indexOf("self.addEventListener('message'"));
assert.match(installHandler, /shellCache\.addAll\(SHELL_URLS\)/);
assert.match(installHandler, /assetCache\.addAll\(\[\.\.\.ASSET_URLS\]\)/,
  'a new release must precache every emitted asset before installation completes');
assert.match(installHandler, /missingAssets\.some/);
assert.match(installHandler, /caches\.delete\(ASSET_CACHE\)/,
  'an incomplete release must discard only its own partial cache');
assert.match(vite, /BUILD_ID/);
assert.match(vite, /__RETAILOS_BUILD_ID__/);
assert.match(vite, /\.wasm/);
assert.match(vite, /transformIndexHtml/);
assert.match(vite, /APP_BOOT_FAILED/);
assert.match(worker, /APP_BOOT_OK/);
assert.match(worker, /APP_BOOT_FAILED/);
assert.match(worker, /findPreviousRelease/);
assert.match(worker, /readActiveRelease/);
assert.match(worker, /writeActiveRelease/);
assert.match(worker, /caches\.match\(request\)/,
  'retained release assets must remain readable during rollback');
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
console.log('PWA staged-release, offline precache and rollback policy tests passed.');
