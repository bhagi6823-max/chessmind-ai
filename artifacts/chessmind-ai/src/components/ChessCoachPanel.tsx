import './ChessCoachPanel.css';

export type ChessCoachLanguage = 'en' | 'hi';
export type ChessCoachAnalysisStatus = 'idle' | 'loading' | 'ready' | 'error';
export type ChessCoachReviewStatus = 'idle' | 'loading' | 'ready' | 'error';

export type ChessCoachBilingualText = {
  en: string;
  hi: string;
};

export type ChessCoachAnalysis = {
  ply: number;
  san: string;
  classification: string;
  explanation: ChessCoachBilingualText;
  evaluationText: ChessCoachBilingualText;
  bestMoveSan: string | null;
  bestMoveFrom: string | null;
  bestMoveTo: string | null;
  engineLineSan: string[];
  tags: ChessCoachBilingualText[];
};

export type ChessCoachReviewItem = {
  ply: number;
  san: string;
  color: 'w' | 'b';
  classification: string;
  explanation: ChessCoachBilingualText;
  tags: ChessCoachBilingualText[];
};

export type ChessCoachConcept = {
  id: string;
  title: ChessCoachBilingualText;
  body: ChessCoachBilingualText;
};

export type ChessCoachPanelProps = {
  language: ChessCoachLanguage;
  onLanguageChange: (language: ChessCoachLanguage) => void;
  currentMoveLabel: string | null;
  analysisStatus: ChessCoachAnalysisStatus;
  analysisError?: string;
  analysis?: ChessCoachAnalysis;
  canAnalyze: boolean;
  onAnalyzeMove: () => void;
  suggestionVisible: boolean;
  onToggleSuggestion: () => void;
  gameOver: boolean;
  onReviewGame: () => void;
  reviewStatus: ChessCoachReviewStatus;
  reviewError?: string;
  reviewProgress: { completed: number; total: number } | null;
  reviewItems: ChessCoachReviewItem[];
  activeReviewPly: number | null;
  onSelectReviewMove: (ply: number) => void;
  concepts: ChessCoachConcept[];
};

function getStatusCopy(status: ChessCoachAnalysisStatus, language: ChessCoachLanguage, error?: string) {
  if (status === 'loading') {
    return {
      kind: 'loading',
      title: language === 'en' ? 'Looking at this position…' : 'इस स्थिति को देख रहे हैं…',
    };
  }
  if (status === 'error') {
    return {
      kind: 'error',
      title: error || (language === 'en' ? 'Move analysis could not be completed.' : 'चाल का विश्लेषण पूरा नहीं हो सका।'),
    };
  }
  if (status === 'ready') {
    return {
      kind: 'ready',
      title: language === 'en' ? 'Engine feedback is ready.' : 'इंजन की प्रतिक्रिया तैयार है।',
    };
  }
  return {
    kind: 'idle',
    title: language === 'en'
      ? 'Choose a move from the game to explore it with engine feedback.'
      : 'इंजन की प्रतिक्रिया के साथ समझने के लिए खेल से कोई चाल चुनें।',
  };
}

function getReviewStatusCopy(
  status: ChessCoachReviewStatus,
  language: ChessCoachLanguage,
  error?: string,
  progress?: { completed: number; total: number } | null,
) {
  if (status === 'loading') {
    if (progress) {
      return language === 'en'
        ? `Reviewing moves · ${progress.completed} of ${progress.total} complete`
        : `चालों की समीक्षा · ${progress.total} में से ${progress.completed} पूरी`;
    }
    return language === 'en' ? 'Reviewing the game…' : 'खेल की समीक्षा हो रही है…';
  }
  if (status === 'error') {
    return error || (language === 'en' ? 'The game review could not be completed.' : 'खेल की समीक्षा पूरी नहीं हो सकी।');
  }
  if (status === 'ready') {
    return language === 'en' ? 'Game review is ready.' : 'खेल की समीक्षा तैयार है।';
  }
  return language === 'en'
    ? 'When the game is over, review the moves and the ideas behind them.'
    : 'खेल समाप्त होने पर चालों और उनके पीछे के विचारों की समीक्षा करें।';
}

export function ChessCoachPanel({
  language,
  onLanguageChange,
  currentMoveLabel,
  analysisStatus,
  analysisError,
  analysis,
  canAnalyze,
  onAnalyzeMove,
  suggestionVisible,
  onToggleSuggestion,
  gameOver,
  onReviewGame,
  reviewStatus,
  reviewError,
  reviewProgress,
  reviewItems,
  activeReviewPly,
  onSelectReviewMove,
  concepts,
}: ChessCoachPanelProps) {
  const isHindi = language === 'hi';
  const analysisStatusCopy = getStatusCopy(analysisStatus, language, analysisError);
  const reviewStatusCopy = getReviewStatusCopy(reviewStatus, language, reviewError, reviewProgress);
  const reviewProgressPercent = reviewProgress && reviewProgress.total > 0
    ? Math.max(0, Math.min(100, (reviewProgress.completed / reviewProgress.total) * 100))
    : 0;
  const hasBestMove = Boolean(analysis?.bestMoveSan);

  return (
    <aside className="chess-coach" aria-label={isHindi ? 'ChessMind सीखने का पैनल' : 'ChessMind learning panel'}>
      <section className="chess-coach__card" aria-labelledby="chess-coach-analysis-title">
        <header className="chess-coach__header">
          <div>
            <span className="chess-coach__eyebrow">{isHindi ? 'चाल-दर-चाल सीखें' : 'Learn, one move at a time'}</span>
            <h2 className="chess-coach__title" id="chess-coach-analysis-title">
              {isHindi ? 'चाल की समझ' : 'Move insight'}
            </h2>
          </div>
          <div className="chess-coach__language" role="group" aria-label={isHindi ? 'भाषा चुनें' : 'Choose language'} data-testid="coach-language-control">
            <button
              className="chess-coach__language-button"
              type="button"
              aria-label="English"
              aria-pressed={language === 'en'}
              onClick={() => onLanguageChange('en')}
              data-testid="coach-language-en"
            >
              EN
            </button>
            <button
              className="chess-coach__language-button"
              type="button"
              aria-label="हिन्दी"
              lang="hi"
              aria-pressed={language === 'hi'}
              onClick={() => onLanguageChange('hi')}
              data-testid="coach-language-hi"
            >
              हिं
            </button>
          </div>
        </header>

        <div className="chess-coach__body">
          <div className="chess-coach__move-context" data-testid="coach-current-move">
            <span>{isHindi ? 'चुनी हुई चाल' : 'Selected move'}</span>
            <strong>{currentMoveLabel || (isHindi ? 'कोई चाल नहीं चुनी' : 'No move selected')}</strong>
          </div>
          <button
            className="chess-coach__action"
            type="button"
            onClick={onAnalyzeMove}
            disabled={!canAnalyze || analysisStatus === 'loading'}
            aria-busy={analysisStatus === 'loading'}
            data-testid="coach-analyze-move"
          >
            <span className="chess-coach__action-mark" aria-hidden="true">{analysisStatus === 'loading' ? '…' : '↗'}</span>
            {analysisStatus === 'loading'
              ? (isHindi ? 'विश्लेषण हो रहा है…' : 'Analyzing move…')
              : (isHindi ? 'इस चाल का विश्लेषण करें' : 'Analyze this move')}
          </button>

          <div
            className="chess-coach__status"
            data-kind={analysisStatusCopy.kind}
            data-testid={`coach-analysis-status-${analysisStatus}`}
            role={analysisStatus === 'error' ? 'alert' : 'status'}
            aria-live={analysisStatus === 'error' ? 'assertive' : 'polite'}
          >
            <span className="chess-coach__status-mark" aria-hidden="true">
              {analysisStatus === 'loading' ? '·' : analysisStatus === 'error' ? '!' : analysisStatus === 'ready' ? '✓' : 'i'}
            </span>
            <p>{analysisStatusCopy.title}</p>
          </div>

          {analysisStatus === 'ready' && analysis && (
            <article className="chess-coach__analysis" data-testid="coach-analysis-result">
              <div className="chess-coach__analysis-top">
                <h3 className="chess-coach__classification" data-testid="coach-analysis-classification">
                  {analysis.classification}
                </h3>
                <span className="chess-coach__evaluation" data-testid="coach-analysis-evaluation">
                  {analysis.evaluationText[language]}
                </span>
              </div>
              <p className="chess-coach__explanation" data-testid="coach-analysis-explanation">
                {analysis.explanation[language]}
              </p>

              {hasBestMove && (
                <div className="chess-coach__best-move" data-testid="coach-best-move">
                  <div className="chess-coach__best-move-copy">
                    <span className="chess-coach__micro-label">{isHindi ? 'इंजन का सुझाया कदम' : 'Engine suggestion'}</span>
                    <strong className="chess-coach__best-move-san">
                      {analysis.bestMoveSan}
                      {analysis.bestMoveFrom && analysis.bestMoveTo
                        ? ` · ${analysis.bestMoveFrom} → ${analysis.bestMoveTo}`
                        : ''}
                    </strong>
                  </div>
                  <button
                    className="chess-coach__highlight"
                    type="button"
                    aria-pressed={suggestionVisible}
                    aria-label={suggestionVisible
                      ? (isHindi ? 'बोर्ड से सुझाई चाल का हाइलाइट हटाएँ' : 'Hide suggested move highlight on board')
                      : (isHindi ? 'बोर्ड पर सुझाई चाल हाइलाइट करें' : 'Highlight suggested move on board')}
                    onClick={onToggleSuggestion}
                    data-testid="coach-toggle-suggestion"
                  >
                    {suggestionVisible
                      ? (isHindi ? 'हाइलाइट छिपाएँ' : 'Hide highlight')
                      : (isHindi ? 'बोर्ड पर दिखाएँ' : 'Show on board')}
                  </button>
                  <p className="chess-coach__highlight-note" data-testid="coach-highlight-note">
                    {isHindi
                      ? 'यह केवल बोर्ड पर चाल दिखाता है; चाल अपने-आप नहीं खेली जाएगी।'
                      : 'This only highlights the move on the board; it will not play it.'}
                  </p>
                </div>
              )}

              {analysis.engineLineSan.length > 0 && (
                <div className="chess-coach__route" data-testid="coach-engine-line">
                  <span className="chess-coach__micro-label">{isHindi ? 'इंजन की चाल-श्रृंखला' : 'Engine line'}</span>
                  <ol className="chess-coach__route-list">
                    {analysis.engineLineSan.map((move, index) => (
                      <li className="chess-coach__route-step" key={`${index}-${move}`} data-testid={`coach-engine-line-move-${index + 1}`}>
                        {move}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {analysis.tags.length > 0 && (
                <ul className="chess-coach__tags" aria-label={isHindi ? 'चाल के विषय' : 'Move topics'} data-testid="coach-analysis-tags">
                  {analysis.tags.map((tag, index) => (
                    <li className="chess-coach__tag" key={`${index}-${tag.en}`} data-testid={`coach-analysis-tag-${index + 1}`}>
                      {tag[language]}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          )}
        </div>
      </section>

      <section className="chess-coach__card chess-coach__review" aria-labelledby="chess-coach-review-title">
        <header className="chess-coach__header">
          <div>
            <span className="chess-coach__eyebrow">{isHindi ? 'खेल के बाद' : 'After the game'}</span>
            <h2 className="chess-coach__title" id="chess-coach-review-title">
              {isHindi ? 'खेल की समीक्षा' : 'Game review'}
            </h2>
          </div>
        </header>
        <p className="chess-coach__review-copy">
          {isHindi
            ? 'अपने खेले हुए खेल की चालों पर इंजन की प्रतिक्रिया देखें।'
            : 'Explore engine feedback on the moves from your game.'}
        </p>
        <p className="chess-coach__disclaimer" data-testid="coach-engine-disclaimer">
          {isHindi
            ? 'यह सीमित Stockfish इंजन-जाँच है, मानव विशेषज्ञ की पेशेवर राय नहीं।'
            : 'This is a bounded Stockfish engine check, not a professional human assessment.'}
        </p>
        <button
          className="chess-coach__action chess-coach__review-button"
          type="button"
          onClick={onReviewGame}
          disabled={!gameOver || reviewStatus === 'loading'}
          aria-busy={reviewStatus === 'loading'}
          data-testid="coach-review-game"
        >
          <span className="chess-coach__action-mark" aria-hidden="true">{reviewStatus === 'loading' ? '…' : '↻'}</span>
          {reviewStatus === 'loading'
            ? (isHindi ? 'समीक्षा हो रही है…' : 'Reviewing game…')
            : (isHindi ? 'खेल की समीक्षा करें' : 'Review this game')}
        </button>
        <div
          className="chess-coach__status"
          data-kind={reviewStatus === 'error' ? 'error' : reviewStatus === 'ready' ? 'ready' : reviewStatus === 'loading' ? 'loading' : 'idle'}
          data-testid={`coach-review-status-${reviewStatus}`}
          role={reviewStatus === 'error' ? 'alert' : 'status'}
          aria-live={reviewStatus === 'error' ? 'assertive' : 'polite'}
        >
          <span className="chess-coach__status-mark" aria-hidden="true">
            {reviewStatus === 'loading' ? '·' : reviewStatus === 'error' ? '!' : reviewStatus === 'ready' ? '✓' : 'i'}
          </span>
          <div>
            <p>{reviewStatusCopy}</p>
            {reviewStatus === 'loading' && reviewProgress && reviewProgress.total > 0 && (
              <div
                className="chess-coach__progress-track"
                role="progressbar"
                aria-label={isHindi ? 'समीक्षा की प्रगति' : 'Review progress'}
                aria-valuemin={0}
                aria-valuemax={reviewProgress.total}
                aria-valuenow={reviewProgress.completed}
                data-testid="coach-review-progress"
              >
                <div className="chess-coach__progress-fill" style={{ width: `${reviewProgressPercent}%` }} />
              </div>
            )}
          </div>
        </div>

        {reviewItems.length > 0 && (
          <ol className="chess-coach__review-list" aria-label={isHindi ? 'समीक्षा की गई चालें' : 'Reviewed moves'} data-testid="coach-review-items">
            {reviewItems.map((item) => (
              <li className="chess-coach__review-item" key={item.ply} data-testid={`coach-review-item-${item.ply}`}>
                <button
                  className="chess-coach__review-select"
                  type="button"
                  aria-pressed={activeReviewPly === item.ply}
                  aria-label={isHindi
                    ? `चाल ${item.ply}, ${item.san}, ${item.classification}`
                    : `Move ${item.ply}, ${item.san}, ${item.classification}`}
                  onClick={() => onSelectReviewMove(item.ply)}
                  data-testid={`coach-select-review-move-${item.ply}`}
                >
                  <span className="chess-coach__review-number">
                    {item.color === 'w' ? `${Math.ceil(item.ply / 2)}.` : `${Math.ceil(item.ply / 2)}…`}
                  </span>
                  <span className="chess-coach__review-san">{item.san}</span>
                  <span className="chess-coach__review-classification">{item.classification}</span>
                </button>
                {activeReviewPly === item.ply && (
                  <div className="chess-coach__review-detail" data-testid={`coach-review-detail-${item.ply}`}>
                    <p>{item.explanation[language]}</p>
                    {item.tags.length > 0 && (
                      <ul className="chess-coach__tags" aria-label={isHindi ? 'चाल के विषय' : 'Move topics'}>
                        {item.tags.map((tag, index) => (
                          <li className="chess-coach__tag" key={`${index}-${tag.en}`} data-testid={`coach-review-tag-${item.ply}-${index + 1}`}>
                            {tag[language]}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="chess-coach__card chess-coach__concepts" aria-labelledby="chess-coach-concepts-title">
        <header className="chess-coach__header">
          <div>
            <span className="chess-coach__eyebrow">{isHindi ? 'बुनियादी बातें' : 'The fundamentals'}</span>
            <h2 className="chess-coach__title" id="chess-coach-concepts-title">
              {isHindi ? 'छोटे-छोटे सबक' : 'Small lessons'}
            </h2>
          </div>
        </header>
        <div data-testid="coach-concepts">
          {concepts.map((concept) => (
            <article className="chess-coach__concept" key={concept.id} data-testid={`coach-concept-${concept.id}`}>
              <h3 className="chess-coach__concept-title" lang={language}>
                {concept.title[language]}
              </h3>
              <p className="chess-coach__concept-body" lang={language}>
                {concept.body[language]}
              </p>
            </article>
          ))}
        </div>
      </section>
    </aside>
  );
}

export default ChessCoachPanel;
