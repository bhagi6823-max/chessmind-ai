import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import type { StockfishEngine, StockfishPositionAnalysis, StockfishSearchSettings } from './stockfish-engine';

export type CoachLanguage = 'en' | 'hi';
export type BilingualText = { en: string; hi: string };

export type TacticalTag = BilingualText & { id: string };

export type CoachConcept = {
  id: string;
  title: BilingualText;
  body: BilingualText;
};

export type ChessMoveRecord = {
  ply: number;
  san: string;
  uci: string;
  color: Color;
  piece: PieceSymbol;
  movedPieceAfter: PieceSymbol;
  captured?: PieceSymbol;
  from: Square;
  to: Square;
  beforeFen: string;
  afterFen: string;
  isCapture: boolean;
  isCastle: boolean;
  isCheck: boolean;
  isDoubleCheck: boolean;
  isCheckmate: boolean;
  captureStreak: number;
  tags: TacticalTag[];
};

export type MoveGrade =
  | 'brilliant'
  | 'great'
  | 'strong'
  | 'reasonable'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'checkmate'
  | 'unrated';

export type MoveAssessment = {
  ply: number;
  san: string;
  grade: MoveGrade;
  explanation: BilingualText;
  evaluationText: BilingualText;
  lossCp: number | null;
  bestMoveSan: string | null;
  bestMoveUci: string | null;
  bestMoveFrom: Square | null;
  bestMoveTo: Square | null;
  engineLineSan: string[];
  tags: TacticalTag[];
  depthBefore: number;
  depthAfter: number;
};

export type CoachAnalysisView = Omit<MoveAssessment, 'grade'> & {
  classification: string;
};

export type GameReviewView = {
  ply: number;
  san: string;
  color: Color;
  classification: string;
  explanation: BilingualText;
  tags: TacticalTag[];
};

export const MOVE_ANALYSIS_SETTINGS: StockfishSearchSettings = {
  limitStrength: false,
  elo: null,
  skillLevel: 20,
  depth: 8,
  moveTimeMs: 350,
};

export const GAME_REVIEW_SETTINGS: StockfishSearchSettings = {
  limitStrength: false,
  elo: null,
  skillLevel: 20,
  depth: 5,
  moveTimeMs: 160,
};

export const COACH_CONCEPTS: CoachConcept[] = [
  {
    id: 'development',
    title: { en: 'Develop your pieces', hi: 'मोहरों का विकास' },
    body: {
      en: 'Bring knights and bishops into the game so they can help control useful squares.',
      hi: 'घोड़े और ऊँट को खेल में लाएँ, ताकि वे ज़रूरी घरों पर नियंत्रण कर सकें।',
    },
  },
  {
    id: 'king-safety',
    title: { en: 'Protect your king', hi: 'अपने राजा की सुरक्षा करें' },
    body: {
      en: 'Castle when it is safe, and always notice checks against your king.',
      hi: 'सुरक्षित हो तो किला करें और अपने राजा पर आने वाली शह पर ध्यान दें।',
    },
  },
  {
    id: 'center',
    title: { en: 'Control the center', hi: 'केंद्र पर नियंत्रण रखें' },
    body: {
      en: 'The d4, e4, d5, and e5 squares are central. Pieces near them can influence more of the board.',
      hi: 'd4, e4, d5 और e5 केंद्र के घर हैं। इनके पास के मोहरे बोर्ड के बड़े हिस्से पर असर डालते हैं।',
    },
  },
  {
    id: 'safe-captures',
    title: { en: 'Capture safely', hi: 'सुरक्षित तरीके से मारें' },
    body: {
      en: 'Before taking a piece, check whether your own piece can be captured in reply.',
      hi: 'कोई मोहरा लेने से पहले देखें कि जवाब में आपका मोहरा तो नहीं लिया जा सकता।',
    },
  },
  {
    id: 'threats',
    title: { en: 'Look for threats and tactics', hi: 'हमलों और तरकीबों को पहचानें' },
    body: {
      en: 'Look for attacks on the king, queen, and pieces that have no defender. Check, fork, and pin ideas can change a game.',
      hi: 'राजा, रानी और बिना सुरक्षा वाले मोहरों पर हमले देखें। शह, फोर्क और पिन जैसी तरकीबें खेल बदल सकती हैं।',
    },
  },
  {
    id: 'checkmate',
    title: { en: 'Checkmate ends the game', hi: 'शह-मात से खेल खत्म होता है' },
    body: {
      en: 'Checkmate means the king is under attack and has no legal escape.',
      hi: 'शह-मात में राजा पर हमला होता है और बचने की कोई वैध चाल नहीं होती।',
    },
  },
];

const GRADE_LABELS: Record<MoveGrade, BilingualText> = {
  brilliant: { en: 'Brilliant', hi: 'असाधारण चाल' },
  great: { en: 'Great', hi: 'बेहतरीन चाल' },
  strong: { en: 'Strong', hi: 'मज़बूत चाल' },
  reasonable: { en: 'Reasonable', hi: 'ठीक चाल' },
  inaccuracy: { en: 'Inaccuracy', hi: 'छोटी चूक' },
  mistake: { en: 'Mistake', hi: 'गलती' },
  blunder: { en: 'Blunder', hi: 'बड़ी गलती' },
  checkmate: { en: 'Checkmate', hi: 'शह-मात' },
  unrated: { en: 'Unrated', hi: 'मूल्यांकन नहीं हुआ' },
};

const PIECE_NAMES: Record<PieceSymbol, BilingualText> = {
  p: { en: 'pawn', hi: 'प्यादा' },
  n: { en: 'knight', hi: 'घोड़ा' },
  b: { en: 'bishop', hi: 'ऊँट' },
  r: { en: 'rook', hi: 'हाथी' },
  q: { en: 'queen', hi: 'रानी' },
  k: { en: 'king', hi: 'राजा' },
};

const CENTER_SQUARES = new Set<Square>(['d4', 'e4', 'd5', 'e5']);

function tag(id: string, en: string, hi: string): TacticalTag {
  return { id, en, hi };
}

function findKingSquare(game: Chess, color: Color): Square | null {
  const board = game.board();
  for (let row = 0; row < board.length; row += 1) {
    for (let column = 0; column < board[row].length; column += 1) {
      const piece = board[row][column];
      if (piece?.type === 'k' && piece.color === color) {
        return `${'abcdefgh'[column]}${8 - row}` as Square;
      }
    }
  }
  return null;
}

export function buildChessMoveRecords(moves: Move[]): ChessMoveRecord[] {
  let captureStreak: { color: Color; square: Square; count: number } | null = null;

  return moves.map((move, index) => {
    const after = new Chess(move.after);
    const isCheck = after.isCheck();
    const kingSquare = isCheck ? findKingSquare(after, after.turn()) : null;
    const checkers = isCheck
      ? kingSquare ? after.attackers(kingSquare, move.color).length : 0
      : 0;
    const isCheckmate = after.isCheckmate();
    const isCapture = move.isCapture();
    const movedPieceAfter = move.promotion ?? move.piece;
    let captureCountForMove = 0;

    if (isCapture) {
      const continuesStreak =
        captureStreak?.color === move.color &&
        captureStreak.square === move.from;
      captureStreak = {
        color: move.color,
        square: move.to,
        count: continuesStreak && captureStreak ? captureStreak.count + 1 : 1,
      };
      captureCountForMove = captureStreak.count;
    } else if (captureStreak?.color === move.color) {
      captureStreak = null;
    }

    const tags: TacticalTag[] = [];
    if (isCheckmate) {
      tags.push(tag('checkmate', 'Checkmate', 'शह-मात'));
    } else if (checkers > 1) {
      tags.push(tag('double-check', 'Double check', 'दोहरी शह'));
    } else if (isCheck) {
      tags.push(tag('check', 'Check', 'शह'));
    }

    if (captureCountForMove === 2) {
      const name = PIECE_NAMES[movedPieceAfter];
      tags.push(tag('double-killer', `Double killer · ${name.en}`, `${name.hi} ने लगातार दो कैप्चर किए`));
    } else if (captureCountForMove >= 3) {
      const name = PIECE_NAMES[movedPieceAfter];
      tags.push(tag('triple-killer', `Triple killer · ${name.en}`, `${name.hi} ने लगातार ${captureCountForMove} कैप्चर किए`));
    }

    return {
      ply: index + 1,
      san: move.san,
      uci: `${move.from}${move.to}${move.promotion ?? ''}`,
      color: move.color,
      piece: move.piece,
      movedPieceAfter,
      captured: move.captured,
      from: move.from,
      to: move.to,
      beforeFen: move.before,
      afterFen: move.after,
      isCapture,
      isCastle: move.san === 'O-O' || move.san === 'O-O-O',
      isCheck,
      isDoubleCheck: checkers > 1,
      isCheckmate,
      captureStreak: captureCountForMove,
      tags,
    };
  });
}

function moveFromUci(game: Chess, uci: string | null): Move | null {
  if (!uci) return null;
  const match = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(uci);
  if (!match) return null;
  const [, from, to, promotion] = match;
  return game.moves({ verbose: true }).find((move) =>
    move.from === from &&
    move.to === to &&
    (promotion ? move.promotion === promotion : !move.promotion),
  ) ?? null;
}

function lineToSan(fen: string, pv: string[]): string[] {
  const replay = new Chess(fen);
  const sans: string[] = [];
  for (const uci of pv.slice(0, 5)) {
    const move = moveFromUci(replay, uci);
    if (!move) break;
    sans.push(replay.move({
      from: move.from,
      to: move.to,
      ...(move.promotion ? { promotion: move.promotion } : {}),
    }).san);
  }
  return sans;
}

function centipawnLoss(
  before: StockfishPositionAnalysis,
  after: StockfishPositionAnalysis | null,
  afterIsDraw: boolean,
  afterIsMate: boolean,
): number | null {
  if (afterIsMate) return 0;

  if (afterIsDraw) {
    if (before.scoreCp !== null) return Math.max(0, before.scoreCp);
    return before.mateIn !== null && before.mateIn > 0 ? Number.POSITIVE_INFINITY : 0;
  }

  if (!after) return null;
  if (before.scoreCp !== null && after.scoreCp !== null) {
    // UCI scores are from the side-to-move perspective; reverse the post-move
    // score to compare both positions from the mover's point of view.
    return Math.max(0, before.scoreCp + after.scoreCp);
  }

  const beforeMateForMover = before.mateIn === null ? null : Math.sign(before.mateIn);
  const afterMateForMover = after.mateIn === null ? null : -Math.sign(after.mateIn);
  if (beforeMateForMover === 1 && afterMateForMover !== 1) return Number.POSITIVE_INFINITY;
  if (afterMateForMover === -1 && beforeMateForMover !== -1) return Number.POSITIVE_INFINITY;
  if (beforeMateForMover !== null || afterMateForMover !== null) return 0;
  return null;
}

function lossText(lossCp: number | null, language: CoachLanguage): string {
  if (lossCp === null) {
    return language === 'en' ? 'no stable score was returned' : 'स्थिर मूल्यांकन नहीं मिला';
  }
  if (!Number.isFinite(lossCp)) {
    return language === 'en' ? 'a forced-mate chance was lost' : 'जबरन मात का मौका चला गया';
  }
  if (language === 'en') {
    return lossCp >= 100
      ? `about ${(lossCp / 100).toFixed(1)} pawn(s)`
      : `about ${Math.round(lossCp)} centipawn(s)`;
  }
  return lossCp >= 100
    ? `लगभग ${(lossCp / 100).toFixed(1)} प्यादे`
    : `लगभग ${Math.round(lossCp)} सेंटी-प्यादा`;
}

function isConfirmedSacrifice(
  record: ChessMoveRecord,
  afterAnalysis: StockfishPositionAnalysis | null,
  lossCp: number | null,
): boolean {
  if (
    record.isCapture ||
    record.piece === 'p' ||
    record.piece === 'k' ||
    lossCp === null ||
    lossCp > 50 ||
    !afterAnalysis?.pv.length
  ) return false;

  const reply = moveFromUci(new Chess(record.afterFen), afterAnalysis.pv[0]);
  return Boolean(
    reply?.isCapture() &&
    reply.to === record.to &&
    reply.captured === record.movedPieceAfter,
  );
}

function chooseGrade(
  record: ChessMoveRecord,
  bestMove: Move | null,
  afterAnalysis: StockfishPositionAnalysis | null,
  lossCp: number | null,
): MoveGrade {
  if (record.isCheckmate) return 'checkmate';
  if (!bestMove || lossCp === null) return 'unrated';

  const matchesEngine = `${bestMove.from}${bestMove.to}${bestMove.promotion ?? ''}` === record.uci;
  if (matchesEngine && isConfirmedSacrifice(record, afterAnalysis, lossCp)) return 'brilliant';
  if (matchesEngine && lossCp <= 50) return 'great';
  if (!Number.isFinite(lossCp) || lossCp >= 300) return 'blunder';
  if (lossCp >= 150) return 'mistake';
  if (lossCp >= 60) return 'inaccuracy';
  if (lossCp >= 25) return 'reasonable';
  return 'strong';
}

function moveExplanation(
  record: ChessMoveRecord,
  grade: MoveGrade,
  bestMoveSan: string | null,
  lossCp: number | null,
): BilingualText {
  const alternativeEn = bestMoveSan ? ` Try ${bestMoveSan} in this position.` : '';
  const alternativeHi = bestMoveSan ? ` इस स्थिति में ${bestMoveSan} आज़माएँ।` : '';

  if (record.isCheckmate) {
    return {
      en: 'The king is in check with no legal escape. This move ends the game.',
      hi: 'राजा को शह है और बचने की कोई वैध चाल नहीं। इस चाल से खेल खत्म होता है।',
    };
  }
  if (grade === 'brilliant') {
    return {
      en: 'Stockfish chose this move first. Its main reply can capture the moved piece, yet the short search keeps your position close to the best line: a confirmed sacrifice.',
      hi: 'Stockfish ने इसी चाल को सबसे पहले चुना। उसकी मुख्य जवाबी चाल आपका मोहरा ले सकती है, फिर भी छोटे खोज में स्थिति सबसे अच्छी चाल के करीब रहती है: यह सही बलिदान है।',
    };
  }
  if (grade === 'great') {
    return {
      en: 'You found Stockfish’s top move in this position.',
      hi: 'आपने इस स्थिति में Stockfish की सबसे अच्छी चाल खोजी।',
    };
  }
  if (grade === 'unrated') {
    return {
      en: `The engine did not return a stable score for this short search.${alternativeEn}`,
      hi: `छोटी खोज में इंजन को स्थिर मूल्यांकन नहीं मिला।${alternativeHi}`,
    };
  }

  const lossEn = lossText(lossCp, 'en');
  const lossHi = lossText(lossCp, 'hi');
  let explanation: BilingualText;
  if (grade === 'blunder') {
    explanation = {
      en: `The short engine search sees a large swing (${lossEn}) after this move.${alternativeEn}`,
      hi: `छोटी इंजन खोज में इस चाल के बाद बड़ा बदलाव दिखा (${lossHi})।${alternativeHi}`,
    };
  } else if (grade === 'mistake') {
    explanation = {
      en: `This move gives the opponent a better position by about ${lossEn}.${alternativeEn}`,
      hi: `इस चाल से विरोधी की स्थिति लगभग ${lossHi} बेहतर होती है।${alternativeHi}`,
    };
  } else if (grade === 'inaccuracy') {
    explanation = {
      en: `The engine estimates a noticeable loss of about ${lossEn}.${alternativeEn}`,
      hi: `इंजन के अनुसार लगभग ${lossHi} का ध्यान देने योग्य नुकसान है।${alternativeHi}`,
    };
  } else if (grade === 'reasonable') {
    explanation = {
      en: `This is playable, though the engine estimates a small loss of about ${lossEn}.${alternativeEn}`,
      hi: `यह चाल खेली जा सकती है, लेकिन इंजन लगभग ${lossHi} का छोटा नुकसान दिखाता है।${alternativeHi}`,
    };
  } else {
    explanation = {
      en: 'The short search keeps this move close to the engine’s preferred line.',
      hi: 'छोटी इंजन खोज में यह चाल सबसे अच्छी चाल के काफ़ी करीब है।',
    };
  }

  if (record.isCastle) {
    return {
      en: `${explanation.en} Castling also moves your king toward safety.`,
      hi: `${explanation.hi} किला करने से आपका राजा भी अधिक सुरक्षित जगह पहुँचता है।`,
    };
  }
  if ((record.piece === 'n' || record.piece === 'b') && record.from[1] === (record.color === 'w' ? '1' : '8')) {
    return {
      en: `${explanation.en} Moving this piece off its home square helps develop it.`,
      hi: `${explanation.hi} इस मोहरे को शुरुआती घर से निकालना उसके विकास में मदद करता है।`,
    };
  }
  if (record.piece === 'p' && CENTER_SQUARES.has(record.to)) {
    return {
      en: `${explanation.en} This pawn also occupies a central square.`,
      hi: `${explanation.hi} यह प्यादा केंद्र के घर पर भी पहुँचता है।`,
    };
  }
  if (record.isCapture && record.captured) {
    const captured = PIECE_NAMES[record.captured];
    return {
      en: `${explanation.en} You captured a ${captured.en}; check whether the opponent can capture your piece back.`,
      hi: `${explanation.hi} आपने ${captured.hi} लिया; देखें कि विरोधी जवाब में आपका मोहरा तो नहीं ले सकता।`,
    };
  }
  if (record.isCheck) {
    return {
      en: `${explanation.en} A check forces the opponent to answer the attack on the king.`,
      hi: `${explanation.hi} शह होने पर विरोधी को राजा पर हमले का जवाब देना पड़ता है।`,
    };
  }
  return explanation;
}

function evaluationText(lossCp: number | null, before: StockfishPositionAnalysis, after: StockfishPositionAnalysis | null): BilingualText {
  if (lossCp === null) {
    return {
      en: `Short Stockfish search; stable score unavailable (depth ${before.depth}).`,
      hi: `Stockfish की छोटी खोज; स्थिर मूल्यांकन नहीं मिला (गहराई ${before.depth})।`,
    };
  }
  const summary = lossText(lossCp, 'en');
  const summaryHi = lossText(lossCp, 'hi');
  const afterDepth = after?.depth ?? 0;
  return {
    en: `Engine-estimated change: ${summary} versus the top line. Search depth ${before.depth} before, ${afterDepth || 'terminal'} after.`,
    hi: `इंजन का अनुमानित बदलाव: सबसे अच्छी चाल की तुलना में ${summaryHi}। पहले गहराई ${before.depth}, बाद में ${afterDepth || 'खेल समाप्त'}।`,
  };
}

export async function assessChessMove(
  engine: StockfishEngine,
  record: ChessMoveRecord,
  settings: StockfishSearchSettings,
  shouldCancel: () => boolean = () => false,
): Promise<MoveAssessment> {
  const before = await engine.analyzePosition(record.beforeFen, settings);
  if (shouldCancel()) throw new Error('Move analysis was cancelled.');
  const beforeGame = new Chess(record.beforeFen);
  const bestMove = moveFromUci(beforeGame, before.bestMoveUci);
  if (before.bestMoveUci && !bestMove) {
    throw new Error(`Stockfish returned an illegal analysis move: ${before.bestMoveUci}`);
  }

  const afterGame = new Chess(record.afterFen);
  const afterAnalysis = afterGame.isGameOver()
    ? null
    : await engine.analyzePosition(record.afterFen, settings);
  if (shouldCancel()) throw new Error('Move analysis was cancelled.');
  const lossCp = centipawnLoss(
    before,
    afterAnalysis,
    afterGame.isDraw(),
    afterGame.isCheckmate(),
  );
  const grade = chooseGrade(record, bestMove, afterAnalysis, lossCp);
  const bestMoveSan = bestMove?.san ?? null;
  const tags = [...record.tags];

  if (record.isCapture && Number.isFinite(lossCp)) {
    tags.push(lossCp !== null && lossCp < 60
      ? tag('safe-capture', 'Capture holds up in the short search', 'छोटी खोज में कैप्चर ठीक रहता है')
      : tag('capture-check', 'Check the recapture', 'जवाबी कैप्चर पर ध्यान दें'));
  }
  if (bestMove && `${bestMove.from}${bestMove.to}${bestMove.promotion ?? ''}` !== record.uci &&
      (bestMove.isCapture() || bestMove.san.includes('+') || bestMove.san.includes('#'))) {
    tags.push(tag('missed-tactic', 'Missed tactical chance', 'छूटा हुआ सामरिक मौका'));
  }

  return {
    ply: record.ply,
    san: record.san,
    grade,
    explanation: moveExplanation(record, grade, bestMoveSan, lossCp),
    evaluationText: evaluationText(lossCp, before, afterAnalysis),
    lossCp,
    bestMoveSan,
    bestMoveUci: before.bestMoveUci,
    bestMoveFrom: bestMove?.from ?? null,
    bestMoveTo: bestMove?.to ?? null,
    engineLineSan: lineToSan(record.beforeFen, before.pv),
    tags,
    depthBefore: before.depth,
    depthAfter: afterAnalysis?.depth ?? 0,
  };
}

export function toCoachAnalysisView(assessment: MoveAssessment, language: CoachLanguage): CoachAnalysisView {
  return {
    ...assessment,
    classification: GRADE_LABELS[assessment.grade][language],
  };
}

export function toGameReviewView(assessment: MoveAssessment, color: Color, language: CoachLanguage): GameReviewView {
  return {
    ply: assessment.ply,
    san: assessment.san,
    color,
    classification: GRADE_LABELS[assessment.grade][language],
    explanation: assessment.explanation,
    tags: assessment.tags,
  };
}
