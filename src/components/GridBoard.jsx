function GridCell({ cell, onClick }) {
  const stateClassName = cell.result
    ? cell.result === 'correct'
      ? 'grid-cell correct'
      : 'grid-cell incorrect'
    : 'grid-cell';

  return (
    <button className={stateClassName} onClick={onClick} disabled={cell.locked}>
      <span className="cell-answer">
        {cell.playerName || 'Select player'}
      </span>
      <span className="cell-status">
        {cell.result === 'correct' && 'Correct'}
        {cell.result === 'incorrect' && 'Try again'}
        {!cell.result && 'Open'}
      </span>
    </button>
  );
}

function AxisCard({ category, className, onClick }) {
  return (
    <button className={`axis-card ${className}`} onClick={() => onClick(category)}>
      {category.label}
    </button>
  );
}

export default function GridBoard({ grid, cells, onCellClick, onCategoryClick }) {
  return (
    <section className="board-shell">
      <div className="board-grid">
        <div className="corner-card">
          <span>NPB</span>
          <strong>{grid.name}</strong>
        </div>

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
                />
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
