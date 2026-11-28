# JRN-03D — Journey ownership and lifecycle closeout

**Status:** Core ownership/lifecycle scope complete on `main`; Page Snapshot/Restore postponed.  
**Closeout baseline:** `f8a3c511fcc9d7575b4da4b5f839d8eeee846c99`  
**Verification:** main CI #2150 (run `46145238448`) passed; Pages Build & Deploy #216 succeeded.  
**Scope:** Home/Feature Page ownership, Journey navigation lifecycle, Shell navigation handoff, scanner exit handoff, Mobile Feature shortcuts and Shell-owned Module Library.  
**Out of scope:** Page Snapshot/Restore, global Quick Actions extraction, shared System Data/realtime architecture, visual-system redesign and physical-device certification.

## 1. Delivered slices

| Slice | Delivery | Result |
|---|---|---|
| JRN-03C | PR #217 — `9e1c999bd27ab280e00cb1143b68f0865829c0f7` | Import is a guarded lazy Page; parser, history, conflict/edit and TXT/ZIP contracts remain feature-owned |
| D-A | PR #218 | Source audit confirms Home no longer mounts either feature coordinator |
| D-B | PR #219 | Preflight contracts protect typed launch, return context, Page navigation registration and Shell ownership |
| D-C | PR #220 | Integrated Playwright covers Home → Stocktake → Home → Import → Home, context restoration, feature-state recovery and Shell owner handoff |
| D1 | PR #221 — `575e5e3d58da50d2561262b715e69951c78f9712` | Stocktake scanner one-shot camera handoff and bounded presentation fallback; close still requires camera release/disposal |
| D2 | PR #222 — `8247f76a98d4977bcca7489b7e0fa344a0012ad5` | Mobile Feature Pages receive Shell-owned Home and Module Library shortcuts through JourneyController |
| D3 | PR #223 — `fa85395acfb9c949771114cb9106bd0d827623fe` | Shell-owned grouped/searchable Module Library with focus, Escape and scroll-lock lifecycle |
| UX-01 | PR #224 — `f8a3c511fcc9d7575b4da4b5f839d8eeee846c99` | Refined Mobile Library grouping, workspace, safe areas and module-row legibility without changing registry/Journey contracts |

## 2. Final ownership model

- **App:** authentication, employee session and authenticated handoff.
- **Authenticated Shell:** persistent application chrome, active Shell navigation rendering, Feature shortcuts and Module Library.
- **JourneyController:** typed destination stack, push/pop/replace and active Page Exit Guard coordination.
- **ActivePageHost:** resolves the lazy Page registry and mounts only the active Page.
- **Home:** owns Home workspace and typed launch adapter. Captures only ephemeral `HomeReturnContext` (section, search query, scroll position); does not mount Feature Pages or own their business state.
- **Stocktake / Stocktake Import Pages:** register owner-scoped Shell navigation, return via Journey `pop`, and mount existing feature coordinators.
- **Feature coordinators:** retain domain state, local/IndexedDB persistence, scanner/resource lifecycle, PWA blockers and feature-specific Exit Guards.
- **Module registry:** remains the single source of truth for module identity, readiness and Library metadata.

Inactive Pages unmount. Journey stack is navigation context, not business persistence. Feature state recovers through each feature's persistence contract.

## 3. Safety boundaries

Preserve auth/session, stable `RetailModuleId`, module readiness, Home return context limited to section/search/scroll, Stocktake/Import persistence and output, camera lease/session close-release-disposal, owner-scoped Shell navigation and Exit Guard cleanup, separate PWA update blockers, lazy Page boundaries and Pages deployment configuration.

No generic Page snapshot store, keep-alive cache, global feature-state container or cross-Page business-data store was added.

## 4. Deferred decisions

### D4 — Page Snapshot/Restore

**Postponed by owner. Not implemented.**

Before reconsideration, establish source of truth, freshness/version signals, invalidation, reconciliation when upstream data changes while a Page is inactive, reload/recalculation versus UI-state restoration, offline/delayed/sync-failure behavior, and test fixtures that prove the result. Do not add Page snapshot persistence, keep-alive or generic restoration infrastructure before this work and explicit approval.

### D5 — Overlay visual consistency

Not included in this ownership/lifecycle closeout. Track separately only if a concrete inconsistency remains after reviewing the current implementation.

## 5. Evidence and limitations

PR #217 merged Import Page extraction; #218 source audit; #219 ownership contracts; #220 integrated browser QA; #221–223 scanner handoff, Mobile shortcuts and Shell Module Library; #224 UX-01 refinement. Main CI #2150 passed on the closeout baseline and Pages Build & Deploy #216 succeeded. Browser/CI evidence does not certify physical iOS/iPadOS/Android acceptance; PW-01 remains separate.

## 6. Closure

**JRN-03D core ownership/lifecycle objective: CLOSED.**

No further Home mount-removal refactor is required. Home's typed launcher is intentional; feature coordinators remain feature-owned; Shell navigation and Module Library are Shell-owned; integrated browser coverage is merged.

Future work must be separately scoped: D4 data/state lifecycle audit before any Page Snapshot/Restore proposal; D5 UX review only if a concrete issue exists; JRN-04 Global Quick Actions and broader architecture remain separate.
