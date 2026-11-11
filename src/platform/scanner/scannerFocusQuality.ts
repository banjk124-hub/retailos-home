export type ScannerFocusQualitySample = {
  /** RMS Laplacian response; larger values generally indicate sharper edges. */
  sharpness: number;
  /** Fraction of sampled pixels containing a meaningful high-frequency edge. */
  edgeCoverage: number;
  /** Local frame-to-frame change after removing global brightness shift. */
  motionScore: number;
  /** Internal low-resolution sample retained by the decoder for the next comparison. */
  sampledPixels: Uint8Array;
  valid: boolean;
};

const SAMPLE_STEP = 4;
const EDGE_THRESHOLD = 18;
const MIN_EDGE_COVERAGE = 0.002;
const MIN_REFERENCE_SHARPNESS = 8;
const BLUR_RATIO = 0.55;
const REQUIRED_BLUR_SAMPLES = 4;
const RECOVERY_COOLDOWN_MS = 8_000;
const MAX_STABLE_MOTION_SCORE = 14;

/**
 * Measure focus quality from an already-decoded grayscale ROI. This does not
 * inspect the DOM or camera controls and adds no extra frame capture/readback.
 * Low-texture frames are marked invalid rather than treated as defocus.
 */
export function measureScannerFocusQuality(
  luminance: Uint8ClampedArray,
  width: number,
  height: number,
  previousSampledPixels?: Uint8Array | null,
): ScannerFocusQualitySample {
  if (!(luminance instanceof Uint8ClampedArray)
    || !Number.isSafeInteger(width) || !Number.isSafeInteger(height)
    || width < 5 || height < 5 || luminance.length !== width * height) {
    return { sharpness: 0, edgeCoverage: 0, motionScore: 0, sampledPixels: new Uint8Array(), valid: false };
  }

  let squaredResponse = 0;
  let edgeSamples = 0;
  let samples = 0;
  const sampledPixels = new Uint8Array(
    Math.ceil((height - 4) / SAMPLE_STEP) * Math.ceil((width - 4) / SAMPLE_STEP),
  );
  for (let y = 2; y < height - 2; y += SAMPLE_STEP) {
    const row = y * width;
    for (let x = 2; x < width - 2; x += SAMPLE_STEP) {
      const index = row + x;
      sampledPixels[samples] = luminance[index];
      const response = 4 * luminance[index]
        - luminance[index - 1]
        - luminance[index + 1]
        - luminance[index - width]
        - luminance[index + width];
      const magnitude = Math.abs(response);
      squaredResponse += response * response;
      if (magnitude >= EDGE_THRESHOLD) edgeSamples += 1;
      samples += 1;
    }
  }

  if (samples < 64) return { sharpness: 0, edgeCoverage: 0, motionScore: 0, sampledPixels, valid: false };
  const sharpness = Math.sqrt(squaredResponse / samples);
  const edgeCoverage = edgeSamples / samples;
  let motionScore = 0;
  if (previousSampledPixels && previousSampledPixels.length === samples) {
    let meanDelta = 0;
    for (let index = 0; index < samples; index += 1) {
      meanDelta += sampledPixels[index] - previousSampledPixels[index];
    }
    meanDelta /= samples;
    let residualTotal = 0;
    for (let index = 0; index < samples; index += 1) {
      residualTotal += Math.abs((sampledPixels[index] - previousSampledPixels[index]) - meanDelta);
    }
    motionScore = residualTotal / samples;
  }
  return {
    sharpness: Number(sharpness.toFixed(2)),
    edgeCoverage: Number(edgeCoverage.toFixed(4)),
    motionScore: Number(motionScore.toFixed(2)),
    sampledPixels,
    valid: Number.isFinite(sharpness) && edgeCoverage >= MIN_EDGE_COVERAGE,
  };
}

/**
 * Detect sustained relative sharpness loss after a previously sharp frame.
 * A single blurred/motion frame never triggers camera reconfiguration.
 */
export class ScannerFocusWatchdog {
  private referenceSharpness = 0;
  private consecutiveBlurSamples = 0;
  private lastRecoveryAt = Number.NEGATIVE_INFINITY;

  observe(sample: ScannerFocusQualitySample, timestamp: number): boolean {
    if (!sample.valid || !Number.isFinite(sample.sharpness) || !Number.isFinite(timestamp)) {
      this.consecutiveBlurSamples = 0;
      return false;
    }

    // Motion blur or a changing scene must settle before autofocus is re-armed.
    if (!Number.isFinite(sample.motionScore) || sample.motionScore > MAX_STABLE_MOTION_SCORE) {
      this.consecutiveBlurSamples = 0;
      return false;
    }

    if (this.referenceSharpness < MIN_REFERENCE_SHARPNESS) {
      if (sample.sharpness >= MIN_REFERENCE_SHARPNESS) {
        this.referenceSharpness = sample.sharpness;
      }
      return false;
    }

    if (sample.sharpness >= this.referenceSharpness * 0.82) {
      this.referenceSharpness = Math.max(sample.sharpness, this.referenceSharpness * 0.995);
      this.consecutiveBlurSamples = 0;
      return false;
    }

    if (sample.sharpness < this.referenceSharpness * BLUR_RATIO) {
      this.consecutiveBlurSamples += 1;
    } else {
      this.consecutiveBlurSamples = 0;
    }

    if (this.consecutiveBlurSamples < REQUIRED_BLUR_SAMPLES
      || timestamp - this.lastRecoveryAt < RECOVERY_COOLDOWN_MS) return false;

    this.lastRecoveryAt = timestamp;
    this.consecutiveBlurSamples = 0;
    return true;
  }

  reset(): void {
    this.referenceSharpness = 0;
    this.consecutiveBlurSamples = 0;
    this.lastRecoveryAt = Number.NEGATIVE_INFINITY;
  }
}
