import type { ScannerProfileName, ScannerProfileReason } from './contracts';

/**
 * Coarse, privacy-safe scanner device classification.
 *
 * These hints are advisory only. They never change camera constraints,
 * decode cadence, ROI coverage, supported formats or recognition ordering.
 */
export type ScannerDeviceProfile = ScannerProfileName;
export type ScannerDeviceProfileReason = ScannerProfileReason;

export type ScannerDeviceProfileHints = {
  /** Coarse device memory estimate in GiB; may be unavailable in Safari. */
  deviceMemory?: number;
  /** Logical processor count; browsers may intentionally reduce this value. */
  hardwareConcurrency?: number;
};

export type ScannerDeviceProfileAssessment = {
  profile: ScannerDeviceProfile;
  reason: ScannerDeviceProfileReason;
};

function validPositive(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null;
}

/**
 * LOW is selected when either available signal indicates constrained hardware.
 * HIGH requires both independent hints to be strong; a single hint is not
 * enough to classify a device as high capability. Unknown devices fall back
 * conservatively to LOW rather than guessing from a user-agent string.
 */
export function resolveScannerDeviceProfile(
  hints: ScannerDeviceProfileHints,
): ScannerDeviceProfileAssessment {
  const memory = validPositive(hints.deviceMemory);
  const cores = validPositive(hints.hardwareConcurrency);

  if (memory === null && cores === null) {
    return { profile: 'LOW', reason: 'unknown_capability_conservative_fallback' };
  }
  if ((memory !== null && memory <= 2) || (cores !== null && cores <= 4)) {
    return { profile: 'LOW', reason: 'limited_capability_hint' };
  }
  if (memory !== null && memory >= 8 && cores !== null && cores >= 8) {
    return { profile: 'HIGH', reason: 'strong_capability_hints' };
  }
  return { profile: 'MID', reason: 'mixed_or_mid_capability_hints' };
}

/** Read only coarse browser capability hints; never persist them or identify the device. */
export function detectScannerDeviceProfile(): ScannerDeviceProfileAssessment {
  if (typeof navigator === 'undefined') return resolveScannerDeviceProfile({});
  const browserNavigator = navigator as Navigator & { deviceMemory?: number };
  return resolveScannerDeviceProfile({
    deviceMemory: browserNavigator.deviceMemory,
    hardwareConcurrency: browserNavigator.hardwareConcurrency,
  });
}
