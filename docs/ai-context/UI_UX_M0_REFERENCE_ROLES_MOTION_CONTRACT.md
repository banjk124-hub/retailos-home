# RetailOS M0 — Reference Roles & Motion-Safe Experience Contract

**Status:** Governing M0 principle and execution contract, aligned to the owner's explicit clarification on 2026-11-25.
**Scope:** Entire RetailOS — application shell, core workspaces, operational workflows, system states and shared interaction language.
**Sources:** `IMG_1574(1).jpeg` is the structural/visual reference. `ScreenRecording_11-24-2026 20-25-21_1(2).mp4` is the motion, feedback and state reference.
**Rule:** These sources have separate responsibilities. Do not blend their palettes, layouts, product semantics or inferred features.

## 1. Non-negotiable interpretation

### Image = interface structure and visual composition

Use the image to understand the desired quality and structure of the interface:
- Strongly composed screens rather than generic dashboard templates.
- Modular and asymmetric layouts with intentional hierarchy.
- Distinct light and dark screen treatments where appropriate.
- Role-based surfaces with dimensionality and controlled contrast.
- Varied card proportions and focal regions.
- Clear typography, prominent meaningful metrics and compact supporting data.
- Compact navigation and deliberate device composition.
- High-quality craft in spacing, alignment, proportions, crop and negative space.

The image does **not** define RetailOS's brand palette, product domain, exact component library or desktop navigation. Its multiple app examples must not be treated as one unified design system.

### Video = motion, feedback, animation and state behavior

Use the video to understand how a product experience should respond over time:
- Initial/empty or skeleton-like composition.
- Progressive appearance of content as it becomes ready.
- Stable screen framing while content changes.
- Cards, prompts, suggestions and actions becoming available in a clear sequence.
- Transition between an initial prompt experience and a populated task/result surface.
- Calm, lightweight, low-noise interaction behavior.

The recording visibly shows a QuickBasket concept: an initial assistant-style prompt surface with two task cards and suggested prompts, a populated weekly smart-basket surface with a prominent action and suggested product list, and intermediate sparse/skeleton-like states. The final iOS Control Center segment is device UI, not app behavior.

The video does **not** specify exact animation durations, easing curves, spring parameters, gesture physics, loading algorithms or RetailOS business logic. These must be designed and measured independently.

## 2. RetailOS owns the product language

The references provide principles, not a replacement identity.

RetailOS must retain:
- Its own red brand identity and semantic color system.
- Vietnamese-first content and operational terminology.
- Retail-specific information architecture and workflows.
- High-density data readability where operations require it.
- A premium, authored visual language, not a generic AI-generated admin template.
- Responsive behavior designed for desktop office use and mobile field use.

Do not import the image's amber/yellow palette or the video's green palette as RetailOS brand colors. Do not copy the reference products' health, finance, shopping assistant or recommendation semantics.

## 3. Two independent design tracks that meet at M0

### Track A — Structural design (image-derived)

Define:
1. Composition and grid grammar.
2. Information hierarchy and content density.
3. Surface roles and depth.
4. Typography and numeric hierarchy.
5. Light/dark visual contexts.
6. Navigation and responsive shell.
7. Photography and visual assets.
8. Component proportions, spacing, iconography and craft.

### Track B — Temporal/behavior design (video-derived)

Define:
1. State model for each surface.
2. Loading and skeleton strategy.
3. Progressive content reveal.
4. Interaction feedback and acknowledgement.
5. Navigation, sheet and dock transitions.
6. Progress, success, warning and error feedback.
7. Cancellation, interruption and recovery.
8. Reduced-motion and low-performance behavior.

Tracks A and B are developed independently, then integrated. Structural choices must not be justified by the video's green palette. Motion choices must not be inferred from the image's static card layout.

## 4. Motion and state architecture — correctness before animation

Motion must never become a second source of truth or an alternate workflow engine.

### 4.1 State ownership
- Business and feature state remain owned by their existing feature/store/controller.
- Motion components receive already-derived presentation state and render transitions only.
- Animation completion must never commit business data, mark a task complete, change inventory, acknowledge a notification or advance a workflow by itself.
- The source state changes first; motion is a visual consequence of that change.
- When motion is interrupted, the final rendered state must converge to the current source state.

### 4.2 Async and stale-data protection
- A loading-to-ready transition may only display the result belonging to the current request/session/generation.
- Late responses from an older request must not replace newer data.
- Do not launch duplicate fetches because a component remounted, a transition replayed or a visibility animation restarted.
- Do not couple data fetching to animation lifecycle callbacks.
- Keep existing request deduplication, cancellation, cache and snapshot contracts.
- Skeletons must describe the expected structure, not invent values or status.
- Unknown values remain unknown; do not animate placeholders into fabricated metrics.
- Partial data must be labeled/represented as partial rather than silently appearing complete.

### 4.3 Transition concurrency
- One owner controls a given transition. Avoid multiple wrappers and local CSS animations competing over the same element.
- Repeated input must not stack queued animations or duplicate actions.
- Latest state wins; obsolete transitions are cancelled or safely superseded.
- Navigation and modal transitions must respect existing overlay ownership, body scroll lock and feature close gates.
- Scanner presentation must not cause camera acquisition/release from decorative animation callbacks. Scanner Engine and camera lifecycle remain protected.

### 4.4 Performance budget
- Prefer transform and opacity.
- Avoid continuous animation, large-area blur, animated height/width and expensive filter effects on operational screens.
- Use CSS transitions for simple visual feedback; use existing shared motion infrastructure for coordinated transitions. Do not add a second motion library/runtime without an evidence-based decision.
- Respect reduced motion and power-conserve modes.
- Avoid animating every row/card simultaneously; stagger only small, meaningful groups.
- Do not block input, data readiness or task completion on animation.
- Ensure animations stop or simplify when the document is hidden or the device is under resource pressure, where supported by the existing motion controller.
- Validate on low/mid-range Android and office desktop hardware.

## 5. State contract for every workspace

Every relevant surface must define explicit:
- Initial / not requested.
- Loading / skeleton.
- Ready / populated.
- Empty / no matching results.
- Partial / stale (only where source contract supports it).
- Error / retryable or non-retryable.
- Offline / cached or unavailable.
- Submitting / processing.
- Success / completed.
- Cancelled / interrupted.

Only include states that make sense for the feature. Do not manufacture a stale or partial state if the underlying data contract does not expose one.

For each state document:
- Source-of-truth owner.
- Entry condition.
- Exit condition.
- Available actions.
- What is displayed and what is intentionally withheld.
- Whether the state is cached, live or derived.
- Feedback behavior and reduced-motion fallback.

## 6. M0 product-wide application

| Surface | Structural track (image) | Temporal track (video) |
|---|---|---|
| Login | Strong brand composition, focused form, authentic imagery where useful | Input focus, validation, submit pending, success/error handoff |
| Application Shell | Spatial layout, compact navigation, responsive composition | Navigation feedback, workspace reveal, persistent shell during transitions |
| Home | Focal operational composition and meaningful metric hierarchy | Snapshot loading, progressive readiness, refresh feedback without fake values |
| Module Library | Varied module composition and readiness hierarchy | Search/filter feedback, open transition, loading/empty states |
| Stocktake | Dense operational workspace, table/data hierarchy | Scan/edit/validate/save feedback; preserve exact stocktake state and avoid duplicate writes |
| Stocktake Import | Staged workflow and high-clarity review surface | File parsing/progress/validation/result; progress comes from real parser state |
| Scanner presentation | Distinct camera-focused surface integrated with brand | Permission/start/ready/error/close feedback; never let animation own camera lifecycle |
| Settings/Update Center | Calm system surface with clear release hierarchy | Download/ready/defer/activate states driven by PWA controller |
| Notifications | Compact event stream and priority hierarchy | Read/unread and navigation feedback only from real event state |
| Search | Focused overlay/surface with clear result hierarchy | Query pending/results/empty/error; cancel old request and ignore stale results |
| Offline/Error | Clear recovery composition | Retry and recovery feedback; preserve actual connectivity/cache truth |

## 7. M0 execution sequence

### M0-A — Structural direction
- [ ] Create a coherent RetailOS visual language from the image's structural principles.
- [ ] Validate Login, Shell, Home, Module Library, Stocktake, Import and Settings.
- [ ] Establish responsive desktop/tablet/mobile compositions.
- [ ] Define light/dark contexts only where they improve the product.

### M0-B — Temporal/interaction direction
- [ ] Extract observed state progression from the video without inventing timings.
- [ ] Define state diagrams for representative workspaces.
- [ ] Specify loading → ready, empty, error, progress, success and interruption behavior.
- [ ] Define motion tokens and concurrency/ownership rules.
- [ ] Define reduced-motion and low-performance behavior.

### M0-C — Integration and correctness
- [ ] Demonstrate the structural direction with temporal behavior applied.
- [ ] Verify no duplicate requests, duplicate writes or stale-response overwrites.
- [ ] Verify interrupted/reversed transitions converge to source state.
- [ ] Verify data state is never inferred from animation completion.
- [ ] Verify feature/platform protected contracts remain intact.

### M0-D — Quality and owner acceptance
- [ ] Inspect high-fidelity screens individually at realistic viewport sizes.
- [ ] Validate Vietnamese typography, contrast, accessibility and input responsiveness.
- [ ] Validate low/mid-range device performance.
- [ ] Confirm all product surfaces share a recognizable RetailOS language without being visually identical.
- [ ] Owner accepts M0 before M1.

## 8. Explicit exclusions

- No copied amber or green brand palette.
- No merging of image layout and video product semantics.
- No generic dashboard template as the baseline.
- No fabricated KPIs, inventory, module readiness, notifications, progress or recommendations.
- No animation-driven business logic or persistence.
- No duplicate motion runtime, data fetching, event subscriptions or overlay managers.
- No Scanner Engine, camera lifecycle, Stocktake persistence, Import parser/output, auth/session or PWA release changes.
- No source migration before M0 acceptance.

## 9. Governing decision

The image defines the **structural quality and composition target**. The video defines the **temporal quality and interaction target**. RetailOS defines the **brand, business semantics, data truth and architecture**.

These are three separate authorities. M0 is complete only when they are integrated without conflating their responsibilities.
