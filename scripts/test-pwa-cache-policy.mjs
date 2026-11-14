import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const worker = await readFile(new URL('../src/sw/service-worker.template.js', import.meta.url), 'utf8');
const vite = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8');
const registration = await readFile(new URL('../src/shared/pwa/serviceWorkerRegistration.ts', import.meta.url), 'utf8');
const push = await readFile(new URL('../src/features/notifications/pushNotifications.ts', import.meta.url), 'utf8');
const prompt = await readFile(new URL('../src/shared/pwa/PwaUpdatePrompt.tsx', import.meta.url), 'utf8');
assert.match(worker, /retailos-pwa-/);
assert.match(worker, /ASSET_URLS\.has\(url\.pathname\)/);
assert.match(worker, /caches\.delete\(key\)/);
assert.match(worker, /request\.mode === 'navigate'/);
assert.match(worker, /SKIP_WAITING/);
assert.match(worker, /UPDATE_BLOCKED_MULTIPLE_CLIENTS/);
assert.match(vite, /service-worker\.template/);
assert.match(registration, /updateViaCache:\s*'none'/);
assert.match(push, /registerRetailOsServiceWorker/);
assert.match(prompt, /registerRetailOsServiceWorker/);
assert.match(prompt, /controllerchange/);
assert.match(prompt, /Hãy hoàn tất thao tác đang thực hiện/);
assert.match(prompt, /registration\?\.removeEventListener\('updatefound'/,
  'registration update listeners must be removed on unmount');
assert.match(prompt, /installingWorker\?\.removeEventListener\('statechange'/,
  'installing worker state listeners must be removed on unmount');
console.log('PWA cache policy and update lifecycle tests passed.');
