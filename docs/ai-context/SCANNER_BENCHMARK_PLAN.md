# Universal Scanner Decoder Benchmark

Status: planned; no physical-device results recorded yet.
Branch: `phase-2-universal-scanner-foundation`

## Candidates

1. Native `BarcodeDetector` where the browser exposes it and the requested formats are supported.
2. Existing `@zxing/browser` + `@zxing/library` implementation as the baseline.
3. ZBar WebAssembly candidate only after package provenance, maintenance, license, bundle size, browser support, and API/geometry support are verified. Do not add an unverified package or silently replace the baseline.

A commercial SDK evaluation is a fallback only if open-source candidates fail the agreed accuracy/latency requirements or device coverage.

## Controlled test matrix

Test the same printed labels and image/video samples across all candidates:
- EAN-8
- EAN-13
- CODE-128 (numeric and alphanumeric payloads)
- supported/unsupported formats
- clean print, low contrast, glare, slight blur, perspective, small barcode, partial occlusion
- multiple barcodes in one frame

Record the exact expected payload and symbology for every fixture. Include negative fixtures to measure false positives.

## Device matrix

Minimum:
- iPhone Safari browser.
- iPhone installed PWA (Add to Home Screen).
- Android Chrome browser.
- Android installed PWA.

Record model, OS version, browser version, app mode, camera facing, actual track settings, and thermal/battery observations. Do not infer iOS results from desktop Safari or simulator results.

## Metrics

Per candidate/device/fixture:
- capability and format support;
- decoder initialization duration;
- camera request duration;
- first video frame duration;
- first successful decode duration;
- per-frame decode latency (P50/P95);
- successful decode rate and time-to-decode;
- false positive count;
- geometry availability and geometry error;
- CPU/memory observations where measurable;
- resume latency after background/lock;
- bundle/WASM transfer size and cache behavior.

Use monotonic time (`performance.now()`) for durations. Separate camera startup latency from decoder initialization and first-decode latency. Report P50/P95 and fixture counts; never fabricate results.

## Decision gate

Choose the default backend only when:
- it correctly supports the required symbologies;
- it passes the same fixture suite on both platforms;
- false positives are zero in the agreed test set;
- accuracy is not materially worse than the best candidate;
- latency and resource use are acceptable on physical devices;
- geometry is sufficient for the overlay use case, or the feature can gracefully omit it;
- licensing and maintenance are acceptable.

Native BarcodeDetector is an optional acceleration path, never the only path unless iOS Safari support is proven on the actual target versions.

## Benchmark result template

| Candidate | Device/browser | Format | Fixtures | Success | False positives | Init ms | First decode ms | Decode P50/P95 | Geometry |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

No benchmark row may be filled with estimates. Use TBD until measured.
