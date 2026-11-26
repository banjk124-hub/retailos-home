import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const shell = read('../src/shared/navigation/ShellNavigation.tsx');
const styles = read('../src/shared/navigation/ShellNavigation.css');
const home = read('../src/features/home/HomeScreen.tsx');
const dock = read('../src/shared/navigation/LiquidDock.tsx');

assert.match(shell, /<Surface as="nav"[^>]*className="shell-navigation__desktop"/);
assert.match(shell, /<LiquidDock items=\{items\} activeId=\{activeId\} onSelect=\{onSelect\} action=\{action\}/);
assert.match(shell, /items\.map\(\(item\)/);
assert.match(shell, /onSelect\(item\.id\)/);
assert.match(shell, /action\.onSelect\(event\)/);
assert.match(shell, /aria-current=\{active \? 'location' : undefined\}/);
assert.match(shell, /noticeCount/);
assert.match(styles, /@media \(min-width: 901px\)/);
assert.match(styles, /@media \(max-width: 900px\)/);
assert.match(styles, /env\(safe-area-inset-(?:left|bottom)\)/);
assert.match(styles, /padding-bottom: calc\(94px \+ env\(safe-area-inset-bottom\)\)/);
assert.match(styles, /transform: translateX\(-50%\)/);
assert.match(home, /has-shell-navigation/);
assert.match(home, /<ShellNavigation/);
assert.doesNotMatch(home, /<LiquidDock/);
assert.match(dock, /data-keyboard-open/);

console.log('UI-01B shell navigation contract tests passed.');
