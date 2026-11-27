# UI-04 — Feature Presentation Migration

**Status:** UI-04A/B/C/D implemented and validated; UI-04E Stocktake Import and UI-04F cross-feature closure remain pending.
**Initial implementation PR:** #181 — merged to main at e58bce634b9ff67e95250d36c8653593680463e9.
**UI-04D completion PR:** #189 — open / Draft, based on main 96209fd226b6efef4b8bb9a00859115baa78bcdf; exact-head CI #1873 passed on 0e2b730ecd64cca42cd618f66caf1b4fea1a37da.
**Original UI-04 branch:** merged; do not continue on refactor/ui-04-feature-presentation.
**Scope:** migrate feature presentation boundaries for Login, Settings, Scanner, Stocktake and Stocktake Import while preserving domain behavior, lifecycle, lazy-loading and accessibility contracts.

## 1. Objective and decision boundary

UI-04 is a feature-presentation migration, not an automatic product-wide visual redesign.

Objectives:
- Make each feature's presentation ownership explicit and remove accidental coupling to unrelated feature styles.
- Reuse existing shared foundations only where responsibility, semantics, state behavior, accessibility and lifecycle genuinely match.
- Keep feature-specific composition and styles local when workflows differ.
- Preserve lazy-loading and feature CSS chunk boundaries.
- Validate visual and interaction parity before considering any visual change.

The repository's active Product Skill states that no global visual language is selected. Therefore this phase may perform source-backed presentation ownership, CSS boundary and component-composition work. Any substantial new visual direction, layout redesign, typography/palette change, imagery system or motion redesign must first be explored/prototyped and explicitly owner-approved for the relevant experience. Existing styles and components are implementation assets, not mandatory creative constraints.

## 2. Source baseline

Baseline is the merged UI-03 main commit above. The repository contains **24 CSS files / 338,204 source bytes**.

| Experience | Main presentation owners | Current CSS ownership | Initial risk |
|---|---|---|---|
| Login | LoginExperience, LoginHero, LoginForm, LoginDock | login-experience.css (24,956 B), login-compact-landscape.css (2,830 B) | Auth/session and identity-transition coupling; preserve responsive and compact-landscape behavior |
| Settings | SettingsHub, nested Update Center, ScannerSettingsPanel | settings-dialog.css (shared), settings-hub.css, scanner-preferences.css | Shared dialog shell is explicit; menu and scanner preference styles are feature-owned |
| Scanner | BarcodeScanner, scanner hooks/services | barcode-scanner-presentation.css + scanner-shared-controls.css | Home presentation is feature-owned; only torch control styling is shared with Stocktake |
| Stocktake | StocktakeModule, StocktakeScanner | stocktake.css plus feature-owned stocktake-scanner-presentation.css and minimal scanner-shared-controls.css | Local persistence, revisions, history, export and camera handoff |
| Stocktake Import | StocktakeImportModule | stocktake-import.css (50,965 B) | Large feature-owned surface; parser precision, conflict review, dirty edits, persistence and export are protected |

The complete CSS inventory remains owned by UI-03's phase record. These figures are source-file bytes, not emitted transfer size or runtime cost.

## 3. Confirmed ownership observations

### 3.1 Login
- Root experience is src/features/auth/screens/LoginExperience.tsx.
- It imports two Login-specific stylesheets.
- Form, hero and dock are composed as feature components; the form uses existing shared Surface and Motion primitives.
- Completed: moved `.auth-journey-recognition*` styles, reduced-motion overrides and identity reveal keyframes from `login-experience.css` into `src/styles/auth-journey.css`, imported by `App.tsx` beside the root-owned identity journey. This aligns CSS ownership with the actual render owner without extracting or changing the identity state machine.
- Login retains its own feature and compact-landscape stylesheets; its reduced-motion rules remain local. CSS declaration content and selectors were relocated without redesigning visual output.
- Added `scripts/test-ui-04a-login-presentation.mjs` to preflight to guard the ownership boundary and required motion contracts.
- Existing `tests/browser/login-responsive.spec.ts` remains the responsive, keyboard-focus, reduced-motion and power-conserve browser gate; no auth/session behavior or employee data was changed.
- Exact-head CI run #1819 passed on commit `0b54a0356628d69592fbbc2643cf193f33d27604`, including preflight, TypeScript, production build, bundle comparison and Playwright responsive/runtime evidence.
- Existing browser coverage: tests/browser/login-responsive.spec.ts checks desktop, tablet, mobile, compact mobile and short landscape, keyboard focus, 16px input sizing, reduced motion and power-conserve backdrop behavior. The exact-head CI gate passed.
- Keep local employee validation, employee/department preview, submitting/error/success states, identity recognition handoff and session behavior unchanged.
- Preserve keyboard and screen-reader feedback.

### 3.2 Settings
- SettingsHub.tsx owns the Settings entry surface and nested Update Center.
- UI-04B retired the combined `scanner-settings.css` after tracing its two consumers.
- `settings-dialog.css` owns the shared modal/backdrop/panel foundation; `settings-hub.css` owns Settings Hub and pending-update entry presentation; `scanner-preferences.css` owns scanner preference controls and feedback.
- Update Center release/status styling remains owned by `src/shared/pwa/pwa-update-prompt.css`.
- Preserve PWA update staging/consent/activation blockers, deferred state, focus restoration, body-scroll lock and persisted scanner preferences.

### 3.3 Scanner
- Home Scanner is BarcodeScanner.tsx; Stocktake uses a separate StocktakeScanner.tsx.
- Baseline `scanner-transition.css` mixed Home Scanner, Stocktake Scanner and the common torch control in one stylesheet. The source trace confirmed exactly two runtime imports.
- UI-04C extracts Home rules into `barcode-scanner-presentation.css`, Stocktake rules into `stocktake-scanner-presentation.css`, and only `.scanner-torch-toggle` into `scanner-shared-controls.css`.
- `BarcodeScanner` and `StocktakeScanner` remain separate feature compositions and each imports its own presentation stylesheet plus the minimal shared control stylesheet.
- Both continue to use the established `useScannerEngine` hook and feature-owned preview-region binding.
- No camera acquisition gesture, camera lease/session, worker/decoder, ROI geometry, health/focus recovery, scanner settings or scanner feedback logic was changed.
- Scanner stabilization remains closed; reopen engine internals only for a reproducible defect, measured bottleneck or new requirement.

### 3.4 Stocktake
- StocktakeModule.tsx owns the operational workflow and imports feature-local stocktake.css.
- StocktakeScanner.tsx remains a separate camera surface with its own stocktake-scanner-presentation.css and the minimal shared torch-control stylesheet.
- Merged UI-04D work separates `.stocktake-backdrop` from `.stocktake-panel` and `.stocktake-confirm-backdrop` from `.stocktake-confirm`; scanner-specific layout rules are no longer owned by the main Stocktake workspace stylesheet.
- `scripts/test-ui-04d-stocktake-presentation.mjs` is registered in preflight and guards the implemented ownership/workflow boundary.
- This is a bounded first slice, not proof that the full Stocktake view/state-to-presentation mapping is complete. Continue that audit before closing UI-04D.
- Preserve session/zone/revision semantics, local persistence, action logs, edit/review/export flow, update blockers and scanner exit gate.

### 3.5 Stocktake Import
- StocktakeImportModule.tsx owns a large feature-local UI and imports stocktake-import.css (50,965 bytes).
- It contains import review, conflict handling, zone navigation, editable rows, dirty-state protection, output preview, copy/download/ZIP and history surfaces.
- Preserve parser/precision, duplicate detection, merge decisions, IndexedDB history, dirty-edit gating, export formats and update blockers.
- Do not split this stylesheet or component solely to reduce line count; first establish a stable presentation boundary and testable contracts.

## 4. Implementation sequence

Deliver each slice independently, with source trace, focused tests, browser evidence and documentation reconciliation.

1. **UI-04A — Login presentation boundary — implemented and validated**
   - App-owned identity journey selectors, reduced-motion declarations and reveal keyframes now live in `src/styles/auth-journey.css`, imported beside the root-owned `UnifiedIdentityView`.
   - Login retains `login-experience.css` and `login-compact-landscape.css`; exact-head CI #1819 passed all preflight, build, bundle and Playwright responsive/runtime gates.
   - Auth/session behavior, identity state machine, timing and employee data were not changed.
2. **UI-04B — Settings and Update Center — implemented and validated**
   - Source trace confirmed SettingsHub and ScannerSettingsPanel were the only imports of the combined `scanner-settings.css`; Update Center release/status styling remains owned by `src/shared/pwa/pwa-update-prompt.css`.
   - Extracted common modal/backdrop/panel/header/focus/footnote rules into `settings-dialog.css`.
   - Isolated Settings Hub menu and pending-update indicator rules in `settings-hub.css`; isolated scanner preference, feedback and barcode symbology rules in `scanner-preferences.css`.
   - Both consumers now import the shared dialog foundation followed by their own feature stylesheet; retired the combined `scanner-settings.css`.
   - Added `scripts/test-ui-04b-settings-presentation.mjs` and registered it in preflight. Update Center events/store and scanner preference store/hook remain in their existing components/services.
3. **UI-04C — Scanner presentation — implemented and validated**
   - Split the mixed transition stylesheet into Home, Stocktake and minimal shared torch-control presentation files.
   - Update `test-scanner-presentation.mjs` to guard selector ownership, preview reveal, reduced-motion and shared-control boundaries.
   - Keep engine, camera, worker and decoder untouched.
   - Exact-head CI run #1826 passed on `8c10dfc98f8fea31b10316d91d00388dbf94ec3c`.
4. **UI-04D — Stocktake presentation — implemented and validated; PR #189 open / Draft**
   - Extracted the five workspace views, loading state and confirmation UI into StocktakePresentation.tsx; retained state, persistence and workflow operations in StocktakeModule.tsx.
   - Moved the workspace stylesheet import to its presentation owner and preserved scanner overlay stacking/lifecycle boundaries.
   - Added focused ownership tests and a Playwright flow covering zone creation, duplicate barcode rows, review, export/download, history and mobile/desktop panel geometry.
   - Exact-head CI #1873 passed on 0e2b730ecd64cca42cd618f66caf1b4fea1a37da.
   - No merge or deployment has occurred. Preserve all operational and persistence contracts.
5. **UI-04E — Stocktake Import presentation — pending**
   - Audit the large feature stylesheet by surface and state, not by arbitrary file-size targets.
   - Preserve import review, dirty state, conflicts, preview, history and export.
6. **UI-04F — Cross-feature regression and closure**
   - Verify all five surfaces, responsive behavior, accessibility, runtime errors, failed requests, overflow and bundle/lazy-loading boundaries.
   - Update phase, roadmap, implementation status and handoff from exact-head evidence.

## 5. Protected contracts and non-goals

- Auth/session, employee identity, local employee directory and identity recognition.
- Module registry, stable destination identity and Shell navigation.
- Scanner engine, camera acquisition/session/lease, worker/decoder/WASM, ROI, camera health and focus recovery.
- Stocktake local persistence, session/zone/revision/history/log/export semantics and scanner exit gate.
- Import parser, numeric precision, duplicate/conflict semantics, dirty edits, local persistence/history and output formats.
- PWA update staging, consent, blockers, activation, rollback and boot-health.
- Overlay focus, Escape, focus restoration, body-scroll lock, keyboard/touch and reduced-motion/power-conserve behavior.
- Vite/GitHub Pages base path, lazy loading and feature CSS loading boundaries.

Non-goals: new dependencies, global visual language, wholesale CSS rewrite, generic component/framework abstractions, business logic changes, persistence/schema changes, scanner engine work, merge, deployment or production transfer.

## 6. Validation gates

For each slice:
- Enumerate component, stylesheet and runtime consumers before moving or deleting styles.
- Add/adjust focused preflight contract tests for any changed ownership boundary.
- Run preflight, TypeScript, production build, bundle comparison and relevant Playwright runtime tests.
- Inspect screenshots and interaction states for the affected experience.
- Check keyboard/focus/ARIA, touch targets, reduced motion and short viewport behavior.
- Distinguish browser viewport emulation from physical iOS/Android and lower-end device acceptance.
- Inspect the final diff for unintended business, persistence, lifecycle or lazy-loading changes.

UI-04 is complete only when all five surfaces pass their relevant gates on the exact final HEAD and the canonical docs reflect verified outcomes. No merge or deployment is implied.

## 7. Current status

- UI-03 is merged to main as PR #180, merge commit 7b679da9bbd3b3a21b50711a8b56be8ca14e2e54; final docs-head CI run #1817 passed.
- Original UI-04 branch was based on the UI-03 merge and is now merged; PR #181 landed 48 commits / 31 files on main.
- UI-04A passed exact-head CI #1819 on `0b54a0356628d69592fbbc2643cf193f33d27604`.
- UI-04B passed exact-head CI #1821 on `14bcc16a7ac8a0c20d659fd8256ede6e1e97cb8e`.
- UI-04C passed exact-head CI #1826 on `8c10dfc98f8fea31b10316d91d00388dbf94ec3c`.
- Merged PR #181 head `1ae4e870cc27e6209cd2128774167229f144ee90` passed exact-head CI #1845, including preflight, TypeScript/production builds, bundle comparison and Playwright responsive/runtime evidence.
- UI-04D presentation ownership is complete on PR #189 head 0e2b730ecd64cca42cd618f66caf1b4fea1a37da; exact-head CI #1873 passed, including the dedicated Stocktake browser workflow. PR #189 remains open / Draft pending review and merge.
- UI-04E and UI-04F are not yet implemented/closed.
- No further merge or deployment is performed by this documentation update.
