import { useState } from 'react';
import GridBoard from './components/GridBoard';
import { createRandomGrid } from './data/grids';
import { players } from './data/players';
import {
  findPlayerByName,
  isPlayerAlreadyUsed,
  validatePlayerForCell,
} from './game/validation';

const MAX_GUESSES = 9;

function createEmptyCells() {
  // The board state is keyed by "row-column" so the validation logic
  // stays independent from the visual layout.
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

function SummaryScreen({ cells, score }) {
  const cellList = Object.values(cells);
  const solvedPlayers = cellList.filter((cell) => cell.result === 'correct');

  return (
    <section className="summary-card">
      <p className="summary-kicker">Game Complete</p>
      <h2 className="summary-heading">Final Scorecard</h2>
      <p className="summary-subheading">
        {score >= 7
          ? 'Strong finish'
          : score >= 4
            ? 'Solid middle innings'
            : 'Tough matchup today'}
      </p>

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
          <p className="summary-label">Hits</p>
          <strong className="summary-score">{score}</strong>
        </div>
        <div>
          <p className="summary-label">Misses</p>
          <strong className="summary-score">{9 - score}</strong>
        </div>
        <div>
          <p className="summary-label">Final</p>
          <strong className="summary-score total">{score} / 9</strong>
        </div>
      </div>

      <div className="summary-notes">
        <p className="summary-notes-title">Solved squares</p>
        {solvedPlayers.length > 0 ? (
          solvedPlayers.map((cell) => (
            <p key={cell.playerName} className="summary-note">
              {cell.playerName}
            </p>
          ))
        ) : (
          <p className="summary-note">No correct players this round.</p>
        )}
      </div>
    </section>
  );
}

export default function App() {
  const [activeGrid, setActiveGrid] = useState(() => createRandomGrid(players));
  const [cells, setCells] = useState(createEmptyCells);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [message, setMessage] = useState('Pick a square and enter an NPB player.');
  const [editorNotice, setEditorNotice] = useState('');
  const [guessCount, setGuessCount] = useState(0);

  const score = Object.values(cells).filter(
    (cell) => cell.result === 'correct',
  ).length;
  const guessesRemaining = MAX_GUESSES - guessCount;
  const isGameOver = guessCount >= MAX_GUESSES;
  const query = draftName.trim().toLowerCase();
  const suggestions = (query
    ? players.filter((player) => player.name.toLowerCase().includes(query))
    : players
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
    setMessage('Type or tap a player name, then submit your guess.');
  }

  function closeEditor() {
    setSelectedCell(null);
    setDraftName('');
    setEditorNotice('');
  }

  function closeCategoryInfo() {
    setSelectedCategory(null);
  }

  function handleSubmitGuess() {
    if (!selectedCell) {
      return;
    }

    const player = findPlayerByName(players, draftName);
    const cellKey = getCellKey(selectedCell.rowIndex, selectedCell.columnIndex);

    if (!player) {
      setEditorNotice('That player is not in the local sample dataset yet.');
      setMessage('That player is not in the local sample dataset yet.');
      return;
    }

    if (isPlayerAlreadyUsed(cells, player.name, cellKey)) {
      setEditorNotice(`${player.name} is already used in another square.`);
      setMessage('That player is already used in another square.');
      return;
    }

    const rowCategory = activeGrid.rows[selectedCell.rowIndex];
    const columnCategory = activeGrid.columns[selectedCell.columnIndex];
    const isCorrect = validatePlayerForCell(player, rowCategory, columnCategory);
    const nextGuessCount = guessCount + 1;
    const nextMessage = isCorrect
      ? `${player.name} matches both categories.`
      : `${player.name} does not match both categories. Try another player for that square.`;

    setCells((currentCells) => ({
      ...currentCells,
      [cellKey]: {
        playerName: player.name,
        result: isCorrect ? 'correct' : 'incorrect',
        locked: isCorrect,
      },
    }));
    setGuessCount(nextGuessCount);

    setMessage(
      nextGuessCount >= MAX_GUESSES
        ? `Game over. Final score: ${isCorrect ? score + 1 : score} / 9.`
        : nextMessage,
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
    setDraftName('');
    setEditorNotice('');
    setMessage('Board reset. Pick a square and start again.');
  }

  function handleNewGrid() {
    setActiveGrid(createRandomGrid(players));
    setCells(createEmptyCells());
    setGuessCount(0);
    setSelectedCell(null);
    setSelectedCategory(null);
    setDraftName('');
    setEditorNotice('');
    setMessage('Loaded a new random grid.');
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Daily-style prototype</p>
          <h1>NPB Immaculate Grid MVP</h1>
          <p className="hero-copy">
            Fill each square with a Nippon Professional Baseball player who
            matches both the row and column categories.
          </p>
        </div>

        <div className="score-panel">
          <span>Score</span>
          <strong>{score} / 9</strong>
          <small>{isGameOver ? 'No guesses remaining.' : `${guessesRemaining} guesses remaining.`}</small>
        </div>
      </section>

      <div className="toolbar">
        <button className="toolbar-button primary" onClick={handleNewGrid}>
          New Grid
        </button>
        <button className="toolbar-button" onClick={handleReset}>
          Reset
        </button>
        <p className="status-text">{message}</p>
      </div>

      {selectedCategory && !isGameOver && (
        <section className="category-popup">
          <button className="popup-close" onClick={closeCategoryInfo}>
            Close
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
        <SummaryScreen cells={cells} score={score} />
      ) : (
        <GridBoard
          grid={activeGrid}
          cells={cells}
          onCellClick={handleCellClick}
          onCategoryClick={setSelectedCategory}
        />
      )}

      <section className="rules-card">
        <h2>How it works</h2>
        <p>
          Choose a square, enter a player from the local dataset, and the game
          checks whether that player satisfies both categories. Each new board
          is generated from one shared category pool of teams, awards,
          positions, and milestones. Click any row or column category box to
          view its criteria and team or franchise notes before making a guess.
          You get 9 total guesses for the board.
        </p>
      </section>

      {selectedCell && !isGameOver && (
        <div className="editor-backdrop" onClick={closeEditor}>
          <section
            className="editor-card"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Enter Player</h2>
            <p className="editor-label">
              {activeGrid.rows[selectedCell.rowIndex].label} +{' '}
              {activeGrid.columns[selectedCell.columnIndex].label}
            </p>

            <input
              className="player-input"
              type="text"
              value={draftName}
              onChange={(event) => {
                setDraftName(event.target.value);
                setEditorNotice('');
              }}
              placeholder="Example: Munetaka Murakami"
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
                Submit Guess
              </button>
              <button className="toolbar-button" onClick={closeEditor}>
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
