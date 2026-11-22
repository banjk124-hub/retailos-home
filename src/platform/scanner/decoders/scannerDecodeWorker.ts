import { prepareZXingModule, readBarcodes, ZXING_WASM_VERSION } from 'zxing-wasm/reader';
import readerWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import { createZXingWasmReaderOptions, isZXingWasmReadResultValid } from './zxingWasmOptions';

type Symbology = string;
type InitMessage = { type: 'INIT'; protocolVersion: 1; generation: number; formats: Symbology[] };
type DecodeMessage = { type: 'DECODE'; protocolVersion: 1; generation: number; jobId: number; width: number; height: number; pixels: ArrayBuffer };
type CancelMessage = { type: 'CANCEL'; protocolVersion: 1; generation: number; jobId: number };
type DisposeMessage = { type: 'DISPOSE'; protocolVersion: 1; generation: number };
type Incoming = InitMessage | DecodeMessage | CancelMessage | DisposeMessage;
type WorkerScopeLike = DedicatedWorkerGlobalScope;

const scope = self as unknown as WorkerScopeLike;
const FORMAT_MAP: Record<string, string> = {
  EAN_8: 'EAN8', EAN_13: 'EAN13', UPC_A: 'UPCA', UPC_E: 'UPCE',
  CODE_128: 'Code128', CODE_39: 'Code39', CODE_93: 'Code93',
  ITF: 'ITF', CODABAR: 'Codabar', QR_CODE: 'QRCode',
  DATA_MATRIX: 'DataMatrix', PDF_417: 'PDF417', AZTEC: 'Aztec',
  RSS_14: 'DataBar', RSS_EXPANDED: 'DataBarExp', MAXICODE: 'MaxiCode',
  MICRO_QR_CODE: 'MicroQRCode',
};
const WASM_OVERRIDES = {
  locateFile(path: string, prefix: string) {
    return path.endsWith('.wasm') ? readerWasmUrl : `${prefix}${path}`;
  },
};
let generation = 0;
let initialized = false;
let formats: string[] = [];
let cancelled = new Set<number>();
let disposed = false;
let initPromise: Promise<unknown> | null = null;

function post(type: string, payload: Record<string, unknown> = {}) {
  scope.postMessage({ type, protocolVersion: 1, generation, ...payload });
}
async function initialize(message: InitMessage) {
  generation = message.generation;
  initialized = false;
  disposed = false;
  cancelled.clear();
  const mapped = [...new Set(message.formats)].map((format) => FORMAT_MAP[format]).filter(Boolean);
  if (!mapped.length || mapped.length !== new Set(message.formats).size) throw new Error('Unsupported or empty barcode format allowlist.');
  formats = mapped;
  if (!initPromise) initPromise = prepareZXingModule({ overrides: WASM_OVERRIDES, fireImmediately: true }).catch((error) => {
    initPromise = null;
    throw error;
  });
  await initPromise;
  if (disposed || generation !== message.generation) return;
  initialized = true;
  post('READY', { wasmVersion: String(ZXING_WASM_VERSION) });
}
async function decode(message: DecodeMessage) {
  if (!initialized || disposed || message.generation !== generation) {
    post('RESULT', { jobId: message.jobId, results: [], stale: true });
    return;
  }
  if (!Number.isSafeInteger(message.width) || !Number.isSafeInteger(message.height)
    || message.width < 1 || message.height < 1 || message.width * message.height > 1_500_000
    || message.pixels.byteLength !== message.width * message.height * 4) {
    post('ERROR', { jobId: message.jobId, error: 'Invalid or oversized frame payload.' });
    return;
  }
  try {
    const pixels = new Uint8ClampedArray(message.pixels);
    const imageData = new ImageData(pixels, message.width, message.height);
    const results = await readBarcodes(imageData, createZXingWasmReaderOptions(formats));
    if (disposed || message.generation !== generation || cancelled.has(message.jobId)) {
      cancelled.delete(message.jobId);
      post('RESULT', { jobId: message.jobId, results: [], stale: true });
      return;
    }
    const accepted = results.filter(isZXingWasmReadResultValid).map((result) => ({
      text: typeof result.text === 'string' ? result.text : '',
      format: String(result.format ?? ''),
      isValid: result.isValid !== false,
    })).filter((result) => result.text.length > 0 && formats.includes(result.format));
    post('RESULT', { jobId: message.jobId, results: accepted });
  } catch (error) {
    post('ERROR', { jobId: message.jobId, error: error instanceof Error ? error.message : String(error) });
  }
}
scope.onmessage = (event: MessageEvent<Incoming>) => {
  const message = event.data;
  if (!message || message.protocolVersion !== 1) return;
  if (message.type === 'INIT') {
    void initialize(message).then(() => post('READY', { wasmVersion: String(ZXING_WASM_VERSION) })).catch((error) => post('ERROR', { error: error instanceof Error ? error.message : String(error), phase: 'init' }));
    return;
  }
  if (message.generation !== generation) return;
  if (message.type === 'DECODE') void decode(message);
  if (message.type === 'CANCEL') cancelled.add(message.jobId);
  if (message.type === 'DISPOSE') {
    disposed = true;
    initialized = false;
    cancelled.clear();
    post('DISPOSED');
    scope.close();
  }
};
