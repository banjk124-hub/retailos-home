import type { ScannerGeometry, ScannerSourceScanRegion, ScannerSymbology } from '../contracts';
import type { ScannerFocusQualitySample } from '../scannerFocusQuality';
import type { ScannerTemporalSnapshot } from '../scannerTemporalRecognition';

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
  /** Optional low-rate quality sample from the existing grayscale ROI readback. */
  onFocusQuality?: (sample: ScannerFocusQualitySample) => void;
  /** Low-rate copied grayscale ROI snapshot; never exposes the live canvas. */
  onTemporalFrame?: (snapshot: ScannerTemporalSnapshot, quality: ScannerFocusQualitySample) => void;
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
  /** Decode an owned historical grayscale ROI snapshot through the same enhancement/validation boundary. */
  decodeTemporalSnapshot(snapshot: ScannerTemporalSnapshot, timestamp: number): Promise<DecoderOutput[]>;
  dispose(): Promise<void> | void;
}
