# RetailOS project context — durable facts

**Repository:** `banjk124-hub/retailos-home`  
**Default branch:** `main`  
**Product and experience workflow:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)

- RetailOS is a React, TypeScript and Vite PWA for supermarket and retail operations.
- GitHub Pages project-site base path is `/retailos-home/`.
- Product intent: an OS-like operational workspace with retail-specific workflows and meaning; not an AppSheet reskin or generic admin dashboard.
- Development is source-first and cost-conscious. Preserve the current lightweight PWA architecture unless a measured requirement justifies a change.
- Current source and domain contracts are authoritative for implemented behavior. Documentation status and historical audit claims must be revalidated against the current branch before use.
- The repository contains established auth/session, module registry, snapshot/cache/offline, scanner, stocktake, import/export, overlay and PWA update/release boundaries. Consult their domain contracts before touching them.
- Scanner stabilization SC-00–SC-05 is closed. UI presentation work must not reopen scanner engine internals without a reproducible defect, measured bottleneck or new requirement.
- Development work occurs on isolated branches. Merge, deployment and production-account transfer are separate explicit approval gates.

## Owner-confirmed platform experience direction

RetailOS shares one brand identity and consistent business semantics, but Desktop, Tablet and Mobile are distinct product contexts—not merely responsive sizes of one interface. A workflow may be Desktop-only, Mobile-only or cross-platform; feature parity is not mandatory. Share domain/data/state and business rules where the underlying business operation is the same, while allowing platform-specific capabilities, shell/navigation, information architecture, layout, density and component composition. Responsive behavior adapts within each presentation; it does not force parity. Installed PWA experience should prefer standalone where supported; fullscreen/immersive behavior is conditional and must respect OS chrome, safe areas, viewport, keyboard, permissions and lifecycle. See PD-007 in DECISIONS.md and ADR-030 in ARCHITECTURE.md. This is target direction, not a claim that the current source already implements separate shells or a complete platform capability matrix.

## Current owner direction — experience and visual design

The owner has withdrawn previous global aesthetic constraints. No global visual style is currently selected. Do not assume minimal, Liquid Glass, burgundy/dark-red, retail photography, a particular typography system, card-based layouts or any other former concept is the default.

For each experience, discover the problem and explore creative directions. Color, type, imagery, composition, density, layout, components, materials, icons and motion are open creative decisions until explicitly approved for that scope. Existing code and design tokens are resources to inspect, not boundaries that limit exploration.

## Decision classification

- **Technical invariants:** stable data, identity, persistence, lifecycle, API, deployment, accessibility and compatibility contracts. Change only through evidence and an approved migration.
- **Product principles:** clarity, workflow efficiency, trust, learnability, accessibility, responsive behavior, useful feedback and performance. Evaluate in context.
- **Creative decisions:** visual and interaction language. Discover, explore, prototype and obtain explicit owner approval; never infer a product-wide rule from a single approved screen.

## Current verified repository state

See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) and [AI_HANDOFF.md](./AI_HANDOFF.md) for branch-specific verified status. This file intentionally avoids duplicating volatile commit, PR, CI or deployment claims.
