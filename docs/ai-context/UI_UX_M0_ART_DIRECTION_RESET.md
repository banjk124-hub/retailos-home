> **Historical-document notice (2026-11-26):** This file is retained for traceability only and is not an active instruction or status source. Use [INDEX.md](./INDEX.md) to locate current owners and [DEPRECATION_REGISTER.md](./DEPRECATION_REGISTER.md) for this file's disposition. The active UI/UX direction is [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md). Verify all implementation facts against current source.

---

# RetailOS M0 Reset — Art Direction & Craft Standard

**Status:** REJECTED AS ACTIVE ART DIRECTION. This amber/sand-led proposal is superseded by the later owner-confirmed burgundy/dark-red direction in UI_UX_M0_GOVERNING_SPEC.md. Retain only as historical evidence of a rejected exploration; do not reuse its palette or direction.
**Scope:** Entire RetailOS product — shell, core experiences, operational workspaces, system surfaces, shared UI language and responsive behavior.
**Reference:** User-provided `IMG_1574.jpeg`, reopened and inspected directly for this reset. The previous concept boards are retained only as historical structural explorations; they are not the visual quality benchmark.
**Protected baseline:** Existing 00B–00H source audits and all business/platform contracts remain in force.

## 1. Why M0 is being reset

The previous concept boards established product coverage but defaulted to a familiar generated-admin composition: uniform sidebar, white panels, repeated rounded cards, red primary buttons and generic dashboard typography. This is not sufficiently distinctive and does not translate the reference's visual craft.

The reset separates two questions:
1. **What product surfaces and behavior must RetailOS support?** Already mapped in 00C–00H.
2. **What is the distinctive visual language and level of craft?** Reopen this from the reference, not from generic enterprise UI conventions.

Do not use the previous concept board as a styling template. Reuse only its coverage inventory and source/contract notes.

## 2. Direct reading of IMG_1574.jpeg

The reference is a Pinterest inspiration board showing multiple mobile product UIs, not one single app screen.

### 2.1 Dominant visual grammar observed

- **Warm amber/yellow outer canvas:** broad warm yellow/orange surfaces frame the app compositions. The background is a designed visual field, not a default neutral page.
- **Paired light and dark modes:** several app concepts show a light screen paired with a dark screen. The contrast is structural and deliberate, not merely a dark sidebar.
- **Warm accent system:** orange/amber is used for navigation bars, active controls, metric cards, progress rings and selected surfaces.
- **Soft but dimensional surfaces:** rounded containers, layered cards, inset panels, subtle shadows and clear separation between surface planes.
- **Editorial type hierarchy:** compact uppercase metadata, strong display/section titles, smaller supporting copy and numerically prominent metrics.
- **Asymmetric card composition:** mixed card sizes and varied proportions create rhythm; not every item is a same-sized tile.
- **Data visualization as interface:** line charts, progress rings, metric blocks, tabs and segmented content are integrated into the visual composition.
- **Compact floating navigation/action:** bottom navigation is low-profile, with a centered prominent action in some examples.
- **Presentation craft:** the board uses generous breathing room, consistent device framing, deliberate cropping and repeated visual motifs across separate concepts.

### 2.2 What must not be inferred

- The reference does not establish RetailOS brand colors, exact typeface, exact spacing, exact blur, motion duration or desktop navigation.
- The reference is mobile-focused; it does not prescribe the desktop shell.
- Fitness, payments and lifestyle content are not relevant to RetailOS business semantics.
- The board is an inspiration collage; do not reproduce its layouts pixel-for-pixel.

## 3. New RetailOS art direction

**Working direction: Warm Industrial Editorial.**

RetailOS should combine the reference's warm visual energy, paired light/dark surfaces, dimensional cards and editorial hierarchy with the credibility and precision of a retail operations product.

It must feel authored, not assembled from a generic dashboard kit.

### 3.1 Signature visual devices

1. **Warm field, not plain white:** introduce a controlled warm amber/sand environmental layer in selected entry, overview and presentation contexts. Operational workspaces may use quieter surfaces for long-duration reading.
2. **Dual-surface identity:** light and dark are both designed modes/contexts. Dark is not just a black navigation strip; use it selectively for focused operational panels, scanner-adjacent context, high-contrast hero zones or user-selected appearance where the platform supports it.
3. **Amber as a crafted accent:** use amber/citrus for progress, active navigation, focus cards and highlights. RetailOS red remains the brand/action signature. Neither should flood entire screens. Define semantic distinction so amber never impersonates warning unless its meaning is explicitly warning.
4. **Signature metric modules:** operational KPIs may use progress arcs, compact trend lines and large numeric hierarchy only when backed by real data and meaningful denominators. Never fabricate dashboard metrics.
5. **Asymmetric composition with rules:** use one dominant focal region, one or two supporting regions and compact secondary information. Do not make every screen a symmetrical 3-column card grid.
6. **Layered surface construction:** use clear base, raised, inset and floating planes with controlled shadows/highlights. Blur is optional and rare.
7. **Navigation as an authored object:** navigation should be compact, tactile and integrated into the composition. A floating bottom dock or compact rail is a candidate, not a mandatory pattern for every viewport.
8. **Photography as editorial context:** real store, shelf, warehouse and product images appear in selected high-value moments, with purposeful crops and tonal treatment. No random stock-photo wallpaper.

### 3.2 Proposed palette roles — not final token values

| Role | Direction | Usage |
|---|---|---|
| RetailOS Red | Existing brand red family | Brand mark, primary action, key identity |
| Warm Amber | Reference-inspired golden/citrus family | Highlight, progress, selected surfaces, visual rhythm |
| Sand / Warm Canvas | Warm light neutral | Entry, overview and selected page environments |
| Porcelain | Quiet high-legibility light surface | Dense data, forms, tables and long reading |
| Graphite / Ink | Deep charcoal | Dark surfaces, navigation and focused work areas |
| Semantic colors | Success, warning, danger, info | Actual operational state only |

Do not blindly adopt the previous proposal's #A80F20/#E9A94C or other generated palette. Derive actual tokens after visual tests against real content and contrast.

### 3.3 Typography direction

- A deliberate display/heading voice paired with a highly legible operational text face.
- Strong number styling for real quantities, counts and progress.
- Compact uppercase metadata used sparingly, echoing the reference's editorial rhythm.
- Vietnamese diacritics, dense tables, long product names and small mobile widths are mandatory test cases.
- Do not select a font based on a mockup alone. Validate font quality, Vietnamese coverage, file weight, rendering and licensing.
- Avoid the generic Inter-everywhere appearance if a better licensed/self-hosted option materially improves character without harming performance.

### 3.4 Card and component craft

Cards must have roles, not just radius:
- **Feature card:** large focal content, may use photography or a dark/amber field.
- **Metric card:** number + unit + context + optional trend/progress.
- **Operational row/panel:** dense, aligned, low-decoration data surface.
- **Action tile:** clear icon/label/action affordance.
- **Status panel:** state, consequence and next action.
- **Floating control:** navigation/action, visually separated from content.

Avoid repeating the same icon-top/title/subtitle card everywhere. Vary composition according to task hierarchy.

## 4. Translate the art direction across the entire app

| Surface | Art-direction application | Constraint |
|---|---|---|
| Login | Warm editorial brand canvas, deliberate dark/light split, strong identity and focused form | Preserve actual auth/session flow |
| Home | One focal operational story, selective metrics and task priorities, varied composition | Real data only; no invented KPI |
| Module Library | Editorial grouping and varied module cards with clear readiness language | Registry is source of truth |
| Stocktake | Precision-first operational table with crafted hierarchy, selective highlighted progress/exception panels | Preserve state machine and persistence |
| Stocktake Import | Staged processing surface, strong progress/status visualization and dense validation review | Real progress and parser states only |
| Scanner presentation | Purpose-built dark camera context integrated with global identity | Scanner Engine remains locked |
| Notifications | Compact event stream with strong type/time hierarchy and restrained status accents | Real event sources only |
| Settings / Update Center | Calm system surfaces, clear release identity and action hierarchy | Preserve PWA update controller |
| Search / overlays | Tactile, layered and compact; context-preserving transitions | Preserve overlay ownership and body lock |
| Mobile shell | Compact floating/docked navigation candidate, task-focused surfaces | Safe areas, keyboard and reachability |
| Desktop shell | Distinctive workspace frame; not a generic admin sidebar by default | Validate wide/narrow office layouts |

## 5. Craft standard — what makes a screen acceptable

A screen is not accepted because it has the right colors and components. It must pass:

1. **Composition:** focal point, hierarchy, rhythm and negative space are intentional.
2. **Material:** surfaces have meaningful roles and coherent depth; no arbitrary shadows/blur.
3. **Typography:** Vietnamese copy, metrics and metadata have distinct, readable roles.
4. **Data integrity:** no fake KPI, event, workflow, progress or readiness.
5. **Component craft:** alignment, icon weight, control proportions, radii and states are consistent.
6. **Responsive authorship:** desktop/tablet/mobile are composed for their context, not scaled copies.
7. **Motion:** state changes feel deliberate, quick and stable; reduced-motion remains first-class.
8. **Performance:** visual richness does not require heavy blur, continuous animation or oversized assets.

## 6. M0 execution reset — prototype by design problem, not by page count

### M0-R1 — Art Direction boards
Create a focused visual exploration of:
- Warm Industrial Editorial.
- Paired light/dark surface identity.
- Typography and number hierarchy.
- Card/surface material grammar.
- Navigation/dock composition.
- Photography and background treatment.

Output: one coherent visual direction plus a controlled alternative for comparison. Do not create a full screen catalog yet.

### M0-R2 — Signature screen prototypes
Produce separate high-resolution, inspectable frames for:
- Login (brand and identity).
- Home Overview (composition and operational focal point).
- Module Library (modular discovery).
- Stocktake (dense data craft).
- Stocktake Import (staged processing).
- Settings/Update Center (system experience).

Each screen should be authored individually at realistic dimensions; no tiny collage used as final review evidence.

### M0-R3 — Responsive composition
For the chosen direction, create:
- Desktop office layout.
- Tablet adaptation.
- Mobile task layout.
- At least one light/dark pair where the reference's dual-surface grammar is intentionally applied.

### M0-R4 — Interaction/motion study
Use the supplied recording only for the observed loading-to-ready and progressive-content principles. Prototype:
- Loading → ready without layout jump.
- Active/selected state.
- Sheet/dock entry and dismissal.
- Progress and completion feedback.
- Reduced-motion fallback.

Do not claim exact animation timing from the recording.

### M0-R5 — Cross-surface consistency and owner decision
Review all representative surfaces side by side. Lock the direction only when visual distinction, data legibility, responsive composition and low-end feasibility are demonstrated.

## 7. Low-end and operational constraints

- Prefer opacity/transform transitions; avoid full-screen blur and animated layout dimensions.
- Keep tables and data rows low-decoration and high-contrast.
- Use image cropping and compression deliberately; no hero image should delay task availability.
- Make warm ambient backgrounds static or very low-cost; avoid expensive layered filters.
- Provide solid-color fallbacks for glass, gradients and imagery.
- Support reduced motion and narrow viewport without losing action visibility.
- Keep existing lazy loading, feature boundaries, PWA shell, offline behavior and bundle contracts.
- Scanner internals remain outside the visual migration.

## 8. Decision register

| Decision | Current reset proposal | Status |
|---|---|---|
| Art direction | Warm Industrial Editorial | Proposed for exploration |
| Warm canvas | Amber/sand environment in selected surfaces | Proposed |
| Dual light/dark identity | Paired visual contexts, not only dark sidebar | Proposed |
| Accent roles | RetailOS red + amber accent with distinct semantics | Proposed |
| Typography | Editorial heading + operational text pairing | Open |
| Navigation | Compact rail/dock exploration | Open |
| Photography | Selective authentic retail imagery | Proposed |
| Component composition | Role-based, asymmetric where useful | Proposed |
| Exact tokens | Derive after real-screen tests | Open |
| Implementation | No source migration before M0 acceptance | Fixed |

## 9. M0 exit criteria after reset

- [ ] Art direction board accepted; generic admin-template appearance rejected.
- [ ] Separate high-resolution signature screens reviewed.
- [ ] Light/dark material language demonstrated as deliberate system.
- [ ] Desktop/tablet/mobile compositions reviewed.
- [ ] Typography and Vietnamese legibility tested.
- [ ] Real workflow labels/states/data contracts reconciled.
- [ ] Contrast/accessibility and reduced-motion requirements evidenced.
- [ ] Low/mid-range performance feasibility validated.
- [ ] Owner explicitly accepts M0 and authorizes M1.

## 10. Protected contracts

The reset changes design direction, not business/platform ownership. Preserve authentication/session, module IDs/readiness truth, snapshot/cache/data contracts, Scanner Engine/camera lifecycle, Stocktake/Import persistence and output, shared body scroll lock, PWA update/release lifecycle, lazy-loading, bundle boundaries and GitHub Pages base path.

No broad source migration, dependency addition, merge or deployment is authorized by this document.
