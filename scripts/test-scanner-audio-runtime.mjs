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
  connect() {}
  start() {}
  stop() {}
  addEventListener(type, callback) { if (type === 'ended') this.ended = callback; }
  disconnect() {}
}
class MockAudioContext {
  static instance;
  state = 'suspended';
  currentTime = 1;
  destination = {};
  oscillators = [];
  gains = [];
  constructor() { MockAudioContext.instance = this; }
  async resume() { this.state = 'running'; }
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

const compile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const asModuleUrl = (source) => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const assertGain = (actual, expected, message) => {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: expected ${expected}, received ${actual}`);
};

const storeSource = compile(await read('../src/features/scanner/services/scannerSettingsStore.ts'));
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
assertGain(context.gains.at(-1).gain.ramps.find((entry) => entry.kind === 'exponential').value, 0.24,
  '50% produces the compatibility gain of 0.24');

audio.playScannerBeep(100);
assert.equal(context.oscillators.length, 2);
assertGain(context.gains.at(-1).gain.ramps.find((entry) => entry.kind === 'exponential').value, 0.48,
  '100% produces the configured maximum gain of 0.48');

store.updateScannerSettings({ beepVolume: 70, vibrationEnabled: true });
await feedback.previewScannerBeep();
assertGain(context.gains.at(-1).gain.ramps.find((entry) => entry.kind === 'exponential').value, 0.336,
  'preview reads the latest persisted setting, not a stale captured value');

feedback.playScannerFeedback();
assertGain(context.gains.at(-1).gain.ramps.find((entry) => entry.kind === 'exponential').value, 0.336,
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

console.log('Scanner Web Audio runtime gain, preview synchronization and vibration policy tests passed.');
