import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const home = await readFile(new URL('../src/features/home/HomeScreen.tsx', import.meta.url), 'utf8');
const main = await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8');
const exportFormats = await readFile(new URL('../src/features/data/exportFormats.ts', import.meta.url), 'utf8');
const vite = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8');

assert.match(app, /lazy\(\(\) => import\('\.\/features\/home\/HomeScreen'\)\)/);
assert.doesNotMatch(app, /import HomeScreen from/);
for (const component of [
  'BarcodeScanner', 'StocktakeModule', 'StocktakeImportModule',
  'ScannerQaMonitor', 'SettingsHub', 'ScannerSettingsPanel'
]) {
  assert.match(home, new RegExp('const ' + component + ' = lazy\\('));
}
assert.doesNotMatch(home, /import (?:BarcodeScanner|StocktakeModule|StocktakeImportModule|ScannerQaMonitor|SettingsHub|ScannerSettingsPanel) from/);
assert.match(exportFormats, /await import\('jszip'\)/);
assert.match(exportFormats, /await import\('pptxgenjs'\)/);
assert.match(vite, /manifest:\s*true/);
assert.match(vite, /retailosPwaArtifacts/);
assert.doesNotMatch(main, /styles\/(?:home|login-experience|scanner-qa-monitor|scanner-settings)/);
await assert.rejects(access(new URL('../public/sw.js', import.meta.url)), 'legacy static worker must not remain in public');
console.log('Bundle boundaries and lazy-loading contract tests passed.');
