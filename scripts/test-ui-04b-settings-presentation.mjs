import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const hub = await read('../src/features/home/components/SettingsHub.tsx');
const scanner = await read('../src/features/scanner/components/ScannerSettingsPanel.tsx');
const dialogCss = await read('../src/styles/settings-dialog.css');
const hubCss = await read('../src/styles/settings-hub.css');
const scannerCss = await read('../src/styles/scanner-preferences.css');

assert.match(hub, /settings-dialog\.css/);
assert.match(hub, /settings-hub\.css/);
assert.doesNotMatch(hub, /scanner-preferences\.css|scanner-settings\.css/);
assert.match(scanner, /settings-dialog\.css/);
assert.match(scanner, /scanner-preferences\.css/);
assert.doesNotMatch(scanner, /settings-hub\.css|scanner-settings\.css/);

for (const selector of [
  '.scanner-settings-backdrop',
  '.scanner-settings-panel',
  '.scanner-settings-header',
  '.scanner-settings-close',
  '.scanner-settings-back',
  '.scanner-settings-footnote',
]) {
  assert.ok(dialogCss.includes(selector), `shared dialog foundation retains ${selector}`);
}
assert.doesNotMatch(dialogCss, /\.scanner-settings-menu|\.scanner-preference-card|\.scanner-symbology/);
assert.match(hubCss, /\.scanner-settings-menu-item/);
assert.match(hubCss, /\.scanner-settings-menu-item--update/);
assert.match(hubCss, /prefers-reduced-motion/);
assert.doesNotMatch(hubCss, /\.scanner-preference-card|\.scanner-symbology/);
assert.match(scannerCss, /\.scanner-preference-card/);
assert.match(scannerCss, /\.scanner-symbology-group/);
assert.match(scannerCss, /\.scanner-volume-control/);
assert.match(scannerCss, /prefers-reduced-motion/);
assert.doesNotMatch(scannerCss, /\.scanner-settings-menu/);

assert.match(hub, /readUpdateCenterEntry/);
assert.match(hub, /retailos:update-center-action/);
assert.match(hub, /retailos:update-center-blocked/);
assert.match(hub, /UPDATE_CENTER_CHANGED_EVENT/);
assert.match(scanner, /useScannerSettings/);
assert.match(scanner, /updateScannerSettings/);
assert.match(scanner, /updateScannerSymbologyEnabled/);

console.log('UI-04B Settings Hub, shared dialog and Scanner Preferences presentation ownership tests passed.');
