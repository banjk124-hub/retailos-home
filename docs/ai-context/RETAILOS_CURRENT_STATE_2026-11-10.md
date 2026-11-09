# RetailOS — Comprehensive source audit and current execution map

**Audit date:** 2026-11-10  
**Repository:** banjk124-hub/retailos-home  
**Audited ref:** main  
**Audited commit:** 09cd3b5117ea38a16dd991f74320835b67ea04b5  
**Audit type:** source, configuration, test, workflow and documentation review; read-only  
**Runtime code changes:** none  
**Deployment changes:** none

> Canonical source-grounded snapshot for work started after 2026-11-10. This document supersedes older “current status” statements in historical audit/session documents when they conflict with this baseline. Re-audit main before every implementation task.

## 1. Executive status

RetailOS is a mobile-first React PWA prototype for supermarket operations. The application shell, design system, login journey, Home, shared scanner, local Stocktake workflow, snapshot data service, notification client and GitHub Pages deployment path exist.

It is not yet a production multi-user operations platform:
- Authentication is frontend-only employee-code matching. The employee directory is shipped to the browser and is not a security boundary.
- The Apps Script snapshot service and IndexedDB cache are implemented as a client-side integration layer, but the sync function has no application caller and there is no token-issuing backend flow wired into login.
- Only Stocktake has a complete operational module UI. The other seven module tiles are explicitly marked integrating and currently show an integration message.
- Stocktake is local-first on one device; its IndexedDB data is not synchronized to a backend or another device.
- Web Push client code exists, but requires a configured endpoint and VAPID public key plus a backend capable of storing subscriptions and sending push messages.

**Overall product stage:** foundation + local-first prototype, moving toward an operational MVP integration phase. Do not describe the app as production-ready for multi-user use.

**Current active engineering focus:** documentation baseline and Scanner recognition/geometry expansion planning. The camera/lifecycle foundation is already present and must be protected. The next implementation slice is a narrowly scoped scanner input/region contract, not a scanner rewrite.

## 2. Repository and release snapshot

| Item | Verified state |
|---|---|
| Default branch | main |
| Main commit | 09cd3b5117ea38a16dd991f74320835b67ea04b5 |
| Repository files | 204 |
| Open pull requests | None at audit time |
| Latest main CI | Run 42652303936 — success |
| Latest Pages workflow | Run 42652303768 — success |
| Deployment target | GitHub Pages project site |
| Runtime stack | React 18.3, TypeScript 5.7, Vite 6 |
| Barcode decoder | @zxing/library 0.23 |
| Browser persistence | localStorage + IndexedDB |
| PWA | Web App Manifest + Service Worker |
| CI preflight | Scanner regression tests + TypeScript/Vite builds + Pages build + diff checks |

A successful CI run and successful Pages workflow prove that the audited main commit passed the configured automated build/deploy workflow. They do not prove backend integration, security readiness, real-device coverage for every feature, or production operational acceptance.

The repository contains many historical feature branches. At audit time there are no open PRs. Treat main as the only current integration baseline; never infer that an old branch is active merely because it still exists.

## 3. Application architecture and verified state

### 3.1 App shell and navigation

- App entry: src/main.tsx; root orchestration: src/App.tsx.
- App flow: local login → identity/recognition transition → Home.
- Home owns the module library, snapshot-derived notices, barcode quick lookup, settings hub, Scanner QA Monitor and Stocktake entry.
- Navigation is state/component-driven; there is no separate route framework in the inspected app entry.
- React StrictMode and a shared AppErrorBoundary are enabled.
- Motion, brand, glass surfaces, dock and adaptive appearance have shared components/tokens.

### 3.2 Authentication and session

Files: src/features/auth/services/localAuth.ts, employeeDirectory.ts, sessionStore.ts, src/App.tsx.

Verified:
- Login matches an employee code against LOCAL_EMPLOYEE_DIRECTORY in frontend code.
- This is prototype identity matching, not secure authentication or authorization.
- The employee directory is bundled client-side and can be inspected.
- Session persistence stores name, department, departmentId and signedInAt; it deliberately does not persist employeeCode.
- The current source directory contains a duplicate employeeCode across two employee records. findLocalEmployeeByCode uses Array.find, so the first matching record wins. This is an actual source-level ambiguity and must be resolved with the owner before changing account records or authentication behavior.
- Stocktake has a fallback that resolves a missing session employeeCode against the local directory by name and department.
- Logout releases the camera stream, clears the session/last-login preference and clears module snapshot cache. Stocktake has its own separate IndexedDB database and is not cleared by clearCachedModuleData.

Do not silently alter employee records, session fields, login flow or Stocktake identity resolution as part of scanner work. A real operational rollout requires a separately designed backend authentication/authorization boundary.

### 3.3 Home and module registry

Files: src/features/home/HomeScreen.tsx, moduleRegistry.ts, ModuleLibraryEngine.tsx.

- The module library has eight module IDs grouped into five libraries.
- Registry availability is deliberately separate from snapshot data support.
- Stocktake is the only module marked ready.
- Inventory, price, products, orders, delivery, sales and product-dates are marked integrating.
- Selecting an integrating module does not open a complete workflow; Home announces that its business UI is still being integrated.
- Snapshot-derived Home notices are calculated from cached data only. They are not proof that the backend has synchronized data.

Never mark a module ready merely because its tile, module ID, snapshot type or sample data exists. Keep UI readiness, data availability, permission and connectivity as separate states.

### 3.4 Snapshot data service

File: src/features/data/moduleDataService.ts.

Verified implementation:
- Stable module data IDs: inventory, price, orders, sales, products, delivery, product-dates, stocktake.
- Manifest and snapshot response parsing/validation.
- Bearer-token request contract.
- IndexedDB database retailos-module-data, version 1, object store snapshots.
- Version-based incremental snapshot download.
- A verified new snapshot replaces one module record; a failed download leaves its previous record intact.
- Cache reconciliation removes snapshots for modules no longer authorized in the manifest.
- Logout clears the module snapshot database.

Critical integration gap:
- syncAuthorizedModuleData is defined but repository search found no application call site.
- No login/backend token provider is wired to pass its required accessToken.
- No deployed backend endpoint or live CORS/authentication contract was verified in this audit.
- Therefore, snapshot sync is a prepared integration service, not a working end-to-end data pipeline in the current UI.

Do not change module IDs, manifest/snapshot shape, IndexedDB database/store/version, authorization semantics or cache replacement behavior without a migration plan and regression tests.

### 3.5 Stocktake module

Files: src/features/stocktake/components/StocktakeModule.tsx, StocktakeScanner.tsx, services/stocktakeLocalStore.ts, stocktakeExport.ts, types/stocktake.types.ts.

Verified local workflow:
- IndexedDB database retailos-stocktake, version 1.
- Stores: sessions, zones, entries, logs, exports.
- Session and zone workflow, revision handling, draft/exported/superseded states.
- Barcode scanning fills the entry form; save remains an explicit action.
- Manual barcode entry is available.
- Each scanned/manual entry remains a separate row; duplicate barcodes are not automatically merged.
- Entries can be edited/deleted before export.
- Exported revisions are locked; redoing a zone creates a new revision and retains history.
- Text export can be downloaded again from export history.
- Clear-all is scoped to the Stocktake database.
- Data remains on the current device; no cross-device/backend synchronization is implemented.

Protect this workflow and its data model. Do not modify Stocktake business behavior as a side effect of scanner recognition changes.

### 3.6 Scanner and camera subsystem

Main files:
- src/shared/services/cameraSession.ts
- src/platform/scanner/contracts.ts
- src/platform/scanner/universalScannerSession.ts
- src/platform/scanner/scannerLifecycleAdapter.ts
- src/platform/scanner/scannerPageLifecycleCoordinator.ts
- src/platform/scanner/decoders/decoderAdapter.ts
- src/platform/scanner/decoders/zxingDecoder.ts
- src/platform/scanner/decoders/rgbaToLuminance.ts
- src/platform/scanner/barcodeValidation.ts
- src/features/scanner/hooks/useScannerEngine.ts
- src/features/scanner/components/BarcodeScanner.tsx
- src/features/stocktake/components/StocktakeScanner.tsx

Current architecture:
- Home and Stocktake retain separate video elements, UI, reticles, presentation, transitions and business callbacks.
- Both consume the same useScannerEngine React bridge and UniversalScannerSession.
- Camera acquisition is initiated by the opening tap through a cancellable, single-claim CameraLeaseRequest.
- cameraSession manages a shared stream and reference-counted leases.
- The platform session owns technical camera/decoder lifecycle, frame scheduling, recovery, validation and result delivery.
- Feature modules own presentation and result/business handling.
- Lifecycle events are technical only: OPENING, READY, SCANNING, SESSION_CLOSE_STARTED, CAMERA_LEASE_RELEASED and DISPOSED.
- Preview readiness means a real usable camera frame exists; it is distinct from decoder/scanning readiness.
- Foreground recovery can replace the disposable video surface and restart the normal pipeline.
- Torch is discovered from the active video track after the first usable frame; unsupported Torch is non-fatal.
- Shared beep/vibration preferences are device-local and consumed after an accepted barcode result.

Protected behavior:
- camera lease ownership/refcount, single-claim handoff, request cancellation and release order;
- preview readiness, suspend/resume, generation guards and foreground recovery;
- one active session/decoder and one decode in flight;
- single/continuous result semantics and same-code cooldown;
- EAN validation and opaque CODE-128 payload handling;
- capability-gated Torch and shared feedback;
- Home cached lookup;
- Stocktake form-fill, explicit save, manual entry, duplicate rows, revisions and export.

### 3.7 Current decoder behavior and recognition gaps

Source facts from zxingDecoder.ts and universalScannerSession.ts:
- ZXing is the only current decoder adapter; no ZBar or native camera decoder is in main.
- Decode runs on the main thread through Canvas/ImageData and ZXing.
- The frame is capped at 1280 pixels wide before the first decode pass.
- Current order is full-frame decode first, then a hardcoded centered ROI crop after a miss.
- ROI constants: 82% frame width × 66% frame height; crop is upscaled 1.5×.
- HybridBinarizer is used; GlobalHistogramBinarizer is added on every third ROI pass.
- RGBA is converted to 8-bit luminance using Rec.601 coefficients.
- The session enforces a 110 ms minimum decode interval and prevents concurrent decode calls.
- Supported whitelist is EAN_8, EAN_13 and CODE_128. Do not widen formats without explicit business requirements.
- ScannerGeometry exists as a result contract in source-frame pixels, but the current ZXing result construction does not populate geometry.
- ScannerCameraProfile type exists, but ScannerOpenOptions currently receives only a profile name; the hook passes HIGH unconditionally.
- cameraSession currently requests environment camera with ideal 1280×720 and ideal/max 30 FPS.
- The actual track settings may differ from requested ideal constraints.
- Advanced rotation, deskew, perspective correction, glare recovery, adaptive local contrast, multi-scale small-code recovery and curved-label correction are not implemented.

Current UI region facts:
- Home preview uses object-fit: cover, centered; its reticle is inset 22% vertically and 8% horizontally.
- Stocktake preview has a 4:5 base aspect ratio on wider layouts and a responsive full-height preview on narrow screens; its video uses object-fit: cover and its reticle is inset 28% vertically and 10% horizontally.
- The decoder's fixed center ROI is not driven by either module's reticle.
- Full-frame-first decoding can accept a barcode outside the visible reticle. This is a source-level behavior, not a user-reported malfunction.

This is the highest-priority recognition architecture gap. The solution is not to rebuild camera/session lifecycle; it is to pass a module-defined scan region through a narrow, backward-compatible bridge and make decoder processing honor that region.

### 3.8 Notifications and PWA

Files: src/features/notifications/pushNotifications.ts, public/sw.js, public/manifest.webmanifest, src/main.tsx.

- Service Worker cache is retailos-shell-v10.
- App shell is pre-cached; navigation/static assets use network-first with cache fallback.
- A new service worker does not force-activate over open app tabs.
- Push event display and notification-click navigation are implemented in the Service Worker.
- Client subscription requires VITE_VAPID_PUBLIC_KEY and VITE_PUSH_SUBSCRIPTION_URL.
- The subscription client posts to the configured endpoint; no endpoint/backend sender was verified here.
- A browser permission grant alone does not deliver remote notifications.
- GitHub Pages project base path is /retailos-home/ in the build workflow. Preserve Vite base path, manifest scope/start_url and Service Worker scope.
- GitHub Pages deployment is triggered by pushes to main and by manual workflow dispatch.

### 3.9 Design system and CSS

- Shared brand, theme, glass material, motion, navigation and adaptive appearance systems exist.
- src/main.tsx imports a large ordered set of global stylesheets, including base, responsive, theme, home, mobile tuning, performance, home UX/engine/redesign/architecture, native experience, scanner QA/settings and feature CSS.
- This import order and selector cascade are part of current visual behavior.
- Do not mass-delete CSS, rename classes, reorder global imports or consolidate Home/Stocktake scanner presentation during scanner algorithm work.
- A future CSS cleanup requires a separate selector/import dependency audit and viewport regression plan.

## 4. Whole-app risk register

| Priority | Finding | Required handling |
|---|---|---|
| P0 before real multi-user rollout | Frontend-only employee-code login is not secure authorization | Design backend auth separately; do not mistake prototype login for access control |
| P1 | Duplicate employee code exists in local directory; lookup returns first match | Resolve employee/account data with owner; no silent record edits |
| P1 | Snapshot sync service has no UI/application caller or token provider | Integrate only after backend auth/token and endpoint contract are defined |
| P1 | Seven of eight module UIs remain integrating | Implement one complete module workflow per vertical slice |
| P1 | Stocktake is device-local only | Backend sync/backup is a separate data migration project; protect local records |
| P1 | Web Push backend is not verified/configured | Keep UI honest; do not claim remote push works without endpoint and sender |
| P2 | Scanner ROI is hardcoded and not aligned to module reticles | First scanner enhancement target |
| P2 | Decoder performs full-frame first and has only basic recovery | Change only after ROI contract and benchmark baseline |
| P2 | Camera resolution/profile control is not module-configurable | Extend camera request contract separately; preserve current defaults |
| P2 | Scanner result geometry contract is not populated | Add only when recognition/overlay use requires it |
| P2 | Automated tests are concentrated on Scanner; no general app E2E suite/script is wired | Add focused tests for auth, data sync, module workflows and PWA as each track changes |
| P2 | Global CSS import/cascade is layered and order-sensitive | No broad cleanup inside feature PRs |

## 5. Scanner change map — proposed implementation boundary

This is the working proposal for review. It is not permission to refactor protected runtime code before the documentation plan is approved.

### Responsibility allocation

**Feature module owns**
- Reticle UI and its layout/size/position.
- Which scan region is active and when it changes.
- Preview aspect ratio, CSS sizing, object-fit/object-position and any mirror transform.
- Requested camera resolution/frame-rate profile for that module.
- Whether the scanner is single or continuous and the module's result/business behavior.

**Shared scanner core owns**
- Camera lease/session resource safety and the existing lifecycle.
- Receiving a resolved scan region in a documented coordinate space.
- Crop/extract/normalize pixels inside that region.
- Bounded image recovery and decoder strategy.
- Decoder result geometry in source-frame coordinates.
- Diagnostics and resource budgets.

**Boundary rule**
- The engine must not own or infer the module's reticle/presentation.
- The engine must not inspect DOM layout as a camera-startup prerequisite. ADR-015 remains protected.
- A module-side adapter or shared pure geometry helper may map the displayed reticle to a normalized source-frame ROI using explicit source dimensions, rendered video content bounds, object-fit/object-position and mirror state.
- The engine/decoder receives the resolved source-frame ROI; it does not query CSS or decide where the reticle should be.
- Updating the region while scanning must not recreate the camera stream, session, decoder or frame loop.
- A 16:9 preview, 4:5 preview or user-selected small/large rectangle must not be conflated with camera sensor resolution. Display aspect ratio and camera capture constraints are independent inputs.

### Proposed contract shape

Use a normalized source-frame coordinate system with values bounded to [0,1]:
- x, y: top-left of region.
- width, height: region dimensions.
- coordinateSpace: source-frame-normalized.

The precise public type, update method and invalid-region policy must be finalized in PR-01 design. Do not commit a guessed API before checking every current Scanner consumer and CameraLeaseRequest call site.

Camera configuration should be a separate request contract passed at the initiating module tap into the existing camera lease acquisition path. Existing default remains environment camera, ideal 1280×720, ideal/max 30 FPS until a separately measured change is approved. The video element's CSS aspect ratio does not set camera resolution.

### Recovery policy

- Normal path: decode only the module-defined ROI with the least expensive validated path.
- Recovery is conditional and bounded. A no-result frame alone is not evidence of a difficult barcode; most frames may contain no barcode.
- Do not run every rotation, every scale, contrast transforms or perspective correction on every frame.
- Use measured/cheap signals and a bounded retry budget after repeated meaningful misses; thresholds must come from a representative image/device benchmark, not guesses.
- Advanced processing is opt-in within the recovery budget, not an always-on computer-vision pipeline.
- Never weaken barcode format whitelist, EAN checksum validation or CODE-128 payload preservation to improve apparent scan rate.
- Low-end devices must retain the same correctness requirements. Adapt optional work, scheduling, buffer reuse and concurrency—not accepted-data policy.

## 6. Updated PR plan

### Documentation gate — DOC-01
- Comprehensive current-state audit, canonical handoff, phase map and protected change map.
- Documentation-only branch; no runtime code, dependency, schema, config or deployment edits.
- Merge/deploy only after user review and approval.

### Scanner recognition workstream

| PR | Scope | Must not change |
|---|---|---|
| SCAN-01 — Input and Module Config Contract | Define module scan-region input, region update path and separate camera-request config; preserve old defaults | Camera lifecycle, decoder algorithm, business callbacks, UI composition |
| SCAN-02 — Geometry Mapping Utility | Pure/testable mapping from module display rectangle to source-frame normalized ROI; handle cover crop, position, mirror and responsive bounds | Session startup readiness; no engine DOM layout gate |
| SCAN-03 — Module ROI Integration | Wire Home and Stocktake to their own rectangles; region updates do not restart session | Module reticle presentation, transitions, result/business behavior |
| SCAN-04 — ROI-Only Decode Baseline | Decode strictly inside supplied ROI; remove full-frame acceptance only after both consumers supply valid ROI; test barcode outside ROI is rejected | Validation whitelist, cadence, camera lease and lifecycle |
| SCAN-05 — Recognition Benchmark Harness | Curated labelled image set, baseline success/false-positive/latency/memory proxy metrics | Production behavior unless explicitly approved |
| SCAN-06 — Conditional Recovery Foundation | Bounded candidate pipeline, buffer reuse, alternative binarization/contrast only when triggered | Always-on heavy processing, new decoder dependency without evidence |
| SCAN-07 — Rotation and Skew | Real 90/180/270 rotation and measured arbitrary deskew; preserve geometry mapping | Module presentation and validation policy |
| SCAN-08 — Small/Far/Low-Light Recovery | Multi-scale ROI, controlled contrast/exposure and difficult-light handling | Unbounded retries or camera constraint changes without measurement |
| SCAN-09 — Advanced Geometry/Surface Cases | Perspective, glare and curved barcode experiments only if dataset demonstrates value | Default per-frame processing |
| SCAN-10 — Resource Adaptation and Cross-Platform QA | Measured scheduling/resource profiles; iOS Safari/PWA and Android Chrome/PWA validation on representative devices | Any accuracy/correctness trade-off |

Dependencies: SCAN-01 → SCAN-02 → SCAN-03 → SCAN-04 → SCAN-05 → SCAN-06/07/08 → SCAN-09 → SCAN-10. SCAN-06/07/08 may be split into smaller PRs if a measured implementation requires it. Do not combine camera resolution, ROI geometry and image algorithms in one PR.

### Whole-app operational MVP workstream (separate from Scanner)

| PR/track | Scope | Gate |
|---|---|---|
| APP-01 — Identity Data Integrity | Resolve duplicate local employee identifiers and define stable identity mapping | Owner-confirmed account mapping; tests |
| APP-02 — Backend Authentication | Replace prototype identity matching with server-issued authenticated session and authorization | Security/data contract design; never embed secrets in VITE variables |
| APP-03 — Snapshot Sync Activation | Wire manifest/snapshot sync to authenticated token lifecycle and endpoint | Endpoint/CORS/auth contract; preserve IndexedDB schema unless migration approved |
| APP-04+ — Business Modules | Implement one module at a time using canonical module IDs and snapshot contracts | Complete workflow + empty/stale/error/offline states + tests |
| APP-05 — Stocktake Data Portability | Design backup/server sync for local Stocktake data | Explicit schema migration, conflict and offline strategy |
| APP-06 — Push Backend | Configure subscription endpoint and trusted sender | Backend VAPID private key handling and delivery tests |
| APP-07 — Operational Release Gate | Permissions, device QA, data recovery, auth, sync, PWA and support process | Explicit user acceptance before production rollout |

Do not run these app tracks as incidental changes inside Scanner PRs.

## 7. Explicit no-go list

Until separately approved:
- Do not rewrite UniversalScannerSession or cameraSession.
- Do not change camera lease/refcount, cancellation, claim, release, foreground recovery or lifecycle event semantics.
- Do not reintroduce a DOM geometry barrier into camera startup.
- Do not unify Home and Stocktake scanner UI.
- Do not move animation, exit decisions or presentation ownership into the engine.
- Do not change the supported barcode whitelist or validation policy.
- Do not replace ZXing or add ZBar/native/AI/OCR dependencies without benchmark evidence and explicit review.
- Do not run expensive recovery continuously.
- Do not change default camera resolution/FPS merely because a display frame is portrait or smaller.
- Do not change Home lookup, Stocktake save/duplicate/revision/export behavior.
- Do not alter auth/session, module IDs, Apps Script payloads, IndexedDB schema, service worker cache policy, Vite base path or deploy workflow inside Scanner PRs.
- Do not remove files/styles because they appear unused without import/call-site proof.
- Do not merge, deploy, rotate credentials or change cloud settings without explicit user approval.

## 8. Verification baseline and evidence limits

Current preflight script: scripts/preflight.mjs.

It runs:
- scanner barcode validation/luminance regression;
- scanner lifecycle regression;
- scanner Torch regression;
- scanner settings/feedback regression;
- scanner Web Audio runtime regression;
- scanner presentation ownership regression;
- TypeScript + Vite production build;
- GitHub Pages build;
- staged and unstaged diff whitespace checks.

There is no general app test suite or E2E script wired in package.json. Playwright is a dependency, but that alone does not prove E2E tests exist or run.

Latest main CI and Pages workflow were successful at the audited commit. This audit did not run a local Windows/PowerShell preflight, browser automation, or physical-device QA. Keep those evidence classes separate.

For scanner work, add tests for:
- rectangle bounds and invalid input;
- cover/crop/object-position/mirror mapping;
- region updates without session recreation;
- no accepted decode outside active ROI;
- rotation/deskew coordinate transforms;
- recovery candidate budget and cooldown;
- no concurrent decode/session/stream;
- unchanged validation and Home/Stocktake business contracts.

For app work, add focused tests for:
- unique employee identifier handling;
- session restore/logout;
- manifest and snapshot parsing/version replacement;
- offline/stale/unauthorized states;
- Stocktake persistence/revisions/export;
- service-worker base path/cache upgrade;
- push setup and backend delivery boundary.

## 9. Cross-session operating procedure

At every new chat or agent session:
1. Read AGENTS.md.
2. Read this file first for current source truth.
3. Read AI_HANDOFF.md, ARCHITECTURE.md, ROADMAP.md and IMPLEMENTATION_STATUS.md.
4. Confirm current main SHA, open PRs, branch status and workflow results from GitHub.
5. Inspect the exact source/tests/config involved; do not rely on chat memory or old audit files.
6. Inspect local git status and diff before any checkout/edit. Preserve untracked files and local work.
7. State the target PR, allowed files, protected files, regression tests and rollback plan before implementation.
8. Work on one branch/one vertical slice. Run targeted tests then full preflight. Record exact evidence.
9. Update status/handoff/checklist and session log in the same branch.
10. Leave merge/deploy to explicit user approval.

**Next action after this documentation branch is reviewed:** finalize SCAN-01 contract and file-level change map. Do not start decoder algorithm changes before the contract and module responsibility boundary are approved.
