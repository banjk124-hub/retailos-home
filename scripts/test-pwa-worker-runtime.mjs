import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const template = await readFile(new URL('../src/sw/service-worker.template.js', import.meta.url), 'utf8');
const assetPaths = ['assets/app.js', 'assets/app.css', 'assets/zxing_reader.wasm', 'assets/uncached.js', 'images/background.webp', ...Array.from({ length: 10 }, (_, index) => `assets/chunk-${index + 1}.js`)];
const source = template
  .replace('__BUILD_ID__', 'runtime-test')
  .replace('__APP_BASE__', '/retailos-home/')
  .replace('__ASSET_PATHS__', JSON.stringify(assetPaths));

const listeners = new Map();
const cacheStore = new Map();
const cacheUrl = (request) => typeof request === 'string' ? request : request.url;
let rejectCacheWrites = false;
let rejectPrecache = false;
const assetBatchSizes = [];
const cachesMock = {
  async open(name) {
    if (!cacheStore.has(name)) cacheStore.set(name, new Map());
    const entries = cacheStore.get(name);
    return {
      async addAll(urls) {
        if (name.includes('assets-runtime-test')) assetBatchSizes.push(urls.length);
        if (rejectPrecache && name.includes('assets-failed-build')) throw new Error('simulated offline asset download');
        for (const url of urls) entries.set(url, new Response('cached:' + url));
      },
      async put(request, response) {
        if (rejectCacheWrites) throw new Error('simulated storage quota failure');
        entries.set(cacheUrl(request), response);
      },
      async match(request) { return entries.get(cacheUrl(request)); },
    };
  },
  async keys() { return [...cacheStore.keys()]; },
  async delete(name) { return cacheStore.delete(name); },
  async match(request) {
    const key = cacheUrl(request);
    for (const entries of cacheStore.values()) if (entries.has(key)) return entries.get(key);
    return undefined;
  },
};

let windowClients = [];
let skipWaitingCalls = 0;
let claimCalls = 0;
let fetchCalls = 0;
let navigatedTo = null;
const appBase = 'https://retailos.test/retailos-home/';
const shellUrl = appBase + 'index.html';
const oldShellCache = 'retailos-pwa-shell-old';
const oldAssetCache = 'retailos-pwa-assets-old';
const oldAssetUrl = appBase + 'assets/old-app.js';
cacheStore.set(oldShellCache, new Map([[shellUrl, new Response('previous-release-shell')]]));
const sharedPublicAssetUrl = appBase + 'images/background.webp';
cacheStore.set(oldAssetCache, new Map([
  [oldAssetUrl, new Response('previous-release-asset')],
  [sharedPublicAssetUrl, new Response('previous-release-shared-image')],
]));

const selfMock = {
  location: { origin: 'https://retailos.test' },
  registration: { showNotification: async () => undefined },
  addEventListener(type, listener) {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(listener);
  },
  skipWaiting: async () => { skipWaitingCalls += 1; },
  clients: {
    matchAll: async () => windowClients,
    claim: async () => { claimCalls += 1; },
    openWindow: async (url) => ({ url }),
  },
};
const context = vm.createContext({
  self: selfMock,
  caches: cachesMock,
  URL,
  Response,
  fetch: async (request) => {
    fetchCalls += 1;
    return new Response('network:' + (typeof request === 'string' ? request : request.url));
  },
});
vm.runInContext(source, context);
const listener = (type) => listeners.get(type)?.[0];
const runExtendable = async (type, values = {}) => {
  let pending;
  listener(type)({ ...values, waitUntil(promise) { pending = promise; } });
  await pending;
};

await runExtendable('install');
const shellCache = cacheStore.get('retailos-pwa-shell-runtime-test');
const assetCache = cacheStore.get('retailos-pwa-assets-runtime-test');
assert.ok(shellCache?.has(shellUrl), 'install precaches the app shell');
assert.ok(assetCache?.has(appBase + 'assets/zxing_reader.wasm'), 'install precaches the ZXing WASM runtime');
assert.ok(assetPaths.every((path) => assetCache.has(appBase + path)), 'all build assets are staged before install completes');
assert.deepEqual(assetBatchSizes, [8, 7], 'asset staging uses bounded batches to avoid oversized concurrent fetch bursts');

await runExtendable('activate');
assert.equal(cacheStore.has(oldShellCache), true, 'previous shell remains available during the new release probation');
assert.equal(cacheStore.has(oldAssetCache), true, 'previous hashed assets remain available for rollback');
assert.equal(claimCalls, 1, 'new worker claims clients only after activation');

let blockedMessage = null;
const sendUpdateRequest = () => runExtendable('message', {
  data: { type: 'SKIP_WAITING' },
  source: { id: 'current', postMessage: (message) => { blockedMessage = message; } },
});
windowClients = [
  { id: 'current', url: appBase },
  { id: 'other-app', url: 'https://retailos.test/another-project/' },
  { id: 'external-origin', url: 'https://example.test/retailos-home/' },
];
await sendUpdateRequest();
assert.equal(skipWaitingCalls, 1, 'unrelated clients do not block updates');
assert.equal(blockedMessage, null);

windowClients = [{ id: 'current', url: appBase }, { id: 'other-tab', url: appBase + 'stocktake' }];
await sendUpdateRequest();
assert.equal(skipWaitingCalls, 1, 'another RetailOS tab blocks takeover');
assert.equal(blockedMessage?.type, 'UPDATE_BLOCKED_MULTIPLE_CLIENTS');

windowClients = [{ id: 'current', url: appBase }];
blockedMessage = null;
await sendUpdateRequest();
assert.equal(skipWaitingCalls, 2, 'update is accepted after other RetailOS tabs close');

const activeNavigation = {
  request: { method: 'GET', url: appBase, mode: 'navigate' },
  respondWith(promise) { this.responsePromise = promise; },
};
const fetchCountBeforeNavigation = fetchCalls;
listener('fetch')(activeNavigation);
assert.equal(await (await activeNavigation.responsePromise).text(), 'cached:' + shellUrl,
  'active release navigation is served from its own pinned shell');
assert.equal(fetchCalls, fetchCountBeforeNavigation, 'active shell navigation does not fetch newly deployed HTML');

const currentPublicAsset = {
  request: { method: 'GET', url: sharedPublicAssetUrl, mode: 'cors' },
  respondWith(promise) { this.responsePromise = promise; },
};
listener('fetch')(currentPublicAsset);
assert.equal(await (await currentPublicAsset.responsePromise).text(), 'cached:' + sharedPublicAssetUrl,
  'active release asset wins over an older cached file with the same public URL');

let rollbackMessage = null;
await runExtendable('message', {
  data: { type: 'APP_BOOT_FAILED', buildId: 'runtime-test' },
  source: {
    id: 'current',
    url: appBase,
    postMessage: (message) => { rollbackMessage = message; },
    async navigate(url) { navigatedTo = url; },
  },
});
assert.equal(navigatedTo, appBase, 'failed new release navigates back through the rollback-aware worker');
assert.equal(rollbackMessage, null, 'rollback is available when the previous release cache exists');

await runExtendable('message', {
  data: { type: 'APP_BOOT_OK', buildId: 'old' },
  source: { id: 'current', url: appBase },
});
assert.equal(cacheStore.has(oldShellCache), true, 'rolled-back old build health does not delete its serving cache');
assert.equal(cacheStore.has(oldAssetCache), true, 'rolled-back old build health retains its own hashed assets');

const rollbackNavigation = {
  request: { method: 'GET', url: appBase, mode: 'navigate' },
  respondWith(promise) { this.responsePromise = promise; },
};
context.fetch = async () => { throw new Error('offline'); };
listener('fetch')(rollbackNavigation);
assert.equal(await (await rollbackNavigation.responsePromise).text(), 'previous-release-shell',
  'rollback serves the previous shell even while offline');

const rollbackAsset = {
  request: { method: 'GET', url: oldAssetUrl, mode: 'cors' },
  respondWith(promise) { this.responsePromise = promise; },
};
listener('fetch')(rollbackAsset);
assert.equal(await (await rollbackAsset.responsePromise).text(), 'previous-release-asset',
  'rollback shell can still load its own old hashed assets');

const rollbackPublicAsset = {
  request: { method: 'GET', url: sharedPublicAssetUrl, mode: 'cors' },
  respondWith(promise) { this.responsePromise = promise; },
};
listener('fetch')(rollbackPublicAsset);
assert.equal(await (await rollbackPublicAsset.responsePromise).text(), 'previous-release-shared-image',
  'rollback serves the previous release copy of a stable public asset');

const cachedAsset = {
  request: { method: 'GET', url: appBase + 'assets/app.js', mode: 'cors' },
  respondWith(promise) { this.responsePromise = promise; },
};
listener('fetch')(cachedAsset);
assert.match(await (await cachedAsset.responsePromise).text(), /^cached:/,
  'pre-cached current release asset is served without network');
const fetchCountBefore = fetchCalls;
assert.equal(fetchCalls, fetchCountBefore, 'pre-cached asset does not issue a network request');

const unlistedEvent = {
  request: { method: 'GET', url: appBase + 'api/data', mode: 'cors' },
  respondWith(promise) { this.responsePromise = promise; },
};
listener('fetch')(unlistedEvent);
assert.match(await (await unlistedEvent.responsePromise).text(), /^network:/,
  'non-asset same-origin requests continue to use the network');

// A later release that cannot download its full asset set must reject install
// and remove only its partial caches, leaving the active release untouched.
rejectPrecache = true;
const failedListeners = new Map();
const failedSelf = {
  ...selfMock,
  addEventListener(type, callback) {
    if (!failedListeners.has(type)) failedListeners.set(type, []);
    failedListeners.get(type).push(callback);
  },
};
const failedSource = template
  .replace('__BUILD_ID__', 'failed-build')
  .replace('__APP_BASE__', '/retailos-home/')
  .replace('__ASSET_PATHS__', JSON.stringify(assetPaths));
const failedContext = vm.createContext({ self: failedSelf, caches: cachesMock, URL, Response, fetch: context.fetch });
vm.runInContext(failedSource, failedContext);
let installRejected = false;
try {
  let pending;
  failedListeners.get('install')[0]({ waitUntil(promise) { pending = promise; } });
  await pending;
} catch { installRejected = true; }
assert.equal(installRejected, true, 'offline during precache rejects the new worker install');
assert.equal(cacheStore.has('retailos-pwa-shell-failed-build'), false, 'failed release shell cache is removed');
assert.equal(cacheStore.has('retailos-pwa-assets-failed-build'), false, 'failed release asset cache is removed');
assert.equal(cacheStore.has(oldShellCache), true, 'old release remains available after failed install');
assert.equal(cacheStore.has(oldAssetCache), true, 'old release assets remain available after failed install');

// A subsequent release can activate after rollback. It retains the rollback
// release until its own matching build reports healthy, then reclaims old caches.
rejectPrecache = false;
const nextListeners = new Map();
const nextSelf = {
  ...selfMock,
  addEventListener(type, callback) {
    if (!nextListeners.has(type)) nextListeners.set(type, []);
    nextListeners.get(type).push(callback);
  },
};
const nextSource = template
  .replace('__BUILD_ID__', 'next-build')
  .replace('__APP_BASE__', '/retailos-home/')
  .replace('__ASSET_PATHS__', JSON.stringify(assetPaths));
const nextContext = vm.createContext({ self: nextSelf, caches: cachesMock, URL, Response, fetch: context.fetch });
vm.runInContext(nextSource, nextContext);
const runNext = async (type, values = {}) => {
  let pending;
  nextListeners.get(type)[0]({ ...values, waitUntil(promise) { pending = promise; } });
  await pending;
};
await runNext('install');
await runNext('activate');
assert.equal(cacheStore.has(oldShellCache), true, 'previous release remains during next release probation');
await runNext('message', { data: { type: 'APP_BOOT_OK', buildId: 'next-build' } });
assert.equal(cacheStore.has(oldShellCache), false, 'matching new-build health reclaims old shell cache');
assert.equal(cacheStore.has(oldAssetCache), false, 'matching new-build health reclaims old asset cache');
assert.equal(cacheStore.has('retailos-pwa-shell-runtime-test'), false, 'superseded failed release cache is reclaimed');
assert.equal(cacheStore.has('retailos-pwa-state'), false, 'successful new release clears active-release metadata');

console.log('PWA service-worker staged install, offline runtime and rollback tests passed.');
