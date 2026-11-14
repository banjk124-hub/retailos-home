# Scanner decoder benchmark foundation — historical baseline

**Current policy:** production and the dev-only benchmark now use ZXing-C++ WASM only. The two-engine comparison described below was used during migration and is retained here as historical decision context; it is not an active runtime or benchmark path.

# Scanner Decoder PR-05 — Benchmark & Evidence Foundation

**Base:** `main` after PR #111, merge commit `e5e85eda44b1de40d29e6b6fa3131514414fecb0`.
**Branch:** `feat/scanner-decoder-benchmark-foundation`.
**Purpose:** backfill the capability-evaluation and repeatable measurement gate before any decoder default switch or recognition-policy reduction.
**Historical runtime policy at PR-05:** no production runtime changes; ZXing JS was the default and ZXing-C++ WASM was opt-in.

## 1. Audit conclusion

PR #107–#111 established source inventory, decoder factory injection, opt-in WASM integration and shared synchronous/asynchronous recognition candidate ordering. However, the original Phase 0 sequence required an isolated capability evaluation and a repeatable corpus before candidate integration. That evidence gate was not completed before PR #110/#111.

PR-05 therefore does not add another recognition algorithm. It supplies a dev-only browser harness and a versioned manifest contract so the two existing adapters can be measured on identical images and strict ROI definitions.

## 1.1 Historical benchmark work

PR #7 (closed without merge) previously proposed a still-image harness for Native BarcodeDetector versus the then-current ZXing adapter. Its files are not present in current `main`, and its decoder contract predates the current adapter factory, WASM candidate and shared recognition pipeline.

PR-05 does not copy that implementation unchanged:
- the old harness targeted Native BarcodeDetector, not the current ZXing JS versus ZXing-C++ WASM decision;
- it called the older adapter shape without the current required strict source-frame ROI contract;
- its CSV included expected payloads and raw decoded values, while PR-05 exports only match/outcome metadata.

The previous PR remains useful as historical design evidence for paired still-image runs, repeated attempts, device metadata and local-only fixture handling. PR-05 carries those ideas forward under the current decoder contract and privacy boundary.

Historical reference: https://github.com/banjk124-hub/retailos-home/pull/7

## 2. Candidate API evaluation

### Direct `zxing-wasm/reader` — selected for the candidate adapter

The pinned project dependency is `zxing-wasm@3.1.6`. Its reader API accepts `ImageData` and exposes ReaderOptions for:
- explicit formats and symbol limits;
- binarizer selection;
- `tryHarder`, `tryRotate`, `tryInvert`, `tryDownscale` and experimental denoise;
- text mode, checksum and downscale controls.

This control surface is better aligned with RetailOS's need to keep format allowlists explicit and benchmark backend behavior without silently changing the recognition policy.

### `barcode-detector/ponyfill` — not selected for this phase

The ponyfill exposes the standard Barcode Detection API shape: explicit format selection and `detect(image)`, plus WASM module preparation/asset configuration. It is attractive for a generic browser API boundary, but its documented high-level surface does not expose the same ReaderOptions control set required for a controlled comparison of binarizer, rotation, inversion, downscale and harder-read behavior.

It remains a possible future adapter if RetailOS chooses a simpler standard API contract. PR-05 does not add it as a dependency because that would add a third WASM wrapper without a demonstrated operational benefit.

### API decision boundary

This is an API/control-surface decision, not an accuracy or performance verdict. The package documentation does not prove iOS/Android compatibility, faster decode, lower memory or higher recognition rate. Those require the corpus and device runs below.

References:
- https://sec-ant.github.io/zxing-wasm/docs/interfaces/full.ReaderOptions.html
- https://github.com/Sec-ant/barcode-detector#api
- https://www.npmjs.com/package/zxing-wasm/v/3.1.6

## 3. Harness behavior

The isolated page is served only through the Vite development server at `/scripts/scanner-benchmark/`. It is not imported by the production app entry point and does not add UI or runtime code to Home/Stocktake.

The harness:
- instantiates the existing ZXing JS and ZXing-C++ WASM decoder adapters sequentially;
- supplies the same source image, manifest ROI and manifest-derived active-format allowlist to both;
- measures backend initialization separately from per-image decode attempts;
- supports repeated trials and selectable backend order;
- scores exact payload + symbology matches, misses, wrong decodes, negative-control false positives and runtime errors;
- reports initialization duration, aggregate p50/p95, first-trial p50 and steady-trial p50/p95 adapter decode duration, geometry availability, plus optional browser heap observations;
- records the locked backend versions: `@zxing/library` 0.23.0 and `zxing-wasm` 3.1.6;
- exports environment metadata and per-case outcomes without exporting expected/decoded barcode payloads or image pixels.

The benchmark deliberately does **not** measure camera acquisition, first-result end-to-end latency, session cadence, frame drops, full application CPU, or production memory high-water mark. Do not label adapter timing as overall scanner response time.

## 4. Corpus manifest contract

A corpus is local operator/test data. Physical label photos must not be committed to the repository without an explicit privacy/data review. Ground-truth payloads remain in the local manifest and are used only for exact-match scoring.

Example:

```json
{
  "schemaVersion": 1,
  "corpusId": "retail-labels-local-v1",
  "cases": [
    {
      "id": "ean13-front-001",
      "image": "ean13-front-001.png",
      "captureKind": "physical",
      "expected": { "value": "8938505974195", "symbology": "EAN_13" },
      "scanRegion": {
        "coordinateSpace": "source-frame-normalized",
        "rect": { "x": 0.1, "y": 0.2, "width": 0.8, "height": 0.6 }
      },
      "labels": {
        "orientation": "0",
        "lighting": "normal",
        "surface": "matte",
        "deviceClass": "mid"
      }
    },
    {
      "id": "blank-negative-001",
      "image": "blank-negative-001.png",
      "captureKind": "physical",
      "expected": null,
      "scanRegion": {
        "coordinateSpace": "source-frame-normalized",
        "rect": { "x": 0.1, "y": 0.2, "width": 0.8, "height": 0.6 }
      },
      "labels": { "orientation": "0", "lighting": "normal", "surface": "matte" }
    }
  ]
}
```

The manifest validator rejects duplicate IDs, invalid formats, path traversal, missing labels and invalid/out-of-bounds source-frame ROIs. Negative cases use `expected: null`; any decoder output is scored as a false positive.

## 5. Running the isolated harness\n\n1. Run `npm run dev -- --host 0.0.0.0`.\n2. Open `/scripts/scanner-benchmark/` on the desktop or target device using the same development server.\n3. Load a local manifest JSON and select all corresponding image files.\n4. Run at least three repeats, then repeat with backend order reversed.\n5. Export the JSON report and retain the manifest/corpus version alongside it.\n\nThe page supports multi-file selection and falls back from `createImageBitmap` to an `HTMLImageElement` decode path for browser compatibility. It does not request camera permission. Use a secure origin where the browser requires it for WASM or modern image APIs.\n\n## 6. Required capture matrix

Collect each enabled symbology represented in the corpus, including EAN-8, EAN-13, UPC-A, UPC-E, CODE-128, CODE-39, CODE-93, ITF, Codabar, GS1 DataBar, GS1 DataBar Expanded, QR Code, Data Matrix, PDF417, Aztec, MaxiCode and Micro QR Code, across:
- upright, 90°/180°/270° and representative in-plane skew;
- barcode pixel height bands (record source pixels; do not infer physical distance);
- center, each ROI edge, partial clipping and outside-ROI negative controls;
- normal, low and uneven light; shadow; low contrast; blur/motion;
- matte, glossy/reflective, shrink-wrap, glass, curved and modestly deformed carriers;
- iOS Safari tab + installed PWA and Android Chrome tab + installed PWA;
- low-capability, mainstream and high-capability devices.

Record device/browser/OS, actual camera track settings, source resolution, ROI, capture conditions and sample counts. Do not record employee identity, camera device IDs or persistent device identifiers.

## 7. Decision metrics and acceptance

Report separately for each backend, device/browser and condition:
- exact-match rate on positive cases;
- miss and wrong-decode counts;
- false-positive rate on negative controls;
- initialization duration;
- adapter decode p50/p95;
- optional heap observations, clearly marked unsupported where the browser does not expose them.

Do not aggregate all conditions into one headline percentage if the sample mix differs. Report denominators and sample counts. Repeat runs in both backend orders to expose warm-up/order effects. Confidence intervals should be added when the corpus reaches sufficient sample volume.

**Backend selection remains blocked** until a labelled physical corpus and iOS/Android device evidence exist. CI only validates harness contracts and does not create physical-device evidence.

## 8. Protected scope

No changes to:
- production decoder default or factory selection;
- camera lease, camera request, autofocus, Torch or lifecycle/recovery;
- frame cadence, strict ROI policy, validation or temporal fallback semantics;
- Home/Stocktake presentation, lookup, form-fill or explicit-save behavior;
- auth, backend, storage, service worker, deployment or business workflows.

## 9. Validation boundary and next work

- Automated CI validates manifest scoring and the dev-only harness contract.
- Manual browser runs must use the same manifest/images and be performed on target physical devices.
- The user-supplied real-label corpus is still required; no physical samples or performance claims are fabricated by this PR.
- After evidence is collected, a separate PR can evaluate candidate option tuning or isolate a real parity defect. Do not change the default backend in PR-05.
