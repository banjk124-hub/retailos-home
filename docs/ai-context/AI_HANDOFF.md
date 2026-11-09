# RetailOS — AI Handoff (Canonical Entry Point)
**Last verified:** 2026-11-10  
**Repository:** banjk124-hub/retailos-home  
**Current main:** 09cd3b5117ea38a16dd991f74320835b67ea04b5  
**Current branch for documentation synchronization:** docs/retailos-current-state-and-scanner-change-map  
**Open PRs at audit time:** none

## Read first
1. AGENTS.md — safety and operating contract.
2. docs/ai-context/RETAILOS_CURRENT_STATE_2026-11-10.md — canonical whole-app source audit, current phase, risks, PR plan and scanner Change Map.
3. docs/ai-context/PROJECT_CONTEXT.md — product constraints.
4. docs/ai-context/ARCHITECTURE.md — accepted architecture boundaries and ADRs.
5. docs/ai-context/ROADMAP.md — current execution order.
6. docs/ai-context/IMPLEMENTATION_STATUS.md — verified implementation state and evidence.
7. .github/skills/retailos-implementation/SKILL.md — implementation workflow.
8. Relevant source, tests, package/config and current git diff.

If an older audit/session note conflicts with the 2026-11-10 current-state audit, inspect current source and treat the older note as historical.

## Current product stage
RetailOS is a React/TypeScript/Vite PWA foundation and local-first prototype. The Home shell, local prototype login, shared scanner and Stocktake local workflow exist. Only Stocktake has a complete operational module UI. Backend authentication, live snapshot sync, multi-device Stocktake sync and remote Push delivery are not verified as integrated. Do not call the app production-ready for multi-user operations.

## Current execution focus
- The latest main commit passed GitHub CI and Pages workflow.
- Scanner camera/session/lifecycle/preview/validation/Torch/settings foundations already exist and must be preserved.
- The next scanner work is recognition/geometry capability expansion, starting with a narrow module-defined scan-region input contract.
- The immediate documentation task is DOC-01. No runtime source changes are authorized by this handoff update.

## Hard boundaries
- Home and Stocktake own their separate scanner UI, video elements, reticles, transitions and business behavior.
- Shared engine owns camera/decoder resources, lifecycle, decode scheduling, validation and technical diagnostics.
- Do not send presentation/exit decisions into the engine.
- Do not restore a DOM geometry gate to camera startup. Geometry is only an input to decode after preview readiness.
- Module defines its scan rectangle and camera request. Core receives resolved source-frame ROI; it does not infer UI intent.
- Default camera request remains environment, ideal 1280×720, ideal/max 30 FPS unless a separately approved, measured change is made.
- Preserve 110 ms decode cadence, one decode in flight, barcode whitelist EAN-8/EAN-13/CODE-128 and validation until a scoped PR proves a safe change.
- Recovery must be conditional and bounded. A normal no-barcode frame must not trigger expensive recovery.
- Preserve Home cached lookup and Stocktake form-fill, explicit save, manual entry, duplicate rows, revisions and exports.
- Do not change auth/session, module IDs, Apps Script payloads, IndexedDB schemas, Service Worker, Vite base path or deploy workflow inside Scanner PRs.
- No merge, deploy, credential rotation or cloud-setting change without explicit user approval.

## Work discipline
Inspect latest main, branch, local status and diff before editing. Use a dedicated branch and small vertical PRs. Run targeted regression tests and full npm run preflight. Distinguish GitHub CI from local Windows and physical iOS/Android QA. Update status, roadmap, architecture/decisions and handoff together when facts or boundaries change.

## Next implementation gate
Review the 2026-11-10 audit and approve the SCAN-01 file-level Change Map before any runtime edits. Do not start by rewriting the decoder or session.
