# Copilot instructions

## Build, run, and validation

- Requires Node.js 20.19+ or 22.12+ and npm.
- Install dependencies with `npm ci` in a clean checkout.
- Start the Vite app with `npm run dev`; for LAN/mobile testing, use `npm run dev -- --host 0.0.0.0`.
- Build and type-check with `npm run build` (`tsc -b && vite build`).
- Build the GitHub Pages project-site artifact with `npm run build:pages`.
- Preview the production build with `npm run preview`.
- There is currently no lint script or automated unit-test runner. CI validates a clean install and production build before deploying.

## High-level architecture

- This is a Vite + React + TypeScript single-page app for a retail operations home/dashboard experience.
- `src/main.tsx` is the bootstrap entry: it mounts the React root, imports the global CSS layers, and registers the production service worker.
- `src/App.tsx` is the application coordinator: it owns the login/session flow, restores persisted session state, handles logout, tracks offline/install readiness, and decides whether the user sees the login screen or the Home screen.
- Feature boundaries are intentionally split:
  - `src/features/auth/`: login form, local prototype auth validation, employee directory, device permission requests, and session persistence.
  - `src/features/home/`: Home dashboard UI and its persistent navigation/search/filter/scroll state.
  - `src/features/scanner/`: reusable camera barcode scanner; it is not yet attached to a business module.
  - `src/features/notifications/`: client Web Push subscription flow; sending push still requires a backend.
  - `src/shared/`: reusable UI and shared configuration such as the department registry.
- The department registry in `src/shared/config/departments.ts` is the single source of truth for department IDs, labels, icons, taglines, and greeting metadata. Reuse it rather than duplicating department values in components or forms.
- Home UI state is intentionally separate from auth/session state. Persistent Home state is kept in `homeStateStore.ts` and is restored independently from the signed-in session.
- Styling is deliberately layered in `src/main.tsx`: `base`, `login`, `home`, `motion`, `responsive`, `theme`, `interactions`, then `mobile-tuning`. This ordering intentionally provides later overrides; check it before moving or adding CSS rules.
- The app behaves like a PWA: `public/manifest.webmanifest` defines install metadata, and `public/sw.js` provides the cached app shell/offline fallback. Production registration happens in `src/main.tsx`.

## Repository-specific conventions

- Keep `src/App.tsx` as the only app-level coordinator; avoid duplicate entry files or second app shells.
- Keep authentication and Home state separate. The session store should store only minimal session data and never persist the employee code or password.
- Treat the local auth layer as a frontend prototype, not a security boundary. `employeeDirectory.ts` contains frontend-visible demo accounts; do not use it to protect sensitive data.
- Preserve mobile safe-area behavior, touch target sizing, and reduced-motion support when updating layouts or animations.
- Keep GitHub Pages URLs base-path-aware. `build:pages`, the web manifest, and service-worker registration/cache paths must continue to work under `/retailos-home/`.
- When changing department IDs or labels, update the central registry and the corresponding TypeScript union in `src/features/auth/types.ts`.
- Any change to the cached app shell or service-worker behavior should be reviewed against `public/sw.js`; bump `CACHE_NAME` when cached shell behavior/content requires invalidation.
- The project history in `README.md` is useful context: the app is a prototype designed for UI flow, local session persistence, and PWA/mobile behavior rather than a production auth/backend implementation.
