import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';

const template = await readFile(new URL('../src/sw/service-worker.template.js', import.meta.url), 'utf8');
const appBase = 'https://retailos.test/retailos-home/';
const shellUrl = appBase + 'index.html';
const oldShellCache = 'retailos-pwa-shell-old';
const oldAssetCache = 'retailos-pwa-assets-old';
const activeStateUrl = appBase + '__retailos_active_release__';
const previousStateUrl = appBase + '__retailos_previous_release__';
const stagedStateUrl = appBase + '__retailos_staged_release__/runtime-test';

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await webcrypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, '0')).join('');
}

const paths = [
  ['index.html', 'shell'],
  ['manifest.webmanifest', 'shell'],
  ['icon.svg', 'shell'],
  ...['assets/app.js', 'assets/app.css', 'assets/zxing_reader.wasm', 'images/background.webp', ...Array.from({ length: 15 }, (_, index) => 'assets/chunk-' + (index + 1) + '.js')]
    .map((path) => [path, 'assets']),
];
const resources = await Promise.all(paths.map(async ([path, cache]) => {
  const body = 'release-runtime:' + path;
  return { path, cache, size: new TextEncoder().encode(body).byteLength, sha256: await sha256Hex(body) };
}));
const manifest = {
  schemaVersion: 1,
  buildId: 'runtime-test',
  base: '/retailos-home/',
  version: 'test-version',
  title: 'Test release',
  summary: 'Runtime test release',
  sections: [],
  compatibility: [],
  warnings: [],
  resources,
};

const cacheStore = new Map();
const cacheUrl = (request) => typeof request === 'string' ? request : request.url;
const cachesMock = {
  async open(name) {
    if (!cacheStore.has(name)) cacheStore.set(name, new Map());
    const entries = cacheStore.get(name);
    return {
      async put(request, response) { entries.set(cacheUrl(request), response.clone()); },
      async match(request) { return entries.get(cacheUrl(request))?.clone(); },
      async delete(request) { return entries.delete(cacheUrl(request)); },
    };
  },
  async keys() { return [...cacheStore.keys()]; },
  async delete(name) { return cacheStore.delete(name); },
};

function seedOldRelease() {
  cacheStore.set(oldShellCache, new Map([
    [shellUrl, new Response('previous-release-shell')],
    [appBase, new Response('previous-release-shell')],
  ]));
  cacheStore.set(oldAssetCache, new Map([
    [appBase + 'assets/old-app.js', new Response('previous-release-asset')],
    [appBase + 'images/background.webp', new Response('previous-release-shared-image')],
  ]));
  cacheStore.set('retailos-business-data', new Map([['snapshot', new Response('business-data-must-survive')]]));
  cacheStore.set('retailos-pwa-state', new Map([
    [activeStateUrl, new Response(JSON.stringify({
      buildId: 'old',
      shellCache: oldShellCache,
      assetCache: oldAssetCache,
    }))],
  ]));
}

function createWorker(buildId, releaseManifest, options = {}) {
  const listeners = new Map();
  let skipWaitingCalls = 0;
  let claimCalls = 0;
  let fetchCalls = 0;
  let failPath = options.failPath || null;
  let offline = false;
  const windowClients = options.clients || [];
  const selfMock = {
    location: { origin: 'https://retailos.test' },
    registration: { showNotification: async () => undefined, active: options.hasActiveWorker === false ? null : { scriptURL: appBase + 'sw.js' } },
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
  const fetchMock = async (request) => {
    fetchCalls += 1;
    const url = typeof request === 'string' ? request : request.url;
    if (offline || (failPath && url.endsWith(failPath))) throw new Error('simulated network failure');
    if (url.includes('/release-manifest.json?build=')) {
      return new Response(JSON.stringify(releaseManifest), { headers: { 'Content-Type': 'application/json' } });
    }
    const resource = releaseManifest.resources.find((item) => appBase + item.path === url);
    if (!resource) return new Response('not-found', { status: 404 });
    return new Response('release-runtime:' + resource.path);
  };
  const source = template
    .replace('__BUILD_ID__', buildId)
    .replace('__APP_BASE__', '/retailos-home/')
    .replace('__ASSET_PATHS__', JSON.stringify(releaseManifest.resources.filter((item) => item.cache === 'assets').map((item) => item.path)));
  const context = vm.createContext({
    self: selfMock,
    caches: cachesMock,
    URL,
    Response,
    fetch: fetchMock,
    crypto: webcrypto,
  });
  vm.runInContext(source, context);
  const listener = (type) => listeners.get(type)?.[0];
  const runExtendable = async (type, values = {}) => {
    let pending;
    listener(type)({ ...values, waitUntil(promise) { pending = promise; } });
    if (pending) await pending;
  };
  return {
    listeners,
    listener,
    runExtendable,
    setOffline(value) { offline = value; },
    get fetchCalls() { return fetchCalls; },
    get skipWaitingCalls() { return skipWaitingCalls; },
    get claimCalls() { return claimCalls; },
  };
}

seedOldRelease();
const currentClient = {
  id: 'current',
  url: appBase,
  messages: [],
  postMessage(message) { this.messages.push(message); },
  async navigate(url) { this.navigatedTo = url; },
};
const otherClient = { id: 'other', url: appBase + 'stocktake', postMessage() {} };
const activeClients = [currentClient, otherClient];
const worker = createWorker('runtime-test', manifest, { clients: activeClients });

await worker.runExtendable('install');
assert.equal(worker.fetchCalls, 0, 'an update install must not download release metadata or runtime payload before consent');
assert.equal(cacheStore.has('retailos-pwa-shell-runtime-test'), false, 'candidate shell is not staged during update install');
assert.equal(cacheStore.has(oldShellCache), true, 'the active release remains available during candidate discovery');

const infoMessages = [];
await worker.runExtendable('message', {
  data: { type: 'GET_RELEASE_INFO' },
  ports: [{ postMessage(message) { infoMessages.push(message); } }],
  source: currentClient,
});
assert.equal(infoMessages[0]?.type, 'RELEASE_INFO', 'candidate exposes release metadata to the active app');
assert.equal(worker.fetchCalls, 1, 'discovery downloads only the small release manifest');
assert.equal(cacheStore.has('retailos-pwa-assets-runtime-test'), false, 'metadata discovery does not stage application assets');

const progressMessages = [];
await worker.runExtendable('message', {
  data: { type: 'STAGE_RELEASE' },
  ports: [{ postMessage(message) { progressMessages.push(message); } }],
  source: currentClient,
});
const candidateShell = cacheStore.get('retailos-pwa-shell-runtime-test');
const candidateAssets = cacheStore.get('retailos-pwa-assets-runtime-test');
assert.ok(candidateShell?.has(shellUrl), 'approved staging downloads the candidate shell');
assert.ok(candidateShell?.has(appBase), 'staging creates the root navigation alias');
assert.ok(candidateAssets?.has(appBase + 'assets/zxing_reader.wasm'), 'approved staging downloads the ZXing WASM runtime');
assert.ok(resources.filter((item) => item.cache === 'assets').every((item) => candidateAssets.has(appBase + item.path)),
  'all lazy chunks and runtime assets are staged before activation');
assert.equal(cacheStore.has(oldShellCache), true, 'old shell is retained throughout candidate staging');
assert.equal(cacheStore.has(oldAssetCache), true, 'old assets are retained throughout candidate staging');
assert.ok(progressMessages.some((message) => message.type === 'RELEASE_DOWNLOAD_PROGRESS'), 'download progress is reported');
assert.equal(progressMessages.at(-1)?.type, 'RELEASE_STAGED', 'staging reports completion only after verification');
const resumedInfo = [];
await worker.runExtendable('message', {
  data: { type: 'GET_RELEASE_INFO' },
  ports: [{ postMessage(message) { resumedInfo.push(message); } }],
  source: currentClient,
});
assert.equal(resumedInfo[0]?.staged, true, 'a re-opened app can resume activation without asking for download consent again');
assert.equal(cacheStore.has('retailos-pwa-state'), true, 'staged-release metadata is stored separately from business data');

await worker.runExtendable('message', {
  data: { type: 'ACTIVATE_RELEASE' },
  source: currentClient,
});
assert.equal(worker.skipWaitingCalls, 0, 'another RetailOS window blocks release takeover');
assert.equal(currentClient.messages.at(-1)?.type, 'UPDATE_BLOCKED_MULTIPLE_CLIENTS');
assert.equal(cacheStore.has(oldShellCache), true, 'blocked activation does not affect the running release');
activeClients.splice(1, 1);
await worker.runExtendable('message', {
  data: { type: 'ACTIVATE_RELEASE' },
  source: currentClient,
});
assert.equal(worker.skipWaitingCalls, 1, 'automatic activation can retry after the other app window closes');

worker.listeners.get('message');
const singleClientWorker = createWorker('runtime-test-2', {
  ...manifest,
  buildId: 'runtime-test-2',
  resources: await Promise.all(resources.map(async (resource) => ({
    ...resource,
    sha256: await sha256Hex('release-runtime:' + resource.path),
  }))),
}, { clients: [currentClient] });
await singleClientWorker.runExtendable('install');
await singleClientWorker.runExtendable('message', {
  data: { type: 'STAGE_RELEASE' },
  ports: [{ postMessage() {} }],
  source: currentClient,
});
await singleClientWorker.runExtendable('message', {
  data: { type: 'ACTIVATE_RELEASE' },
  source: currentClient,
});
assert.equal(singleClientWorker.skipWaitingCalls, 1, 'verified candidate activates automatically when the handoff is safe');

await singleClientWorker.runExtendable('activate');
assert.equal(singleClientWorker.claimCalls, 1, 'new worker claims clients after activation');
const activeState = await (await cachesMock.open('retailos-pwa-state')).match(activeStateUrl);
assert.equal((await activeState.json()).buildId, 'runtime-test-2', 'activation selects the staged release');
assert.equal(cacheStore.has(oldShellCache), true, 'last-known-good shell remains during boot probation');
assert.equal(cacheStore.has(oldAssetCache), true, 'last-known-good assets remain during boot probation');

const navigationEvent = {
  request: { method: 'GET', url: appBase, mode: 'navigate' },
  respondWith(promise) { this.responsePromise = promise; },
};
singleClientWorker.listener('fetch')(navigationEvent);
assert.equal(await (await navigationEvent.responsePromise).text(), 'release-runtime:index.html',
  'selected release serves its own shell');
const assetEvent = {
  request: { method: 'GET', url: appBase + 'assets/app.js', mode: 'cors' },
  respondWith(promise) { this.responsePromise = promise; },
};
singleClientWorker.listener('fetch')(assetEvent);
assert.equal(await (await assetEvent.responsePromise).text(), 'release-runtime:assets/app.js',
  'selected release serves its own cached assets');
const shellResourceEvent = {
  request: { method: 'GET', url: appBase + 'manifest.webmanifest', mode: 'cors' },
  respondWith(promise) { this.responsePromise = promise; },
};
singleClientWorker.listener('fetch')(shellResourceEvent);
assert.equal(await (await shellResourceEvent.responsePromise).text(), 'release-runtime:manifest.webmanifest',
  'active shell resources such as the web manifest remain available offline');

await singleClientWorker.runExtendable('message', {
  data: { type: 'APP_BOOT_FAILED', buildId: 'runtime-test-2' },
  source: currentClient,
});
assert.equal(currentClient.navigatedTo, appBase, 'failed boot navigates back through the rollback-aware worker');
assert.equal(cacheStore.has('retailos-pwa-shell-runtime-test-2'), false, 'failed release shell cache is discarded');
assert.equal(cacheStore.has('retailos-pwa-assets-runtime-test-2'), false, 'failed release asset cache is discarded');
const rolledBackState = await (await cachesMock.open('retailos-pwa-state')).match(activeStateUrl);
assert.equal((await rolledBackState.json()).buildId, 'old', 'rollback restores the last-known-good active pointer');
assert.equal(cacheStore.has(oldShellCache), true, 'rollback never deletes the previous shell');

singleClientWorker.setOffline(true);
const rollbackNavigation = {
  request: { method: 'GET', url: appBase, mode: 'navigate' },
  respondWith(promise) { this.responsePromise = promise; },
};
singleClientWorker.listener('fetch')(rollbackNavigation);
assert.equal(await (await rollbackNavigation.responsePromise).text(), 'previous-release-shell',
  'rollback serves the previous shell while offline');
const rollbackAsset = {
  request: { method: 'GET', url: appBase + 'assets/old-app.js', mode: 'cors' },
  respondWith(promise) { this.responsePromise = promise; },
};
singleClientWorker.listener('fetch')(rollbackAsset);
assert.equal(await (await rollbackAsset.responsePromise).text(), 'previous-release-asset',
  'rollback serves the previous release assets while offline');

const legacyManifest = {
  ...manifest,
  buildId: 'legacy-bridge',
  resources: await Promise.all(resources.map(async (resource) => ({
    ...resource,
    sha256: await sha256Hex('release-runtime:' + resource.path),
  }))),
};
const legacyWorker = createWorker('legacy-bridge', legacyManifest, { clients: [currentClient] });
await legacyWorker.runExtendable('install');
assert.equal(legacyWorker.fetchCalls, 0, 'legacy bridge does not pre-download before the legacy user action');
await legacyWorker.runExtendable('message', {
  data: { type: 'SKIP_WAITING' },
  source: currentClient,
});
assert.equal(legacyWorker.skipWaitingCalls, 1, 'legacy explicit update action is treated as download consent and activates after staging');
assert.ok(cacheStore.get('retailos-pwa-assets-legacy-bridge')?.has(appBase + 'assets/zxing_reader.wasm'),
  'legacy migration bridge still stages WASM before activation');

const failedManifest = {
  ...manifest,
  buildId: 'failed-build',
  resources: await Promise.all(resources.map(async (resource) => ({
    ...resource,
    sha256: await sha256Hex('release-runtime:' + resource.path),
  }))),
};
const failedWorker = createWorker('failed-build', failedManifest, { clients: [currentClient], failPath: 'assets/chunk-3.js' });
await failedWorker.runExtendable('install');
let failedMessages = [];
await failedWorker.runExtendable('message', {
  data: { type: 'STAGE_RELEASE' },
  ports: [{ postMessage(message) { failedMessages.push(message); } }],
  source: currentClient,
});
assert.equal(failedMessages.at(-1)?.type, 'RELEASE_STAGE_FAILED', 'interrupted staging reports a retryable failure');
assert.equal(cacheStore.has('retailos-pwa-shell-failed-build'), false, 'failed candidate shell cache is discarded');
assert.equal(cacheStore.has('retailos-pwa-assets-failed-build'), false, 'failed candidate asset cache is discarded');
assert.equal(cacheStore.has(oldShellCache), true, 'failed staging preserves the active shell');
assert.equal(cacheStore.has(oldAssetCache), true, 'failed staging preserves the active assets');
assert.equal(cacheStore.has('retailos-business-data'), true, 'failed app staging never deletes business data caches');

const corruptManifest = {
  ...manifest,
  buildId: 'hash-failed-build',
  resources: await Promise.all(resources.map(async (resource, index) => ({
    ...resource,
    sha256: index === 4 ? '0'.repeat(64) : await sha256Hex('release-runtime:' + resource.path),
  }))),
};
const hashWorker = createWorker('hash-failed-build', corruptManifest, { clients: [currentClient] });
await hashWorker.runExtendable('install');
const hashMessages = [];
await hashWorker.runExtendable('message', {
  data: { type: 'STAGE_RELEASE' },
  ports: [{ postMessage(message) { hashMessages.push(message); } }],
  source: currentClient,
});
assert.equal(hashMessages.at(-1)?.type, 'RELEASE_STAGE_FAILED', 'a checksum mismatch fails staging closed');
assert.equal(cacheStore.has('retailos-pwa-shell-hash-failed-build'), false, 'checksum failure removes candidate shell');
assert.equal(cacheStore.has('retailos-pwa-assets-hash-failed-build'), false, 'checksum failure removes candidate assets');
assert.equal(cacheStore.has(oldShellCache), true, 'checksum failure preserves last-known-good release');

const healthyManifest = {
  ...manifest,
  buildId: 'healthy-build',
  resources: await Promise.all(resources.map(async (resource) => ({
    ...resource,
    sha256: await sha256Hex('release-runtime:' + resource.path),
  }))),
};
const healthyWorker = createWorker('healthy-build', healthyManifest, { clients: [currentClient] });
await healthyWorker.runExtendable('install');
await healthyWorker.runExtendable('message', {
  data: { type: 'STAGE_RELEASE' },
  ports: [{ postMessage() {} }],
  source: currentClient,
});
await healthyWorker.runExtendable('message', {
  data: { type: 'ACTIVATE_RELEASE' },
  source: currentClient,
});
await healthyWorker.runExtendable('activate');
await healthyWorker.runExtendable('message', {
  data: { type: 'APP_BOOT_OK', buildId: 'healthy-build' },
  source: currentClient,
});
assert.equal(cacheStore.has(oldShellCache), false, 'matching healthy boot releases old rollback caches');
assert.equal(cacheStore.has(oldAssetCache), false, 'matching healthy boot releases old asset caches');
assert.equal(cacheStore.has('retailos-business-data'), true, 'healthy app release cleanup never touches business data');

const initialStore = new Map();
for (const [key, value] of cacheStore) initialStore.set(key, value);
cacheStore.clear();
const firstInstallManifest = {
  ...manifest,
  buildId: 'first-install',
  resources: await Promise.all(resources.map(async (resource) => ({
    ...resource,
    sha256: await sha256Hex('release-runtime:' + resource.path),
  }))),
};
const firstInstallWorker = createWorker('first-install', firstInstallManifest, { clients: [], hasActiveWorker: false });
await firstInstallWorker.runExtendable('install');
assert.ok(cacheStore.get('retailos-pwa-shell-first-install')?.has(shellUrl),
  'a fresh first install stages its initial shell without requiring an update prompt');
assert.ok(cacheStore.get('retailos-pwa-assets-first-install')?.has(appBase + 'assets/zxing_reader.wasm'),
  'a fresh first install stages WASM for offline runtime');
cacheStore.clear();
for (const [key, value] of initialStore) cacheStore.set(key, value);

console.log('PWA consent-gated staging, integrity verification, offline rollback and first-install tests passed.');
