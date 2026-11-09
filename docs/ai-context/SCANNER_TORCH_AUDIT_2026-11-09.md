# Scanner Torch Capability Audit — final outcome (2026-11-09)

## Decision
RetailOS retains the existing browser-based, capability-gated Torch implementation. No Android native camera bridge or device-specific workaround will be introduced solely to expose Flash on one tested device.

## Verified platform evidence
- iOS Safari/PWA: user confirms Flash toggles normally.
- Android Chrome / Samsung Galaxy S23 Ultra: active rear camera track is live at 1280×720 / 30 FPS. `getCapabilities()` and `applyConstraints()` exist, but `capabilities.torch` and `settings.torch` are not exposed.
- The temporary PR #54 compatibility probe sent an advanced Torch ON request followed by OFF. Both promises resolved, but the physical LED did not illuminate. API acceptance is not proof that the hardware setting was applied.
- The result applies to the tested device/browser/camera path; it does not imply that all Android devices lack Torch support.

## Production source ownership
- `src/platform/scanner/scannerTorch.ts`: reads Torch support from the active video track and applies ON/OFF only when the track advertises support. It preserves active camera constraints.
- `src/platform/scanner/contracts.ts`: exposes `ScannerTorchState` and the production session control methods only.
- `src/platform/scanner/universalScannerSession.ts`: binds Torch after playback and first-frame readiness; guards async completion by session generation and track identity; clears state during teardown.
- `src/features/scanner/hooks/useScannerEngine.ts`: bridges Torch state and enable/disable operations; contains no debug query, probe or diagnostic sampling.
- `BarcodeScanner.tsx` and `StocktakeScanner.tsx`: independently render Flash controls only when the active track advertises support.
- `scanner-transition.css`: styles feature-owned Flash controls.

## Production behavior contract
1. Camera acquisition constraints, resolution/FPS targets and autofocus remain unchanged.
2. Torch is never enabled automatically.
3. The active track must report `getCapabilities().torch === true` before a Flash control is shown or a Torch command is sent.
4. Applying Torch preserves existing track constraints and unrelated advanced constraints.
5. Unsupported or rejected Torch remains non-fatal; preview and barcode decoding continue.
6. Repeated toggles are serialized while an applyConstraints request is pending.
7. Session teardown, suspend and recovery clear the previous track's Torch state. Late results from retired tracks cannot mutate a replacement session.
8. Home and Stocktake own their independent presentation; the shared engine owns only capability/state/control.

## Investigation tooling retirement
The PR #53 diagnostic sampler/panel and PR #54 capability-bypass pulse were temporary. The cleanup branch removes their production bundle code, timer scheduling, React/session state, contracts, test fixtures and runbook. The automated suite retains only production behavior regression coverage.

## Future compatibility gate
A future Android change requires reproducible evidence that a named browser/device/OS combination can physically turn the LED on and off through a supported API. A resolved promise alone is insufficient. Do not add model sniffing or capability bypasses.
