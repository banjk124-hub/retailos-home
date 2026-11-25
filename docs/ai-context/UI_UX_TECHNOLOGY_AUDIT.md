# UI/UX Technology Audit — Batch 00B

**Status:** Source audit and official-browser research completed; recommendations are proposals, not accepted implementation changes.
**Audit baseline:** \`main\` at \`2003ea24966755d0ad4e0298b34422b053267e77\`
**Audit date:** 2026-11-25
**Scope:** Runtime dependencies, browser-native capabilities, existing UI foundations, CSS ownership, browser compatibility and future UI/UX implementation constraints.
**Source rule:** AS-IS findings below are based on the audited source tree and package lock. TO-BE recommendations must not be read as implemented behavior.

## 1. Executive result

RetailOS already has enough foundation to begin a complete UI/UX redesign without introducing a new UI framework or animation library.

The current direct runtime dependencies are React 18, React DOM, Lucide React, JSZip, PptxGenJS and ZXing WASM. Development dependencies include Vite, TypeScript, Playwright and their type/build tooling. The lockfile contains 148 package entries, but no installed UI framework, animation framework, charting package, data-grid package, form library or routing package was found in the dependency tree.

The repository already owns reusable Brand, Glass, Motion, Icon and LiquidDock systems. The main problem is not absence of components; it is that the current presentation is distributed across several global and feature stylesheets, while Home is still a long-scroll screen with state-driven overlays rather than a coherent multi-workspace navigation model.

**Decision direction:** browser-native first, existing React/shared systems second, specialized RetailOS components only where workflow complexity justifies them. No dependency is approved for installation by this audit.

## 2. Audited baseline and inventory

### 2.1 Repository footprint

At the audited main commit:

- 245 tracked blob files.
- 152 files under \`src/\`.
- 25 CSS files under \`src/\`.
- 41 \`scripts/test-*.mjs\` files.
- 9 registered RetailModule IDs and 5 module-library groups.
- 6 direct runtime dependencies and 6 direct development dependencies in package.json.

These counts are repository-tree observations, not performance metrics.

### 2.2 Direct dependency inventory

| Package | Declared version | Current responsibility | Decision |
|---|---:|---|---|
| react | ^18.3.1 | Component rendering and state | Keep |
| react-dom | ^18.3.1 | Browser DOM renderer | Keep |
| lucide-react | ^0.468.0 | Icon system | Keep; continue using the shared icon registry |
| jszip | ^3.10.2 | ZIP parsing/export | Keep; preserve lazy import |
| pptxgenjs | ^4.0.1 | PowerPoint export | Keep; load only on export paths |
| zxing-wasm | 3.1.6 | Barcode decoding | Protected; do not replace as part of UI redesign |
| vite | ^6.4.5 | Development/build | Keep |
| typescript | ^5.7.2 | Static type checking | Keep |
| @vitejs/plugin-react | ^4.3.4 | React/Vite integration | Keep |
| @playwright/test | ^1.64.1 | Browser automation/test dependency | Keep until a maintained replacement is demonstrated |
| @types/* | declared in package.json | Type declarations | Keep |

No new package is required merely to create buttons, forms, menus, dialogs, responsive grids, tables, cards, transitions or standard feedback surfaces.

### 2.3 Existing internal UI systems

| Existing source | Current role | Audit direction |
|---|---|---|
| \`src/shared/brand/\` | Brand mark, wordmark and brand motion | Keep as brand source of truth |
| \`src/shared/components/glass/\` | GlassSurface and material tokens | Keep; use selectively, not on every surface |
| \`src/shared/motion/\` | Motion provider, boundary, page, card, button, presence, sheet, tokens and presets | Keep; consolidate policy and remove duplicate motion definitions only after usage audit |
| \`src/shared/icons/\` | Icon registry, presets and MotionIcon | Keep; do not import arbitrary icons inconsistently across features |
| \`src/shared/navigation/\` | LiquidDock and dock interaction | Keep as current navigation implementation; redesign its role and layout rather than replacing by default |
| \`src/shared/services/bodyScrollLock.js\` and hook | Cross-feature modal scroll-lock coordination | Protected shared behavior |
| \`src/shared/pwa/\` | Update Center, update safety and release runtime | Protected platform behavior |
| \`src/shared/downloadFile.ts\` | Shared Blob/object-URL download lifecycle | Reuse |
| \`src/shared/hooks/useAdaptiveAppearance.ts\` | Appearance and user preference adaptation | Inspect before extending |
| \`src/shared/hooks/useBodyScrollLock.ts\` | React binding for shared lock manager | Reuse |

### 2.4 Current style entry and CSS ownership

\`src/main.tsx\` imports global styles in this order:

1. \`base.css\`
2. \`responsive.css\`
3. \`theme.css\`
4. \`interactions.css\`
5. \`mobile-tuning.css\`
6. \`performance.css\`
7. \`adaptive-appearance.css\`
8. \`native-experience.css\`
9. Brand, Motion, Glass token/material and LiquidDock styles

\`HomeScreen.tsx\` additionally imports five Home stylesheets: \`home.css\`, \`home-ux.css\`, \`home-engine.css\`, \`home-redesign.css\` and \`home-architecture.css\`.

The repository therefore has 25 CSS files in total, including feature-owned styles. The current Home cascade has multiple generations of layout and visual rules. This is a confirmed maintainability risk; it is not proof that every selector is redundant or that all files should be deleted.

**Required next audit before CSS migration:** selector usage, import graph, specificity/cascade map, computed-style ownership, media-query overlap, dead selector evidence, feature chunk boundaries and screenshot regression coverage. Do not remove a stylesheet based on filename or visual impression alone.

## 3. Browser-native capability inventory

The following table separates current source usage from future capability recommendations.

| Capability | Current source evidence | Browser/API role | Recommendation |
|---|---|---|---|
| CSS Grid / Flexbox | Home and feature CSS | Primary layout primitives | Use as default |
| Media Queries | responsive and performance styles | Viewport, input and preference adaptation | Keep for global breakpoints/preferences |
| Container Queries | No confirmed current use in the audited UI styles | Component adapts to available container width | Adopt progressively for reusable components |
| HTML Form / Input / Select | Login, Stocktake and Import | Native form semantics and controls | Prefer native controls unless workflow requires custom behavior |
| Constraint Validation API | Login uses native form semantics but \`noValidate\`; explicit validation is used in features | Browser validation | Use selectively; do not replace business validation |
| HTML \`<dialog>\` | No confirmed \`<dialog>\` usage; current overlays use custom div/section surfaces and ARIA roles | Native modal/non-modal dialog, top layer and browser semantics | Evaluate for simple modal patterns; retain custom feature shells where their layout/lifecycle requires it |
| Popover API | No confirmed use | Non-modal anchored menus and popovers | Progressive enhancement only; fallback required |
| Document View Transition API | No confirmed \`document.startViewTransition\` usage | Same-document transition between React UI states | Optional enhancement after shell/navigation design; CSS/React fallback is mandatory |
| CSS Transitions / Animations | Extensively used | Lightweight interaction and transition effects | Keep; standardize tokens and restrict expensive properties |
| \`prefers-reduced-motion\` | Existing motion hook and CSS media queries | User accessibility preference | Mandatory system-wide policy |
| ResizeObserver | Scanner preview geometry hook | Observe element geometry changes | Keep in scanner-specific ownership |
| VisualViewport | Scanner viewport and geometry hooks | Keyboard/browser-chrome viewport geometry | Keep in scanner/platform ownership; do not duplicate globally |
| matchMedia | Adaptive appearance, motion, dock and viewport behavior | Media and preference observation | Reuse existing hooks where applicable |
| requestAnimationFrame | Home scroll and scanner geometry/lifecycle | Frame-aligned UI work | Use for visual scheduling, not as a generic task queue |
| IndexedDB | Module snapshot, Stocktake and Stocktake Import stores | Local persistence/offline data | Keep feature/data ownership separate |
| Cache API + Service Worker | PWA release runtime | Offline assets, release staging and rollback | Protected; follow PWA_RUNTIME_RELEASE.md |
| MediaDevices.getUserMedia | Shared camera session and scanner platform | Camera acquisition | Protected; UI must not bypass camera lease/session ownership |
| Clipboard API | Stocktake Import | Copy text | Use with manual-selection fallback |
| Blob + URL.createObjectURL | Shared download helper and exports | Local file generation/download | Reuse shared download lifecycle |
| File input | Stocktake Import | User-selected local workbook | Keep as broad compatibility baseline |
| File System Access API / showOpenFilePicker | No confirmed source use | Advanced file open/save | Not required; avoid dependence for cross-platform import/export |
| DOMParser / XML APIs | Stocktake Import parser | Local OOXML parsing | Reuse existing parser/browser APIs |
| Web Crypto SHA-256 | Service worker and import parser | Integrity/fingerprinting | Keep within existing release/import contracts |
| StorageManager.estimate | PWA service worker | Advisory storage estimate | Keep advisory only; Cache writes remain authoritative |
| IntersectionObserver | No confirmed source use | Visibility-triggered loading/observation | Not needed by default; evaluate only for a concrete use case |
| requestIdleCallback | No confirmed source use | Best-effort idle scheduling | Do not depend on it for critical work |

“Not confirmed” means no matching usage was found in the audited source search; it is not a claim that the browser lacks the API.

## 4. Browser compatibility policy

Research basis: official MDN documentation and browser compatibility information checked on 2026-11-25.

| API / feature | Compatibility finding | RetailOS policy |
|---|---|---|
| HTML Dialog | MDN Baseline Widely Available since March 2022 | Safe candidate for standard dialogs; test focus and scroll behavior on physical iOS |
| Popover API | MDN Baseline 2025; older devices/browser versions may not support it | Enhancement only; native button/menu fallback |
| Document.startViewTransition | MDN Baseline 2025; older browsers may not support it | Enhancement only; React/CSS state transition must work without it |
| Element-scoped View Transition | MDN marks limited availability/experimental | Do not use as a production dependency |
| CSS Container Queries | MDN Baseline Widely Available since February 2023 | Adopt for component-level responsiveness |
| prefers-reduced-motion | MDN Baseline Widely Available | Mandatory; preserve existing user preference and power-conserve behavior |
| Dynamic viewport units (dvh/svh/lvh) | Supported in modern engines; legacy fallback remains relevant | Use fallback-first viewport sizing and verify iOS browser chrome/keyboard behavior |

### Required feature detection and fallback

- Do not use browser-version sniffing as the default compatibility strategy.
- Prefer capability detection for optional APIs.
- Every optional visual API must have a stable non-animated/non-native fallback.
- Native Dialog does not remove the need to test focus restoration, nested dialog behavior, body scroll lock, safe areas and feature-owned close policy.
- Popover is non-modal by default. It must not replace a modal confirmation or a workflow that requires background interaction to be blocked.
- Do not introduce element-scoped View Transitions, experimental scroll-state APIs or new CSS features into critical navigation without a specific proof and fallback.

## 5. Libraries: install / do not install decision

| Category | Current state | Decision |
|---|---|---|
| UI framework (MUI, Ant Design, Chakra, etc.) | None installed | Do not add; current app needs a coherent owned design system, not a second design language |
| Animation framework (Framer Motion, GSAP, etc.) | None installed | Do not add; current Motion system + CSS + optional Document View Transition cover the known requirements |
| Routing | No router dependency found | Do not add yet. First define the route/screen contract and browser-history needs; use a small typed navigation adapter over History API if requirements remain simple. Re-evaluate a router only when nested routes, deep links, route loaders or route-level error boundaries materially justify it |
| Chart library | None installed | Do not add until a real operational chart requirement and data volume are specified |
| Data grid | None installed | Do not add for current table use. Evaluate only if virtualization, column pinning, advanced sorting/filtering or large-scale editing becomes a proven requirement |
| Form library | None installed | Do not add for ordinary forms. Native forms plus local validation are sufficient until complex cross-field schemas/reusable async validation become substantial |
| Icon library | Lucide React installed | Keep one icon source and shared registry |
| ZIP library | JSZip installed | Keep and lazy-load |
| Export | PptxGenJS installed | Keep and lazy-load |
| Browser test | Playwright installed | Keep; extend visual/accessibility/responsive coverage before considering another tool |
| Font package | No font package declared | No package needed; evaluate a self-hosted WOFF2 font asset and Vietnamese glyph coverage before selection |
| Image/asset service | No service dependency | Do not add; use versioned local assets, responsive images and lazy loading |

### Dependency approval gate

A new dependency may be proposed only when all conditions are satisfied:

1. A concrete product/workflow requirement is documented.
2. Existing browser APIs, React, current shared components and installed dependencies are insufficient.
3. At least two viable alternatives are compared.
4. Bundle, startup, memory, offline, security, license, maintenance and low-end-device costs are recorded.
5. The dependency is lazy-loaded when it is not required on the critical path.
6. A fallback, test plan, rollback and owner are defined.
7. The user explicitly approves installation.

## 6. Confirmed implementation gaps

1. No single canonical UI/UX architecture document currently defines tokens, components, layout, navigation, motion, responsive behavior and extension rules together.
2. Home uses a long page with section navigation and multiple overlays rather than a first-class workspace navigation contract.
3. Global and Home CSS ownership is distributed across 13 entry-level/global and Home stylesheets, with 25 CSS files across the full source tree.
4. Shared Glass and Motion foundations exist, but there is no complete documented component inventory, variant contract, accessibility contract or contribution recipe.
5. The current route model is state-driven and has no installed routing package. A route strategy has not been accepted.
6. The current module registry contains future/integrating modules; the UI architecture must not treat their presence as proof of a completed workflow.
7. Browser-native Dialog, Popover and View Transition APIs are not currently the established overlay/navigation implementation.
8. There is no complete UI visual regression matrix covering the proposed new shell, screen layouts and component variants.

## 7. Protected boundaries

Any UI redesign must preserve:

- Authentication and session persistence semantics.
- Stable module IDs and the distinction between RetailModuleId and ModuleDataId.
- Snapshot loading, cache invalidation, offline state and error semantics.
- Scanner Engine, camera lease, lifecycle, decoder, validation and Home/Stocktake integration.
- Stocktake and Stocktake Import IndexedDB schemas, local history, validation and output contracts.
- Shared body-scroll-lock ownership and nested overlay semantics.
- PWA update consent, release staging, activation blockers, boot health and rollback.
- Vite base path and GitHub Pages deployment contract.
- Lazy-loading and bundle boundaries.

The Scanner is considered operationally stabilized. Do not reopen SC-01–SC-05 or redesign scanner internals as a side effect of a visual redesign. Only scanner presentation and its documented integration boundary are in scope.

## 8. Required validation before adopting any API/library

- Desktop: Chrome and Edge at standard and narrow desktop widths.
- Mobile: Android Chrome/PWA and iOS Safari/Home Screen PWA.
- Older supported browser/WebView: feature detection and fallback path.
- Low-end profile: cold load, repeated navigation, scrolling, opening/closing overlays and long tables.
- Accessibility: keyboard, focus, screen reader labels, contrast, reduced motion and zoom.
- Offline: critical screen shell, local Stocktake and Import behavior, snapshot unavailable/stale states.
- Bundle: initial entry, lazy feature chunks, image/font bytes and generated release manifest.

## 9. Sources

Official references checked on 2026-11-25:

- MDN HTML Dialog: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
- MDN Popover API: https://developer.mozilla.org/en-US/docs/Web/API/Popover_API
- MDN Document.startViewTransition: https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition
- MDN CSS Container Queries: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40container
- MDN prefers-reduced-motion: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion
- MDN CSS Dynamic Viewport Units: https://developer.mozilla.org/en-US/docs/Web/CSS/length

## 10. Exit criteria — Batch 00B

- [x] Direct dependencies and lockfile inventory checked.
- [x] Existing internal UI foundations identified.
- [x] Global and feature CSS entry points identified.
- [x] Existing browser-native API usage searched.
- [x] Official browser compatibility sources checked.
- [x] Install/no-install recommendations and approval gate documented.
- [x] Protected contracts and validation requirements recorded.
- [ ] Local npm/Playwright/browser execution: not performed in this GitHub-only documentation audit.
- [ ] Physical device compatibility: not performed; remains an implementation acceptance gate.
