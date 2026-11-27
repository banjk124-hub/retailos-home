# AUDIT-02 — Shared vs Feature-owned Contracts

**Status:** Ownership audit completed; implementation decisions recorded  
**Audited application baseline:** `main` at `e58bce634b9ff67e95250d36c8653593680463e9`  
**Audit lineage:** AUDIT-01 commit `a3778f70407457168b90bbb59f3d4bbd0508396a`  
**Branch:** `audit/audit-02-ownership-contracts`  
**Scope:** Type ownership, feature dependency direction, shared contracts, integration seams and promotion rules.

## 1. Executive decision

The repository already has useful feature boundaries, but several cross-feature contracts are owned by the wrong layer. The main correction is **not** to move every shared-looking type into `src/shared`. The correction is to assign each contract to the layer that owns its meaning and lifecycle, then expose a narrow public contract to its consumers.

AUDIT-02 establishes these rules:

1. Shared foundation may depend on platform libraries and neutral application/domain contracts. It must not import implementation types from a feature.
2. A feature owns its workflow IDs, feature state, persistence schema, business rules, UI composition and feature-specific icon mapping.
3. A feature may consume another feature only through an explicit public integration contract. It must not reach into the other feature's private components, hooks or storage.
4. The application composition layer (currently `App.tsx` and the Home shell boundary) may connect features, but should pass explicit data/callback contracts rather than make one feature the owner of another feature's internal state.
5. A type belongs in a neutral contract layer only when at least two independent owners consume the same meaning and its lifecycle is not owned by one feature.
6. Do not create a generic service, registry, event bus or component framework solely to remove imports. Require multiple real consumers and a stable semantic contract.

This audit does not change runtime behavior, storage, business rules, scanner lifecycle, PWA update safety or UI design direction.

## 2. Ownership model

| Layer | Owns | May depend on | Must not own |
|---|---|---|---|
| `platform/*` | Browser/device execution mechanics, hardware/session primitives | Platform-neutral contracts and low-level shared utilities | Feature UI, navigation, business workflow decisions |
| `shared/domain/*` / neutral contracts | Stable concepts shared by multiple owners (e.g. department identity, authenticated employee identity) | Primitive types | Auth workflow, Home module registry, feature persistence |
| `shared/components/*`, `shared/icons/*`, `shared/motion/*`, `shared/navigation/*` | Reusable presentation/interaction primitives with stable semantics | Neutral contracts and platform UI libraries | Feature IDs, feature workflow rules, feature storage |
| `features/<name>/*` | Feature workflow, state, persistence, presentation, local policies | Shared contracts, platform services, public integration contracts | Other feature private implementation |
| App composition / shell | Authentication journey, app-level wiring, cross-feature launch/exit coordination | Feature public APIs and shared services | Feature-specific business rules and feature storage internals |

### Dependency direction

```
App composition
  ├── Auth public contract
  ├── Home public contract
  ├── Scanner public contract
  ├── Stocktake public contract
  └── Stocktake Import public contract

Features ───────> Shared contracts / Shared primitives / Platform services
Platform ───────> Platform-neutral contracts / low-level shared utilities
Shared ─────────> Neutral contracts / UI platform libraries

Forbidden: Shared ─X─> Feature implementation
Forbidden: Feature A ─X─> Feature B private files
```

The diagram describes allowed dependency direction, not a requirement to create an index/barrel for every folder.

## 3. Verified ownership violations and coupling

### O2-01 — Department identity type is owned by Auth but consumed outside Auth

Current source:
- `src/features/auth/types.ts` declares `DepartmentId`.
- `src/shared/config/departments.ts` imports `DepartmentId` from Auth.
- `src/shared/icons/icon.registry.ts` also imports `DepartmentId` from Auth.
- Auth employee directory/session and authentication consume it; App, Login, Home and Stocktake flows also carry/use employee department identity.

**Assessment: confirmed dependency inversion.** Department identity is an organizational/business domain concept, not an Auth implementation detail.

**Decision:** Move the canonical `DepartmentId` definition to a neutral domain contract (proposed `src/shared/domain/department.ts` or equivalent domain-contract folder). Auth should import it; shared department configuration and icon semantics should also import it. Keep the literal IDs unchanged: `fmcg`, `fresh`, `softline`, `homeline`, `warehouse`.

**Guardrails:** no change to employee directory records, session JSON shape, storage key `retailos.session.v2`, department labels, authorization semantics or persisted values.

### O2-02 — EmployeeSession is an Auth-owned type used as an application-wide feature contract

Current source:
- `src/features/auth/types.ts` declares `EmployeeSession`.
- App, Home, Stocktake and Stocktake Import consume it.
- Auth owns its creation and session persistence, but several non-Auth features require the authenticated employee identity to attribute actions and exports.

**Assessment: ownership is split.** Auth is the producer and lifecycle owner; the employee identity payload is a cross-feature application contract.

**Decision:** Introduce a neutral, minimal authenticated employee context contract (proposed `src/shared/domain/employee.ts` or `src/shared/contracts/employee.ts`) containing only fields required across features. Auth maps/authenticates into this contract and remains the sole owner of authentication, credential validation and session lifecycle.

**Guardrails:** preserve exact fields and meaning used today: `name`, `employeeCode`, `department`, `departmentId`, `signedInAt`. Do not change login validation, session restoration or persistence serialization. Do not move credential-specific types unless a second consumer is demonstrated.

### O2-03 — Shared icon registry imports feature-owned Home IDs

Current source:
- `src/features/home/moduleRegistry.ts` owns `RetailModuleId` and `ModuleLibraryId`.
- `src/shared/icons/icon.registry.ts` imports both types and declares Home workflow/library icon maps.
- Home consumes `getModuleIcon` and `getLibraryIcon` from shared.

**Assessment: confirmed ownership inversion.** Module and library IDs describe Home's feature navigation/workflows. The icon association is part of the Home feature's presentation, not a generic shared icon primitive.

**Decision:** Move the semantic maps for `RetailModuleId` and `ModuleLibraryId` into a Home-owned module presentation/registry file (or alongside the existing Home registry if that remains the simplest owner). Keep `RetailIcon`, `Icon` and `MotionIcon` generic in shared. Home should resolve its semantic ID to an icon component and pass that component to the shared icon primitive.

**Guardrails:** preserve all current icon mappings, fallback behavior, stable IDs and `ModuleDataId` separation. Do not move Home module definitions or workflow status into shared. Keep Home navigation keys separate from module/library IDs.

### O2-04 — Department icon semantics are cross-feature, but implementation is in a mixed registry

Current source:
- `getDepartmentIcon` is used by App, LoginForm and Home.
- Department IDs/configuration are neutral app/domain concepts.
- The same `icon.registry.ts` also contains Home module/library maps.

**Assessment: mixed ownership, not a reason to move all icons.**

**Decision:** Keep a shared department icon mapping only if it remains keyed by the neutral `DepartmentId` contract and is used across Login/App/Home. Separate it from Home-owned module/library mappings. Shared icon rendering remains generic.

### O2-05 — Home consumes private paths from Scanner and Notifications

Current source:
- Home imports scanner implementation services such as scanner audio and capability helpers directly from `features/scanner/services/*`.
- Home imports push setup functions from `features/notifications/pushNotifications`.
- Home itself owns launch state and camera lease handoff, while scanner engine/session mechanics remain in Scanner/Platform.

**Assessment: integration coupling is present; not every cross-feature call is inherently wrong.** Home is currently a composition/orchestration surface, so wiring user gestures to feature entry points is expected. The risk is that Home imports private implementation paths and becomes dependent on internal service details.

**Decision:** For future edits, expose only the minimal public integration operations needed by the shell (e.g. scanner gesture preparation/audio unlock, notification setup/status). Do not create a broad service facade now. First list actual external consumers and decide whether a stable public API is warranted.

**Guardrails:** preserve user-gesture timing for audio/camera permissions, camera lease ownership, scanner lifecycle and push subscription behavior. Never move camera acquisition into Home.

### O2-06 — Home snapshot notice rules depend on Data feature service types

Current source:
- `src/features/home/snapshotNoticeRules.ts` imports `CachedModuleSnapshot` and `ModuleDataId` from `src/features/data/moduleDataService.ts`.
- Home derives notices from cached data; Data owns manifest parsing, synchronization, IndexedDB cache and snapshot lifecycle.

**Assessment: contract leakage between Home presentation/business notice rules and Data storage/sync implementation.** The dependency is type-only in the observed source, but the imported types are declared in a service implementation file.

**Decision:** Extract only the shared snapshot identity/read-model contract needed by Home into a neutral data contract module (e.g. `src/shared/contracts/moduleSnapshot.ts` or a dedicated data-domain contract). Keep IndexedDB, sync, manifest transport and cache operations inside `features/data`. Keep `ModuleDataId` distinct from `RetailModuleId`.

**Guardrails:** preserve the exact set of current snapshot IDs and persisted/cache record shape. Do not add `stocktake-import` to snapshot IDs.

## 4. Contracts that are correctly feature-owned and must stay there

| Contract / data | Current owner | Decision |
|---|---|---|
| `RetailModuleId`, `ModuleLibraryId`, `RetailModule`, `ModuleLibraryDefinition` | Home | Keep Home-owned |
| `ModuleDataId`, manifest parsing, snapshot sync/cache | Data | Keep Data-owned; extract only a neutral read-model type if required |
| Stocktake session/zone/entry/export types | Stocktake | Keep Stocktake-owned |
| Stocktake Import result/review/history types | Stocktake Import | Keep Import-owned |
| Scanner session/camera/decoder/lifecycle contracts | Platform Scanner | Keep platform-owned; do not relocate into shared UI |
| Login credentials and authentication result | Auth | Keep Auth-owned |
| Shell navigation item/callback contract | Shared Navigation | Keep generic and presentation-neutral |
| `RetailIcon`, Icon size/stroke contract | Shared Icons | Keep generic |

## 5. Public integration contracts — minimum viable rule

A feature's public API should contain only what an external owner must know:

- Stable feature entry/exit contract (component or explicit launcher interface).
- Required input data (neutral employee context, initial intent if any).
- Completion/cancel callbacks.
- Narrow external actions that are intentionally part of integration (e.g. open scanner from a user gesture).

It must not expose:
- Internal React state or hooks.
- IndexedDB stores/schema or cache internals.
- Scanner decoder/session internals to UI consumers.
- Feature stylesheet selectors as a cross-feature API.
- Internal helper functions merely because another feature currently imports them.

Do not add `index.ts` files everywhere. A barrel is useful only when it defines a real supported public surface and prevents private imports.

## 6. Recommended implementation sequence

1. **AUDIT-02A — Neutral identity contracts:** move `DepartmentId` and the minimal employee context contract without changing values or session serialization; update all imports and add dependency-direction tests.
2. **AUDIT-02B — Icon ownership:** move Home module/library icon maps into Home; leave generic Icon/MotionIcon and cross-feature department mapping in shared.
3. **AUDIT-02C — Snapshot read-model contract:** extract only types consumed by Home from Data service implementation; preserve all cache and Apps Script contracts.
4. **AUDIT-02D — Feature integration surfaces:** audit Home's external Scanner/Notifications imports and create public integration APIs only where a real stable contract is justified.
5. Re-run TypeScript, preflight, relevant source contract tests, all application CI and runtime smoke tests.

These are implementation slices, not a mandate to create four new frameworks. If one slice can be completed safely with a smaller change, prefer the smaller change.

## 7. Acceptance criteria

- No import from `src/shared/**` into `src/features/**`.
- No feature imports another feature's private implementation except an explicitly approved integration surface.
- Auth remains the owner of authentication and session lifecycle; neutral employee identity is only a shared data contract.
- Home owns module/library identity and their semantic icon mappings.
- Data owns snapshot transport/cache; Home consumes a neutral snapshot read model.
- Stocktake, Import and Scanner internal contracts remain within their respective owners/platform.
- Stable IDs, local storage/IndexedDB schemas, event names, business behavior and PWA update blockers remain unchanged.
- No new dependency, generic framework or unnecessary barrel layer.
- Tests verify dependency direction and preserved external contracts.

## 8. Non-goals

- No visual redesign, token changes or image direction selection.
- No global component rewrite.
- No route architecture migration.
- No scanner runtime/camera/decoder changes.
- No data synchronization, persistence or business-rule changes.
- No merge or deploy.

## 9. Audit limitations

This is a source ownership audit based on repository tree, source files and indexed code-search results. It does not claim a complete runtime call graph or prove the absence of dynamic imports/reflection. Implementation must re-check exact consumers at the target branch head before each move and validate the resulting dependency graph in CI.
