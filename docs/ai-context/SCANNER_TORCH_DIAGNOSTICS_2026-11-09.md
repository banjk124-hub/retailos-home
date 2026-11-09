# Scanner Torch — on-device diagnostics (2026-11-09)

## Purpose

Diagnose why Android Chrome on a Samsung Galaxy S23 Ultra does not render the Flash control in either Home Scanner or Stocktake Scanner, despite iOS working. The user tests on a physical phone and cannot conveniently inspect DevTools Console.

This PR adds observation only. It does not attempt to make an unsupported camera track appear supported.

## How to enable

Append the query parameter `?scannerDebug=1` to the deployed PWA URL. For a GitHub Pages deployment, preserve the existing path and add the query string after it.

Example shape:

```text
https://<host>/<existing-app-path>/?scannerDebug=1
```

Open either Home Scanner or Stocktake Scanner. After the preview starts, expand/read **SCANNER TORCH DIAGNOSTICS**. Four samples are collected:

- `first-frame`: immediately after the first usable video frame.
- `250ms`: 250 ms after first-frame readiness.
- `1000ms`: 1 second after first-frame readiness.
- `2500ms`: 2.5 seconds after first-frame readiness.

The diagnostic panel appears independently in both modules. Compare the values between them if needed.

## Fields

| Field | Meaning |
|---|---|
| `torchCapability` | `true`, `false`, `not-exposed` or `unavailable` from active track capabilities |
| `settingsTorch` | Actual Torch setting when the browser exposes it |
| `capabilityApi` / `settingsApi` | Whether each API exists, is missing, or threw |
| `*ErrorName` | Exception name only; exception message is not exposed |
| `applyConstraintsApi` | Whether the active track exposes the constraint application method |
| `trackReadyState` / `trackMuted` | Active track state |
| `facingMode` | Browser-reported camera direction, if available |
| `width` / `height` / `frameRate` | Active video settings, if available |
| `elapsedMs` | Time since first-frame diagnostic sample |

No `deviceId`, camera label, device enumeration, personal identifier or user-agent fingerprint is collected.

## Interpretation

- **`torchCapability=true`** — the active track advertises Torch. If the control is still absent, audit the React state bridge and feature rendering.
- **`torchCapability=false`** — the active track explicitly reports no Torch capability for this camera session.
- **`torchCapability=not-exposed`** — the capabilities API exists but does not expose a Torch property during the sampled window.
- **`torchCapability=unavailable`** — the API is missing or threw; inspect `capabilityApi` and `capabilitiesErrorName`.
- **`settingsTorch=not-exposed`** — the browser does not report the current Torch state, even if the capability itself is available.
- **`applyConstraintsApi=false`** — the active track cannot receive the standard MediaStreamTrack constraint operation used by the current implementation.

If all four samples say `not-exposed`, this is evidence about the active browser camera track, not proof that the phone lacks a physical LED. Do not infer support from model name or user-agent and do not force the UI visible.

## Scope and invariants

- Sampling is enabled only when `?scannerDebug=1` is present.
- The hook retains at most four samples.
- Follow-up timers are cleared during teardown and guarded by session generation, active track identity and disposal state.
- The diagnostic callback is optional and does not affect runtime behavior when disabled.
- No camera acquisition/lease/refcount, constraints, autofocus, camera selection, first-frame readiness, decoder, barcode validation/delivery, Torch command, lifecycle, business flow or module presentation behavior is changed.
- No native bridge, Android Camera2/CameraX integration, iOS AVFoundation integration, camera fallback or device-specific branch is introduced.

## Verification status

Automated scanner Torch tests and full CI must pass before merge. Physical-device validation is still required after deployment; CI cannot simulate camera hardware or browser capability exposure.
