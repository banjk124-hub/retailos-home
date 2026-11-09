# Current implementation status — Android Torch capability timing correction (2026-11-09)

User confirms PR #51 (optional Torch controls) has been merged, deployed and tested. iOS Torch enable/disable works reliably; Android does not display the Flash control.

## PR #52 — deferred capability discovery
- Source audit found Torch capability was read immediately after getUserMedia lease resolution, before video attachment/playback/first decoded frame.
- Move capability discovery until after playback and fresh-frame readiness. This aligns with Chromium's documented timing for camera capabilities.
- Preserve session generation/disposal guards; no camera acquisition, constraints, autofocus, decoder or UI presentation changes.
- Add safe capability diagnostics and regression coverage for a capability that becomes visible only after streaming begins.
- Android physical-device retest is pending. Inspect the `[RetailOS Scanner] Torch capability` console diagnostic. A `not-exposed` result after first frame indicates the active track does not advertise Torch; do not force the UI visible.

PR #52: https://github.com/banjk124-hub/retailos-home/pull/52.

---
