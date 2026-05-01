import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { categories } from '../src/data/categories.js';
import { processedRoot } from './_shared.js';

const databasePath = path.join(processedRoot, 'npb.sqlite');

function runSql(sql) {
  return execFileSync('/usr/bin/sqlite3', ['-json', databasePath, sql], {
    encoding: 'utf8',
  }).trim();
}

function readEligibilityFromDatabase() {
  const output = runSql(`
    SELECT
      category_id,
      player_id
    FROM category_eligibility
    ORDER BY category_id, player_id;
  `);

  const rows = output ? JSON.parse(output) : [];
  return rows.reduce((map, row) => {
    if (!map[row.category_id]) {
      map[row.category_id] = [];
    }
    map[row.category_id].push(row.player_id);
    return map;
  }, {});
}

function shuffle(items) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }

  return nextItems;
}

function intersection(leftIds, rightIds) {
  const rightSet = new Set(rightIds);
  return leftIds.filter((id) => rightSet.has(id));
}

function createRandomGridFromDatabase(eligibility) {
  const usableCategories = categories.filter(
    (category) => (eligibility[category.id] ?? []).length > 0,
  );

  for (let attempt = 0; attempt < 2500; attempt += 1) {
    const rows = shuffle(usableCategories).slice(0, 3);
    const viableColumns = usableCategories.filter(
      (candidate) =>
        !rows.some((row) => row.id === candidate.id) &&
        rows.every((row) =>
          intersection(eligibility[row.id] ?? [], eligibility[candidate.id] ?? []).length > 0,
        ),
    );

    if (viableColumns.length < 3) {
      continue;
    }

    const columns = shuffle(viableColumns).slice(0, 3);
    const cellCounts = rows.map((row) =>
      columns.map((column) =>
        intersection(eligibility[row.id] ?? [], eligibility[column.id] ?? []).length,
      ),
    );

    return { rows, columns, cellCounts };
  }

  throw new Error('Unable to generate a playable 3x3 board from SQLite eligibility data.');
}

function pad(value, width) {
  return String(value).padEnd(width, ' ');
}

function printGrid(grid) {
  console.log('Random playable board from SQLite:\n');
  console.log(`Rows:
- ${grid.rows.map((row) => row.id).join('\n- ')}\n`);
  console.log(`Columns:
- ${grid.columns.map((column) => column.id).join('\n- ')}\n`);

  const labelWidth = Math.max(...grid.rows.map((row) => row.label.length), 12);
  const columnWidths = grid.columns.map((column) => Math.max(column.label.length, 10));
  const header =
    pad('', labelWidth) +
    ' | ' +
    grid.columns.map((column, index) => pad(column.label, columnWidths[index])).join(' | ');
  const divider =
    '-'.repeat(labelWidth) +
    '-+-' +
    columnWidths.map((width) => '-'.repeat(width)).join('-+-');

  console.log('Intersection counts:');
  console.log(header);
  console.log(divider);

  grid.rows.forEach((row, rowIndex) => {
    const countCells = grid.cellCounts[rowIndex].map((count, columnIndex) =>
      pad(count, columnWidths[columnIndex]),
    );
    console.log(`${pad(row.label, labelWidth)} | ${countCells.join(' | ')}`);
  });
}

function main() {
  const eligibility = readEligibilityFromDatabase();
  const grid = createRandomGridFromDatabase(eligibility);
  printGrid(grid);
}

main();
