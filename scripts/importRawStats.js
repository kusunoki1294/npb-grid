import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ensureBaseDataDirs,
  getFirstValue,
  hashString,
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
  name: [
    'name',
    'player_name',
    'name_en',
    'english_name',
    'full_name',
    'player',
    'batter_name',
    'pitcher_name',
    'fielder_name',
  ],
  nameJapanese: [
    'name_japanese',
    'name_ja',
    'player_name_japanese',
    'japanese_name',
    'full_name_japanese',
  ],
  playerId: [
    'player_id',
    'playerid',
    'bbref_id',
    'bref_id',
    'register_id',
    'npb_id',
    'retro_id',
    'statiz_id',
    'fangraphs_id',
    'mlbid',
    'mlb_id',
    'sportsnav_id',
    'id',
  ],
  bats: ['bats', 'bat', 'bats_throws_bat', 'bat_side'],
  throws: ['throws', 'throw', 'bats_throws_throw', 'throw_side'],
  birthCountry: ['birth_country', 'country', 'birthcountry', 'born_country', 'nationality'],
  team: [
    'team',
    'franchise',
    'club',
    'tm',
    'team_name',
    'franchise_name',
    'organization',
    'current_last_team',
    'currentlast_team',
  ],
  position: ['position', 'primary_position', 'pos', 'fielding_position', 'most_common_positions'],
  year: ['year', 'season', 'season_year', 'year_id', 'season_id'],
  gameType: ['game_type', 'gametype'],
  games: ['g', 'games', 'games_played'],
  avg: ['avg', 'average', 'batting_average', 'ba'],
  obp: ['obp', 'on_base_percentage', 'onbase_percentage'],
  slg: ['slg', 'slugging_percentage'],
  hits: ['h', 'hits'],
  homeRuns: ['hr', 'home_runs', 'homeruns'],
  runsBattedIn: ['rbi', 'runs_batted_in', 'runs_battedin'],
  runs: ['r', 'runs', 'runs_scored'],
  stolenBases: ['sb', 'stolen_bases', 'stolenbases'],
  wins: ['w', 'wins'],
  losses: ['l', 'losses'],
  era: ['era', 'earned_run_average'],
  strikeouts: ['so', 'strikeouts', 'k', 'strike_outs'],
  saves: ['sv', 'saves'],
  holds: ['hld', 'holds', 'hold'],
  inningsPitched: ['ip', 'innings_pitched', 'inningspitch'],
  completeGames: ['cg', 'complete_games', 'completegames'],
  shutouts: ['sho', 'shutouts', 'shutout'],
  noHitter: ['no_hitter', 'no_hitters', 'nohitter'],
  perfectGame: ['perfect_game', 'perfect_games', 'perfectgame'],
  innings: ['inn', 'innings', 'innings_fielded'],
  putouts: ['po', 'putouts', 'put_outs'],
  assists: ['a', 'assists'],
  errors: ['e', 'errors'],
  fieldingPct: ['fpct', 'fielding_pct', 'fielding_percentage'],
  award: ['award', 'award_name', 'title', 'honor', 'award_title'],
  playedInMLB: ['played_in_mlb', 'playedinmlb', 'mlb_experience', 'played_mlb'],
  hallOfFame: ['hall_of_fame', 'halloffame', 'hof'],
  meikyukai: ['meikyukai', 'meikyukai_member', 'meikyukai_flag'],
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

function buildHeaderCoverage(headers, logicalFields) {
  return {
    present: logicalFields.filter((field) => hasCandidateHeader(headers, field)),
    missing: logicalFields.filter((field) => !hasCandidateHeader(headers, field)),
  };
}

async function readCsvDataset(directory, rules) {
  const discoveredFiles = (await listCsvFiles(directory)).filter(
    (file) => !path.basename(file).endsWith('-template.csv'),
  );
  const realFiles = discoveredFiles.filter((file) => !path.basename(file).startsWith('sample-'));
  const files = realFiles.length > 0 ? realFiles : discoveredFiles;

  if (files.length === 0) {
    console.warn(`WARN: No CSV files found in data/raw/${rules.label}`);
    return {
      rows: [],
      files: [],
      rowCount: 0,
      skippedRows: [],
      fileReports: [],
    };
  }

  const errors = [];
  const rows = [];
  const skippedRows = [];
  const fileReports = [];

  for (const file of files) {
    const text = await fs.readFile(file, 'utf8');
    const parsedRows = parseCsv(text);
    const headers = parsedRows[0] ? Object.keys(parsedRows[0]) : [];
    const fileName = path.basename(file);

    if (headers.length === 0) {
      console.warn(`WARN: ${rules.label}/${fileName} is empty or has no readable header row`);
      fileReports.push({
        file: fileName,
        rowCount: 0,
        importedRows: 0,
        skippedRowCount: 0,
        headers: [],
        required: { present: [], missing: rules.required },
        recommended: { present: [], missing: rules.recommended },
      });
      continue;
    }

    errors.push(...reportHeaderCoverage(rules.label, fileName, headers, rules.required, 'error'));
    reportHeaderCoverage(rules.label, fileName, headers, rules.recommended, 'warn');

    const headerCoverage = {
      required: buildHeaderCoverage(headers, rules.required),
      recommended: buildHeaderCoverage(headers, rules.recommended),
    };
    let skippedRowCount = 0;

    parsedRows.forEach((row, index) => {
      const missingRequiredFields = rules.required.filter(
        (field) => !getFirstValue(row, COLUMN_CANDIDATES[field]),
      );

      if (missingRequiredFields.length > 0) {
        skippedRowCount += 1;
        skippedRows.push({
          file: fileName,
          rowNumber: index + 2,
          missingRequiredFields,
        });
        return;
      }

      rows.push({ ...row, __sourceFile: fileName, __rowNumber: index + 2 });
    });

    fileReports.push({
      file: fileName,
      rowCount: parsedRows.length,
      importedRows: parsedRows.length - skippedRowCount,
      skippedRowCount,
      headers,
      ...headerCoverage,
    });
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return {
    rows,
    files,
    rowCount: rows.length,
    skippedRows,
    fileReports,
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

function stripHtml(value) {
  return String(value ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim();
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function cleanSourceValue(value) {
  return normalizeName(decodeHtmlEntities(stripHtml(value)));
}

function createNameIdentityKey(nameEn, nameJa) {
  const english = normalizeName(nameEn ?? '').toLowerCase();
  const japanese = normalizeName(nameJa ?? '').toLowerCase();
  return `${english}::${japanese}`;
}

function createCollisionSafeId(baseId, nameEn, nameJa) {
  const seed = normalizeName(nameJa || nameEn || baseId);
  return `${baseId}-${hashString(seed).slice(0, 6)}`;
}

function getOrCreatePlayer(players, row, identityState) {
  const nameEn = cleanSourceValue(getFirstValue(row, COLUMN_CANDIDATES.name));
  const nameJa = cleanSourceValue(getFirstValue(row, COLUMN_CANDIDATES.nameJapanese));
  const explicitId = cleanSourceValue(getFirstValue(row, COLUMN_CANDIDATES.playerId));
  const nameKey = createNameIdentityKey(nameEn, nameJa);

  if (explicitId && identityState.bySourceId[explicitId]) {
    return players[identityState.bySourceId[explicitId]];
  }

  if (nameKey !== '::' && identityState.byNameKey[nameKey]) {
    const existingId = identityState.byNameKey[nameKey];
    if (explicitId) {
      identityState.bySourceId[explicitId] = existingId;
    }
    return players[existingId];
  }

  const baseId = explicitId || createStablePlayerId(nameEn, nameJa);
  let stableId = baseId;
  const existingPlayer = players[stableId];

  if (existingPlayer) {
    const existingNameKey = createNameIdentityKey(existingPlayer.name, existingPlayer.nameJapanese);

    if (existingNameKey !== nameKey) {
      stableId = createCollisionSafeId(baseId, nameEn, nameJa);

      let suffix = 2;
      while (players[stableId]) {
        stableId = `${createCollisionSafeId(baseId, nameEn, nameJa)}-${suffix}`;
        suffix += 1;
      }

      identityState.collisions.push({
        baseId,
        resolvedId: stableId,
        sourceFile: row.__sourceFile ?? '',
        rowNumber: row.__rowNumber ?? null,
        existingPlayerName: existingPlayer.name,
        existingPlayerNameJapanese: existingPlayer.nameJapanese,
        incomingPlayerName: normalizeName(nameEn),
        incomingPlayerNameJapanese: normalizeName(nameJa),
      });
    }
  }

  if (!players[stableId]) {
    players[stableId] = {
      ...createPlayerRecord(nameEn, nameJa),
      id: stableId,
    };
  }

  if (explicitId) {
    identityState.bySourceId[explicitId] = stableId;
  }
  if (nameKey !== '::') {
    identityState.byNameKey[nameKey] = stableId;
  }

  return players[stableId];
}

function parseBoolean(value) {
  const normalized = normalizeName(String(value ?? '')).toLowerCase();

  if (!normalized) {
    return false;
  }

  return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
}

function toSeasonYear(value) {
  const direct = toNumber(value);

  if (Number.isInteger(direct)) {
    return direct;
  }

  const normalized = String(value ?? '').trim();
  const yearMatch = normalized.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? Number(yearMatch[0]) : null;
}

function normalizeBatThrowSide(value) {
  const normalized = cleanSourceValue(value).toLowerCase();

  if (!normalized) {
    return '';
  }

  if (normalized === 'both' || normalized === 'switch') {
    return 'S';
  }

  if (normalized === 'left' || normalized === 'l') {
    return 'L';
  }

  if (normalized === 'right' || normalized === 'r') {
    return 'R';
  }

  return normalized.toUpperCase();
}

function getNormalizedTeam(row) {
  return normalizeTeam(cleanSourceValue(getFirstValue(row, COLUMN_CANDIDATES.team)));
}

function getNormalizedPositionValue(row) {
  return cleanSourceValue(getFirstValue(row, COLUMN_CANDIDATES.position));
}

function splitPositions(value) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((part) => normalizePosition(cleanSourceValue(part)))
    .filter(Boolean);
}

function isImportableSeasonRow(row) {
  const gameType = cleanSourceValue(getFirstValue(row, COLUMN_CANDIDATES.gameType)).toLowerCase();

  if (!gameType) {
    return true;
  }

  return gameType === 'regular season';
}

function attachPlayerBasics(player, row) {
  const bats = normalizeBatThrowSide(getFirstValue(row, COLUMN_CANDIDATES.bats));
  const throws = normalizeBatThrowSide(getFirstValue(row, COLUMN_CANDIDATES.throws));
  const birthCountry = cleanSourceValue(getFirstValue(row, COLUMN_CANDIDATES.birthCountry));
  const team = getNormalizedTeam(row);
  const positions = splitPositions(getNormalizedPositionValue(row));

  if (!player.name) {
    player.name = cleanSourceValue(getFirstValue(row, COLUMN_CANDIDATES.name));
  }

  if (!player.nameJapanese) {
    player.nameJapanese = cleanSourceValue(getFirstValue(row, COLUMN_CANDIDATES.nameJapanese));
  }

  player.bats = player.bats || bats;
  player.throws = player.throws || throws;
  player.birthCountry = player.birthCountry || birthCountry;
  player.teams = mergeUnique(player.teams, team);
  positions.forEach((position) => {
    player.positions = mergeUnique(player.positions, position);
  });
  player.switchHitter = player.switchHitter || bats === 'S';
}

function mapAwardRows(players, rows, identityState) {
  return rows.flatMap((row) => {
    const player = getOrCreatePlayer(players, row, identityState);
    attachPlayerBasics(player, row);

    const award = cleanSourceValue(getFirstValue(row, COLUMN_CANDIDATES.award));
    const year = toSeasonYear(getFirstValue(row, COLUMN_CANDIDATES.year));
    const team = getNormalizedTeam(row);

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

function mapBattingRows(players, rows, identityState) {
  return rows.filter(isImportableSeasonRow).map((row) => {
    const player = getOrCreatePlayer(players, row, identityState);
    attachPlayerBasics(player, row);

    return {
      playerId: player.id,
      year: toSeasonYear(getFirstValue(row, COLUMN_CANDIDATES.year)),
      team: getNormalizedTeam(row),
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

function mapPitchingRows(players, rows, identityState) {
  return rows.filter(isImportableSeasonRow).map((row) => {
    const player = getOrCreatePlayer(players, row, identityState);
    attachPlayerBasics(player, row);

    return {
      playerId: player.id,
      year: toSeasonYear(getFirstValue(row, COLUMN_CANDIDATES.year)),
      team: getNormalizedTeam(row),
      wins: toNumber(getFirstValue(row, COLUMN_CANDIDATES.wins)),
      losses: toNumber(getFirstValue(row, COLUMN_CANDIDATES.losses)),
      era: toNumber(getFirstValue(row, COLUMN_CANDIDATES.era)),
      strikeouts: toNumber(getFirstValue(row, COLUMN_CANDIDATES.strikeouts)),
      saves: toNumber(getFirstValue(row, COLUMN_CANDIDATES.saves)),
      holds: toNumber(getFirstValue(row, COLUMN_CANDIDATES.holds)),
      inningsPitched: toNumber(getFirstValue(row, COLUMN_CANDIDATES.inningsPitched)),
      completeGames: toNumber(getFirstValue(row, COLUMN_CANDIDATES.completeGames)),
      shutouts: toNumber(getFirstValue(row, COLUMN_CANDIDATES.shutouts)),
      noHitter: parseBoolean(getFirstValue(row, COLUMN_CANDIDATES.noHitter)),
      perfectGame: parseBoolean(getFirstValue(row, COLUMN_CANDIDATES.perfectGame)),
    };
  });
}

function mapFieldingRows(players, rows, identityState) {
  return rows.filter(isImportableSeasonRow).map((row) => {
    const player = getOrCreatePlayer(players, row, identityState);
    attachPlayerBasics(player, row);

    return {
      playerId: player.id,
      year: toSeasonYear(getFirstValue(row, COLUMN_CANDIDATES.year)),
      team: getNormalizedTeam(row),
      position: normalizePosition(cleanSourceValue(getFirstValue(row, COLUMN_CANDIDATES.position))),
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
  const identityState = {
    bySourceId: {},
    byNameKey: {},
    collisions: [],
  };
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
    const player = getOrCreatePlayer(players, row, identityState);
    attachPlayerBasics(player, row);

    player.playedInMLB =
      player.playedInMLB || parseBoolean(getFirstValue(row, COLUMN_CANDIDATES.playedInMLB));
    player.hallOfFame =
      player.hallOfFame || parseBoolean(getFirstValue(row, COLUMN_CANDIDATES.hallOfFame));
    player.meikyukai =
      player.meikyukai || parseBoolean(getFirstValue(row, COLUMN_CANDIDATES.meikyukai));
  });

  const battingSeasons = mapBattingRows(players, battingInput.rows, identityState);
  const pitchingSeasons = mapPitchingRows(players, pitchingInput.rows, identityState);
  const fieldingSeasons = mapFieldingRows(players, fieldingInput.rows, identityState);
  const playerAwards = mapAwardRows(players, awardInput.rows, identityState);

  await writeJson(path.join(processedRoot, 'players.json'), players);
  await writeJson(path.join(processedRoot, 'battingSeasons.json'), battingSeasons);
  await writeJson(path.join(processedRoot, 'pitchingSeasons.json'), pitchingSeasons);
  await writeJson(path.join(processedRoot, 'fieldingSeasons.json'), fieldingSeasons);
  await writeJson(path.join(processedRoot, 'playerAwards.json'), playerAwards);
  await writeJson(path.join(processedRoot, 'importDiagnostics.json'), {
    generatedAt: new Date().toISOString(),
    rowCounts: {
      registry: registryInput.rowCount,
      batting: battingInput.rowCount,
      pitching: pitchingInput.rowCount,
      fielding: fieldingInput.rowCount,
      awards: awardInput.rowCount,
      players: Object.keys(players).length,
    },
    skippedRows: {
      registry: registryInput.skippedRows,
      batting: battingInput.skippedRows,
      pitching: pitchingInput.skippedRows,
      fielding: fieldingInput.skippedRows,
      awards: awardInput.skippedRows,
    },
    files: {
      registry: registryInput.fileReports,
      batting: battingInput.fileReports,
      pitching: pitchingInput.fileReports,
      fielding: fieldingInput.fileReports,
      awards: awardInput.fileReports,
    },
    identityCollisions: identityState.collisions,
  });

  logImportSummary({
    registry: { files: registryInput.files.length, rows: registryInput.rowCount },
    batting: { files: battingInput.files.length, rows: battingInput.rowCount },
    pitching: { files: pitchingInput.files.length, rows: pitchingInput.rowCount },
    fielding: { files: fieldingInput.files.length, rows: fieldingInput.rowCount },
    awards: { files: awardInput.files.length, rows: awardInput.rowCount },
    players: { files: 1, rows: Object.keys(players).length },
  });

  const skippedRowCount =
    registryInput.skippedRows.length +
    battingInput.skippedRows.length +
    pitchingInput.skippedRows.length +
    fieldingInput.skippedRows.length +
    awardInput.skippedRows.length;

  if (skippedRowCount > 0) {
    console.warn(`WARN: Skipped ${skippedRowCount} rows with missing required values. See data/processed/importDiagnostics.json`);
  }

  if (identityState.collisions.length > 0) {
    console.warn(`WARN: Resolved ${identityState.collisions.length} player ID collisions. See data/processed/importDiagnostics.json`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
