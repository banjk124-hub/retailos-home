import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/platform/scanner/barcodeValidation.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = "data:text/javascript;base64," + Buffer.from(compiled).toString("base64");
const { validateBarcodePayload, hasValidGs1CheckDigit } = await import(moduleUrl);

assert.equal(hasValidGs1CheckDigit("4006381333931"), true, "valid EAN-13 check digit");
assert.equal(validateBarcodePayload("4006381333931", "EAN_13").valid, true, "valid EAN-13 accepted");
assert.equal(validateBarcodePayload("96385074", "EAN_8").valid, true, "valid EAN-8 accepted");
assert.deepEqual(validateBarcodePayload("4006381333932", "EAN_13"), {
  valid: false,
  reason: "invalid-check-digit",
});
assert.equal(validateBarcodePayload("ABC 123", "CODE_128").valid, true, "CODE-128 remains opaque text");
assert.deepEqual(validateBarcodePayload("ABC\u0000 123", "CODE_128"), {
  valid: false,
  reason: "control-character",
});
const luminanceSource = await readFile(
  new URL("../src/platform/scanner/decoders/rgbaToLuminance.ts", import.meta.url),
  "utf8",
);

const luminanceCompiled = ts.transpileModule(luminanceSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const luminanceModuleUrl =
  "data:text/javascript;base64," +
  Buffer.from(luminanceCompiled).toString("base64");

const { rgbaToLuminance } = await import(luminanceModuleUrl);

// Black, white, red, green, blue and middle gray.
const rgbaFixture = new Uint8ClampedArray([
  0, 0, 0, 255,
  255, 255, 255, 255,
  255, 0, 0, 255,
  0, 255, 0, 255,
  0, 0, 255, 255,
  128, 128, 128, 255,
]);

const grayscale = rgbaToLuminance(rgbaFixture, 3, 2);

assert.deepEqual(
  Array.from(grayscale),
  [0, 255, 76, 150, 29, 128],
  "RGBA pixels convert to one grayscale byte per pixel",
);

assert.equal(
  grayscale.length,
  6,
  "grayscale output contains exactly one byte per pixel",
);

// Alpha must not affect the luminance value.
const alphaFixture = new Uint8ClampedArray([
  100, 100, 100, 0,
  100, 100, 100, 255,
]);

assert.deepEqual(
  Array.from(rgbaToLuminance(alphaFixture, 2, 1)),
  [100, 100],
  "alpha channel is ignored",
);

assert.throws(
  () => rgbaToLuminance(new Uint8ClampedArray([0, 0, 0, 255]), 2, 1),
  /RGBA buffer length/,
  "invalid RGBA buffer dimensions are rejected",
);

assert.throws(
  () => rgbaToLuminance(new Uint8ClampedArray(0), 0, 1),
  /Invalid image dimensions/,
  "zero-sized images are rejected",
);


const cameraDiagnosticsSource = await readFile(
  new URL("../src/shared/services/cameraDiagnostics.ts", import.meta.url),
  "utf8",
);
const cameraDiagnosticsCompiled = ts.transpileModule(cameraDiagnosticsSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const cameraDiagnosticsUrl =
  "data:text/javascript;base64," +
  Buffer.from(cameraDiagnosticsCompiled).toString("base64");
const {
  requestContinuousAutofocus,
  getSafeCameraSettings,
} = await import(cameraDiagnosticsUrl);

let appliedFocusConstraints = null;
const continuousTrack = {
  getCapabilities: () => ({ focusMode: ["manual", "continuous"] }),
  applyConstraints: async (constraints) => { appliedFocusConstraints = constraints; },
  getSettings: () => ({
    width: 1280,
    height: 720,
    frameRate: 30,
    facingMode: "environment",
    focusMode: "continuous",
    deviceId: "must-not-be-exported",
  }),
};
const continuousFocus = await requestContinuousAutofocus(continuousTrack);
assert.equal(continuousFocus.status, "continuous-requested");
assert.deepEqual(appliedFocusConstraints.advanced[0], { focusMode: "continuous" });

const unsupportedTrack = {
  getCapabilities: () => ({ focusMode: ["manual"] }),
  applyConstraints: async () => { throw new Error("must not be called"); },
};
assert.equal((await requestContinuousAutofocus(unsupportedTrack)).status, "unsupported");

const unavailableTrack = {};
assert.equal((await requestContinuousAutofocus(unavailableTrack)).status, "unavailable");

const failedTrack = {
  getCapabilities: () => ({ focusMode: ["continuous"] }),
  applyConstraints: async () => { throw new DOMException("not supported", "OverconstrainedError"); },
};
const failedFocus = await requestContinuousAutofocus(failedTrack);
assert.equal(failedFocus.status, "failed");
assert.equal(failedFocus.errorName, "OverconstrainedError");

const safeSettings = getSafeCameraSettings(continuousTrack);
assert.deepEqual(safeSettings, {
  width: 1280,
  height: 720,
  frameRate: 30,
  facingMode: "environment",
  focusMode: "continuous",
});
assert.equal("deviceId" in safeSettings, false, "camera device identifiers are never exposed");

console.log("Scanner barcode validation, luminance, and camera stability regression tests passed.");
