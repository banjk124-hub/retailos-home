import { playScannerBeep, unlockScannerAudio } from './scannerAudio';
import { getScannerSettings } from './scannerSettingsStore';

/**
 * Delivers best-effort confirmation feedback after a barcode has been accepted.
 * Unsupported vibration APIs and audio restrictions must never block scanning.
 */
export function playScannerFeedback(): void {
  const settings = getScannerSettings();
  if (settings.beepVolume > 0) playScannerBeep(settings.beepVolume);

  if (!settings.vibrationEnabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }

  try {
    navigator.vibrate(25);
  } catch (error) {
    // Haptics are optional and unavailable on some browsers/platforms (notably iOS Safari).
    console.warn('Scanner haptic feedback is unavailable:', error);
  }
}


/** Preview the currently selected beep level from an explicit settings-page gesture. */
export async function previewScannerBeep(): Promise<void> {
  await unlockScannerAudio();
  playScannerBeep();
}
