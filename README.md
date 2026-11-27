# RetailOS

RetailOS is an internal retail-operations PWA built with React, TypeScript and Vite. This repository contains the frontend application; production authentication, business-data APIs and push delivery require separately deployed backend services.

## Start developing

Requirements: Node.js 20.19+ or 22.12+, and npm.

```powershell
npm ci
npm run dev
npm run build
```

For GitHub Pages path validation:

```powershell
npm run build:pages
npm run preview:pages -- --host 127.0.0.1
```

The production Pages workflow builds and deploys from `main`. Do not use production Pages as a branch preview. Review `.github/workflows/deploy.yml` and the release contract before changing build or deployment behavior.

## Product and platform contract

- Desktop and Mobile may have independent presentation roots and navigation while sharing business logic and data contracts.
- The default scope for a new workflow is shared Desktop + Mobile unless an approved decision says otherwise.
- Camera barcode scanning and camera-specific presentation are Mobile-only. Manual barcode lookup remains shared.
- Tablet remains review-required; do not infer product capability from viewport width.
- SH-01 authenticated-shell and platform presentation ownership is merged. Physical-device acceptance (PW-01) and measured CSS ownership migration (CSS-01) remain separate work.

The capability policy is owned by [PLATFORM_CAPABILITY_MATRIX.md](docs/ai-context/PLATFORM_CAPABILITY_MATRIX.md), with decisions in [DECISIONS.md](docs/ai-context/DECISIONS.md) and architecture invariants in [ARCHITECTURE.md](docs/ai-context/ARCHITECTURE.md).

## Technical documentation

Start with [docs/ai-context/INDEX.md](docs/ai-context/INDEX.md). It defines canonical document ownership and directs each task to the relevant contract.

| Need | Canonical document |
|---|---|
| Current verified state and open gates | [IMPLEMENTATION_STATUS.md](docs/ai-context/IMPLEMENTATION_STATUS.md) |
| Next-session continuation | [AI_HANDOFF.md](docs/ai-context/AI_HANDOFF.md) |
| Product context and durable constraints | [PROJECT_CONTEXT.md](docs/ai-context/PROJECT_CONTEXT.md) |
| Architecture decisions and invariants | [ARCHITECTURE.md](docs/ai-context/ARCHITECTURE.md) |
| Shell and platform presentation ownership | [SH-01_SHELL_PRESENTATION_OWNERSHIP.md](docs/ai-context/SH-01_SHELL_PRESENTATION_OWNERSHIP.md) |
| PWA update/release lifecycle | [PWA_RUNTIME_RELEASE.md](docs/ai-context/PWA_RUNTIME_RELEASE.md) |
| Scanner contracts | [SCANNER_ENGINE.md](docs/ai-context/SCANNER_ENGINE.md) |
| Stocktake Import contract | [STOCKTAKE_FILE_IMPORT.md](docs/ai-context/STOCKTAKE_FILE_IMPORT.md) |

## Important prototype and deployment limits

- Employee credentials currently live in frontend code and are not secure authentication.
- Real business-data synchronization requires an authenticated backend endpoint; never put shared secrets or private keys in `VITE_*` variables.
- Camera and notification permissions are controlled by the browser/OS and require user interaction.
- Physical iOS/Android, installed-PWA and lower-end device acceptance must be recorded separately from CI or emulated browser tests.
