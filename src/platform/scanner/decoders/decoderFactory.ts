import type { ScannerDecoderAdapter, ScannerDecoderFactory } from './decoderAdapter';

/**
 * Production backend selection.
 *
 * The session and feature modules depend only on ScannerDecoderAdapter.
 * ZXing-C++ WASM is loaded lazily after the camera preview is ready, keeping
 * WASM initialization out of the initial application bundle and camera startup.
 */
export const defaultScannerDecoderFactory: ScannerDecoderFactory = {
  async create(): Promise<ScannerDecoderAdapter> {
    const { ZXingWasmDecoderAdapter } = await import('./zxingWasmDecoder');
    return new ZXingWasmDecoderAdapter();
  },
};
