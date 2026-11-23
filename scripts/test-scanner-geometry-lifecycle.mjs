import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(
  new URL('../src/features/scanner/hooks/useScannerPreviewRegionBinding.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;

const reactUrl = 'data:text/javascript;base64,' + Buffer.from(`
  export function useEffect(effect) { globalThis.__effect = effect; }
  export function useRef(value) { return { current: value }; }
`).toString('base64');
const geometryPath = '../src/platform/scanner/scannerGeometry.ts';
const geometrySource = await readFile(new URL(geometryPath, import.meta.url), 'utf8');
const geometryUrl = 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(geometrySource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText).toString('base64');
const serviceSource = await readFile(
  new URL('../src/features/scanner/services/scannerPreviewRegion.ts', import.meta.url),
  'utf8',
);
const serviceJs = ts.transpileModule(serviceSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText.replace(
  "from '../../../platform/scanner/scannerGeometry';",
  `from '${geometryUrl}'`,
);
const serviceUrl = 'data:text/javascript;base64,' + Buffer.from(serviceJs).toString('base64');

let hookJs = compiled
  .replace("from 'react';", `from '${reactUrl}'`)
  .replace("from '../../../platform/scanner/scannerGeometry';", `from '${geometryUrl}'`)
  .replace("from '../services/scannerPreviewRegion';", `from '${serviceUrl}'`);
const hookUrl = 'data:text/javascript;base64,' + Buffer.from(hookJs).toString('base64');
const { useScannerPreviewRegionBinding } = await import(hookUrl);

const makeTarget = () => {
  const listeners = new Map();
  return {
    addEventListener(type, callback) {
      const set = listeners.get(type) ?? new Set();
      set.add(callback);
      listeners.set(type, set);
    },
    removeEventListener(type, callback) {
      listeners.get(type)?.delete(callback);
    },
    fire(type) {
      for (const callback of [...(listeners.get(type) ?? [])]) callback();
    },
    count(type) { return listeners.get(type)?.size ?? 0; },
    total() { return [...listeners.values()].reduce((sum, set) => sum + set.size, 0); },
  };
};

const windowTarget = makeTarget();
const videoTarget = makeTarget();
const viewportTarget = makeTarget();
const mediaTarget = makeTarget();
let rafId = 0;
const rafQueue = new Map();
const callbacks = [];
const resizeObservers = [];
let mediaQuery = null;
let previewWidth = 390;
let reticleLeft = 51.2;
let sourceWidth = 1280;
const video = {
  videoWidth: sourceWidth,
  videoHeight: 720,
  parentElement: {},
  ...videoTarget,
  getBoundingClientRect: () => ({ left: 20, top: 30, width: previewWidth, height: 844 }),
};
const reticle = {
  getBoundingClientRect: () => ({ left: reticleLeft, top: 215.68, width: 327.6, height: 472.64 }),
};
video.addEventListener = videoTarget.addEventListener;
video.removeEventListener = videoTarget.removeEventListener;

class MockResizeObserver {
  constructor(callback) { this.callback = callback; this.targets = []; this.disconnected = false; resizeObservers.push(this); }
  observe(target) { this.targets.push(target); }
  disconnect() { this.disconnected = true; }
}
globalThis.ResizeObserver = MockResizeObserver;

const originalWindow = globalThis.window;
const originalResizeObserver = globalThis.ResizeObserver;
globalThis.window = {
  innerWidth: 430,
  innerHeight: 932,
  devicePixelRatio: 2,
  visualViewport: {
    offsetLeft: 0, offsetTop: 0, scale: 1,
    addEventListener: viewportTarget.addEventListener,
    removeEventListener: viewportTarget.removeEventListener,
  },
  getComputedStyle: () => ({ objectFit: 'cover', objectPosition: '50% 50%', transform: 'none' }),
  requestAnimationFrame(callback) { const id = ++rafId; rafQueue.set(id, callback); return id; },
  cancelAnimationFrame(id) { rafQueue.delete(id); },
  matchMedia(query) {
    mediaQuery = query;
    return {
      addEventListener: mediaTarget.addEventListener,
      removeEventListener: mediaTarget.removeEventListener,
    };
  },
  addEventListener: windowTarget.addEventListener,
  removeEventListener: windowTarget.removeEventListener,
};
const flushRaf = () => {
  const entries = [...rafQueue.entries()];
  rafQueue.clear();
  for (const [, callback] of entries) callback();
};

try {
  const videoRef = { current: video };
  const reticleRef = { current: reticle };
  useScannerPreviewRegionBinding({
    videoRef,
    reticleRef,
    videoSurfaceKey: 0,
    enabled: true,
    onRegionChange: (region) => callbacks.push(region),
  });
  const cleanup = globalThis.__effect();
  assert.equal(typeof cleanup, 'function');
  assert.ok(callbacks.at(-1), 'initial valid geometry publishes an ROI');
  assert.equal(callbacks.at(-1).geometryVersion, 1);
  assert.equal(mediaQuery, '(resolution: 2dppx)');
  assert.equal(resizeObservers.length, 1);
  assert.equal(resizeObservers[0].targets.length, 3);

  // A layout change clears the last known ROI synchronously before RAF runs.
  previewWidth = 420;
  windowTarget.fire('resize');
  assert.equal(callbacks.at(-1), null, 'geometry drift clears stale ROI before scheduled measurement');
  flushRaf();
  assert.ok(callbacks.at(-1), 'fresh geometry is published after measurement');
  assert.equal(callbacks.at(-1).geometryVersion, 2);

  // Source-frame and reticle movement each produce a new revision.
  sourceWidth = 1920;
  video.videoWidth = sourceWidth;
  videoTarget.fire('loadedmetadata');
  assert.equal(callbacks.at(-1), null);
  flushRaf();
  assert.equal(callbacks.at(-1).geometryVersion, 3);

  reticleLeft = 60;
  resizeObservers[0].callback([]);
  assert.equal(callbacks.at(-1), null);
  flushRaf();
  assert.equal(callbacks.at(-1).geometryVersion, 4);

  // visualViewport and pixel-density signals are observed.
  viewportTarget.fire('resize');
  assert.equal(callbacks.at(-1), null);
  flushRaf();
  assert.equal(callbacks.at(-1).geometryVersion, 5);
  mediaTarget.fire('change');
  assert.equal(rafQueue.size, 1, 'pixel ratio change schedules a fresh measurement');

  const beforeCleanupCount = callbacks.length;
  cleanup();
  assert.equal(resizeObservers[0].disconnected, true);
  assert.equal(windowTarget.total(), 0, 'window listeners are removed');
  assert.equal(videoTarget.total(), 0, 'video listeners are removed');
  assert.equal(viewportTarget.total(), 0, 'visualViewport listeners are removed');
  assert.equal(mediaTarget.total(), 0, 'resolution media-query listener is removed');
  flushRaf();
  assert.equal(callbacks.length, beforeCleanupCount + 1,
    'cleanup publishes one final null ROI and no stale measurement follows');
} finally {
  globalThis.window = originalWindow;
  globalThis.ResizeObserver = originalResizeObserver;
}

console.log('Scanner SC-03 geometry signature, revision, invalidation and observer lifecycle tests passed.');
