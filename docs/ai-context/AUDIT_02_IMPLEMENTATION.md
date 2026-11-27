# AUDIT-02A–02D — Ownership implementation

**Status:** Implemented; RetailOS CI passed on commit `9e03b92aa3431b8312a935af94fa28e76b1adc52`  
**Baseline:** `main` at `e58bce634b9ff67e95250d36c8653593680463e9`  
**Implementation branch:** `refactor/audit-02-ownership-contracts`  
**Pull request:** #184

## 02A — Neutral identity contracts

- Added `src/shared/domain/department.ts` as the canonical owner of `DepartmentId`.
- Added `src/shared/domain/employee.ts` for the minimal cross-feature `EmployeeSession` contract.
- Auth retains `LoginCredentials`, local account matching, session creation, validation and persistence.
- Updated App, Login, Home, Stocktake and Stocktake Import type consumers.
- Preserved the exact `retailos.session.v2` storage key and serialized fields.

## 02B — Icon ownership

- Shared icon registry now owns only cross-feature department semantics plus generic Icon/MotionIcon primitives.
- Home owns module, library and Home-navigation icon mappings in `features/home/homeIconRegistry.ts`.
- No module IDs or visual mappings were renamed; Home and library consumers now import their semantic mappings from Home.

## 02C — Snapshot read-model contract

- Added `src/shared/contracts/moduleSnapshot.ts` with `SnapshotModuleId` and read-only `CachedModuleSnapshot`.
- Data retains `MODULE_DATA_IDS`, manifest validation, remote transport, IndexedDB persistence, cache invalidation, synchronization and PWA lifecycle blockers.
- Data's existing `ModuleDataId` is derived from its allowlist, which is checked against the neutral snapshot identity union.
- Home notice rules now depend on the neutral read-model contract.
- `RetailModuleId` remains Home-owned and distinct; `stocktake-import` remains excluded from snapshot IDs.

## 02D — Feature integration surfaces

- Added `features/scanner/integration.ts` for Home's device capability query and explicit-gesture audio unlock.
- Added `features/notifications/integration.ts` for Home's push-configuration capability query.
- Scanner engine, camera acquisition/lease, decoder, worker, lifecycle and recovery remain Scanner/platform-owned.
- Push subscription and service-worker registration remain Notifications/PWA-owned.
- Home's lazy presentation imports remain unchanged.

## Guardrails and verification

No runtime dependency was added. No storage schema/key, business workflow identity, snapshot identity, scanner lifecycle, camera lease, PWA update blocker or service-worker behavior was intentionally changed.

**Verification:** RetailOS CI passed, including preflight regression suite, TypeScript + Vite production build, PR-base bundle comparison, Playwright responsive/runtime evidence tests and artifact uploads (run `45933417498`). No merge or deployment is included in this change. Passing these checks confirms regression coverage; it does not by itself prove a measurable performance gain.
