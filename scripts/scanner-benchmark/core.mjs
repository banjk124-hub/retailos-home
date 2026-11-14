export const BENCHMARK_SYMBOLOGIES = Object.freeze(['EAN_8', 'EAN_13', 'CODE_128', 'CODE_39']);
export const BENCHMARK_BACKENDS = Object.freeze(['zxing-js', 'zxing-wasm']);

export function validateBenchmarkManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return ['Manifest must be a JSON object.'];
  }
  if (manifest.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (typeof manifest.corpusId !== 'string' || !manifest.corpusId.trim()) {
    errors.push('corpusId must be a non-empty string.');
  }
  if (!Array.isArray(manifest.cases) || manifest.cases.length === 0) {
    errors.push('cases must contain at least one labelled case.');
    return errors;
  }

  const ids = new Set();
  manifest.cases.forEach((item, index) => {
    const prefix = `cases[${index}]`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`${prefix} must be an object.`);
      return;
    }
    if (typeof item.id !== 'string' || !item.id.trim()) errors.push(`${prefix}.id is required.`);
    else if (ids.has(item.id)) errors.push(`${prefix}.id is duplicated: ${item.id}.`);
    else ids.add(item.id);

    if (typeof item.image !== 'string' || !item.image.trim()) {
      errors.push(`${prefix}.image is required.`);
    } else if (item.image.startsWith('/') || item.image.split(/[\\/]/).includes('..')) {
      errors.push(`${prefix}.image must be a relative file path without parent traversal.`);
    }

    if (!['physical', 'synthetic'].includes(item.captureKind)) {
      errors.push(`${prefix}.captureKind must be physical or synthetic.`);
    }

    if (item.expected !== null) {
      if (!item.expected || typeof item.expected !== 'object'
        || typeof item.expected.value !== 'string' || !item.expected.value.length) {
        errors.push(`${prefix}.expected must be null or contain a non-empty value and symbology.`);
      }
      if (!BENCHMARK_SYMBOLOGIES.includes(item.expected?.symbology)) {
        errors.push(`${prefix}.expected.symbology must be one of the active RetailOS formats.`);
      }
    }

    const region = item.scanRegion;
    const rect = region?.rect;
    if (region?.coordinateSpace !== 'source-frame-normalized' || !rect
      || ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)
      || rect.x < 0 || rect.y < 0 || rect.width <= 0 || rect.height <= 0
      || rect.x + rect.width > 1 + 1e-7 || rect.y + rect.height > 1 + 1e-7) {
      errors.push(`${prefix}.scanRegion must be a valid source-frame-normalized ROI within 0..1.`);
    }

    if (!item.labels || typeof item.labels !== 'object' || Array.isArray(item.labels)) {
      errors.push(`${prefix}.labels must describe capture conditions.`);
    }
  });
  return errors;
}

export function percentile(values, quantile) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * Math.min(1, Math.max(0, quantile));
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function summarizeBenchmarkRows(rows) {
  const backends = [...new Set(rows.map((row) => row.backend))];
  return backends.map((backend) => {
    const subset = rows.filter((row) => row.backend === backend);
    const positive = subset.filter((row) => row.expectedPositive);
    const negative = subset.filter((row) => !row.expectedPositive);
    const matched = positive.filter((row) => row.outcome === 'match').length;
    const falsePositives = negative.filter((row) => row.outcome === 'false-positive').length;
    const durations = subset.map((row) => row.decodeMs).filter(Number.isFinite);
    return {
      backend,
      attempts: subset.length,
      positiveAttempts: positive.length,
      negativeAttempts: negative.length,
      exactMatches: matched,
      misses: positive.filter((row) => row.outcome === 'miss').length,
      wrongDecodes: positive.filter((row) => row.outcome === 'wrong-decode').length,
      falsePositives,
      errors: subset.filter((row) => row.outcome === 'error').length,
      exactMatchRate: positive.length ? matched / positive.length : null,
      falsePositiveRate: negative.length ? falsePositives / negative.length : null,
      decodeP50Ms: percentile(durations, 0.5),
      decodeP95Ms: percentile(durations, 0.95),
    };
  });
}
