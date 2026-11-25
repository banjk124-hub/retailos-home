# UI Component Specification Template

Use this template for a new or materially changed shared component or feature-owned presentation component. Keep the specification proportional to the component's risk; do not fill sections with generic statements.

## Identity and ownership
- **Name / status:** `ComponentName` — Experimental | Feature-owned | Shared Candidate | Shared Stable | Deprecated
- **Owner:** feature or design-system owner
- **Source:** implementation path
- **Consumers:** verified callsites; distinguish direct from indirect consumers
- **Related contract:** screen blueprint, workflow or design-system specification

## Problem and semantic responsibility
- **User/task problem:**
- **Primary responsibility:**
- **Explicit non-goals:**
- **Why an existing component is insufficient (if introducing a new one):**

## API and composition
- **Required inputs:** semantic data, callbacks and controlled state
- **Optional inputs:** only demonstrated variants
- **Slots / composition:** supported child regions
- **Semantic HTML:** element and accessible role
- **Ownership boundary:** state/data/persistence owned here vs delegated to the feature

## Visual and state contract
| State | Meaning / source of truth | Visual treatment | User feedback |
|---|---|---|---|
| Default | | | |
| Hover / focus | | | |
| Pressed / selected | | | |
| Pending / loading | | | |
| Disabled / unavailable | | | |
| Success / warning / error | | | |
| Empty / stale / offline | | | |

- **Density / size variants:**
- **Surface/material role:** flat, tinted, elevated, dark or feature-specific; justify blur
- **Content rules:** Vietnamese diacritics, long labels, codes, large values and wrapping

## Responsive and interaction behavior
- **Desktop / tablet / mobile composition:**
- **Keyboard:** tab order, activation and Escape behavior
- **Touch:** target size, gesture and pressed feedback
- **Focus:** entry, visibility and restoration
- **Overflow / zoom / short landscape:**

## Accessibility and motion
- **Accessible name and status announcement:**
- **Contrast pairs:** foreground/background by state, including translucent compositing
- **Reduced motion:** behavior when nonessential motion is removed
- **Power-conserve:** blur, imagery and repeated animation fallback
- **Screen reader / zoom checks:**

## Performance and platform
- **Critical-path bytes / dependencies:**
- **Render, layout and interaction cost:**
- **Low-end fallback:**
- **Offline / PWA / lifecycle implications (if any):**

## Verification and migration
- **Unit / contract / integration tests:**
- **Visual evidence:** viewport, browser, build ID and screenshot references
- **Regression boundaries:** auth, data, persistence, navigation, scanner or PWA contracts
- **Migration sequence and consumer inventory:**
- **Removal criteria for replaced implementation:**
- **Rollback path:**

## Decision record
- **Decision:** accept | revise | defer | reject
- **Evidence and rationale:**
- **Known limitations / owner acceptance:**
- **Date / review reference:**
