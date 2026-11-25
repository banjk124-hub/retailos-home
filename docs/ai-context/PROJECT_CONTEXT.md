# RetailOS project context — durable facts

**Repository:** `banjk124-hub/retailos-home`  
**Default branch:** `main`  
**Governing product/design/engineering workflow:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)  
**Active UI/UX M0 authority:** [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md)

- RetailOS is a React/Vite PWA for supermarket and retail operations. Development GitHub Pages uses base path `/retailos-home/`.
- The product target is a modern OS-like operational workspace, not an AppSheet reskin. RetailOS owns its design language, brand and operational meaning.
- Owner-confirmed UI direction: burgundy/dark-red identity, Vietnamese-first typography, authentic supermarket/retail imagery and feature-specific compositions.
- The supplied image guides art direction and visual composition; the supplied video guides motion, animation, transitions and interaction feedback. Both are inspiration sources, not templates to copy.
- Design is component-led and visual-first, with concise text, purposeful iconography and imagery, varied workspace compositions, professional desktop, adaptive tablet and task-focused mobile. Sophisticated effects are allowed when purpose and runtime cost are justified.
- The design system is open and evolutionary: establish language and shared foundations, redesign existing features, and add future components only when real needs emerge. Do not invent future workflows or build speculative component catalogues.
- Frameworks, component libraries, icon/image tooling, typography and motion libraries are evaluated before adoption/replacement; no technology is presumed mandatory.
- Preserve Auth/session, module registry, cache/data truth, Scanner Engine, Stocktake/Import persistence, overlay and PWA release contracts unless a separately approved migration requires change.
- Scanner runtime stabilization is closed. See `SCANNER_ENGINE.md` and `SCANNER_HISTORY.md`; do not create parallel Scanner workstreams.
- Development account/Pages testing is separate from shared department production promotion. Merge, deploy and transfer require explicit authorization.
- Current implementation status is maintained only in [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md). Verify volatile GitHub facts live.
