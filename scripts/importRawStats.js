import path from 'node:path';
import {
  ensureBaseDataDirs,
  getFirstValue,
  normalizeName,
  createStablePlayerId,
  normalizePosition,
  normalizeTeam,
  processedRoot,
  rawRoot,
  readCsvDirectory,
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
  const nameEn = getFirstValue(row, ['name', 'player_name', 'playerName', 'name_en', 'english_name']);
  const nameJa = getFirstValue(row, ['name_japanese', 'nameJa', 'player_name_japanese', 'japanese_name']);
  const stableId = getFirstValue(row, ['player_id', 'playerId']) || createStablePlayerId(nameEn, nameJa);

  if (!players[stableId]) {
    players[stableId] = {
      ...createPlayerRecord(nameEn, nameJa),
      id: stableId,
    };
  }

  return players[stableId];
}

function attachPlayerBasics(player, row) {
  const bats = getFirstValue(row, ['bats', 'bat', 'bats_throws_bat']);
  const throws = getFirstValue(row, ['throws', 'throw', 'bats_throws_throw']);
  const birthCountry = getFirstValue(row, ['birth_country', 'country', 'birthCountry']);
  const team = normalizeTeam(getFirstValue(row, ['team', 'franchise', 'club']));
  const position = normalizePosition(getFirstValue(row, ['position', 'primary_position', 'pos']));

  if (!player.name) {
    player.name = normalizeName(
      getFirstValue(row, ['name', 'player_name', 'playerName', 'name_en', 'english_name']),
    );
  }

  if (!player.nameJapanese) {
    player.nameJapanese = normalizeName(
      getFirstValue(row, ['name_japanese', 'nameJa', 'player_name_japanese', 'japanese_name']),
    );
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

    const award = getFirstValue(row, ['award', 'award_name', 'title', 'honor']);
    const year = toNumber(getFirstValue(row, ['year', 'season', 'season_year']));
    const team = normalizeTeam(getFirstValue(row, ['team', 'franchise', 'club']));

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
      year: toNumber(getFirstValue(row, ['year', 'season', 'season_year'])),
      team: normalizeTeam(getFirstValue(row, ['team', 'franchise', 'club'])),
      games: toNumber(getFirstValue(row, ['g', 'games'])),
      avg: toNumber(getFirstValue(row, ['avg', 'average', 'batting_average'])),
      obp: toNumber(getFirstValue(row, ['obp', 'on_base_percentage'])),
      slg: toNumber(getFirstValue(row, ['slg', 'slugging_percentage'])),
      hits: toNumber(getFirstValue(row, ['h', 'hits'])),
      homeRuns: toNumber(getFirstValue(row, ['hr', 'home_runs'])),
      runsBattedIn: toNumber(getFirstValue(row, ['rbi', 'runs_batted_in'])),
      runs: toNumber(getFirstValue(row, ['r', 'runs'])),
      stolenBases: toNumber(getFirstValue(row, ['sb', 'stolen_bases'])),
    };
  });
}

function mapPitchingRows(players, rows) {
  return rows.map((row) => {
    const player = getOrCreatePlayer(players, row);
    attachPlayerBasics(player, row);

    return {
      playerId: player.id,
      year: toNumber(getFirstValue(row, ['year', 'season', 'season_year'])),
      team: normalizeTeam(getFirstValue(row, ['team', 'franchise', 'club'])),
      wins: toNumber(getFirstValue(row, ['w', 'wins'])),
      losses: toNumber(getFirstValue(row, ['l', 'losses'])),
      era: toNumber(getFirstValue(row, ['era'])),
      strikeouts: toNumber(getFirstValue(row, ['so', 'strikeouts', 'k'])),
      saves: toNumber(getFirstValue(row, ['sv', 'saves'])),
      holds: toNumber(getFirstValue(row, ['hld', 'holds'])),
      inningsPitched: toNumber(getFirstValue(row, ['ip', 'innings_pitched'])),
      completeGames: toNumber(getFirstValue(row, ['cg', 'complete_games'])),
      shutouts: toNumber(getFirstValue(row, ['sho', 'shutouts'])),
      noHitter: getFirstValue(row, ['no_hitter', 'noHitter']) === '1',
      perfectGame: getFirstValue(row, ['perfect_game', 'perfectGame']) === '1',
    };
  });
}

function mapFieldingRows(players, rows) {
  return rows.map((row) => {
    const player = getOrCreatePlayer(players, row);
    attachPlayerBasics(player, row);

    return {
      playerId: player.id,
      year: toNumber(getFirstValue(row, ['year', 'season', 'season_year'])),
      team: normalizeTeam(getFirstValue(row, ['team', 'franchise', 'club'])),
      position: normalizePosition(getFirstValue(row, ['position', 'primary_position', 'pos'])),
      games: toNumber(getFirstValue(row, ['g', 'games'])),
      innings: toNumber(getFirstValue(row, ['inn', 'innings'])),
      putouts: toNumber(getFirstValue(row, ['po', 'putouts'])),
      assists: toNumber(getFirstValue(row, ['a', 'assists'])),
      errors: toNumber(getFirstValue(row, ['e', 'errors'])),
      fieldingPct: toNumber(getFirstValue(row, ['fpct', 'fielding_pct', 'fielding_percentage'])),
    };
  });
}

async function main() {
  await ensureBaseDataDirs();

  const players = {};
  const registryRows = await readCsvDirectory(path.join(rawRoot, 'registry'));
  const battingRows = await readCsvDirectory(path.join(rawRoot, 'batting'));
  const pitchingRows = await readCsvDirectory(path.join(rawRoot, 'pitching'));
  const fieldingRows = await readCsvDirectory(path.join(rawRoot, 'fielding'));
  const awardRows = await readCsvDirectory(path.join(rawRoot, 'awards'));

  registryRows.forEach((row) => {
    const player = getOrCreatePlayer(players, row);
    attachPlayerBasics(player, row);

    player.playedInMLB =
      player.playedInMLB || getFirstValue(row, ['played_in_mlb', 'playedInMLB']) === '1';
    player.hallOfFame =
      player.hallOfFame || getFirstValue(row, ['hall_of_fame', 'hallOfFame']) === '1';
    player.meikyukai =
      player.meikyukai || getFirstValue(row, ['meikyukai', 'meikyukai_member']) === '1';
  });

  const battingSeasons = mapBattingRows(players, battingRows);
  const pitchingSeasons = mapPitchingRows(players, pitchingRows);
  const fieldingSeasons = mapFieldingRows(players, fieldingRows);
  const playerAwards = mapAwardRows(players, awardRows);

  await writeJson(path.join(processedRoot, 'players.json'), players);
  await writeJson(path.join(processedRoot, 'battingSeasons.json'), battingSeasons);
  await writeJson(path.join(processedRoot, 'pitchingSeasons.json'), pitchingSeasons);
  await writeJson(path.join(processedRoot, 'fieldingSeasons.json'), fieldingSeasons);
  await writeJson(path.join(processedRoot, 'playerAwards.json'), playerAwards);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
