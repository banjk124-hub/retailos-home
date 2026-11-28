import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const shell = read('../src/platform/shell/AuthenticatedAppShell.tsx');
const context = read('../src/platform/shell/shellNavigationContext.tsx');
const home = read('../src/features/home/HomeScreen.tsx');
const desktopNav = read('../src/shared/navigation/DesktopShellNavigation.css');
const mobileNav = read('../src/shared/navigation/MobileShellNavigation.css');
const presentation = read('../src/platform/shell/AuthenticatedShellPresentationRoot.tsx');

assert.match(shell, /<ShellNavigationProvider>/);
assert.match(shell, /<AuthenticatedShellPresentationRoot platform=\{platform\}>/);
assert.match(shell, /<PersistentShellNavigation platform=\{platform\} \/>/);
assert.match(shell, /<JourneyControllerProvider>/);
assert.match(shell, /<ActivePageHost/);
assert.doesNotMatch(shell, /<HomeScreen/);
assert.doesNotMatch(shell, /<ShellNavigation\s/);

assert.match(context, /createContext<ContextValue \| null>/);
assert.match(context, /register: \(owner: string, config: NavigationConfig\)/);
assert.match(context, /current\?\.owner === owner \? null : current/);
assert.match(context, /export function PersistentShellNavigation/);
assert.match(context, /<ShellNavigation \{\.\.\.context\.registration\.config\} platform=\{platform\} \/>/);

assert.match(home, /useShellNavigationRegistration\('home'/);
assert.doesNotMatch(home, /<ShellNavigation\s/);
assert.doesNotMatch(home, /HomePresentationRoot/);
assert.match(home, /const shellNavigationItems = useMemo/);

assert.match(desktopNav, /position: fixed/);
assert.match(desktopNav, /left: max\(12px, env\(safe-area-inset-left\)\)/);
assert.match(mobileNav, /bottom: max\(8px, env\(safe-area-inset-bottom\)\)/);
assert.match(presentation, /platform === 'desktop'/);
assert.match(presentation, /platform === 'mobile'/);

console.log('JRN-02 persistent Shell navigation ownership contract tests passed.');
