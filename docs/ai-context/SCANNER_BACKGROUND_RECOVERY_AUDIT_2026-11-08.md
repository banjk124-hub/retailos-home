# Historical scanner background/foreground recovery audit — 2026-11-08 (pre PR #43)

## Baseline
- Main: `ee98a4c35cc6742db20e46165f55216305485205` (PR #37 / C1 merge).
- Historical work branch: `fix/scanner-cross-platform-lifecycle-recovery`.
- Historical PR state at audit time: #38 was Draft. The shared recovery work was subsequently merged to main and extended by PR #43; see ADR-014 and current Implementation Status.
- Scope: shared scanner lifecycle only. iOS is the primary reported failure; Android behavior must remain equivalent and regression-free.

## User-observed failure
While a scanner is open:
1. App moves to background and returns; camera surface may show no live video.
2. A further background/foreground cycle may leave the camera unable to reconnect.

The exact device/browser trace has not yet been captured, so this audit distinguishes source-confirmed defects from platform hypotheses.

## Confirmed source-level defects

### 1. Browser lifecycle signals were not serialized
The shared hook independently handled `visibilitychange`, `pagehide`, and `pageshow`. A single app-switch/BFCache sequence can produce more than one signal. The hook's start-promise guard reduced duplicate starts but did not provide one ordered transition queue for suspend → resume. A foreground start could therefore be requested while an earlier suspension was still completing.

### 2. Recovery was capped by a hook-lifetime counter
The previous hook allowed at most two automatic foreground recovery attempts until a successful SCANNING state reset the counter. This is not a valid lifecycle policy: a later, legitimate background/foreground cycle could be blocked because an earlier resume had not reached SCANNING.

### 3. Unclaimed tap-started lease was not cancelled by background handling
Camera acquisition begins in the initiating tap handler, before the scanner session necessarily claims the request. The hook's old background handler suspended only `sessionRef.current`; it did not cancel an unclaimed `cameraLeaseRequestRef.current`. A stream acquired before the session handoff could remain pending across backgrounding.

### 4. Preview readiness could accept a stale frame
When `requestVideoFrameCallback` was available, the old timeout path could still accept non-zero dimensions/readyState without observing a new frame callback. In browsers without that API, dimensions/readyState alone also did not prove that the live MediaStream timeline was advancing. This could publish preview READY even when the visible video had not resumed with a fresh frame.

## Patch in PR #38

- Add a platform-neutral `ScannerPageLifecycleCoordinator`. It coalesces duplicate visibility edges and serializes real background/foreground transitions.
- Route initial startup, `visibilitychange`, `pagehide`, and BFCache `pageshow` reconciliation through that coordinator.
- Cancel an unclaimed tap-started lease when backgrounding or unmounting. Claimed leases remain owned and released by their scanner session.
- Remove the fixed two-attempt lifetime cap. Each real foreground edge gets one serialized recovery attempt; a failed attempt remains visible and can be explicitly retried.
- Require a fresh `requestVideoFrameCallback` when supported. Otherwise require the live media timeline (`currentTime`) to advance while the video is playing. A timeout now fails readiness instead of promoting a stale frame.
- Add deterministic tests for suspend/resume ordering, duplicate browser signals, forced BFCache reconciliation, coordinator disposal, and hook wiring.

## Cross-platform invariants

1. Same lifecycle state contract and same ownership rules for iOS and Android.
2. Platform differences may be handled only at browser/media capability boundaries; no iOS-only fork of scanner business logic.
3. Never start a new camera acquisition before the previous session's suspension/lease release has completed.
4. Never publish preview READY without evidence of a fresh frame.
5. Never publish SCANNING before decoder initialization completes.
6. A failed resume must not permanently disable later valid resume attempts.
7. Home and Stocktake remain separate presentations and business flows; both consume the shared hook/runtime.
8. No change to camera constraints, autofocus policy, decoder, barcode validation, 110 ms cadence, Home lookup, Stocktake persistence/form-fill/save semantics, or deployment configuration.

## Verification still required

- GitHub Actions on the latest PR head and local Windows `npm run preflight`.
- iOS Safari/PWA: repeated background → foreground cycles, lock/unlock, switching to another app, returning after a longer delay, and retry after a failed play/frame startup.
- Android Chrome/PWA: run the same sequence to prove no regression.
- Confirm live video visibly resumes, preview READY follows a fresh frame, decoder returns to SCANNING, and exactly one camera stream/decoder loop remains active.
- Test close while camera permission is pending, then background/foreground, to verify unclaimed lease cancellation.
- Do not merge or deploy until all automated and device gates pass. Do not begin C2 or Opening Transition A until this shared recovery slice is accepted.
