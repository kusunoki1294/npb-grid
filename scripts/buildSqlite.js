import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { processedRoot, projectRoot } from './_shared.js';

const databasePath = path.join(processedRoot, 'npb.sqlite');
const schemaPath = path.join(projectRoot, 'db', 'schema.sql');

async function readJson(fileName, fallback) {
  try {
    const text = await fs.readFile(path.join(processedRoot, fileName), 'utf8');
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function sqlValue(value) {
  if (value == null) {
    return 'NULL';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL';
  }

  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function insertStatement(tableName, columns, rows) {
  if (rows.length === 0) {
    return '';
  }

  const values = rows
    .map((row) => `(${columns.map((column) => sqlValue(row[column])).join(', ')})`)
    .join(',\n');

  return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n${values};\n`;
}

async function main() {
  const players = await readJson('players.json', {});
  const battingSeasons = await readJson('battingSeasons.json', []);
  const pitchingSeasons = await readJson('pitchingSeasons.json', []);
  const fieldingSeasons = await readJson('fieldingSeasons.json', []);
  const playerAwards = await readJson('playerAwards.json', []);
  const careerStats = await readJson('careerStats.json', {});
  const eligibility = await readJson('eligibility.json', {});

  const schemaSql = await fs.readFile(schemaPath, 'utf8');

  const playerRows = Object.values(players).map((player) => ({
    id: player.id,
    name_en: player.name,
    name_ja: player.nameJapanese || null,
    bats: player.bats || null,
    throws: player.throws || null,
    birth_country: player.birthCountry || null,
    played_in_mlb: player.playedInMLB ? 1 : 0,
    hall_of_fame: player.hallOfFame ? 1 : 0,
    meikyukai: player.meikyukai ? 1 : 0,
    switch_hitter: player.switchHitter ? 1 : 0,
  }));

  const playerTeamRows = Object.values(players).flatMap((player) =>
    (player.teams ?? []).map((teamName) => ({
      player_id: player.id,
      team_name: teamName,
    })),
  );

  const playerPositionRows = Object.values(players).flatMap((player) =>
    (player.positions ?? []).map((positionName) => ({
      player_id: player.id,
      position_name: positionName,
    })),
  );

  const careerBattingRows = Object.entries(careerStats)
    .filter(([, stats]) => Object.keys(stats.batting ?? {}).length > 0)
    .map(([playerId, stats]) => ({
      player_id: playerId,
      hits: stats.batting?.hits ?? null,
      home_runs: stats.batting?.homeRuns ?? null,
      runs_batted_in: stats.batting?.runsBattedIn ?? null,
      runs: stats.batting?.runs ?? null,
      stolen_bases: stats.batting?.stolenBases ?? null,
      avg: stats.batting?.avg ?? null,
      obp: stats.batting?.obp ?? null,
      slg: stats.batting?.slg ?? null,
    }));

  const careerPitchingRows = Object.entries(careerStats)
    .filter(([, stats]) => Object.keys(stats.pitching ?? {}).length > 0)
    .map(([playerId, stats]) => ({
      player_id: playerId,
      wins: stats.pitching?.wins ?? null,
      strikeouts: stats.pitching?.strikeouts ?? null,
      saves: stats.pitching?.saves ?? null,
      holds: stats.pitching?.holds ?? null,
      innings_pitched: stats.pitching?.inningsPitched ?? null,
      complete_games: stats.pitching?.completeGames ?? null,
      shutouts: stats.pitching?.shutouts ?? null,
      games_pitched: stats.pitching?.gamesPitched ?? null,
      era: stats.pitching?.era ?? null,
    }));

  const eligibilityRows = Object.entries(eligibility).flatMap(([categoryId, playerIds]) =>
    playerIds.map((playerId) => ({
      category_id: categoryId,
      player_id: playerId,
    })),
  );

  const insertSql = [
    'BEGIN TRANSACTION;\n',
    insertStatement(
      'players',
      [
        'id',
        'name_en',
        'name_ja',
        'bats',
        'throws',
        'birth_country',
        'played_in_mlb',
        'hall_of_fame',
        'meikyukai',
        'switch_hitter',
      ],
      playerRows,
    ),
    insertStatement('player_teams', ['player_id', 'team_name'], playerTeamRows),
    insertStatement('player_positions', ['player_id', 'position_name'], playerPositionRows),
    insertStatement(
      'batting_seasons',
      [
        'player_id',
        'year',
        'team_name',
        'games',
        'avg',
        'obp',
        'slg',
        'hits',
        'home_runs',
        'runs_batted_in',
        'runs',
        'stolen_bases',
      ],
      battingSeasons.map((row) => ({
        player_id: row.playerId,
        year: row.year,
        team_name: row.team,
        games: row.games,
        avg: row.avg,
        obp: row.obp,
        slg: row.slg,
        hits: row.hits,
        home_runs: row.homeRuns,
        runs_batted_in: row.runsBattedIn,
        runs: row.runs,
        stolen_bases: row.stolenBases,
      })),
    ),
    insertStatement(
      'pitching_seasons',
      [
        'player_id',
        'year',
        'team_name',
        'wins',
        'losses',
        'era',
        'strikeouts',
        'saves',
        'holds',
        'innings_pitched',
        'complete_games',
        'shutouts',
        'no_hitter',
        'perfect_game',
      ],
      pitchingSeasons.map((row) => ({
        player_id: row.playerId,
        year: row.year,
        team_name: row.team,
        wins: row.wins,
        losses: row.losses,
        era: row.era,
        strikeouts: row.strikeouts,
        saves: row.saves,
        holds: row.holds,
        innings_pitched: row.inningsPitched,
        complete_games: row.completeGames,
        shutouts: row.shutouts,
        no_hitter: row.noHitter ? 1 : 0,
        perfect_game: row.perfectGame ? 1 : 0,
      })),
    ),
    insertStatement(
      'fielding_seasons',
      [
        'player_id',
        'year',
        'team_name',
        'position_name',
        'games',
        'innings',
        'putouts',
        'assists',
        'errors',
        'fielding_pct',
      ],
      fieldingSeasons.map((row) => ({
        player_id: row.playerId,
        year: row.year,
        team_name: row.team,
        position_name: row.position,
        games: row.games,
        innings: row.innings,
        putouts: row.putouts,
        assists: row.assists,
        errors: row.errors,
        fielding_pct: row.fieldingPct,
      })),
    ),
    insertStatement(
      'player_awards',
      ['player_id', 'award_name', 'year', 'team_name'],
      playerAwards.map((row) => ({
        player_id: row.playerId,
        award_name: row.award,
        year: row.year,
        team_name: row.team,
      })),
    ),
    insertStatement(
      'career_batting_stats',
      ['player_id', 'hits', 'home_runs', 'runs_batted_in', 'runs', 'stolen_bases', 'avg', 'obp', 'slg'],
      careerBattingRows,
    ),
    insertStatement(
      'career_pitching_stats',
      ['player_id', 'wins', 'strikeouts', 'saves', 'holds', 'innings_pitched', 'complete_games', 'shutouts', 'games_pitched', 'era'],
      careerPitchingRows,
    ),
    insertStatement('category_eligibility', ['category_id', 'player_id'], eligibilityRows),
    'COMMIT;\n',
  ].join('');

  const sqlPath = path.join(processedRoot, 'build-sqlite.sql');
  await fs.writeFile(sqlPath, `${schemaSql}\n${insertSql}`, 'utf8');

  await fs.rm(databasePath, { force: true });
  execFileSync('/usr/bin/sqlite3', [databasePath, `.read ${sqlPath}`], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  console.log(`Built SQLite database: ${databasePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
