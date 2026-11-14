# PR-07 — ZXing-C++ WASM capability evidence: 180° linear reversal

**Repository branch:** `feat/scanner-wasm-capability-parity`  
**WASM package:** `zxing-wasm@3.1.6` (pinned in RetailOS `package.json` and `package-lock.json`)  
**Purpose:** prove whether the new decoder already provides the legacy 180° one-dimensional reversal behavior before adding any RetailOS transform.

## Conclusion

**The new engine already has this capability. Do not port a duplicate 180° image transform.**

The exact source dependency bundled by `zxing-wasm@3.1.6` is pinned by the package repository's git submodule:

- Package tag: [Sec-ant/zxing-wasm v3.1.6](https://github.com/Sec-ant/zxing-wasm/tree/v3.1.6)
- Pinned ZXing-C++ submodule commit: [`2c3dcfeffa7878950a58c1703c86774a428b0c91`](https://github.com/zxing-cpp/zxing-cpp/commit/2c3dcfeffa7878950a58c1703c86774a428b0c91)
- Implementation: [`core/src/oned/ODReader.cpp` at that exact commit](https://github.com/zxing-cpp/zxing-cpp/blob/2c3dcfeffa7878950a58c1703c86774a428b0c91/core/src/oned/ODReader.cpp)

## Source-level proof

In the pinned `ODReader.cpp`, `DoDecode(...)`:

1. Reads a 1D barcode scanline into `PatternRow bars`.
2. Iterates `for (bool upsideDown : {false, true})`.
3. On the second pass, calls `std::reverse(bars.begin(), bars.end())`.
4. Runs the normal row readers against that reversed pattern.
5. Corrects the decoded result coordinates for the reversed direction.

This is the engine's native 180° linear-symbol handling. It is not the same feature as rotating the full image by 90°/270°.

The same function uses `tryHarder` to scan the full set of rows rather than only a limited subset. RetailOS explicitly sets `tryHarder: true` in `src/platform/scanner/decoders/zxingWasmOptions.ts`.

## Why `tryRotate` remains false

ZXing-C++ documents `tryRotate` as trying 90°, 180° and 270° rotated images. RetailOS deliberately leaves this option false because the shared RetailOS candidate pipeline already performs its bounded 90° clockwise luminance candidate.

Enabling backend `tryRotate` would duplicate orthogonal rotation work and could add unmeasured latency. It is not needed for the 180° linear reversal described above: that behavior is performed by reversing the scanline inside `ODReader.cpp`, independently of the optional rotated-image pass.

References:

- [Pinned ZXing-C++ ReaderOptions.h](https://github.com/zxing-cpp/zxing-cpp/blob/2c3dcfeffa7878950a58c1703c86774a428b0c91/core/src/ReaderOptions.h)
- [zxing-wasm ReaderOptions documentation](https://sec-ant.github.io/zxing-wasm/docs/interfaces/full.ReaderOptions.html)

## RetailOS configuration evidence

- `createZXingWasmReaderOptions(...)` sets `tryHarder: true`.
- It sets `tryRotate: false` to avoid duplicating the shared orthogonal candidate.
- `scripts/test-scanner-decoder-capability-parity.mjs` asserts both values and documents their distinct responsibilities.
- No custom 180° transform or extra candidate is added to the shared pipeline.

## Acceptance boundary

This source proof establishes that the pinned engine implementation contains the required algorithm and that RetailOS enables its `tryHarder` path. It does **not** prove physical-device recognition parity for every RetailOS format, camera angle, image quality or device.

The same labelled corpus must still include 180° and 270° linear symbols and be run through both adapters. Record exact-match, miss, wrong-decode, false-positive and latency results. Until those measurements and iOS Safari/PWA + Android Chrome/PWA checks pass, decoder parity is not fully accepted and production cutover remains blocked.
