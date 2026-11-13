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

export type ScannerTemporalSnapshot = {
  pixels: Uint8Array;
  width: number;
  height: number;
};

/** Copy grayscale ROI pixels into an independently owned, bounded snapshot. */
export function createScannerTemporalSnapshot(
  grayscale: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): ScannerTemporalSnapshot | null {
  const pixelCount = width * height;
  if (!(grayscale instanceof Uint8Array || grayscale instanceof Uint8ClampedArray)
    || !Number.isSafeInteger(width) || !Number.isSafeInteger(height)
    || width < 1 || height < 1 || !Number.isSafeInteger(pixelCount)
    || grayscale.length !== pixelCount) return null;

  const maxPixels = SCANNER_TEMPORAL_POLICY.maxSnapshotPixels;
  if (pixelCount <= maxPixels) return { pixels: new Uint8Array(grayscale), width, height };

  const scale = Math.sqrt(maxPixels / pixelCount);
  const targetWidth = Math.max(1, Math.floor(width * scale));
  const targetHeight = Math.max(1, Math.min(Math.floor(height * scale), Math.floor(maxPixels / targetWidth)));
  const pixels = new Uint8Array(targetWidth * targetHeight);
  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.min(height - 1, Math.floor((y + 0.5) * height / targetHeight));
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.min(width - 1, Math.floor((x + 0.5) * width / targetWidth));
      pixels[y * targetWidth + x] = grayscale[sourceY * width + sourceX];
    }
  }
  return { pixels, width: targetWidth, height: targetHeight };
}

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

/**
 * T2 bounded snapshot store. The caller supplies an already downsampled,
 * owned grayscale ROI snapshot and quality metrics. This class never reads
 * camera/video/DOM state and never performs decoding.
 */
export class ScannerTemporalFrameBuffer {
  private frames: ScannerTemporalFrame[] = [];

  push(frame: ScannerTemporalFrame): boolean {
    const { timestamp, generation, regionRevision, pixels, width, height, quality } = frame;
    const pixelCount = width * height;
    if (!Number.isFinite(timestamp) || !Number.isSafeInteger(generation)
      || !Number.isSafeInteger(regionRevision) || generation < 0 || regionRevision < 0
      || !Number.isSafeInteger(width) || !Number.isSafeInteger(height)
      || width < 1 || height < 1 || pixelCount > SCANNER_TEMPORAL_POLICY.maxSnapshotPixels
      || !(pixels instanceof Uint8Array) || pixels.length !== pixelCount
      || !quality || ![quality.sharpness, quality.edgeCoverage, quality.motionScore,
        quality.luminanceStdDev].every(Number.isFinite)) return false;

    if (typeof quality.valid !== 'boolean' || quality.sharpness < 0
      || quality.edgeCoverage < 0 || quality.edgeCoverage > 1
      || quality.motionScore < 0 || quality.luminanceStdDev < 0) return false;

    let previous: ScannerTemporalFrame | undefined = this.frames[this.frames.length - 1];
    // Invalidate old evidence before timestamp checks: a new camera generation
    // may legitimately restart its media timestamp clock.
    if (previous && (previous.generation !== generation
      || previous.regionRevision !== regionRevision)) {
      this.clear();
      previous = undefined;
    }
    if (previous && (timestamp <= previous.timestamp
      || timestamp - previous.timestamp < SCANNER_TEMPORAL_POLICY.minObservationIntervalMs)) return false;

    this.frames.push({
      ...frame,
      pixels: new Uint8Array(pixels),
      quality: { ...quality },
    });
    while (this.frames.length > SCANNER_TEMPORAL_POLICY.maxBufferedFrames) this.frames.shift();
    return true;
  }

  selectBest(
    now: number,
    generation: number,
    regionRevision: number,
  ): ScannerTemporalFrame | null {
    if (!Number.isFinite(now) || !Number.isSafeInteger(generation)
      || !Number.isSafeInteger(regionRevision)) return null;

    const eligible = this.frames.filter((frame) =>
      frame.generation === generation
      && frame.regionRevision === regionRevision
      && now >= frame.timestamp
      && now - frame.timestamp <= SCANNER_TEMPORAL_POLICY.maxFrameAgeMs
      && frame.quality.valid
      && frame.quality.edgeCoverage > 0
      && frame.quality.luminanceStdDev > 0,
    );
    if (eligible.length === 0) return null;

    // Sharpness and edge coverage reward readable structure; motion is a
    // penalty. Luminance spread is a weak tie-breaker, not an exposure target.
    const score = (frame: ScannerTemporalFrame) =>
      Math.log1p(Math.max(0, frame.quality.sharpness)) * 0.55
      + Math.min(1, frame.quality.edgeCoverage * 20) * 0.30
      + Math.min(1, frame.quality.luminanceStdDev / 64) * 0.15
      - Math.min(1, frame.quality.motionScore / 32) * 0.35;
    const best = eligible.reduce((winner, candidate) =>
      score(candidate) > score(winner) ? candidate : winner,
    );
    return {
      ...best,
      pixels: new Uint8Array(best.pixels),
      quality: { ...best.quality },
    };
  }

  /** Select and remove one eligible historical frame for a single fallback attempt. */
  takeBest(now: number, generation: number, regionRevision: number): ScannerTemporalFrame | null {
    const best = this.selectBest(now, generation, regionRevision);
    if (!best) return null;
    const index = this.frames.findIndex((frame) =>
      frame.timestamp === best.timestamp
      && frame.generation === generation
      && frame.regionRevision === regionRevision,
    );
    if (index < 0) return null;
    this.frames.splice(index, 1);
    return best;
  }

  clear(): void {
    this.frames = [];
  }

  get size(): number {
    return this.frames.length;
  }
}
