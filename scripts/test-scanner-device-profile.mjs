import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const source = await read('../src/platform/scanner/scannerDeviceProfile.ts');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64');
const { resolveScannerDeviceProfile } = await import(moduleUrl);

assert.deepEqual(resolveScannerDeviceProfile({ deviceMemory: 2, hardwareConcurrency: 8 }), { profile: 'LOW', reason: 'limited_capability_hint' });
assert.deepEqual(resolveScannerDeviceProfile({ deviceMemory: 8, hardwareConcurrency: 4 }), { profile: 'LOW', reason: 'limited_capability_hint' });
assert.deepEqual(resolveScannerDeviceProfile({ deviceMemory: 8, hardwareConcurrency: 8 }), { profile: 'HIGH', reason: 'strong_capability_hints' });
assert.deepEqual(resolveScannerDeviceProfile({ deviceMemory: 8 }), { profile: 'MID', reason: 'mixed_or_mid_capability_hints' });
assert.deepEqual(resolveScannerDeviceProfile({ hardwareConcurrency: 6 }), { profile: 'MID', reason: 'mixed_or_mid_capability_hints' });
assert.deepEqual(resolveScannerDeviceProfile({}), { profile: 'LOW', reason: 'unknown_capability_conservative_fallback' });
assert.deepEqual(resolveScannerDeviceProfile({ deviceMemory: Number.NaN, hardwareConcurrency: -1 }), { profile: 'LOW', reason: 'unknown_capability_conservative_fallback' });

const hook = await read('../src/features/scanner/hooks/useScannerEngine.ts');
assert.match(hook, /detectScannerDeviceProfile\(\)/);
assert.match(hook, /profileReason: deviceProfile\.reason/);
const contracts = await read('../src/platform/scanner/contracts.ts');
assert.match(contracts, /ScannerProfileName = 'LOW' \| 'MID' \| 'HIGH'/);
const session = await read('../src/platform/scanner/universalScannerSession.ts');
assert.match(session, /deviceProfile: this\.options\.profile/);
assert.match(session, /deviceProfileReason: this\.options\.profileReason/);
assert.match(session, /const minDecodeIntervalMs = 70/);
assert.match(session, /this\.options\.formats/);

const emitBlock = session.slice(session.indexOf('private emitDiagnostics()'));
assert.match(emitBlock, /this\.diagnosticDecodeDurationTotalMs = 0/);
assert.match(emitBlock, /this\.diagnosticDecodeDurationMaxMs = 0/);
const processBlock = session.slice(session.indexOf('private async processFrame'), session.indexOf('private handleFocusQuality'));
assert.match(processBlock, /recordDecodeDuration/);

assert.ok(!source.includes('userAgent'));
assert.ok(!source.includes('getBattery'));
console.log('Scanner adaptive device profile and runtime telemetry tests passed.');
