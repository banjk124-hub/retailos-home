export type ScannerSettings = {
  /** Whether an accepted barcode should trigger the browser vibration API. */
  vibrationEnabled: boolean;
  /** App beep output level, from 0 (muted) to 100 (maximum), in 10-point steps. */
  beepVolume: number;
};

export const DEFAULT_SCANNER_SETTINGS: Readonly<ScannerSettings> = Object.freeze({
  vibrationEnabled: true,
  // 50% maps to the existing Web Audio gain of 0.24.
  beepVolume: 50,
});

const STORAGE_KEY = 'retailos.scannerSettings.v1';
const listeners = new Set<() => void>();

function normalizeBeepVolume(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_SCANNER_SETTINGS.beepVolume;
  const clamped = Math.min(100, Math.max(0, value));
  return Math.round(clamped / 10) * 10;
}

function normalizeSettings(value: unknown): ScannerSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_SCANNER_SETTINGS };
  }
  const input = value as Partial<ScannerSettings>;
  return {
    vibrationEnabled: typeof input.vibrationEnabled === 'boolean'
      ? input.vibrationEnabled
      : DEFAULT_SCANNER_SETTINGS.vibrationEnabled,
    beepVolume: normalizeBeepVolume(input.beepVolume),
  };
}

function readStoredSettings(): ScannerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeSettings(JSON.parse(raw)) : { ...DEFAULT_SCANNER_SETTINGS };
  } catch {
    return { ...DEFAULT_SCANNER_SETTINGS };
  }
}

let currentSettings = readStoredSettings();

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    try {
      currentSettings = event.newValue
        ? normalizeSettings(JSON.parse(event.newValue))
        : { ...DEFAULT_SCANNER_SETTINGS };
    } catch {
      currentSettings = { ...DEFAULT_SCANNER_SETTINGS };
    }
    publish();
  });
}

function publish(): void {
  listeners.forEach((listener) => listener());
}

export function getScannerSettings(): ScannerSettings {
  return currentSettings;
}

export function updateScannerSettings(patch: Partial<ScannerSettings>): ScannerSettings {
  currentSettings = normalizeSettings({ ...currentSettings, ...patch });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
  } catch {
    // Keep the in-memory preference active if browser storage is unavailable.
  }
  publish();
  return currentSettings;
}

export function subscribeScannerSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isScannerVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}
