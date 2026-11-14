import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const template = await readFile(new URL('../src/sw/service-worker.template.js', import.meta.url), 'utf8');
const source = template
  .replace('__BUILD_ID__', 'runtime-test')
  .replace('__APP_BASE__', '/retailos-home/')
  .replace('__ASSET_PATHS__', JSON.stringify(['assets/app.js', 'assets/app.css', 'images/background.webp']));

const listeners = new Map();
const cacheStore = new Map();
const cacheUrl = (request) => typeof request === 'string' ? request : request.url;
const cachesMock = {
  async open(name) {
    if (!cacheStore.has(name)) cacheStore.set(name, new Map());
    const entries = cacheStore.get(name);
    return {
      async addAll(urls) { for (const url of urls) entries.set(url, new Response('cached:' + url)); },
      async put(request, response) { entries.set(cacheUrl(request), response); },
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
const appBase = 'https://retailos.test/retailos-home/';
const shellUrl = appBase + 'index.html';
const assetUrl = appBase + 'assets/app.js';

await runExtendable('install');
assert.ok(cacheStore.has('retailos-pwa-shell-runtime-test'));
assert.ok(cacheStore.get('retailos-pwa-shell-runtime-test').has(shellUrl), 'install caches the app shell');

cacheStore.set('retailos-shell-v10', new Map([['old', new Response('old')]]));
cacheStore.set('retailos-pwa-assets-old', new Map([['old-asset', new Response('old')]]));
await runExtendable('activate');
assert.equal(cacheStore.has('retailos-shell-v10'), false, 'legacy shell cache is removed');
assert.equal(cacheStore.has('retailos-pwa-assets-old'), false, 'previous release asset cache is removed');
assert.equal(claimCalls, 1, 'new worker claims clients only after activation');

let blockedMessage = null;
const sendUpdateRequest = () => runExtendable('message', {
  data: { type: 'SKIP_WAITING' },
  source: { id: 'current', postMessage: (message) => { blockedMessage = message; } },
});

// Same-origin windows belonging to another GitHub Pages project must not
// block RetailOS updates.
windowClients = [
  { id: 'current', url: appBase },
  { id: 'other-app', url: 'https://retailos.test/another-project/' },
  { id: 'external-origin', url: 'https://example.test/retailos-home/' },
];
await sendUpdateRequest();
assert.equal(skipWaitingCalls, 1, 'unrelated same-origin and external clients do not block updates');
assert.equal(blockedMessage, null, 'unrelated clients do not emit a blocked notice');

// A second RetailOS tab remains a hard safety lock.
windowClients = [
  { id: 'current', url: appBase },
  { id: 'other-tab', url: appBase + 'stocktake' },
];
await sendUpdateRequest();
assert.equal(skipWaitingCalls, 1, 'worker must not take over while another RetailOS tab is open');
assert.equal(blockedMessage?.type, 'UPDATE_BLOCKED_MULTIPLE_CLIENTS');

// Update can proceed after the other RetailOS tab closes.
windowClients = [{ id: 'current', url: appBase }];
blockedMessage = null;
await sendUpdateRequest();
assert.equal(skipWaitingCalls, 2, 'explicit update is accepted when no other RetailOS tab remains');

const assetCache = await cachesMock.open('retailos-pwa-assets-runtime-test');
await assetCache.put(assetUrl, new Response('cached-asset'));
const cachedFetchEvent = {
  request: { method: 'GET', url: assetUrl, mode: 'cors' },
  respondWith(promise) { this.responsePromise = promise; },
};
const fetchCountBefore = fetchCalls;
listener('fetch')(cachedFetchEvent);
assert.equal(await (await cachedFetchEvent.responsePromise).text(), 'cached-asset');
assert.equal(fetchCalls, fetchCountBefore, 'allowlisted immutable asset is cache-first');

const unlistedEvent = {
  request: { method: 'GET', url: appBase + 'unlisted.js', mode: 'cors' },
  respondWith() { throw new Error('unlisted resource must not be intercepted'); },
};
listener('fetch')(unlistedEvent);

const navigationEvent = {
  request: { method: 'GET', url: appBase, mode: 'navigate' },
  respondWith(promise) { this.responsePromise = promise; },
};
context.fetch = async () => { throw new Error('offline'); };
listener('fetch')(navigationEvent);
assert.equal(await (await navigationEvent.responsePromise).text(), 'cached:' + shellUrl);

console.log('PWA service-worker runtime tests passed.');
