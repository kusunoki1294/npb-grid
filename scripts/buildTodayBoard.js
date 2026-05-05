import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import battingSeasons from '../data/processed/battingSeasons.json' with { type: 'json' };
import pitchingSeasons from '../data/processed/pitchingSeasons.json' with { type: 'json' };
import playerAwards from '../data/processed/playerAwards.json' with { type: 'json' };
import {
  buildGridFromCategoryIds,
  createDailyGridFromEligibility,
} from '../src/data/categories.js';
import { getIntersectionPlayerIds } from '../src/lib/categoryIntersection.js';
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

function getPlayableIntersection(rowCategory, columnCategory, eligibility) {
  return getIntersectionPlayerIds(
    rowCategory,
    columnCategory,
    eligibility,
    playerAwards,
    battingSeasons,
    pitchingSeasons,
  );
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
  const grid = createDailyGridFromEligibility(
    eligibility,
    boardDate,
    (rowCategory, columnCategory) =>
      getPlayableIntersection(rowCategory, columnCategory, eligibility).length > 0,
  );
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
    cellCounts: grid.rows.map((rowCategory) =>
      grid.columns.map((columnCategory) =>
        getPlayableIntersection(rowCategory, columnCategory, eligibility).length,
      ),
    ),
  };

  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Built daily board snapshot: ${outputPath}`);
  console.log(`Date: ${boardDate}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
