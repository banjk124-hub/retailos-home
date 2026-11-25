# Current verified implementation status — 2026-11-25

**Repository:** `banjk124-hub/retailos-home`  
**Product standard:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)  
**Active M0 specification:** [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md)  
**Last verified main:** `3cd2d5bf7a3d1339a6c55baa1c16c74f6ebece2c` — recheck before future work.

## UI/UX — owner-confirmed direction
- Burgundy/dark-red brand remains dominant.
- Vietnamese-first typography; final font remains open pending validation.
- Authentic supermarket/retail imagery is part of the visual language.
- Image guides art direction/composition; its amber/yellow palette and product semantics are not adopted.
- Video guides motion/transitions/interaction; exact timings are not inferred without measurement.
- Remaining art direction is adapted, not copied. Modules may have different compositions while retaining one RetailOS identity.

## M0 status
- Direction anchors are confirmed.
- Documentation reconciliation is active on PR #163.
- Existing M0 records contain useful audits but conflict on amber accents, reference scope and restrictive motion language; treat them as historical until reconciled.
- M0-A source-backed representative screens/responsive visual acceptance: open.
- M0-B motion/interaction study: open.
- M0-C cross-surface integration: open.
- M0-D technology/quality/owner acceptance: open.
- No M1 authorization.

## Merged work — do not overstate
PR #160 Phase 00 audit, #161 Design Foundation and #162 responsive Login/browser baseline are merged. They provide audit records, semantic tokens and limited consumer migrations/browser coverage; they do not implement product-wide UI/UX or the target App Shell.

## Open PRs — last observed; recheck live
- PR #163 documentation/Product Skill consolidation: open Draft at head `cb8c05de5b996efcfc321d63470c498e6f14194c`; RetailOS CI run #45598222361 passed on that head. Not merge approval.
- PR #157 legacy Login tablet CSS slice: open Draft at head `03467e4d0a111a3e0b4a4b0001e0cb8bcaf70608`; reconcile against merged PR #162, do not merge by default.

## Scanner
Runtime stabilization and ecosystem cleanup are closed; owner confirmed normal app flow without observed errors. Production decoder is ZXing-C++ WASM via `ZXingWasmDecoderAdapter` on Main Thread. Home and Stocktake share Scanner Engine/session contract. Retired Worker prototype and production QA diagnostics collector/monitor remain retired. No active SC-01–SC-05 phase. See [SCANNER_ENGINE.md](./SCANNER_ENGINE.md) and [SCANNER_HISTORY.md](./SCANNER_HISTORY.md). Operational stability is not quantified optical accuracy or exhaustive device acceptance.

## PWA / release
See [PWA_RUNTIME_RELEASE.md](./PWA_RUNTIME_RELEASE.md). Verify live PR/CI/deployment before volatile claims.

## Verification rules
CI proves only checks run on the exact commit. Browser emulation is not physical-device acceptance. Development Pages is not department production promotion. Merge, deployment and production transfer are separate approval gates.