import type { ReaderOptions } from 'zxing-wasm/reader';

/**
 * RetailOS's ordered binarizer strategy for the production ZXing-C++ engine.
 * LocalAverage provides the HybridBinarizer-equivalent local-threshold path.
 */
export type ZXingWasmBinarizer = 'LocalAverage' | 'GlobalHistogram';

const TWO_DIMENSIONAL_FORMATS = new Set([
  'QRCode', 'DataMatrix', 'PDF417', 'Aztec', 'MaxiCode', 'MicroQRCode',
]);

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
    // ZXing-C++ owns the complete orthogonal search (90°, 180°, 270°).
    // RetailOS keeps only continuous-angle deskew and geometry correction.
    tryRotate: true,
    // Native reversed-reflectance detection is not duplicated by the shared
    // RetailOS pipeline; retain this WASM capability on the miss path.
    tryInvert: true,
    // Native downscale is a complementary high-resolution search path;
    // shared 1x/2x candidates remain for source-detail recovery/upscaling.
    tryDownscale: true,
    // ZXing-C++ denoise is experimental and only applies to 2D formats.
    // Enable it only when the active allowlist can actually consume it.
    tryDenoise: formats.some((format) => TWO_DIMENSIONAL_FORMATS.has(format)),
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

/** Run ordered backend strategies and stop at the first accepted output. */
export async function runOrderedBinarizerFallback<TBinarizer, TResult, TOutput>(
  binarizers: readonly TBinarizer[],
  decode: (binarizer: TBinarizer) => Promise<TResult>,
  accept: (result: TResult) => TOutput | null,
): Promise<TOutput | null> {
  for (const binarizer of binarizers) {
    const result = await decode(binarizer);
    const output = accept(result);
    if (output !== null) return output;
  }
  return null;
}

/** Invalid native reads are observable for diagnostics, never accepted output. */
export function isZXingWasmReadResultValid(result: {
  isValid?: boolean;
  error?: unknown;
}): boolean {
  return result.isValid !== false && !Boolean(result.error);
}
