import { SUPPORTED_BARCODE_FORMATS, type SupportedBarcodeSymbology } from '../../../platform/scanner/contracts';

export type ScannerSymbologyGroup = 'linear' | 'matrix';
export type ScannerSymbologyOption = {
  format: SupportedBarcodeSymbology;
  label: string;
  description: string;
  group: ScannerSymbologyGroup;
};

export const SCANNER_SYMBOLOGY_OPTIONS: readonly ScannerSymbologyOption[] = [
  { format: 'EAN_8', label: 'EAN-8', description: 'Mã bán lẻ 8 chữ số', group: 'linear' },
  { format: 'EAN_13', label: 'EAN-13', description: 'Mã bán lẻ 13 chữ số', group: 'linear' },
  { format: 'UPC_A', label: 'UPC-A', description: 'Mã bán lẻ Bắc Mỹ · 12 chữ số', group: 'linear' },
  { format: 'UPC_E', label: 'UPC-E', description: 'Mã UPC rút gọn · 8 chữ số', group: 'linear' },
  { format: 'CODE_128', label: 'CODE-128', description: 'Mã tuyến tính alphanumeric', group: 'linear' },
  { format: 'CODE_39', label: 'CODE-39', description: 'Mã công nghiệp · chữ in hoa và số', group: 'linear' },
  { format: 'CODE_93', label: 'CODE-93', description: 'Mã tuyến tính alphanumeric', group: 'linear' },
  { format: 'ITF', label: 'ITF', description: 'Interleaved 2 of 5 · dữ liệu số', group: 'linear' },
  { format: 'CODABAR', label: 'CODABAR', description: 'Mã tuyến tính dùng trong logistics', group: 'linear' },
  { format: 'RSS_14', label: 'GS1 DataBar', description: 'DataBar / RSS-14 · mã bán lẻ', group: 'linear' },
  { format: 'RSS_EXPANDED', label: 'GS1 DataBar Expanded', description: 'DataBar mở rộng · dữ liệu GS1', group: 'linear' },
  { format: 'QR_CODE', label: 'QR Code', description: 'Mã ma trận 2D', group: 'matrix' },
  { format: 'DATA_MATRIX', label: 'Data Matrix', description: 'Mã ma trận 2D mật độ cao', group: 'matrix' },
  { format: 'PDF_417', label: 'PDF417', description: 'Mã 2D dạng xếp chồng', group: 'matrix' },
  { format: 'AZTEC', label: 'Aztec', description: 'Mã ma trận 2D', group: 'matrix' },
  { format: 'MAXICODE', label: 'MaxiCode', description: 'Mã 2D logistics · cần ảnh thẳng và rõ', group: 'matrix' },
  { format: 'MICRO_QR_CODE', label: 'Micro QR Code', description: 'Biến thể QR kích thước nhỏ', group: 'matrix' },
];

const LEGACY_ENABLED_FORMATS: readonly SupportedBarcodeSymbology[] = [
  'EAN_8', 'EAN_13', 'CODE_128', 'CODE_39',
];

export type ScannerSettings = {
  vibrationEnabled: boolean;
  beepVolume: number;
  /** Per-device decoder allowlist. A disabled format is never passed to the decoder. */
  symbologyEnabled: Record<SupportedBarcodeSymbology, boolean>;
};

function createDefaultSymbologySettings(): Record<SupportedBarcodeSymbology, boolean> {
  return Object.fromEntries(SUPPORTED_BARCODE_FORMATS.map((format) => [
    format,
    LEGACY_ENABLED_FORMATS.includes(format),
  ])) as Record<SupportedBarcodeSymbology, boolean>;
}

export const DEFAULT_SCANNER_SETTINGS: Readonly<ScannerSettings> = Object.freeze({
  vibrationEnabled: true,
  beepVolume: 50,
  symbologyEnabled: Object.freeze(createDefaultSymbologySettings()),
});

const STORAGE_KEY = 'retailos.scannerSettings.v1';
const listeners = new Set<() => void>();

function normalizeBeepVolume(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_SCANNER_SETTINGS.beepVolume;
  const clamped = Math.min(100, Math.max(0, value));
  return Math.round(clamped / 10) * 10;
}

function normalizeSymbologySettings(value: unknown): Record<SupportedBarcodeSymbology, boolean> {
  const input = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<Record<SupportedBarcodeSymbology, unknown>>
    : {};
  const defaults = createDefaultSymbologySettings();
  return Object.fromEntries(SUPPORTED_BARCODE_FORMATS.map((format) => [
    format,
    typeof input[format] === 'boolean' ? input[format] : defaults[format],
  ])) as Record<SupportedBarcodeSymbology, boolean>;
}

function normalizeSettings(value: unknown): ScannerSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      vibrationEnabled: DEFAULT_SCANNER_SETTINGS.vibrationEnabled,
      beepVolume: DEFAULT_SCANNER_SETTINGS.beepVolume,
      symbologyEnabled: createDefaultSymbologySettings(),
    };
  }
  const input = value as Partial<ScannerSettings>;
  return {
    vibrationEnabled: typeof input.vibrationEnabled === 'boolean'
      ? input.vibrationEnabled
      : DEFAULT_SCANNER_SETTINGS.vibrationEnabled,
    beepVolume: normalizeBeepVolume(input.beepVolume),
    // Existing v1 records migrate without discarding feedback preferences.
    symbologyEnabled: normalizeSymbologySettings(input.symbologyEnabled),
  };
}

function readStoredSettings(): ScannerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeSettings(JSON.parse(raw)) : normalizeSettings(null);
  } catch {
    return normalizeSettings(null);
  }
}

let currentSettings = readStoredSettings();

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    try {
      currentSettings = event.newValue
        ? normalizeSettings(JSON.parse(event.newValue))
        : normalizeSettings(null);
    } catch {
      currentSettings = normalizeSettings(null);
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

export function getEnabledScannerSymbologies(
  settings: ScannerSettings = currentSettings,
): SupportedBarcodeSymbology[] {
  return SUPPORTED_BARCODE_FORMATS.filter((format) => settings.symbologyEnabled[format]);
}

export function updateScannerSettings(patch: Partial<ScannerSettings>): ScannerSettings {
  const symbologyEnabled = patch.symbologyEnabled
    ? { ...currentSettings.symbologyEnabled, ...patch.symbologyEnabled }
    : currentSettings.symbologyEnabled;
  currentSettings = normalizeSettings({ ...currentSettings, ...patch, symbologyEnabled });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
  } catch {
    // Keep the in-memory preference active if browser storage is unavailable.
  }
  publish();
  return currentSettings;
}

export function updateScannerSymbologyEnabled(
  format: SupportedBarcodeSymbology,
  enabled: boolean,
): ScannerSettings {
  if (!enabled && currentSettings.symbologyEnabled[format]
    && getEnabledScannerSymbologies().length <= 1) {
    return currentSettings;
  }
  return updateScannerSettings({
    symbologyEnabled: { ...currentSettings.symbologyEnabled, [format]: enabled },
  });
}

export function subscribeScannerSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isScannerVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}
