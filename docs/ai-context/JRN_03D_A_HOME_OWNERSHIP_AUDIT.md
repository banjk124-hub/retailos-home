# JRN-03D-A — Home Ownership Audit

**Status:** Source audit complete; no runtime source change authorized by this slice.  
**Audited branch:** `main`  
**Audited baseline:** `9e1c999bd27ab280e00cb1143b68f0865829c0f7` (JRN-03C merge commit).  
**Scope:** Home ownership and dependencies related to Stocktake and Stocktake Import after JRN-03B/JRN-03C.  
**Out of scope:** JRN-04 Global Quick Actions; moving Settings, Scanner, Calendar, Notifications or Quick Search into Shell; business logic/persistence changes; visual redesign; CSS cleanup; Journey Controller redesign; physical-device acceptance.

## 1. Executive finding

**The two Home-owned workflow mounts have already been removed.** The current `HomeScreen` does not import, lazy-load, memoize or render `StocktakeModule` or `StocktakeImportModule`. Their feature roots are now mounted only by their dedicated Journey Pages.

Therefore JRN-03D's original phrase “remove any remaining Home-owned feature mounts” is already satisfied by the merged JRN-03B/JRN-03C implementation. A further mount-removal refactor in Home would be redundant and would add risk without changing ownership.

Home still contains a deliberately narrow **entry adapter**: it selects one of the two stable module IDs from Module Library, captures ephemeral Home return context, and dispatches a typed Journey `push`. This is navigation initiation, not ownership of either workflow. Keep it until a separately approved entry-point architecture replaces it.

**Recommendation:** Do not make a source cleanup solely to remove the remaining Journey references from Home. Proceed to JRN-03D-B only as a bounded contract/test hardening step if the audit's acceptance gaps are confirmed; otherwise mark the ownership-removal subtask satisfied and focus JRN-03D-C on integrated cross-Page runtime regression.

## 2. Source evidence and current ownership

| Concern | Current source | Observed ownership | Audit result |
|---|---|---|---|
| Authenticated destination host | `src/platform/shell/AuthenticatedAppShell.tsx`, `src/platform/journey/ActivePageHost.tsx` | Shell owns persistent host; ActivePageHost resolves active destination | Correct |
| Journey destination/readiness | `src/platform/journey/journeyPageRegistry.tsx` | Lazy Page resolvers plus `MODULE_REGISTRY.availability === 'ready'` gate | Correct |
| Journey state/exit dispatch | `src/platform/journey/journeyController.ts` | Stack, push/pop/replace, active exit guard | Correct |
| Home workspace | `src/features/home/HomeScreen.tsx` | Home sections, Home UI state, Module Library, Home-local utilities | Correct boundary |
| Home feature entry | `HomeScreen.tsx` — `launchFeaturePage` | Captures section/search/scroll and dispatches typed push | Valid adapter; not workflow ownership |
| Stocktake Page | `src/features/stocktake/StocktakePage.tsx` | Registers owner-scoped Shell navigation; dispatches pop; mounts StocktakeModule | Correct |
| Stocktake coordinator | `src/features/stocktake/components/StocktakeModule.tsx` | Session, zones, entries, scanner lifecycle, local store, PWA blocker and exit guard | Feature-owned; preserve |
| Import Page | `src/features/stocktake-import/StocktakeImportPage.tsx` | Registers owner-scoped Shell navigation; dispatches pop; mounts StocktakeImportModule | Correct |
| Import coordinator | `src/features/stocktake-import/components/StocktakeImportModule.tsx` | Parser, validation, conflicts, dirty edits, history, persistence, export, PWA blocker and exit guard | Feature-owned; preserve |
| Persistent navigation | `src/platform/shell/shellNavigationContext.tsx` | Active owner registers navigation intent; Shell renders it outside Page subtree | Correct |
| Home return state | `journey.types.ts`, `journeyController.ts`, `ActivePageHost.tsx`, `useHomeNavigation.ts` | Journey stack carries only active section, search query and scroll position | Correct; no business data in stack |

### 2.1 Home no longer owns feature mounts

The current `HomeScreen.tsx` imports `useJourneyController`, but does not import either feature coordinator or either Page component. The Home render tree has no Stocktake/Import feature mount and no feature-specific open boolean, close callback or body-scroll-lock condition.

The only remaining feature-specific Home code is the typed launcher called from the selected Module Library item:

1. Read current Home UI state through `captureHomeUiState()`.
2. Reduce it to `HomeReturnContext`: `activeSection`, `searchQuery`, `scrollY`.
3. Close the selected library surface.
4. Dispatch `{ kind: 'push', destination: { kind: 'feature', moduleId }, homeReturnContext }`.
5. If the controller rejects navigation, restore the selected library surface.

This adapter should remain Home-owned because the launch action originates in Home's Module Library. It does not own feature state, persistence, parser behavior, scanner state or feature lifecycle.

### 2.2 Page and Shell ownership

Both Page wrappers use the same minimal pattern:

- Obtain the Journey controller.
- Implement Home return as `dispatch({ kind: 'pop' })`.
- Register their own navigation model with owner IDs `stocktake` and `stocktake-import`.
- Mount their existing feature coordinator unchanged.

The persistent Shell navigation is rendered by `AuthenticatedAppShell` outside `ActivePageHost`. The active Page supplies navigation configuration through an owner-scoped registration. The Desktop Dock therefore remains a Shell concern and must not be moved into individual Pages as part of JRN-03D.

### 2.3 Exit guard and resource lifecycle

Both feature coordinators register an owner-scoped Journey exit guard. Stocktake blocks exit while data work is busy, scanner is active, confirmation is pending, or uncommitted inputs need user consent. Import waits for active parse/save/history/export work, blocks while decisions are pending, and protects dirty edits or results not persisted to history.

The guard is registered by the active feature coordinator, not by Home. The existing PWA update blocker remains separate. Do not duplicate either mechanism in Home or Journey Page wrappers.

## 3. Residual Home responsibilities — explicitly not JRN-03D

Home still owns Settings, Scanner/Scanner Settings, manual Barcode Lookup, Calendar, Module Library, snapshot notices, notifications, toast feedback and Home presentation state. These are Home-local/global-action candidates, not remaining Stocktake/Import workflow mounts.

The roadmap already assigns Quick Search, Scanner, Settings, Calendar and Notifications extraction to **JRN-04 Global Quick Actions**. Do not opportunistically move them into Shell during JRN-03D. Module Library remains the current Home entry point for the two ready workflows.

## 4. Findings and risk assessment

| ID | Finding | Severity | Required handling |
|---|---|---|---|
| A-01 | No remaining Home mount for Stocktake or Import found in current Home source and code-search results | Pass | No deletion/refactor required |
| A-02 | Home retains a typed launcher and Home return-context capture | Intentional | Keep; verify acceptance/rejection and context restoration |
| A-03 | Page wrappers own Shell navigation registration and return via Journey pop | Pass | Preserve |
| A-04 | Shell navigation registration is a single active-owner slot | Review-required | Integrated runtime test must prove owner handoff on Home ↔ Stocktake ↔ Import and no stale navigation |
| A-05 | Journey controller holds a single active exit-guard registration | Review-required | Test guard replacement/unregistration during Page transitions; do not redesign without a failing reproduction |
| A-06 | Home's Module Library selection is the current entry route | Intentional | Test both ready modules from Home; unavailable modules must remain gated |
| A-07 | Home, Stocktake and Import unmount/remount across Journey transitions | Lifecycle-sensitive | Verify Home return context and feature state recovery from feature-owned persistence |
| A-08 | Old phase/status documents still describe JRN-03C as in progress | Documentation debt | Reconcile canonical status in a separate status-doc update after this audit is accepted |

No source-level defect was established by this static audit. A-04 and A-05 are not asserted defects; they are integration acceptance risks requiring browser/runtime evidence.

## 5. Existing contract coverage discovered

The repository contains focused source-contract scripts that already protect important boundaries:

- `scripts/test-jrn-03b-stocktake-page.mjs`
- `scripts/test-jrn-03c-stocktake-import-page.mjs`
- `scripts/test-jrn-03a-controller-page-host.mjs`
- `scripts/test-jrn-03a-controller-runtime.mjs`
- `scripts/test-ui-interaction-immediacy.mjs`
- `scripts/test-home-cache-batching.mjs`
- `scripts/test-bundle-boundaries.mjs`

These contracts assert that Home does not mount the feature coordinators, the two feature Pages exist in the registry, the typed launcher is retained, and the feature coordinators register their exit guards. Prior JRN-03B/03C acceptance records also describe browser checks for their respective workflows.

This audit did not execute the repository preflight or Playwright suite. No new runtime result is claimed here.

## 6. JRN-03D acceptance plan after audit

### JRN-03D-B — bounded ownership contract hardening

Only add or adjust tests where current coverage is insufficient:

1. Assert Home does not import or render either feature coordinator or either feature Page.
2. Assert Home launcher uses canonical `RetailModuleId` values and typed Journey push; no direct feature component import.
3. Assert failed/blocked push restores the Module Library surface without losing the captured Home search/section/scroll context.
4. Assert each Page registers a unique owner ID and returns through Journey pop.
5. Assert the persistent Shell navigation host remains outside ActivePageHost and retains its owner-scoped handoff behavior.
6. Avoid production source changes unless a reproducible failure demonstrates a real ownership defect.

### JRN-03D-C — integrated browser/runtime QA

Add or verify Playwright coverage for:

- Home → Stocktake → Home, including restored Home section/search/scroll context.
- Home → Stocktake Import → Home, including restored Home context.
- Stocktake → Import and Import → Stocktake, only through a supported Home-return/re-entry path; each exit guard must be honored.
- Shell navigation owner handoff: Home → Stocktake → Home → Import → Home; no stale Home callbacks or blank Dock.
- Dirty/active/pending state blocks or confirms exit according to each feature's guard.
- Feature state is recovered from its own persistence after leaving and re-entering; Journey stack must not become business storage.
- Desktop fixed-left Dock remains persistent; Mobile navigation remains adaptive.
- No console/page errors, failed requests or horizontal overflow at the established responsive viewports.
- Lazy Page/chunk boundaries remain intact; no unnecessary initial-bundle growth.

### JRN-03D-D — closure

Run exact-head preflight, TypeScript, production and Pages builds, bundle comparison, and the complete responsive/runtime Playwright suite. Update the canonical Roadmap, Implementation Status and AI Handoff only after the final evidence is available. Merge and Pages deployment remain separate gates. Physical-device QA is not inferred from browser emulation.

## 7. Audit conclusion

**JRN-03D-A: PASS — audit complete.**

The original Home-owned Stocktake and Stocktake Import mounts were already removed by JRN-03B and JRN-03C. Home retains only the correct Module Library launch adapter and ephemeral return-context capture. Feature coordinators and guards are feature-owned; navigation rendering is Shell-owned.

**Do not perform redundant component extraction.** The remaining value of JRN-03D is integrated lifecycle and cross-Page QA, plus narrowly targeted contract hardening where coverage is demonstrably missing. If those tests pass without source changes, close the ownership-removal portion as already satisfied and proceed to JRN-03D-D documentation/verification rather than manufacturing a refactor.

**Audited baseline:** `9e1c999bd27ab280e00cb1143b68f0865829c0f7`.  
**Evidence type:** GitHub source inspection and code-search results only; no local build, CI rerun, browser session or physical-device QA performed in this audit slice.
