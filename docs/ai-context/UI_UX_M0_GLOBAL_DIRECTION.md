# RetailOS Global Experience Direction — M0

**Status:** M0 concept direction and visual decision prototype. Proposed for owner review; not an accepted implementation specification yet.
**Scope:** Product-wide RetailOS experience — application shell, core workspaces, operational workflows, system surfaces, shared design language and responsive behavior.
**Reference inputs:** `IMG_1574.jpeg` (visual composition reference) and `ScreenRecording_11-24-2026 20-25-21_1(1).mp4` (interaction/state reference), reviewed 2026-11-25.
**Depends on:** UI/UX architecture 00B–00H and the current source baseline documented by those audits.
**Non-goal:** Implementing application UI, changing business logic, replacing platform contracts or reopening Scanner Engine work.

## 1. M0 objective

M0 defines what RetailOS should look and feel like as one product before broad source migration begins. It is not a Home redesign exercise. Home is one representative workspace among several.

The output of M0 is a product-wide visual and interaction direction that can be applied consistently to:
- Application shell, login, global navigation and workspace headers.
- Core experiences: Home Overview, Module Library, Search, Notifications and Activity when backed by real data.
- Operational workspaces: Stocktake, Stocktake Import and future operational modules.
- System experiences: Settings, Update Center, loading, empty, offline, error, success and permission states.
- Shared components, materials, typography, icons, motion and responsive rules.

## 2. Reference analysis — what to take and what not to copy

### 2.1 Reference A — `IMG_1574.jpeg`

**Observed visual qualities**
- Modular composition and clear separation between distinct app destinations.
- Strong card hierarchy: one dominant content area, supporting cards and compact navigation.
- Asymmetric layouts and varied card proportions instead of a uniform grid everywhere.
- Light and dark surfaces shown as intentional visual modes.
- Warm background, restrained contrast and small accent areas.
- Dense information is grouped into readable blocks with clear titles and small supporting labels.

**RetailOS application**
- Use composition, hierarchy, modularity and controlled contrast as inspiration.
- Translate the visual system into RetailOS red/neutral brand semantics and operational information density.
- Use asymmetric composition only where it improves task priority; operational tables and forms remain structured and predictable.

**Do not copy**
- The orange/yellow palette, fitness/wellness subject matter, decorative shapes or the reference's exact card layouts.
- Its mobile-only framing as the whole product direction.

### 2.2 Reference B — `ScreenRecording_11-24-2026 20-25-21_1(1).mp4`

**Observed interaction/state qualities**
- The same product surface is shown across an initial/placeholder state and a populated state.
- Content becomes available progressively rather than requiring every section to appear as one undifferentiated block.
- Primary actions and suggested choices are visually discoverable.
- The content structure and brand framing remain recognizable while the screen state changes.

**RetailOS application**
- Design explicit loading, ready, empty, error and offline states for each relevant workspace.
- Reveal content according to readiness and task priority; avoid flashing or shifting the entire layout.
- Keep primary actions discoverable while data loads or updates.
- Preserve stable geometry where practical to reduce layout shift.

**Evidence limit**
- The recording is a sequence of captured states, not a frame-by-frame motion specification. Do not infer exact easing, duration, gesture physics or hidden transition behavior from it.

## 3. RetailOS design language

The references inform the direction; RetailOS owns the final language.

### 3.1 Brand character

**Operational clarity × premium restraint × cinematic warmth.**

RetailOS should feel like a purpose-built retail operations environment: confident, precise, responsive and visually composed. It must not resemble a generic admin template or an AppSheet clone.

### 3.2 Brand and semantic color

- RetailOS red is the primary brand/action color, not a background color applied indiscriminately.
- Warm white and neutral surfaces carry most reading and working areas.
- Charcoal/dark surfaces are reserved for deliberate high-contrast contexts, navigation or selected feature modes; do not force a universal dark canvas.
- Semantic colors communicate actual status: success, warning, danger, information and neutral. Never rely on color alone.
- The reference's orange/green palettes are not RetailOS brand direction.
- Exact token values and contrast pairs remain subject to design-system validation and owner acceptance.

### 3.3 Typography and language

- Vietnamese-first content hierarchy, with correct diacritics, line wrapping and number/date formatting.
- Typography must distinguish workspace title, task title, metric, field label, helper text and status without relying on oversized headings everywhere.
- Be Vietnam Pro remains a candidate, not an accepted font. Validate Vietnamese glyph coverage, readability, file size, rendering and licensing before selection.
- Keep an appropriate system fallback and avoid blocking first paint on font download.

### 3.4 Photography and imagery

- Use real retail/store/product photography as deliberate hero or contextual accents, not as wallpaper behind every operational control.
- Images must support context, orientation or brand personality; they must not compete with critical data or reduce text contrast.
- Prefer optimized local/versioned assets, responsive dimensions, modern formats where supported and lazy loading outside the critical viewport.
- Avoid remote image dependencies that can make core workflows blank or slow offline.

### 3.5 Materials and surfaces

- Use clear surface hierarchy first: page canvas, workspace surface, grouped panel, interactive control and transient overlay.
- Liquid Glass is a selective material treatment for navigation, floating controls or transient surfaces where it improves depth and context.
- Do not apply heavy blur/transparency to every card, table or form.
- Provide opaque fallbacks; content and controls must remain legible without backdrop filtering.
- Shadows, borders, radius and elevation must communicate grouping and interaction, not decoration alone.

### 3.6 Iconography and controls

- Use one coherent semantic icon language and consistent stroke/size/alignment.
- Icons support labels; critical actions must not depend on an ambiguous icon alone.
- Primary, secondary, quiet, destructive and status actions need consistent hierarchy and accessible focus/disabled states.
- Avoid mixing emoji, unrelated icon families and arbitrary per-module styles.

## 4. Global experience architecture

The design language is shared; task composition is feature-owned.

| Experience layer | Design responsibility | Representative surfaces |
|---|---|---|
| Global shell | Identity, global navigation, search entry, user/system status, workspace frame | Login, desktop rail/sidebar, mobile navigation, global header |
| Core experience | Orientation, discovery and cross-workspace entry | Home Overview, Module Library, Search, Notifications |
| Operational workspace | Task completion, data inspection, validation and output | Stocktake, Stocktake Import, future workflows |
| System experience | Trust, status, preferences, release and recovery | Settings, Update Center, offline/error/loading/empty |
| Shared language | Common visual and interaction rules | Tokens, typography, icons, controls, surfaces, overlays, motion |

No second navigation registry or parallel component system is introduced. Existing module identity/readiness remains the source of truth. A visual tile must not imply that an integrating module is a complete workflow.

## 5. Cross-platform composition

### Desktop — office workstation
- Persistent but compact global navigation.
- Workspace header with clear title, context and primary action.
- Main content uses responsive columns and intentional asymmetry where useful.
- Dense operational information uses structured tables/lists with stable alignment, clear filters and predictable keyboard interaction.
- Avoid excessive whitespace that forces repeated scrolling, but preserve readable grouping.

### Tablet
- Navigation may collapse or become rail/drawer according to available width.
- Workspace actions remain reachable without hover.
- Tables may simplify or scroll within their own region; avoid page-wide accidental horizontal overflow.

### Mobile — task-focused
- One primary task per visible focus area.
- Navigation adapts to touch and safe-area constraints.
- Secondary actions move into contextual menus/sheets only when discoverability is retained.
- Inputs, scan entry, confirmation and output remain reachable above the keyboard and browser chrome.
- Do not shrink desktop layouts into a narrow column; compose for mobile task flow.

## 6. Motion and feedback language

Motion is purposeful feedback, not decoration.

- Use short opacity/transform transitions for entry, selection and state changes.
- Reserve larger movement for a meaningful navigation or sheet transition.
- Prefer transform and opacity over animating layout dimensions, blur, large shadows or expensive filters.
- Keep content geometry stable while loading; use skeletons only when they communicate known structure.
- Avoid repeating ambient animations, parallax and continuously moving decoration in operational workspaces.
- Respect `prefers-reduced-motion`; provide immediate state changes without motion.
- Keep feedback local to the action: pending, success, warning and error should identify what happened and what the operator can do next.
- Motion duration/easing tokens must be validated on low/mid-range Android and desktop hardware before being locked.

## 7. Performance-first visual constraints

- The low/mid-range device is the baseline design target; higher-end devices may benefit but are not required for correctness.
- No large blurred full-screen layers or always-on backdrop filters on critical paths.
- Avoid large, unoptimized hero images and multiple simultaneous image decodes.
- Lazy-load non-critical imagery and feature surfaces; do not delay task controls behind decorative media.
- Avoid layout thrash, large-area paint animations and unnecessary continuous effects.
- Keep existing lazy-loading, bundle boundaries, PWA shell and offline behavior.
- Reduced motion, no backdrop-filter and slow-network fallbacks must preserve the same task capability.

## 8. Cross-module consistency rules

Every workspace must share:
1. Navigation and shell behavior.
2. Page/workspace title and contextual action placement.
3. Typography roles and semantic color meanings.
4. Button, field, badge, status, surface and overlay contracts.
5. Loading/empty/error/offline feedback vocabulary.
6. Keyboard, focus, touch target and reduced-motion behavior.
7. Responsive breakpoints and density rules.

Every workspace may independently define:
- Its information architecture and task sequence.
- Domain-specific data visualization, table columns and validation.
- Feature-specific controls and state machine.
- Contextual imagery where it helps the task.

A shared component must not absorb business logic or own feature persistence.

## 9. M0 validation set — product-wide, not Home-only

The visual direction must be reviewed across these representative surfaces before M0 can exit:

| Surface | What it validates |
|---|---|
| Login | Brand identity, typography, trust and first-use clarity |
| Home Overview | Global orientation, priority hierarchy and cross-module entry |
| Module Library | Discovery, module readiness and information density |
| Stocktake | Dense operational data, status, filters and task completion |
| Stocktake Import | File selection, progress, validation, errors and output |
| Scanner presentation | Entry/exit affordance and visual integration only; Scanner Engine remains protected |
| Settings / Update Center | System controls, release trust and non-disruptive update states |
| Search / Notifications | Global actions, overlays and feedback consistency |
| Responsive shell | Desktop, tablet, mobile and low-end performance behavior |

Activity remains gated by real event data. Future/integrating modules are represented honestly and are not fabricated as complete workflows.

## 10. M0 deliverables and exit gates

### Deliverables
- [x] Two reference files inspected and separated into visual vs interaction evidence.
- [x] Product-wide RetailOS design language proposed.
- [x] Global experience layers and cross-platform rules defined.
- [x] Motion, photography, materials and performance constraints defined.
- [x] Product-wide representative validation set defined.
- [ ] High-fidelity screen prototypes reviewed across all representative surfaces.
- [ ] Typography, semantic color/contrast and responsive density accepted by owner.
- [ ] Low/mid-range device validation completed.
- [ ] Owner accepts M0 direction and authorizes M1 design-foundation implementation.

### M0 is complete only when
1. The direction works across core, operational and system experiences — not just Home.
2. The same design language is recognizable across desktop and mobile.
3. Operational data remains legible and actions remain discoverable.
4. Reduced-motion and low-performance fallbacks retain full functionality.
5. No protected business/platform contract is changed by the prototype.
6. Open decisions and validation evidence are recorded; proposals are not silently treated as accepted.

## 11. Protected implementation boundaries

M0 is visual/design work only. It must not change:
- Authentication/session behavior, employee identity or permissions.
- Stable module IDs, workflow readiness truth or business semantics.
- Snapshot/cache/data contracts or operational source data.
- Scanner Engine, camera lease/acquisition, decoder, worker, lifecycle, recovery, ROI or settings persistence.
- Stocktake/Import persistence, parser, validation, history or output semantics.
- Shared body scroll lock, PWA update/release lifecycle, service worker, cache or rollback protocol.
- Lazy-loading, bundle boundaries or GitHub Pages base-path/deployment behavior.

## 12. Decision status

| Decision | M0 proposal | Status |
|---|---|---|
| Product scope | Full RetailOS, all experience layers | Proposed |
| Brand color | RetailOS red + warm/neutral semantic system | Proposed |
| Typography | Vietnamese-first; Be Vietnam Pro candidate only | Open |
| Photography | Real retail/product imagery used selectively | Proposed |
| Glass | Selective, with opaque fallback | Proposed |
| Motion | Purposeful, short, transform/opacity-first | Proposed |
| Navigation | Responsive shell; exact route/history choice follows 00E owner decision | Open |
| Density | Balanced, task-sensitive by workspace | Proposed |
| Performance baseline | Low/mid-range devices first | Proposed |
| Source implementation | No source migration in M0 | Fixed boundary |

## 13. Next step

After owner review, create high-fidelity prototypes for the representative surfaces in §9 using one shared design language. Only after the cross-surface prototype and responsive/performance checks are accepted should M1 lock tokens and foundations. Do not begin a Home-only implementation or broad source migration from this proposal.
