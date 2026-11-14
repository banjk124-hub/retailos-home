# UI Interaction Immediacy Audit

## Objective

Make every interactive surface acknowledge a pointer or keyboard action immediately. The acceptance metric is **input-to-first-feedback**, not total animation duration:

- Start: the user input event is received.
- End: the first visible state change or the relevant CSS animation/transition begins.
- Animation duration after it has started is part of the response and is not counted as input latency.
- A click must not be consumed only to reveal a hidden control that the user intended to activate.

The implementation must stay small and local. Do not introduce a global interaction service, event bus, dispatcher, queue, telemetry pipeline, or new asynchronous orchestration layer for this work.

## Confirmed findings and changes on this branch

### 1. Primary navigation could require a wake-up tap

Home used a 3.5-second idle timer to hide the topbar and LiquidDock. The hidden CSS state set `pointer-events: none`. A tap in the hidden control area therefore reached the page underneath; the global pointer listener only revealed the controls, and a second tap was required to activate them.

**Change:** Removed the idle-hide state, timer, global pointer/keyboard/wheel listeners, the hidden prop on LiquidDock, and the corresponding dead CSS states. Primary controls remain available for direct interaction.

### 2. Lazy-loaded surfaces could appear blank

The root authenticated `HomeScreen` boundary also used an empty `aria-busy` shell, so the handoff from the identity screen could become visually blank while the Home chunk loaded. Settings, Scanner QA Monitor, Scanner Settings, Stocktake and Stocktake Import used `Suspense fallback={null}`. When a feature chunk was not ready, the click updated state but no visible response was rendered until the chunk arrived.

**Change:** Added immediate visible loading feedback at the root HomeScreen boundary and one small presentation-only loading surface at the five existing Home lazy boundaries, with accessible busy states and close actions where applicable. No new loading service or async layer was introduced.

### 3. Stocktake transitions waited on storage before acknowledging the action

Starting/resuming a zone, opening review, saving/deleting an entry, exporting and clearing data awaited IndexedDB operations before any visible feedback. Some of these flows could appear unresponsive and invite repeated taps.

**Change:** Reused the existing `busy` state to show an immediate processing surface before the existing async work. Added consistent `finally` release and error handling where needed. No new state manager or persistence abstraction was added.

### 4. Interactive entry animations had explicit pre-start delays

The shared motion layer, Home entry styles, mobile login panel, Home notifications, older library card styles and the authenticated identity panel included stagger delays. Those delays postpone the start of the animation itself.

**Change:** Removed the pre-start delays from the affected UI entry paths, including the 160ms delay on the authenticated identity panel. Decorative brand and ambient animation timing is not changed. The topbar's continuous ambient motion now animates only transform/opacity; it no longer animates box-shadow or background-position on every frame.


### 5. Expensive derived validation ran during unrelated renders

Stocktake Import recalculated row-level validation for the active zone and every zone on each render, including renders caused only by notice, page or editing UI state. Scanner QA recalculated its aggregate summary whenever its filter/copy state changed and re-rendered every diagnostic row whenever a new event arrived, even though existing event objects are immutable.

**Change:** Memoized these derived values against the data snapshots they actually depend on. Scanner QA event rows are now memoized individually, so appending a new event does not re-render the existing 1,000-row history. This does not add asynchronous work or change validation rules.

## Regression coverage

`scripts/test-ui-interaction-immediacy.mjs` is registered in preflight. It guards:

- No silent root or nested lazy fallback while a feature chunk loads.
- No auto-hidden primary chrome/wake-tap behavior.
- No stagger delay on the audited page, dock, Home, mobile login, authenticated identity panel, notice and interactive card entry paths.
- Topbar ambient keyframes avoid repaint-heavy properties.
- Existing Scanner QA event rows are memoized when new diagnostic records arrive.
- Stocktake async actions acknowledge work before their first awaited storage operation and always release the existing busy state.

## Audit still in progress

The changes above are confirmed source-level findings, not a declaration that every interaction path is already clean. Remaining audit areas:

- HomeScreen render cost and state fan-out during search, navigation, overlay handoff and notification updates.
- Large Stocktake entry sets and Stocktake Import validation/render cost.
- Scanner presentation open/close handoff and camera lifecycle boundaries.
- Shared GlassSurface, overlay stacking, pointer hit-testing and CSS compositing on mobile Safari/Chrome.
- Desktop, Android Chrome/PWA, iOS Safari and iOS Home Screen PWA physical acceptance.

Do not mark the work complete or merge/deploy until source review, automated checks and the physical acceptance matrix have passed.
