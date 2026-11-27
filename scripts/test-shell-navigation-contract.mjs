import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const shell = read('../src/shared/navigation/ShellNavigation.tsx');
const desktop = read('../src/shared/navigation/DesktopShellNavigation.tsx');
const mobile = read('../src/shared/navigation/MobileShellNavigation.tsx');
const desktopStyles = read('../src/shared/navigation/DesktopShellNavigation.css');
const mobileStyles = read('../src/shared/navigation/MobileShellNavigation.css');
const home = read('../src/features/home/HomeScreen.tsx');
const dock = read('../src/shared/navigation/LiquidDock.tsx');

assert.match(shell, /<DesktopShellNavigation \{\.\.\.props\} \/>/);
assert.match(shell, /<MobileShellNavigation \{\.\.\.props\} \/>/);
assert.match(shell, /CSS selects the presentation surface only; it never gates feature capability/);
assert.match(desktop, /<Surface as="nav"/);
assert.match(desktop, /items\.map\(\(item\)/);
assert.match(desktop, /onSelect\(item\.id\)/);
assert.match(desktop, /action\.onSelect\(event\)/);
assert.match(desktop, /aria-current=\{active \? 'location' : undefined\}/);
assert.match(desktop, /noticeCount/);
assert.match(mobile, /<LiquidDock \{\.\.\.props\} \/>/);
assert.match(desktopStyles, /@media \(min-width: 901px\)/);
assert.match(desktopStyles, /@media \(max-width: 900px\)/);
assert.match(mobileStyles, /@media \(max-width: 900px\)/);
assert.match(mobileStyles, /env\(safe-area-inset-bottom\)/);
assert.match(mobileStyles, /padding-bottom: calc\(94px \+ env\(safe-area-inset-bottom\)\)/);
assert.match(mobileStyles, /transform: translateX\(-50%\)/);
assert.match(home, /has-shell-navigation/);
assert.match(home, /<ShellNavigation/);
assert.doesNotMatch(home, /<LiquidDock/);
assert.match(dock, /data-keyboard-open/);

console.log('SH-01 independent shell navigation ownership contract tests passed.');
