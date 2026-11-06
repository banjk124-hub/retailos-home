import type { ScannerCapabilities, ScannerSymbology } from './contracts';

type NativeBarcodeDetectorConstructor = {
  getSupportedFormats?: () => Promise<string[]>;
};

const REQUIRED_FORMATS: ScannerSymbology[] = ['EAN_8', 'EAN_13', 'CODE_128'];

/**
 * Read runtime capabilities without requesting camera permission.
 * Capability detection is advisory; acquisition and decoding can still fail.
 */
export async function detectScannerCapabilities(): Promise<ScannerCapabilities> {
  const mediaDevices = typeof navigator !== 'undefined'
    && typeof navigator.mediaDevices !== 'undefined';

  const detectorConstructor = typeof globalThis !== 'undefined'
    ? (globalThis as typeof globalThis & {
      BarcodeDetector?: NativeBarcodeDetectorConstructor;
    }).BarcodeDetector
    : undefined;

  let nativeFormats: ScannerSymbology[] = [];
  if (detectorConstructor?.getSupportedFormats) {
    try {
      const formats = await detectorConstructor.getSupportedFormats();
      nativeFormats = REQUIRED_FORMATS.filter((format) => formats.includes(format));
    } catch {
      // A failed capability query must not prevent fallback decoders.
      nativeFormats = [];
    }
  }

  return {
    secureContext: typeof isSecureContext !== 'undefined' && isSecureContext,
    mediaDevices,
    getUserMedia: mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function',
    nativeBarcodeDetector: nativeFormats.length > 0,
    nativeFormats,
    requestVideoFrameCallback: typeof HTMLVideoElement !== 'undefined'
      && 'requestVideoFrameCallback' in HTMLVideoElement.prototype,
    worker: typeof Worker !== 'undefined',
    webAssembly: typeof WebAssembly !== 'undefined',
    vibration: typeof navigator !== 'undefined'
      && typeof navigator.vibrate === 'function',
  };
}
