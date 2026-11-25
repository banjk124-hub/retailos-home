# RetailOS Terminology Glossary

**Authority:** Canonical terminology for product, design, architecture and engineering discussions.  
**Language:** Vietnamese-first user communication; retain exact English technical terms where they are established engineering vocabulary.  
**Rule:** Use one term consistently for one concept. Do not silently rename a source-level identifier or business term in documentation.

## 1. Product and experience

| Term | Canonical meaning / usage |
|---|---|
| RetailOS | Retail operations workspace / OS-like product; not a generic admin dashboard or AppSheet reskin. |
| Product Studio | Private executable skill/plugin companion to repository standards; not a second product specification. |
| Design language | Shared identity, semantics and visual/interaction principles; not a fixed catalogue of layouts. |
| Design System | Tokens, foundations, primitives and proven shared components. |
| Feature-owned experience | Composition and components owned by a specific workflow because its semantics/state/lifecycle differ. |
| App Shell | Global navigation, workspace outlet and cross-screen context; distinguish proposed design from implemented routing. |
| Module Library | Registry-driven discovery/grouping of modules; registry presence does not prove workflow readiness. |
| Authentic retail imagery | Licensed, contextually art-directed supermarket/retail photography; not decorative wallpaper. |

## 2. Reference roles and design decisions

| Term | Canonical meaning / usage |
|---|---|
| Image reference | Art direction and visual composition: hierarchy, asymmetry, proportion, negative space, materials, depth and craft. It does not define RetailOS palette or exact layout. |
| Video reference | Motion, animation, transitions, progressive readiness and interaction feedback. It is not a frame-accurate timing specification. |
| RetailOS authority | Brand, Vietnamese copy, retail semantics, data truth, workflow, architecture, accessibility and performance. |
| Burgundy identity | Owner-approved dominant brand direction; exact final tokens require validation. |
| Vietnamese-first typography | Vietnamese is the primary interface language; font family remains open until tested. |
| Motion | Presentation behavior that acknowledges, orients, reveals, explains or preserves continuity; never owns business state. |
| Reduced motion | Alternative presentation respecting user/system preference while retaining state and action feedback. |

## 3. Engineering and governance

| Term | Canonical meaning / usage |
|---|---|
| Source of truth | The owning code/store/service/document that determines a value or behavior. Avoid multiple competing owners. |
| Protected contract | Existing behavior/API/persistence/lifecycle boundary that must not change incidentally. |
| ADR (Architecture Decision Record) | Traceable record of context, options, decision, status, consequences and reconsideration criteria. |
| Accepted | Explicitly approved decision for the stated scope; not implied by a proposal, draft PR or green CI. |
| Proposed | Candidate awaiting evidence or owner decision. |
| Experimental | Isolated prototype; not production authority. |
| Rejected | Evaluated and not selected for a stated context; reopen only with a defined trigger and new evidence. |
| Deprecated | Still present or used but scheduled for replacement/removal under a documented migration plan. |
| Retired | No longer active after consumer migration and verification; history remains available. |
| Technology Radar | Evaluation register, not an adoption roadmap or automatic approval list. |
| Shared component | Component with proven multiple consumers, stable semantics, explicit ownership and tests. |
| Pattern | Reusable solution to a repeated interaction/engineering responsibility; not necessarily one shared visual component. |
| Batch | Bounded set of related work with explicit scope, exit criteria and evidence. |
| Gate | A verifiable condition that must pass before the next phase or action. |

## 4. Runtime, data and release

| Term | Canonical meaning / usage |
|---|---|
| Build ID | Unique identifier for a built application payload; not interchangeable with product SemVer. |
| Product version / SemVer | User-facing release level; must not be used as the sole update detector. |
| Snapshot | Captured data state governed by freshness/cache/offline contracts; not necessarily live data. |
| Offline capability | Ability to continue supported work using installed/cached data and runtime; do not infer availability from a successful network request. |
| Staging | Downloading and verifying a candidate release before activation. |
| Activation | Explicit transition to a staged release at a safe business handoff; separate from download consent. |
| Rollback | Return to last-known-good release/runtime after failed health verification. |
| Scanner Engine | Shared scanner runtime/session/camera/decoder contract; distinct from scanner presentation. |
| Scanner presentation | UI/UX surrounding scanner states; must not own or alter engine lifecycle. |
| Stocktake Import | Feature workflow for file parsing, review, conflicts, edits, persistence and exact output. |

## 5. Status vocabulary

Use these labels consistently in documents and PRs:

- **Verified:** directly checked against current source, GitHub state, tests or reproducible evidence.
- **Owner-confirmed:** explicitly decided by the product owner.
- **Implemented:** code exists; does not imply acceptance or deployment.
- **CI-passed:** the stated checks passed on the exact commit.
- **Browser-verified:** inspected in the stated browser/viewport.
- **Device-accepted:** tested on a named physical device and recorded scenario.
- **Merged:** integrated into the target branch.
- **Deployed:** published to a named environment.
- **Production-promoted:** explicitly transferred/approved for operational use.

Never use these states interchangeably.
