import type { ScannerGeometry, ScannerSourceScanRegion, ScannerSymbology } from '../contracts';

/** A decoded value before it is accepted by the shared scanner policy. */
export type DecoderOutput = {
  value: string;
  symbology: ScannerSymbology;
  geometry?: ScannerGeometry;
  timestamp: number;
  decoder: {
    id: string;
    version?: string;
  };
};

export type DecoderInitOptions = {
  formats: ScannerSymbology[];
};

export type DecoderDecodeOptions = {
  timestamp?: number;
  /** Current feature-owned reticle mapped into unrotated source-frame coordinates. */
  scanRegion: ScannerSourceScanRegion | null;
};

/**
 * Decoder-only boundary. Implementations must not acquire camera streams,
 * mutate video elements, schedule frames, or own feature UI/business logic.
 */
export interface ScannerDecoderAdapter {
  readonly id: string;
  initialize(options: DecoderInitOptions): Promise<void>;
  /** Strict ROI input: missing or invalid geometry must not trigger full-frame decoding. */
  decode(source: CanvasImageSource, options: DecoderDecodeOptions): Promise<DecoderOutput[]>;
  dispose(): Promise<void> | void;
}
