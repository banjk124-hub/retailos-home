# Scanner audio lifecycle and feedback adjustment — 2026-11-09

## User-observed behavior

- Scanner continues decoding and accepting barcodes after iOS PWA returns from background or the screen is unlocked.
- Both accepted-barcode beep and the Settings > Scanner > Test Beep control become silent.
- This isolates the observed failure to the shared Web Audio path rather than camera acquisition, decoder cadence or accepted-result delivery.
- User also requested a more audible beep and a slightly longer confirmation tone.

## Implementation in the PR branch

- Keep audio independent from camera/session lifecycle. Do not restart or reacquire the camera to restore sound.
- The shared audio unlock is called from existing direct user gestures (Scanner surface interaction and the Settings preview button).
- Recreate the shared AudioContext if the prior context is closed.
- Attempt resume for every non-running state, including Safari interruption states, but only when called from a user gesture. Do not attempt autoplay recovery from visibilitychange or pageshow.
- Preserve non-blocking behavior: audio failures never block scanning or barcode acceptance.
- Increase the linear gain ceiling from 0.48 to 0.60. At the default 50% setting, gain becomes 0.30; at 100%, gain becomes 0.60. The 0% mute behavior remains unchanged.
- Extend the tone envelope/oscillator duration from approximately 110 ms to 140 ms. Keep the existing sine waveform and 1760 Hz frequency.
- Add runtime regression coverage for suspended, interrupted and closed AudioContext states, updated gain mapping, 140 ms duration, preview synchronization and vibration fallback.

## Scope protections

No changes to camera acquisition/lease, scanner lifecycle coordinator, decoder, barcode validation, accepted-result gate, Torch, Home lookup, Stocktake form/save behavior, PWA configuration or deployment settings.

## Verification and acceptance

- GitHub Actions full preflight must pass on the latest PR head.
- Physical QA remains required on iOS Safari/PWA and Android Chrome/PWA:
  1. Open Scanner, background the PWA, return, then scan a barcode.
  2. Lock/unlock the screen, return, then scan a barcode.
  3. Repeat using Settings > Test Beep.
  4. Compare 50%, 70% and 100% beep levels at a normal media volume.
  5. Verify Home Scanner and Stocktake Scanner.
- A browser test cannot prove physical speaker loudness or guarantee every iOS interruption behavior. Do not merge or deploy until CI, device QA and explicit user approval are complete.
