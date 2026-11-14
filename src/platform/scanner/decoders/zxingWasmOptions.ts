import type { ReaderOptions } from 'zxing-wasm/reader';

/**
 * The two binarizers used by the previous ZXing JS backend.
 * LocalAverage is ZXing-C++'s HybridBinarizer-equivalent mode.
 */
export type ZXingWasmBinarizer = 'LocalAverage' | 'GlobalHistogram';

export function createZXingWasmReaderOptions(
  formats: string[],
  binarizer: ZXingWasmBinarizer = 'LocalAverage',
  base?: ReaderOptions,
): ReaderOptions {
  return {
    ...(base ?? {}),
    formats: [...formats] as NonNullable<ReaderOptions['formats']>,
    binarizer,
    tryHarder: true,
    // Rotation and scaling are explicit, bounded stages in the shared
    // recognition pipeline. Keep backend-internal duplicates disabled.
    tryRotate: false,
    // Native reversed-reflectance detection is not duplicated by the shared
    // RetailOS pipeline; retain this WASM capability on the miss path.
    tryInvert: true,
    tryDownscale: false,
    tryDenoise: false,
    maxNumberOfSymbols: 1,
    // Preserve the old getText() payload contract and optional-checksum
    // acceptance behavior. RetailOS validation remains authoritative.
    textMode: 'Plain',
    validateOptionalChecksum: false,
    // Return invalid reads for diagnostics; the adapter rejects them before
    // they can cross the DecoderOutput/session validation boundary.
    returnErrors: true,
    characterSet: 'UTF8',
  };
}
