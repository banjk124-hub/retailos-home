# UI/UX Phase 01 — Design Foundation Implementation Record

**Status:** In progress — foundation token/runtime batch implemented; full Phase 01 acceptance is not yet claimed.
**Repository:** `banjk124-hub/retailos-home`
**Base:** `main` at `2b7f724a2518f2f2ae913e676490f46e23015cdf` (PR #160 merge).
**Branch:** `feat/uiux-phase-01-foundation`
**Date:** 2026-11-25

## 1. Objective and boundary

Establish one semantic design foundation for RetailOS without forcing every workspace into one layout or material. The supplied image remains the structural reference; the supplied video remains the temporal/motion reference; RetailOS owns brand, operational semantics, data truth and architecture.

This phase is presentation infrastructure only. Auth/session, module identity/readiness, data/cache, Scanner Engine/camera lifecycle, Stocktake/Import persistence and PWA release lifecycle are protected. No new UI framework, font service, component framework or motion runtime is introduced by this batch.

## 2. Source audit — verified on current main

| Concern | Verified source condition | Disposition |
|---|---|---|
| Brand | RetailOS red and custom BrandMark/wordmark exist; Brand typography duplicated Inter stack | Keep identity; move wordmark typography to shared tokens |
| Typography | Global Inter/system fallback; no bundled font assets or confirmed @font-face | Establish role/scale contract; do not claim a font asset decision |
| Color | theme.css is imported after base.css; legacy aliases and feature literals remain | Make theme.css semantic token authority; retain compatibility aliases |
| Materials | Glass token/material implementation already exists with six variants and aliases | Reuse existing implementation; no second material system |
| Motion | Shared Motion tokens/provider already exist; mobile-tuning.css overrode interaction duration to 420ms | Route legacy mobile aliases back to shared motion tokens |
| CSS ownership | Global + Brand + Motion + Glass + Home and feature styles are layered; mobile-tuning.css is large | No broad stylesheet deletion or cascade rewrite without computed-style evidence |
| Responsive | Existing breakpoints vary by stylesheet and feature | Record initial semantic layout thresholds; do not rewrite feature breakpoints blindly |

## 3. Implemented in this batch

### 3.1 Canonical semantic tokens — `src/styles/theme.css`

Added semantic roles for:
- Brand primary/strong/subtle.
- Primary, secondary, muted and inverse text.
- Canvas, panel, raised, subtle and input surfaces.
- Subtle/strong borders.
- Success, warning, danger, info and neutral statuses.
- UI/data font-family roles, typography scale, weights, line heights and tabular numerals.
- 4px spacing rhythm and semantic insets/section spacing.
- Control/panel/feature radii and elevation levels 0–4.
- Focus color/outline and content/gutter/breakpoint layout values.

Existing variable names remain as compatibility aliases to semantic tokens. This is an incremental migration contract, not permission to delete legacy names while consumers remain.

Contrast calculations for the new primary/secondary/muted text and brand/status foreground tokens against pure white are above WCAG AA 4.5:1. The legacy tertiary alias preserves its historical #918890 value (approximately 3.43:1 on white) for visual compatibility; it must not be used for essential small text. These calculations do not validate tinted surfaces, translucent Glass compositing, images, gradients, disabled states or every component state; browser-level contrast review remains open.

### 3.2 Typography ownership

- `--font-family-sans` now resolves through `--font-family-ui`.
- Body/heading line-height aliases resolve through shared semantic line-height tokens.
- Brand wordmark typography consumes the shared family, weight and size tokens.
- No font file is bundled. **Be Vietnam Pro is the leading candidate for evaluation** because its maintainers specifically refined Vietnamese diacritics; Fontsource records 419-language coverage, nine weights and SIL OFL-1.1 licensing. See [Fontsource family details](https://fontsource.org/fonts/be-vietnam-pro/about), [self-hosting/package guidance](https://fontsource.org/fonts/be-vietnam-pro/use) and [upstream Google Fonts metadata](https://github.com/google/fonts/tree/main/ofl/bevietnampro). Recommended evaluation set: regular 400, medium 500, semibold 600 and bold 700, self-hosted WOFF2 with local fallback and no remote runtime dependency. This is a recommendation, not a shipped/selected font; compare against the current Inter/system stack on real Login, Home, Stocktake and Import screens before adoption.

### 3.3 Motion ownership

- Legacy mobile motion aliases now resolve to `--motion-ease-standard` and `--motion-duration-interaction`.
- Existing Motion reduced-motion and power-conserve contracts are retained.
- Existing Glass power-conserve behavior is retained.
- No animation choreography, business state, request lifecycle or camera behavior was changed.

### 3.4 Regression guard

Added `scripts/test-design-foundation-contract.mjs` and registered it in `scripts/preflight.mjs`. It checks required semantic tokens, compatibility aliases, shared motion references, reduced-motion and power-conserve hooks.

### 3.5 CSS ownership recheck

A recursive tree read at the Phase 00 main commit confirms 24 tracked CSS files. The source graph still has eight global style imports plus Brand, Motion, Glass tokens/materials and LiquidDock; Home adds five ordered stylesheets. Static source review confirms repeated selectors between `responsive.css` and `mobile-tuning.css`, between Home stylesheet generations, and between global theme and feature rules.

These overlaps are intentional in some cases (responsive overrides and state variants) and risky in others. Static text matching cannot determine the winning declaration for every viewport/state, generated class or portal. No broad CSS consolidation/deletion is performed in this phase batch. The existing Phase 00 computed-style gate remains mandatory before retiring selectors or stylesheet generations.

### 3.6 Glass material consumer audit

Direct source search on the Phase 00 main baseline found the following `GlassSurface` material callsites:

| Variant | Verified direct use | Phase 01 disposition |
|---|---|---|
| `soft` | Login employee surface; Module Library group surface | Keep as low-emphasis translucent surface pending visual review |
| `frosted` | Login form panel | Keep as focused high-opacity/blur surface; validate low-power fallback |
| `floating` | LoginDock and LiquidDock | Keep for floating navigation/dock role |
| `control` | Login form controls, LoginDock help trigger, Home push setup notice | Keep for interactive/control surfaces; review brand tone separately |
| `dark` | LoginDock help content | Keep as feature-specific dark context |
| `elevated` | No direct `GlassSurface material="elevated"` JSX callsite found in the repository-wide exact search | Do not delete yet: compatibility aliases and external/dynamic typed consumers must be checked before retiring a public variant |

The direct-use search is not a proof of all runtime composition. `MotionButton` accepts a material prop, and CSS compatibility aliases use elevated terminology independently of the `GlassSurface` variant. Therefore this pass records ownership and evidence but does not remove or rename variants.

## 4. Phase 01 workstream status

| Batch | Status | Evidence / remaining work |
|---|---|---|
| 01A Brand & visual foundation | Partial | Brand identity retained; semantic brand roles and Brand typography connected. Full screen-level art direction and asset review remain |
| 01B Typography | Partial | Shared type roles and aliases implemented. Vietnamese font asset selection, licensing, glyph and device review remain |
| 01C Color & status semantics | Partial | Semantic roles and compatibility aliases implemented. Full contrast matrix across real component/surface states remains |
| 01D Materials & depth | Audit complete / implementation pending | Existing Glass system retained. Need role map, fallback validation and computed-style review before reducing variants |
| 01E Spacing, radius, elevation, focus | Partial | Semantic tokens implemented. Consumer migration and keyboard/focus audit remain |
| 01F Motion foundation | Partial | Shared token ownership restored for mobile aliases. Feature-specific literal durations/choreography audit remains |
| 01G CSS architecture | Partial | Canonical token source established. Full selector/computed-style ownership and cascade consolidation remain |
| 01H Integration & acceptance | Not started | Requires preflight/CI, responsive browser evidence, accessibility and device acceptance |

## 5. Explicit non-decisions

- No dark theme is introduced; light appearance remains the verified baseline.
- No font package or remote font loading is introduced in this batch. Be Vietnam Pro is the recommended evaluation candidate; package adoption remains gated by visual comparison, WOFF2 payload measurement, license-file inclusion and offline/device validation.
- No Glass variant is removed based on naming or assumed redundancy.
- No CSS file or selector block is deleted based only on file size, age, naming or static text search.
- No feature workspace is forced into generic cards, common density or a universal component.
- No production deployment or production-account promotion is authorized.

## 6. Validation required before Phase 01 closure

1. Run the new foundation contract test and full `npm run preflight` on the exact PR head.
2. Pass TypeScript, production build, GitHub Pages build, bundle-boundary and all existing feature tests.
3. Review computed styles and cascade on Login, Home, Settings, Stocktake, Import and Scanner presentation surfaces.
4. Validate text/status contrast on actual backgrounds, including translucent and dark contexts.
5. Validate Vietnamese diacritics, mixed codes, tabular quantities/prices and long labels at representative widths.
6. Validate desktop, tablet, iOS Safari/PWA, Android low/mid-range, narrow mobile and short landscape.
7. Verify reduced-motion and power-conserve behavior, touch target and keyboard focus.
8. Record exact evidence and rollback in the implementation PR; no CI result is treated as physical-device acceptance.

## 7. Next bounded work

Continue the remaining Phase 01 batches on this branch only after reviewing the current diff and CI feedback. Prioritize:
- Contrast and typography evidence matrix.
- Glass material role/consumer map and fallback audit.
- CSS selector-to-element/computed-style audit for representative surfaces.
- Migration of only directly verified shared consumers to semantic tokens.
- Phase 01 acceptance record and synchronized INDEX / IMPLEMENTATION_STATUS / ROADMAP / handoff documents.

Phase 01 remains open until all mandatory gates above are either completed with evidence or explicitly recorded as owner-approved limitations.
