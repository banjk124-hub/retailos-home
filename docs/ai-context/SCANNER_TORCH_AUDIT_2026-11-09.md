# Scanner Torch Capability Audit — 2026-11-09

## Baseline
- Repository: `banjk124-hub/retailos-home`
- Implementation branch: `feat/scanner-torch-control`
- Draft PR: #51 — Optional Camera Torch Controls
- Base SHA: `6f821bde716c958147113f66d626c53882414108`
- Current status: implementation committed; automated CI and physical-device QA pending.

## Source ownership
- `src/platform/scanner/scannerTorch.ts`: reads active video-track capabilities/settings and applies the advanced `torch` constraint. Unsupported and rejected requests resolve as non-fatal capability state.
- `src/platform/scanner/contracts.ts`: typed `ScannerTorchState`, optional state observer, and explicit session control methods.
- `src/platform/scanner/universalScannerSession.ts`: binds Torch to the active video track, guards async completion by session generation and track identity, and clears state during teardown.
- `src/features/scanner/hooks/useScannerEngine.ts`: exposes state and enable/disable operation to feature code; it does not render controls.
- `BarcodeScanner.tsx` and `StocktakeScanner.tsx`: independently render their own flash controls only when the active track advertises support.
- `scanner-transition.css`: styles feature-owned controls without styling or animating the native video surface.

## Behavior contract
1. Camera acquisition remains unchanged.
2. Torch is not enabled automatically.
3. Applying Torch preserves existing track constraints; when unavailable, the adapter pins active width, height and frame rate from `getSettings()` so a toggle does not silently reset camera quality.
3. Capability is discovered from the actual active video track, not browser/user-agent heuristics.
4. A module can ignore the capability; both current modules consume it.
5. Repeated taps are blocked while an applyConstraints request is pending.
6. Unsupported hardware and rejected constraints do not fail or stop barcode scanning.
7. Suspend/close/recovery clears the previous track state. Late async results from a retired track cannot update the current session.
8. Camera/decoder startup and lifecycle events do not depend on Torch.

## Verification required
- Automated: supported/unsupported capability, enable/disable, rejected constraint, session-generation guard, module UI wiring, full preflight and both builds.
- iOS Safari/PWA: verify capability visibility; enable/disable if exposed; rapid toggle; close while on; background/foreground recovery; unsupported state.
- Android Chrome/PWA: same checks, including a device with rear flash hardware and a device/camera mode without Torch if available.
- Confirm preview and barcode decoding remain stable while toggling. Confirm Torch turns off when scanner closes or loses its active track.

## Evidence boundary
Do not claim all iPhones/Android devices support Torch. Browser capability reporting and actual hardware behavior vary; unsupported devices must continue scanning normally.