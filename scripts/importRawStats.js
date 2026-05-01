import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureBaseDataDirs,
  getFirstValue,
  listCsvFiles,
  normalizeName,
  parseCsv,
  createStablePlayerId,
  normalizePosition,
  normalizeTeam,
  processedRoot,
  rawRoot,
  toNumber,
  writeJson,
} from './_shared.js';

// Place manually downloaded CSVs in:
// - data/raw/batting
// - data/raw/pitching
// - data/raw/fielding
// - data/raw/awards
// - data/raw/registry
// If the source headers differ, update the candidate column lists in this file.

const COLUMN_CANDIDATES = {
  name: ['name', 'player_name', 'playerName', 'name_en', 'english_name'],
  nameJapanese: ['name_japanese', 'nameJa', 'player_name_japanese', 'japanese_name'],
  playerId: ['player_id', 'playerId'],
  bats: ['bats', 'bat', 'bats_throws_bat'],
  throws: ['throws', 'throw', 'bats_throws_throw'],
  birthCountry: ['birth_country', 'country', 'birthCountry'],
  team: ['team', 'franchise', 'club'],
  position: ['position', 'primary_position', 'pos'],
  year: ['year', 'season', 'season_year'],
  games: ['g', 'games'],
  avg: ['avg', 'average', 'batting_average'],
  obp: ['obp', 'on_base_percentage'],
  slg: ['slg', 'slugging_percentage'],
  hits: ['h', 'hits'],
  homeRuns: ['hr', 'home_runs'],
  runsBattedIn: ['rbi', 'runs_batted_in'],
  runs: ['r', 'runs'],
  stolenBases: ['sb', 'stolen_bases'],
  wins: ['w', 'wins'],
  losses: ['l', 'losses'],
  era: ['era'],
  strikeouts: ['so', 'strikeouts', 'k'],
  saves: ['sv', 'saves'],
  holds: ['hld', 'holds'],
  inningsPitched: ['ip', 'innings_pitched'],
  completeGames: ['cg', 'complete_games'],
  shutouts: ['sho', 'shutouts'],
  noHitter: ['no_hitter', 'noHitter'],
  perfectGame: ['perfect_game', 'perfectGame'],
  innings: ['inn', 'innings'],
  putouts: ['po', 'putouts'],
  assists: ['a', 'assists'],
  errors: ['e', 'errors'],
  fieldingPct: ['fpct', 'fielding_pct', 'fielding_percentage'],
  award: ['award', 'award_name', 'title', 'honor'],
  playedInMLB: ['played_in_mlb', 'playedInMLB'],
  hallOfFame: ['hall_of_fame', 'hallOfFame'],
  meikyukai: ['meikyukai', 'meikyukai_member'],
};

const DATASET_RULES = {
  registry: {
    label: 'registry',
    required: ['name', 'team'],
    recommended: [
      'nameJapanese',
      'position',
      'bats',
      'throws',
      'birthCountry',
      'playedInMLB',
      'hallOfFame',
      'meikyukai',
    ],
  },
  batting: {
    label: 'batting',
    required: ['name', 'team', 'year'],
    recommended: [
      'nameJapanese',
      'games',
      'avg',
      'obp',
      'slg',
      'hits',
      'homeRuns',
      'runsBattedIn',
      'runs',
      'stolenBases',
    ],
  },
  pitching: {
    label: 'pitching',
    required: ['name', 'team', 'year'],
    recommended: [
      'nameJapanese',
      'wins',
      'losses',
      'era',
      'strikeouts',
      'saves',
      'holds',
      'inningsPitched',
    ],
  },
  fielding: {
    label: 'fielding',
    required: ['name', 'team', 'year', 'position'],
    recommended: ['nameJapanese', 'games', 'innings', 'putouts', 'assists', 'errors', 'fieldingPct'],
  },
  awards: {
    label: 'awards',
    required: ['name', 'award'],
    recommended: ['nameJapanese', 'team', 'year'],
  },
};

function hasCandidateHeader(headers, logicalField) {
  return (COLUMN_CANDIDATES[logicalField] ?? []).some((candidate) => headers.includes(candidate));
}

function formatLogicalField(logicalField) {
  return `${logicalField} (${(COLUMN_CANDIDATES[logicalField] ?? []).join(', ')})`;
}

function reportHeaderCoverage(datasetLabel, fileName, headers, logicalFields, level) {
  const missing = logicalFields.filter((field) => !hasCandidateHeader(headers, field));

  if (missing.length === 0) {
    return [];
  }

  const message =
    `${level.toUpperCase()}: ${datasetLabel}/${fileName} is missing ` +
    `${level === 'error' ? 'required' : 'recommended'} columns: ` +
    missing.map(formatLogicalField).join(', ');

  if (level === 'error') {
    return [message];
  }

  console.warn(message);
  return [];
}

async function readCsvDataset(directory, rules) {
  const files = (await listCsvFiles(directory)).filter(
    (file) => !path.basename(file).endsWith('-template.csv'),
  );

  if (files.length === 0) {
    console.warn(`WARN: No CSV files found in data/raw/${rules.label}`);
    return {
      rows: [],
      files: [],
      rowCount: 0,
    };
  }

  const errors = [];
  const rows = [];

  for (const file of files) {
    const text = await fs.readFile(file, 'utf8');
    const parsedRows = parseCsv(text);
    const headers = parsedRows[0] ? Object.keys(parsedRows[0]) : [];
    const fileName = path.basename(file);

    if (headers.length === 0) {
      console.warn(`WARN: ${rules.label}/${fileName} is empty or has no readable header row`);
      continue;
    }

    errors.push(...reportHeaderCoverage(rules.label, fileName, headers, rules.required, 'error'));
    reportHeaderCoverage(rules.label, fileName, headers, rules.recommended, 'warn');

    parsedRows.forEach((row) => {
      rows.push({ ...row, __sourceFile: fileName });
    });
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return {
    rows,
    files,
    rowCount: rows.length,
  };
}

function logImportSummary(summary) {
  console.log('Import summary:');
  Object.entries(summary).forEach(([label, value]) => {
    console.log(
      `- ${label}: ${value.rows} rows from ${value.files} file${value.files === 1 ? '' : 's'}`,
    );
  });
}

function createPlayerRecord(nameEn, nameJa) {
  return {
    id: createStablePlayerId(nameEn, nameJa),
    name: normalizeName(nameEn),
    nameJapanese: normalizeName(nameJa),
    bats: '',
    throws: '',
    birthCountry: '',
    teams: [],
    positions: [],
    playedInMLB: false,
    hallOfFame: false,
    meikyukai: false,
    switchHitter: false,
  };
}

function mergeUnique(values, nextValue) {
  if (!nextValue) {
    return values;
  }

  return values.includes(nextValue) ? values : [...values, nextValue];
}

function getOrCreatePlayer(players, row) {
  const nameEn = getFirstValue(row, COLUMN_CANDIDATES.name);
  const nameJa = getFirstValue(row, COLUMN_CANDIDATES.nameJapanese);
  const stableId = getFirstValue(row, COLUMN_CANDIDATES.playerId) || createStablePlayerId(nameEn, nameJa);

  if (!players[stableId]) {
    players[stableId] = {
      ...createPlayerRecord(nameEn, nameJa),
      id: stableId,
    };
  }

  return players[stableId];
}

function attachPlayerBasics(player, row) {
  const bats = getFirstValue(row, COLUMN_CANDIDATES.bats);
  const throws = getFirstValue(row, COLUMN_CANDIDATES.throws);
  const birthCountry = getFirstValue(row, COLUMN_CANDIDATES.birthCountry);
  const team = normalizeTeam(getFirstValue(row, COLUMN_CANDIDATES.team));
  const position = normalizePosition(getFirstValue(row, COLUMN_CANDIDATES.position));

  if (!player.name) {
    player.name = normalizeName(getFirstValue(row, COLUMN_CANDIDATES.name));
  }

  if (!player.nameJapanese) {
    player.nameJapanese = normalizeName(getFirstValue(row, COLUMN_CANDIDATES.nameJapanese));
  }

  player.bats = player.bats || bats;
  player.throws = player.throws || throws;
  player.birthCountry = player.birthCountry || birthCountry;
  player.teams = mergeUnique(player.teams, team);
  player.positions = mergeUnique(player.positions, position);
  player.switchHitter = player.switchHitter || bats === 'S';
}

function mapAwardRows(players, rows) {
  return rows.flatMap((row) => {
    const player = getOrCreatePlayer(players, row);
    attachPlayerBasics(player, row);

    const award = getFirstValue(row, COLUMN_CANDIDATES.award);
    const year = toNumber(getFirstValue(row, COLUMN_CANDIDATES.year));
    const team = normalizeTeam(getFirstValue(row, COLUMN_CANDIDATES.team));

    return award
      ? [
          {
            playerId: player.id,
            award,
            year,
            team,
          },
        ]
      : [];
  });
}

function mapBattingRows(players, rows) {
  return rows.map((row) => {
    const player = getOrCreatePlayer(players, row);
    attachPlayerBasics(player, row);

    return {
      playerId: player.id,
      year: toNumber(getFirstValue(row, COLUMN_CANDIDATES.year)),
      team: normalizeTeam(getFirstValue(row, COLUMN_CANDIDATES.team)),
      games: toNumber(getFirstValue(row, COLUMN_CANDIDATES.games)),
      avg: toNumber(getFirstValue(row, COLUMN_CANDIDATES.avg)),
      obp: toNumber(getFirstValue(row, COLUMN_CANDIDATES.obp)),
      slg: toNumber(getFirstValue(row, COLUMN_CANDIDATES.slg)),
      hits: toNumber(getFirstValue(row, COLUMN_CANDIDATES.hits)),
      homeRuns: toNumber(getFirstValue(row, COLUMN_CANDIDATES.homeRuns)),
      runsBattedIn: toNumber(getFirstValue(row, COLUMN_CANDIDATES.runsBattedIn)),
      runs: toNumber(getFirstValue(row, COLUMN_CANDIDATES.runs)),
      stolenBases: toNumber(getFirstValue(row, COLUMN_CANDIDATES.stolenBases)),
    };
  });
}

function mapPitchingRows(players, rows) {
  return rows.map((row) => {
    const player = getOrCreatePlayer(players, row);
    attachPlayerBasics(player, row);

    return {
      playerId: player.id,
      year: toNumber(getFirstValue(row, COLUMN_CANDIDATES.year)),
      team: normalizeTeam(getFirstValue(row, COLUMN_CANDIDATES.team)),
      wins: toNumber(getFirstValue(row, COLUMN_CANDIDATES.wins)),
      losses: toNumber(getFirstValue(row, COLUMN_CANDIDATES.losses)),
      era: toNumber(getFirstValue(row, COLUMN_CANDIDATES.era)),
      strikeouts: toNumber(getFirstValue(row, COLUMN_CANDIDATES.strikeouts)),
      saves: toNumber(getFirstValue(row, COLUMN_CANDIDATES.saves)),
      holds: toNumber(getFirstValue(row, COLUMN_CANDIDATES.holds)),
      inningsPitched: toNumber(getFirstValue(row, COLUMN_CANDIDATES.inningsPitched)),
      completeGames: toNumber(getFirstValue(row, COLUMN_CANDIDATES.completeGames)),
      shutouts: toNumber(getFirstValue(row, COLUMN_CANDIDATES.shutouts)),
      noHitter: getFirstValue(row, COLUMN_CANDIDATES.noHitter) === '1',
      perfectGame: getFirstValue(row, COLUMN_CANDIDATES.perfectGame) === '1',
    };
  });
}

function mapFieldingRows(players, rows) {
  return rows.map((row) => {
    const player = getOrCreatePlayer(players, row);
    attachPlayerBasics(player, row);

    return {
      playerId: player.id,
      year: toNumber(getFirstValue(row, COLUMN_CANDIDATES.year)),
      team: normalizeTeam(getFirstValue(row, COLUMN_CANDIDATES.team)),
      position: normalizePosition(getFirstValue(row, COLUMN_CANDIDATES.position)),
      games: toNumber(getFirstValue(row, COLUMN_CANDIDATES.games)),
      innings: toNumber(getFirstValue(row, COLUMN_CANDIDATES.innings)),
      putouts: toNumber(getFirstValue(row, COLUMN_CANDIDATES.putouts)),
      assists: toNumber(getFirstValue(row, COLUMN_CANDIDATES.assists)),
      errors: toNumber(getFirstValue(row, COLUMN_CANDIDATES.errors)),
      fieldingPct: toNumber(getFirstValue(row, COLUMN_CANDIDATES.fieldingPct)),
    };
  });
}

async function main() {
  await ensureBaseDataDirs();

  const players = {};
  const registryInput = await readCsvDataset(path.join(rawRoot, 'registry'), DATASET_RULES.registry);
  const battingInput = await readCsvDataset(path.join(rawRoot, 'batting'), DATASET_RULES.batting);
  const pitchingInput = await readCsvDataset(path.join(rawRoot, 'pitching'), DATASET_RULES.pitching);
  const fieldingInput = await readCsvDataset(path.join(rawRoot, 'fielding'), DATASET_RULES.fielding);
  const awardInput = await readCsvDataset(path.join(rawRoot, 'awards'), DATASET_RULES.awards);

  if (registryInput.rows.length === 0) {
    console.warn('WARN: No registry rows imported. players.json will rely on other datasets only.');
  }

  if (battingInput.rows.length === 0) {
    console.warn('WARN: No batting rows imported. battingSeasons.json and many batting categories will be empty.');
  }

  registryInput.rows.forEach((row) => {
    const player = getOrCreatePlayer(players, row);
    attachPlayerBasics(player, row);

    player.playedInMLB =
      player.playedInMLB || getFirstValue(row, COLUMN_CANDIDATES.playedInMLB) === '1';
    player.hallOfFame =
      player.hallOfFame || getFirstValue(row, COLUMN_CANDIDATES.hallOfFame) === '1';
    player.meikyukai =
      player.meikyukai || getFirstValue(row, COLUMN_CANDIDATES.meikyukai) === '1';
  });

  const battingSeasons = mapBattingRows(players, battingInput.rows);
  const pitchingSeasons = mapPitchingRows(players, pitchingInput.rows);
  const fieldingSeasons = mapFieldingRows(players, fieldingInput.rows);
  const playerAwards = mapAwardRows(players, awardInput.rows);

  await writeJson(path.join(processedRoot, 'players.json'), players);
  await writeJson(path.join(processedRoot, 'battingSeasons.json'), battingSeasons);
  await writeJson(path.join(processedRoot, 'pitchingSeasons.json'), pitchingSeasons);
  await writeJson(path.join(processedRoot, 'fieldingSeasons.json'), fieldingSeasons);
  await writeJson(path.join(processedRoot, 'playerAwards.json'), playerAwards);

  logImportSummary({
    registry: { files: registryInput.files.length, rows: registryInput.rowCount },
    batting: { files: battingInput.files.length, rows: battingInput.rowCount },
    pitching: { files: pitchingInput.files.length, rows: pitchingInput.rowCount },
    fielding: { files: fieldingInput.files.length, rows: fieldingInput.rowCount },
    awards: { files: awardInput.files.length, rows: awardInput.rowCount },
    players: { files: 1, rows: Object.keys(players).length },
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
