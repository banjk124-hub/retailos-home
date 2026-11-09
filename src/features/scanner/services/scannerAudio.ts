import { getScannerSettings } from './scannerSettingsStore';

let audioContext: AudioContext | null = null;

/**
 * Call from a direct user interaction (for example, pointerdown inside the
 * scanner surface) so iOS Safari can unlock audio before the first scan.
 */
export async function unlockScannerAudio(): Promise<void> {
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') await audioContext.resume();
  } catch (error) {
    // Audio is optional: a device/browser audio restriction must not block scanning.
    console.warn('Scanner audio could not be unlocked:', error);
  }
}

/** Short confirmation tone. Safe to call after a barcode has been accepted. */
export function playScannerBeep(volume = getScannerSettings().beepVolume): void {
  if (!audioContext || audioContext.state !== 'running') return;
  const normalizedVolume = Math.min(100, Math.max(0, volume)) / 100;
  const targetGain = normalizedVolume * 0.48;
  if (targetGain <= 0) return;

  try {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1760, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(targetGain, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.105);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.11);
    oscillator.addEventListener('ended', () => {
      oscillator.disconnect();
      gain.disconnect();
    }, { once: true });
  } catch (error) {
    console.warn('Scanner confirmation sound failed:', error);
  }
}
