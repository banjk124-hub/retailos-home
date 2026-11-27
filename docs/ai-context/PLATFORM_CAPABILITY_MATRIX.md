# RetailOS Platform Capability Matrix

**Status:** Owner-confirmed product policy, 2026-11-27  
**Canonical decisions:** DECISIONS.md PD-007 / PD-008; ARCHITECTURE.md ADR-030  
**Scope:** Desktop and Mobile product capability; Tablet is tracked separately as review-required.  
**Last reconciled against main:** `ef4fc07e6ca6957f8e5b1a524859dd74e41207e1` (2026-11-27).

## 1. Operating rules

1. **Default feature scope is shared.** If a request describes a feature without naming a platform, implement the capability for both Desktop and Mobile.
2. **Explicit platform-only scope.** If the request explicitly says Desktop-only or Mobile-only, the feature is available only there. Record the scope in the matrix and owning feature metadata before implementation.
3. **Shared operation, separate presentation.** When the business operation is the same, share domain rules, validation, data contracts, state transitions and resulting business data. Desktop and Mobile may independently own shell, navigation rendering, information architecture, layout, spacing and component composition.
4. **Shared journeys and design semantics.** RetailOS identity, terminology, business meaning, status semantics, shared design principles and the logical journey remain common where the task is common. Each platform may arrange and render that journey differently.
5. **Scanner exception.** Camera barcode scanning, its entry point, scanner-only descriptions/instructions/text and camera presentation CSS are Mobile-only. Manual barcode lookup/entry remains shared. Desktop must not display camera-scanner controls, camera-specific copy or scanner-only styles.
6. **Change isolation.** A Desktop-only presentation/capability change must not alter Mobile, and vice versa. A change to shared domain, data, journey, design contract or component must be implemented consistently and regression-verified on both platforms.
7. **Tablet is not inferred.** Tablet remains `review-required` until the owner approves a Tablet-specific decision. Do not automatically inherit Desktop or Mobile policy from viewport width, touch support or User-Agent.
8. **Responsive is not capability policy.** Breakpoints adapt the selected platform presentation within that platform; they must not decide whether a workflow exists.
9. **No stacked presentation patches.** Avoid accumulating global selectors and repeated media-query overrides to make one shared DOM behave like two different products. Assign clear ownership to shared foundation, platform presentation and feature presentation.

## 2. Current owner-approved matrix

### 2.1 Business workflows

| Workflow | Desktop | Mobile | Tablet | Shared business result |
|---|---|---|---|---|
| Tồn kho | Available | Available | Review required | Yes |
| Giá & vốn | Available | Available | Review required | Yes |
| Danh mục hàng hóa | Available | Available | Review required | Yes |
| Nhập / xuất hàng | Available | Available | Review required | Yes |
| Điều chuyển hàng | Available | Available | Review required | Yes |
| Doanh số | Available | Available | Review required | Yes |
| Date sản phẩm | Available | Available | Review required | Yes |
| Kiểm kê | Available | Available | Review required | Yes; scanner input is an optional Mobile-only capability |
| Xuất file kiểm kê | Available | Available | Review required | Yes |

**Important:** platform availability does not mean the workflow is fully implemented. Existing `availability` and `workStatus` fields continue to represent engineering/UI readiness; they are not platform policy.

### 2.2 Cross-feature capabilities

| Capability | Desktop | Mobile | Tablet | Notes |
|---|---|---|---|---|
| Đăng nhập / nhận diện nhân viên | Available | Available | Review required | Shared identity/session semantics; presentation may differ |
| Home workspace / navigation | Available | Available | Review required | Same destination identity and workflow state; Desktop/Mobile renderers are independently owned; Tablet remains compatibility-only |
| Manual barcode lookup / entry | Available | Available | Review required | Shared lookup operation and result |
| Camera barcode scanning (Home + Stocktake) | Not offered | Available | Review required | Every camera entry point, camera-only text and CSS are Mobile-only |
| Scanner Preferences | Not offered | Available | Review required | Camera-specific settings; not offered outside the Mobile product policy |
| Settings / Update Center | Available | Available | Review required | Shared update-safety contract; scanner-specific settings remain Mobile-only |
| Push notifications | Runtime-dependent | Runtime-dependent | Runtime-dependent | Depends on API, permission, installation and OS/browser behavior |
| PWA installation | Runtime-dependent | Runtime-dependent | Review required | Browser/OS installability and user interaction; install path differs by platform; Tablet product acceptance remains open |

### 2.3 Scanner presentation ownership

- Desktop: no camera scanner entry point, camera permission flow, scanner-specific description/help text or scanner presentation CSS.
- Mobile: Home quick scan and Stocktake camera scan are available when product policy and runtime device/API/permission conditions are satisfied.
- Every camera entry point must consult `CAMERA_SCANNER_PLATFORM_AVAILABILITY` before opening or mounting a camera surface; the runtime device detector is an additional check, never a replacement for product policy.
- Manual lookup is a separate shared capability; do not hide it with the camera scanner.
- The runtime scanner detector uses Android/iOS User-Agent plus iPad touch heuristics. This is only a device-support signal, not product policy. `platformContext.ts` separately resolves the presentation context; Tablet remains review-required even when the scanner detector recognizes iPadOS.
- The Activity section is currently an empty-state placeholder, not a functional workflow; it is excluded from capability availability claims until a real activity feed is defined and approved.

## 3. Architecture and ownership contract

```text
RetailOS shared product identity + business journey
                  |
        Shared domain/application
        - business rules and validation
        - data contracts and state
        - stable workflow identity
                  |
        +---------+---------+
        |                   |
  Desktop presentation  Mobile presentation
  - desktop shell       - mobile shell
  - desktop navigation  - mobile navigation
  - desktop layout      - mobile layout
  - desktop components  - mobile components
  - desktop CSS         - mobile CSS
```

- Do not fork the application or duplicate business logic to obtain independent presentation.
- Do not force unlike platform workflows into a universal component merely because they share a name or visual resemblance.
- Share a component only when responsibility, semantics, interaction contract and lifecycle are genuinely the same.
- Keep platform-specific presentation components and CSS in their owning platform/feature boundary. Shared CSS contains true foundations and shared semantics, not platform-specific layout patches.
- Feature modules continue to own their business operations. Platform presentation invokes the same shared use cases/contracts when the operation is shared.
- Preserve stable module IDs, data snapshot IDs, IndexedDB schemas, scanner lifecycle and PWA update-safety boundaries.

## 4. Required implementation metadata

The Home workflow registry now declares a typed `platformAvailability` map independently from `availability` and `workStatus`. Cross-feature policies are declared in `PLATFORM_CAPABILITY_POLICY`, including authentication/identity, Home workspace, manual lookup, camera scanning, scanner preferences, Settings/Update Center, push notifications and PWA installation.

Allowed product-policy states:

- `available`: the product offers this capability on the platform.
- `not-offered`: intentionally not exposed on the platform.
- `review-required`: no platform decision has been approved; do not infer.
- `runtime-dependent`: the product capability is shared, but browser/OS/API/permission conditions determine actual runtime support.

The matrix is policy metadata. It must not be used as a substitute for runtime permission/API checks, implementation readiness, data availability or operation state. Authentication and Home workspace are shared capabilities; scanner preferences have their own Mobile-only policy entry; PWA installation is runtime-dependent on Desktop/Mobile while Tablet remains review-required. The current Home library does not need to filter existing workflows because all nine are shared Desktop/Mobile. SH-01 now provides a signal-based platform context resolver for presentation composition; this resolver does not infer capability from viewport breakpoints and does not change module registry scope. Any future platform-only module still requires explicit policy metadata and a tested capability filter.

## 5. Change and verification policy

| Change scope | Required implementation | Required regression evidence |
|---|---|---|
| Desktop-only feature/presentation | Desktop-owned presentation and explicit Desktop policy; shared contracts only if needed | Desktop workflow and absence/non-exposure on Mobile |
| Mobile-only feature/presentation | Mobile-owned presentation and explicit Mobile policy | Mobile workflow and absence/non-exposure on Desktop |
| Shared feature with different layouts | Shared use case/domain/data; separate Desktop/Mobile presentation as needed | Same business result and workflow contract on both |
| Shared domain/data/journey/design contract | Update shared owner once; adapt both presentations | Both Desktop and Mobile, plus shared contract tests |
| Shared component | Only after equivalent responsibility/semantics are proven | Both platform consumers and lifecycle/accessibility tests |
| CSS ownership change | Move selectors to the correct shared/platform/feature owner; no override stacking | Cascade/computed-style and overflow checks on both platforms |

## 6. Tablet and physical acceptance

Tablet remains outside the approved Desktop/Mobile matrix. The existing iPad touch fallback in scanner detection is not sufficient evidence of Tablet product approval. A separate Tablet decision must define shell, navigation, layout, touch/keyboard behavior and camera capability.

Browser viewport emulation is useful for responsive checks but does not certify iOS Safari, Android Chrome, installed PWA, keyboard, camera permission, system UI or low-end device performance. Those remain physical-device acceptance gates.

## 7. Next workstream gates

1. **PA-02 — Capability matrix:** owner-confirmed and represented in typed Home registry metadata and cross-feature policy constants; all nine workflows and cross-feature capabilities are inventoried.
2. **SH-01 — Shell and presentation ownership:** merged to `main` in PR #193 at `58d478cf6e8d6e5277c7ca2b60b274731670dfd0`; exact-head CI #1948 passed on `3381cdf9c79521f29641ab41ef95b60033d9169a` with 10 Playwright tests. Physical-device acceptance remains PW-01; CSS ownership migration remains CSS-01.
3. **Capability enforcement closure:** ensure every camera scanner entry point (Home and Stocktake) applies the same Mobile-only product policy plus runtime support check; verify Tablet exclusion and shared manual entry. This is a bounded follow-up, not a scanner-engine change.
4. **CSS-01 — Styling ownership migration:** trace global/mobile-tuning consumers, move styles incrementally to shared foundation/platform/feature owners, preserve cascade and avoid stacked overrides.
5. **PW-01 — PWA runtime validation:** verify standalone/display-mode, safe areas, dynamic viewport, keyboard, orientation, permission and fallback on target OS/browser combinations.
6. **MIG-01 — Bounded feature migration:** choose one workflow, preserve shared business result and validate platform isolation before expanding.

No broad visual redesign, scanner engine rewrite, schema change, PWA update lifecycle change or production deployment is authorized by this matrix.
