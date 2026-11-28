# JRN-03 — Page Host and Independent Workspaces: Source Audit

**Status:** Static source/contract audit complete; implementation not started.  
**Audited main baseline:** `b30505a86511909d94406bfd8467be4ec204c620` (2026-11-28).  
**Runtime baseline:** JRN-02 merge PR #212 at `b958d9033d8f5c1f7a0a48844bde1a9909ca66de`.  
**Scope:** authenticated destination controller/Page Host and extraction of the two operationally ready workflows, Stocktake and Stocktake Import.  
**Out of scope:** JRN-04 global quick actions; visual redesign; business logic/persistence redesign; backend/database/global state library; URL router/deep-link/browser-history integration; scanner runtime changes.

This audit records source evidence and implementation boundaries. It is not a claim of runtime implementation, browser/device acceptance, or approval to merge/deploy.

## 1. Executive finding

JRN-02 established persistent navigation ownership, but `AuthenticatedAppShell` still renders only `HomeScreen`. There is no runtime Journey Controller, destination stack, Page resolver or Page Host. The two operational workflows are still lazy-loaded overlays mounted by Home-owned booleans inside `HomeScreen`.

The existing feature modules already own most of their business state, persistence orchestration and resource lifecycle. The safest migration is therefore **move the mount/entry ownership, not rewrite the workflows**.

Recommended shape:

1. Add the smallest authenticated in-memory Journey Controller using the existing typed contract in `src/platform/journey/journey.types.ts`.
2. Add a lazy active Page Host at the authenticated Shell workspace boundary.
3. Keep Home as the initial/default Page and preserve its existing Home section navigation and return snapshot.
4. Resolve only `stocktake` and `stocktake-import` as Feature Pages, and require both a registered Page resolver and `MODULE_REGISTRY.availability === 'ready'`.
5. Adapt each feature's outer presentation from modal/overlay framing to a Page workspace while retaining the current feature coordinator, presentation, stores, and business operations.
6. Add a real Page-exit guard bridge before enabling navigation away from active workflows. The current PWA update blockers are not a substitute for navigation guards.

Do not build JRN-04 global actions in this phase.

## 2. Baseline source map

| Area | Baseline evidence | Current responsibility |
|---|---|---|
| App/authentication | `src/App.tsx` | Owns employee session, Login → Identity → authenticated handoff, logout, boot health and PWA transition blocker |
| Authenticated Shell | `src/platform/shell/AuthenticatedAppShell.tsx` | Composes authenticated scene, Home presentation root, HomeScreen and persistent navigation; no destination host |
| Shell navigation | `src/platform/shell/shellNavigationContext.tsx` | One owner-scoped navigation-model registration; Shell renders the registered model |
| Typed Journey contract | `src/platform/journey/journey.types.ts` | Destination union, stable key, stack entry, push/pop/replace, Home return context, transition direction and exit-guard result types |
| Workflow identity | `src/shared/domain/retailModule.ts` | Canonical `RetailModuleId`; do not add a second feature-ID registry |
| Readiness registry | `src/features/home/moduleRegistry.ts` | Existing module readiness, platform availability and data-source metadata |
| Home | `src/features/home/HomeScreen.tsx` | Owns Home sections, Home navigation, module library and current mounts for Stocktake/Import |
| Home navigation | `src/features/home/hooks/useHomeNavigation.ts` | Scroll-section navigation for `home/modules/activity`, Settings action and persisted Home UI state; not a page router |
| Stocktake | `src/features/stocktake/components/StocktakeModule.tsx` | Feature state, local store orchestration, PWA update blocker, scanner lease and feature actions |
| Stocktake Import | `src/features/stocktake-import/components/StocktakeImportModule.tsx` | Import/edit/validation/history/export state, local persistence, PWA update blocker and dirty-close check |
| Feature presentations | `StocktakePresentation.tsx`, `StocktakeImportPresentation.tsx` | Feature-specific content and interaction rendering; currently framed as overlay-style work surfaces |

## 3. Confirmed architecture gaps

### 3.1 No runtime Page Host

- `AuthenticatedAppShell.tsx` lazy-loads `HomeScreen` directly and always renders it for the authenticated Home journey.
- `ShellNavigationProvider` stores a single navigation registration; it does not manage destinations or history.
- `HomePresentationRoot` selects a Home presentation composition. It is not a general Feature Page host.
- `journey.types.ts` already defines `ExperienceDestination`, `JourneyStackEntry`, `JourneyNavigationCommand`, destination keys and transition direction, but these are contract types/helpers only.
- No current route/history adapter exists. Continue with an in-memory authenticated stack; do not add URL/history integration in JRN-03.

### 3.2 Home owns both workflow mounts

In `HomeScreen.tsx`:
- `isStocktakeOpen` and `isStocktakeImportOpen` control the two workflow mounts.
- `closeStocktake` and `closeStocktakeImport` are Home callbacks.
- The module-library selection handler closes the library and sets one of those booleans.
- The bottom of HomeScreen mounts `MemoizedStocktakeModule` and `MemoizedStocktakeImportModule` inside Suspense boundaries.
- Home's `useBodyScrollLock` includes both feature-open booleans.

The migration must remove those two workflow ownership paths from Home only after Page Host integration is ready. Keep Home's module library as the entry point; selecting a ready workflow should dispatch a typed destination command, not toggle an overlay boolean.

### 3.3 Registry readiness is separate from destination identity

- `RetailModuleId` already contains `stocktake` and `stocktake-import` and several placeholders.
- The module registry marks the two workflows `availability: 'ready'`; other listed workflows are `integrating`.
- A typed ID alone must not make a feature navigable.
- Page resolution must require both a concrete resolver and `availability === 'ready'`. Keep `workStatus`, `dataSource`, platform availability, permission and runtime capability as separate dimensions.
- Reuse `MODULE_REGISTRY`; do not create a parallel list of IDs/readiness flags.

## 4. Feature migration boundaries

### 4.1 Stocktake

**Current implementation**
- `StocktakeModule` owns session initialization, zone/revision lifecycle, entries, review, logs, exports and calls to `stocktakeStore`.
- It resolves employee code from the authenticated employee session/local directory.
- It owns the camera lease request, scanner open/close lifecycle, platform capability check and scanner overlay.
- It registers the PWA update blocker under `stocktake` and notifies the update-safety coordinator as relevant state changes.
- It calls `useBodyScrollLock(true)` for the full current overlay surface.
- `StocktakePresentation` receives an `onClose` action; `onBackHome` is an in-module transition from an active zone to the Stocktake landing screen, not a return to the RetailOS Home Page.

**Risks / required handling**
- The current `onClose` prop is not a general navigation guard. The PWA update blocker protects update activation only; it does not prevent a Page navigation command.
- Dirty/active state includes pending zone replacement/clear confirmation, active save/load, scanner operation, editing/manual-entry state and typed barcode/quantity/zone input. Preserve the current blocker semantics when adding the Page-exit guard.
- Unmount cleanup cancels the pending camera lease request; scanner component cleanup and actual media-track release must remain intact. Never use transition-animation completion as the resource cleanup mechanism.
- The feature currently locks body scrolling unconditionally because it is an overlay. When converted to a Page, remove only the obsolete overlay-level lock after verifying the Page workspace owns its own scrolling. Keep nested scanner/confirmation overlay behavior and safe-area/viewport handling.
- Preserve local store schema, session identity, zone revisions, logs, export payloads and history exactly.

**Migration rule:** keep `StocktakeModule` as the feature coordinator initially. Make the smallest presentation/frame change required for Page composition; do not split its state machine or rewrite its store.

### 4.2 Stocktake Import

**Current implementation**
- `StocktakeImportModule` owns workbook parsing, import session merge/conflict handling, row validation, dirty-zone edits, history persistence, TXT/ZIP generation and restore.
- It uses `stocktakeImportStore` and retains source provenance/fingerprints and history.
- It registers the PWA update blocker under `stocktake-import`.
- It calls `useBodyScrollLock(true)` because it is currently an overlay.
- Its internal `handleClose` blocks when `hasDirtyZones` is true, then calls the supplied `onClose`.

**Critical guard gap**
The PWA blocker also reports busy/history operations, pending import confirmation, an active result not successfully persisted, and clear/new-session confirmations. The current `handleClose` only blocks `hasDirtyZones`. A Page-level exit must not bypass the richer update-safety state or discard an in-memory result whose history persistence failed.

**Migration rule:** expose the feature's current exit-safety state through a narrow typed callback/registration contract. Do not move Import state into the Journey Controller and do not use the PWA update blocker as the navigation API. Preserve parser precision, conflict decisions, dirty edits, source identity, history and export bytes.

### 4.3 Shared presentation boundary

Both feature presentations currently render full work surfaces with overlay-oriented wrappers and feature-owned CSS. JRN-03 must:
- separate Page workspace framing from feature business/presentation internals;
- preserve the existing feature content hierarchy and interactions during the first migration;
- provide Page-level title/Back affordance and status/feedback without duplicating an existing feature header;
- retain feature-local confirmation/scanner overlays, focus behavior and scroll-lock semantics;
- verify Desktop fixed-left Shell Dock remains visible while Page content changes in the workspace to its right; Mobile retains its existing adaptive Shell navigation;
- avoid using Home-specific presentation wrappers as a universal Feature Page wrapper without checking their layout assumptions.

Do not undertake a visual redesign as part of this extraction.

## 5. Proposed minimal target composition

```text
App.tsx
└── AuthenticatedAppShell
    ├── JourneyController (in-memory authenticated stack)
    ├── ShellNavigationProvider / PersistentShellNavigation
    └── ActivePageHost (lazy resolver; one active destination)
        ├── HomePage
        │   └── HomeScreen (Home sections + Module Library)
        ├── StocktakePage
        │   └── StocktakeModule (existing feature coordinator)
        └── StocktakeImportPage
            └── StocktakeImportModule (existing feature coordinator)
```

Ownership rules:
- App retains authentication/session/logout and PWA lifecycle ownership.
- Authenticated Shell retains persistent navigation chrome and Page Host boundary.
- Journey Controller owns only destination stack, transition intent and Home return snapshot.
- Active Page owns its UI state and registers its navigation model.
- Feature coordinator owns business state, persistence and resource cleanup.
- Navigation controller receives a feature exit-guard result; it does not inspect feature internals or PWA blocker internals.
- Global QuickActionHost is not part of this phase.

## 6. Implementation sequence and acceptance gates

| Slice | Work | Acceptance |
|---|---|---|
| JRN-03A | Journey Controller + Page Host foundation | Home remains the default Page; typed push/pop/replace; one active Page; lazy resolver; unknown/unready destinations fail safely; Shell/navigation remain mounted; no URL/history integration |
| JRN-03B | Stocktake Page extraction | Home launches `feature:stocktake`; Stocktake renders as a workspace, not Home-owned modal; Back returns to prior/Home context; scanner and local store behavior unchanged; dirty/active exit guard works |
| JRN-03C | Stocktake Import Page extraction | Home launches `feature:stocktake-import`; Import renders as a workspace; Back/exit guard blocks dirty edits, pending import, active work and unpersisted result; history and exports remain unchanged |
| JRN-03D | Home ownership removal + integrated QA | No Stocktake/Import mount booleans or direct feature mounts remain in Home; module library dispatches typed navigation; Home context restores; Desktop Dock/Mobile navigation persist; tests cover both workflows and regressions |

A slice may be split into smaller PRs if needed. Do not combine the entire migration into one large patch when the risk can be isolated.

## 7. Controller and Page Host constraints

- Initialize the authenticated stack to Home; authentication remains outside Journey state.
- Use existing `ExperienceDestination` and `getJourneyDestinationKey`; do not create another destination identity type.
- `push` should avoid pushing the same destination as the current top entry; `pop` returns to the previous valid entry; `replace` is reserved for normalization/recovery.
- Capture Home return context from the existing Home state: active section, search query, non-negative scroll position and optional semantic focus key. Restore on Feature → Home. Do not persist overlays, camera state or feature business data in this snapshot.
- On reload/session restore, initialize to Home using existing persisted Home UI state; do not reconstruct an unvalidated feature stack.
- Resolve a feature only if a concrete lazy Page resolver exists and the existing module registry says `availability === 'ready'`. Keep platform capability and data/permission state separate.
- Keep the Page Host error/loading boundary local to the active Page; a feature render failure must not destroy authentication or the persistent Shell.
- Page navigation changes active workspace; it must not remount App/authentication, platform capability providers, Shell navigation or PWA lifecycle owners.
- Motion direction is semantic only: push → forward, pop → back, replace → none. Reduced-motion remains governed by the shared motion system.
- Do not add a general Page framework, plugin registry, route library, global event bus or generic persistence abstraction unless a concrete JRN-03 consumer proves it necessary.

## 8. Exit guard and lifecycle requirements

The existing `JourneyExitGuardResult` type defines `allow` or `block(reason, resolution: wait | confirm | stay)`, but no runtime registration/controller bridge currently exists.

Required behavior before feature navigation is enabled:
- Controller asks the active Page/feature guard before push, pop or replace that would discard it.
- `wait`: wait for the current critical operation; re-evaluate the guard after completion.
- `confirm`: show a feature-owned confirmation or route to a feature-owned resolution; do not silently discard.
- `stay`: reject navigation and keep the current Page active.
- Guard evaluation must be current (avoid stale closure state); unregister only the matching Page owner.
- Logout remains governed by App's existing logout flow and explicit cleanup; do not silently change logout semantics in this phase.
- On accepted exit/unmount, release camera lease/stream, event listeners, timers, object URLs, subscriptions and update blockers through existing feature cleanup.
- Notify the PWA update-safety coordinator when blocker state changes; navigation acceptance must never bypass PWA update consent or blockers.

## 9. Test and verification plan

**Contract/unit tests**
- Journey stack: initial Home, push, pop, replace, duplicate-current push, invalid destination and stack normalization.
- Home return context: active section/search/scroll/focus capture and restore; no overlay/camera/business data in snapshot.
- Resolver: ready + registered resolves; integrating/unregistered does not resolve; stable IDs reused.
- Exit guard: allow, wait, confirm, stay; async re-evaluation; owner-scoped unregister; no stale guard after unmount.
- Shell navigation: registration changes with Page owner while Shell remains mounted.

**Browser integration**
- Home → Stocktake → Back/Home; Home → Import → Back/Home.
- Navigate between Stocktake and Import; previous Page guard is honored.
- Desktop Dock remains fixed/visible through all Page changes; Mobile navigation remains present and usable.
- Page content scrolls independently as intended; no double body lock or background scroll leak.
- Loading/error boundary and lazy chunk failure do not unmount Shell/authentication.
- Home scroll/search/section restore is correct.
- Keyboard focus and Escape behavior remain correct for local dialogs; focus returns to invoking Page control where available.
- Scanner open/close/unmount releases camera and leaves no active lease/track; platform capability policy is unchanged.
- Import dirty edit, pending merge/conflict, failed history persistence, active import/export and confirmation states block navigation appropriately.
- PWA update blocker remains active until the feature has safely exited; accepted Page navigation does not trigger premature release.

**Regression**
- Existing Stocktake zone/session/revision/review/history/export tests.
- Existing Import parse/precision/provenance/conflict/dirty edit/history/TXT/ZIP tests.
- Existing scanner lifecycle/camera policy tests.
- Production and GitHub Pages builds, bundle-boundary tests, full preflight and browser suite.
- Physical iOS/Android acceptance remains a separate gate; browser emulation is not device acceptance.

## 10. Risks and explicit non-goals

| Risk | Required mitigation |
|---|---|
| Unsaved feature state lost on Page unmount | Exit guard based on current feature state; preserve existing local persistence; no automatic unmount before guard acceptance |
| Import in-memory result lost after history persistence failure | Include `result && !historyPersisted` in navigation guard, not only dirty rows |
| Scanner lease/stream leaks on Page exit | Preserve owner cleanup and verify actual stream release on unmount |
| Existing modal CSS/layout breaks in workspace | Bounded outer-frame adaptation and browser evidence; no broad CSS rewrite |
| Home context lost after return | Capture/restore existing Home UI state; do not persist transient overlays |
| Placeholder module becomes navigable | Require concrete Page resolver plus registry readiness |
| Shell Dock remounts/disappears | Keep Page Host below persistent Shell boundary; test mounted identity |
| PWA update safety bypassed | Keep update blockers independent and authoritative |

Explicitly not included: global Quick Search/Scanner/Settings/Calendar/Notifications extraction (JRN-04), shared system data (JRN-06), broad Experience System visual implementation (JRN-07), physical device certification (PW-01), new backend or router.

## 11. Audit conclusion

**JRN-03 is ready to enter bounded implementation planning, not yet ready for an unrestricted code migration.**

The existing typed destination contract and the two feature coordinators provide a workable starting point. The two primary blockers are:
1. no runtime Journey Controller/Page Host;
2. no navigation exit-guard bridge capable of protecting the complete Stocktake and Import state.

Resolve these in JRN-03A before exposing Page navigation. Then extract Stocktake and Import separately, with feature state/persistence unchanged. Keep Home as a Page and keep the Shell persistent. JRN-04 must wait until real Page destinations exist and have passed integration QA.
