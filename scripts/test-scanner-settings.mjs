import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const stored = new Map();
globalThis.localStorage = {
  getItem: (key) => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, String(value)),
};

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const storeSource = await read('../src/features/scanner/services/scannerSettingsStore.ts');
const storeCompiled = ts.transpileModule(storeSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const storeUrl = 'data:text/javascript;base64,' + Buffer.from(storeCompiled).toString('base64');
const store = await import(storeUrl);

assert.deepEqual(store.getScannerSettings(), {
  vibrationEnabled: true,
  beepVolume: 50,
}, 'scanner feedback defaults preserve the current beep level and enabled haptic preference');

let notifications = 0;
const unsubscribe = store.subscribeScannerSettings(() => { notifications += 1; });
assert.deepEqual(store.updateScannerSettings({ vibrationEnabled: false, beepVolume: 80 }), {
  vibrationEnabled: false,
  beepVolume: 80,
});
assert.equal(notifications, 1, 'settings subscribers receive preference changes');
assert.deepEqual(JSON.parse(stored.get('retailos.scannerSettings.v1')), {
  vibrationEnabled: false,
  beepVolume: 80,
}, 'preferences persist to the versioned device-local storage key');

store.updateScannerSettings({ beepVolume: 73 });
assert.equal(store.getScannerSettings().beepVolume, 70, 'volume snaps to the nearest 10-point step');
store.updateScannerSettings({ beepVolume: -12 });
assert.equal(store.getScannerSettings().beepVolume, 0, 'volume is clamped to mute at zero');
store.updateScannerSettings({ beepVolume: 140 });
assert.equal(store.getScannerSettings().beepVolume, 100, 'volume is clamped at the maximum');
store.updateScannerSettings({ beepVolume: Number.NaN });
assert.equal(store.getScannerSettings().beepVolume, 50, 'invalid volume falls back to the safe default');
unsubscribe();
assert.equal(notifications, 5, 'unsubscribed listeners stop receiving changes');

const audio = await read('../src/features/scanner/services/scannerAudio.ts');
assert.match(audio, /getScannerSettings\(\)\.beepVolume/, 'beep reads the shared current volume');
assert.match(audio, /normalizedVolume \* 0\.48/, 'the 50% default maps to the existing 0.24 gain and 100% maps to 0.48');
assert.match(audio, /if \(targetGain <= 0\) return/, 'zero volume suppresses the beep');

const feedback = await read('../src/features/scanner/services/scannerFeedback.ts');
assert.match(feedback, /getScannerSettings\(\)/, 'accepted-result feedback reads the shared preference store');
assert.match(feedback, /settings\.vibrationEnabled/, 'vibration obeys the shared toggle');
assert.match(feedback, /navigator\.vibrate\(25\)/, 'enabled vibration keeps the existing short pulse');
assert.match(feedback, /playScannerBeep\(settings\.beepVolume\)/, 'accepted barcode uses the current selected beep level');
assert.match(feedback, /previewScannerBeep/, 'settings page can preview the current beep level');
assert.doesNotMatch(feedback, /audio\?: boolean|haptic\?: boolean/, 'feature-level feedback overrides are removed');

const hook = await read('../src/features/scanner/hooks/useScannerEngine.ts');
assert.match(hook, /playScannerFeedback\(\)/, 'shared engine uses centralized feedback policy');
assert.doesNotMatch(hook, /audioFeedback|hapticFeedback/, 'shared hook no longer accepts per-feature feedback overrides');

const contract = await read('../src/platform/scanner/contracts.ts');
assert.doesNotMatch(contract, /audioFeedback|hapticFeedback/, 'platform camera/session contract does not own application feedback preferences');

const homeScanner = await read('../src/features/scanner/components/BarcodeScanner.tsx');
const stocktakeScanner = await read('../src/features/stocktake/components/StocktakeScanner.tsx');
assert.match(homeScanner, /useScannerEngine\(/);
assert.match(stocktakeScanner, /useScannerEngine\(/);
assert.doesNotMatch(homeScanner, /audioFeedback|hapticFeedback/);
assert.doesNotMatch(stocktakeScanner, /audioFeedback|hapticFeedback/);

const settingsPanel = await read('../src/features/scanner/components/ScannerSettingsPanel.tsx');
assert.match(settingsPanel, /role="switch"/, 'vibration is a real accessible switch');
assert.match(settingsPanel, /updateScannerSettings\(\{ vibrationEnabled:/, 'vibration switch writes the shared store');
assert.match(settingsPanel, /type="range"/, 'beep volume is an interactive range component');
assert.match(settingsPanel, /step="10"/, 'beep volume has 11 discrete levels');
assert.match(settingsPanel, /updateScannerSettings\(\{ beepVolume:/, 'beep slider writes the shared store');
assert.match(settingsPanel, /previewScannerBeep/, 'beep preview uses the real audio output path');
assert.match(settingsPanel, /isScannerVibrationSupported/, 'unsupported vibration APIs are detected');

const settingsHub = await read('../src/features/home/components/SettingsHub.tsx');
assert.match(settingsHub, /Scanner QA Monitor/);
assert.match(settingsHub, /Cài đặt máy quét/);
const home = await read('../src/features/home/HomeScreen.tsx');
assert.match(home, /setShowSettings\(true\)/);
assert.match(home, /<SettingsHub/);
assert.match(home, /<ScannerQaMonitor/);
assert.match(home, /<ScannerSettingsPanel/);

const iconRegistry = await read('../src/shared/icons/icon.registry.ts');
assert.match(iconRegistry, /settings: Settings,/);
assert.doesNotMatch(iconRegistry, /SlidersHorizontal/);

console.log('Scanner settings persistence, feedback policy, UI wiring and shared-consumer regression tests passed.');
