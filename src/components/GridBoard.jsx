function GridCell({ cell, onClick, emptyLabel }) {
  const stateClassName = cell.result
    ? cell.result === 'correct'
      ? 'grid-cell correct'
      : 'grid-cell incorrect'
    : 'grid-cell';
  const answerClassName = cell.playerName ? 'cell-answer' : 'cell-answer empty';

  return (
    <button className={stateClassName} onClick={onClick} disabled={cell.locked}>
      <span className={answerClassName}>
        {cell.playerName || emptyLabel}
      </span>
      <span className="cell-status">
        {cell.result === 'correct' && 'Correct'}
        {cell.result === 'incorrect' && 'Try again'}
      </span>
    </button>
  );
}

function AxisCard({ category, className, onClick }) {
  return (
    <button
      className={`axis-card ${className} axis-card-${category.type}`}
      onClick={() => onClick(category)}
    >
      {category.label}
    </button>
  );
}

export default function GridBoard({
  grid,
  cells,
  onCellClick,
  onCategoryClick,
  emptyLabel,
}) {
  return (
    <section className="board-shell">
      <div className="board-grid">
        <div className="corner-spacer" aria-hidden="true" />

        {grid.columns.map((column) => (
          <AxisCard
            key={column.label}
            category={column}
            className="column-card"
            onClick={onCategoryClick}
          />
        ))}

        {grid.rows.map((row, rowIndex) => (
          <div className="board-row" key={row.label}>
            <AxisCard
              category={row}
              className="row-card"
              onClick={onCategoryClick}
            />

            {grid.columns.map((column, columnIndex) => {
              const cellKey = `${rowIndex}-${columnIndex}`;
              const cell = cells[cellKey];

              return (
                <GridCell
                  key={`${row.label}-${column.label}`}
                  cell={cell}
                  onClick={() => onCellClick(rowIndex, columnIndex)}
                  emptyLabel={emptyLabel}
                />
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
