# UI overlay cross-platform acceptance

**PR:** #102 — `fix/ux-cross-platform-core-audit`  
**Status:** Automated source-contract coverage added; physical-device checks not yet performed.

## Automated gates

- [x] Shared body lock reference counting and idempotent release tests are in preflight.
- [x] Home full-screen Barcode Scanner participates in the Home scroll lock.
- [x] Calendar backdrop handles short/dynamic viewport and horizontal safe areas.
- [x] Library and notice detail layouts respect safe areas and bounded dynamic viewport height.
- [x] Long notice content scrolls inside its panel.
- [x] Barcode lookup result respects horizontal safe areas in landscape.
- [x] Full preflight, TypeScript, production build, Pages build and bundle comparison passed on source head `a7cb890cccd5a57719cdb9bb702ed12edbc7402a` (Actions run #835). Documentation consolidation followed; final-head CI is still required.

## Physical acceptance matrix

| Scenario | Desktop Chrome/Edge | Android Chrome/PWA | iOS Safari tab | iOS Home Screen PWA |
|---|---|---|---|---|
| Home → Barcode Scanner; background page does not scroll | Pending | Pending | Pending | Pending |
| Camera permission prompt, preview, close and reopen | Pending | Pending | Pending | Pending |
| Scanner QA open/close; page position preserved | Pending | Pending | Pending | Pending |
| Settings → Scanner Settings → back → close | Pending | Pending | Pending | Pending |
| Settings → Scanner QA → back → close | Pending | Pending | Pending | Pending |
| Calendar in short landscape viewport | Pending | Pending | Pending | Pending |
| Long notice detail; inner scroll and close | Pending | Pending | Pending | Pending |
| Module library → Stocktake handoff | Pending | Pending | Pending | Pending |
| Stocktake Import table and nested confirmation/review surfaces | Pending | Pending | Pending | Pending |
| Rapid open/close and Escape/backdrop dismissal | Pending | Pending | Pending | Pending |
| Reduced-motion preference | Pending | Pending | Pending | Pending |
| Safe-area and browser chrome changes | N/A | Pending | Pending | Pending |

## Required observations

For each device/browser, record:
1. OS and browser version; installed PWA vs browser tab.
2. Viewport orientation and whether browser chrome/keyboard is visible.
3. Whether background page moves while the overlay is open.
4. Whether overlay content remains reachable and scrolls independently.
5. Whether closing restores the exact previous page position.
6. Whether camera preview and scanner session close/reopen correctly.
7. Any focus, backdrop, z-index, clipping or tap-target issue.

Do not mark a row passed from CI alone. Attach a short screen recording or reproducible steps for any failure. No merge/deploy readiness claim until the required device rows are accepted.
