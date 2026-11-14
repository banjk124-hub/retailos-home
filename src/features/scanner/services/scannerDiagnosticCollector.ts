export type ScannerDiagnosticLevel = 'info' | 'warn';
export type ScannerDiagnosticEvent = {
  id: number;
  timestamp: string;
  level: ScannerDiagnosticLevel;
  category: string;
  metrics: Record<string, unknown>;
};

const MAX_EVENTS = 1000;
const PREFIX = '[RetailOS Scanner]';
const ALLOWED_KEYS = new Set([
  'session', 'decoder', 'stage', 'durationMs', 'phase', 'phaseCommitIntervalMs',
  'decodeAttempts', 'framesWithSymbols', 'accepted', 'rejectedByValidation',
  'decoderErrors', 'callbackErrors', 'decodeDurationAverageMs', 'decodeDurationMaxMs',
  'maxFrameCallbackGapMs', 'longTasks', 'layoutShiftScore', 'validationRejectReasons',
  'averageDecodeMs', 'maxDecodeMs', 'samples', 'stages', 'sourceWidth', 'sourceHeight',
  'frames', 'decoded', 'roiHits', 'roiUnavailable', 'roiWidth', 'roiHeight', 'roiSourceScale', 'rotationAttempts', 'rotationHits', 'deskewAttempts', 'deskewEstimateMisses', 'deskewHits', 'scaleAttempts', 'scaleHits', 'lastScaleFactor', 'lastDeskewAngleDegrees', 'notFound', 'checksumErrors', 'formatErrors',
  'unexpectedErrors', 'valueLength', 'symbology', 'mode', 'adaptiveProcessingPlan', 'adaptiveRuntimeMode', 'adaptiveRuntimeImageBudget', 'adaptiveRuntimeGeometryBudget', 'adaptiveRuntimeTransitions', 'adaptiveRuntimeDecodeMs', 'adaptiveRuntimeFrameGapMs', 'adaptiveRuntimeReason', 'focusStatus', 'focusModes', 'focusRequestMs', 'focusErrorName', 'focusSharpness', 'focusSharpnessMin', 'focusEdgeCoverage', 'focusMotionScore', 'focusQualitySamples', 'focusSustainedBlurEvents', 'focusQualityStatus', 'cameraControlChanged',
  'width', 'height', 'frameRate', 'facingMode', 'focusMode', 'exposureMode', 'whiteBalanceMode', 'pageLifecycle', 'frameCallbackObserved',
  'videoReadyMs', 'videoReadyState', 'videoWidth', 'videoHeight', 'trackEvent', 'trackMuted', 'trackReadyState',
]);
let events: ScannerDiagnosticEvent[] = [];
let sequence = 0;
let installed = false;
const listeners = new Set<() => void>();

function safeMetrics(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    if (key === 'adaptiveProcessingPlan' && value && typeof value === 'object' && !Array.isArray(value)) {
      const plan = value as Record<string, unknown>;
      const stringArray = (candidate: unknown) => Array.isArray(candidate)
        ? candidate.filter((item): item is string => typeof item === 'string').slice(0, 12)
        : [];
      const allowedModes = new Set(['targeted', 'legacy_fallback', 'enhancement_bypass']);
      const allowedTransforms = new Set(['contrast', 'gamma', 'denoise']);
      const transforms = stringArray(plan.imageTransforms)
        .filter((item) => allowedTransforms.has(item));
      output.adaptiveProcessingPlan = {
        schemaVersion: plan.schemaVersion === 1 ? 1 : undefined,
        mode: typeof plan.mode === 'string' && allowedModes.has(plan.mode) ? plan.mode : undefined,
        imageTransforms: plan.imageTransforms === null ? null : transforms,
        maxImageCandidates: typeof plan.maxImageCandidates === 'number'
          ? Math.max(0, Math.min(4, plan.maxImageCandidates)) : undefined,
        geometryCandidateLimit: typeof plan.geometryCandidateLimit === 'number'
          ? Math.max(0, Math.min(4, plan.geometryCandidateLimit)) : undefined,
        orientationPolicy: plan.orientationPolicy === 'preserve_existing_order'
          ? plan.orientationPolicy : undefined,
        scalePolicy: plan.scalePolicy === 'preserve_existing_order'
          ? plan.scalePolicy : undefined,
        temporalPolicy: plan.temporalPolicy === 'preserve_t3_contract'
          ? plan.temporalPolicy : undefined,
        reasons: stringArray(plan.reasons),
      };
    } else if (key === 'stages' && value && typeof value === 'object' && !Array.isArray(value)) {
      const stages: Record<string, unknown> = {};
      for (const [stage, detail] of Object.entries(value as Record<string, unknown>)) {
        if (!detail || typeof detail !== 'object' || Array.isArray(detail)) continue;
        const item = detail as Record<string, unknown>;
        stages[stage] = {
          samples: typeof item.samples === 'number' ? item.samples : undefined,
          averageMs: typeof item.averageMs === 'number' ? item.averageMs : undefined,
          maxMs: typeof item.maxMs === 'number' ? item.maxMs : undefined,
        };
      }
      output.stages = stages;
    } else if (key === 'validationRejectReasons' && value && typeof value === 'object' && !Array.isArray(value)) {
      output.validationRejectReasons = Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .filter(([, count]) => typeof count === 'number')
          .slice(0, 20),
      );
    } else if (['string', 'number', 'boolean'].includes(typeof value)) {
      output[key] = value;
    }
  }
  return output;
}

function publish(level: ScannerDiagnosticLevel, args: unknown[]): void {
  const message = args.find((item) => typeof item === 'string' && item.startsWith(PREFIX));
  if (typeof message !== 'string') return;
  const payload = args.find((item) => item && typeof item === 'object' && !Array.isArray(item));
  const metrics = safeMetrics(payload);
  const category = message.slice(PREFIX.length).trim() || 'Diagnostic';
  events = [...events, {
    id: ++sequence,
    timestamp: new Date().toISOString(),
    level,
    category,
    metrics,
  }].slice(-MAX_EVENTS);
  listeners.forEach((listener) => listener());
}

export function installScannerDiagnosticCollector(): () => void {
  if (installed) return () => undefined;
  installed = true;
  const originalInfo = console.info.bind(console);
  const originalWarn = console.warn.bind(console);
  console.info = (...args: unknown[]) => {
    publish('info', args);
    originalInfo(...args);
  };
  console.warn = (...args: unknown[]) => {
    publish('warn', args);
    originalWarn(...args);
  };
  return () => {
    console.info = originalInfo;
    console.warn = originalWarn;
    installed = false;
  };
}

export function getScannerDiagnosticSnapshot(): ScannerDiagnosticEvent[] {
  return events;
}

export function subscribeScannerDiagnostics(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearScannerDiagnostics(): void {
  events = [];
  listeners.forEach((listener) => listener());
}

export function exportScannerDiagnostics(): string {
  return JSON.stringify({
    schemaVersion: 1,
    product: 'RetailOS',
    reportType: 'scanner-qa-diagnostics',
    exportedAt: new Date().toISOString(),
    eventCount: events.length,
    privacy: {
      barcodePayloadsExcluded: true,
      cameraDeviceIdentifiersExcluded: true,
      employeeIdentifiersExcluded: true,
      persistentDeviceIdentifiersExcluded: true,
      storage: 'in-memory-only',
    },
    events,
  }, null, 2);
}
