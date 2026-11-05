# RetailOS — Engineering Roadmap

Last reviewed: 2026-11-05  
Status: active working plan; verify source and status before starting a phase.

## Roadmap governance
- A phase is a bounded delivery unit with scope, protected contracts, acceptance criteria, verification evidence, and rollback path.
- Do not mark a phase complete because code was committed. Mark complete only after all required checks are evidenced.
- Split large phases into vertical slices (one coherent behavior end-to-end).
- A phase may be re-scoped only with an explicit decision recorded in `DECISIONS.md` and updated status.
- `main` is the stable integration line. Feature work occurs on named branches and is not merged/deployed without explicit user approval.

## Scanner foundation — Phase 1.2

### 1.2A — Correctness and lifecycle
**Goal:** guarantee one active decoder per scanner session, reject unsupported/invalid results, and make lifecycle transitions deterministic.

Scope:
- Centralize accepted symbologies: EAN-13, EAN-8, CODE-128.
- Configure ZXing using APIs/types confirmed for the installed dependency graph; do not import undeclared transitive packages.
- Add a pure barcode validation boundary based on decoded format and payload.
- Preserve CODE-128 as a string; do not coerce to numeric.
- Make start idempotent and serialize start/stop/pause/resume transitions.
- Coalesce visibility/pageshow/focus resume signals.
- Stop prior decoder controls before attaching a replacement.
- Prevent callbacks from stale generations or closed sessions.
- Preserve one-shot semantics and existing consumer contracts.
- Add tests for validator and lifecycle races using existing tooling where practical.

Protected behavior:
- Home still uses its existing cached barcode lookup after scan.
- Stocktake still places the scanned value into the entry form; saving remains an explicit user action.
- Duplicate stocktake records remain separate records.
- Manual barcode entry remains available.
- Do not introduce product-catalog existence validation at scanner level.
- No IndexedDB, auth/session, Apps Script, module ID, PWA cache, or deployment contract changes.

Acceptance criteria:
- Repeated focus/pageshow/visibility events cannot create concurrent decoders.
- A close/pause during pending camera acquisition or video startup cannot attach a stale stream or deliver a stale callback.
- Exactly one accepted callback in single mode.
- Continuous mode only emits accepted supported formats according to an explicit cooldown policy.
- EAN-13/EAN-8 payloads are format/length-valid; CODE-128 content is preserved and not restricted to digits.
- Empty/unsupported values are not passed to feature callbacks.
- Home and Stocktake behavior above remains unchanged.
- Targeted tests and production builds pass, or failures are explicitly documented as blockers.

### 1.2B — Camera performance and diagnostics
**Goal:** optimize based on measured device behavior, not assumed camera constraints.

Scope:
- Record camera acquisition duration, video readiness, decoder attach, first valid result, resume latency, actual track settings, and failure category.
- Add low-overhead diagnostics with no personal/product data leakage.
- Compare actual device behavior at 960×540 and 1280×720; test decode intervals around 100/120/150 ms.
- Handle ended tracks and recoverable camera interruptions.

Acceptance criteria:
- Measurements available for representative Android Chrome and iOS Safari devices.
- Resolution/interval chosen from measured scan success and latency, not ideal constraints alone.
- No regression in battery/thermal behavior or camera startup.

### 1.2C — Audio and continuous scan policy
**Goal:** make feedback reliable and define safe repeated-scan behavior.

Scope:
- Audio unlock remains gesture-driven and optional.
- Beep only after a valid accepted result; audio failure never blocks scan delivery.
- Define same-code lockout separately from database deduplication.
- Keep Home and Stocktake in single mode until continuous mode is specifically validated.

Acceptance criteria:
- Audio unsupported/suspended state does not block scanning.
- No beep for rejected, empty, unsupported, or cooldown-blocked results.
- Continuous mode policy is explicit and tested.
- Stocktake duplicate records are still preserved when the user explicitly saves them.

### 1.2D — Regression and release readiness
**Goal:** provide evidence that scanner stabilization did not break app workflows.

Required checks:
- Home scan → cached lookup.
- Stocktake scan → form fill → explicit save.
- Duplicate stocktake entries.
- Manual entry.
- Camera permission denied, dismissed, revoked, and reopened.
- Background/foreground, focus/pageshow, close during pending request, track ended.
- Android Chrome and iOS Safari hardware QA where available.
- `npm run build`, `npm run build:pages`, and all targeted tests.
- Diff audit and status/handoff update.

Release gate:
- User verifies the branch locally.
- Explicit user approval is required before merge to `main` or deployment.

## Future platform roadmap (not authorized by this scanner phase)
- Continue modularizing app shell, module registry, data contracts, providers and local-first sync only when supported by a separate audit and bounded proposal.
- Do not expand this phase into backend replacement, database migration, auth redesign, or visual redesign.
