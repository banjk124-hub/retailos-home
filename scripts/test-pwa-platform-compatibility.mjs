import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [html, manifestText, promptCss, prompt, registration, worker, homeScanner, stocktakeScanner] = await Promise.all([
  read('../index.html'),
  read('../public/manifest.webmanifest'),
  read('../src/shared/pwa/pwa-update-prompt.css'),
  read('../src/shared/pwa/PwaUpdatePrompt.tsx'),
  read('../src/shared/pwa/serviceWorkerRegistration.ts'),
  read('../src/sw/service-worker.template.js'),
  read('../src/features/scanner/components/BarcodeScanner.tsx'),
  read('../src/features/stocktake/components/StocktakeScanner.tsx'),
]);
const manifest = JSON.parse(manifestText);

// Shared responsive shell and iOS safe-area requirements.
assert.match(html, /name="viewport"[^>]*viewport-fit=cover/,
  'viewport must extend into iOS safe areas');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.start_url, './');
assert.equal(manifest.scope, './');
assert.match(promptCss, /env\(safe-area-inset-left\)/);
assert.match(promptCss, /env\(safe-area-inset-right\)/);
assert.match(promptCss, /env\(safe-area-inset-bottom\)/);
assert.match(promptCss, /@media\s*\(max-width:\s*560px\)/);
assert.match(promptCss, /min-height:\s*38px/);

// Registration must use the Vite project base, not an origin-root URL.
assert.match(registration, /import\.meta\.env\.BASE_URL\s*\+\s*'sw\.js'/);
assert.match(registration, /updateViaCache:\s*'none'/);
assert.doesNotMatch(registration, /register\(['"]\/sw\.js/);
assert.match(prompt, /'serviceWorker' in navigator/);
assert.match(prompt, /visibilitychange/);
assert.match(prompt, /controllerchange/);
assert.doesNotMatch(prompt, /beforeinstallprompt/,
  'update lifecycle must not depend on install-prompt support');

// Service worker code must remain worker-context-only and origin/base scoped.
assert.match(worker, /clientUrl\.origin === APP_BASE_URL\.origin/);
assert.match(worker, /clientUrl\.pathname\.startsWith\(APP_BASE_URL\.pathname\)/);
assert.doesNotMatch(worker, /window\./);
assert.doesNotMatch(worker, /document\./);

// Both scanner presentations must preserve inline video playback on iOS.
assert.match(homeScanner, /playsInline/);
assert.match(stocktakeScanner, /playsInline/);

console.log('PWA desktop, Android and iOS compatibility contract tests passed.');
