import { scanImageData } from '@undecaf/zbar-wasm';

type WorkerRequest =
  | { type: 'init'; id: number }
  | { type: 'decode'; id: number; width: number; height: number; buffer: ArrayBuffer };

type WorkerResponse =
  | { type: 'ready'; id: number }
  | { type: 'result'; id: number; symbols: Array<{ typeName: string; value: string }> }
  | { type: 'error'; id: number; message: string };

const workerScope = self as unknown as {\n  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;\n  postMessage(message: WorkerResponse): void;\n};

workerScope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === 'init') {
      await scanImageData(new ImageData(1, 1));
      const response: WorkerResponse = { type: 'ready', id: request.id };
      workerScope.postMessage(response);
      return;
    }

    const imageData = new ImageData(
      new Uint8ClampedArray(request.buffer),
      request.width,
      request.height,
    );
    const symbols = await scanImageData(imageData);
    const response: WorkerResponse = {
      type: 'result',
      id: request.id,
      symbols: symbols.map((symbol) => ({
        typeName: symbol.typeName,
        value: symbol.decode(),
      })),
    };
    workerScope.postMessage(response);
  } catch (error) {
    const response: WorkerResponse = {
      type: 'error',
      id: request.id,
      message: error instanceof Error ? error.message : 'ZBar worker failed.',
    };
    workerScope.postMessage(response);
  }
};
