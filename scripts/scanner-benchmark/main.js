import { ZXingDecoderAdapter } from '../../src/platform/scanner/decoders/zxingDecoder.ts';
import { ZXingWasmDecoderAdapter } from '../../src/platform/scanner/decoders/zxingWasmDecoder.ts';
import {
  BENCHMARK_BACKENDS,
  summarizeBenchmarkRows,
  validateBenchmarkManifest,
} from './core.mjs';

const byId = (id) => document.getElementById(id);
const manifestInput = byId('manifest');
const imagesInput = byId('images');
const runButton = byId('run');
const downloadButton = byId('download');
const status = byId('status');
const reportView = byId('report');
let manifest = null;
let selectedFiles = [];
let latestReport = null;

function setStatus(message) {
  status.textContent = message;
}

function imageIndex(files) {
  const index = new Map();
  for (const file of files) {
    const relative = file.webkitRelativePath || file.name;
    if (!index.has(relative)) index.set(relative, file);
    if (!index.has(file.name)) index.set(file.name, file);
  }
  return index;
}

function syncReady() {
  runButton.disabled = !manifest || !selectedFiles.length || validateBenchmarkManifest(manifest).length > 0;
}

manifestInput.addEventListener('change', async () => {
  manifest = null;
  const file = manifestInput.files?.[0];
  if (!file) return syncReady();
  try {
    manifest = JSON.parse(await file.text());
    const errors = validateBenchmarkManifest(manifest);
    setStatus(errors.length ? errors.join(' ') : `Manifest loaded: ${manifest.cases.length} cases.`);
  } catch (error) {
    setStatus(`Manifest error: ${error instanceof Error ? error.message : 'invalid JSON'}`);
  }
  syncReady();
});

imagesInput.addEventListener('change', () => {
  selectedFiles = [...(imagesInput.files || [])];
  setStatus(`Selected ${selectedFiles.length} image files.`);
  syncReady();
});

function memorySnapshot() {
  const memory = performance.memory;
  if (memory && Number.isFinite(memory.usedJSHeapSize)) return memory.usedJSHeapSize;
  return null;
}

async function loadImageSource(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, dispose: () => bitmap.close() };
    } catch {
      // Fall through to the HTMLImageElement path for browser-specific file decoder gaps.
    }
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  try {
    if (typeof image.decode === 'function') await image.decode();
    else await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      dispose: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function classify(outputs, expected) {
  if (expected === null) return outputs.length ? 'false-positive' : 'true-negative';
  const exact = outputs.some((output) => output.value === expected.value
    && output.symbology === expected.symbology);
  if (exact) return 'match';
  return outputs.length ? 'wrong-decode' : 'miss';
}

async function runBackend(backend, cases, files, repeats) {
  const Adapter = backend === 'zxing-js' ? ZXingDecoderAdapter : ZXingWasmDecoderAdapter;
  const adapter = new Adapter();
  const rows = [];
  const initStarted = performance.now();
  let initMs = null;
  let memoryBefore = memorySnapshot();
  let memoryAfter = null;
  try {
    await adapter.initialize({ formats: ['EAN_8', 'EAN_13', 'CODE_128', 'CODE_39'] });
    initMs = performance.now() - initStarted;
    for (const item of cases) {
      const file = files.get(item.image) || files.get(item.image.split(/[\\/]/).pop());
      if (!file) throw new Error(`Missing image file for case ${item.id}: ${item.image}`);
      const loaded = await loadImageSource(file);
      try {
        for (let trial = 1; trial <= repeats; trial += 1) {
          const started = performance.now();
          try {
            const outputs = await adapter.decode(loaded.source, {
              timestamp: performance.now(),
              scanRegion: item.scanRegion,
            });
            rows.push({
              caseId: item.id,
              captureKind: item.captureKind,
              labels: item.labels,
              imageWidth: loaded.width,
              imageHeight: loaded.height,
              backend,
              trial,
              expectedPositive: item.expected !== null,
              outcome: classify(outputs, item.expected),
              outputCount: outputs.length,
              detectedSymbology: outputs[0]?.symbology ?? null,
              decodeMs: performance.now() - started,
            });
          } catch (error) {
            rows.push({
              caseId: item.id,
              captureKind: item.captureKind,
              labels: item.labels,
              imageWidth: loaded.width,
              imageHeight: loaded.height,
              backend,
              trial,
              expectedPositive: item.expected !== null,
              outcome: 'error',
              outputCount: 0,
              detectedSymbology: null,
              errorName: error instanceof Error ? error.name : 'UnknownError',
              decodeMs: performance.now() - started,
            });
          }
        }
      } finally {
        loaded.dispose();
      }
    }
  } finally {
    await adapter.dispose();
    memoryAfter = memorySnapshot();
  }
  return {
    backend,
    initMs,
    memoryBeforeBytes: memoryBefore,
    memoryAfterBytes: memoryAfter,
    rows,
  };
}

function downloadReport() {
  if (!latestReport) return;
  const blob = new Blob([JSON.stringify(latestReport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `retailos-scanner-benchmark-${Date.now()}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

runButton.addEventListener('click', async () => {
  runButton.disabled = true;
  downloadButton.disabled = true;
  reportView.textContent = 'Benchmark running…';
  const errors = validateBenchmarkManifest(manifest);
  if (errors.length) {
    setStatus(errors.join(' '));
    return syncReady();
  }
  const files = imageIndex(selectedFiles);
  const missing = manifest.cases.filter((item) => !files.has(item.image)
    && !files.has(item.image.split(/[\\/]/).pop()));
  if (missing.length) {
    setStatus(`Missing ${missing.length} image file(s): ${missing.map((item) => item.image).join(', ')}`);
    return syncReady();
  }

  const repeats = Math.min(10, Math.max(1, Number.parseInt(byId('repeats').value, 10) || 1));
  const order = byId('reverse').checked ? [...BENCHMARK_BACKENDS].reverse() : [...BENCHMARK_BACKENDS];
  const runStartedAt = new Date().toISOString();
  const backendReports = [];
  try {
    for (const backend of order) {
      setStatus(`Running ${backend}…`);
      backendReports.push(await runBackend(backend, manifest.cases, files, repeats));
    }
    const rows = backendReports.flatMap((item) => item.rows);
    latestReport = {
      schemaVersion: 1,
      corpusId: manifest.corpusId,
      runStartedAt,
      completedAt: new Date().toISOString(),
      environment: {
        userAgent: navigator.userAgent,
        platform: navigator.platform || null,
        deviceMemoryGb: navigator.deviceMemory ?? null,
        hardwareConcurrency: navigator.hardwareConcurrency ?? null,
        viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
        secureContext: window.isSecureContext,
      },
      scope: 'decoder-adapter-only; no camera, session cadence, Home/Stocktake UI or end-to-end first-result timing',
      backendReports: backendReports.map(({ rows: _rows, ...metadata }) => metadata),
      summaries: summarizeBenchmarkRows(rows),
      results: rows,
    };
    reportView.textContent = JSON.stringify({
      corpusId: latestReport.corpusId,
      environment: latestReport.environment,
      backendReports: latestReport.backendReports,
      summaries: latestReport.summaries,
      resultCount: rows.length,
    }, null, 2);
    setStatus('Benchmark completed. Review sample counts before comparing results.');
    downloadButton.disabled = false;
  } catch (error) {
    setStatus(`Benchmark failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    reportView.textContent = String(error);
  } finally {
    syncReady();
  }
});

downloadButton.addEventListener('click', downloadReport);
