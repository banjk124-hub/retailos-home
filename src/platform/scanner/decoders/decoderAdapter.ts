import type { ScannerGeometry, ScannerSymbology } from '../contracts';

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

/**
 * Decoder-only boundary. Implementations must not acquire camera streams,
 * mutate video elements, schedule frames, or own feature UI/business logic.
 */
export interface ScannerDecoderAdapter {
  readonly id: string;
  initialize(options: DecoderInitOptions): Promise<void>;
  decode(source: CanvasImageSource, timestamp?: number): Promise<DecoderOutput[]>;
  dispose(): Promise<void> | void;
}
