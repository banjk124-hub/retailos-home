export type RetailPlatform = 'desktop' | 'tablet' | 'mobile';

export type PlatformCapabilityState = 'available' | 'not-offered' | 'review-required' | 'runtime-dependent';
export type PlatformAvailability = Readonly<Record<RetailPlatform, PlatformCapabilityState>>;

/** Default product scope: shared on Desktop and Mobile. Tablet is not inferred. */
export const SHARED_DESKTOP_MOBILE = {
  desktop: 'available',
  tablet: 'review-required',
  mobile: 'available',
} as const satisfies PlatformAvailability;

/** Camera scanning is Mobile-only by product policy; Tablet requires a separate decision. */
export const MOBILE_ONLY_WITH_TABLET_REVIEW = {
  desktop: 'not-offered',
  tablet: 'review-required',
  mobile: 'available',
} as const satisfies PlatformAvailability;

/** Shared product capability; browser/OS support and permission decide runtime availability. */
export const RUNTIME_DEPENDENT_ALL_PLATFORMS = {
  desktop: 'runtime-dependent',
  tablet: 'runtime-dependent',
  mobile: 'runtime-dependent',
} as const satisfies PlatformAvailability;

export const PLATFORM_CAPABILITY_POLICY = {
  manualBarcodeLookup: SHARED_DESKTOP_MOBILE,
  cameraBarcodeScanner: MOBILE_ONLY_WITH_TABLET_REVIEW,
  settingsAndUpdateCenter: SHARED_DESKTOP_MOBILE,
  pushNotifications: RUNTIME_DEPENDENT_ALL_PLATFORMS,
} as const;
