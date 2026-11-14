import type { ScannerDecoderAdapter, ScannerDecoderFactory } from './decoderAdapter';

/**
 * Default production backend selection.
 *
 * Keep the concrete decoder behind this lazy factory so UniversalScannerSession
 * depends only on the adapter contract. The dynamic import is intentionally
 * deferred until the session has published its first usable camera preview.
 */
export const defaultScannerDecoderFactory: ScannerDecoderFactory = {
  async create(): Promise<ScannerDecoderAdapter> {
    const { ZXingDecoderAdapter } = await import('./zxingDecoder');
    return new ZXingDecoderAdapter();
  },
};
