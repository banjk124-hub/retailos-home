# RetailOS M0 — Cross-Surface Prototype Review

**Status:** Historical structural concept v0.2. Superseded as visual direction by [UI_UX_M0_ART_DIRECTION_RESET.md](./UI_UX_M0_ART_DIRECTION_RESET.md). Retain only for screen coverage and workflow refinement notes; not the visual quality benchmark.
**Parent direction:** [UI_UX_M0_GLOBAL_DIRECTION.md](./UI_UX_M0_GLOBAL_DIRECTION.md)
**Reference inputs:** `IMG_1574.jpeg` and `ScreenRecording_11-24-2026 20-25-21_1(1).mp4`.
**Scope:** Login, core experiences, operational workspaces, system surfaces and mobile composition.

## 1. Prototype intent\n\nThis board is not accepted as the target Art Direction. Its uniform admin layout, repeated cards and conventional red/white dashboard treatment are the exact weaknesses addressed by the M0 reset.

This prototype expands the first M0 concept beyond Home. It tests whether a single RetailOS design language can support:
- Identity and entry (Login).
- Discovery (Module Library).
- High-density operations (Stocktake).
- Multi-step data processing (Stocktake Import).
- Cross-workspace awareness (Notifications).
- System configuration and release trust (Settings / Update Center).
- System feedback states (loading, no data, offline, error and success).
- A mobile-first task flow without simply shrinking desktop layouts.

The generated board is a composition reference for discussion. It contains illustrative content and generated UI details; it is not evidence of current module functionality, data, labels, exact field contracts or production behavior.

## 2. Cross-surface review

### 2.1 Login — identity and trust
**Composition:** branded visual panel and concise employee sign-in form.
**Keep:** clear employee identity, password visibility, remember-login affordance, strong primary action and restrained store photography.
**Refine before acceptance:** ensure image does not dominate the form; verify actual authentication copy, employee ID format, error states, keyboard behavior, autofill and mobile keyboard/safe-area behavior. Never imply biometric login unless the existing auth contract supports it.

### 2.2 Module Library — discovery and readiness
**Composition:** global shell, searchable/filterable module collection, compact module cards.
**Keep:** task-oriented grouping and visible readiness state.
**Refine:** use real module registry IDs and readiness metadata; distinguish ready, integrating, unavailable and permission-restricted. Cards for integrating modules must not imply an executable workflow. Provide list density option if module count grows.

### 2.3 Stocktake — dense operational workspace
**Composition:** workspace header, session identity/status, filters, product rows, inline quantity, discrepancy/status and progress/output actions.
**Keep:** information hierarchy and visible task progress.
**Refine:** actual source column contract, row virtualization threshold, keyboard/touch editing, validation/error details, negative/zero quantities, conflict handling, sticky header behavior and narrow-screen table strategy. Avoid decorative cards around every row. Preserve Stocktake state machine and persistence.

### 2.4 Stocktake Import — staged data processing
**Composition:** explicit stepper, file selection, processing/progress, summary counts, row-level validation and final action.
**Keep:** separation between file selection, processing, review and completion.
**Refine:** exact parser states, cancellation/retry, duplicate/source precedence, precision, partial errors, output format and local history. Progress must be based on real parser progress, not a fabricated percentage. Preserve IndexedDB, parser and TXT/ZIP output contracts.

### 2.5 Notifications — event awareness
**Composition:** filterable event list with type icon, concise event, context and relative time.
**Keep:** distinguish operational alerts from system updates.
**Refine:** connect only to real event sources; define read/unread, grouping, retention and action destination. Do not invent Activity/notification events or counts.

### 2.6 Settings and Update Center — system trust
**Composition:** settings category navigation and a focused update panel.
**Keep:** clear version, release state, update action and postpone/defer affordance where allowed by the existing update controller.
**Refine:** render exact build/release metadata from the current platform contract; explain active-work blockers and user choice. Do not bypass update staging, activation or rollback policy.

### 2.7 Scanner presentation — protected boundary
The prototype only indicates how the Scanner entry and result surface can visually fit the shared shell. It does not propose changes to camera acquisition, permission lifecycle, decoder, worker, geometry, recovery, settings persistence or Scanner Engine. Home lookup and Stocktake scanner remain feature-owned experiences.

### 2.8 Mobile — task-focused composition
The mobile examples test bottom navigation, condensed headers, focused task cards and touch-sized controls.
Before acceptance, validate real devices and browser chrome, safe areas, virtual keyboard, scroll ownership, table editing, scanner entry and offline states. Do not assume the generated image proves these behaviors.

## 3. Shared visual system tested by the prototype

| System element | Prototype direction | Validation required |
|---|---|---|
| Brand | RetailOS red, charcoal and warm neutral canvas | Contrast pairs and brand acceptance |
| Typography | Vietnamese-first, compact hierarchy | Font candidate, glyphs, readability and font loading |
| Navigation | Dark desktop rail with red active state; mobile bottom navigation | IA/route decision, keyboard, safe areas and active state |
| Surfaces | Warm light workspace panels; selective dark navigation | Surface contrast, border/elevation consistency |
| Cards | Varied size only where hierarchy needs it | Density and information grouping |
| Controls | Red primary, neutral secondary, semantic status | Disabled/loading/focus/error states |
| Photography | Real store/product imagery as selective context | Asset rights, compression, cropping and offline fallback |
| Motion | Short state transitions and local feedback | Reduced motion and low-end performance |
| Status | Explicit labels plus semantic color/icon | Meaning, accessible names and source-of-truth mapping |

## 4. Corrections required before calling this a high-fidelity prototype

1. Replace generated/invented copy and data with source-verified Vietnamese labels, fields and real state semantics.
2. Produce separate, legible screen frames at realistic viewport dimensions; the overview board is not sufficient to inspect details.
3. Build desktop, tablet and mobile variants for the shell and at least the highest-density operational workspace.
4. Validate Stocktake and Import interactions against their actual feature-owned state machines.
5. Validate Login against current authentication and session behavior.
6. Validate Update Center against the existing PWA release controller.
7. Confirm module readiness and notification data sources; do not fabricate capabilities or events.
8. Run accessibility, contrast, reduced-motion and low/mid-range performance checks on an implementation prototype before M0 exit.

## 5. Decision log

| Decision | Current proposal | Status |
|---|---|---|
| Global visual language | RetailOS red + warm neutrals + charcoal navigation | Proposed |
| Desktop navigation | Persistent compact rail/sidebar | Proposed |
| Mobile navigation | Task-focused bottom navigation | Proposed |
| Module cards | Semantic readiness state from registry | Required contract |
| Stocktake | Dense workspace with table-first task surface | Proposed |
| Import | Explicit staged processing/review flow | Proposed |
| Notifications | Real event sources only | Required contract |
| Update Center | Presentation adapter over current update controller | Required contract |
| Scanner | Presentation-only; engine locked | Protected |
| Typography | Vietnamese-first; font still unselected | Open |
| Final contrast/density | To be measured at real viewport sizes | Open |

## 6. M0 completion status

- [x] Initial product-wide visual direction documented.
- [x] Cross-surface concept board generated.
- [x] Core and operational surfaces included in one design language.
- [x] System-state language included.
- [ ] Individual high-fidelity screen frames completed and reviewed.
- [ ] Actual source labels, field contracts and state semantics reconciled.
- [ ] Desktop/tablet/mobile responsive prototypes validated.
- [ ] Accessibility and contrast evidence completed.
- [ ] Low/mid-range device performance evidence completed.
- [ ] Owner accepts M0 and authorizes M1.

**Conclusion:** This batch advances M0 from a Home-heavy initial composition to a cross-surface concept. It does not close M0 and does not authorize broad source migration.
