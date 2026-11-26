import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/features/home/HomeScreen.tsx', import.meta.url), 'utf8');
const lookup = readFileSync(new URL('../src/features/home/hooks/useHomeBarcodeLookup.ts', import.meta.url), 'utf8');
const feedback = readFileSync(new URL('../src/features/home/hooks/useHomeFeedback.ts', import.meta.url), 'utf8');

assert.match(home, /useHomeBarcodeLookup\(\)/);
assert.match(home, /cameraLeaseRequestRef\.current = requestCameraLease\(DEFAULT_SCANNER_CAMERA_REQUEST\)/);
assert.match(home, /cameraLeaseRequestRef\.current\?\.cancel\(\)/);
assert.doesNotMatch(home, /lookupCachedBarcode|searchCachedProducts|barcodeLookupRequestIdRef/);
assert.match(lookup, /requestIdRef = useRef\(0\)/);
assert.match(lookup, /current\?\.requestId === requestId/);
assert.match(lookup, /lookupCachedBarcode\(barcode\)/);
assert.match(lookup, /searchCachedProducts\(query\)/);
assert.match(feedback, /clearTimeout\(timerRef\.current\)/);
assert.match(feedback, /timerRef\.current = window\.setTimeout/);
assert.match(feedback, /return \(\) =>/);

console.log('UI-02D lookup and feedback ownership contract tests passed.');
