import { PLATFORM_CAPABILITY_POLICY } from '../../../shared/platform/platformCapabilities';

/** Product policy for camera access; runtime support and permission are checked separately. */
export const CAMERA_SCANNER_PLATFORM_AVAILABILITY = PLATFORM_CAPABILITY_POLICY.cameraBarcodeScanner;

/**
 * Scanner is intentionally limited to mobile platforms.
 * iPadOS may report a desktop-style Macintosh user agent, so detect touch iPads.
 */
export function isScannerSupportedDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent;
  const isAndroid = /Android/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent)
    || (/Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);
  return isAndroid || isIOS;
}
