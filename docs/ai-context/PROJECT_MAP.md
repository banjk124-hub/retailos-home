# RetailOS Project Map

**Purpose:** directory-level navigation for AI agents. This is a map of verified repository structure, not a substitute for tracing imports, runtime ownership or contracts. Re-check the exact branch/commit before relying on it.

## Application entry and feature areas

| Area | Source location | What to inspect first | Canonical knowledge / validation |
|---|---|---|---|
| App composition | `src/App.tsx`, `src/main.tsx` | route/screen composition, providers, boot sequence | Inspect current route tree and app lifecycle |
| Authentication | `src/features/auth/` | `components/`, `screens/`, `services/`, `types.ts` | Treat auth/session as protected; inspect actual service and persistence contracts |
| Home and module catalog | `src/features/home/` | `HomeScreen.tsx`, `moduleRegistry.ts`, `homeStateStore.ts`, `snapshotNoticeRules.ts` | Verify module IDs, navigation and module readiness from source; do not infer readiness from registry metadata alone |
| Data access | `src/features/data/` | `moduleDataService.ts`, `exportFormats.ts` | Trace snapshot/API payloads, caching and consumers before changing contracts |
| Scanner feature UI | `src/features/scanner/` | `components/`, `hooks/`, `services/` | Read [SCANNER_ENGINE.md](./SCANNER_ENGINE.md); keep feature presentation separate from shared scanner platform |
| Shared scanner platform | `src/platform/scanner/` | contracts, camera request/lifecycle, session, decoders and processing pipeline | [SCANNER_ENGINE.md](./SCANNER_ENGINE.md); use scanner tests under `scripts/test-scanner-*.mjs` |
| Stocktake | `src/features/stocktake/` | `components/`, `services/`, `types/` | Trace capture, form state, explicit save and data service consumers |
| Stocktake import | `src/features/stocktake-import/` | `components/`, `services/` | [STOCKTAKE_FILE_IMPORT.md](./STOCKTAKE_FILE_IMPORT.md); `scripts/test-stocktake-import.mjs` |
| Notifications | `src/features/notifications/` | `pushNotifications.ts` | Inspect permission, subscription, lifecycle and service-worker interaction |

## Shared platform and UI

| Area | Source location | Boundary to inspect |
|---|---|---|
| PWA/update runtime | `src/shared/pwa/`, `src/sw/` | Service Worker, update center, release caches, boot health and safe handoff; read [PWA_RUNTIME_RELEASE.md](./PWA_RUNTIME_RELEASE.md) before any change |
| Shared services | `src/shared/services/` | ownership, callers, cleanup, permissions and cross-feature side effects |
| Navigation | `src/shared/navigation/` | module identity, dock state and navigation consumers |
| Shared components | `src/shared/components/` | error boundary, shared surfaces and component contracts |
| Motion system | `src/shared/motion/` | motion tokens, transitions, reduced-motion and lifecycle |
| Brand and icons | `src/shared/brand/`, `src/shared/icons/` | shared visual identity and icon registry |
| Glass system | `src/shared/components/glass/` | material tokens and GlassSurface ownership |
| Shared hooks/config | `src/shared/hooks/`, `src/shared/config/` | cross-feature hook behavior and canonical configuration |
| Styles | `src/styles/` and feature-local styles | import order, cascade, breakpoints, safe areas and ownership; do not add permanent override layers without a migration plan |

## UI/UX architecture documents

The following documents define the target design system and are documentation-only proposals until accepted and implemented:

- [UI_UX_ARCHITECTURE.md](./UI_UX_ARCHITECTURE.md): product-wide visual, component, layout, motion, accessibility, performance and future-module contract.
- [UI_UX_TECHNOLOGY_AUDIT.md](./UI_UX_TECHNOLOGY_AUDIT.md): dependency/browser-native capability inventory and compatibility decisions.
- [UI_UX_SCREEN_MAP.md](./UI_UX_SCREEN_MAP.md): source-traced current screens, states, workflows and target screen inventory.
- [UI_UX_IMPLEMENTATION_PLAN.md](./UI_UX_IMPLEMENTATION_PLAN.md): phased rebuild plan, documentation goals, acceptance and rollback.

The target `src/app/` and `src/design-system/` directories described in the architecture are proposals, not current repository paths. Do not import from them until an approved implementation creates them.

## Validation map

- `scripts/preflight.mjs`: repository preflight entry point; inspect `package.json` before selecting commands.
- PWA: `scripts/test-pwa-cache-policy.mjs`, `scripts/test-pwa-worker-runtime.mjs`, `scripts/test-pwa-platform-compatibility.mjs`.
- Scanner: `scripts/test-scanner-*.mjs`; select only tests matching the changed contracts, then run broader preflight as appropriate.
- Home/performance: `scripts/test-home-cache-batching.mjs`, `scripts/test-home-performance.mjs`, `scripts/test-bundle-boundaries.mjs`, `scripts/test-ui-interaction-immediacy.mjs`.
- UI/overlay: `scripts/test-body-scroll-lock.mjs`, `scripts/test-overlay-layout-contract.mjs`.
- Stocktake import: `scripts/test-stocktake-import.mjs`.

These paths are a navigation index only. Confirm current test wiring and actual `package.json` scripts before reporting a test as applicable or executed.

## Cross-cutting trace checklist

Before changing a shared area, trace:
1. Entry point and all callers.
2. State owner and lifecycle owner.
3. API/event/payload/schema and stable identifiers.
4. Persistence, IndexedDB/cache and offline behavior.
5. Permissions, browser/device capabilities and cleanup.
6. UI consumers, empty/error/retry states and user feedback.
7. Existing tests, preflight wiring and release/deployment impact.

## Source-of-truth rule

This map never overrides source, tests, accepted ADRs or canonical domain contracts. If a path moves or a new owner is introduced, update this map only after verifying the new structure and update the canonical contract that owns the behavior.
