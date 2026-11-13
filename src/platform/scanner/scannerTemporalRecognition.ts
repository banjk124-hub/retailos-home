/**
 * Temporal recognition contracts for the Universal Scanner.
 *
 * T1 deliberately defines bounded, platform-neutral data contracts only.
 * Frame capture, buffering, candidate selection and result confirmation are
 * implemented in later stages against these limits.
 */

export const SCANNER_TEMPORAL_POLICY = {
  /** Maximum number of owned frame snapshots retained by one session. */
  maxBufferedFrames: 3,
  /** Maximum age of a frame eligible for temporal selection. */
  maxFrameAgeMs: 700,
  /** Maximum source pixels copied into a single temporal snapshot. */
  maxSnapshotPixels: 640 * 360,
  /** Minimum interval between temporal observations. */
  minObservationIntervalMs: 70,
  /** A frame from a previous ROI/camera generation is never reusable. */
  requireMatchingGeneration: true,
} as const;

export type ScannerTemporalQuality = {
  /** Sharpness score from the existing grayscale ROI focus measurement. */
  sharpness: number;
  /** Fraction of sampled pixels with meaningful edge response. */
  edgeCoverage: number;
  /** Frame-to-frame residual motion score. */
  motionScore: number;
  /** Luminance standard deviation. */
  luminanceStdDev: number;
  /** True only when the source quality sample passed its validity gates. */
  valid: boolean;
};

export type ScannerTemporalFrame = {
  /** Monotonic timestamp from the video-frame callback clock. */
  timestamp: number;
  /** Session generation; stale frames must be discarded after recovery. */
  generation: number;
  /** Version incremented whenever the module-owned source ROI changes. */
  regionRevision: number;
  /** Owned, downsampled grayscale snapshot; never a live video/canvas reference. */
  pixels: Uint8Array;
  width: number;
  height: number;
  quality: ScannerTemporalQuality;
};

export type ScannerTemporalDecodeObservation = {
  timestamp: number;
  generation: number;
  regionRevision: number;
  value: string;
  symbology: string;
  /** Decoder output must already have passed the shared payload validator. */
  validated: true;
};

export type ScannerTemporalDecision =
  | { status: 'pending'; reason: 'insufficient-evidence' | 'unstable-frame' }
  | { status: 'confirmed'; value: string; symbology: string; evidenceCount: number };

/**
 * T1 contract invariants:
 * - Only copied grayscale snapshots may be retained; never retain video,
 *   canvas, ImageData, MediaStreamTrack or DOM objects.
 * - A temporal candidate is scoped to one session generation and one ROI
 *   revision. Any mismatch invalidates the entire candidate window.
 * - A decoder hit is evidence only after payload validation.
 * - Temporal evidence may strengthen acceptance but must never override a
 *   validator rejection or turn a decoder miss into a result.
 * - Existing immediate fast-path results remain eligible for delivery; later
 *   integration must prove that temporal work does not delay them.
 * - All buffers and work are bounded by SCANNER_TEMPORAL_POLICY.
 */
