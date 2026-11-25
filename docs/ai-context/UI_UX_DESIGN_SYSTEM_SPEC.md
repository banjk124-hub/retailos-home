# RetailOS Design System Specification — Batch 00D

**Status:** Proposed specification; no design tokens or application styles are implemented by this document.
**Original audit baseline:** `main` at `2003ea24966755d0ad4e0298b34422b053267e77`
**Current source revalidation:** see [UI_UX_PHASE_00_AUDIT.md](./UI_UX_PHASE_00_AUDIT.md), audited at `588d8f937525acb29ebb7b0de97a9b1dcf61c0c7`. Proposed tokens remain unimplemented.
**Date:** 2026-11-25
**Purpose:** Define the target RetailOS visual language and the implementation contract for foundations, typography, color, layout, materials, components, motion, responsive behavior and performance before source migration begins.

## 1. Design intent and product language

**Reference authority:** [UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md](./UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md) is governing. The image informs structural composition only; the video informs motion/feedback/state behavior only; RetailOS defines brand, business semantics and data truth. Never merge the reference palettes or copy their product semantics.

**M0-A structure:** [UI_UX_M0_A_STRUCTURAL_BLUEPRINT.md](./UI_UX_M0_A_STRUCTURAL_BLUEPRINT.md) is the current source-grounded structural specification. Exact tokens, fonts, navigation geometry and component styling remain proposals until individual screen prototypes and contrast/device checks are accepted.

**M0-B motion:** motion and animation are presentation-only. They must reflect source-owned state, never drive business state, persistence, fetches, writes, subscriptions or platform lifecycle.

RetailOS is an operational workspace, not a generic admin template and not an AppSheet skin.

The target language combines:
- Spatial composition: layered workspaces, clear planes, deliberate depth, asymmetric but controlled content composition.
- Soft motion: progressive reveal, calm state transitions, tactile controls and purposeful spatial movement.
- Editorial hierarchy: strong page titles, restrained labels, readable operational data and meaningful whitespace.
- RetailOS identity: a recognizable red/neutral identity, operational confidence, real product/store imagery where useful, and consistent iconography.
- Functional density: desktop makes good use of wide office screens; mobile narrows focus to the task and keeps controls reachable.

The two references are inspiration sources, not pixel templates. Do not copy their logo, palette, typography, composition or animation literally. The result must be recognizably RetailOS.

### 1.1 Visual principles

1. Hierarchy before decoration: the user must recognize context, priority, state and next action immediately.
2. Depth with purpose: material and elevation communicate layer and interaction; they are not decoration applied to every card.
3. One focal point per workspace: avoid competing hero sections, gradients and badges.
4. Data is the interface: operational values, timestamps, status and exceptions must remain legible at realistic density.
5. Motion explains change: motion communicates entry, focus, state transition or spatial relationship, never delays an action.
6. Photography is intentional: use authentic retail, product, warehouse or workplace imagery only when it adds context; avoid stock-photo wallpaper and heavy background imagery.
7. Consistency without sameness: modules share tokens and interaction grammar but can use task-appropriate workspace layouts.

## 2. Source audit — confirmed current state

This section records the audited main source, not a target requirement.

### 2.1 Typography and fonts

- Global base CSS declares Inter with system fallbacks.
- Theme tokens also declare Inter, system UI fallbacks, Arial.
- Home component CSS repeats Inter declarations in several headings and metric values.
- No WOFF, WOFF2, TTF or OTF font assets are tracked in the repository tree.
- There is no confirmed @font-face declaration in the inspected global, Home, Brand or Login styles.
- Current scale in theme.css ranges from 12px xs to a fluid display size; several feature CSS files also use literal font sizes.

Implication: current rendering depends on installed/system font availability. Font selection is not yet a fully controlled asset decision. Do not assume Inter is bundled.

### 2.2 Color and semantic tokens

The theme token source currently defines:
- Brand primary #d92736, deep #a91829, soft #fff0f1.
- Ink #242329, muted #85818a, white #fff.
- Semantic success #187456, warning #98601f, error #b42332, info #356a8d, neutral #716970.
- Text primary #302a30, secondary #716970, muted #918890.
- Light page/card/raised/muted/input/control surfaces.
- Focus ring and base spacing/radius scales.

The repository also contains parallel color vocabularies:
- base.css defines generic ink/muted/line and legacy blue tokens.
- theme.css maps some legacy blue aliases to the RetailOS red.
- home-engine.css declares its own retail background, ink, muted, red and line values.
- home-redesign.css declares ro-red, ro-red-deep, ro-red-soft, ro-ink and ro-muted.
- brand.css defines RetailOS brand aliases.
- Glass tokens define separate RGB color channels and compatibility aliases.
- Home component styles contain numerous literal colors and department/module tints.

Implication: red/white is the current intended brand direction, but the token source is fragmented. A future implementation must have one canonical semantic token layer and documented aliases only during migration.

### 2.3 Spacing, radius and layout

- theme.css currently defines spacing tokens from 4px to 40px.
- theme.css radius tokens range from 8px through 28px plus pill.
- home-redesign.css separately defines 30px, 24px and 18px radius values.
- Home and responsive styles use several breakpoints: 1500px, 1200px, 1100px, 1099px, 940px, 700px, 420px, 380px and short landscape.
- Multiple CSS files contain overlapping max-width:700px and reduced-motion rules.

Implication: the current scale is usable as an inventory baseline, not a finished system. Breakpoints and layout tokens must be rationalized during implementation rather than duplicated.

### 2.4 Materials and glass

The Glass system currently has six material variants: soft, frosted, elevated, floating, control and dark. Each variant defines opacity, blur, saturation, border, highlight, reflection, shadow, ambient tint and foreground. It also defines legacy aliases for cards, elevated surfaces, modals and brand glass.

GlassSurface exposes an element type, material, tone and interactive flag. Current CSS includes backdrop-filter, layered gradients, inset highlights, focus/error/disabled states and a fallback for browsers without backdrop-filter.

The current app uses additional direct glass declarations in Home, Login, navigation and feature CSS. Some surfaces apply blur independently of GlassSurface.

Implication: the Glass implementation is rich, but the application currently has overlapping material implementations. Do not add another glass layer. Decide which materials survive, reduce the semantic set to the roles actually needed, and consolidate all use under one ownership model.

### 2.5 Motion

The shared Motion system currently defines:
- Durations: 0ms, 140ms, 200ms, 360ms, 420ms, plus identity and icon-specific durations.
- Easing curves: standard, enter, exit, emphasized, spatial and identity.
- Spring curves and distances from 2px to 24px.
- MotionProvider, MotionBoundary, MotionPage, MotionPresence, MotionButton, MotionCard, MotionSheet and MotionIcon behavior.
- Reduced-motion media and a user/system preference data attribute.
- A power-conserve mode that reduces some motion and blur durations.

Additional feature CSS declares local keyframes and literal transition durations. mobile-tuning.css overrides broad controls and Home/Login timing and contains multiple responsive/reduced-motion sections.

Implication: motion foundations exist, but the target needs one motion vocabulary and a clear boundary between shared transitions and feature-specific choreography.

### 2.6 CSS ownership and cascade risk

The audited main baseline had 25 CSS files; the Phase 00 audit branch has 24 after retiring the unimported `home-phase2.css`. `main.tsx` imports eight global stylesheets plus Brand, Motion, Glass tokens/materials and LiquidDock CSS. HomeScreen imports five Home stylesheets: home.css, home-ux.css, home-engine.css, home-redesign.css and home-architecture.css. The Home styles are layered in addition to global theme, responsive, mobile, performance, adaptive and native-experience styles.

`mobile-tuning.css` is approximately 87 KB and includes broad touch rules, large mobile overrides, repeated media-query sections and some !important declarations. Home and theme CSS also contain overlapping selectors and literals. The exact set of dead selectors and computed winning declarations has not yet been established.

Implication: CSS migration must begin with selector/cascade and consumer analysis. Do not delete or rewrite styles based only on file names. Do not add another override stylesheet as the new design-system layer.

### 2.8 Feature-level visual divergence

The feature CSS confirms that the design language is not yet fully shared:
- Scanner Settings and Stocktake define many independent warm-red/neutral values directly in feature selectors.
- Scanner presentation uses a deliberate dark camera surface with translucent controls; this is a feature-specific context and should remain visually distinct where camera legibility requires it.
- Stocktake Import uses neutral/blue fallback tokens such as surface-elevated, surface-secondary, text-tertiary and border-subtle, while several import controls/statuses define independent blue, green, amber and red literals.
- Stocktake and Import use separate panel, button, table, status, spacing and radius rules instead of a fully shared operational-workspace component contract.

Implication: the target system must support semantic feature contexts and data-workspace density without forcing every feature into one color or material. Consolidation should normalize shared roles and state meanings, not flatten legitimate task-specific surfaces or status colors.

### 2.7 Brand, icons and imagery

- Brand is a React component system with BrandMark, BrandWordmark and BrandMotion.
- Brand config currently identifies the product as RetailOS, with wordmark split Retail + OS and caption RETAIL OPERATIONS.
- BrandMark is a custom inline SVG with spine, letterform, shelf and signal details.
- Lucide React is the installed icon source; icon.registry.ts maps departments, modules, library groups and Home navigation.
- public/icon.svg is the only tracked raster/vector image asset found in the full repository tree.
- No bundled font assets or image library were found.

Implication: product name and operational identity remain stable, but the mark, wordmark styling, icon mapping and imagery direction are open design decisions.

## 3. Target design-system architecture

The target system has six layers:

1. **Brand identity:** wordmark, logo mark, brand assets, brand voice and image direction.
2. **Foundations:** semantic color, typography, spacing, sizing, radius, border, elevation, focus and motion tokens.
3. **Materials:** flat, tinted, frosted, elevated and dark surfaces only where a distinct role is needed.
4. **Primitives:** Stack, Inline, Grid, Surface, Text, Icon, Button, Field, Divider and focus/visually-hidden utilities.
5. **Components:** navigation item, toolbar, status badge, search field, data table, metric, notice, dialog, popover, empty state and other reusable UI.
6. **Patterns:** app shell, workspace header, overview, search/results, data workbench, review, import/export, capture/scanner and settings.

Feature modules compose patterns; they do not create new global token sets.

### 3.1 Ownership

- Brand identity owns logo and wordmark assets.
- Design foundations own semantic tokens and typography.
- Material layer owns surface variants and fallbacks.
- Component layer owns reusable visual and interaction behavior.
- App Shell owns global navigation, page frame and cross-workspace context.
- Feature modules own domain-specific composition, validation and persistence.
- Shared platform owns overlay coordination, motion preference, PWA release and shared browser lifecycle.

One responsibility must have one canonical implementation. Temporary compatibility aliases are allowed only with an owner and removal milestone.

## 4. Proposed foundation tokens

The values below are a starting proposal derived from current source values. They are not yet production CSS and must be validated against screen blueprints, accessibility contrast and visual review in 00G.

### 4.1 Color semantics

Use semantic names rather than component-specific names.

| Token role | Initial direction | Notes |
|---|---|---|
| brand.primary | Current RetailOS red family, starting reference #d92736 | Validate contrast for text, icon and filled controls |
| brand.primary-strong | Deep red family, starting reference #a91829 | High-emphasis actions and active states |
| brand.primary-subtle | Soft red family, starting reference #fff0f1 | Selected/soft brand surfaces |
| text.primary | Dark neutral, starting reference #302a30 | Body and high-priority labels |
| text.secondary | Mid neutral, starting reference #716970 | Supporting copy |
| text.muted | Current muted reference #918890 | Use only when contrast remains adequate |
| surface.canvas | Warm near-white, starting reference #fffafa | Main application canvas |
| surface.panel | Neutral white | Main work surfaces |
| surface.raised | White/near-white with elevation | Floating panels and menus |
| border.subtle | Neutral low-contrast line | Structural separation |
| status.success | Current green reference #187456 | Completed/valid/success |
| status.warning | Current amber reference #98601f | Needs attention / caution |
| status.danger | Current red reference #b42332 | Error, blocked or destructive |
| status.info | Current blue reference #356a8d | Informational, not primary brand |
| status.neutral | Current neutral reference #716970 | Unknown, inactive or non-actionable |

Rules:
- Brand red is not a universal status color. A red brand action must not imply error.
- Success, warning, danger, info and neutral must be distinguishable by more than hue: pair with text/icon/shape.
- Do not use the old blue alias as a second brand color.
- Department/module colors are secondary metadata and must not compete with status semantics.
- Do not use opacity alone to communicate disabled, unavailable or stale state.
- Contrast must be checked on the final foreground/background pair; color values are not accepted based on appearance alone.
- Light appearance remains the only currently confirmed supported theme. Dark mode is not part of this specification until product and platform behavior are explicitly designed.

### 4.2 Typography

Target roles:
- Display: product/feature hero only, limited use.
- Page title: clear workspace context.
- Section title: strong hierarchy without competing with page title.
- Body: operational instructions and descriptions.
- Label: compact but legible form/table metadata.
- Data: tabular numerals for quantities, prices, codes and dates where supported.
- Microcopy: concise helper/status text; never shrink critical operational content to fit.

Initial scale proposal:
- 12px compact metadata only.
- 13–14px dense supporting text.
- 15–16px default body and controls.
- 18–20px section heading.
- 24–32px page heading depending on viewport.
- 32–48px display only for controlled hero use.

Rules:
- Prefer rem-based tokens and a small type scale; avoid per-component literal font sizes.
- Use font-weight 400/500 for body, 600 for labels/actions and 700/800 only for strong hierarchy.
- Use tabular numerals for quantities/prices when available.
- Vietnamese diacritics, punctuation, mixed uppercase codes and long product names must be tested.
- No font package is required. Evaluate self-hosted WOFF2 candidates with full Vietnamese glyph coverage, at least regular/medium/semibold/bold weights, license review, file-size measurement and fallback behavior.
- Be Vietnam Pro may be evaluated as a candidate; it is not selected. Compare against the current Inter/system stack on real Vietnamese UI, digits, dense tables and iOS/Android rendering.
- Do not load remote font services at runtime as a critical dependency. Prefer local versioned assets if a custom font is accepted.
- Avoid synthetic font weights when the chosen family provides the needed real weights.

### 4.3 Spacing and sizing

Use a 4px base rhythm with semantic aliases:
- 4px: micro gap.
- 8px: compact gap.
- 12px: control/content gap.
- 16px: standard inset.
- 20px: comfortable inset.
- 24px: section inset.
- 32px: major section separation.
- 40px and above: spacious desktop composition only.

Controls:
- Touch controls should target at least 44px where practical.
- Desktop controls may be denser but must remain keyboard and pointer accessible.
- Data tables may use compact row heights when the user can still scan and interact accurately.
- Avoid fixed heights for text-bearing cards unless content overflow is handled.

### 4.4 Radius, border and elevation

Initial radius roles:
- Small: 6–8px for tags and compact controls.
- Control: 10–12px for inputs and buttons.
- Card: 14–18px for work cards and panels.
- Feature/hero: 20–28px where composition justifies it.
- Pill: reserved for compact chips and fully rounded controls.

Do not make every surface maximally rounded. Data workspaces should use restrained geometry.

Elevation roles:
- Level 0: canvas, no shadow.
- Level 1: panel separation via border or subtle shadow.
- Level 2: raised card or toolbar.
- Level 3: floating menu/popover.
- Level 4: modal/dialog.
- Avoid stacking multiple large shadows on nested cards.

Focus ring is a semantic token and must remain visible in keyboard use. Do not remove outlines without a stronger replacement.

## 5. Material and surface system

Reduce the current six Glass variants to role-based materials after component usage audit. Proposed target roles:

| Material role | Intended use | Constraint |
|---|---|---|
| Flat | Main canvas, dense data/table workspaces | Default for content-heavy surfaces |
| Tinted | Selected state, brand emphasis, category grouping | Low opacity; preserve text contrast |
| Frosted | Header, floating dock or visually layered navigation | Limited area; avoid large scrolling backdrops |
| Elevated | Popover, floating action surface, compact overlay | Use sparingly |
| Modal | Dialog/sheet backdrop and foreground | Keep modal content opaque enough for legibility |
| Dark | Brand showcase or controlled dark surface | Not a global dark theme |

Rules:
- Do not apply backdrop blur to every card, row or large container.
- Avoid nested blur surfaces.
- Provide an opaque fallback and a power-conserve appearance.
- Use a solid/tinted surface when blur is visually negligible or too expensive.
- Blur, saturation and large fixed overlays must be profiled on low-end Android and iOS.
- No glass treatment may reduce text contrast, obscure table content or create ambiguous hit targets.
- Scanner preview and camera content must not inherit decorative blur or filters.

## 6. Component and interaction foundations

### 6.1 Primitives

Required primitives:
- Layout: Stack, Inline, Grid and Container.
- Surface: Surface/Panel with semantic variants.
- Typography: Text, Heading, Label and DataValue.
- Controls: Button, IconButton, TextField, Select, Checkbox, Switch and SegmentedControl.
- Feedback: StatusBadge, InlineNotice, Toast, Progress and Skeleton.
- Navigation: NavigationItem, Breadcrumb and WorkspaceTabs only where needed.
- Overlay: Dialog, Popover, Sheet and Tooltip wrappers with centralized lifecycle/accessibility ownership.

Primitives must expose semantic variants, not arbitrary one-off color props. Avoid universal components with dozens of unrelated props.

### 6.2 Button contract

Button variants:
- Primary: one dominant action per local context.
- Secondary: supporting action.
- Tertiary/Ghost: low-emphasis navigation or inline action.
- Destructive: irreversible or high-risk action.
- Icon-only: only with accessible name and adequate target size.

States:
- idle, hover, focus-visible, pressed, loading, success (only when action is confirmed), disabled and unavailable.
- Loading must not permit duplicate submission.
- Disabled and unavailable must explain why when the reason is not obvious.
- Action completion must be reported only after the actual operation resolves.

### 6.3 Status contract

Separate domain state from visual variant. Every status component maps a domain state to:
- label,
- semantic tone,
- icon/shape,
- optional supporting description,
- optional action.

Status labels can be rewritten for clarity, but domain meaning cannot be changed by presentation. Use consistent words for the same state across modules. Never infer success from request initiation or display a stale snapshot as live.

### 6.4 Icon contract

- One canonical icon library and registry.
- Current Lucide React is a candidate, not a permanent constraint; replacement is allowed if the new set materially improves the target language and has a migration plan.
- Use a consistent stroke/optical weight and size scale.
- Do not mix emoji, arbitrary SVGs and multiple icon packs for ordinary interface controls.
- Icons supplement labels; critical actions must not rely on ambiguous icon-only affordances.
- Brand mark is not a generic UI icon.

### 6.5 Logo and brand asset contract

- Product name RetailOS remains stable unless a separate product naming decision is made.
- Logo mark, wordmark construction, lockup, colors and motion may be redesigned.
- New mark must work at favicon/app-icon sizes, on light/dark brand surfaces, and in monochrome.
- Validate recognizability at 16px, 24px, 32px, 48px and large presentation sizes.
- Do not use animated logo as a prerequisite for app boot or navigation.
- Keep app icon, manifest icons, in-app mark and splash/identity presentation consistent.
- Do not use text as a substitute for an image asset if the brand mark is part of the intended visual result.

## 7. Motion system specification

### 7.1 Motion vocabulary

- Micro feedback: press, toggle, focus and icon response.
- State transition: loading, success, warning, error and selected-state change.
- Spatial transition: opening/closing a sheet, switching workspace or moving between related surfaces.
- Progressive reveal: staged appearance of a screen hierarchy.
- Ambient motion: rare, low-frequency brand or hero detail only.

### 7.2 Initial timing proposal

Starting from the current shared motion tokens:
- Micro: 100–140ms.
- Standard interaction: 160–220ms.
- Component reveal: 220–320ms.
- Spatial transition: 280–420ms.
- Ambient movement: slow and non-essential; disable in conserve mode.

These are target ranges, not blanket durations. Input response must remain immediate; animation may continue after the state/action has already updated.

### 7.3 Performance and accessibility

- Prefer transform and opacity for frequent transitions.
- Avoid animating width, height, margin, padding, layout, large shadows or backdrop blur.
- Use filter only for short, small-surface effects after profiling.
- Avoid infinite motion except essential loading indication; no decorative infinite motion on low-power mode.
- Stagger only a small number of meaningful elements; never delay the availability of controls.
- Do not use will-change as a blanket optimization; add it only after profiling a specific issue and remove it after the transition.
- Honor prefers-reduced-motion and the existing user motion preference. Reduced motion must remove spatial travel and ambient motion, not merely shorten every animation.
- Conserve mode should reduce blur, animation count, distance and duration; the layout and affordances must remain fully functional.
- Scanner frame acquisition/decoding and camera lifecycle must remain independent of UI animation.
- Verify motion on a low-end Android device and desktop integrated graphics, not only a high-end iPhone.

Performance basis: MDN recommends minimizing unnecessary animation, preferring transform/opacity where possible, and using will-change sparingly after identifying a real issue. See sources in section 11.

## 8. Responsive and platform contract

### 8.1 Layout modes

- Desktop office: full workspace shell, persistent navigation, wide data regions, keyboard and pointer affordances.
- Compact desktop/tablet landscape: adaptive navigation rail, reduced side chrome and content-aware grids.
- Tablet portrait: one dominant workspace column with contextual navigation.
- Mobile portrait: task-focused single column, reachable primary actions, safe-area aware overlays and minimal decorative layers.
- Short landscape: avoid full-screen hero composition; prioritize task content and keyboard visibility.

### 8.2 Breakpoint policy

The current source has many breakpoints. The target should consolidate to a small named set after 00E screen maps are reviewed. Proposed breakpoint roles:
- compact: up to approximately 640px.
- medium: approximately 641–900px.
- wide: approximately 901–1279px.
- desktop: 1280px and above.

These are design roles, not final CSS values. Components should use container queries where their layout depends on available component width; global breakpoints should govern shell/navigation behavior.

### 8.3 Platform requirements

- iOS Safari and installed Home Screen PWA: safe areas, keyboard/IME, dynamic browser chrome, focus zoom and fixed overlays.
- Android Chrome and installed PWA: low-end performance, touch feedback, viewport and back behavior.
- Desktop Chrome/Edge: keyboard, hover, focus, dense data and narrow-window behavior.
- All platforms: zoom, long Vietnamese labels, long product names, large values, offline states and no horizontal overflow.

## 9. Accessibility and content rules

- WCAG 2.2 AA is the target baseline for contrast, focus visibility, target sizing and keyboard access.
- Never communicate state by color alone.
- Preserve semantic HTML and accessible names.
- Dialogs and sheets must manage focus, Escape behavior, background interaction and focus restoration.
- Popovers remain non-modal unless explicitly designed otherwise.
- Text must support Vietnamese diacritics, mixed case, numbers, SKU/barcode codes and long content.
- Critical data and action labels must not be hidden behind hover-only behavior.
- Reduced motion, keyboard navigation, zoom and screen-reader semantics are acceptance requirements.

## 10. Token naming and CSS ownership

Use semantic namespaces:
- color.brand.*
- color.text.*
- color.surface.*
- color.border.*
- color.status.*
- typography.family.*, size.*, weight.*, line-height.*
- space.*
- size.control.*, size.icon.*, size.layout.*
- radius.*
- elevation.*
- material.*
- motion.duration.*, easing.*, distance.*
- layer.z.*

Rules:
- One canonical token file/entry point.
- Feature CSS consumes semantic tokens; it must not redefine brand palettes or global scales.
- No new global selectors for feature-specific visual behavior.
- Avoid !important except a documented accessibility/platform override with a test.
- Use CSS cascade layers or equivalent explicit import ownership if the migration architecture chooses them; do not mix both layered and uncontrolled specificity systems.
- Each feature stylesheet owns only its feature root and descendants.
- Remove old aliases after all consumers migrate.
- Do not create a second design-system package inside the app.

## 11. Verification and acceptance gates

### 11.1 Before token implementation

- Contrast-check all text/status/action combinations.
- Compare typography candidates with Vietnamese content and actual product data.
- Audit every existing token declaration and computed winning value.
- Inventory logo/icon/image consumers and manifest assets.
- Map CSS import order, selector ownership, duplicate selectors and !important declarations.
- Record baseline screenshots at desktop, tablet, iOS and Android sizes.
- Record current bundle sizes and initial CSS transfer size.

### 11.2 During implementation

- Token coverage for all newly migrated screens.
- No unowned literal colors, spacing, radius or motion values in migrated UI.
- No duplicate global token systems.
- No permanent parallel CSS overrides.
- Component API, accessibility and state tests.
- Reduced-motion and conserve-mode tests.
- Build, TypeScript and relevant Playwright checks.

### 11.3 Visual/performance acceptance matrix

- Desktop: 1440px and 1280px workspace; narrow 1024px window.
- Tablet: portrait and landscape.
- Mobile: 390px and 360px widths, plus short landscape.
- iOS Safari and iOS Home Screen PWA.
- Android Chrome and Android installed PWA, including a low-end profile.
- Check cold load, navigation, scrolling, table interaction, overlays, focus, keyboard, offline and update states.
- Measure input-to-first-feedback, long tasks, layout shift, CSS/font/image bytes, memory pressure and blur/motion cost.
- Do not claim physical acceptance from CI or source inspection alone.

## 12. Migration sequence

1. Confirm this specification and screen blueprints.
2. Establish the canonical brand and token source.
3. Audit selector ownership and computed styles.
4. Create the target foundation and primitives in isolation.
5. Migrate App Shell and one representative workspace.
6. Compare desktop/mobile screenshots and performance against baseline.
7. Migrate remaining screens and shared patterns.
8. Remove superseded tokens, CSS, components and assets after consumer verification.
9. Update docs and enforce design-system contribution rules for future modules.

No source implementation, package installation, logo replacement or stylesheet deletion is authorized by this specification alone.

## 13. Open decisions for 00E–00H

- Final logo/wordmark concept and app icon.
- Final font family after Vietnamese rendering, license and bundle evaluation.
- Final red/neutral palette and contrast-verified status tones.
- Whether a dark appearance is a real product requirement.
- Final breakpoints and desktop navigation geometry.
- Final reduced Glass material set.
- Final button/input/table density by workspace.
- Final component library/framework/router choice after navigation and component audits.
- Final image asset direction and sourcing/licensing.

## 14. Research sources

- MDN CSS performance and animation guidance: https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/CSS
- MDN will-change guidance: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change
- MDN backdrop-filter behavior: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/

## 15. Batch 00D exit criteria

- [x] Existing theme, base, brand, Glass and Motion token systems inspected.
- [x] Existing font declarations and repository font assets checked.
- [x] Existing logo, wordmark, icon registry and image asset inventory checked.
- [x] Global and Home CSS entry points and major override risks identified.
- [x] Target design-system layers and semantic token roles specified.
- [x] Typography, material, motion, responsive, accessibility and performance contracts specified.
- [x] Full presentation replacement authority and protected behavior boundary incorporated.
- [ ] Contrast-verified final palette: deferred to visual prototype and contrast audit.
- [ ] Font candidate comparison on actual screens/devices: deferred to implementation validation.
- [ ] Selector-level computed-style/dead-CSS audit: not performed in this GitHub source review.
- [ ] Browser/device visual acceptance: not performed.
- [ ] Application source changes or dependencies: none in Batch 00D.
## 4.7 Open extension model and component contribution lifecycle

The Design System is an evolving platform, not a closed list of approved components. The Core Foundation defines the common RetailOS language and quality constraints; it does not prescribe every future screen or control.

Use three layers:
- **Core Foundation:** brand, semantic meaning, typography, hierarchy, spacing conventions, accessibility, responsive principles, motion and performance principles.
- **Shared Design System:** reusable tokens, primitives, components and patterns that have demonstrated cross-feature value.
- **Feature Experience:** feature-owned layouts, compositions, controls and interaction patterns specialized for a task.

A new feature is not limited to the current shared catalogue. If no existing component fits its operational need, create a feature-owned solution. Do not distort a generic component or add dozens of unrelated props to force reuse.

### Component lifecycle

| State | Meaning | Promotion/exit rule |
|---|---|---|
| Experimental | Being explored in a bounded feature/prototype | Validate task fit, accessibility, responsive behavior and performance |
| Feature-owned | Stable solution owned by one feature | Keep local unless genuine cross-feature reuse emerges |
| Shared Candidate | Reuse is demonstrated across independent consumers | Review semantic fit, API, variants, ownership and migration cost |
| Shared Stable | Accepted reusable contract | Document API, states, accessibility, responsive and performance behavior |
| Deprecated | A replacement is preferred | Publish migration guidance and migrate consumers |
| Retired | No supported consumer remains | Remove after consumer and regression verification |

Promotion is not automatic: two visually similar components may have different semantics and should remain separate. Conversely, a feature-originated component may become a shared contribution when its behavior proves broadly useful.

### Contribution requirements

A proposed shared contribution records:
- Problem and consumers it serves.
- Why existing shared components are insufficient.
- Semantic responsibility and explicit non-goals.
- API, variants and state contract.
- Responsive, keyboard, touch and assistive-technology behavior.
- Motion/reduced-motion behavior where applicable.
- Performance and bundle impact.
- Ownership, tests, migration and rollback.

Shared components must remain composable and focused. Do not create a universal mega-component. The shared catalogue may grow, change or shrink as product evidence evolves.
