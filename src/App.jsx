import { useState } from 'react';
import GridBoard from './components/GridBoard';
import { createRandomGridFromEligibility } from './data/categories';
import { findPlayerByName, isPlayerAlreadyUsed, validateAnswer } from './lib/validateAnswer';
import playersById from '../data/processed/players.json';
import eligibility from '../data/processed/eligibility.json';

const MAX_GUESSES = 9;

const copy = {
  en: {
    eyebrow: 'Daily-style prototype',
    title: 'NPB Trivia Grid',
    score: 'Score',
    noGuesses: 'No guesses remaining.',
    guessesRemaining: (count) => `${count} guesses remaining.`,
    newGrid: 'New Grid',
    reset: 'Reset',
    defaultMessage: 'Pick a square and enter an NPB player.',
    openMessage: 'Type or tap a player name, then submit your guess.',
    missingPlayer: 'That player is not in the processed dataset yet.',
    duplicatePlayer: (name) => `${name} is already used in another square.`,
    correct: (name) => `${name} matches both categories.`,
    incorrect: (name) =>
      `${name} does not match both categories. Try another player for that square.`,
    gameOver: (score) => `Game over. Final score: ${score} / 9.`,
    resetMessage: 'Board reset. Pick a square and start again.',
    newGridMessage: 'Loaded a new random grid.',
    howItWorks: 'How it works',
    howText:
      'Fill each square with a Nippon Professional Baseball player who matches both the row and column categories. Choose a square, enter a player from the local dataset, and the game checks whether that player satisfies both categories. Each new board is generated from one shared category pool of teams, awards, positions, and milestones. Click any row or column category box to view its criteria and team or franchise notes before making a guess. You get 9 total guesses for the board.',
    close: 'Close',
    enterPlayer: 'Enter Player',
    submitGuess: 'Submit Guess',
    cancel: 'Cancel',
    placeholder: 'Example: Munetaka Murakami',
    selectPlayer: 'Select player',
    summaryKicker: 'Game Complete',
    summaryHeading: 'Final Scorecard',
    summarySubheading: (score) =>
      score >= 7
        ? 'Strong finish'
        : score >= 4
          ? 'Solid middle innings'
          : 'Tough matchup today',
    hits: 'Hits',
    misses: 'Misses',
    final: 'Final',
    solvedSquares: 'Solved squares',
    noSolved: 'No correct players this round.',
  },
  ja: {
    eyebrow: 'デイリープロトタイプ',
    title: 'プロ野球グリッド',
    score: 'スコア',
    noGuesses: '残り回数はありません。',
    guessesRemaining: (count) => `残り ${count} 回`,
    newGrid: '新しいグリッド',
    reset: 'リセット',
    defaultMessage: 'マスを選んで選手名を入力してください。',
    openMessage: '選手名を入力するか候補を選んで送信してください。',
    missingPlayer: 'その選手は加工済みデータに入っていません。',
    duplicatePlayer: (name) => `${name} は別の正解マスで使われています。`,
    correct: (name) => `${name} は両方の条件を満たしています。`,
    incorrect: (name) =>
      `${name} は両方の条件を満たしていません。このマスで別の選手を試してください。`,
    gameOver: (score) => `終了。最終スコア: ${score} / 9`,
    resetMessage: '盤面をリセットしました。最初からやり直せます。',
    newGridMessage: '新しいランダムグリッドを読み込みました。',
    howItWorks: '遊び方',
    howText:
      '各マスに、行と列の条件を両方満たす日本プロ野球の選手を入れてください。マスを選んでローカルのサンプルデータにある選手を入力すると、その選手が行と列の両方の条件を満たすか判定します。各ボードは、球団、受賞、ポジション、記録の共通カテゴリープールから生成されます。予想する前に、行または列のカテゴリーボックスをクリックすると条件や球団メモを確認できます。使える予想は合計 9 回です。',
    close: '閉じる',
    enterPlayer: '選手を入力',
    submitGuess: '選択',
    cancel: 'キャンセル',
    placeholder: '例: 村上 宗隆',
    selectPlayer: '選手を選択',
    summaryKicker: 'ゲーム終了',
    summaryHeading: '最終スコアカード',
    summarySubheading: (score) =>
      score >= 7
        ? 'かなり好調です'
        : score >= 4
          ? 'まずまずの内容です'
          : '今日は苦戦しました',
    hits: '正解',
    misses: '不正解',
    final: '結果',
    solvedSquares: '正解したマス',
    noSolved: '今回は正解した選手がいませんでした。',
  },
};

const jaCategoryLabels = {
  'Yomiuri Giants': '読売ジャイアンツ',
  'Hanshin Tigers': '阪神タイガース',
  'Yakult Swallows': '東京ヤクルトスワローズ',
  'Chunichi Dragons': '中日ドラゴンズ',
  'Hiroshima Toyo Carp': '広島東洋カープ',
  'Yokohama DeNA BayStars': '横浜DeNAベイスターズ',
  'SoftBank Hawks': '福岡ソフトバンクホークス',
  'Orix Buffaloes': 'オリックス・バファローズ',
  'Chiba Lotte Marines': '千葉ロッテマリーンズ',
  'Seibu Lions': '埼玉西武ライオンズ',
  'Rakuten Eagles': '東北楽天ゴールデンイーグルス',
  'Nippon-Ham Fighters': '北海道日本ハムファイターズ',
  'MVP Winner': 'MVP受賞',
  'Sawamura Award Winner': '沢村賞受賞',
  'Rookie of the Year': '新人王',
  'Best Nine': 'ベストナイン',
  'Golden Glove': 'ゴールデングラブ賞',
  'All-Star': 'オールスター',
  'Japan Series Champion': '日本シリーズ優勝',
  'Japan Series MVP': '日本シリーズMVP',
  'Climax Series MVP': 'クライマックスシリーズMVP',
  'Batting Champion': '首位打者',
  'Home Run Leader': '本塁打王',
  'RBI Leader': '打点王',
  'Stolen Base Leader': '盗塁王',
  'ERA Leader': '最優秀防御率',
  'Wins Leader': '最多勝',
  'Strikeout Leader': '最多奪三振',
  'Saves Leader': '最多セーブ',
  'Holds Leader': '最優秀中継ぎ',
  Pitcher: '投手',
  Catcher: '捕手',
  'Left Fielder': '左翼手',
  'Center Fielder': '中堅手',
  'Right Fielder': '右翼手',
  'First Baseman': '一塁手',
  'Second Baseman': '二塁手',
  'Third Baseman': '三塁手',
  Shortstop: '遊撃手',
  'Designated Hitter': '指名打者',
  'Triple Crown Season': '三冠王シーズン',
  'Played for Only One NPB Franchise': 'NPBで1球団のみ所属',
  'Played in MLB': 'MLB経験あり',
  'Foreign-Born Player': '外国出身選手',
  'Japanese-Born Player': '日本出身選手',
  'Switch Hitter': 'スイッチヒッター',
  'No-Hitter': 'ノーヒットノーラン',
  'Perfect Game': '完全試合',
  'Japan Baseball Hall of Fame': '野球殿堂入り',
  'Meikyukai Member': '名球会会員',
};

const jaCategoryDetails = {
  team: {
    heading: '球団ルール',
    subtitle: 'その球団での出場経験が必要です',
    note:
      '球団カテゴリと組み合わさる場合、ローカルのサンプルデータ上でその球団で少なくとも1試合出場している必要があります。',
  },
  award: {
    heading: '受賞ルール',
    subtitle: 'NPBでの受賞実績',
    note:
      '球団カテゴリと組み合わさる場合、その球団在籍時にその賞を受賞している必要があります。球団以外のカテゴリとの組み合わせでは、サンプルデータ内のどこかで両方の条件を満たしていれば構いません。',
  },
  position: {
    heading: 'ポジションルール',
    subtitle: 'そのポジションとして登録',
    note:
      'ローカルのサンプルデータでそのポジションに登録されている必要があります。球団以外のカテゴリと同じシーズンである必要はありません。',
  },
  battingMilestone: {
    heading: '打撃記録',
    subtitle: '打撃成績の条件',
    note:
      '球団カテゴリと組み合わさる場合、その球団でこの打撃記録を達成している必要があります。球団以外のカテゴリとの組み合わせでは、サンプルデータ内のどのシーズンでも構いません。',
  },
  pitchingMilestone: {
    heading: '投手記録',
    subtitle: '投手成績の条件',
    note:
      '球団カテゴリと組み合わさる場合、その球団でこの投手記録を達成している必要があります。球団以外のカテゴリとの組み合わせでは、サンプルデータ内のどのシーズンでも構いません。',
  },
  battingSeasonMilestone: {
    heading: '打撃シーズン記録',
    subtitle: '打撃成績の条件',
    note:
      '球団カテゴリと組み合わさる場合、その球団でこの打撃シーズン記録を達成している必要があります。球団以外のカテゴリとの組み合わせでは、サンプルデータ内のどのシーズンでも構いません。',
  },
  battingCareerMilestone: {
    heading: '通算打撃記録',
    subtitle: '通算打撃成績の条件',
    note:
      '通算打撃記録はローカルのサンプルデータ内の通算タグを使います。球団カテゴリと組み合わさる場合でも、その球団での所属経験は必要です。',
  },
  pitchingSeasonMilestone: {
    heading: '投手シーズン記録',
    subtitle: '投手成績の条件',
    note:
      '球団カテゴリと組み合わさる場合、その球団でこの投手シーズン記録を達成している必要があります。球団以外のカテゴリとの組み合わせでは、サンプルデータ内のどのシーズンでも構いません。',
  },
  pitchingCareerMilestone: {
    heading: '通算投手記録',
    subtitle: '通算投手成績の条件',
    note:
      '通算投手記録はローカルのサンプルデータ内の通算タグを使います。球団カテゴリと組み合わさる場合でも、その球団での所属経験は必要です。',
  },
  specialCategory: {
    heading: '特別カテゴリ',
    subtitle: '特別な経歴や属性',
    note:
      '特別カテゴリはローカルのサンプルデータ内のタグを使います。球団カテゴリと組み合わさる場合でも、その球団での所属経験は必要です。',
  },
};

function localizeGeneratedCategoryLabel(label) {
  const patterns = [
    [/^(\.\d+)\+ AVG Season$/, ([, value]) => `シーズン打率${value}以上`],
    [/^(\d+)\+ HR Season$/, ([, value]) => `シーズン${value}本塁打以上`],
    [/^(\d+)\+ RBI Season$/, ([, value]) => `シーズン${value}打点以上`],
    [/^(\d+)\+ Runs Season$/, ([, value]) => `シーズン${value}得点以上`],
    [/^(\d+)\+ Hits Season$/, ([, value]) => `シーズン${value}安打以上`],
    [/^(\d+)\+ SB Season$/, ([, value]) => `シーズン${value}盗塁以上`],
    [
      /^(\d+)\+ HR \/ (\d+)\+ SB Season$/,
      ([, homeRuns, steals]) => `シーズン${homeRuns}本塁打・${steals}盗塁以上`,
    ],
    [/^(\d+)\+ Career Hits$/, ([, value]) => `通算${value}安打以上`],
    [/^(\d+)\+ Career HR$/, ([, value]) => `通算${value}本塁打以上`],
    [/^(\d+)\+ Career RBI$/, ([, value]) => `通算${value}打点以上`],
    [/^(\d+)\+ Career Runs$/, ([, value]) => `通算${value}得点以上`],
    [/^(\d+)\+ Career SB$/, ([, value]) => `通算${value}盗塁以上`],
    [/^(\.\d+)\+ Career AVG$/, ([, value]) => `通算打率${value}以上`],
    [/^(\.\d+)\+ Career OBP$/, ([, value]) => `通算出塁率${value}以上`],
    [/^(\.\d+)\+ Career SLG$/, ([, value]) => `通算長打率${value}以上`],
    [/^(\d+)\+ Win Season$/, ([, value]) => `シーズン${value}勝以上`],
    [/^(\d+)\+ Strikeout Season$/, ([, value]) => `シーズン${value}奪三振以上`],
    [/^<=([\d.]+) ERA Season$/, ([, value]) => `シーズン防御率${value}以下`],
    [/^(\d+)\+ Save Season$/, ([, value]) => `シーズン${value}セーブ以上`],
    [/^(\d+)\+ Hold Season$/, ([, value]) => `シーズン${value}ホールド以上`],
    [/^(\d+)\+ IP Season$/, ([, value]) => `シーズン${value}投球回以上`],
    [/^(\d+)\+ Career Wins$/, ([, value]) => `通算${value}勝以上`],
    [/^(\d+)\+ Career Strikeouts$/, ([, value]) => `通算${value}奪三振以上`],
    [/^(\d+)\+ Career Saves$/, ([, value]) => `通算${value}セーブ以上`],
    [/^(\d+)\+ Career Holds$/, ([, value]) => `通算${value}ホールド以上`],
    [/^(\d+)\+ Games Pitched$/, ([, value]) => `通算${value}登板以上`],
    [/^(\d+)\+ Career IP$/, ([, value]) => `通算${value}投球回以上`],
    [/^Sub-(\d+\.\d+) Career ERA$/, ([, value]) => `通算防御率${value}未満`],
    [/^(\d+)\+ Career Complete Games$/, ([, value]) => `通算${value}完投以上`],
    [/^(\d+)\+ Career Shutouts$/, ([, value]) => `通算${value}完封以上`],
  ];

  for (const [pattern, formatter] of patterns) {
    const match = label.match(pattern);

    if (match) {
      return formatter(match);
    }
  }

  return label;
}

function createEmptyCells() {
  const nextCells = {};

  for (let rowIndex = 0; rowIndex < 3; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < 3; columnIndex += 1) {
      nextCells[`${rowIndex}-${columnIndex}`] = {
        playerName: '',
        result: null,
        locked: false,
      };
    }
  }

  return nextCells;
}

function getCellKey(rowIndex, columnIndex) {
  return `${rowIndex}-${columnIndex}`;
}

function localizeCategory(category, locale) {
  if (locale !== 'ja') {
    return category;
  }

  return {
    ...category,
    label: jaCategoryLabels[category.label] ?? localizeGeneratedCategoryLabel(category.label),
    details: {
      ...category.details,
      ...(jaCategoryDetails[category.type] ?? {}),
      history: category.details.history,
    },
  };
}

function SummaryScreen({ cells, score, locale }) {
  const text = copy[locale];
  const cellList = Object.values(cells);
  const solvedPlayers = cellList.filter((cell) => cell.result === 'correct');

  return (
    <section className="summary-card">
      <p className="summary-kicker">{text.summaryKicker}</p>
      <h2 className="summary-heading">{text.summaryHeading}</h2>
      <p className="summary-subheading">{text.summarySubheading(score)}</p>

      <div className="summary-strip">
        {cellList.map((cell, index) => (
          <div
            key={`strip-${index}`}
            className={
              cell.result === 'correct'
                ? 'summary-strip-cell correct'
                : 'summary-strip-cell'
            }
          >
            {index + 1}
          </div>
        ))}
      </div>

      <div className="summary-grid">
        {cellList.map((cell, index) => (
          <div
            key={`grid-${index}`}
            className={
              cell.result === 'correct'
                ? 'summary-cell correct'
                : 'summary-cell'
            }
          >
            <span>{index + 1}</span>
          </div>
        ))}
      </div>

      <div className="summary-scoreboard">
        <div>
          <p className="summary-label">{text.hits}</p>
          <strong className="summary-score">{score}</strong>
        </div>
        <div>
          <p className="summary-label">{text.misses}</p>
          <strong className="summary-score">{9 - score}</strong>
        </div>
        <div>
          <p className="summary-label">{text.final}</p>
          <strong className="summary-score total">{score} / 9</strong>
        </div>
      </div>

      <div className="summary-notes">
        <p className="summary-notes-title">{text.solvedSquares}</p>
        {solvedPlayers.length > 0 ? (
          solvedPlayers.map((cell) => (
            <p key={cell.playerName} className="summary-note">
              {cell.playerName}
            </p>
          ))
        ) : (
          <p className="summary-note">{text.noSolved}</p>
        )}
      </div>
    </section>
  );
}

function GameScreen({ locale }) {
  const text = copy[locale];
  const [activeGrid, setActiveGrid] = useState(() =>
    createRandomGridFromEligibility(eligibility),
  );
  const [cells, setCells] = useState(createEmptyCells);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [message, setMessage] = useState(text.defaultMessage);
  const [editorNotice, setEditorNotice] = useState('');
  const [guessCount, setGuessCount] = useState(0);

  const score = Object.values(cells).filter(
    (cell) => cell.result === 'correct',
  ).length;
  const guessesRemaining = MAX_GUESSES - guessCount;
  const isGameOver = guessCount >= MAX_GUESSES;
  const localizedGrid = {
    ...activeGrid,
    rows: activeGrid.rows.map((category) => localizeCategory(category, locale)),
    columns: activeGrid.columns.map((category) => localizeCategory(category, locale)),
  };
  const allPlayers = Object.values(playersById);
  const query = draftName.trim().toLowerCase();
  const suggestions = (query
    ? allPlayers.filter((player) => {
        const english = (player.name ?? '').toLowerCase();
        const japanese = (player.nameJapanese ?? '').toLowerCase();
        return english.includes(query) || japanese.includes(query);
      })
    : allPlayers
  ).slice(0, 8);

  function handleCellClick(rowIndex, columnIndex) {
    const cellKey = getCellKey(rowIndex, columnIndex);
    const currentCell = cells[cellKey];

    if (currentCell.locked || isGameOver) {
      return;
    }

    setSelectedCell({ rowIndex, columnIndex });
    setDraftName(currentCell.playerName);
    setEditorNotice('');
    setMessage(text.openMessage);
  }

  function closeEditor() {
    setSelectedCell(null);
    setDraftName('');
    setEditorNotice('');
  }

  function closeCategoryInfo() {
    setSelectedCategory(null);
  }

  function closeHelp() {
    setShowHelp(false);
  }

  function handleSubmitGuess() {
    if (!selectedCell) {
      return;
    }

    const player = findPlayerByName(playersById, draftName);
    const cellKey = getCellKey(selectedCell.rowIndex, selectedCell.columnIndex);

    if (!player) {
      setEditorNotice(text.missingPlayer);
      setMessage(text.missingPlayer);
      return;
    }

    if (isPlayerAlreadyUsed(cells, player.id, cellKey)) {
      const duplicateMessage = text.duplicatePlayer(player.name);
      setEditorNotice(duplicateMessage);
      setMessage(duplicateMessage);
      return;
    }

    const rowCategory = activeGrid.rows[selectedCell.rowIndex];
    const columnCategory = activeGrid.columns[selectedCell.columnIndex];
    const isCorrect = validateAnswer(
      player.id,
      rowCategory.id,
      columnCategory.id,
      eligibility,
    );
    const nextGuessCount = guessCount + 1;
    const nextScore = isCorrect ? score + 1 : score;

    setCells((currentCells) => ({
      ...currentCells,
      [cellKey]: {
        playerId: player.id,
        playerName: player.name,
        result: isCorrect ? 'correct' : 'incorrect',
        locked: isCorrect,
      },
    }));
    setGuessCount(nextGuessCount);
    setMessage(
      nextGuessCount >= MAX_GUESSES
        ? text.gameOver(nextScore)
        : isCorrect
          ? text.correct(player.name)
          : text.incorrect(player.name),
    );

    if (nextGuessCount >= MAX_GUESSES) {
      setSelectedCategory(null);
    }

    setEditorNotice('');
    closeEditor();
  }

  function handleReset() {
    setCells(createEmptyCells());
    setGuessCount(0);
    setSelectedCell(null);
    setSelectedCategory(null);
    setShowHelp(false);
    setDraftName('');
    setEditorNotice('');
    setMessage(text.resetMessage);
  }

  function handleNewGrid() {
    setActiveGrid(createRandomGridFromEligibility(eligibility));
    setCells(createEmptyCells());
    setGuessCount(0);
    setSelectedCell(null);
    setSelectedCategory(null);
    setShowHelp(false);
    setDraftName('');
    setEditorNotice('');
    setMessage(text.newGridMessage);
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div className="hero-main">
          <p className="eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
          <button
            className={showHelp ? 'info-button active' : 'info-button'}
            onClick={() => setShowHelp((current) => !current)}
          >
            {text.howItWorks}
          </button>
        </div>

        <div className="score-panel">
          <span>{text.score}</span>
          <strong>{score} / 9</strong>
          <small>
            {isGameOver ? text.noGuesses : text.guessesRemaining(guessesRemaining)}
          </small>
        </div>

        {showHelp && (
          <section className="help-panel">
            <p className="help-panel-heading">{text.howItWorks}</p>
            <p className="help-panel-text">{text.howText}</p>
          </section>
        )}
      </section>

      <div className="toolbar">
        <button className="toolbar-button primary" onClick={handleNewGrid}>
          {text.newGrid}
        </button>
        <button className="toolbar-button" onClick={handleReset}>
          {text.reset}
        </button>
        <p className="status-text">{message}</p>
      </div>

      {selectedCategory && !isGameOver && (
        <section className="category-popup">
          <button className="popup-close" onClick={closeCategoryInfo}>
            {text.close}
          </button>
          <p className="popup-heading">{selectedCategory.details.heading}</p>
          <h2 className="popup-title">{selectedCategory.label}</h2>
          <p className="popup-subtitle">{selectedCategory.details.subtitle}</p>
          <p className="popup-note">{selectedCategory.details.note}</p>
          {selectedCategory.details.history?.length > 0 && (
            <div className="popup-history">
              {selectedCategory.details.history.map((entry) => (
                <p key={entry}>{entry}</p>
              ))}
            </div>
          )}
        </section>
      )}

      {isGameOver ? (
        <SummaryScreen cells={cells} score={score} locale={locale} />
      ) : (
        <GridBoard
          grid={localizedGrid}
          cells={cells}
          onCellClick={handleCellClick}
          onCategoryClick={setSelectedCategory}
          emptyLabel={text.selectPlayer}
        />
      )}

      {selectedCell && !isGameOver && (
        <div className="editor-backdrop" onClick={closeEditor}>
          <section
            className="editor-card"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>{text.enterPlayer}</h2>
            <p className="editor-label">
              {localizedGrid.rows[selectedCell.rowIndex].label} +{' '}
              {localizedGrid.columns[selectedCell.columnIndex].label}
            </p>

            <input
              className="player-input"
              type="text"
              value={draftName}
              onChange={(event) => {
                setDraftName(event.target.value);
                setEditorNotice('');
              }}
              placeholder={text.placeholder}
              autoFocus
            />

            {editorNotice && <p className="editor-notice">{editorNotice}</p>}

            <div className="suggestions">
              {suggestions.map((player) => (
                <button
                  key={player.name}
                  className="suggestion-chip"
                  onClick={() => {
                    setDraftName(player.name);
                    setEditorNotice('');
                  }}
                >
                  {player.name}
                </button>
              ))}
            </div>

            <div className="editor-actions">
              <button className="toolbar-button primary" onClick={handleSubmitGuess}>
                {text.submitGuess}
              </button>
              <button className="toolbar-button" onClick={closeEditor}>
                {text.cancel}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('ja');

  return (
    <div className="page-shell">
      <nav className="tab-bar" aria-label="Page tabs">
        <button
          className={activeTab === 'ja' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('ja')}
        >
          日本語
        </button>
        <button
          className={activeTab === 'en' ? 'tab-button active' : 'tab-button'}
          onClick={() => setActiveTab('en')}
        >
          English
        </button>
      </nav>

      <div className={activeTab === 'ja' ? 'tab-panel active' : 'tab-panel'}>
        <GameScreen locale="ja" />
      </div>
      <div className={activeTab === 'en' ? 'tab-panel active' : 'tab-panel'}>
        <GameScreen locale="en" />
      </div>
    </div>
  );
}
