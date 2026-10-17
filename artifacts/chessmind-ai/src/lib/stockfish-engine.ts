export type StockfishStatus = 'loading' | 'ready' | 'error';

type EngineRequest = {
  fen: string;
  depth: number;
  resolve: (uci: string) => void;
  reject: (error: Error) => void;
};

export class StockfishEngine {
  private worker: Worker | null = null;
  private status: StockfishStatus = 'loading';
  private activeRequest: EngineRequest | null = null;
  private queue: EngineRequest[] = [];
  private readyTimeout: number | undefined;
  private disposed = false;

  constructor(
    private readonly onStatus: (status: StockfishStatus, error?: string) => void,
  ) {
    try {
      const workerUrl = `${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`;
      const worker = new Worker(workerUrl, { name: 'stockfish-engine' });
      this.worker = worker;
      worker.onmessage = (event: MessageEvent<unknown>) => this.handleMessage(event.data);
      worker.onerror = (event) => {
        event.preventDefault();
        this.fail(new Error(event.message || 'The Stockfish worker could not start.'));
      };
      worker.onmessageerror = () => {
        this.fail(new Error('The Stockfish worker returned a message the browser could not read.'));
      };
      this.readyTimeout = window.setTimeout(() => {
        this.fail(new Error('Stockfish did not finish loading within 20 seconds.'));
      }, 20_000);
      worker.postMessage('uci');
    } catch (error) {
      this.fail(this.asError(error, 'The browser could not create the Stockfish worker.'));
    }
  }

  requestBestMove(fen: string, depth: number): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.disposed) {
        reject(new Error('The Stockfish worker has been stopped.'));
        return;
      }
      if (this.status === 'error') {
        reject(new Error('Stockfish is unavailable. Retry the engine before starting a computer game.'));
        return;
      }

      this.queue.push({ fen, depth, resolve, reject });
      this.runNext();
    });
  }

  dispose() {
    this.disposed = true;
    if (this.readyTimeout !== undefined) window.clearTimeout(this.readyTimeout);
    this.worker?.terminate();
    this.worker = null;
    const stopped = new Error('The Stockfish worker has been stopped.');
    this.activeRequest?.reject(stopped);
    this.activeRequest = null;
    for (const request of this.queue.splice(0)) request.reject(stopped);
  }

  private handleMessage(data: unknown) {
    if (this.disposed || typeof data !== 'string') return;
    const line = data.trim();

    if (line === 'uciok') {
      this.worker?.postMessage('isready');
      return;
    }
    if (line === 'readyok') {
      if (this.status !== 'ready') {
        this.status = 'ready';
        if (this.readyTimeout !== undefined) window.clearTimeout(this.readyTimeout);
        this.onStatus('ready');
      }
      this.runNext();
      return;
    }

    const bestMove = /^bestmove\s+(\S+)/.exec(line);
    if (bestMove && this.activeRequest) {
      const request = this.activeRequest;
      this.activeRequest = null;
      request.resolve(bestMove[1]);
      this.runNext();
    }
  }

  private runNext() {
    if (this.disposed || this.status !== 'ready' || this.activeRequest || !this.queue.length) return;
    const request = this.queue.shift();
    const worker = this.worker;
    if (!request || !worker) return;

    this.activeRequest = request;
    try {
      worker.postMessage(`position fen ${request.fen}`);
      worker.postMessage(`go depth ${request.depth}`);
    } catch (error) {
      this.activeRequest = null;
      request.reject(this.asError(error, 'Stockfish could not calculate a move.'));
      this.runNext();
    }
  }

  private fail(error: Error) {
    if (this.disposed || this.status === 'error') return;
    this.status = 'error';
    if (this.readyTimeout !== undefined) window.clearTimeout(this.readyTimeout);
    this.onStatus('error', error.message);
    this.worker?.terminate();
    this.worker = null;
    this.activeRequest?.reject(error);
    this.activeRequest = null;
    for (const request of this.queue.splice(0)) request.reject(error);
  }

  private asError(error: unknown, fallback: string) {
    return error instanceof Error ? error : new Error(fallback);
  }
}
