> **Documentation authority notice (2026-11-25):** This file is retained as historical source evidence, design exploration or implementation record. It is not an independent governing standard or current status source. For all current and future RetailOS work, follow [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md), then consult this file only when its specific evidence is relevant. If this file conflicts with the Product Skill, current source or an explicitly accepted owner decision, do not follow the stale instruction; reconcile the evidence into the governing standard first.

---

# RetailOS M0-A — Product-wide Structural Design Blueprint

**Status:** First source-grounded structural design specification. Proposed for visual prototype review; not owner-approved final UI or source implementation.
**Authority:** [UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md](./UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md).
**Source baseline:** `main` at `2003ea24966755d0ad4e0298b34422b053267e77`; current AS-IS screen truth from [UI_UX_SCREEN_MAP.md](./UI_UX_SCREEN_MAP.md), ownership from [UI_UX_COMPONENT_AUDIT.md](./UI_UX_COMPONENT_AUDIT.md), screen contracts from [UI_UX_SCREEN_BLUEPRINTS.md](./UI_UX_SCREEN_BLUEPRINTS.md).
**Scope:** Whole RetailOS — identity, application shell, core experiences, operational workspaces, system surfaces and responsive composition.
**Track boundary:** This is M0-A (structure only). Motion, animation, timing and state choreography belong to M0-B and must not be inferred from these static layouts.

## 1. Design objective

Create a recognizable RetailOS interface language that borrows the **structural quality** of the supplied image: composed modular screens, deliberate hierarchy, varied proportions, meaningful negative space, distinct surface planes and purposeful light/dark treatments.

RetailOS retains its own:
- Red brand identity and semantic status colors.
- Vietnamese-first product language and operational terminology.
- Actual module/workflow readiness and data semantics.
- Existing feature ownership, persistence and platform contracts.

The image's amber/yellow backdrop and the video's green palette are not RetailOS tokens. The video contributes no structural layout decisions to this track.

## 2. Structural principles

### 2.1 Composition grammar

Each workspace uses:
1. **Context anchor:** where the user is and which operational scope is active.
2. **Primary focal region:** the most important task or information for this screen.
3. **Supporting region(s):** related controls, summary or context, only when source-backed.
4. **Operational detail:** tables, lists, forms or validation rows aligned for scanning.
5. **Action zone:** primary and secondary actions with clear grouping.

Not every screen needs all five regions. Do not fill empty space with decorative cards or fabricated metrics.

### 2.2 Layout rhythm

- Use asymmetric composition when it communicates task priority or creates a useful focal region.
- Preserve strict alignment for tables, repeated rows, forms and numeric columns.
- Vary card proportions by role; do not repeat identical cards solely for visual consistency.
- Use whitespace to separate task groups, not to inflate already dense operational screens.
- Avoid a universal three-column card grid as the default.
- Build for actual content lengths: Vietnamese labels, long product names, barcodes, quantities and multi-line error messages.

### 2.3 Surface grammar

Use a small semantic surface set:
- **Canvas:** page/workspace background.
- **Workspace:** main content plane.
- **Raised panel:** focused task or summary group.
- **Inset/data plane:** tables, editors and dense lists.
- **Interactive surface:** button, field, selector and navigation item.
- **Transient surface:** dialog, sheet, popover and toast.

Light and dark are complete contexts, not a dark sidebar plus light cards. A screen may use a dark focal region within a light workspace only when hierarchy and contrast justify it. Scanner remains its own camera-optimized dark context.

### 2.4 RetailOS visual identity

- Keep RetailOS red for brand identity and primary actions according to semantic token roles.
- Neutral surfaces carry most operational reading.
- Secondary accent colors must have explicit roles and must not collide with success/warning/error/info meanings.
- Photography is selective and authentic to retail operations; it must not sit behind dense data or block task readiness.
- Typography must be evaluated with Vietnamese diacritics and actual operational strings before choosing a font.

Exact color values, font family, radius scale, shadows and image assets remain open decisions until tested on real screens.

## 3. Product-wide structural map

### 3.1 Login / identity

**AS-IS:** LoginExperience owns authentication interaction and local auth/session behavior; App owns auth journey and identity transition.

**Desktop:**
- Two-region composition candidate: brand/context region and focused login form region.
- Form remains the visual action anchor; image is contextual, not a full-screen obstruction.
- Keep employee-code and password controls visually dominant.

**Mobile:**
- Single-column focused form.
- Brand mark and concise context above the form.
- Keyboard-safe scroll; primary action remains reachable.
- No decorative image that pushes credentials below the initial task area.

**Do not change:** authentication algorithm, employee lookup, numeric employee-code handling, session save/clear order, error semantics or permission explanation.

### 3.2 Application Shell

**AS-IS:** App owns auth/session, boot/offline/install state, Home lazy mount, logout cleanup and PWA transition safety. HomeScreen currently provides long-scroll section navigation rather than routed workspaces.

**Desktop:**
- Persistent compact navigation rail/sidebar candidate.
- Global header for current workspace identity and global actions.
- Main workspace canvas uses available width for real work.
- Optional contextual inspector only where a workflow has a real secondary context.
- Avoid permanently visible decorative panels that reduce data workspace width.

**Tablet:**
- Adaptive compact rail or collapsible navigation.
- Workspace remains the dominant region.
- Avoid scaling desktop chrome into cramped columns.

**Mobile:**
- Task-focused single workspace.
- Bottom navigation is a candidate for top-level destinations, with contextual secondary navigation in a sheet or within the workspace.
- Global quick lookup remains reachable without obscuring primary task actions or safe areas.

**Not decided by M0-A:** route implementation, browser history adapter, router package, final destination IDs and back/deep-link mechanics. Those require the 00E architecture decision and explicit acceptance; structural mockups must not pretend routing is already implemented.

### 3.3 Home Overview

**AS-IS:** HomeScreen combines overview, snapshot notices, notifications, calendar preview, library sheet, quick lookup/scanner entry, Settings, Stocktake/Import launch, section navigation and toast.

**Desktop:**
- One focal overview region for the most important current operational context supported by real snapshot data.
- Secondary regions for confirmed notices and actual shortcuts.
- A compact context/action area may be placed alongside the focal region if it does not duplicate global navigation.
- Calendar remains a preview/empty feature unless a real event source is confirmed.
- Activity remains gated while no real event source exists.

**Mobile:**
- Focal summary first, then priority notices and task shortcuts.
- Do not compress desktop metric grids into tiny cards.
- Keep quick lookup reachable but subordinate to the current task.

**Data rule:** no fabricated KPI, event count, trend, stock status or activity item. Missing/stale/unavailable must remain distinct according to snapshot contracts.

### 3.4 Module Library

**AS-IS:** Module Library filters canonical registry metadata; selecting a group opens a sheet. Registry IDs/readiness remain authoritative. A registry entry does not prove a complete workflow exists.

**Desktop:**
- Search and category/filter context at the top of the workspace.
- Modules grouped by real registry categories.
- Card/list variants may be compared; each item must show truthful readiness and its real next action.
- Integrating/unavailable entries must not visually imply that a workflow can be launched.

**Mobile:**
- Compact search and filter entry.
- Single-column or compact two-column card layout only if labels and readiness remain readable.
- Group detail opens as a focused sheet/screen without losing context.

**Do not create:** parallel module registry, invented module routes, fake completion percentages or readiness badges disconnected from the registry.

### 3.5 Stocktake

**AS-IS:** Dedicated feature-owned workflow with session/zone, capture, review, history/export and scanner handoff states.

**Desktop:**
- Workspace header: active session and zone context.
- Primary data workbench: item rows/table, quantity and validation state.
- Secondary panel only for actual progress, discrepancy or session context supported by feature state.
- Actions grouped by task stage; avoid a card around every row.
- Strong numeric alignment and readable barcode/product columns.

**Mobile:**
- Focus one item/task at a time where table density would become unusable.
- Preserve clear session/zone context.
- Quantity entry and scan/manual capture remain reachable.
- Row detail can expand into a focused editor; do not silently drop columns or data.

**Do not change:** state machine, IndexedDB persistence, revision/history semantics, validation, quantity precision, scanner lease/handoff or export contract.

### 3.6 Stocktake Import

**AS-IS:** Dedicated staged workflow with file picker, parsing, conflict handling, summary, selected zone, invalid rows, edit/dirty/save, TXT preview/copy/download, ZIP export and history restore.

**Desktop:**
- Stage/context rail or stepper for current processing phase.
- Main review workbench for rows and validation.
- Summary/status region based on actual parser counts.
- Source/duplicate/conflict decisions visible before final commit.
- TXT/ZIP actions remain tied to actual output availability.

**Mobile:**
- One dominant stage at a time.
- Summary and validation are readable without shrinking the table to illegibility.
- Row-level issues open in focused detail/edit view.
- Sticky action region only when it does not cover content or keyboard.

**Do not change:** parser, file format, duplicate/source precedence, decimal precision, IndexedDB/history, dirty state, TXT/ZIP output or clipboard fallback.

### 3.7 Settings / Update Center

**AS-IS:** SettingsHub is entered from Home; Update Center presentation reads its store and delegates download/activation to the PWA update controller. Scanner Settings remains scanner-feature owned.

**Desktop:**
- Settings category navigation and focused content panel.
- Update Center uses a clear release/status region and action area.
- System metadata remains legible, not decorative.

**Mobile:**
- Category list → focused detail surface with explicit back context.
- Update actions remain reachable and explain blockers/defer states.

**Do not change:** build identity, staged update state, download/activation consent, PWA safety blocker, cache/rollback or Scanner Settings persistence.

### 3.8 Search, Notifications and transient surfaces

**AS-IS:** Quick lookup, notification popover/detail, dialogs, sheets and popovers have existing owners and overlay behavior.

**Structural rules:**
- Search should be a focused, context-preserving surface, not a second Home dashboard.
- Notifications must show only real source-backed events.
- Dialog, Sheet and Popover must remain visually distinct by interaction scope.
- Use the canonical shared body scroll lock; do not create a parallel overlay owner.
- Preserve focus return, dismissal and nested overlay behavior of the owning feature.

### 3.9 Scanner presentation

Scanner is not a new M0-A architecture project. Its presentation may be shown in the visual system only to prove brand integration. Keep the dark camera-optimized surface and controls legible over preview. Home lookup and Stocktake scanner remain separate feature-owned presentations. No camera, decoder, worker, lifecycle, geometry or recovery behavior changes.

## 4. Responsive structural matrix

| Surface | Desktop office | Tablet | Mobile |
|---|---|---|---|
| Login | Brand/context + focused form | Compact split or single focus | Single-column, keyboard-safe |
| Shell | Persistent compact navigation + workspace | Adaptive rail/collapsible navigation | Task-focused screen + compact top-level navigation |
| Home | Focal overview + supporting real data | One/two-column adaptive | Priority-first vertical flow |
| Module Library | Search/filter + grouped modules | Compact grouped layout | Focused search + readable cards/list |
| Stocktake | Dense aligned data workbench | Adaptive table/detail | Item/task-focused editor |
| Import | Stage context + review table + summary | Compact stage + review | Stage-by-stage flow + row detail |
| Settings | Category nav + content panel | Adaptive split/detail | Category → detail |
| Search/Notifications | Anchored panel or focused workspace | Sheet/panel | Full-screen or sheet when appropriate |

Breakpoints and exact grid dimensions are not fixed by this document. They must be validated with real content at 1440, 1280, 1024, 768, 390 and 360 CSS-pixel widths, plus short landscape.

## 5. M0-A design deliverables

1. Individual high-fidelity frames, not a tiny collage, for Login, Shell, Home, Module Library, Stocktake, Import and Settings/Update Center.
2. Desktop and mobile composition for every representative surface; tablet adaptations for Shell, Home and operational workspaces.
3. A consistent component/surface grammar across frames without making every screen identical.
4. Real Vietnamese labels and actual data/state structures from source contracts; redact or use neutral sample values only when real data is unavailable.
5. Explicit light/dark examples with a rationale for each; no arbitrary mode duplication.
6. Source-to-frame traceability: each visible control and status maps to an existing owner or is marked proposed.
7. Decision log for open choices: shell navigation form, typography, exact tokens, photography, light/dark contexts and density.

## 6. M0-A acceptance

- [ ] All reference roles are respected: image=structure; video=motion; RetailOS=brand/business/data truth.
- [ ] No amber/green palette import or copied reference product semantics.
- [ ] All required product surfaces are represented; Home is not treated as the whole app.
- [ ] No fabricated module, workflow, metric, event, parser progress or status.
- [ ] Desktop, tablet and mobile layouts are authored for their context.
- [ ] Dense operational data remains more legible than decorative treatment.
- [ ] Light/dark are complete and intentional where used.
- [ ] Every visible action/status maps to a real owner or is marked proposed.
- [ ] Auth/session, Scanner Engine, Stocktake/Import persistence, overlays and PWA contracts remain unchanged.
- [ ] Owner reviews individual frames and accepts the structural direction before M0-B integration.

## 7. Open decisions — do not silently assume

- Final desktop navigation geometry and whether mobile uses bottom navigation or a dock.
- Whether dark mode is a user-selectable theme, a workspace-specific context or only a limited set of focused surfaces.
- Final typography family and self-hosting strategy.
- Exact brand/neutral/semantic token values and contrast pairs.
- Photography sources, licensing, asset dimensions and offline fallbacks.
- Which Home summary metrics are genuinely available and safe to display.
- Whether the current calendar preview remains or is removed.
- Final route/history architecture (separate 00E decision; not settled by static composition).

## 8. Explicit boundary to M0-B

This document defines static structure and visual hierarchy only. It does not define motion durations, easing, spring behavior, skeleton timing, loading algorithms, animation choreography or transition callbacks. M0-B derives those separately from the video and existing feature state contracts. Never make animation responsible for data fetch, persistence, state progression or platform lifecycle.
