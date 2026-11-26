# UI-02 — Home Ownership Refactor

**Status:** audit complete; implementation not yet validated.
**Branch:** `refactor/ui-02-home-ownership`
**Base:** `main` after UI-01B merge `f66f7b861903e22f5950065cc3f8799f93ca0e02`
**Scope:** reduce HomeScreen orchestration/state ownership without changing product behavior or visual presentation.

## Verified baseline

- UI-01B PR #178 is merged into `main` (merge commit `f66f7b861903e22f5950065cc3f8799f93ca0e02`). The old UI-01B phase note still says Draft/unmerged and must be reconciled separately.
- `HomeScreen.tsx` is a multi-domain orchestration component. It owns boot/update acknowledgement, navigation and scroll persistence, snapshot notices, push setup, responsive spotlight state, calendar, notification/notice overlays, module-library overlay, barcode lookup, scanner camera-lease handoff, settings, stocktake/import launch, toast feedback and the complete Home composition.
- Existing boundaries already exist and must be retained: `HomeModuleLibrarySection`, `ModuleLibraryEngine`, `homeStateStore`, `snapshotNoticeRules`, `ShellNavigation`, lazy/memoized feature roots and shared camera-session services.
- Existing tests are meaningful constraints, not implementation details to delete: `test-home-performance.mjs`, `test-home-cache-batching.mjs`, `test-ui-interaction-immediacy.mjs`, `test-body-scroll-lock.mjs`, `test-overlay-layout-contract.mjs`, `test-shell-navigation-contract.mjs` and browser runtime evidence.

## Ownership findings

### Confirmed consolidation opportunities

1. **Navigation/persistence ownership is split.** `activeNav` is React state while `activeNavRef` mirrors it for scroll/pagehide persistence. Scroll section detection, scroll throttling, restore, search persistence and destination routing all live in HomeScreen. These belong behind one Home navigation/persistence hook with one canonical state and an imperative ref only where an event listener needs a current value.
2. **Snapshot notice lifecycle is embedded.** Snapshot batch read, event subscription, status and notice derivation form one cohesive data hook. Keep `snapshotNoticeRules` pure.
3. **Calendar lifecycle is embedded.** Calendar date derivation, midnight/visibility refresh, month selection, Escape/focus restoration and close-animation timer are one cohesive interaction domain.
4. **Overlay orchestration is distributed.** Calendar, notice and library each have independent close timers, focus refs and Escape listeners. Consolidate only common lifecycle mechanics if an existing shared overlay primitive supports the exact behavior; do not invent a generic overlay framework.
5. **Toast timeout is not owned as a lifecycle.** `announce` schedules an untracked timeout; repeated announcements can let an older timeout clear a newer message. Any correction must use one timer owner and cleanup on unmount.

### State that is not automatically duplicate

- `selectedLibrary` and `selectedLibraryModules` may represent different values because the section supplies a filtered module list; verify the caller contract before deriving one from the other.
- `isMobileViewport` and `areSpotlightNotificationsExpanded` are not the same state: one reflects a media query, the other is a user-controlled disclosure state.
- Calendar current date, visible month and selected date have distinct meanings.
- Scanner-open state, motion origin and camera lease request have distinct UI/imperative lifecycles. Do not collapse them or move camera acquisition away from the direct user gesture.

## Implementation sequence

1. **UI-02A — Navigation + persisted Home UI state**
   - Extract scroll restore, active section tracking, destination routing and persistence into a focused hook.
   - Preserve stable destination IDs, initial persisted search, search callback semantics, reduced-motion scrolling, pagehide persistence and scroll debounce.
   - Remove the mirrored active navigation state only if the hook can safely preserve current event-listener semantics.
2. **UI-02B — Snapshot notices**
   - Extract batched snapshot loading, update-event subscription, stale-request guard and status derivation.
   - Keep notice rules pure and preserve empty/unavailable distinctions.
3. **UI-02C — Calendar interaction**
   - Extract calendar calculations and lifecycle; preserve midnight refresh, visibility refresh, focus/ESC behavior and close animation.
4. **UI-02D — Quick lookup / feedback**
   - Separate lookup request state and toast lifecycle only after tracing all scanner/manual lookup callers.
   - Keep camera lease acquisition in the actual user event path and preserve cancellation/claim semantics.
5. **UI-02E — Composition closure**
   - HomeScreen becomes a composition/orchestration boundary for employee/department context and feature entry points.
   - Remove only state proven redundant; do not split JSX into components solely to reduce line count.

## Protected contracts

- No changes to Auth/session, employee identity, module registry IDs/readiness, snapshot schema/IndexedDB/cache/offline behavior, scanner engine/decoder/camera lifecycle, Stocktake/Import persistence/export, PWA update lifecycle or navigation destination identity.
- No visual redesign, CSS consolidation or feature migration in UI-02.
- No new state-management library, context provider, event bus, generic modal framework or extra dependency.
- Keep lazy loading, memo boundaries, render isolation, body-scroll lock, accessibility, reduced motion and focus restoration intact.

## Acceptance criteria

- Each state domain has one clear owner; derived state is not stored twice.
- Hooks have narrow responsibilities and explicit inputs/outputs; no hook becomes a second monolithic HomeScreen.
- No behavior or UI contract changes beyond verified duplicate-state/lifecycle fixes.
- Existing relevant preflight tests pass; add focused tests for extracted contracts.
- TypeScript, production build, bundle comparison and browser runtime evidence pass on the exact PR HEAD.
- Update PROJECT_MAP and phase notes only after source ownership is verified.
