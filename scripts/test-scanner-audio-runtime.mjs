import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const stored = new Map();
globalThis.localStorage = {
  getItem: (key) => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, String(value)),
};

class MockAudioParam {
  ramps = [];
  setValueAtTime(value, time) { this.ramps.push({ kind: 'set', value, time }); }
  exponentialRampToValueAtTime(value, time) { this.ramps.push({ kind: 'exponential', value, time }); }
}
class MockGainNode {
  gain = new MockAudioParam();
  connect() {}
  disconnect() {}
}
class MockOscillatorNode {
  frequency = new MockAudioParam();
  type = '';
  ended = null;
  stoppedAt = null;
  connect() {}
  start() {}
  stop(time) { this.stoppedAt = time; }
  addEventListener(type, callback) { if (type === 'ended') this.ended = callback; }
  disconnect() {}
}
class MockAudioContext {
  static instance;
  static instances = [];
  state = 'suspended';
  currentTime = 1;
  destination = {};
  oscillators = [];
  gains = [];
  constructor() {
    MockAudioContext.instance = this;
    MockAudioContext.instances.push(this);
  }
  async resume() {
    if (this.state === 'closed') throw new Error('Cannot resume a closed AudioContext');
    this.state = 'running';
  }
  createOscillator() {
    const node = new MockOscillatorNode();
    this.oscillators.push(node);
    return node;
  }
  createGain() {
    const node = new MockGainNode();
    this.gains.push(node);
    return node;
  }
}
globalThis.AudioContext = MockAudioContext;
const lifecycleListeners = { document: new Map(), window: new Map() };
globalThis.document = {
  hidden: false,
  addEventListener(type, callback) { lifecycleListeners.document.set(type, callback); },
};
globalThis.window = {
  addEventListener(type, callback) { lifecycleListeners.window.set(type, callback); },
};

const compile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const asModuleUrl = (source) => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const assertGain = (actual, expected, message) => {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: expected ${expected}, received ${actual}`);
};

const contractsSource = await read('../src/platform/scanner/contracts.ts');
const formatsMatch = contractsSource.match(/SUPPORTED_BARCODE_FORMATS = \[([\s\S]*?)\] as const/);
const formats = [...formatsMatch[1].matchAll(/'([A-Z0-9_]+)'/g)].map((match) => match[1]);
let rawStoreSource = await read('../src/features/scanner/services/scannerSettingsStore.ts');
rawStoreSource = rawStoreSource.replace(
  "import { SUPPORTED_BARCODE_FORMATS, type SupportedBarcodeSymbology } from '../../../platform/scanner/contracts';",
  `const SUPPORTED_BARCODE_FORMATS = ${JSON.stringify(formats)} as const; type SupportedBarcodeSymbology = typeof SUPPORTED_BARCODE_FORMATS[number];`,
);
const storeSource = compile(rawStoreSource);
const storeUrl = asModuleUrl(storeSource);
const store = await import(storeUrl);

const audioSource = compile(await read('../src/features/scanner/services/scannerAudio.ts'))
  .replace("'./scannerSettingsStore'", JSON.stringify(storeUrl));
const audioUrl = asModuleUrl(audioSource);
const audio = await import(audioUrl);

const feedbackSource = compile(await read('../src/features/scanner/services/scannerFeedback.ts'))
  .replace("'./scannerAudio'", JSON.stringify(audioUrl))
  .replace("'./scannerSettingsStore'", JSON.stringify(storeUrl));
const feedback = await import(asModuleUrl(feedbackSource));

const vibrationCalls = [];
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { vibrate: (duration) => { vibrationCalls.push(duration); return true; } },
});

await audio.unlockScannerAudio();
const context = MockAudioContext.instance;
assert.equal(context.state, 'running', 'user-gesture unlock resumes the shared AudioContext');

audio.playScannerBeep(0);
assert.equal(context.oscillators.length, 0, 'zero volume creates no oscillator');

audio.playScannerBeep(50);
assert.equal(context.oscillators.length, 1);
assertGain(context.gains.at(-1).gain.ramps.find((entry) => entry.kind === 'exponential').value, 0.3,
  '50% produces the new gain of 0.30');

audio.playScannerBeep(100);
assert.equal(context.oscillators.length, 2);
assertGain(context.gains.at(-1).gain.ramps.find((entry) => entry.kind === 'exponential').value, 0.6,
  '100% produces the configured maximum gain of 0.60');
assert.equal(context.oscillators.at(-1).stoppedAt, context.currentTime + 0.14,
  'beep oscillator runs for 140 ms');

store.updateScannerSettings({ beepVolume: 70, vibrationEnabled: true });
await feedback.previewScannerBeep();
assertGain(context.gains.at(-1).gain.ramps.find((entry) => entry.kind === 'exponential').value, 0.42,
  'preview reads the latest persisted setting, not a stale captured value');

feedback.playScannerFeedback();
assertGain(context.gains.at(-1).gain.ramps.find((entry) => entry.kind === 'exponential').value, 0.42,
  'accepted-result feedback uses the same current volume as preview');
assert.deepEqual(vibrationCalls, [25], 'enabled vibration sends one 25 ms pulse');

store.updateScannerSettings({ beepVolume: 0, vibrationEnabled: false });
const oscillatorCountBeforeMute = context.oscillators.length;
feedback.playScannerFeedback();
assert.equal(context.oscillators.length, oscillatorCountBeforeMute, 'muted feedback creates no beep');
assert.deepEqual(vibrationCalls, [25], 'disabled vibration sends no additional pulse');

Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {},
});
store.updateScannerSettings({ beepVolume: 0, vibrationEnabled: true });
assert.doesNotThrow(() => feedback.playScannerFeedback(),
  'missing Vibration API is non-fatal and cannot block accepted-result handling');

// Best-effort foreground recovery resumes an existing interrupted context without camera work.
context.state = 'suspended';
lifecycleListeners.document.get('visibilitychange')();
await Promise.resolve();
assert.equal(context.state, 'running', 'visible-page transition resumes a suspended context');

context.state = 'interrupted';
lifecycleListeners.window.get('pageshow')();
await Promise.resolve();
assert.equal(context.state, 'running', 'pageshow resumes a Safari-interrupted context');

// A closed context cannot be recovered by a background event; the next explicit gesture recreates it.
context.state = 'closed';
lifecycleListeners.window.get('pageshow')();
await Promise.resolve();
assert.equal(MockAudioContext.instances.length, 1, 'foreground events do not create a replacement context without a gesture');
await audio.unlockScannerAudio();
assert.equal(MockAudioContext.instances.length, 2, 'a closed context is replaced with a fresh context on a user gesture');
assert.equal(MockAudioContext.instance.state, 'running', 'the replacement context resumes from the gesture');

console.log('Scanner Web Audio runtime lifecycle, gain, duration, preview synchronization and vibration tests passed.');
