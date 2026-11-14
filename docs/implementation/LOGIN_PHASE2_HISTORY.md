# RetailOS Login UX — Phase 2 history

This file consolidates two unreferenced Phase 2 Login records. They describe separate implementation snapshots and remain distinct so their verification evidence is not conflated. This is historical documentation, not a statement that every item remains current.

## Snapshot A — Login UX Phase 2 changelog

### Implemented
- Restored Login visual language to RetailOS red, white and neutral tones; removed the dark-panel interpretation.
- Removed the remember-account checkbox and its Login persistence calls. Device session persistence remains owned by `sessionStore` in `App.tsx`.
- Removed employee greeting sentence. A matching local employee reveals configured department icon, employee name and department label/tagline with a short entrance animation.
- Removed duplicate department identity presentation from Hero.
- Tightened form and dock spacing.
- Changed Login panel focus behavior to animate the panel and input surface.
- Added animated energy sweep and gradient movement to the submit button while authenticating.
- Retained existing authentication and WorkspaceTransition behavior.

### Files recorded
- `src/features/auth/screens/LoginExperience.tsx`
- `src/features/auth/components/LoginForm.tsx`
- `src/features/auth/components/LoginHero.tsx`
- `src/styles/login-experience.css`

### Verification recorded
- `node node_modules/typescript/bin/tsc -b --pretty false`: PASS.
- Vite production build: NOT VERIFIED; recorded environment lacked `@rollup/rollup-linux-x64-gnu`.
- iOS Safari / Android Chrome visual QA: NOT PERFORMED.
- Not included: global Liquid Glass engine, system-wide animated icon engine, complete global navigation/dock redesign, photographic background asset manager or Home redesign.

## Snapshot B — direct source implementation from uploaded archive

**Source basis:** uploaded `retailos-home(3).zip`. Its archive-based validation limitations must not be merged with Snapshot A's TypeScript result.

### Changes recorded
- Replaced `login-experience.css` with a single coherent Login stylesheet instead of appending another override layer.
- Rebuilt mobile Login around dynamic viewport height (`100dvh`/`100svh`), compact Hero hierarchy, safe-area padding and a form-first layout.
- Styled mobile utility dock as dark layered Liquid Glass and hid it while employee-code input was focused.
- Removed employee-code reveal/eye button and custom WebKit text masking. Employee code remained a string (`type=text`, numeric keyboard), preserving leading zeros and avoiding password-reveal semantics.
- Changed employee-code leading icon to a user-identifier icon.
- Removed redundant static session/managed-account notes and helper copy.
- Added reserved validation/success feedback slot to reduce layout movement.
- Added a 120 ms paint window before local authentication so submitting state could render before synchronous local validation.
- Added branded full-screen transition after successful local authentication.
- Kept existing background registry and bundled photographic assets unchanged.

### Files recorded
- `src/App.tsx`
- `src/features/auth/screens/LoginExperience.tsx`
- `src/features/auth/components/LoginForm.tsx`
- `src/styles/login-experience.css`

### Preserved contracts
- `authenticateLocally`, employee directory and department lookup.
- Last-login-name preference behavior, session store and Home navigation.
- Background registry/assets, Apps Script/data services, scanner, notifications, PWA and service worker.

### Verification recorded
- Source-level checks found no remaining `showCode`, `onToggleCodeVisibility`, `login-form__reveal` or `hasRememberedAccount` references in Login feature.
- Replacement stylesheet had balanced CSS braces.
- `tsc --noEmit -p tsconfig.app.json` could not complete because extracted archive lacked installed dependencies/type packages; `npm ci` did not complete in that environment.
- Production build and real-device QA were NOT claimed as passed.
- No deployment, Git push or commit was performed in that archive-based workflow.

### Local validation procedure recorded
1. `npm ci`
2. `npm run build`
3. `npm run dev -- --host 0.0.0.0`
4. Test iPhone Safari and Android Chrome, including keyboard-open and successful/failed authentication states.
