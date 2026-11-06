# Scanner benchmark fixture protocol

No fixture has been physically measured or accepted yet. This document defines how to create a reproducible test set.

## Required fixture groups

Create one uniquely named image for each physical label and preserve the expected payload exactly as printed. Do not use product names as expected values.

| Group | Symbology | Required cases |
|---|---|---|
| EAN-8 | EAN-8 | clean, small print, low contrast, slight blur, glare |
| EAN-13 | EAN-13 | clean, small print, low contrast, slight blur, glare, perspective |
| CODE-128 | CODE-128 | numeric payload, alphanumeric payload, long payload, small print |
| Negative | unsupported/invalid | QR code, damaged barcode, partial barcode, text resembling a barcode |
| Multi-code | mixed supported | two supported codes in one frame; supported plus unsupported code |

## Capture controls

- Photograph/scan the same printed labels for every decoder and device.
- Record physical label dimensions and approximate camera-to-label distance.
- Keep lighting and device position constant for paired comparisons.
- Run each fixture at least 10 attempts per device/backend. Increase attempts for borderline cases.
- Separate still-image fixture results from live-camera results.
- Do not count a detection as correct unless both payload and symbology match the fixture.
- Record wrong payloads as false positives, not merely failed scans.

## Result record fields

`fixtureId`, `expectedValue`, `expectedSymbology`, `deviceModel`, `osVersion`, `browserVersion`, `pwaMode`, `backend`, `attempt`, `success`, `falsePositive`, `timeToDecodeMs`, `decodeLatencyMs`, `geometryAvailable`, `notes`.

## Privacy

Use test labels only. Do not capture employee/customer faces, store CCTV, or operational customer data as benchmark fixtures.
