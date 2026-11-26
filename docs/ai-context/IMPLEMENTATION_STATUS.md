# Current implementation status — 2026-11-26

**Repository:** `banjk124-hub/retailos-home`  
**UI/UX authority:** [EXPERIENCE_BUILD_STANDARD.md](./EXPERIENCE_BUILD_STANDARD.md)  
**Engineering authority:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)

## Product direction
- Owner direction: burgundy/dark-red identity, Vietnamese-first typography, authentic retail imagery, feature-specific compositions and purposeful motion.
- The Experience Layer is being rebuilt greenfield. Legacy UI/CSS is not the visual or component foundation.
- Existing authentication/session, module registry/readiness, business logic, persistence/offline behavior, Scanner Engine, Stocktake/Import contracts, overlay lifecycle and PWA release safety remain protected.

## Current implementation candidate — PR #174
- Branch: `feat/retailos-greenfield-experience`; PR #174 remains Draft and unmerged.
- First source/runtime slice: new responsive employee Login presentation; existing employee-code authentication and session handoff remain intact.
- This is only the first vertical slice. Authenticated App Shell/Home, Library, Stocktake, Import and Settings presentation have not yet been rebuilt.
- No owner visual acceptance, physical-device acceptance, merge or deployment is implied.

## Test and CI
- Removed `tests/browser/runtime-evidence.spec.ts`, which generated full DOM/CSS/cascade/performance dumps and broad screenshot archives.
- Browser suite now has five user-journey checks: Login at desktop/tablet/mobile, reduced-motion behavior and authenticated Home at desktop/mobile.
- CI selects domain regressions from changed paths. Scanner suite remains available for Scanner changes; unrelated UI work does not rerun the full Scanner suite.
- Removed duplicate PR-base build/comparison and routine diagnostic artifact uploads.
- **CI #1660 passed** on application/test/workflow head `4e6b11aa3053193c959eefe408bf9d18a7ae67a6`: change-scoped preflight selected 8/47 checks and passed; Playwright passed 5/5 in 4.7s; Pages build, bundle boundaries and diff checks passed.
- Later commits in this candidate synchronize documentation and remove retired M0 records; no application source, test or workflow behavior changed after the CI #1660 code head. Verify the latest docs-only head's CI before making further source changes.

## Scanner
Scanner stabilization and ecosystem cleanup remain closed. Production decoder is ZXing-C++ WASM through the Scanner Engine adapter on Main Thread. Do not reopen SC-01–SC-05 or retired Worker/diagnostics experiments for UI redesign. See [SCANNER_ENGINE.md](./SCANNER_ENGINE.md) and [SCANNER_HISTORY.md](./SCANNER_HISTORY.md).

## Release and acceptance
CI, browser emulation, physical-device QA, owner visual acceptance, merge, deployment and production transfer are separate gates. No merge or deployment without explicit approval.
