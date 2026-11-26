# RetailOS project context — durable facts

**Repository:** `banjk124-hub/retailos-home`  
**Default branch:** `main`  
**Engineering standard:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)  
**UI/UX authority:** [EXPERIENCE_BUILD_STANDARD.md](./EXPERIENCE_BUILD_STANDARD.md)

- RetailOS is a React/Vite PWA for supermarket and retail operations. Development GitHub Pages uses base path `/retailos-home/`.
- Product target: a bespoke, OS-like retail operations environment, not an AppSheet reskin or generic admin dashboard.
- Owner-confirmed direction: burgundy/dark-red identity, Vietnamese-first typography, authentic retail imagery, feature-specific compositions and purposeful motion.
- Supplied image guides art direction/composition; supplied video guides motion/interaction. Adapt rather than copy.
- **UI implementation is greenfield at the Experience Layer.** Existing UI is not the visual or component foundation. Inspect it only for business behavior, protected contracts, lifecycle ownership and regression constraints.
- Preserve authentication/session, module IDs/readiness, business logic, persistence/offline behavior, Scanner Engine, Stocktake/Import processing, overlay lifecycle and PWA release safety.
- Build a professional desktop experience, adaptive tablet layouts and task-focused mobile flows; optimize motion and visual effects for average/lower-end devices.
- Scanner stabilization is closed. Reopen only for a reproducible defect, measured bottleneck or new requirement; UI work must not reopen scanner internals.
- Development account/Pages testing is separate from shared department production promotion. Merge, deploy and transfer require explicit authorization.
- Current implementation state lives only in [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md). Next-session action lives only in [AI_HANDOFF.md](./AI_HANDOFF.md).
