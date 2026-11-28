# RetailOS Experience System Specification

**Status:** Proposed architecture and interaction contract; owner review required before runtime migration or visual-system lock-in.  
**Source baseline audited:** main at dc952b3204d7d7eaf53b82f805218e56f7ea2562 (2026-11-28).  
**Scope:** application journeys, destination/page ownership, component boundaries, icon semantics, motion, feedback, lifecycle and future feature onboarding.

This is the experience-system umbrella. It does not replace business-domain contracts, platform capability policy, PWA release policy or feature-specific workflows.

## 1. Executive direction

RetailOS should have one coherent experience system, not one giant screen and not separate applications for every feature.

- One application identity, authentication/session lifecycle and shared domain/data contracts.
- One Journey/navigation contract with stable destination identity.
- Home remains a first-class destination and retains quick/local interactions.
- Operational workflows with independent state, persistence, substantial work surfaces or resource lifecycles are dedicated Feature Pages.
- Overlays remain overlays when the task is brief and context-preserving.
- Desktop and Mobile may compose different shells/presentations while sharing destination identity, domain operations and results. Tablet remains review-required under the platform matrix.
- Shared components are promoted only after real consumers prove equivalent semantics. Feature-owned composition remains valid.
- Motion, icons and feedback communicate state and intent; they are not decoration applied indiscriminately.
- No new backend, database, routing dependency or speculative module is implied by this workstream.

## 2. Source baseline and audit findings

### 2.1 Confirmed current journey

    App
    ├── no session -> LoginExperience
    └── valid session -> AuthenticatedAppShell
        ├── IdentityJourneyView
        └── HomeScreen
            ├── Home / Module Library / Activity
            ├── Settings Hub / Scanner Preferences
            ├── quick Scanner / Quick Search / Lookup Result
            ├── Calendar / Notifications / Notice detail
            ├── Module Library sheet
            ├── StocktakeModule (currently rendered inside HomeScreen)
            └── StocktakeImportModule (currently rendered inside HomeScreen)

Confirmed source ownership:
- App.tsx owns employee session, authentication handoff, login/identity/home, logout, boot-health and app-transition PWA blocker.
- AuthenticatedAppShell.tsx composes the authenticated scene, Identity and lazy Home. It is not yet a full destination/page controller.
- HomeScreen.tsx owns Home navigation and many independent overlay/feature states.
- Stocktake and Stocktake Import are lazy-loaded, but are still rendered as children of HomeScreen and opened/closed by Home-owned booleans.
- Settings, Scanner, quick lookup, calendar and notices are also lazy or conditional Home-owned surfaces. Their context-preserving ownership is appropriate.
- Home navigation currently represents sections plus a Settings action; it is not a general feature-page router.
- Existing Home state persistence includes active section, search and scroll position. Feature state must not be assumed to survive unmount unless its own store guarantees it.

### 2.2 Current shared foundations

- Platform-specific Home presentation roots and Desktop/Mobile/Tablet navigation renderers exist.
- A shared motion provider exposes reduced-motion preference; motion tokens/presets and wrappers exist.
- Icon sizes/stroke presets, generic Icon/MotionIcon and semantic department/Home module/library/navigation registries exist.
- Shared PWA update-safety blockers, camera lease/session and body-scroll-lock services already protect important lifecycle boundaries.
- Stocktake and Stocktake Import have separate feature coordinators and presentation components. Their business operations must remain feature-owned.

### 2.3 Confirmed architecture gaps

1. There is no general authenticated destination model for Home and dedicated feature pages.
2. HomeScreen owns unrelated state domains and mounts the two ready operational modules inside its component tree.
3. Motion has shared tokens and wrappers, but local CSS transitions and per-feature animation rules remain; wrappers do not prove centralized transition policy.
4. Icon semantics are mapped in registries, but direct Lucide imports and multiple render paths still coexist.
5. There is no canonical screen-by-screen Journey catalog defining entry, exit, return, state restoration, loading/error and resource cleanup.
6. Existing component governance is sound, but the experience-level contract tying journey, component, icon, motion and feedback together is not explicit.

These are architecture findings, not evidence that the current two ready workflows are unusable. The owner-confirmed product scope is that Stocktake and Stocktake Import are the two operationally ready modules; other registry items may remain placeholders and must not be treated as committed feature roadmaps.

## 3. Target application architecture

### 3.1 Ownership layers

    Application Root (App)
    ├── Authentication + Employee Session
    ├── Application Lifecycle (PWA, connectivity, install state)
    └── Authenticated Experience
        ├── Journey Controller
        │   ├── current destination identity
        │   ├── navigation history / return target
        │   ├── transition intent and direction
        │   └── safe handoff coordination
        ├── Platform Shell (Desktop / Mobile / Tablet fallback)
        │   ├── global navigation chrome
        │   ├── page host
        │   └── global feedback host
        ├── Home Page
        │   ├── quick actions and Home sections
        │   └── Home-owned overlay host
        └── Feature Page Host (lazy; active destination only)
            ├── Stocktake Page
            └── Stocktake Import Page

### 3.2 Shared versus separate

| Concern | Shared or separate? | Contract |
|---|---|---|
| App identity, auth/session, employee context | Shared | One source of truth in App/auth services |
| Destination IDs and navigation semantics | Shared | Stable typed IDs; no duplicate route registry |
| Journey controller | Shared policy/state | Platform shells consume the same navigation contract |
| Desktop/Mobile shell composition | Separate presentation | Different layouts; no duplicated business logic |
| Home content and Home-specific actions | Home-owned | Keep local quick actions and Home overlays here |
| Stocktake workflow | Separate Feature Page | Owns workflow state, persistence orchestration and resource lifecycle |
| Stocktake Import workflow | Separate Feature Page | Owns import/edit/history/export state and lifecycle |
| Domain operations, persistence contracts, data models | Shared where genuinely common | Platform-neutral; feature/domain-owned |
| Feature presentation | Separate by feature | Platform variants only when justified |
| Generic primitives | Shared only after proven reuse | Follow component governance |
| Feature-specific icon maps | Feature/domain-owned | Departments shared; Home module IDs remain Home-owned |
| Motion tokens and transition semantics | Shared policy | Screens choose approved semantic intents |
| Screen composition and local animation | Feature-owned where semantics differ | Must conform to shared motion/accessibility contract |
| Toast/announcements primitives | Shared infrastructure | Feature owns message content and timing |
| Backend/database integrations | Out of scope | Preserve current offline/local workflows |

### 3.3 Navigation mechanism

Do not introduce a router dependency by default. First define and test a small typed destination contract and a single Journey Controller. It may begin as state-driven navigation because the current scope is small. Browser Back/Forward, deep-link requirements, refresh restoration and PWA launch behavior must be tested before choosing URL/history integration or a routing library.

Never create a second route registry that duplicates the stable module/workflow IDs. A destination may reference a workflow ID, but registry metadata must not silently redefine product readiness or platform capability.

### 3.4 Page lifecycle rules

- Only the active Feature Page is mounted by default.
- Lazy-load feature code on entry; show a meaningful loading surface with destination title and accessible busy state.
- On exit, release camera streams/leases, workers, event listeners, subscriptions, timers and object URLs owned by the page.
- Persist business data through the existing feature store; do not rely on React component memory for durable work.
- If a workflow has unsaved/critical work, navigation must offer a safe decision or be blocked with a clear reason. Never silently discard.
- Restore Home scroll/search/section context when returning.
- Restore a feature's last view only if its own persistence contract explicitly supports it.
- Do not keep a hidden heavy feature mounted just to animate it.
- Transition completion must not be the sole trigger for saving data or releasing critical resources; cleanup must remain deterministic on unmount/error/logout.

## 4. Journey catalog

### 4.1 Application-level journeys

| Journey | Entry | Main transition intent | Exit / next step | Required behavior |
|---|---|---|---|---|
| Cold boot, no session | App start | Login reveal | Login ready | No false authenticated flash |
| Session restore | App start with valid session | Home settle; Identity may be skipped | Home ready | Restore without replaying fake login |
| Login success | Valid login accepted | Login to Identity | Recognition | Persist once; prevent duplicate submit |
| Identity recognition | Authenticated identity | Short reveal/hold | Identity to Home | Correct employee/department; bounded hold; reduced-motion bypass |
| Home arrival | Identity completes | Home settle | Home interactive | Boot healthy only when primary surface is ready |
| Home to Feature Page | Select ready module | Directional forward | Feature ready | Save Home context; lazy-load; loading/error states |
| Feature to Home | Back/close | Directional reverse | Home restored | Restore return target and scroll/search context |
| Feature to Feature | Explicit navigation | Directional | New feature | Safe exit previous feature; no hidden resources |
| Logout | User invokes logout | Exit to Login | Session cleared | Release camera; clear session/cache per existing policy |
| Update handoff | Explicit approval at safe point | Controlled handoff | New build | Existing PWA consent/blocker/rollback remains authoritative |

### 4.2 Home-owned quick journeys

| Action | Presentation | Return behavior |
|---|---|---|
| Quick Search | Compact overlay or anchored search surface | Close returns to same Home state |
| Quick Scanner | Mobile camera surface | Close releases camera and returns to same Home state |
| Settings | Sheet/dialog or overlay | Close returns to Home; preserve focus |
| Scanner Preferences | Nested Settings surface | Back returns to Settings, not Home |
| Calendar | Lightweight dialog/sheet | Close returns to Home and restores trigger focus |
| Notifications / Notice detail | Popover/list to detail overlay | Back returns to notification list when appropriate |
| Module Library | Home-owned catalog surface | Selecting a ready module navigates to Feature Page; placeholder gets honest unavailable/integration feedback |

### 4.3 Feature Page contract

Each operational page exposes:
- Stable workflow identity and page title.
- Predictable Back action and optional contextual breadcrumb on Desktop.
- Page-level status/feedback area.
- Feature-owned content region and action region.
- Loading, empty, error, offline/limited-data and success states as relevant.
- Safe-exit contract for dirty or active work.
- Explicit ownership of persistence and resource cleanup.
- Platform presentation adaptation without changing business semantics.

## 5. Component architecture

### 5.1 Shared foundation candidates

These are semantic responsibilities, not a mandate to create every component immediately.

| Component / pattern | Responsibility | Ownership rule |
|---|---|---|
| AppRoot / AuthBoundary | Auth/session and application lifecycle | App/platform root |
| JourneyController | Destination, history, transition intent and return target | Shared platform-level controller |
| PlatformShell | Navigation chrome, safe areas, page frame | Desktop/Mobile composition separate |
| PageHost | Lazy active destination and error/loading boundary | Authenticated shell |
| FeaturePageFrame | Title, Back, status and content/action slots | Shared only if real feature pages share semantics |
| OverlayHost | Home-owned overlays, focus and scroll-lock coordination | Home-owned; no second scroll-lock manager |
| Button / IconButton | Action semantics, focus, disabled/busy state | Shared after contract tests |
| Icon | Consistent rendering, size and accessibility | Shared primitive |
| Status / Feedback | Inline status, toast, alert, progress and announcements | Shared primitives; feature owns messages |
| Surface / Panel | Visual surface without workflow semantics | Shared primitive |
| Dialog / Sheet | Focus, Escape, backdrop, scroll lock and focus restore | Shared only if lifecycle matches |

### 5.2 Feature-owned components

- Stocktake owns workspace, zone controls, review/history/export views, scanner overlay and operational confirmation dialogs.
- Stocktake Import owns file intake, parsing/review, conflict resolution, editable rows, output preview, history and export actions.
- Home owns Module Library, Home sections, quick lookup and quick scanner entry.
- Do not split components only to reduce file length. Extract when it creates a stable responsibility, measurable performance boundary or testable contract.

### 5.3 Reuse and promotion

Follow the existing lifecycle: LOCAL → CANDIDATE → SHARED → DEPRECATED → RETIRED.

A component becomes SHARED only after at least two real consumers demonstrate equivalent semantics, state ownership, accessibility, async behavior and lifecycle. Matching visual shape is not sufficient.

## 6. Icon system

### 6.1 Semantic ownership

- Shared icon package owns generic icon rendering, sizes, stroke defaults and department icon semantics.
- Feature/domain registry owns mapping from stable business IDs to icon glyphs.
- Home owns Home navigation, library and module icon mappings.
- A new feature owns its internal action/status icon mapping unless another real consumer establishes a shared semantic contract.
- Never use an icon glyph as the only source of meaning. Important actions require visible text or an accessible label.

### 6.2 Default and state contract

| State | Default behavior | Motion rule |
|---|---|---|
| Idle | Static icon | No continuous animation |
| Hover | Small affordance on hover-capable devices | Optional subtle lift/scale |
| Pressed | Immediate tactile response | Brief scale-down; no delayed action |
| Active/selected | Clear selected treatment | Small settle/scale; persist while selected, no loop |
| Loading | Pair with real pending state | Spinner/progress only while pending |
| Success | Pair with explicit success text/status | One short confirmation pulse |
| Error | Pair with actionable error text | Avoid aggressive repeated shake |
| Disabled | Reduced emphasis and disabled semantics | No hover/press animation |
| New notification | Badge/count and accessible announcement | Optional one-shot bell cue, never continuous |

### 6.3 Icon usage rules

- Static icon is the default. Motion is opt-in and tied to a state transition.
- Use consistent semantic mapping: Home, navigation, module, scanner, search, notification, security, status and action.
- Keep size presets and stroke width centrally defined; choose size by component role.
- Icon-only controls require an accessible name, visible tooltip where appropriate and adequate hit target.
- Do not animate every icon whenever a page enters. Avoid staggered icon choreography that competes with operational data.
- Decorative icons are hidden from assistive technology; meaningful icons need a label or accompanying text.
- Consolidate direct Lucide imports only through an incremental audit; no risky global rewrite.

## 7. Motion and animation system

### 7.1 One shared motion contract, not one animation for everything

The shared motion layer owns:
- Reduced-motion preference and runtime changes.
- Semantic motion intents and approved timing/easing/distance tokens.
- Route direction conventions (forward/back).
- Shared press/active/loading/success/error semantics.
- Overlay enter/exit lifecycle contract.
- Performance and accessibility constraints.

Each screen and feature owns:
- Which semantic transition applies to an interaction.
- Local choreography only when it communicates the workflow.
- Feature-specific state changes that cannot be generalized.

Existing motion wrappers and local CSS must be inventoried before consolidation. Do not add a second animation library or replace CSS without bundle/runtime evidence.

### 7.2 Journey motion matrix

| Transition | Proposed intent | Visual behavior | Constraints |
|---|---|---|---|
| Login first reveal | Reveal | Fade + slight vertical settle | No large parallax; reduced-motion respected |
| Login to Identity | Recognition | Fade/scale or origin reveal from submit point | Identity readable; no false success |
| Identity to Home | Arrival | Backdrop reveal + Home settle | Bounded hold; do not delay usable Home |
| Home to Feature | Forward | New page enters from right with fade | Transform/opacity; do not animate data tables |
| Feature to Home | Backward | Return direction from left with fade | Restore Home context |
| Feature to Feature | Directional navigation | Forward/back based on intent | Safe exit and cleanup first |
| Home to Settings/Quick Search | Overlay | Sheet/dialog/popover suited to task | Focus, Escape and scroll-lock contract |
| Home to Quick Scanner | Camera surface | Fast reveal with clear close affordance | Camera acquisition tied to user gesture; release on exit |
| Toast | Feedback | Short fade/slide | Non-blocking; live region |
| Loading to Success/Error | State feedback | Small progress-to-result transition | Never mask slow work or misreport completion |
| Logout | Exit | Reverse transition to Login | Clear session and release resources deterministically |

This table defines semantic direction, not final visual art direction. Per-experience prototypes and owner approval are required before locking exact easing, duration, distance or visual treatment.

### 7.3 Timing and performance policy

Current code has tokens at 140ms, 200ms, 360ms and 420ms, plus a 1350ms identity hold and 1100ms Home-arrival window. These are existing implementation values, not a validated universal standard.

- Micro feedback should feel immediate; never delay action execution for animation.
- Route transitions should be short enough for operational flow; prototype and measure rather than copying 420ms everywhere.
- Prefer transform and opacity; avoid animating layout dimensions, large shadows, blur or full-screen filters on low-end devices.
- Limit stagger to small meaningful groups; no page-wide cascade on every navigation.
- Avoid competing transitions (page + every card + every icon + background).
- Reduced motion removes spatial travel and nonessential animation while preserving state clarity and focus.
- Animation must not hold camera, worker, file processing or business state hostage.
- Use will-change sparingly and only during active transition.

### 7.4 Motion state vocabulary

Use semantic states consistently: idle, hover, pressed, active, loading, success, error, disabled. Use phases such as press, activate, travel, reveal, hold, settle and exit only where needed. Do not invent feature-specific states that duplicate these without a documented reason.

## 8. Feedback and interaction response system

### 8.1 Feedback hierarchy

| Situation | Correct feedback surface | Persistence |
|---|---|---|
| Field validation | Inline message adjacent to field | Until corrected/dismissed |
| Form validation | Form summary + focus first invalid field | Until corrected |
| Short successful action | Toast or inline confirmation | Brief; non-blocking |
| Long-running operation | Progress/status with stage and cancellation when safe | Until complete/cancelled |
| Recoverable failure | Inline error with retry/next action | Until resolved/dismissed |
| Critical/unsafe condition | Persistent alert/dialog with explicit decision | Until acknowledged/resolved |
| No records/data | Empty state explaining absence and next step | Stable |
| Offline/partial snapshot | Contextual status distinguishing unavailable from empty | While condition applies |
| Disabled capability | Explain why unavailable if not self-evident | Stable |
| Navigation/loading | Page-level busy state and destination title | Until ready |

### 8.2 Interaction response sequence

For every interactive control define: input affordance (pointer/touch/keyboard), immediate pressed/focus response, state transition (pending/active/selected), result feedback (success/empty/error/blocked), recovery path (retry/undo/close/return/edit), accessibility announcement and focus destination.

The action runs immediately; animation is feedback, not a gate. Never show success before the underlying operation succeeds.

### 8.3 Accessibility and input parity

- Keyboard focus remains visible and logically ordered.
- Dialog/sheet manages focus entry, Escape where appropriate, focus restoration and body scroll lock.
- Touch targets are practical on mobile; hover is never the only discoverability mechanism.
- Live regions announce asynchronous results, not every transient frame.
- Color, icon motion and animation are never the only status signal.
- Respect OS reduced-motion preferences and runtime preference changes.

## 9. Screen-by-screen specification template

Every new or materially changed screen documents:

| Field | Required definition |
|---|---|
| Screen/destination ID | Stable identity; never label-based routing |
| Purpose / primary task | What the user accomplishes |
| Entry points | Journey, control or external launch |
| Exit paths | Back, close, success, cancel, logout |
| State ownership | Local, shared session, persisted business state |
| Component composition | Shell, page frame, feature-owned components |
| Icon map | Semantic IDs and accessible names |
| Motion map | Entry, exit, local state and reduced-motion fallback |
| Feedback map | Loading, empty, success, warning, error, offline |
| Resource lifecycle | Camera, worker, listeners, timers, subscriptions, object URLs |
| Persistence/restore | What survives navigation, reload and app update |
| Platform variants | Desktop/Mobile/Tablet policy and rationale |
| Performance budget | Initial chunk, active DOM, long tasks and target-device evidence |
| Tests | Contract, browser interaction, regression and physical acceptance where required |

Do not create detailed specifications for placeholder modules until a real workflow is approved. Record only stable identity and placeholder behavior.

## 10. Future feature onboarding

1. Define the business workflow and stable ID; do not infer it from a data snapshot ID.
2. Decide whether it is a Home quick action, Home overlay or independent Feature Page using task duration, state, persistence, navigation and resource lifecycle.
3. Define platform capability separately from engineering readiness, data availability, permission and runtime support.
4. Define destination and return contract.
5. Define feature-owned components and promote only proven shared primitives.
6. Define semantic icon mapping and accessible labels.
7. Select motion intents from the shared contract; document exceptions.
8. Define loading/empty/error/offline/success feedback and safe-exit behavior.
9. Define persistence, PWA update blockers and resource cleanup.
10. Add tests and update canonical docs/status before implementation is complete.

## 11. Roadmap and completion criteria

| Workstream | Scope | Exit criteria | Status at audit |
|---|---|---|---|
| JRN-00 | Source audit of journeys, screens, owners, motion, icons and lifecycle | Evidence-backed baseline and risks recorded | Complete — static source audit |
| JRN-01 | Journey contract and destination identity | Approved journey map, navigation semantics, return/history policy and state lifecycle | Proposed |
| JRN-02 | Dedicated Feature Page host | Stocktake and Stocktake Import open as independent lazy pages; Home no longer mounts them | Proposed |
| JRN-03 | Back/restore/safe exit | Home context restored; dirty work protected; no resource leaks | Proposed |
| JRN-04 | Home quick-action and overlay boundary | Settings, Quick Search, Scanner and lightweight interactions remain Home-owned | Proposed |
| JRN-05 | Motion and feedback contract | Shared semantic intents; per-screen motion/feedback map; reduced-motion parity | Proposed |
| JRN-06 | Icon contract and registry audit | Semantic ownership, accessibility and state animation usage documented | Proposed |
| JRN-07 | Cross-platform and performance QA | Desktop/Mobile journeys validated; Tablet policy respected; low-end evidence where relevant | Proposed |
| DOC-01 | Canonical documentation reconciliation | Roadmap, architecture decisions, component governance, platform matrix and handoff link here without duplicate authority | Proposed |

Mandatory completion gates:
- All journeys have explicit entry, exit, return and failure behavior.
- Home is not the lifecycle owner of operational Feature Pages.
- Only the active Feature Page is mounted unless a documented exception exists.
- Business data, drafts, history and offline behavior remain intact.
- Camera/worker/listener/timer/subscription cleanup is verified.
- PWA update safety remains correct during navigation and active work.
- Desktop and Mobile have coherent presentation; Tablet remains gated by policy.
- Icons and motion communicate state; no animation-only meaning or continuous decorative motion.
- Reduced-motion, keyboard, focus, screen reader and touch behavior pass.
- Tests prove behavior; source-string assertions alone are insufficient for navigation lifecycle.
- Exact-head CI and browser evidence are recorded; physical device acceptance is a separate gate.
- Merge, deploy and production Gmail transfer remain separate explicit approvals.

## 12. Documentation authority and placement

Keep documents in docs/ai-context/ in the same repository as the code they govern. Use one canonical umbrella with linked specialist documents; do not copy the same rule into multiple files.

| Document | Authority |
|---|---|
| EXPERIENCE_SYSTEM_SPEC.md | Canonical experience architecture, Journey catalog, screen/component/icon/motion/feedback contracts and onboarding rules |
| ARCHITECTURE.md | Durable architecture decisions (ADRs); record only owner-approved decisions |
| ROADMAP.md | Workstream order, status, dependencies and completion gates; no duplicate detailed specification |
| COMPONENT_AND_PATTERN_GOVERNANCE.md | Component ownership, reuse/promotion and shared API governance |
| UI_UX_COMPONENT_AUDIT.md | Historical/source-backed inventory and audit evidence; update when new audit changes facts |
| PLATFORM_CAPABILITY_MATRIX.md | Desktop/Tablet/Mobile workflow capability policy |
| PWA_RUNTIME_RELEASE.md | Release staging, consent, blockers, activation, rollback and boot health |
| Feature-specific technical documents | Business rules, persistence, import/export, scanner and feature-local contracts |

Authority rule: this specification does not override an ADR, product owner decision, platform capability matrix, PWA release contract or feature data contract. If conflict appears, stop and reconcile canonical authority before coding. Historical M0/A-series documents remain historical evidence unless explicitly promoted.

## 13. Non-goals and protected boundaries

This workstream does not activate placeholder modules, select/migrate backend or database, move the app to production/shared Gmail, rewrite separate Desktop/Mobile apps, add a router or animation dependency without evidence, reopen scanner stabilization without a reproducible defect, change Stocktake/Import business rules or persistence, perform a broad CSS rewrite, or claim physical-device acceptance from source inspection.

## 14. Audit limitations

This is a remote static source/document/test-contract review at the baseline SHA above. It did not run a local production build, Playwright, real browser profiling or physical iOS/Android devices. Motion smoothness, frame pacing, camera teardown under navigation and low-end performance remain implementation QA gates, not established facts.
