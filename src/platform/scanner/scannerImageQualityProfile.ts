import type { ScannerFocusQualitySample } from './scannerFocusQuality';
import type { ScannerImageQuality, ScannerImageQualityIssue } from './scannerImageEnhancement';

export type ScannerImageQualityProfile = {
  schemaVersion: 1;
  timestamp: number;
  roi: { width: number; height: number };
  focus: {
    valid: boolean;
    sharpness: number;
    edgeCoverage: number;
    luminanceStdDev: number;
    motionScore: number;
  };
  exposure: {
    meanLuminance: number;
    darkFraction: number;
    brightFraction: number;
    dynamicRange: number;
  };
  contrast: {
    horizontal: number;
    vertical: number;
    edgeStrength: number;
  };
  noise: { horizontal: number; vertical: number };
  glare: {
    fraction: number;
    bandCoverage: number;
    orientation: 'horizontal' | 'vertical' | 'both' | null;
  };
  issues: ScannerImageQualityIssue[];
};

const finite = (values: number[]) => values.every(Number.isFinite);
const round = (value: number) => Number(value.toFixed(2));

/**
 * Combine independent focus and luminance observations into one immutable,
 * serializable profile. This is observation-only: it does not rank decode
 * candidates, alter camera settings, or infer a recovery action.
 */
export function createScannerImageQualityProfile(
  width: number,
  height: number,
  timestamp: number,
  focus: Pick<ScannerFocusQualitySample, 'valid' | 'sharpness' | 'edgeCoverage' | 'luminanceStdDev' | 'motionScore'>,
  image: ScannerImageQuality,
): ScannerImageQualityProfile | null {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)
    || width < 1 || height < 1 || !Number.isFinite(timestamp)
    || !finite([focus.sharpness, focus.edgeCoverage, focus.luminanceStdDev, focus.motionScore,
      image.meanLuminance, image.darkFraction, image.brightFraction, image.dynamicRange,
      image.contrast, image.verticalContrast, image.edgeStrength, image.noise,
      image.verticalNoise, image.specularGlareFraction, image.glareBandCoverage])
    || typeof focus.valid !== 'boolean') return null;

  return {
    schemaVersion: 1,
    timestamp,
    roi: { width, height },
    focus: {
      valid: focus.valid,
      sharpness: round(focus.sharpness),
      edgeCoverage: round(focus.edgeCoverage),
      luminanceStdDev: round(focus.luminanceStdDev),
      motionScore: round(focus.motionScore),
    },
    exposure: {
      meanLuminance: round(image.meanLuminance),
      darkFraction: round(image.darkFraction),
      brightFraction: round(image.brightFraction),
      dynamicRange: round(image.dynamicRange),
    },
    contrast: {
      horizontal: round(image.contrast),
      vertical: round(image.verticalContrast),
      edgeStrength: round(image.edgeStrength),
    },
    noise: {
      horizontal: round(image.noise),
      vertical: round(image.verticalNoise),
    },
    glare: {
      fraction: round(image.specularGlareFraction),
      bandCoverage: round(image.glareBandCoverage),
      orientation: image.glareBandOrientation,
    },
    issues: [...image.issues],
  };
}
