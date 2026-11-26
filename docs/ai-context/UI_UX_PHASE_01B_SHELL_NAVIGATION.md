# UI-01B — Shell & Navigation

**Status:** merged into `main` via PR #178 on 2026-11-26.  
**Scope owner:** Home Shell / shared navigation.  
**Last implementation evidence:** commit `c676f4013241b1c60794bd96aedc3a2b30edb606`; CI run [#1775](https://github.com/banjk124-hub/retailos-home/actions/runs/45842213044).

## Objective

Separate desktop and touch-first navigation presentation without duplicating destination identity, active state or navigation behavior.

## Architecture

- `HomeScreen` remains the owner of the canonical Home navigation state (`activeNav`) and destination selection handler (`handleNav`).
- `HOME_DOCK_ITEMS` is the shared destination definition. Stable IDs remain `home`, `modules`, `activity` and `settings`.
- `ShellNavigation` is a presentation adapter. It receives the same `items`, `activeId`, `onSelect` and action contract for both presentations.
- Desktop (viewport width >= 901px): persistent vertical navigation rail. The shell reserves 88px on the left so the rail does not overlay the Home content.
- Touch/tablet layouts (viewport width <= 900px): existing `LiquidDock`, centered horizontally and bounded by left/right safe-area insets. The shell reserves bottom space for the fixed dock.
- Desktop quick lookup invokes manual product search directly. The touch dock preserves the existing manual-search / barcode-scan choices and camera-lease interaction path.
- Update notice count is passed to the same settings destination in both presentations.

## Interaction and accessibility

- Destination buttons expose `aria-current="location"` for the active destination.
- Disabled destinations remain disabled in both presentations.
- Mobile keyboard-open behavior remains owned by `useDockInteraction`; the dock is hidden while an editable field is focused on touch layouts.
- Reduced-motion behavior is retained. The desktop rail also disables its transitions under `prefers-reduced-motion`.
- Safe-area insets are applied to the mobile dock and desktop rail.

## Layout ownership

- Desktop reservation: `.app-shell.has-shell-navigation { padding-left: 88px }`.
- Touch reservation: `.app-shell.has-shell-navigation { padding-bottom: calc(94px + env(safe-area-inset-bottom)) }`.
- Mobile dock is centered with a viewport-bounded width; narrow screens use a tighter width rule.
- The navigation presentation is outside the Home content flow and does not alter module content, feature overlays or persistence.

## Protected boundaries

No intentional changes to authentication/session, employee identity, module registry, snapshot/cache/offline data, scanner runtime/camera lifecycle/decoder, stocktake/import persistence/export, or PWA update lifecycle. Scanner launch continues through the existing dock action callback.

## Validation

- `scripts/test-shell-navigation-contract.mjs` is wired into `npm run preflight`.
- Browser runtime evidence validates navigation presentation at 1440x900, 1280x800, 1024x768, 768x1024, 390x844, 360x740 and short landscape.
- Browser assertions cover desktop rail/content separation, mobile dock visibility and viewport bounds, mobile footer/dock separation, and horizontal overflow.
- CI run #1775 passed preflight, TypeScript/production builds, bundle comparison and browser runtime tests. Runtime evidence reported zero browser/console errors, zero failed requests and zero horizontal overflow at all seven Home viewports.

## Release gate

PR #178 is merged. Merge status is not deployment status; production release remains governed by the PWA release workflow and explicit release approval.
