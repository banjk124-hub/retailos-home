# RetailOS M0 — Governing Experience Direction

**Authority:** Sole active M0 specification; supersedes conflicting M0 proposals.  
**Status:** Owner direction confirmed; documentation reconciliation in progress. M0 remains open; M1 is not authorized.

## 1. Owner-confirmed direction

**Burgundy Brand Identity + Vietnamese-first Typography + Authentic Retail Imagery + Reference-led Art Direction + Feature-specific Product UX.**

The owner confirms:
- Burgundy/dark-red remains RetailOS's dominant brand identity.
- Vietnamese-capable typography is required; final font selection depends on glyph, readability, licensing and performance validation.
- Integrate authentic supermarket/retail imagery: stores, aisles, shelves, products, warehouse/logistics and retail operations.
- Take the remaining art direction from the supplied image and video, adapting it to RetailOS. Do not copy their palettes, layouts, product semantics or subject matter.
- Keep the design system open. Different workflows may need different compositions and feature-owned components.

This confirms direction, not exact token values, font selection, image licensing or permission for broad implementation.

## 2. Reference roles

**Image — art direction and composition.** Study editorial hierarchy, composition, asymmetry, rhythm, proportion, negative space, mixed-size cards/panels, light/dark relationships, contrast, layering, material, depth, crop, image treatment, data visualization and compact navigation. Do not import amber/yellow or green as brand colors, copy fitness/payment/lifestyle semantics, exact layouts or mobile-only framing.

**Video — motion and interaction.** Study progressive readiness, loading-to-populated transitions, continuity, stable composition, primary-action visibility and local interaction feedback. The recording is evidence of observed states, not a frame-accurate motion specification. Do not invent easing, durations, spring values or gesture physics; derive them through prototypes and device testing.

**RetailOS — final authority.** Brand, semantic colors, Vietnamese copy/formatting, retail imagery/licensing, workflows, data truth, module readiness, architecture, accessibility, responsive requirements, performance and protected contracts.

## 3. Design language

### Brand and color
- Burgundy/dark red is the dominant brand identity and primary brand accent.
- Do not make every surface burgundy; use neutral light/dark surfaces and tonal hierarchy.
- Keep success, warning, danger, information and neutral semantically distinct.
- Reference amber/yellow is not a RetailOS brand color. Other accents require a clear role and must not displace the brand.
- Exact HEX values and contrast pairs remain open pending brand-asset reconciliation and real-screen validation.

### Vietnamese typography
- Vietnamese is the primary interface language.
- Validate glyph coverage, dấu placement, small-size diacritics, wrapping, numerals, dates, currency and dense tables.
- Define display, workspace title, body, label, metadata, metric and tabular-data roles.
- Font family is not selected. Compare candidates against the current stack; validate WOFF2/self-hosting, licensing, file weight, fallback and first-render behavior.

### Retail imagery
- Use authentic supermarket/retail photography as intentional brand and contextual content: stores, aisles, shelves, products, warehouse/logistics and staff at work.
- Use as hero, editorial crop, contextual card or visual anchor—not random wallpaper behind dense controls.
- Establish rights/licensing, crop, responsive variants, compression, local/versioned delivery, lazy loading and offline fallback. Core workflows cannot depend on remote images.

### Art direction and components
- Create distinctive authored composition, not a generic admin dashboard.
- Use varied proportions/asymmetry where hierarchy benefits.
- Light/dark are deliberate choices, not mandatory global modes.
- Layer surfaces, materials, shadows, depth and selective glass effects when they improve spatial clarity.
- Use charts/progress/metrics only with real data and meaningful semantics.
- Different modules have different density and composition. Stocktake is not Login; Import is not Home.
- Liquid Glass, blur, dramatic transitions and image-heavy panels are allowed selectively; neither blanket prohibition nor blanket adoption. Demonstrate value and measure cost.
- Consistency means recognizable identity, semantics, interaction quality, accessibility and engineering contracts—not identical layouts.
- Share components only when cross-feature value is proven; feature-owned components are valid. Avoid speculative catalogues, mega-components, parallel tokens and permanent override layers.

## 4. Product-wide coverage and responsive behavior

M0 is not Home-only. Cover Login/identity, App Shell/navigation, Home, Module Library, Stocktake, Stocktake Import, Settings/Update Center, Search/Notifications/Activity, Scanner presentation and system states (loading, ready, empty, offline, error, success, permission, recovery). Every control, metric and status must map to a real source owner or be marked proposed; never fabricate KPIs, readiness or events.

Compose for each context, not by shrinking desktop or enlarging mobile:
- Desktop: multi-region workspaces, compact persistent navigation, readable dense tables and keyboard support.
- Tablet: recompose navigation, columns and actions for portrait/landscape.
- Mobile: task-focused layout, touch targets, safe-area and keyboard awareness.
- Validate 1440, 1280, 1024, 768, 390 and 360 CSS px plus short landscape; these are test points, not fixed breakpoints.

## 5. Motion and interaction contract

Motion is first-class, not decoration and not limited to subtle opacity. Explore micro-interactions, navigation/page/panel/sheet/dock transitions, progressive reveal, loading-to-ready, selection/focus/hover/press/gesture feedback, progress, completion, validation, warning/error feedback, depth and cinematic transitions where useful.

Every motion must acknowledge an action, orient, reveal, explain state, focus attention or preserve spatial continuity. Input feedback is immediate. Animation never becomes business state, triggers duplicate requests/writes/subscriptions, blocks feedback or delays camera/scanner lifecycle. Interrupted transitions converge to source truth; stale async results cannot overwrite current state.

Respect reduced-motion and power-conserve while preserving feedback. Measure frame stability, input-to-feedback, CPU, memory, long tasks, bundle impact and low-end fallback. Expensive effects are allowed when value and runtime cost are demonstrated.

## 6. Protected contracts

Preserve auth/session/employee identity; canonical module registry, stable IDs/readiness; snapshot/cache/offline semantics; Scanner Engine/session/camera/decoder/ROI; Stocktake persistence/revisions/validation/history/export; Import parsing/precision/conflict/dirty-edit/persistence/output; shared overlay/body-scroll-lock/focus; PWA consent/staging/integrity/activation/boot health/rollback; Vite/GitHub Pages base `/retailos-home/`, deployment and lazy-load boundaries.

Scanner stabilization is closed and owner-confirmed operationally. Redesign scanner presentation only; do not reopen engine internals or retired Worker/diagnostics experiments.

## 7. M0 work packages

**M0-0 — Documentation consolidation**
- [x] Confirm image = art direction/composition; video = motion/interaction; RetailOS = brand/business/architecture.
- [x] Confirm burgundy, Vietnamese-first typography and authentic retail imagery.
- [ ] Reconcile M0 records, Product Skill, INDEX, status, roadmap and handoff.
- [ ] Verify Product Studio plugin skill consistency.
- [ ] Establish one active M0 specification and one current status.

**M0-A — Structural/visual direction**
- [ ] Audit source ownership and actual screens.
- [ ] Produce individual high-fidelity surfaces for Login, Shell, Home, Module Library, Stocktake, Import and Settings/Update Center.
- [ ] Demonstrate desktop/tablet/mobile, brand anchors and selective light/dark treatments.
- [ ] Map controls, metrics and states to real owners; obtain owner acceptance.

**M0-B — Motion/interaction**
- [ ] Record observable video patterns without invented timings.
- [ ] Prototype loading→ready, selection, navigation, sheet/dock, progress, completion, error and interruption.
- [ ] Derive motion tokens from measured prototypes; verify reduced-motion, power-conserve and low-end fallbacks.
- [ ] Prove motion never owns business state, persistence, camera or data lifecycle.

**M0-C — Cross-surface integration**
- [ ] Apply accepted visual/temporal language to real workflows.
- [ ] Preserve recognizable identity without identical layouts.
- [ ] Verify real labels/data/readiness/states, no duplicate or stale async behavior, and protected contracts.

**M0-D — Technology, quality and owner acceptance**
- [ ] Evaluate framework/runtime, routing, styling, components, icons, imagery, typography and motion against source.
- [ ] Record KEEP / ADOPT / REPLACE / BUILD / DEFER with evidence, cost and fallback.
- [ ] Validate accessibility, contrast, keyboard, touch, focus, zoom and reduced motion.
- [ ] Validate browser and low/mid-range performance on running prototypes.
- [ ] Record physical-device acceptance separately from browser emulation and CI.
- [ ] Owner explicitly accepts M0 and authorizes M1.

## 8. Current status and exit criteria

Owner direction is confirmed, but M0 remains open. Existing M0 records contain useful audits but conflict on amber accents, reference scope and restrictive motion language; treat them as historical evidence until reconciled. Concept boards/Figma frames are not implementation or acceptance evidence. PR #157 is an open Draft Login CSS slice, not product-wide M0 completion; reconcile against merged PR #162 and do not merge by default. PR #160–#162 did not ship product-wide redesign or the target App Shell. No M1 authorization exists.

M0 exits only after owner-approved direction is demonstrated in individual source-grounded screens; brand anchors are integrated; both reference roles are represented without copying; desktop/tablet/mobile are inspected; real workflows/data are verified; motion/interruption/reduced-motion/low-end behavior is tested; technology choices are evidenced; accessibility/performance/protected contracts pass; CI/browser/device evidence is accurately separated; and the owner explicitly accepts M0 and authorizes M1.

A document, moodboard, Figma frame, token file, single Login slice or green CI run alone does not complete M0.

## 9. Governance

This is the sole active M0 specification. Historical M0 files retain evidence only. Product-wide authority is `RETAILOS_PRODUCT_SKILL.md`; current implementation truth is `IMPLEMENTATION_STATUS.md`. This specification alone authorizes no source migration, dependency addition, merge, deployment or production promotion.
