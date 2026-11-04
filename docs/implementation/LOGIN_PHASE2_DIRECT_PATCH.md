# RetailOS Login Phase 2 — direct source implementation

Based on the latest uploaded `retailos-home(3).zip`.

## Changes implemented
- Replaced the entire `login-experience.css` stylesheet with a single coherent Login stylesheet instead of appending another override layer.
- Rebuilt the mobile Login composition around dynamic viewport height (`100dvh`/`100svh`), compact Hero hierarchy, safe-area padding and a focused form-first layout.
- The mobile utility dock is dark layered Liquid Glass, has stronger contrast, and hides while the employee-code input is focused so it cannot compete with the keyboard.
- Removed the employee-code reveal/eye button and custom WebKit text masking. The employee code remains a string (`type=text`, numeric keyboard), preserving leading zeros and avoiding password-reveal semantics.
- Changed the employee-code leading icon to a user identifier icon.
- Removed redundant static session/managed-account notes and helper copy from the Login form.
- Added a reserved feedback slot for validation/success states to reduce layout movement.
- Added a 120ms paint window before local authentication so the submitting state can be painted before synchronous local validation runs.
- Added a branded full-screen RetailOS transition after actual successful local authentication. The existing authentication and session contracts remain in place.
- Kept the existing background registry and bundled photographic assets unchanged.

## Files changed
- `src/App.tsx`
- `src/features/auth/screens/LoginExperience.tsx`
- `src/features/auth/components/LoginForm.tsx`
- `src/styles/login-experience.css`

## Preserved
- `authenticateLocally`
- employee directory and department lookup
- last-login-name preference behavior
- session store and Home navigation
- background registry and bundled assets
- Apps Script/data services, scanner, notifications, PWA and service worker

## Validation
- Source-level checks confirmed there are no remaining `showCode`, `onToggleCodeVisibility`, `login-form__reveal`, or `hasRememberedAccount` references in the Login feature.
- The replacement Login stylesheet has balanced CSS braces.
- `tsc --noEmit -p tsconfig.app.json` was attempted but could not complete because the extracted archive does not contain installed dependencies/type packages (`react`, `react-dom`, `node`, and others). An `npm ci` attempt did not complete in this environment.
- Production build and real-device browser QA have therefore NOT been claimed as passed.
- No deployment, Git push, or commit performed.

## Local validation
From the project root:
1. `npm ci`
2. `npm run build`
3. `npm run dev -- --host 0.0.0.0`

Then test on iPhone Safari and Android Chrome, including keyboard-open state and successful/failed authentication.
