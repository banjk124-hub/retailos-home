# RetailOS Universal Scanner Engine — Engineering Specification

Status: proposed foundation; implementation and device verification are in progress.
Branch: `phase-2-universal-scanner-foundation`
Baseline: `main` at the branch creation point.

## Product decision

Replace the current feature-coupled scanner implementation with one platform engine and feature-owned presentations. Do not replace ZXing blindly. First compare native BarcodeDetector, the installed ZXing implementation, and a verified ZBar/WebAssembly candidate using the same fixtures and physical devices.

## Non-negotiable boundaries

1. Only the platform scanner engine may call `navigator.mediaDevices.getUserMedia()`.
2. One camera lease/owner at a time across all modules.
3. Modules own presentation, overlay rendering, result placement, and business actions.
4. Decoder adapters own decoding only; they never acquire or release camera streams.
5. A normalized result contains value, symbology, geometry when available, timestamp, and decoder metadata.
6. Audio/haptics are best-effort feedback services and never block result delivery.
7. Lifecycle transitions are serialized and generation-safe. Stale asynchronous work cannot attach, publish results, or release a newer owner's stream.
8. No background camera polling. Suspend on hidden/background and resume on foreground through a controlled state machine.
9. Resolution, ROI, frame scheduling, and decoder cadence are measured per device class; do not hard-code assumptions from desktop tests.
10. Keep the current Home lookup and Stocktake form-fill/explicit-save contracts unchanged during migration.

## Target package boundaries

- `src/platform/scanner/core`: engine facade, state machine, ownership, lifecycle.
- `src/platform/scanner/camera`: permission/capability queries, acquisition, constraints, stream lifecycle.
- `src/platform/scanner/decoders`: decoder adapter contract and implementations.
- `src/platform/scanner/feedback`: audio and haptic feedback.
- `src/platform/scanner/geometry`: frame-to-preview coordinate mapping.
- Feature modules: independent presentation and business callbacks only.

The exact folder layout may be adjusted after inspecting current imports; the boundaries must remain.

## Normalized contracts

A result must preserve barcode value as a string. EAN-8 and EAN-13 validation is symbology-specific. CODE-128 is opaque text and must not be coerced to a number.

Geometry is expressed in source-frame coordinates and includes frame dimensions. Consumers must transform it to displayed video coordinates, accounting for crop, object-fit, orientation, and mirroring. Geometry may be unavailable for a decoder; the API must express that honestly.

Profiles are hints, not guarantees. A profile may request preferred width/height, facing mode, frame rate, and ROI. The engine reports actual `MediaTrackSettings` and must tolerate browsers returning different settings.

## Lifecycle requirements

Required states: idle, requesting, initializing, ready, scanning, suspended, recovering, stopped, error, disposed.

Required behaviors:
- Idempotent open/start/stop/close.
- One owner and one decoder loop.
- Coalesced focus/pageshow/visibility signals.
- Suspend stops frame processing and releases or stops camera according to the platform policy; no claim of camera availability while suspended.
- Resume reacquires only after checking current ownership and visibility.
- Close invalidates pending work before releasing owned resources.
- Track-ended and permission/device errors are classified and surfaced.
- Recovery is bounded; no infinite automatic retry.
- A stale session may release only its own stream.
- Result callbacks from stale generations are ignored.

## Feedback requirements

- AudioContext is created/resumed only from a direct user gesture.
- Reuse audio nodes/context where safe; no network audio asset.
- Audio gain is configurable but cannot override OS/device volume.
- Android vibration is feature-detected. iOS vibration is not promised unless the runtime exposes a real supported API.
- Feedback runs once per accepted result and never blocks result callbacks.

## Frame pipeline

Prefer `requestVideoFrameCallback` when available, with a tested fallback. Never enqueue an unbounded frame queue. If a decode is in progress, drop stale frames rather than accumulating latency. Worker/WASM transfer strategy must be benchmarked; do not assume GPU is faster.

## Migration policy

Build the new engine alongside the current scanner. Do not delete or rewrite the current scanner until:
- adapter benchmark has evidence on iOS Safari and Android Chrome;
- lifecycle tests cover pending acquisition, close, suspend/resume, track-ended, and stale generations;
- Home and Stocktake consumer contracts pass regression checks;
- the user has reviewed the migration PR.

No direct writes to `main`, no merge, and no deployment without explicit approval.
