# Project context — RetailOS

## Product intent
RetailOS is a mobile-first operational PWA for a supermarket branch. It aims to consolidate operational modules into one coherent workspace while using lightweight/free infrastructure where possible. Users are operational subject-matter experts; explanations and implementation steps should be explicit and practical.

## Known stack
- React 18, TypeScript, Vite 6.
- PWA / service worker and GitHub Pages deployment.
- Google Sheets and Google Apps Script are existing data/backend components.
- IndexedDB snapshots/offline-first data paths exist in the codebase.
- Barcode/camera scanning and notification paths exist in the codebase.
- Primary development environment is Windows with VS Code and PowerShell.
- Repository historically used GitHub Pages base path `/retailos-home/`; always verify the current config before relying on this.

## Product constraints
- Preserve working production behavior. Prefer a clone/branch for experiments.
- Avoid infrastructure cost and unnecessary services.
- Avoid broad rewrites that risk data contracts or production workflows.
- Avoid repeated polling when an event, scheduled refresh, or snapshot can meet the requirement.
- Incremental writes are preferred over whole-sheet rewrites where AppSheet/sync cost matters.
- Mobile is primary, but desktop should be deliberately supported.

## Communication
- Vietnamese is the default language for user-facing implementation reports.
- Explain technical decisions with exact files/commands and distinguish known facts from assumptions.
- Do not ask the user to provide OAuth secrets in chat.
- The user expects architecture-level reasoning, not cosmetic patches presented as a complete redesign.
