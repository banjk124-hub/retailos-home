import type { ScannerImageQuality } from './scannerImageEnhancement';

export type ScannerAdaptiveProcessingMode = 'targeted' | 'legacy_fallback' | 'enhancement_bypass';
export type ScannerAdaptiveImageTransform = 'contrast' | 'gamma' | 'denoise';

export type ScannerAdaptiveProcessingPlan = {
  schemaVersion: 1;
  mode: ScannerAdaptiveProcessingMode;
  imageTransforms: ScannerAdaptiveImageTransform[] | null;
  maxImageCandidates: number;
  geometryCandidateLimit: 4;
  orientationPolicy: 'preserve_existing_order';
  scalePolicy: 'preserve_existing_order';
  temporalPolicy: 'preserve_t3_contract';
  reasons: string[];
};

/**
 * A2 policy boundary. It selects only optional image transforms. Baseline,
 * orthogonal rotation, deskew, geometry, ROI scale order and T3 fallback keep
 * their already-tested contracts until dedicated evidence supports changing
 * those strategies. A null transform list explicitly means legacy behavior.
 */
export function createScannerAdaptiveProcessingPlan(
  quality: ScannerImageQuality | null,
): ScannerAdaptiveProcessingPlan {
  if (!quality) {
    return {
      schemaVersion: 1, mode: 'legacy_fallback', imageTransforms: null,
      maxImageCandidates: 2, geometryCandidateLimit: 4,
      orientationPolicy: 'preserve_existing_order',
      scalePolicy: 'preserve_existing_order',
      temporalPolicy: 'preserve_t3_contract',
      reasons: ['quality_unavailable_use_legacy_policy'],
    };
  }

  const issues = new Set(quality.issues);
  const destructiveSignal = issues.has('specular_glare')
    || issues.has('overexposed')
    || issues.has('highlight_clipping')
    || issues.has('shadow_clipping');

  if (destructiveSignal) {
    return {
      schemaVersion: 1, mode: 'enhancement_bypass', imageTransforms: [],
      maxImageCandidates: 0, geometryCandidateLimit: 4,
      orientationPolicy: 'preserve_existing_order',
      scalePolicy: 'preserve_existing_order',
      temporalPolicy: 'preserve_t3_contract',
      reasons: [...issues].filter((issue) => [
        'specular_glare', 'overexposed', 'highlight_clipping', 'shadow_clipping',
      ].includes(issue)),
    };
  }

  const transforms: ScannerAdaptiveImageTransform[] = [];
  const reasons: string[] = [];
  // Match the transform generator's actual eligibility gates. A diagnostic
  // issue alone is not sufficient: selecting a transform that the generator
  // cannot produce would make the plan claim work that never happens.
  if ((issues.has('low_dynamic_range') || issues.has('low_contrast'))
    && quality.dynamicRange >= 16 && quality.dynamicRange < 150
    && quality.darkFraction < 0.6 && quality.brightFraction < 0.6) {
    transforms.push('contrast');
    reasons.push('compressed_contrast');
  }
  if (issues.has('underexposed') && quality.brightFraction < 0.08
    && quality.darkFraction > 0.12 && quality.dynamicRange >= 24) {
    transforms.push('gamma');
    reasons.push('underexposure');
  }
  // The currently deployed denoiser filters horizontally. Do not select it
  // from verticalNoise alone; that observation has no matching transform yet.
  if (issues.has('high_noise') && quality.noise > 14 && quality.contrast < 65) {
    transforms.push('denoise');
    reasons.push('horizontal_impulse_noise');
  }

  if (transforms.length === 0) {
    return {
      schemaVersion: 1, mode: 'legacy_fallback', imageTransforms: null,
      maxImageCandidates: 2, geometryCandidateLimit: 4,
      orientationPolicy: 'preserve_existing_order',
      scalePolicy: 'preserve_existing_order',
      temporalPolicy: 'preserve_t3_contract',
      reasons: ['no_actionable_quality_signal_use_legacy_policy'],
    };
  }

  return {
    schemaVersion: 1, mode: 'targeted', imageTransforms: transforms.slice(0, 2),
    maxImageCandidates: 2, geometryCandidateLimit: 4,
    orientationPolicy: 'preserve_existing_order',
    scalePolicy: 'preserve_existing_order',
    temporalPolicy: 'preserve_t3_contract',
    reasons,
  };
}
