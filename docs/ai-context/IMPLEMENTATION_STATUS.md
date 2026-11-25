# Current verified implementation status — 2026-11-26

**Repository:** `banjk124-hub/retailos-home`  
**Product standard:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)  
**Active M0 specification:** [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md)  
**Last verified main:** `4e654ffb519d8b124f3edbbbda4f65fe550052ef` — M0-0 PR #163 merged; verify live before future work.

## UI/UX — owner-confirmed direction
- Burgundy/dark-red brand remains dominant.
- Vietnamese-first typography; final font remains open pending validation.
- Authentic supermarket/retail imagery is part of the visual language.
- Image guides art direction/composition; its amber/yellow palette and product semantics are not adopted.
- Video guides motion/transitions/interaction; exact timings are not inferred without measurement.
- Remaining art direction is adapted, not copied. Modules may have different compositions while retaining one RetailOS identity.

## M0 status
- Direction anchors are confirmed.
- **M0-0 documentation consolidation and plugin parity audit: merged to main via PR #163.**
- M0-A Batch A0 source baseline audit and A1.1 screen blueprint pack (Login, App Shell, Home, Module Library): recorded on branch `feat/m0-a-source-audit-foundation`. A1.2 high-fidelity editable visual prototypes, palette/font/image validation and owner acceptance remain open. See [source audit](./UI_UX_M0_A_SOURCE_BASELINE_AUDIT.md) and [screen blueprints](./UI_UX_M0_A1_SCREEN_BLUEPRINTS.md).
- M0-B motion/interaction study: open.
- M0-C cross-surface integration: open.
- M0-D technology/quality/owner acceptance: open.
- No M1 authorization.

## Merged work — do not overstate
PR #160 Phase 00 audit, #161 Design Foundation and #162 responsive Login/browser baseline are merged. They provide audit records, semantic tokens and limited consumer migrations/browser coverage; they do not implement product-wide UI/UX or the target App Shell.

## Open PRs — recheck live
- PR #163: documentation/Product Skill/M0 consolidation; merged to main at `4e654ffb519d8b124f3edbbbda4f65fe550052ef`.
- PR #157: legacy Login tablet CSS slice; still open Draft and based on an older main baseline. Reconcile exact diff against PR #162 and current M0-A direction; do not merge by default.

## Plugin parity
Private RetailOS Product Studio is now v0.1.3. Its current `SKILL.md`, root manifest and Codex manifest were inspected after release. The skill explicitly encodes the owner-confirmed burgundy/dark-red identity, Vietnamese-first typography, authentic retail imagery, image art-direction/composition role, video motion/interaction role, open feature-specific design system, protected contracts and M0-before-M1 gate. Repository/plugin direction is aligned at the audited release. Recheck parity whenever either authority changes.

## M0-A source baseline findings
- Home is still a long-scroll surface; no route-based App Shell is implemented.
- HomeScreen is approximately 54 KB and owns several cross-surface state domains; map ownership before extraction.
- `mobile-tuning.css` is 87,267 bytes; CSS cascade requires computed-style evidence before cleanup.
- Current brand token is `#d92736` / deep `#a91829`; final burgundy values remain open.
- Current font stack is Inter/system; no retail photography is checked into public/source assets.
- Responsive Playwright baseline is Login-only; other representative screens need coverage.

## Scanner
Runtime stabilization and ecosystem cleanup are closed; owner confirmed normal app flow without observed errors. Production decoder is ZXing-C++ WASM via `ZXingWasmDecoderAdapter` on Main Thread. Home and Stocktake share Scanner Engine/session contract. Retired Worker prototype and production QA diagnostics collector/monitor remain retired. No active SC-01–SC-05 phase. See [SCANNER_ENGINE.md](./SCANNER_ENGINE.md) and [SCANNER_HISTORY.md](./SCANNER_HISTORY.md). Operational stability is not quantified optical accuracy or exhaustive device acceptance.

## PWA / release
See [PWA_RUNTIME_RELEASE.md](./PWA_RUNTIME_RELEASE.md). Verify live PR/CI/deployment before volatile claims.

## Verification rules
CI proves only checks run on the exact commit. Browser emulation is not physical-device acceptance. Development Pages is not department production promotion. Merge, deployment and production transfer are separate approval gates.