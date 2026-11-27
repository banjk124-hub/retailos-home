import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const read = (path) => readFile(resolve(process.cwd(), path), 'utf8');
const [app, shell, login, identity, loginExperience] = await Promise.all([
  read('src/App.tsx'),
  read('src/platform/shell/AuthenticatedAppShell.tsx'),
  read('src/styles/login-experience.css'),
  read('src/styles/auth-journey.css'),
  read('src/features/auth/screens/LoginExperience.tsx'),
]);

assert.match(app, /import ['"]\.\/styles\/auth-journey\.css['"];/,
  'App must load the identity presentation owned by UnifiedIdentityView');
assert.match(app, /function UnifiedIdentityView[\s\S]*?auth-journey-recognition/,
  'App must retain the identity recognition composition');
assert.doesNotMatch(login, /auth-journey-recognition|identity-surface-expand|identity-panel-reveal/,
  'Login feature CSS must not own App-level identity recognition presentation');
assert.match(loginExperience, /\.\.\/\.\.\/styles\/login-experience\.css/,
  'Login experience must retain its feature stylesheet');
assert.match(loginExperience, /\.\.\/\.\.\/styles\/login-compact-landscape\.css/,
  'Login must retain compact-landscape presentation');
for (const selector of [
  '.auth-journey-recognition {',
  '.auth-journey-recognition__backdrop {',
  '.auth-journey-recognition__panel {',
  '.auth-journey-recognition__brand',
  '.auth-journey-recognition__identity {',
  '.auth-journey-recognition__avatar {',
  '.auth-journey-recognition__meta {',
  '.auth-journey-recognition__status {',
]) assert.ok(identity.includes(selector), `Identity stylesheet must retain ${selector}`);
assert.match(identity, /@media \(prefers-reduced-motion: reduce\)/,
  'Identity transition must retain reduced-motion handling');
assert.match(identity, /@keyframes identity-surface-expand/,
  'Identity transition must retain its surface reveal animation');
assert.match(identity, /@keyframes identity-panel-reveal/,
  'Identity transition must retain its panel reveal animation');
assert.match(login, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.login-hero__message[\s\S]*?\.login-experience__panel/,
  'Login reduced-motion handling must remain feature-owned');
console.log('UI-04A Login presentation ownership contract tests passed.');
