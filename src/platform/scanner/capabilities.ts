import type { ScannerCapabilities, ScannerSymbology } from './contracts';

type NativeBarcodeDetectorConstructor = {
  getSupportedFormats?: () => Promise<string[]>;
};

const NATIVE_FORMAT_NAMES: Record<ScannerSymbology, string> = {
  EAN_8: 'ean_8',
  EAN_13: 'ean_13',
  CODE_128: 'code_128',
};

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
      nativeFormats = (Object.entries(NATIVE_FORMAT_NAMES) as [ScannerSymbology, string][])
        .filter(([, nativeName]) => formats.includes(nativeName))
        .map(([symbology]) => symbology);
    } catch {
      // A failed capability query must not prevent fallback decoders.
      nativeFormats = [];
    }
  }

  return {
    secureContext: typeof isSecureContext !== 'undefined' && isSecureContext,
    mediaDevices,
    getUserMedia: typeof navigator !== 'undefined'
      && typeof navigator.mediaDevices?.getUserMedia === 'function',
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
