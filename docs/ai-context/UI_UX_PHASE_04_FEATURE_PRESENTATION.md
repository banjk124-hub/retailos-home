# UI-04 — Feature Presentation Migration

**Status:** UI-04 discovery and source baseline completed; implementation slices not yet started.
**Branch:** refactor/ui-04-feature-presentation
**Base:** main after UI-03 merge 7b679da9bbd3b3a21b50711a8b56be8ca14e2e54
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
| Settings | SettingsHub, nested Update Center, ScannerSettingsPanel | scanner-settings.css (6,975 B), imported by SettingsHub and ScannerSettingsPanel | Shared settings stylesheet name/ownership currently spans system update and scanner preferences |
| Scanner | BarcodeScanner, scanner hooks/services | scanner-transition.css (8,467 B), shared with StocktakeScanner | Camera/session/decoder/ROI lifecycle is protected; presentation-only scope |
| Stocktake | StocktakeModule, StocktakeScanner | stocktake.css (11,822 B) plus shared scanner transition CSS | Local persistence, revisions, history, export and camera handoff |
| Stocktake Import | StocktakeImportModule | stocktake-import.css (50,965 B) | Large feature-owned surface; parser precision, conflict review, dirty edits, persistence and export are protected |

The complete CSS inventory remains owned by UI-03's phase record. These figures are source-file bytes, not emitted transfer size or runtime cost.

## 3. Confirmed ownership observations

### 3.1 Login
- Root experience is src/features/auth/screens/LoginExperience.tsx.
- It imports two Login-specific stylesheets.
- Form, hero and dock are composed as feature components; the form uses existing shared Surface and Motion primitives.
- Ownership seam found: login-experience.css also defines .auth-journey-recognition selectors rendered by UnifiedIdentityView in App.tsx. The LoginExperience import currently makes those rules available; this is a cross-owner presentation dependency, not proof that the identity stage should be moved or split. Trace the root auth journey and CSS loading before changing it.
- Existing browser coverage: tests/browser/login-responsive.spec.ts checks desktop, tablet, mobile, compact mobile and short landscape, keyboard focus, 16px input sizing, reduced motion and power-conserve backdrop behavior. Extend rather than replace these assertions if the Login slice changes.
- Keep local employee validation, employee/department preview, submitting/error/success states, identity recognition handoff and session behavior unchanged.
- Preserve keyboard and screen-reader feedback.

### 3.2 Settings
- SettingsHub.tsx owns the Settings entry surface and nested Update Center.
- It imports scanner-settings.css, which is also imported by ScannerSettingsPanel.tsx.
- The stylesheet currently covers both Settings/Update Center and Scanner preference presentation. This is a real ownership seam to trace, not sufficient evidence to split the file blindly.
- Preserve PWA update staging/consent/activation blockers, deferred state, focus restoration, body-scroll lock and persisted scanner preferences.

### 3.3 Scanner
- Home Scanner is BarcodeScanner.tsx; Stocktake uses a separate StocktakeScanner.tsx.
- Both consume scanner-transition.css; both use the established useScannerEngine hook.
- Shared transition styling does not imply the two scanner surfaces should be collapsed into one component.
- Do not change camera acquisition gesture, camera lease/session, worker/decoder, ROI geometry, health/focus recovery, scanner settings or scanner feedback as part of presentation migration.
- Scanner stabilization remains closed; reopen engine internals only for a reproducible defect, measured bottleneck or new requirement.

### 3.4 Stocktake
- StocktakeModule.tsx owns the operational workflow and imports feature-local stocktake.css.
- StocktakeScanner.tsx is a separate camera surface with shared scanner transition styling.
- Preserve session/zone/revision semantics, local persistence, action logs, edit/review/export flow, update blockers and scanner exit gate.

### 3.5 Stocktake Import
- StocktakeImportModule.tsx owns a large feature-local UI and imports stocktake-import.css (50,965 bytes).
- It contains import review, conflict handling, zone navigation, editable rows, dirty-state protection, output preview, copy/download/ZIP and history surfaces.
- Preserve parser/precision, duplicate detection, merge decisions, IndexedDB history, dirty-edit gating, export formats and update blockers.
- Do not split this stylesheet or component solely to reduce line count; first establish a stable presentation boundary and testable contracts.

## 4. Implementation sequence

Deliver each slice independently, with source trace, focused tests, browser evidence and documentation reconciliation.

1. **UI-04A — Login presentation boundary**
   - Source audit completed: Login composition, two stylesheet imports, shared Surface/Motion usage and the App-owned identity-stage selector dependency are traced.
   - Next: decide whether the identity-stage CSS should remain journey-owned or be relocated with its App-owned view; do not split it unless this improves loading/ownership without changing cascade or first-paint behavior.
   - Extend the existing Login responsive browser test only for a demonstrated gap; preserve auth, identity, responsive, focus and motion contracts.
2. **UI-04B — Settings and Update Center**
   - Trace all consumers of scanner-settings.css.
   - Decide whether shared ownership is semantically valid or whether system settings and scanner preferences need separate feature-owned stylesheets.
   - Preserve update lifecycle and scanner preference persistence.
3. **UI-04C — Scanner presentation**
   - Audit the shared transition stylesheet and the distinct Home/Stocktake scanner compositions.
   - Keep engine, camera, worker and decoder untouched.
4. **UI-04D — Stocktake presentation**
   - Audit view/state-to-presentation mapping and CSS ownership.
   - Preserve all operational and persistence contracts.
5. **UI-04E — Stocktake Import presentation**
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
- UI-04 branch is based on that merged main commit.
- Discovery and source baseline are recorded above.
- No application source or runtime behavior has been changed in UI-04 yet.
