import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(
  new URL('../src/platform/scanner/videoPresentationLayout.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64');

let frameCount = 0;
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    requestAnimationFrame: (callback) => {
      frameCount += 1;
      queueMicrotask(() => callback(frameCount * 16));
      return frameCount;
    },
  },
});

const rect = (width, height, left = 0, top = 0) => ({ width, height, left, top, right: left + width, bottom: top + height });
const { waitForVideoPresentationLayout } = await import(moduleUrl);

// Simulate a preview whose first layout pass is stale/small, then settles.
const parent = { getBoundingClientRect: () => rect(390, 780), parentElement: null };
const videoRects = [rect(72, 41), rect(390, 780), rect(390, 780)];
const video = {
  parentElement: parent,
  getBoundingClientRect: () => videoRects[Math.min(frameCount - 1, videoRects.length - 1)],
};
await waitForVideoPresentationLayout(video);
assert.equal(frameCount, 3, 'startup waits until the video and preview geometry match and remain stable for a frame');

// Already-stable geometry should cost exactly two animation frames.
frameCount = 0;
const stableVideo = { parentElement: parent, getBoundingClientRect: () => rect(390, 780) };
await waitForVideoPresentationLayout(stableVideo);
assert.equal(frameCount, 2, 'stable startup uses only a two-frame layout barrier');

// Broken/zero-sized layout must fail within the bounded frame budget.
frameCount = 0;
const zeroParent = { getBoundingClientRect: () => rect(0, 0), parentElement: null };
const zeroVideo = { parentElement: zeroParent, getBoundingClientRect: () => rect(0, 0) };
await assert.rejects(
  waitForVideoPresentationLayout(zeroVideo),
  /layout did not stabilize/,
  'invalid preview geometry is rejected instead of presenting a broken camera layer',
);
assert.equal(frameCount, 8, 'layout readiness is bounded and cannot wait indefinitely');

const sessionSource = await readFile(
  new URL('../src/platform/scanner/universalScannerSession.ts', import.meta.url),
  'utf8',
);
const layoutWaitAt = sessionSource.indexOf('await waitForVideoPresentationLayout(this.video)');
const streamAttachAt = sessionSource.indexOf('this.video.srcObject = stream', layoutWaitAt);
const playAt = sessionSource.indexOf('await this.video.play()', streamAttachAt);
assert.ok(layoutWaitAt >= 0 && streamAttachAt > layoutWaitAt && playAt > streamAttachAt,
  'stable presentation layout must be confirmed before MediaStream attachment and play()');

console.log('Scanner presentation layout readiness tests passed.');
