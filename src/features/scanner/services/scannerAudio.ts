import { getScannerSettings } from './scannerSettingsStore';

let audioContext: AudioContext | null = null;

function getUsableAudioContext(): AudioContext {
  // iOS may leave a context permanently closed after an interruption/background cycle.
  // Recreate it only from the next explicit user gesture, never from a background event.
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/**
 * Call from a direct user interaction (for example, pointerdown inside the
 * scanner surface or the settings preview button) so Safari can resume audio.
 */
export async function unlockScannerAudio(): Promise<void> {
  try {
    const context = getUsableAudioContext();
    // Safari can report an interrupted/non-running state after backgrounding.
    // Attempt resume from the current user gesture for every non-running state.
    if (context.state !== 'running') await context.resume();
  } catch (error) {
    // Audio is optional: a device/browser audio restriction must not block scanning.
    console.warn('Scanner audio could not be unlocked:', error);
  }
}

/** Confirmation tone. Safe to call after a barcode has been accepted. */
export function playScannerBeep(volume = getScannerSettings().beepVolume): void {
  if (!audioContext || audioContext.state !== 'running') return;
  const normalizedVolume = Math.min(100, Math.max(0, volume)) / 100;
  const targetGain = normalizedVolume * 0.6;
  if (targetGain <= 0) return;

  try {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1760, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(targetGain, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.135);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.14);
    oscillator.addEventListener('ended', () => {
      oscillator.disconnect();
      gain.disconnect();
    }, { once: true });
  } catch (error) {
    console.warn('Scanner confirmation sound failed:', error);
  }
}
