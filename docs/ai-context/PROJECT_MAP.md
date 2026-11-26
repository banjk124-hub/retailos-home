# RetailOS Project Map

**Purpose:** directory-level navigation for agents. This map is not a substitute for tracing imports, runtime ownership, tests or contracts. Re-check the exact branch/commit before relying on it.

## Application entry and feature areas
| Area | Source location | Inspect first | Canonical knowledge / validation |
|---|---|---|---|
| App composition | `src/App.tsx`, `src/main.tsx` | providers, boot sequence, route/screen composition | Trace app lifecycle and current route tree. |
| Authentication | `src/features/auth/` | components, screens, services, types | Auth/session and employee identity are protected. |
| Home and module catalog | `src/features/home/` | HomeScreen, moduleRegistry, homeStateStore, snapshotNoticeRules, `hooks/useHome*` | HomeScreen composes focused navigation, snapshot, calendar, lookup, feedback, push, update-count and viewport hooks; preserve stable module IDs, registry semantics and truthful readiness. See [UI_UX_PHASE_02_HOME_OWNERSHIP.md](./UI_UX_PHASE_02_HOME_OWNERSHIP.md). |
| Data access | `src/features/data/` | moduleDataService, exportFormats | Trace payloads, caching and consumers. |
| Scanner feature UI | `src/features/scanner/` | components, hooks, services | Read [SCANNER_ENGINE.md](./SCANNER_ENGINE.md); presentation must not own engine lifecycle. |
| Shared scanner platform | `src/platform/scanner/` | contracts, camera/session, decoder and processing | [SCANNER_ENGINE.md](./SCANNER_ENGINE.md); targeted scanner tests. |
| Stocktake | `src/features/stocktake/` | components, services, types | Trace capture, session state, explicit save and data consumers. |
| Stocktake Import | `src/features/stocktake-import/` | components, services | [STOCKTAKE_FILE_IMPORT.md](./STOCKTAKE_FILE_IMPORT.md). |
| Notifications | `src/features/notifications/` | pushNotifications | Permission, subscription, service-worker and lifecycle contracts. |

## Shared platform and UI
| Area | Source location | Boundary |
|---|---|---|
| PWA/update runtime | `src/shared/pwa/`, `src/sw/` | Read [PWA_RUNTIME_RELEASE.md](./PWA_RUNTIME_RELEASE.md) before lifecycle changes. |
| Shared services | `src/shared/services/` | Trace ownership, callers, permissions and side effects. |
| Navigation | `src/shared/navigation/` | `ShellNavigation` shares Home destination state across desktop rail and touch `LiquidDock`; see [UI_UX_PHASE_01B_SHELL_NAVIGATION.md](./UI_UX_PHASE_01B_SHELL_NAVIGATION.md). |
| Shared components | `src/shared/components/` | Use component governance before cross-feature promotion. |
| Motion | `src/shared/motion/` | Preserve reduced-motion, power-conserve and lifecycle semantics. |
| Brand/icons | `src/shared/brand/`, `src/shared/icons/` | Shared identity and icon registry. |
| Semantic surfaces | `src/shared/components/surface/` | `Surface.tsx` and `surface.css` own opaque semantic roles; Glass material APIs are retired. |
| Hooks/config | `src/shared/hooks/`, `src/shared/config/` | Cross-feature behavior and canonical configuration. |
| Styles | `src/styles/` and feature-local styles | Trace import order, cascade, breakpoints, safe areas and ownership; do not add permanent override layers without a migration plan. See [UI_UX_PHASE_03_CSS_CONSOLIDATION.md](./UI_UX_PHASE_03_CSS_CONSOLIDATION.md) for the active CSS migration and evidence gates. |

## UI/UX documentation ownership
- Product-wide workflow and protected boundaries: [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md).
- Experience discovery, creative exploration, prototype and approval workflow: [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md).
- Historical M0 visual specification (superseded; evidence only): [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md).
- Shared component/pattern reuse: [COMPONENT_AND_PATTERN_GOVERNANCE.md](./COMPONENT_AND_PATTERN_GOVERNANCE.md).
- Technology evaluation: [TECHNOLOGY_RADAR.md](./TECHNOLOGY_RADAR.md).
- Phase sequencing: [ROADMAP.md](./ROADMAP.md).
- Retained audit/implementation evidence and consolidation history: [INDEX.md](./INDEX.md), [UI_UX_DOCUMENT_CONSOLIDATION.md](./UI_UX_DOCUMENT_CONSOLIDATION.md).

Do not treat superseded UI_UX architecture, design-system, reference-role or implementation-plan documents as active authority. Their valid rules have been reconciled into the canonical owners; retired files are recorded in DEPRECATION_REGISTER.md and their original revisions remain in Git history.

## Validation map
- `scripts/preflight.mjs`: preflight entry point; inspect package scripts before selecting commands.
- PWA: `scripts/test-pwa-cache-policy.mjs`, `scripts/test-pwa-worker-runtime.mjs`, `scripts/test-pwa-platform-compatibility.mjs`.
- Scanner: `scripts/test-scanner-*.mjs`; select tests matching changed contracts.
- Home/performance: `scripts/test-home-cache-batching.mjs`, `scripts/test-home-performance.mjs`, `scripts/test-bundle-boundaries.mjs`, `scripts/test-ui-interaction-immediacy.mjs`.
- UI/overlay: `scripts/test-body-scroll-lock.mjs`, `scripts/test-overlay-layout-contract.mjs`.
- Stocktake Import: `scripts/test-stocktake-import.mjs`.

These are navigation hints only. Confirm current test wiring and package scripts before claiming a check was applicable or executed.

## Cross-cutting trace checklist
Before changing shared areas, trace:
1. Entry point and all callers.
2. State and lifecycle owner.
3. API/event/payload/schema and stable identifiers.
4. Persistence, IndexedDB/cache and offline behavior.
5. Permissions, browser/device capabilities and cleanup.
6. UI consumers, empty/error/retry states and user feedback.
7. Existing tests, CI wiring and release/deployment impact.

## Source-of-truth rule
This map never overrides source, tests, accepted ADRs or canonical domain contracts. If a path or owner changes, update this map only after verifying the new structure and update the canonical contract that owns the behavior.
