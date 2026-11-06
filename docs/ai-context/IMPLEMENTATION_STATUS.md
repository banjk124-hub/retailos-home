# Implementation status

Last updated: 2026-11-06

## Local preflight tooling — implementation branch `tooling/local-preflight`
- Added `npm run preflight` backed by `scripts/preflight.mjs`.
- The runner executes, in order: `npm run build`, `npm run build:pages`, `git diff --check`, and `git diff --cached --check`. It stops on the first non-zero exit and returns a failing process code.
- Added `.github/workflows/ci.yml`: GitHub Actions runs `npm ci` and `npm run preflight` for pull requests targeting `main` and pushes to `main`.
- No new dependencies; `package-lock.json` is unchanged.
- First user Local run passed both builds and both diff checks on Windows/Node v24.16.0. It emitted Node DEP0190 because the runner used `shell: true`; the runner has now been patched to invoke npm's CLI through `process.execPath` and run all commands with `shell: false`. The patched version still requires a fresh Local run. This branch is prepared for local checkout and verification; do not merge until the user confirms.
- This preflight does not replace manual UI, browser, camera, offline, or real-device QA. It also does not inspect untracked-file contents or guarantee the working tree is safe to commit.
- Next action: user checks out this branch, preserves and inspects existing local untracked files, runs `npm run preflight`, and reports the complete output. Fix any failure on this branch before PR/merge.

# Implementation status

Last updated: 2026-11-04

## Baseline observed
- Branch: `main`.
- The working tree already contained uncommitted Home/module-library, CSS, and documentation changes before this implementation. Those changes were preserved and integrated rather than reverted.
- Available validation scripts are `npm run build` and `npm run build:pages`; `package.json` has no test or lint script.

## Native Liquid Glass foundation
- Added bundled supermarket photography under `public/assets/backgrounds/` and a shared background registry with configurable defaults for Login, Home, and a scanner experience.
- Added shared presentation components for background rendering and state-aware Lucide icon motion.
- Applied the photo backgrounds to Login and Home; added glass material variants, adaptive dock styling, touch feedback, reduced-motion support, and lower-cost glass effects for conserve-power mode.
- Kept local authentication, session, scanner, snapshot, navigation, service-worker, and deployment contracts unchanged.

## Login experience rebuild
- Replaced the previous LoginScreen layout with a dedicated LoginExperience screen and separate Hero, Form, and Help Dock components.
- Preserved `authenticateLocally`, employee lookup, department validation, session creation, and last-login-name storage. Added an opt-out checkbox that removes only the remembered name; the employee code is never saved.
- Login no longer checks or requests camera/notification permissions. Camera access remains feature-triggered by barcode scanning. Push opt-in is initiated from the Home notification popover, only when push configuration exists.
- Removed the obsolete LoginScreen and dedicated `login.css`, `login-refresh.css`, and `login-phase3.css` stylesheets; removed stale auth selectors from shared theme, appearance, interaction, and glass styles.
- Added responsive safe-area/keyboard layouts, reduced-motion behavior, error/success feedback, focus and press states, and a short Login-to-Home transition.
- Tightened the employee-code field to preserve the masked visual state without treating the code as a browser password input, and stabilized the form body so validation/status messages do not shift the layout while authenticating.

## Validation
- `npm run build`: passed on 2026-11-02 after the Login-field fix; TypeScript and Vite production build completed.
- `npm run build:pages`: passed; Pages-prefixed background asset paths and bundled images confirmed in `dist`.
- `git diff --check`: passed.
- No automated test or lint script is defined in `package.json`.

## Known limitations
- Real Android/iOS device QA remains unverified. Local Edge headless screenshots were captured at 320×740, 390×844, and 1440×900; this does not reproduce device-specific browser chrome, keyboard, touch, or safe-area behavior.
- The scanner background preset is registered but intentionally not loaded by the scanner, avoiding extra work on the camera-open path.
- Service-worker precaching was not changed; the image files are bundled in the deployed app, but first-visit offline availability was not verified.
- No deployment, Git push, or commit was performed.

## Cross-platform Home refinement
- Updated `src/styles/home-architecture.css` so module library cards use the shared glass surface, border, shadow, and blur tokens used by the light appearance.
- Added an opaque token-based fallback when `backdrop-filter` is unavailable.
- Added left/right safe-area insets to the mobile content and floating navigation, while keeping the existing navigation and content-clearance behavior.
- Preserved Home JSX, module IDs, navigation handlers, business state, and data contracts.
- Validation on 2026-11-02: `npm run build` passed (TypeScript plus Vite production build); `git diff --check` passed for tracked changes. Real-device visual QA remains outstanding.

## Login viewport QA
- Captured and inspected the running local app in Edge headless at 320×740, 390×844, and 1440×900.
- Mobile screenshots exposed horizontal clipping and excessive vertical separation between the Login hero and form. Constrained the mobile grid to a single `minmax(0, 1fr)` column, placed the form directly after the hero, bounded the panel and dock, allowed dock identity content to shrink, and hid the nonessential workspace badge at narrow widths.
- Desktop Login remained balanced in the 1440×900 capture. Authentication was not submitted; Home UI and real device behavior were not asserted.
- Validation on 2026-11-02: `npm run build` and `git diff --check` run after the viewport fix.

## Removing dark appearance
- Removed the Home appearance-mode control and its theme preference props; authentication, navigation, and other Home controls are unchanged.
- The adaptive appearance hook now pins the app root to the light theme regardless of OS color-scheme or old saved preference, removes the obsolete `retailos.appearance.v1` value, and retains battery/reduced-motion/device-based power conservation.
- Removed dark-theme CSS overrides from the shared theme, Login, Home, modal, dock, and background styles; light-mode notification states and glass fallbacks remain.
- Validation on 2026-11-02: `npm run build` passed; all 16 CSS files parsed with no dark selectors, dark color scheme, or dark OS theme media; no dark-mode controls remain; browser emulation confirmed OS dark preference and a previously saved dark setting still render with `data-theme="light"` and `color-scheme: light`, and the obsolete preference is cleared.

## Replacing legacy brand assets
- Added a reusable SVG RetailOS R monogram and updated the shared wordmark, Home spotlight/footer/notification branding, PWA icon, manifest theme color, and experience background registry to use the same identity.
- Replaced the previous photo/scene rendering with CSS light geometry and animated brand-mark treatments; Login hero typography now uses dark, readable text against the warm-white backdrop.
- Bumped the service-worker shell cache version with the PWA icon update and removed verified-unused supermarket images/scene assets. No authentication, session, module, or data contracts changed.
- Validation on 2026-11-02: `npm run build` and `npm run build:pages` passed; `git diff --check` passed. Chrome headless screenshots were captured and viewed at 390×844 and 1440×900. Real iOS/Android hardware and authenticated Home flows were not tested.

## Liquid Glass material engine — Phase 1
- Added `src/shared/components/glass/` as the shared material API: `GlassSurface`, typed material/tone definitions, centralized CSS tokens, and material/state/fallback styles for soft, frosted, elevated, floating, control, and dark variants.
- Migrated Login panel, employee recognition, employee-code input, primary submit, utility dock, help control, and help surface to `GlassSurface`; migrated the Home module library, mobile dock, and existing push-settings control without changing handlers or business state.
- Moved the glass token source out of `theme.css`; removed legacy `ro-glass` and `ro-button--glass` definitions/usages. Login stylesheet retains component geometry and state layout, not material definitions.
- Corrected legacy white Login hero/brand overrides to ink/red for readable contrast on the current warm-white background; layout and authentication behavior are unchanged.
- Validation: `npm run build` passed (`tsc -b` and Vite production build); `git diff --check` passed. Chrome headless preview was captured and inspected at 390×844 and 1440×900; CDP confirmed no horizontal overflow at 390px and the mobile panel/dock remain inside the viewport.
- Limitations: no real iPhone Safari or Android Chrome device was available; the browser inspection did not submit authentication. Some non-migrated Home surfaces still consume compatibility glass tokens and should move to `GlassSurface` only in a later, separately scoped pass.

## Motion Orchestration Engine — Phase 2
- Added `src/shared/motion/` as the shared motion owner: configuration, duration/easing/spring/distance tokens and presets, reduced-motion preference hook/provider/boundary, page/presence/card/button/sheet primitives, and shared transitions. `MotionIcon` now accepts idle, hover, pressed, active, loading, success, and error states.
- Integrated page/presence/button/icon motion into Login; integrated card motion into the module library and trigger-origin sheet/backdrop transitions into Home. Module IDs, navigation handlers, authentication/session services, and data contracts remain unchanged.
- Centralized motion CSS variables and keyframes in `src/shared/motion/motion.css`; retained compatibility aliases for existing consumers. Removed `src/styles/motion.css` after verifying its legacy keyframes had no consumers. No animation dependency was added.
- Fixed reduced-motion precedence over power-conserve mode. Chrome emulation confirmed standard duration is `.15s` in conserve mode and `1ms` with reduced motion enabled at the same time.
- Stabilized Login employee-identification and feedback slots. Chrome at 320×740 confirmed the submit button's position and dimensions remain unchanged through idle, submitting, and invalid-credential error states; invalid code did not authenticate or enter success.
- Validation: `npm run build` passed (`tsc -b` and Vite production build); `git diff --check` passed. Chrome headless viewport emulation at 320×740, 390×844, and 1440×900 reported no horizontal overflow.
- Limitations: no real iPhone Safari or Android Chrome device was available. A valid authentication, authenticated Home module opening/dismissal, and native-device gestures were not exercised. `package.json` defines no automated test or lint script.

## Brand Identity & Animated Icon Engine — Phase 3
- Pre-flight: verified the Phase 2 motion primitives and current Glass consumers; baseline `npm run build` passed before edits. Retained the installed `lucide-react` foundation and existing red/white PWA SVG; did not add icon packages or change manifest/service-worker asset paths.
- Added `src/shared/brand/` with shared `Brand`, `BrandMark`, `BrandWordmark`, and `BrandMotion` components plus brand configuration/types/styles. Supports full, compact, symbol, splash, light/dark surface, and horizontal/stacked layouts. Login, Home, workspace transition, and background now consume the shared brand components.
- Added `src/shared/icons/` with an accessible size/stroke-normalizing `Icon`, shared `MotionIcon` export, size presets, and exhaustive mappings for existing department, module, library, and Home navigation IDs. Unmapped departments/modules/libraries use neutral generic icons.
- Extended the existing `MotionIcon` (not duplicated) with the disabled state and centralized hover/press/active, bell, arrow, scan, loading, success, and error motion in `src/shared/motion/motion.css`. Motion uses the existing tokens and reduced-motion behavior; removed redundant icon animation rules from `native-experience.css`.
- Migrated Login employee recognition, form and dock icons; Home department/navigation/notice icons; and module/library cards to the central icon engine. Employee directory entries, department/module IDs, auth/session services, module actions and data contracts remain unchanged; presentation-only icon metadata is owned by the shared registry.
- Removed old `src/shared/components/Brand.tsx` and `BrandMark.tsx` after migrating all consumers. PWA `public/icon.svg`, manifest and service worker were not changed because the existing SVG already uses the same RetailOS R mark and still returns HTTP 200.
- Validation: baseline and final `npm run build` passed (`tsc -b` plus Vite; 1,883 modules); `npm run build:pages` passed with `/retailos-home/` base and PWA icon path verified; `git diff --check` passed. Focused registry checks confirmed every current department/module/library/navigation ID has an icon and each generic fallback resolves.
- Chrome production preview: no horizontal overflow at 320×740, 390×844, or 1440×900; inspected mobile/desktop screenshots; confirmed accessible RetailOS logo label, 2px icon strokes, recognized employee/department presentation from the existing directory without submitting Login, and reduced-motion disabling brand/icon animations. Manifest and SVG icon returned HTTP 200.
- Limitations: no real iOS/Android device was available; the authenticated Home shell/module-open interaction was not exercised. No automated test/lint script exists. No PWA assets, package dependencies, deployment, push, or commit were changed.

## Liquid Dock Engine — Phase 4
- Pre-flight: confirmed the existing Glass material API, Motion tokens/provider, Brand/Icon registry, and the actual Login/Home dock consumers. The baseline `npm run build` passed before edits.
- Added `src/shared/navigation/` with a reusable `LiquidDock`, item and indicator primitives, typed item/action inputs, and a dock interaction hook. The dock uses the existing `GlassSurface` floating material, Motion tokens/preferences, and shared `MotionIcon`; no library or dependency was added.
- Replaced the single Home mobile/desktop dock with `LiquidDock`. Home continues to supply the existing navigation IDs and actions, and the barcode scanner remains a distinct center action. Scroll position now synchronizes the active Home/Module/Activity indicator; the Settings notice remains a notice rather than falsely becoming an active route.
- Added a spring-like translated indicator with directional edge deformation and settling, active/disabled icon states, touch feedback, keyboard arrow/Home/End focus movement, focus-visible feedback, mobile safe-area layout, and hiding while an editable field is focused or the existing Home chrome is idle. Reduced-motion and conserve modes disable indicator movement; dock material uses the existing fallback when backdrop-filter is unsupported.
- Preserved LoginDock as its own utility/help dock: it is not primary navigation, and its authentication/help behavior was not changed. Home has one primary dock; `PageGlassDock` remains only a decorative, aria-hidden scene element.
- Removed the replaced dock-specific styling from `home-engine.css`, `home-ux.css`, `home-architecture.css`, and `native-experience.css`; removed the unused scanner sweep animation from `motion.css`. Some older generic `.mobile-nav` selectors remain in unrelated legacy CSS, but no rendered component uses that class; broad CSS cleanup remains out of scope.
- No source file was deleted, no business/module IDs or data/auth/session contracts changed, and no dependency, PWA, Vite, Pages, or deployment configuration changed.
- Validation: baseline `npm run build` passed before edits. Final `npm run build` and `npm run build:pages` passed (`tsc -b` and Vite, 1,889 modules); `git diff --check` passed; search confirmed no rendered-source references to the retired `.mobile-nav`/`.barcode-nav-item` implementation.
- Limitations: no authenticated Home browser session was available, so dock selection, keyboard behavior, keyboard-open hiding, and viewport layout were not exercised in a browser. Real iOS/Android QA was not performed. `package.json` has no automated test/lint script.

## Authentication journey — Phase 5
- Confirmed the actual app authentication boundary: `App.tsx` owns the session gate, `LoginExperience.tsx` fires the real `authenticateLocally` flow, and `sessionStore.ts` persists only the signed-in identity. No backend or auth service replacement was introduced.
- Updated the app shell to implement a multi-stage authentication journey: employee credential submit -> recognition stage -> branded splash -> Home. The recognition stage reads the authenticated session data and the actual resolved department metadata before Home renders; the employee code is never treated as a password and the session contract remains unchanged.
- Added a brief, controlled recognition and splash transition in `src/App.tsx`, using the existing `Brand`, `BrandMotion`, `MotionIcon`, and `MotionProvider` motion state to protect reduced-motion behavior. The app still renders `HomeScreen` only after the real authenticated session is established and not by a simulated success state.
- Wired the last-login storage to persist the successful employee name and clear it on logout, so the session and remembered identity flow remain consistent without introducing new infrastructure.
- Reduced the artificial Login success handoff delay and kept the button action, validation, duplicate-submit guard, and error handling as the existing real flow. There is still no test/lint script in `package.json`.
- Validation: `npm run build` passed, and `npm run build:pages` passed after the journey changes. `git diff --check` was not run in this pass; no automated test script exists.
- Limitations: real device/browser QA remains unverified; the recognition stage and splash were validated by source inspection and production build completion, not by live Safari/Chrome device testing.

## Unified motion / identity transition refinement
- Consolidated the auth handoff to a single identity stage before Home entry rather than two separate recognition and splash screens, preserving a clear source->destination relationship while reducing perceived fragmentation.
- Centralized motion lifecycle metadata in the shared motion layer (`press`, `activate`, `travel`, `reveal`, `hold`, `settle`, `exit`) and wired it into `MotionPage`, `MotionPresence`, `MotionButton`, and `BrandMotion` to keep timing and visual hierarchy consistent across the app.
- Kept the real auth flow and session contract intact. The app still saves session after successful local auth and never simulates a fake success state.
- Validation: final `npm run build` and `npm run build:pages` both passed.

## Phase 5.2 — Browser visual QA
- Ran the app at `http://127.0.0.1:5173/` in Playwright 1.64.1 with headless Chromium 156.0.8078.4. Used an existing active employee fixture through the real local authentication flow; no fixture values or credentials were written to reports.
- Captured Login and Home at 320×740, 360×800, 390×844, 430×932, 768×1024, and 1440×900. All 12 viewport checks reported no horizontal overflow or panel/dock clipping. Screenshots mask employee identity fields.
- Exercised valid and invalid Login, numeric-only code filtering, stable button geometry while loading, source-to-identity reveal, session availability at Identity, single Home render, approximately 1.34 s identity hold, Home arrival, logout/session clearing, and logout during Home entrance.
- Verified dock Home/Module/Activity navigation, indicator movement (slot 0 to 3), rapid repeated selection, notification menu, desktop calendar sheet, card-to-sheet origin, Escape dismissal/focus return, and reduced-motion authentication. All completed; reduced-motion identity duration was 1 ms.
- Corrected the Identity reveal after visual inspection showed `150vmax` completed the visible expansion too early. `App.tsx` now computes the radius needed to reach the farthest viewport corner from the pressed Login button; `login-experience.css` consumes that value. Re-tested the source anchor and viewport coverage at all six sizes. The first anchor assertion compared against the idle button rectangle; the button moves while pressed, so the final report measures the actual pressed rectangle and passes at every size.
- Corrected Home horizontal overflow at tablet/desktop widths, expanded constrained desktop spotlight content, fixed employee-code non-digit filtering, and synchronized Activity selection at the page bottom. The existing auth/session service and module/data contracts were not changed.
- Browser reports: [comprehensive QA](../../artifacts/ui-qa/phase-5.2/reports/phase-5.2-browser-qa-20261102T184640950Z.json), [transition frame measurements](../../artifacts/ui-qa/phase-5.2/reports/phase-5.2-transition-frames-20261102T185023580Z.json), and [six-viewport auth anchor QA](../../artifacts/ui-qa/phase-5.2/reports/phase-5.2-auth-viewport-qa-20261102T185235526Z.json). The viewport QA includes the source/destination geometry and confirms the dynamic radius covers each viewport.
- Captured 28 comprehensive screenshots, 5 precise transition screenshots, and 6 per-viewport auth-anchor screenshots under `artifacts/ui-qa/phase-5.2/screenshots/`. Saved the Login viewport Playwright trace at `artifacts/ui-qa/phase-5.2/traces/login-viewports-20261102T184640950Z.zip`; it contains no authenticated identity or credentials.
- Final validation after the reveal-radius change: `npm run build` passed (TypeScript plus Vite, 1,890 modules); `npm run build:pages` passed (Pages base, 1,890 modules); `git diff --check` passed. The browser runs reported zero console errors and zero page errors. No test or lint script exists in `package.json`.
- Limitations: QA was in desktop Chromium with emulated viewports, not real iPhone Safari or Android Chrome hardware. Native browser chrome, keyboard, touch, and device safe-area behavior remain unverified. No deploy, push, or commit was performed.


## 2026-11-05 — Scanner foundation and project continuity (in progress)
- Reviewed current `main`: `3c75f4886c2adeeaa216fd030f11f3bf8b5fd198`.
- Created isolated work branch: `phase/1.2-scanner-foundation-and-project-continuity`; no merge or deployment performed.
- Confirmed source risks: scanner start only guards while startup is pending, not when a decoder is already attached; lifecycle events can request overlapping restarts; decoder has no explicit whitelist for EAN-13/EAN-8/CODE-128; decoded text is passed directly to the feature callback without a format/payload validation boundary.
- Confirmed `package.json` has `build` and `build:pages` but no test/lint script. `@zxing/browser ^0.2.1` is declared; do not import ZXing transitive symbols without confirming package exports/dependency graph.
- Governance objective: establish repository-based AI handoff, phase roadmap, decision log and session protocol so a different AI/chat can continue from source-controlled state.
- Verification limitation: this session has inspected GitHub source only. It has not inspected the user's local working tree, run npm scripts, run tests, or performed real Android/iOS device QA. Do not mark implementation or validation complete until those checks occur.
- Next action: implement Phase 1.2A correctness/lifecycle in small increments; inspect local `git status --short` and baseline before local checkout; validate with tests/build; update this record with exact evidence.


## Phase 1.2 — Scanner foundation and cross-AI continuity

### Phase roadmap and acceptance gates
**1.2A Correctness/lifecycle (current slice)**
- Explicitly whitelist EAN-13, EAN-8, CODE-128.
- Validate decoded format/payload before callbacks; preserve CODE-128 as string.
- Prevent concurrent decoder attachment; coalesce lifecycle restarts; stop single-scan decoder even when the first result arrives before decoder controls are assigned.
- Reject stale async work after close/pause and preserve existing Home/Stocktake contracts.
- Acceptance: branch builds; local regression checks; Android Chrome and iOS Safari camera QA; no duplicate decoder, stale callback, or duplicate single-mode callback.

**1.2B Camera performance/diagnostics**
- Measure acquisition, video readiness, decoder attach, first valid scan, resume latency and actual track settings.
- Compare 960x540 and 1280x720 plus decode intervals around 100/120/150 ms on representative devices. Do not change current values based on assumption alone.

**1.2C Audio and continuous scan**
- Keep audio optional and non-blocking; beep only after accepted result.
- Define same-code lockout separately from persisted data deduplication. Preserve duplicate Stocktake records.
- Keep Home/Stocktake single mode until continuous mode is tested.

**1.2D Regression/release**
- Verify Home cached lookup; Stocktake form-fill/explicit save; duplicate rows; manual entry; permission denied/dismissed/revoked; background/foreground; focus/pageshow; close while camera request is pending; ended track.
- Run `npm run build`, `npm run build:pages`, targeted tests and `git diff --check`.
- User performs local verification and explicitly approves merge/deploy.

### 2026-11-05 — Current branch handoff
- Branch: `phase/1.2-scanner-foundation-and-project-continuity`.
- Base main: `3c75f4886c2adeeaa216fd030f11f3bf8b5fd198`.
- Source changes on branch: decoder-active guard; centralized `SUPPORTED_BARCODE_FORMATS` whitelist for EAN-13/EAN-8/CODE-128; format-specific payload validation; stop-after-attach handling for the single-scan callback race; `@zxing/library ^0.23.0` declared as a direct dependency and lockfile root dependency.
- Documentation changes: `AGENTS.md` cross-session operating rules; `AI_HANDOFF.md` canonical AI entry point; `PROJECT_CONTEXT.md` product context/session protocol; `ARCHITECTURE.md` scanner invariants and accepted ADRs; `ROADMAP.md` phase scope/acceptance gates; `SESSION_LOG.md` chronological handoff; this file contains verified implementation status.
- Validation: GitHub compare confirms branch is ahead of main with no divergence at review time. Source diff was inspected. No local npm install, TypeScript build, Pages build, automated tests, or physical-device QA has been run by this remote GitHub session. The branch is prepared for local verification; do not call Phase 1.2A complete until those checks pass.
- Known remaining work: add focused automated tests for validator and lifecycle races using the repository's installed tooling; inspect cameraSession ownership/race behavior; then measure performance and handle track-ended recovery in later slices. A separate `DECISIONS.md` was not created because the GitHub Contents create-file action returned HTTP 422 (`sha` missing); accepted decisions are consolidated in `ARCHITECTURE.md` for now.
- Next action for local checkout: fetch branch, inspect `git status --short` before switching, install dependencies if needed, run `npm run build` and `npm run build:pages`, exercise scanner on Android/iOS, report any failures for a minimal patch. Do not merge until verification is accepted.


## Phase 1.2E — Scan confirmation feedback (2026-11-05)
- Branch: phase-1-2e-scanner-feedback, based on pushed main commit ef7b6ff14e2cdfeeee24a7d6349f19b7b3405c1a.
- Added src/features/scanner/services/scannerFeedback.ts to coordinate optional audio and haptic confirmation after the scanner accepts a valid result.
- Raised the existing Web Audio gain target from 0.16 to 0.24. Tone frequency (1760 Hz), attack, and duration remain unchanged.
- Added a single 25 ms navigator.vibrate pulse when the API exists. Unsupported platforms, including iOS Safari when it does not expose the API, continue without blocking the scan callback.
- useScannerEngine now triggers the shared feedback service only after format validation and single/continuous acceptance checks. Haptics default on and can be disabled through the hook/BarcodeScanner option. Audio remains independently controlled by the existing audioFeedback option and gesture-unlock flow.
- No dependency, business contract, persistence, camera lifecycle, decoder interval, resolution, or PWA/deployment changes were made.
- Validation limitation: this remote GitHub implementation session cannot run the user's local npm scripts or physical-device QA. Do not mark Phase 1.2E complete until local build and Android/iOS behavior are checked.
- Local verification commands: npm run build, npm run build:pages, and git diff --check.
- Device QA: compare beep loudness at normal device volume; confirm one short vibration on supported Android; confirm iOS continues scanning without vibration errors; verify invalid/cooldown-blocked detections do not trigger feedback; verify Home and Stocktake behavior.
- Next step: user checks out this branch and runs local verification. Keep branch unmerged and undeployed.

### Local verification evidence — Phase 1.2E
- User checked out `phase-1-2e-scanner-feedback`; Git reported the branch tracks `origin/phase-1-2e-scanner-feedback` and was up to date.
- User ran `npm run build`: passed. TypeScript project build completed; Vite 6.4.4 transformed 1,899 modules and produced production assets.
- User ran `npm run build:pages`: passed. TypeScript project build completed; Vite 6.4.4 transformed 1,899 modules and produced GitHub Pages-base assets.
- User ran `git diff main...HEAD --check`: no output was reported, consistent with a clean whitespace/conflict-marker check.
- These results establish compile/build readiness only. No physical Android/iOS scanner feedback QA has yet been reported. No automated test script is currently defined.
- The initial `git status --short` showed untracked `artifacts/` and a path printed as `"tatus --short"`. Preserve both; inspect locally before any cleanup. They are not assumed to be part of this phase.
