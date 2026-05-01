import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { categories, buildGridFromCategoryIds } from '../src/data/categories.js';
import { processedRoot } from './_shared.js';

const databasePath = path.join(processedRoot, 'npb.sqlite');
const outputPath = path.join(processedRoot, 'todayBoard.json');

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

function hashString(value) {
  let hash = 0;

  for (const char of value) {
    hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  }

  return hash >>> 0;
}

function createSeededRandom(seedText) {
  let seed = hashString(seedText) || 1;

  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function shuffleWithRandom(items, random) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }

  return nextItems;
}

function intersection(leftIds, rightIds) {
  const rightSet = new Set(rightIds);
  return leftIds.filter((id) => rightSet.has(id));
}

function createDailyGrid(seedText, eligibility) {
  const random = createSeededRandom(seedText);
  const usableCategories = categories.filter(
    (category) => (eligibility[category.id] ?? []).length > 0,
  );

  for (let attempt = 0; attempt < 2500; attempt += 1) {
    const rows = shuffleWithRandom(usableCategories, random).slice(0, 3);
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

    const columns = shuffleWithRandom(viableColumns, random).slice(0, 3);
    const cellCounts = rows.map((row) =>
      columns.map((column) =>
        intersection(eligibility[row.id] ?? [], eligibility[column.id] ?? []).length,
      ),
    );

    return {
      rows,
      columns,
      cellCounts,
    };
  }

  throw new Error(`Unable to generate a playable 3x3 board for seed "${seedText}".`);
}

function getBoardDate() {
  const explicitDate = process.argv[2];

  if (explicitDate) {
    return explicitDate;
  }

  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const boardDate = getBoardDate();
  const eligibility = readEligibilityFromDatabase();
  const grid = createDailyGrid(boardDate, eligibility);
  const hydratedGrid = buildGridFromCategoryIds(
    grid.rows.map((row) => row.id),
    grid.columns.map((column) => column.id),
  );

  if (!hydratedGrid) {
    throw new Error('Failed to hydrate daily board category IDs.');
  }

  const payload = {
    date: boardDate,
    source: 'sqlite',
    rowIds: grid.rows.map((row) => row.id),
    columnIds: grid.columns.map((column) => column.id),
    cellCounts: grid.cellCounts,
  };

  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Built daily board snapshot: ${outputPath}`);
  console.log(`Date: ${boardDate}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
