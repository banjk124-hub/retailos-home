import { playScannerBeep } from './scannerAudio';

type FeedbackOptions = {
  audio?: boolean;
  haptic?: boolean;
};

/**
 * Delivers best-effort confirmation feedback after a barcode has been accepted.
 * Unsupported vibration APIs and audio restrictions must never block scanning.
 */
export function playScannerFeedback({
  audio = true,
  haptic = true,
}: FeedbackOptions = {}): void {
  if (audio) playScannerBeep();

  if (!haptic || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }

  try {
    navigator.vibrate(25);
  } catch (error) {
    // Haptics are optional and unavailable on some browsers/platforms (notably iOS Safari).
    console.warn('Scanner haptic feedback is unavailable:', error);
  }
}
