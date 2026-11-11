import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(
  new URL('../src/shared/services/mediaTrackConstraints.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const url = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64');
const { applyTrackAdvancedConstraint } = await import(url);

let activeConstraints = {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  frameRate: { ideal: 30, max: 30 },
  facingMode: { ideal: 'environment' },
  advanced: [{ focusMode: 'continuous' }],
};
let applyCount = 0;
let resolveFirst;
const track = {
  getConstraints: () => activeConstraints,
  getSettings: () => ({ width: 1920, height: 1080, frameRate: 30, facingMode: 'environment' }),
  applyConstraints: async (constraints) => {
    applyCount += 1;
    if (applyCount === 1) {
      await new Promise((resolve) => { resolveFirst = resolve; });
    }
    activeConstraints = constraints;
  },
};

const torchOnRequest = applyTrackAdvancedConstraint(track, 'torch', true);
const torchOffRequest = applyTrackAdvancedConstraint(track, 'torch', false);
assert.equal(applyCount, 0, 'track updates enter the shared serialized queue');
await new Promise((resolve) => setImmediate(resolve));
assert.equal(applyCount, 1, 'the first camera tuning request owns the track while pending');
resolveFirst();
await Promise.all([torchOnRequest, torchOffRequest]);
assert.equal(applyCount, 2, 'the second camera tuning request runs after the first settles');
assert.deepEqual(activeConstraints.width, { ideal: 1920 });
assert.deepEqual(activeConstraints.height, { ideal: 1080 });
assert.deepEqual(activeConstraints.frameRate, { ideal: 30, max: 30 });
assert.deepEqual(activeConstraints.facingMode, { ideal: 'environment' });
assert.deepEqual(activeConstraints.advanced, [
  { focusMode: 'continuous' },
  { torch: false },
], 'Torch updates must preserve the optional continuous-focus preference negotiated at camera acquisition');

console.log('Scanner Torch constraint serialization and focus-preservation tests passed.');
