# Scanner A3 — Adaptive Runtime Performance

## Purpose
A3 observes completed end-to-end decode duration and video-frame callback gaps, then adjusts only the optional fallback candidate budget. It is a bounded runtime controller, not a camera controller or frame scheduler.

## Runtime policy
- Normal mode: up to 2 optional image-enhancement candidates and 4 geometry candidates.
- Constrained mode: up to 1 image-enhancement candidate and 2 geometry candidates.
- Enter constrained mode only after 3 consecutive pressured observations (decode >= 110 ms or frame gap >= 220 ms).
- Return to normal only after 8 consecutive recovered observations (decode <= 75 ms and frame gap <= 150 ms).
- An isolated spike cannot switch modes. Borderline samples reset the relevant streak.
- Invalid measurements are ignored.
- A new scanner session resets the controller to the full normal budget.

## Sensitivity and safety invariants
- Baseline decode is always attempted first and is never reduced or delayed by A3.
- Existing 70 ms minimum decode interval is unchanged; A3 does not throttle frame sampling.
- Existing orientation normalization and strict ROI contracts remain unchanged.
- A2's transform priority is retained; constrained mode only truncates the lowest-priority tail.
- Geometry candidate ordering remains confidence-ranked; constrained mode only reduces the count.
- T3 temporal fallback remains enabled and receives the same runtime budget. A3 does not disable historical-frame recognition.
- Payload validation remains authoritative and unchanged.
- Camera constraints, focus, torch, preview, frame scheduling, lifecycle, and module presentation are not controlled by A3.

## Diagnostics
The session logs a policy transition only when the mode changes. QA Monitor and JSON/CSV exports retain the current mode, image/geometry budgets and transition count. The collector allowlist excludes unknown fields and raw frame/payload data.

## Validation
The A3 test suite exercises:
- isolated latency spikes and sustained pressure;
- hysteresis, recovery and resistance to oscillation;
- normal/constrained image candidate budgets through the production enhancement pipeline;
- baseline fast-path invariance under pressure;
- runtime budget propagation to current-frame and T3 temporal decode;
- unchanged frame cadence and validator ownership.

The existing production ZXing integration suite continues to validate real decoder fixtures across formats, rotations, skew, low contrast, strict ROI and multi-scale paths. Passing synthetic/CI tests demonstrates policy correctness, not a universal real-device decode-rate claim; runtime diagnostics are used to observe deployed device behavior.
