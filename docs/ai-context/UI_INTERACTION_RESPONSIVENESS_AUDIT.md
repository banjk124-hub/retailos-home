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

The shared motion layer, Home entry styles, mobile login panel, Home notifications, older library card styles, barcode result rows and the authenticated identity panel included stagger delays. Those delays postpone the start of the animation itself.

**Change:** Removed the pre-start delays from the affected UI entry paths, including the 160ms delay on the authenticated identity panel and the 45ms/90ms stagger on barcode result rows. Redundant 0ms delays were also removed. Decorative brand and ambient animation timing is not changed. The topbar's continuous ambient motion now animates only transform/opacity; it no longer animates box-shadow or background-position on every frame.


### 5. Active Stocktake entries were filtered and sorted on every render

The active-zone entry state was already scoped and sorted by the storage loader, but the render path repeated the filter and sort whenever any Stocktake state changed. Review and history screens also mounted every entry and action log at once, which could create a large synchronous render for long-running inventory sessions. The module's general refresh path also read the complete action-log store even when the user only needed the home, scan or review screen.

**Change:** Reuse the already scoped/sorted state array directly. Sorting remains at the data-loading boundary, not in the render path. Review entries and history logs now render in bounded batches of 100 with a local “show more” action; the underlying records and export data remain unchanged. The full action log is loaded only when the user opens History, with the existing busy state shown before the IndexedDB read.

### 6. Expensive derived validation ran during unrelated renders

Stocktake Import recalculated row-level validation for the active zone and every zone on each render, including renders caused only by notice, page or editing UI state. Scanner QA recalculated its aggregate summary whenever its filter/copy state changed and re-rendered every diagnostic row whenever a new event arrived, even though existing event objects are immutable.

**Change:** Memoized these derived values against the data snapshots they actually depend on. Scanner QA event rows are now memoized individually, so appending a new event does not re-render the existing 1,000-row history. This does not add asynchronous work or change validation rules.

### 7. Mobile blur-budget overrides missed sibling overlays

The existing mobile performance rules targeted overlays through `.app-shell`, but HomeScreen renders several modal backdrops and the LiquidDock as siblings of that element. Their full-screen backdrop blur therefore bypassed the mobile performance policy.

**Change:** Added direct mobile overrides for Scanner QA, Scanner Settings, barcode results, calendar, notice, library, Stocktake and identity-transition backdrops, including the nested Stocktake confirmation dialog, plus the glass modal panels, Home's spotlight notification surface and the Stocktake Import sticky header. The visual surfaces retain their translucent backgrounds; only the expensive backdrop blur is disabled on mobile/coarse-pointer devices.

## Intentional delays and remaining runtime risks

The source sweep also found timers that are not input-to-first-feedback defects and should not be removed indiscriminately:

- Login sets the submitting state before its 120ms local-auth timer; the button's submitting response begins immediately. The timer gives that state a paint opportunity before synchronous local validation.
- The authenticated identity journey's hold duration is the transition itself. Its first visual response begins immediately; the 160ms child-panel stagger was removed.
- Calendar, notification and notice close timers are exit-lifecycle cleanup. Their closing state and CSS exit animation begin in the click handler; the timers are fallback unmount boundaries.
- The dock's keyboard-open suppression is separate from the removed idle auto-hide. It prevents a fixed dock from competing with the on-screen keyboard. Validate this behavior on physical iOS/Android before changing it.
- Scanner decoding still performs synchronous ZXing work on the main thread within its existing bounded frame loop. Its cadence and decoder contract were intentionally left unchanged. Use the existing Scanner QA metrics (`decodeDurationMaxMs`, `maxFrameCallbackGapMs`, `longTasks`) during physical profiling before considering scanner-runtime changes.

These are documented separately so future changes do not remove lifecycle safeguards or alter scanner behavior while trying to improve click responsiveness.

## Regression coverage

`scripts/test-ui-interaction-immediacy.mjs` is registered in preflight. It guards:

- No silent root or nested lazy fallback while a feature chunk loads.
- No auto-hidden primary chrome/wake-tap behavior.
- No stagger delay on the audited page, dock, Home, mobile login, authenticated identity panel, notice, interactive card and barcode result entry paths.
- Topbar ambient keyframes avoid repaint-heavy properties.
- Mobile blur-budget overrides cover modal siblings outside the app shell.
- Existing Scanner QA event rows are memoized when new diagnostic records arrive.
- Stocktake async actions acknowledge work before their first awaited storage operation and always release the existing busy state.
- Stocktake review and history do not mount unbounded lists in one render.
- The complete Stocktake action log is not read during unrelated module refreshes.

## Physical acceptance protocol

Run this matrix on the deployed PR build, not only in the development server. Test both a cold first open (feature chunk not cached) and a warm repeat open.

| Surface / action | Required first response | Completion / regression check |
|---|---|---|
| Topbar and LiquidDock after more than 3.5s idle | The first tap activates the intended control; no wake-up tap | Verify desktop and touch layouts |
| Home section navigation and search | Active state / filtered result updates on the first input | Typing remains responsive while filtering |
| Calendar, notifications, notice detail, library and barcode result | Entry or exit animation starts on the initiating click, without a pre-start delay | Backdrop, scroll lock, close and outside-click behavior remain correct |
| Settings, Scanner QA, Scanner Settings, Stocktake and Stocktake Import | A visible loading status appears on the first frame while a cold chunk resolves | No blank overlay; close action remains usable |
| Stocktake start/resume/review/history/save/delete/export/clear | Busy status appears before IndexedDB work | Data, revision, history and exported file contents remain unchanged |
| Mobile keyboard and dock | Dock hides while an editable field owns focus and returns after blur | No lost focus, extra tap or viewport jump |
| Scanner while decoding | Close and other available controls remain responsive | Record `decodeDurationMaxMs`, `maxFrameCallbackGapMs` and `longTasks` in Scanner QA |

### Timing acceptance

- For a local or warm interaction, target input-to-first-visible-response at no more than one display frame at p95: 16.7ms at 60Hz or 8.3ms at 120Hz.
- For a cold lazy module or storage-backed action, the loading/busy state must be committed on the first frame; chunk download or IndexedDB completion is measured separately.
- Do not include the animation's run duration in input latency. Measure from the input event to the beginning of the relevant animation/transition or first visible state change.
- Run each action at least 20 times per device class. Record p50/p95 and any missed first tap; one missed first tap is a failure.
- Repeat with `prefers-reduced-motion` enabled. The response must remain immediate even when the animation itself is suppressed.

Physical QA is not inferred from CI compatibility-contract tests. Record device model, OS version, browser/PWA mode, refresh rate when known, and cold/warm state before marking a row accepted.

## Audit still in progress

The changes above are confirmed source-level findings, not a declaration that every interaction path is already clean. Remaining audit areas:

- HomeScreen render cost and state fan-out during search, navigation, overlay handoff and notification updates.
- Physical profiling of large Stocktake datasets and Stocktake Import tables on low/mid-range devices.
- Scanner presentation open/close handoff and camera lifecycle boundaries.
- Shared GlassSurface, overlay stacking, pointer hit-testing and CSS compositing on mobile Safari/Chrome.
- Desktop, Android Chrome/PWA, iOS Safari and iOS Home Screen PWA physical acceptance.

Do not mark the work complete or merge/deploy until source review, automated checks and the physical acceptance matrix have passed.
