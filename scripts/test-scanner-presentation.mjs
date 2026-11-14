import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

const sessionSource = await read('../src/platform/scanner/universalScannerSession.ts');
assert.doesNotMatch(sessionSource, /videoPresentationLayout|waitForVideoPresentationLayout/,
  'platform session must not import or invoke a DOM presentation-layout gate');
assert.doesNotMatch(sessionSource, /getBoundingClientRect|parentElement|clientWidth|clientHeight|offsetWidth|offsetHeight/,
  'platform session must not inspect module DOM geometry');

const attachAt = sessionSource.indexOf('this.video.srcObject = stream');
const playAt = sessionSource.indexOf('await this.video.play()', attachAt);
const frameReadyAt = sessionSource.indexOf('await waitForVideoFrameReady(this.video)', playAt);
const previewReadyAt = sessionSource.indexOf('this.options.onPreviewReady?.()', frameReadyAt);
const decoderAt = sessionSource.indexOf('await this.createDecoder(generation)', previewReadyAt);
const decoderMethodAt = sessionSource.indexOf('private async createDecoder(generation');
const decoderImportAt = sessionSource.indexOf("await import('./decoders/zxingDecoder')", decoderMethodAt);
assert.ok(attachAt >= 0 && playAt > attachAt && frameReadyAt > playAt
  && previewReadyAt > frameReadyAt && decoderAt > previewReadyAt
  && decoderMethodAt > decoderAt && decoderImportAt > decoderMethodAt,
'startup must attach/play the stream, publish a usable preview, then dynamically load and initialize the decoder');
assert.doesNotMatch(sessionSource, /import \\{\\s*ZXingDecoderAdapter\\s*\\} from ['\"]\\.\\/decoders\\/zxingDecoder/,
  'the heavy ZXing implementation must not be part of the scanner session static dependency graph');

assert.match(sessionSource, /video\.readyState >= HTMLMediaElement\.HAVE_CURRENT_DATA/,
  'technical frame readiness must continue requiring decoded media data');
assert.match(sessionSource, /video\.videoWidth > 0\s*&&\s*video\.videoHeight > 0/,
  'technical frame readiness must continue requiring intrinsic decoded frame dimensions');

// The feature modules retain their own DOM and preview-reveal contracts.
const homeSource = await read('../src/features/scanner/components/BarcodeScanner.tsx');
assert.match(homeSource, /barcode-scanner-view \$\{scanner\.isPreviewReady \? 'has-preview'/,
  'Home must retain its own preview-ready class');
assert.match(homeSource, /<video key=\{scanner\.videoSurfaceKey\} ref=\{scanner\.videoRef\}/,
  'Home must retain its feature-owned video element');

const stocktakeSource = await read('../src/features/stocktake/components/StocktakeScanner.tsx');
assert.match(stocktakeSource, /stocktake-scanner-preview \$\{scanner\.isPreviewReady \? 'has-preview'/,
  'Stocktake must retain its own preview-ready class');
assert.match(stocktakeSource, /<video key=\{scanner\.videoSurfaceKey\} ref=\{scanner\.videoRef\}/,
  'Stocktake must retain its feature-owned video element');

const transitionCss = await read('../src/features/scanner/scanner-transition.css');
assert.match(transitionCss, /\.barcode-scanner\.scanner-home-transition \.barcode-scanner-view:not\(\.has-preview\) video \{ visibility: hidden; \}/,
  'Home must continue hiding the native video until its module receives preview readiness');
assert.match(transitionCss, /\.barcode-scanner\.scanner-home-transition \.barcode-scanner-view\.has-preview video \{ visibility: visible; \}/,
  'Home must reveal the native video through its own presentation CSS');
assert.match(transitionCss, /\.stocktake-scanner-preview:not\(\.has-preview\) video \{ visibility: hidden; \}/,
  'Stocktake must continue hiding the native video until its module receives preview readiness');
assert.match(transitionCss, /\.stocktake-scanner-preview\.has-preview video \{ visibility: visible; \}/,
  'Stocktake must reveal the native video through its own presentation CSS');

console.log('Scanner presentation ownership tests passed.');
