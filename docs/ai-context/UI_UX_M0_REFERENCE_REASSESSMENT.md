# RetailOS M0 — Reference Reassessment & Product-wide Direction

**Status:** Active reassessment input for M0. This document corrects the interpretation of the two supplied reference files. It is a design-direction proposal, not owner-approved final tokens or implementation.
**Sources inspected directly:** `IMG_1574(1).jpeg` (707 × 1536) and `ScreenRecording_11-24-2026 20-25-21_1(2).mp4` (17.77 s, 30 fps, 512 × 1112).
**Scope:** Entire RetailOS product.
**Supersedes:** Any assumption that the two references form one coherent app theme or that RetailOS should adopt a fixed amber palette.

## 1. Correct interpretation of the sources

The image and video are not two views of the same design system.

- The image is a Pinterest inspiration board containing multiple unrelated app concepts and visual systems.
- The video is a screen recording of a Pinterest feed showing a separate QuickBasket UI design example, including initial/loading and populated states, followed by the device control center.
- Therefore, the references must be mined for reusable design principles, not merged into one copied palette or one copied layout.

## 2. Image reference — visual grammar from a multi-concept board

### 2.1 What is actually visible

The board includes several different app directions:
- Warm yellow/amber presentation canvas framing device mockups.
- Paired light and dark mobile screens for a health/wellness concept.
- Cream/light surfaces with orange/amber highlights and charcoal panels.
- A project/payment concept with light calendar/list content paired with dark payment-card content.
- A business dashboard concept using yellow highlights, dark data panels, compact statistics and dense payment lists.
- A fitness concept using illustration, warm yellow hero panels, large numbers and a dark activity visualization.
- A finance concept using black/dark surfaces, high-contrast yellow/orange accents, product imagery and card-like data.
- A separate dark lifestyle concept using photography, black surfaces and compact navigation.
- Repeated rounded device framing, floating action/navigation elements and carefully composed presentation layouts.

### 2.2 Principles worth translating

1. **Distinctive composition:** screens are composed as designed products, not assembled from identical dashboard cards.
2. **Light/dark are full visual contexts:** dark surfaces have their own hierarchy, typography and component treatment.
3. **Color has a role:** accent colors direct attention to selected metrics, actions and progress rather than flooding every surface.
4. **Data is editorialized:** large values, progress rings, charts, lists and labels are composed as a readable visual hierarchy.
5. **Mixed density:** visual/hero areas coexist with compact data and operational lists.
6. **Controlled variation:** cards differ in size and visual weight when content priority differs.
7. **Device-aware craft:** mockups show intentional spacing, safe margins and navigation placement.
8. **Presentation quality matters:** crop, lighting, background, framing and negative space contribute to the perceived quality of the whole product.

### 2.3 What not to copy

- Do not use the Pinterest board's amber background as the RetailOS app canvas by default. It is also a presentation backdrop.
- Do not assume every sub-image shares one palette or one component system.
- Do not copy wellness, payment, finance or fitness semantics.
- Do not turn every RetailOS screen into a dark card grid, chart dashboard or phone mockup.
- Do not infer desktop architecture from this mobile-focused board.

## 3. Video reference — QuickBasket and progressive UI states

### 3.1 What is visible in the recording

- The Pinterest feed presents a green visual environment with a hand-held phone mockup.
- The QuickBasket design example uses a predominantly white/light interface, pale green content blocks, stronger green action/navigation accents, compact typography and restrained rounded surfaces.
- At the beginning, the phone UI is sparse/partially populated; later, content cards and recommendations appear.
- A populated shopping/basket screen is shown, with a green top/header region, progress/summary information and a compact list of suggested items.
- The video later returns to an initial/skeleton-like state and then to a populated prompt screen.
- The final segment is the phone's system control center, not part of the app design.

### 3.2 Principles worth translating

1. **Progressive readiness:** show the structure first, then reveal real content as it becomes available.
2. **Stable visual frame:** keep the app identity and content zones recognizable across loading and ready states.
3. **Low-noise composition:** use a restrained palette, simple surfaces and clear action hierarchy.
4. **Content-first layout:** cards and suggestions support the task rather than competing with it.
5. **State-specific composition:** loading, empty, ready and populated states should be designed deliberately.
6. **Motion restraint:** the recording supports progressive state change, but it does not provide reliable evidence for exact easing, duration or gesture physics.

### 3.3 What not to copy

- Do not adopt QuickBasket green as RetailOS brand color.
- Do not assume its basket/AI suggestions belong to RetailOS.
- Do not interpret the Pinterest screen recording, browser chrome or system control center as app functionality.
- Do not claim an animation specification from sampled frames alone.

## 4. RetailOS synthesis — a product language, not a copied theme

**Working design thesis: Editorial Operations — precision, character and calm progression.**

RetailOS should combine:
- The image board's visual ambition, intentional light/dark contexts, asymmetric composition and crafted data hierarchy.
- The video's restrained, progressive, low-noise state presentation.
- RetailOS's own retail identity, operational density, Vietnamese-first language and desktop/mobile requirements.

The target is not "amber RetailOS" or "green QuickBasket RetailOS". It is a coherent design system in which color, surface and layout are selected by task and semantic role.

## 5. Product-wide visual principles

### 5.1 Color architecture
- Preserve RetailOS red as the brand identity and primary high-value action color.
- Define a neutral foundation with both warm and cool/neutral surface options only where justified by the content and mode.
- Allow a secondary accent family for visualization or selected contexts only after semantic mapping; never let decorative accents conflict with success/warning/error/info meanings.
- Dark mode/context must be a complete system, not a dark sidebar.
- Do not lock exact amber/green values based on the references. Derive tokens from real RetailOS screens and contrast validation.

### 5.2 Typography
- Establish distinct roles for display/section titles, operational text, metadata, numeric values, table data and status labels.
- Vietnamese diacritics, product names, barcodes, quantities and dense tables are first-class test cases.
- Numbers must align and scan easily; use tabular numerals where useful.
- Avoid generic oversized headings and excessive uppercase labels.

### 5.3 Composition and layout
- Use one primary focal region, supporting work areas and compact secondary information.
- Permit asymmetric layouts where they express priority; preserve strict alignment for tables, forms and repeated operational rows.
- Do not repeat identical cards as the default page composition.
- Desktop can use spatial composition and multi-column work areas; mobile must be task-composed, not a squeezed desktop.
- Design real screen proportions, not only collage boards.

### 5.4 Surfaces and materials
- Define a small role-based surface grammar: canvas, workspace, raised panel, inset/data region, interactive control and transient overlay.
- Light and dark treatments must preserve equivalent semantic hierarchy and focus behavior.
- Use glass only where it clarifies spatial layering; opaque fallback is mandatory.
- Radius, border, shadow and elevation must be deliberate and consistent.

### 5.5 Imagery
- Use authentic store, shelf, product or workplace imagery only when it adds context or identity.
- Images must be art-directed: crop, tone, subject placement, contrast and aspect ratio matter.
- No generic stock-photo wallpaper behind dense operational data.
- Keep critical tasks usable when imagery fails to load or is unavailable offline.

### 5.6 Motion and progressive states
- Use progressive reveal for content readiness where it reduces perceived wait without hiding task controls.
- Preserve geometry to reduce layout shift.
- Use short opacity/transform transitions; avoid costly blur and animated dimensions.
- Define loading, empty, ready, partial, error and offline states per workspace.
- Respect reduced motion; no essential state depends on animation.

## 6. Product-wide validation surfaces

| Layer | Representative screens | What the direction must prove |
|---|---|---|
| Identity | Login | Brand character, typography, real photography and focused entry |
| Global shell | Desktop/tablet/mobile shell | Navigation, spatial hierarchy, responsive identity |
| Core | Home, Module Library, Search, Notifications | Discovery, hierarchy, real event/readiness states |
| Operations | Stocktake, Stocktake Import | Dense data craft, progress, validation and output |
| System | Settings, Update Center, offline/error/loading | Trust, recovery, release-state clarity |
| Protected presentation | Scanner entry/result surfaces | Visual integration only; engine unchanged |

Activity remains gated by real event data. Integrating modules must not be represented as ready workflows.

## 7. M0 execution sequence — reset

### M0-1 — Reference extraction and design principles
- [x] Inspect the original image directly.
- [x] Inspect the original video directly.
- [x] Separate visual inspiration from interaction/state evidence.
- [x] Record what is visible, what can be translated and what must not be copied.

### M0-2 — Art Direction exploration
Create two or three distinct RetailOS-native directions, not three color swaps:
- Direction A: editorial warm-neutral with selective brand red.
- Direction B: high-contrast light/dark operational with stronger spatial depth.
- Direction C: restrained minimal progressive UI with data-led composition.

Compare typography, surfaces, card grammar, navigation, photography and data hierarchy using the same real RetailOS content.

### M0-3 — Signature screen studies
Create separate inspectable prototypes for:
- Login.
- Home.
- Module Library.
- Stocktake.
- Stocktake Import.
- Settings/Update Center.

Use source-verified labels, fields and states. Do not fabricate KPIs, event counts, module readiness or progress.

### M0-4 — Responsive and motion study
- Desktop office, tablet and mobile compositions.
- Light/dark context where appropriate.
- Loading → ready, active state, sheet/dock, progress and completion.
- Reduced-motion and low-performance fallback.

### M0-5 — Product-wide consistency and owner decision
Compare all representative screens side by side. Select one direction and lock the shared rules only after operational usability and visual distinction both pass.

## 8. M0 quality gate

M0 cannot exit until:
- [ ] A RetailOS-native direction is visibly distinctive from generic generated admin templates.
- [ ] It draws on both sources without copying either source's palette or content.
- [ ] The chosen language works across Login, core, operational and system surfaces.
- [ ] Light/dark contexts are intentional and consistent.
- [ ] Desktop, tablet and mobile are composed deliberately.
- [ ] Real operational labels, fields, module readiness and state semantics are reconciled.
- [ ] Typography and Vietnamese data readability are validated.
- [ ] Contrast, keyboard, touch and reduced-motion behavior are validated.
- [ ] Low/mid-range performance feasibility is demonstrated.
- [ ] Owner explicitly accepts the M0 direction before M1.

## 9. Protected boundaries

This reassessment is design-only. Preserve authentication/session, module IDs/readiness truth, snapshot/cache/data contracts, Scanner Engine/camera lifecycle, Stocktake/Import persistence and output, shared body scroll lock, PWA update/release lifecycle, lazy loading, bundle boundaries and GitHub Pages base path. No source migration, dependency addition, merge or deployment is authorized by this document.
