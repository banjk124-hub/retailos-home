# Scanner decoder benchmark harness

## Run locally

1. Pull the scanner foundation branch and run `npm install` if dependencies are not installed.
2. Start the Vite development server with `npm run dev`.
3. Open `/scanner-benchmark.html` on the target device. Use HTTPS when testing camera-adjacent browser capabilities; this harness itself reads selected image files and does not request camera permission.
4. Select the same fixture images on each device/backend, enter the exact printed payload and symbology, and run at least 10 measured attempts per fixture.
5. Export the CSV and preserve it with device, OS, browser, and PWA-mode details.

## What it measures

- Exact payload + symbology match rate.
- Unexpected decoded values as false positives.
- Per-attempt still-image decode latency; median and p95 in the UI.
- Availability of normalized geometry.
- Initialization/decode errors.

Two warm-up attempts are excluded by default. ZXing and Native BarcodeDetector receive the same ImageBitmap fixture. Native is marked unavailable for a fixture when its requested format is not supported; this is reported as initialization errors, not a zero-speed result.

## Important limits

This is a still-image decoder comparison, not a live-camera benchmark. It does not measure camera acquisition, autofocus, frame cadence, dropped frames, thermal throttling, battery use, or lifecycle recovery. Those require the later physical-device live-camera QA phase.

The harness is intentionally local-only: images and expected payloads remain in the browser tab. Use synthetic/test labels only. Never use customer, employee, or operational data as fixtures.

## Fixture coverage

Use the fixture groups in `SCANNER_BENCHMARK_FIXTURES.md`. Ensure each expected payload is recorded exactly as printed; do not normalize leading zeroes or convert payloads to numbers.
