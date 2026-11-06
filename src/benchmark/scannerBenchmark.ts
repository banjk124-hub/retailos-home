import type { ScannerSymbology } from '../platform/scanner/contracts';
import type { ScannerDecoderAdapter } from '../platform/scanner/decoders/decoderAdapter';
import { ZXingDecoderAdapter } from '../platform/scanner/decoders/zxingDecoder';
import { NativeBarcodeDetectorAdapter } from '../platform/scanner/decoders/nativeBarcodeDetector';

type Fixture = { file: File; expectedValue: string; expectedSymbology: ScannerSymbology };
type Row = {
  fixtureId: string; expectedValue: string; expectedSymbology: string;
  deviceModel: string; osVersion: string; browserVersion: string; pwaMode: string;
  backend: string; attempt: number; success: boolean; falsePositive: boolean;
  timeToDecodeMs: number; decodeLatencyMs: number; geometryAvailable: boolean; notes: string;
};
type Summary = {
  fixtureId: string; backend: string; correct: number; falsePositive: number;
  median: number; p95: number; geometry: number; errors: number;
};

const byId = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing benchmark element: ${id}`);
  return element as T;
};
const filesInput = byId<HTMLInputElement>('files');
const fixtureHost = byId<HTMLDivElement>('fixtures');
const runButton = byId<HTMLButtonElement>('run');
const exportButton = byId<HTMLButtonElement>('export');
const status = byId<HTMLDivElement>('status');
const resultsBody = byId<HTMLTableSectionElement>('results');
let fixtures: Fixture[] = [];
let rows: Row[] = [];

filesInput.addEventListener('change', () => {
  fixtures = Array.from(filesInput.files ?? []).map((file) => ({
    file, expectedValue: '', expectedSymbology: 'EAN_13',
  }));
  fixtureHost.replaceChildren();
  fixtures.forEach((fixture, index) => {
    const section = document.createElement('div');
    section.className = 'panel';
    section.style.margin = '12px 0';
    const title = document.createElement('strong');
    title.textContent = fixture.file.name;
    const payloadLabel = document.createElement('label');
    payloadLabel.textContent = 'Exact expected payload';
    const payload = document.createElement('input');
    payload.type = 'text';
    payload.autocomplete = 'off';
    payload.spellcheck = false;
    payload.style.width = '100%';
    payload.addEventListener('input', () => { fixture.expectedValue = payload.value; });
    const formatLabel = document.createElement('label');
    formatLabel.textContent = 'Expected symbology';
    const format = document.createElement('select');
    (['EAN_8', 'EAN_13', 'CODE_128'] as const).forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      format.append(option);
    });
    format.value = fixture.expectedSymbology;
    format.addEventListener('change', () => { fixture.expectedSymbology = format.value as ScannerSymbology; });
    section.append(title, payloadLabel, payload, formatLabel, format);
    fixtureHost.append(section);
  });
  runButton.disabled = fixtures.length === 0;
  status.textContent = fixtures.length ? `${fixtures.length} fixture(s) loaded. Enter expected values before running.` : '';
});

async function loadFixtureImage(file: File): Promise<{ source: CanvasImageSource; dispose: () => void }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, dispose: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  try {
    await image.decode();
    return { source: image, dispose: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}
function csvCell(value: unknown): string {
  const raw = String(value ?? '');
  return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}
function downloadCsv() {
  const columns: (keyof Row)[] = [
    'fixtureId','expectedValue','expectedSymbology','deviceModel','osVersion','browserVersion',
    'pwaMode','backend','attempt','success','falsePositive','timeToDecodeMs',
    'decodeLatencyMs','geometryAvailable','notes',
  ];
  const csv = [columns.join(','), ...rows.map((row) => columns.map((key) => csvCell(row[key])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `retailos-scanner-benchmark-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
exportButton.addEventListener('click', downloadCsv);

async function runBackend(
  backend: string,
  createAdapter: () => ScannerDecoderAdapter,
  fixture: Fixture,
  bitmap: CanvasImageSource,
  warmup: number,
  attempts: number,
  metadata: Omit<Row, 'fixtureId'|'expectedValue'|'expectedSymbology'|'backend'|'attempt'|'success'|'falsePositive'|'timeToDecodeMs'|'decodeLatencyMs'|'geometryAvailable'|'notes'>,
): Promise<{ summary: Summary; records: Row[] }> {
  const adapter = createAdapter();
  const latencies: number[] = [];
  const records: Row[] = [];
  let correct = 0;
  let falsePositive = 0;
  let geometry = 0;
  let errors = 0;
  try {
    try {
      await adapter.initialize({ formats: [fixture.expectedSymbology] });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors = attempts;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        records.push({
          ...metadata, fixtureId: fixture.file.name, expectedValue: fixture.expectedValue,
          expectedSymbology: fixture.expectedSymbology, backend, attempt,
          success: false, falsePositive: false, timeToDecodeMs: 0,
          decodeLatencyMs: 0, geometryAvailable: false, notes: `Initialization unavailable: ${message}`,
        });
      }
      return {
        summary: { fixtureId: fixture.file.name, backend, correct, falsePositive, median: 0, p95: 0, geometry, errors },
        records,
      };
    }
    for (let attempt = -warmup; attempt < attempts; attempt += 1) {
      const started = performance.now();
      try {
        const decoded = await adapter.decode(bitmap, started);
        const elapsed = performance.now() - started;
        if (attempt >= 0) {
          latencies.push(elapsed);
          const match = decoded.some((item) => item.value === fixture.expectedValue && item.symbology === fixture.expectedSymbology);
          const unexpected = decoded.some((item) => item.value !== fixture.expectedValue || item.symbology !== fixture.expectedSymbology);
          if (match) correct += 1;
          if (unexpected) falsePositive += 1;
          if (decoded.some((item) => item.geometry)) geometry += 1;
          records.push({
            ...metadata, fixtureId: fixture.file.name, expectedValue: fixture.expectedValue,
            expectedSymbology: fixture.expectedSymbology, backend, attempt: attempt + 1,
            success: match, falsePositive: unexpected, timeToDecodeMs: elapsed,
            decodeLatencyMs: elapsed, geometryAvailable: decoded.some((item) => Boolean(item.geometry)),
            notes: decoded.length ? decoded.map((item) => `${item.symbology}:${item.value}`).join('|') : '',
          });
        }
      } catch (error) {
        if (attempt >= 0) {
          errors += 1;
          const elapsed = performance.now() - started;
          latencies.push(elapsed);
          records.push({
            ...metadata, fixtureId: fixture.file.name, expectedValue: fixture.expectedValue,
            expectedSymbology: fixture.expectedSymbology, backend, attempt: attempt + 1,
            success: false, falsePositive: false, timeToDecodeMs: elapsed,
            decodeLatencyMs: elapsed, geometryAvailable: false,
            notes: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  } finally {
    await adapter.dispose();
  }
  return {
    summary: {
      fixtureId: fixture.file.name, backend, correct, falsePositive,
      median: percentile(latencies, 0.5), p95: percentile(latencies, 0.95), geometry, errors,
    },
    records,
  };
}

runButton.addEventListener('click', async () => {
  if (!fixtures.length || fixtures.some((fixture) => !fixture.expectedValue.trim())) {
    status.textContent = 'Enter the exact expected payload for every fixture.';
    return;
  }
  const warmup = Math.max(0, Math.min(10, Number(byId<HTMLInputElement>('warmup').value) || 0));
  const attempts = Math.max(1, Math.min(50, Number(byId<HTMLInputElement>('attempts').value) || 10));
  const metadata = {
    deviceModel: byId<HTMLInputElement>('device').value || 'not recorded',
    osVersion: byId<HTMLInputElement>('os').value || navigator.platform,
    browserVersion: byId<HTMLInputElement>('browser').value || navigator.userAgent,
    pwaMode: byId<HTMLSelectElement>('mode').value,
  };
  runButton.disabled = true;
  exportButton.disabled = true;
  rows = [];
  const summaries: Summary[] = [];
  resultsBody.replaceChildren();
  try {
    const backends = [
      { name: 'ZXing', create: () => new ZXingDecoderAdapter() },
      { name: 'Native BarcodeDetector', create: () => new NativeBarcodeDetectorAdapter() },
    ];
    let completed = 0;
    const total = fixtures.length * backends.length;
    for (const fixture of fixtures) {
      const loadedImage = await loadFixtureImage(fixture.file);
      try {
        for (const backend of backends) {
          completed += 1;
          status.textContent = `Running ${completed}/${total}: ${fixture.file.name} — ${backend.name}`;
          const result = await runBackend(backend.name, backend.create, fixture, loadedImage.source, warmup, attempts, metadata);
          summaries.push(result.summary);
          rows.push(...result.records);
        }
      } finally {
        loadedImage.dispose();
      }
    }
    summaries.forEach((item) => {
      const tr = document.createElement('tr');
      [item.fixtureId,item.backend,`${item.correct}/${attempts}`,item.falsePositive,item.median.toFixed(2),item.p95.toFixed(2),item.geometry,item.errors]
        .forEach((value) => { const td = document.createElement('td'); td.textContent = String(value); tr.append(td); });
      resultsBody.append(tr);
    });
    status.textContent = `Completed. ${rows.length} measured attempt(s). Export CSV to preserve raw observations.`;
    exportButton.disabled = rows.length === 0;
  } catch (error) {
    status.textContent = `Benchmark stopped: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    runButton.disabled = false;
  }
});
