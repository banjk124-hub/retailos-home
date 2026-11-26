import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/features/home/HomeScreen.tsx', import.meta.url), 'utf8');
const hook = readFileSync(new URL('../src/features/home/hooks/useHomeNavigation.ts', import.meta.url), 'utf8');

assert.match(home, /useHomeNavigation\(/);
assert.doesNotMatch(home, /activeNavRef|scrollSaveTimer|syncActiveSection|saveHomeUiState/);
assert.match(hook, /addEventListener\('scroll'/);
assert.match(hook, /addEventListener\('pagehide'/);
assert.match(hook, /removeEventListener\('scroll'/);
assert.match(hook, /cancelAnimationFrame\(restore\)/);
assert.match(hook, /setTimeout\([\s\S]*?140\)/);
assert.match(hook, /prefersReducedMotion \? 'auto' : 'smooth'/);
assert.match(hook, /onOpenSettings\(\)/);
assert.match(hook, /saveHomeUiState\(\{ activeNav, search: searchRef\.current, scrollY: window\.scrollY \}\)/);

console.log('UI-02A Home navigation ownership contract tests passed.');
