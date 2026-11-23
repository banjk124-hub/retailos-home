# SC-01A — Worker feasibility and transport study

**Date:** 2026-11-22  
**Status:** Research note retained. SC-01A/01B Worker source is merged to main in isolation; SC-01C scheduling work is on the current PR. CI/source-contract checks are available. Empirical built-worker transport/browser performance remains BLOCKED pending local/browser execution.  
**Branch:** `docs/scanner-sc01-05-roadmap`  
**Production source changed:** No.

## 1. Source facts

- `ScannerDecoderAdapter` is the execution boundary: `initialize()`, `decode(source: CanvasImageSource, options)`, temporal snapshot decoding and `dispose()`. It explicitly must not acquire camera, mutate video, schedule frames, or own UI/business logic.
- `defaultScannerDecoderFactory` lazy-imports `ZXingWasmDecoderAdapter`.
- `UniversalScannerSession` owns the session lifecycle, camera lease, frame readiness/scheduling and decoder interaction; Home/Stocktake use `useScannerEngine`.
- The current adapter imports `prepareZXingModule/readBarcodes` from `zxing-wasm/reader`, imports the reader WASM as a Vite `?url` asset, and uses `locateFile` to resolve that asset.
- Adapter processing expects `CanvasImageSource`, and current image-processing/decode work uses canvas/pixel paths. This means a Worker adapter will need a deliberate frame-to-worker input representation and cannot simply pass the existing video element/canvas context into the Worker.
- Vite config uses React plugin and a post-build PWA artifact inventory that collects built assets; Worker chunks and WASM asset inclusion still need build verification in a spike.

## 2. API research findings (official documentation)

### Transferable frame objects
`VideoFrame` is transferable and available in Dedicated Workers. MDN classifies it as Baseline 2024, meaning current modern browsers generally support it, but older devices/browser versions may not. That makes it a candidate primary transport, not an unconditional requirement. 

References: [VideoFrame API](https://developer.mozilla.org/en-US/docs/Web/API/VideoFrame), [VideoFrame constructor](https://developer.mozilla.org/en-US/docs/Web/API/VideoFrame/VideoFrame).

### ImageBitmap
`ImageBitmap` is transferable and suitable for Worker messages. Resource lifetime must be explicit; if not consumed by an API that takes ownership, call `close()` when done. Avoid holding multiple unneeded frame resources. 

Reference: [Transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects).

### OffscreenCanvas
`OffscreenCanvas` can run Canvas work in a Worker and is itself transferable. It is a processing surface, not a frame transport decision. Its support and context availability should be checked separately. 

Reference: [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas).

### Vite Worker build
The project uses Vite 6.4.5. The conventional module Worker pattern supported by Vite is `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`; worker imports and assets must be verified in both production and Pages builds. No new worker plugin/dependency is recommended at this stage.

### ZXing WASM
The package supports `prepareZXingModule` with a custom `locateFile` hook and explicit initialization via `fireImmediately: true`. The existing Vite `?url` import pattern is a strong candidate to reuse inside the Worker bundle, but this remains unverified for this project’s actual Worker chunk and GitHub Pages base path until the prototype build is executed. Worker initialization should occur in the Worker context and be tested for single-instance initialization/retry behavior. 

Reference: [zxing-wasm upstream README](https://github.com/Sec-ant/zxing-wasm).

## 3. Transport recommendation — provisional

1. **Prototype VideoFrame first**, only if creation from the live `HTMLVideoElement`, transfer, Worker-side pixel access/Canvas draw and close semantics pass tests in target browsers. Because compatibility is not universal, detect at runtime and never rely on user-agent strings.
2. **Prototype ImageBitmap second** as a compatibility transport. Compare end-to-end frame capture + transfer + worker draw/readback cost, not decode time alone. Explicitly close replaced/consumed bitmaps.
3. **Use Worker Canvas/OffscreenCanvas opportunistically**, only if the worker pipeline actually needs a canvas context and it provides measurable benefit. Avoid tying support for Worker decode to OffscreenCanvas availability.
4. **ImageData/ArrayBuffer fallback** only when needed; document copies and bounded pixel budget.
5. **Existing Main Thread adapter fallback** when Worker setup, WASM init, frame transport or decode path fails. Preserve exact ROI, format list, candidate ordering, validation and result gating. Fallback cadence may be bounded to prevent UI overload but correctness behavior cannot be weakened.

This ranking is a hypothesis to test—not an observed speed ranking. API support alone does not prove lower copy cost or better scanner latency.

## 4. Prototype test matrix (SC-01A)

| Test | Record |
|---|---|
| Worker creation and module load | Success, error, Pages base-path correctness |
| Worker WASM init | Cold init time, warm decode, init rejection/retry |
| VideoFrame | Construct from video, transfer ownership, dimensions/pixel access, close |
| ImageBitmap | Capture, transfer, draw/readback, explicit close |
| OffscreenCanvas | 2D context available in worker; fallback when unavailable |
| Frame payload | Capture+transfer+worker processing latency and allocations |
| ROI | Snapshot sent to worker; exact source ROI crop and bounded pixel dimensions |
| Backpressure | 1 in-flight + latest pending; pending replacement resource closed |
| Cancellation | Session/job invalidation, stale-result discard, close during synchronous WASM |
| Build | TypeScript, Vite production build, Pages build, release-manifest worker/WASM inclusion |
| Recognition regression | Existing labelled positive/negative corpus; exact match, miss, wrong decode, false positive |

## 5. Measurement protocol

For each transport, use the same corpus, same ROI, same formats/options, warmed and cold states, repeated runs, and device/browser identifiers only locally. Measure:
- frame acquisition/construction;
- transfer/worker queue delay;
- worker ROI/readback and processing;
- decode duration;
- total request-to-result;
- Main Thread long tasks/UI frame responsiveness;
- exact match/miss/wrong decode/false positive;
- memory observations and resource counts where available.

Report median/P95 with sample size and avoid exporting barcode payloads or persistent device IDs. A live-camera probe must be separated from still-image corpus measurements.

## 6. Current conclusion

**Architecture recommendation:** keep the adapter/session contracts; add Worker execution behind the adapter/runtime boundary only after SC-01A’s actual compatibility and performance proof. VideoFrame is the leading transport candidate, ImageBitmap is the fallback candidate, and OffscreenCanvas is optional worker-side tooling.

**Still not proven:** actual built-Worker transport support/performance in RetailOS browsers, WASM loading under the Pages base path for a Worker runtime, transfer/capture cost, performance improvement, accuracy parity, memory behavior and fallback correctness. User's general deployed scanner validation does not count as Worker prototype runtime QA because the Worker remains unintegrated.
