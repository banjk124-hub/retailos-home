# RetailOS Login UX — Phase 2

## Implemented
- Restored the Login visual language to RetailOS red, white and neutral tones; removed the dark-panel interpretation.
- Removed the remember-account checkbox and its Login flow persistence calls. Existing device session persistence remains owned by `sessionStore` in `App.tsx`.
- Removed the employee greeting sentence. When a code matches the local employee directory, the Login form now reveals the configured department icon, employee name and department label/tagline with a short entrance animation.
- Removed the duplicate department identity presentation from the Hero.
- Tightened form and dock spacing.
- Changed the Login panel focus behavior to animate the panel subtly as well as the input surface.
- Added an animated energy sweep and gradient movement to the submit button while authenticating.
- Retained existing authentication and WorkspaceTransition behavior.

## Files changed
- `src/features/auth/screens/LoginExperience.tsx`
- `src/features/auth/components/LoginForm.tsx`
- `src/features/auth/components/LoginHero.tsx`
- `src/styles/login-experience.css`

## Verification
- `node node_modules/typescript/bin/tsc -b --pretty false`: PASS.
- Vite production build: NOT VERIFIED. The provided environment lacks `@rollup/rollup-linux-x64-gnu`.
- iOS Safari / Android Chrome visual QA: NOT PERFORMED.

## Not included in this phase
- A global Liquid Glass engine.
- A system-wide animated icon engine.
- A complete global navigation/dock redesign.
- A new photographic background asset manager.
- Home redesign.
