export type StockfishStatus = 'loading' | 'ready' | 'error';

export type StockfishSearchSettings = {
  limitStrength: boolean;
  elo: number | null;
  skillLevel: number;
  depth: number;
  moveTimeMs: number;
};

export type StockfishPositionAnalysis = {
  bestMoveUci: string | null;
  scoreCp: number | null;
  mateIn: number | null;
  depth: number;
  pv: string[];
};

export const STOCKFISH_DIFFICULTIES = {
  Beginner: { limitStrength: true, elo: 1320, skillLevel: 0, depth: 2, moveTimeMs: 250 },
  Easy: { limitStrength: true, elo: 1420, skillLevel: 3, depth: 3, moveTimeMs: 350 },
  Medium: { limitStrength: true, elo: 1700, skillLevel: 8, depth: 4, moveTimeMs: 500 },
  Hard: { limitStrength: true, elo: 2100, skillLevel: 12, depth: 5, moveTimeMs: 650 },
  Pro: { limitStrength: true, elo: 2400, skillLevel: 15, depth: 6, moveTimeMs: 800 },
  Master: { limitStrength: true, elo: 2700, skillLevel: 17, depth: 7, moveTimeMs: 950 },
  Expert: { limitStrength: true, elo: 3000, skillLevel: 19, depth: 8, moveTimeMs: 1200 },
  Grandmaster: { limitStrength: false, elo: null, skillLevel: 20, depth: 10, moveTimeMs: 1500 },
} as const satisfies Record<string, StockfishSearchSettings>;

export type DifficultyLevel = keyof typeof STOCKFISH_DIFFICULTIES;

type EngineRequestBase = {
  fen: string;
  settings: StockfishSearchSettings;
  reject: (error: Error) => void;
};

type MoveRequest = EngineRequestBase & {
  kind: 'move';
  resolve: (uci: string) => void;
};

type AnalysisRequest = EngineRequestBase & {
  kind: 'analysis';
  latestInfo: Omit<StockfishPositionAnalysis, 'bestMoveUci'> | null;
  resolve: (analysis: StockfishPositionAnalysis) => void;
};

type EngineRequest = MoveRequest | AnalysisRequest;

export class StockfishEngine {
  private worker: Worker | null = null;
  private status: StockfishStatus = 'loading';
  private activeRequest: EngineRequest | null = null;
  private queue: EngineRequest[] = [];
  private readyTimeout: number | undefined;
  private searchTimeout: number | undefined;
  private readyAction: 'startup' | 'new-game' | 'search-settings' | null = null;
  private newGamePending = false;
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

  requestBestMove(fen: string, settings: StockfishSearchSettings): Promise<string> {
    return new Promise((resolve, reject) => {
      this.enqueue({ kind: 'move', fen, settings, resolve, reject });
    });
  }

  analyzePosition(fen: string, settings: StockfishSearchSettings): Promise<StockfishPositionAnalysis> {
    return new Promise((resolve, reject) => {
      this.enqueue({ kind: 'analysis', fen, settings, latestInfo: null, resolve, reject });
    });
  }

  newGame() {
    if (this.disposed || this.status === 'error') return;
    this.newGamePending = true;
    this.runNext();
  }

  dispose() {
    this.disposed = true;
    if (this.readyTimeout !== undefined) window.clearTimeout(this.readyTimeout);
    if (this.searchTimeout !== undefined) window.clearTimeout(this.searchTimeout);
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
      this.readyAction = 'startup';
      this.worker?.postMessage('isready');
      return;
    }
    if (line === 'readyok') {
      if (this.status !== 'ready') {
        this.status = 'ready';
        if (this.readyTimeout !== undefined) window.clearTimeout(this.readyTimeout);
        this.onStatus('ready');
      }
      const action = this.readyAction;
      this.readyAction = null;
      if (action === 'search-settings' && this.activeRequest) {
        this.startSearch(this.activeRequest);
        return;
      }
      this.runNext();
      return;
    }

    const info = this.parseInfo(line);
    if (info && this.activeRequest?.kind === 'analysis') {
      const previous = this.activeRequest.latestInfo;
      if (!previous || info.depth >= previous.depth) {
        this.activeRequest.latestInfo = info;
      }
      return;
    }

    const bestMove = /^bestmove\s+(\S+)/.exec(line);
    if (bestMove && this.activeRequest) {
      const request = this.activeRequest;
      this.activeRequest = null;
      if (this.searchTimeout !== undefined) window.clearTimeout(this.searchTimeout);
      this.searchTimeout = undefined;
      if (request.kind === 'move') {
        request.resolve(bestMove[1]);
      } else {
        request.resolve({
          bestMoveUci: bestMove[1] === '(none)' || bestMove[1] === '0000' ? null : bestMove[1],
          scoreCp: request.latestInfo?.scoreCp ?? null,
          mateIn: request.latestInfo?.mateIn ?? null,
          depth: request.latestInfo?.depth ?? 0,
          pv: request.latestInfo?.pv ?? [],
        });
      }
      this.runNext();
    }
  }

  private enqueue(request: EngineRequest) {
    if (this.disposed) {
      request.reject(new Error('The Stockfish worker has been stopped.'));
      return;
    }
    if (this.status === 'error') {
      request.reject(new Error('Stockfish is unavailable. Retry the engine before requesting analysis.'));
      return;
    }
    if (!this.hasValidSettings(request.settings)) {
      request.reject(new Error('The selected Stockfish settings are outside the supported range.'));
      return;
    }
    this.queue.push(request);
    this.runNext();
  }

  private hasValidSettings(settings: StockfishSearchSettings) {
    return Number.isInteger(settings.skillLevel) && settings.skillLevel >= 0 && settings.skillLevel <= 20 &&
      (settings.elo === null || (Number.isInteger(settings.elo) && settings.elo >= 1320 && settings.elo <= 3190)) &&
      (!settings.limitStrength || settings.elo !== null) &&
      Number.isInteger(settings.depth) && settings.depth >= 1 &&
      Number.isInteger(settings.moveTimeMs) && settings.moveTimeMs >= 1;
  }

  private parseInfo(line: string): Omit<StockfishPositionAnalysis, 'bestMoveUci'> | null {
    if (!line.startsWith('info ')) return null;
    const depth = /\bdepth\s+(\d+)/.exec(line);
    const score = /\bscore\s+(cp|mate)\s+(-?\d+)/.exec(line);
    if (!depth || !score) return null;
    const pv = /\bpv\s+(.+)$/.exec(line);
    const value = Number(score[2]);
    return {
      scoreCp: score[1] === 'cp' ? value : null,
      mateIn: score[1] === 'mate' ? value : null,
      depth: Number(depth[1]),
      pv: pv ? pv[1].trim().split(/\s+/) : [],
    };
  }

  private runNext() {
    if (this.disposed || this.status !== 'ready' || this.activeRequest || this.readyAction) return;
    const worker = this.worker;
    if (!worker) return;

    if (this.newGamePending) {
      this.newGamePending = false;
      this.readyAction = 'new-game';
      try {
        worker.postMessage('ucinewgame');
        worker.postMessage('isready');
      } catch (error) {
        this.fail(this.asError(error, 'Stockfish could not reset the new game.'));
      }
      return;
    }

    const request = this.queue.shift();
    if (!request) return;

    this.activeRequest = request;
    this.readyAction = 'search-settings';
    try {
      if (request.settings.elo !== null) {
        worker.postMessage(`setoption name UCI_Elo value ${request.settings.elo}`);
      }
      worker.postMessage(`setoption name UCI_LimitStrength value ${request.settings.limitStrength}`);
      worker.postMessage(`setoption name Skill Level value ${request.settings.skillLevel}`);
      worker.postMessage('isready');
    } catch (error) {
      this.fail(this.asError(error, 'Stockfish could not apply the selected difficulty.'));
    }
  }

  private startSearch(request: EngineRequest) {
    if (this.disposed || this.activeRequest !== request) return;
    const worker = this.worker;
    if (!worker) {
      this.fail(new Error('The Stockfish worker stopped before searching.'));
      return;
    }
    this.searchTimeout = window.setTimeout(() => {
      this.fail(new Error(
        request.kind === 'analysis'
          ? 'Stockfish did not finish the analysis within the allowed time.'
          : 'Stockfish did not finish its move within the allowed time.',
      ));
    }, request.settings.moveTimeMs + 5_000);
    try {
      worker.postMessage(`position fen ${request.fen}`);
      worker.postMessage(`go depth ${request.settings.depth} movetime ${request.settings.moveTimeMs}`);
    } catch (error) {
      this.fail(this.asError(error, 'Stockfish could not calculate a move.'));
    }
  }

  private fail(error: Error) {
    if (this.disposed || this.status === 'error') return;
    this.status = 'error';
    if (this.readyTimeout !== undefined) window.clearTimeout(this.readyTimeout);
    if (this.searchTimeout !== undefined) window.clearTimeout(this.searchTimeout);
    this.readyTimeout = undefined;
    this.searchTimeout = undefined;
    this.readyAction = null;
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
