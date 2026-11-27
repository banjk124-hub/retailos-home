import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const shell = read('../src/shared/navigation/ShellNavigation.tsx');
const desktop = read('../src/shared/navigation/DesktopShellNavigation.tsx');
const mobile = read('../src/shared/navigation/MobileShellNavigation.tsx');
const tablet = read('../src/shared/navigation/TabletShellNavigation.tsx');
const desktopStyles = read('../src/shared/navigation/DesktopShellNavigation.css');
const mobileStyles = read('../src/shared/navigation/MobileShellNavigation.css');
const tabletStyles = read('../src/shared/navigation/TabletShellNavigation.css');
const home = read('../src/features/home/HomeScreen.tsx');
const dock = read('../src/shared/navigation/LiquidDock.tsx');

assert.match(shell, /platform === 'desktop'/);
assert.match(shell, /platform === 'mobile'/);
assert.match(shell, /<TabletShellNavigation \{\.\.\.props\} \/>/);
assert.match(desktop, /<Surface as="nav"/);
assert.match(desktop, /onSelect\(item\.id\)/);
assert.match(desktop, /action\.onSelect\(event\)/);
assert.match(desktop, /noticeCount/);
assert.match(mobile, /<LiquidDock \{\.\.\.props\} \/>/);
assert.match(tablet, /Temporary legacy responsive shell while Tablet remains review-required/);
assert.match(desktopStyles, /\.app-shell\.has-shell-navigation/);
assert.doesNotMatch(desktopStyles, /@media \(max-width:/);
assert.match(mobileStyles, /env\(safe-area-inset-bottom\)/);
assert.match(mobileStyles, /transform: translateX\(-50%\)/);
assert.match(tabletStyles, /@media \(max-width: 900px\)/);
assert.match(home, /<ShellNavigation[\s\S]*platform=\{platform\}/);
assert.match(home, /platform === 'mobile' && isScannerSupportedDevice\(\)/);
assert.match(home, /showScannerSettings=\{platform === 'mobile'\}/);
assert.doesNotMatch(home, /<LiquidDock/);
assert.match(dock, /data-keyboard-open/);

console.log('SH-01 platform-owned navigation composition contract tests passed.');
