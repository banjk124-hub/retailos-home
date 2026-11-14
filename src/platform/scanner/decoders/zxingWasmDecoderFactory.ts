import type { ScannerDecoderAdapter, ScannerDecoderFactory } from './decoderAdapter';

/** Experimental factory for benchmark/parity runs; not the production default. */
export const zxingWasmDecoderFactory: ScannerDecoderFactory = {
  async create(): Promise<ScannerDecoderAdapter> {
    const { ZXingWasmDecoderAdapter } = await import('./zxingWasmDecoder');
    return new ZXingWasmDecoderAdapter();
  },
};
