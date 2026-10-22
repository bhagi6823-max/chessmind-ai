import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { ArrowLeftRight, BookOpen, RotateCcw, Undo2 } from 'lucide-react';
import {
  StockfishEngine,
  STOCKFISH_DIFFICULTIES,
  type DifficultyLevel,
  type StockfishStatus,
} from '@/lib/stockfish-engine';

type Mode = 'computer' | 'two-player';
const difficultyLevels = Object.keys(STOCKFISH_DIFFICULTIES) as DifficultyLevel[];
const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const glyphs: Record<string, string> = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
};

function App() {
  const gameRef = useRef(new Chess());
  const engineRef = useRef<StockfishEngine | null>(null);
  const requestKeyRef = useRef<string | null>(null);
  const generationRef = useRef(0);
  const [fen, setFen] = useState(gameRef.current.fen());
  const [mode, setMode] = useState<Mode>('computer');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Beginner');
  const [selected, setSelected] = useState<Square | null>(null);
  const [thinking, setThinking] = useState(false);
  const [notice, setNotice] = useState('');
  const [engineAttempt, setEngineAttempt] = useState(0);
  const [engineState, setEngineState] = useState<{ status: StockfishStatus; error?: string }>({ status: 'loading' });

  const game = gameRef.current;
  const turn = game.turn();
  const gameOver = game.isGameOver();
  const history = game.history();
  const moves = game.history({ verbose: true });
  const lastMove = moves[moves.length - 1];
  const legalDestinations = useMemo(
    () => selected ? game.moves({ square: selected, verbose: true }).map((move) => move.to) : [],
    [fen, selected, game],
  );
  const board = game.board();
  const isComputerTurn = mode === 'computer' && turn === 'b' && !gameOver;

  useEffect(() => {
    const engine = new StockfishEngine((status, error) => setEngineState({ status, error }));
    engineRef.current = engine;
    return () => {
      generationRef.current += 1;
      if (engineRef.current === engine) engineRef.current = null;
      engine.dispose();
    };
  }, [engineAttempt]);

  const syncPosition = useCallback(() => {
    setFen(gameRef.current.fen());
    setSelected(null);
    setNotice('');
  }, []);

  const resetGame = useCallback(() => {
    generationRef.current += 1;
    requestKeyRef.current = null;
    engineRef.current?.newGame();
    gameRef.current = new Chess();
    setFen(gameRef.current.fen());
    setSelected(null);
    setThinking(false);
    setNotice('');
  }, []);

  const makeMove = useCallback((from: Square, to: Square) => {
    try {
      const result = gameRef.current.move({ from, to, promotion: 'q' });
      if (!result) {
        setNotice('That move is not legal. Try another square.');
        return false;
      }
      syncPosition();
      return true;
    } catch {
      setNotice('That move is not legal. Try another square.');
      return false;
    }
  }, [syncPosition]);

  useEffect(() => {
    if (!isComputerTurn || engineState.status === 'error' || requestKeyRef.current === fen) return;
    const engine = engineRef.current;
    if (!engine) return;
    requestKeyRef.current = fen;
    const requestGeneration = generationRef.current;
    setThinking(true);
    setNotice('');
    void engine.requestBestMove(fen, STOCKFISH_DIFFICULTIES[difficulty]).then((uci) => {
      if (generationRef.current !== requestGeneration) return;
      if (gameRef.current.fen() !== fen || mode !== 'computer' || gameRef.current.turn() !== 'b') return;

      const match = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(uci);
      if (!match) throw new Error(`Stockfish returned an invalid UCI move: ${uci}`);
      const [, from, to, promotion] = match;
      const legalMove = gameRef.current.moves({ verbose: true }).find((move) =>
        move.from === from &&
        move.to === to &&
        (promotion ? move.promotion === promotion : !move.promotion),
      );
      if (!legalMove) throw new Error(`Stockfish returned a move chess.js considers illegal: ${uci}`);

      gameRef.current.move({
        from: legalMove.from,
        to: legalMove.to,
        ...(legalMove.promotion ? { promotion: legalMove.promotion } : {}),
      });
      setFen(gameRef.current.fen());
      setSelected(null);
      setNotice('');
    }).catch((error: unknown) => {
      if (generationRef.current !== requestGeneration) return;
      const message = error instanceof Error ? error.message : 'Unknown Stockfish error.';
      setEngineState((state) => state.status === 'error' ? state : { status: 'error', error: message });
      setNotice(`Stockfish could not make a move: ${message}`);
    }).finally(() => {
      if (generationRef.current !== requestGeneration) return;
      setThinking(false);
      requestKeyRef.current = null;
    });
  }, [difficulty, engineState.status, fen, isComputerTurn, mode]);

  const onSquareClick = (square: Square) => {
    if (gameOver || thinking || isComputerTurn || (mode === 'computer' && engineState.status === 'error')) return;
    const piece = game.get(square);
    if (selected && legalDestinations.includes(square)) {
      makeMove(selected, square);
      return;
    }
    if (piece && piece.color === turn) {
      setSelected(square);
      setNotice('');
      return;
    }
    setSelected(null);
  };

  const undoMove = () => {
    const current = gameRef.current;
    if (!current.history().length || thinking) return;
    current.undo();
    if (mode === 'computer' && current.history().length && current.turn() === 'b') current.undo();
    setFen(current.fen());
    setSelected(null);
    setNotice('');
  };

  const retryEngine = () => {
    generationRef.current += 1;
    requestKeyRef.current = null;
    setThinking(false);
    setNotice('');
    setEngineState({ status: 'loading' });
    setEngineAttempt((attempt) => attempt + 1);
  };

  const changeMode = (nextMode: Mode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    resetGame();
  };

  const statusText = () => {
    if (game.isCheckmate()) return `Checkmate — ${turn === 'w' ? 'Black' : 'White'} wins`;
    if (game.isStalemate()) return 'Stalemate — the game is a draw';
    if (game.isDraw()) return 'Draw — the game has ended';
    if (mode === 'computer' && engineState.status === 'error') return 'Stockfish unavailable';
    if (thinking) return 'ChessMind is thinking…';
    return mode === 'two-player'
      ? `${turn === 'w' ? 'White' : 'Black'} to move`
      : turn === 'w' ? 'Your turn — White' : 'ChessMind to move';
  };
  const checkedKing = turn === 'w'
    ? mode === 'computer' ? 'Your' : 'White’s'
    : mode === 'computer' ? 'ChessMind’s' : 'Black’s';
  const checkMessage = `${checkedKing} king is in check. Find a safe square or block the attack.`;
  const turnMessage = gameOver
    ? 'A good game is always a lesson. Start again when you are ready.'
    : mode === 'computer' && engineState.status === 'error' ? 'Retry Stockfish or switch to Two Player to continue.'
    : thinking ? 'Finding a thoughtful move for this level.'
      : game.isCheck() ? checkMessage
        : mode === 'two-player' ? 'Take turns from the same board, one move at a time.'
          : turn === 'w' ? 'Choose a white piece to begin your move.' : 'ChessMind is choosing a reply.';

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand" data-testid="brand-chessmind">
          <div className="brand-mark" aria-hidden="true">♘</div>
          <div><div className="brand-name">ChessMind</div><div className="brand-tag">A gentle start to chess</div></div>
        </div>
        <div className="top-note"><span className="online-dot" />A little practice goes a long way</div>
      </header>

      <section className="intro">
        <div>
          <div className="intro-kicker">Your first move starts here</div>
          <h1>Ready when you are.</h1>
          <p>Learn the game, one thoughtful move at a time.</p>
        </div>
      </section>

      <div className="content-grid">
        <section className="play-panel" aria-label="Chess game">
          <div className="board-topline">
            <div className="player-label">
              <span className="player-avatar">{mode === 'two-player' ? 'W' : 'YOU'}</span>
              <span>{mode === 'two-player' ? 'White' : 'You · White'}</span>
            </div>
            <div className={`turn-chip ${turn === 'b' ? 'wait' : ''}`} data-testid="status-turn">
              {statusText()}
            </div>
            <div className="player-label">
              <span>{mode === 'two-player' ? 'Black' : 'ChessMind'}</span>
              <span className={`player-avatar ${mode === 'computer' ? 'computer' : ''}`}>{mode === 'two-player' ? 'B' : 'AI'}</span>
            </div>
          </div>
          <div className={`board-frame ${thinking ? 'board-waiting' : ''}`}>
            <div className="chess-board" role="grid" aria-label="Chess board, White at the bottom" data-testid="chess-board" data-fen={fen}>
              {board.flatMap((row, rowIndex) => row.map((piece, colIndex) => {
                const square = `${files[colIndex]}${8 - rowIndex}` as Square;
                const isLight = (rowIndex + colIndex) % 2 === 0;
                const isSelected = selected === square;
                const isLegal = legalDestinations.includes(square);
                const isLastMove = lastMove?.from === square || lastMove?.to === square;
                const glyph = piece ? glyphs[`${piece.color}${piece.type}`] : '';
                return (
                  <button
                    key={square}
                    type="button"
                    role="gridcell"
                    aria-label={`${square}${piece ? `, ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}${isLegal ? ', legal destination' : ''}`}
                    aria-selected={isSelected}
                    className={`square ${isLight ? 'light' : 'dark'}${isSelected ? ' selected' : ''}${isLegal ? ` legal${piece ? ' capture' : ''}` : ''}${isLastMove ? ' last-move' : ''}`}
                    onClick={() => onSquareClick(square)}
                    disabled={mode === 'computer' && engineState.status === 'error'}
                    data-testid={`square-${square}`}
                  >
                    {piece && <span className={`piece ${piece.color === 'w' ? 'white' : 'black'}`} aria-hidden="true">{glyph}</span>}
                    {colIndex === 0 && <span className="coord rank">{8 - rowIndex}</span>}
                    {rowIndex === 7 && <span className="coord file">{files[colIndex]}</span>}
                  </button>
                );
              }))}
            </div>
          </div>
          <div className="board-footer">
            <span><strong>{game.isCheck() ? 'Check' : gameOver ? 'Game complete' : `${turn === 'w' ? 'White' : 'Black'} to move`}</strong> · {mode === 'computer' ? `Playing ${difficulty}` : 'Two-player game'}</span>
            <span>{moves.length} {moves.length === 1 ? 'move' : 'moves'}</span>
          </div>
          <div className="controls">
            <button className="btn primary" onClick={resetGame} data-testid="button-new-game" type="button">
              <RotateCcw aria-hidden="true" /> New game
            </button>
            <button className="btn" onClick={undoMove} disabled={!history.length || thinking} data-testid="button-undo" type="button">
              <Undo2 aria-hidden="true" /> Undo
            </button>
            <button className="btn" onClick={() => changeMode(mode === 'computer' ? 'two-player' : 'computer')} disabled={mode === 'two-player' && engineState.status === 'error'} data-testid="button-switch-mode" type="button">
              <ArrowLeftRight aria-hidden="true" /> Switch
            </button>
          </div>
        </section>

        <aside className="right-column">
          <section className="side-card" aria-labelledby="game-setup-heading">
            <div className="section-heading">
              <h2 id="game-setup-heading">Let’s play</h2>
              <span className="section-eyebrow">Game setup</span>
            </div>
            <div className="mode-switch" role="group" aria-label="Choose game mode">
              <button type="button" className={`mode-option ${mode === 'computer' ? 'active' : ''}`} aria-pressed={mode === 'computer'} onClick={() => changeMode('computer')} disabled={engineState.status === 'error'} data-testid="mode-computer">Play vs Computer</button>
              <button type="button" className={`mode-option ${mode === 'two-player' ? 'active' : ''}`} aria-pressed={mode === 'two-player'} onClick={() => changeMode('two-player')} data-testid="mode-two-player">Two Player</button>
            </div>
            {mode === 'computer' && (
              <div className="difficulty-wrap">
                <span className="field-label">Choose a comfortable level</span>
                <div className="difficulty-list" role="group" aria-label="Computer difficulty">
                  {difficultyLevels.map((level) => (
                    <button key={level} type="button" className={`difficulty ${difficulty === level ? 'active' : ''}`} aria-pressed={difficulty === level} onClick={() => setDifficulty(level)} disabled={thinking} data-testid={`difficulty-${level.toLowerCase()}`}>
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mode === 'computer' && (
              <div className={`engine-status ${engineState.status}`} data-testid="engine-status" role="status" aria-live="polite">
                <span className="engine-dot" aria-hidden="true" />
                <span>
                  {engineState.status === 'ready' ? 'Stockfish engine ready' : engineState.status === 'loading' ? 'Loading Stockfish engine…' : `Stockfish error: ${engineState.error ?? 'Unknown loading error.'}`}
                </span>
                {engineState.status === 'error' && (
                  <button className="engine-retry" type="button" onClick={retryEngine} data-testid="button-retry-engine">Retry</button>
                )}
              </div>
            )}
            <div className="turn-summary" data-testid="status-game-state">
              <div className="turn-symbol" aria-hidden="true">{gameOver ? '✓' : game.isCheck() ? '!' : '♙'}</div>
              <div className="turn-copy"><strong>{statusText()}</strong><span>{turnMessage}</span></div>
            </div>
            {game.isCheck() && !gameOver && <div className="status-alert" role="status" data-testid="status-check">{checkMessage}</div>}
            {gameOver && <div className="status-alert end" role="status" data-testid="status-game-over">{statusText()}</div>}
            {notice && <div className="status-alert" role="status" data-testid="status-notice">{notice}</div>}
          </section>

          <section className="side-card" aria-labelledby="history-heading">
            <div className="section-heading">
              <h2 id="history-heading">Move notes</h2>
              <span className="section-eyebrow">Your game</span>
            </div>
            <div className="move-list" data-testid="move-history" aria-live="polite">
              {history.length === 0 ? (
                <div className="empty-moves">Your moves will appear here as you play. White begins.</div>
              ) : (
                Array.from({ length: Math.ceil(history.length / 2) }, (_, index) => (
                  <div className="move-row" key={index} data-testid={`move-row-${index + 1}`}>
                    <span className="move-number">{index + 1}.</span>
                    <span className="move-san">{history[index * 2] ?? ''}</span>
                    <span className="move-san">{history[index * 2 + 1] ?? ''}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="side-card lesson-card" aria-labelledby="lessons-heading">
            <div className="section-heading">
              <h2 id="lessons-heading">A tiny lesson</h2>
              <BookOpen size={16} color="#62806a" aria-hidden="true" />
            </div>
            <div className="lesson" data-testid="lesson-pawn">
              <div className="lesson-name"><span>Pawn</span><span>प्यादा</span></div>
              <p>Moves forward one square (two on its first move). Captures diagonally.</p>
              <p className="hindi" lang="hi">प्यादा आगे चलता है; तिरछा मारता है। पहली चाल में दो घर चल सकता है।</p>
            </div>
            <div className="lesson" data-testid="lesson-knight">
              <div className="lesson-name"><span>Knight</span><span>घोड़ा</span></div>
              <p>Moves in an L-shape and can jump over other pieces.</p>
              <p className="hindi" lang="hi">घोड़ा अंग्रेज़ी के L आकार में चलता है और मोहरों के ऊपर से कूद सकता है।</p>
            </div>
            <div className="lesson" data-testid="lesson-turns">
              <div className="lesson-name"><span>Take turns</span><span>बारी-बारी से</span></div>
              <p>White moves first, then players take one turn each.</p>
              <p className="hindi" lang="hi">पहली चाल सफ़ेद की होती है। फिर दोनों खिलाड़ी बारी-बारी से चलते हैं।</p>
            </div>
          </section>
        </aside>
      </div>
      <footer className="page-foot">
        <span>ChessMind AI · A calm place to learn</span>
        <span>Every game is a good beginning.</span>
      </footer>
    </main>
  );
}

export default App;
