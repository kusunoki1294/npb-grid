import fs from 'node:fs/promises';
import path from 'node:path';
import { processedRoot, rawRoot, writeJson } from './_shared.js';

const RAW_AWARDS_FILENAME = 'npb-awards-historical.json';

const TEAM_ALIAS_RULES = [
  { aliases: ['読売', '巨人', '東京巨人'], from: 1936, to: 1948, team: 'Tokyo Kyojin' },
  { aliases: ['読売', '巨人', '東京巨人'], from: 1949, team: 'Yomiuri Giants' },
  { aliases: ['阪神', 'タイガース'], from: 1936, to: 1943, team: 'Osaka Tigers' },
  { aliases: ['阪神', 'タイガース'], from: 1944, to: 1944, team: 'Hanshin Club' },
  { aliases: ['阪神', 'タイガース'], from: 1946, to: 1960, team: 'Osaka Tigers' },
  { aliases: ['阪神', 'タイガース', '阪神タイガース'], from: 1961, team: 'Hanshin Tigers' },
  { aliases: ['広島', '広島東洋'], team: 'Hiroshima Toyo Carp' },
  { aliases: ['横浜DeNA'], from: 2012, to: 2012, team: 'Yokohama DeNA Baystars' },
  { aliases: ['横浜DeNA', 'DeNA', 'ＤｅＮＡ', '横浜'], from: 2012, team: 'Yokohama DeNA BayStars' },
  { aliases: ['横浜', '横浜ベイスターズ'], from: 1993, to: 2011, team: 'Yokohama DeNA BayStars' },
  { aliases: ['横浜', '大洋'], from: 1978, to: 1992, team: 'Yokohama Taiyo Whales' },
  { aliases: ['大洋'], from: 1950, to: 1977, team: 'Yokohama DeNA BayStars' },
  { aliases: ['大陽'], from: 1947, to: 1949, team: 'Taiyo Robins' },
  { aliases: ['洋松'], from: 1954, to: 1954, team: 'Yosho Robins' },
  { aliases: ['松竹'], from: 1950, to: 1952, team: 'Shochiku Robins' },
  { aliases: ['大洋松竹'], from: 1953, to: 1953, team: 'Taiyo Shochiku Robins' },
  { aliases: ['ヤクルト', '東京ヤクルト'], from: 1970, team: 'Yakult Swallows' },
  { aliases: ['アトムズ'], from: 1969, to: 1969, team: 'Atoms' },
  { aliases: ['サンケイ'], from: 1965, to: 1965, team: 'Sankei Swallows' },
  { aliases: ['サンケイ'], from: 1966, to: 1968, team: 'Sankei Atoms' },
  { aliases: ['国鉄'], from: 1950, to: 1964, team: 'Kokutetsu Swallows' },
  { aliases: ['福岡ソフトバンク', 'ソフトバンク'], from: 2005, team: 'Fukuoka Softbank Hawks' },
  { aliases: ['福岡ダイエー', 'ダイエー'], from: 1989, to: 2004, team: 'SoftBank Hawks' },
  { aliases: ['南海'], from: 1947, to: 1988, team: 'SoftBank Hawks' },
  { aliases: ['南海'], from: 1938, to: 1943, team: 'Nankai Club' },
  { aliases: ['グレートリング', '近畿グレートリング'], from: 1946, to: 1946, team: 'Kinki Great Ring' },
  { aliases: ['北海道日本ハム', '日本ハム'], from: 2004, team: 'Nippon-Ham Fighters' },
  { aliases: ['日本ハム'], from: 1974, to: 2003, team: 'Nippon-Ham Fighters' },
  { aliases: ['日拓'], from: 1973, to: 1973, team: 'Nittaku Home Flyers' },
  { aliases: ['東映'], from: 1954, to: 1972, team: 'Toei Flyers' },
  { aliases: ['急映'], from: 1948, to: 1948, team: 'Kyuei Flyers' },
  { aliases: ['東急'], from: 1947, to: 1953, team: 'Tokyu Flyers' },
  { aliases: ['オリックス'], from: 2005, team: 'Orix Buffaloes' },
  { aliases: ['オリックス'], from: 1991, to: 2004, team: 'Orix Bluewave' },
  { aliases: ['オリックス', '阪急'], from: 1947, to: 1990, team: 'Orix Buffaloes' },
  { aliases: ['阪急'], from: 1936, to: 1946, team: 'Hankyu Club' },
  { aliases: ['大阪近鉄'], from: 1999, to: 2004, team: 'Osaka Kintetsu Buffaloes' },
  { aliases: ['近鉄'], from: 1999, to: 2004, team: 'Osaka Kintetsu Buffaloes' },
  { aliases: ['近鉄'], from: 1959, to: 1961, team: 'Kintetsu Buffalo' },
  { aliases: ['近鉄'], from: 1950, to: 1958, team: 'Kintetsu Pearls' },
  { aliases: ['近鉄'], from: 1962, to: 1998, team: 'Orix Buffaloes' },
  { aliases: ['埼玉西武', '西武'], from: 1979, team: 'Seibu Lions' },
  { aliases: ['クラウン'], from: 1977, to: 1978, team: 'Crown Lighter Lions' },
  { aliases: ['太平洋'], from: 1973, to: 1976, team: 'Taiheiyo Club Lions' },
  { aliases: ['西鉄'], from: 1943, to: 1943, team: 'Nishitetsu Baseball Club' },
  { aliases: ['西鉄'], from: 1951, to: 1972, team: 'Seibu Lions' },
  { aliases: ['西鉄'], from: 1950, to: 1950, team: 'Nishitetsu Clippers' },
  { aliases: ['千葉ロッテ'], from: 1992, team: 'Chiba Lotte Marines' },
  { aliases: ['ロッテ'], from: 1969, team: 'Chiba Lotte Marines' },
  { aliases: ['東京'], from: 1964, to: 1968, team: 'Tokyo Orions' },
  { aliases: ['大毎', '毎日大映'], from: 1958, to: 1963, team: 'Mainichi Daiei Orions' },
  { aliases: ['毎日'], from: 1950, to: 1957, team: 'Mainichi Orions' },
  { aliases: ['大映'], from: 1949, to: 1957, team: 'Daiei Stars' },
  { aliases: ['楽天', '東北楽天'], team: 'Rakuten Eagles' },
  { aliases: ['名古屋'], from: 1936, to: 1943, team: 'Nagoya Club' },
  { aliases: ['名古屋金鯱', '金鯱'], from: 1936, to: 1940, team: 'Nagoya Golden Dolphins' },
  { aliases: ['中部日本'], from: 1946, to: 1946, team: 'Chubu Nippon' },
  { aliases: ['中部日本', '中部日本ドラゴンズ'], from: 1947, to: 1947, team: 'Chubu Nippon Dragons' },
  { aliases: ['中日'], from: 1948, to: 1950, team: 'Chunichi Dragons' },
  { aliases: ['名古屋ドラゴンズ'], from: 1951, to: 1953, team: 'Nagoya Dragons' },
  { aliases: ['中日', '中日ドラゴンズ'], from: 1954, team: 'Chunichi Dragons' },
  { aliases: ['大東京'], from: 1936, to: 1937, team: 'Dai Tokyo' },
  { aliases: ['セネタース'], from: 1936, to: 1939, team: 'Tokyo Senators' },
  { aliases: ['セネタース'], from: 1946, to: 1946, team: 'Senators' },
  { aliases: ['イーグルス'], from: 1937, to: 1937, team: 'Korakuen Eagles' },
  { aliases: ['イーグルス'], from: 1938, to: 1939, team: 'Eagles' },
  { aliases: ['黒鷲'], from: 1940, to: 1941, team: 'Kurowashi' },
  { aliases: ['ライオン'], from: 1937, to: 1939, team: 'Lion Baseball Club' },
  { aliases: ['翼'], from: 1940, to: 1940, team: 'Tsubasa Baseball Club' },
  { aliases: ['朝日'], from: 1941, to: 1944, team: 'Asahi Baseball Club' },
  { aliases: ['近畿日本'], from: 1944, to: 1944, team: 'Kinki Nippon Club' },
  { aliases: ['産業'], from: 1944, to: 1944, team: 'Sangyo Club' },
  { aliases: ['ゴールドスター'], from: 1946, to: 1946, team: 'Gold Star' },
  { aliases: ['金星'], from: 1947, to: 1948, team: 'Kinsei Stars' },
  { aliases: ['パシフィック'], from: 1946, to: 1946, team: 'Pacific' },
  { aliases: ['高橋'], from: 1954, to: 1956, team: 'Takahashi Unions' },
  { aliases: ['トンボ'], from: 1955, to: 1955, team: 'Tombo Unions' },
  { aliases: ['西日本'], from: 1950, to: 1950, team: 'Nishi Nippon Pirates' },
];

const AWARD_NAME_ALIASES = {
  SHINJO: '新庄 剛志',
  TSUYOSHI: '西岡 剛',
  サブロー: '大村 三郎',
  英智: '蔵本 英智',
  '鶴岡 一人': '鶴岡 一成',
  '坪内 道則': '坪内 道典',
  '呉 波': '呉 昌征',
  '呉 新亨': '呉 昌征',
  '中尾 輝三': '中尾 碩志',
  '別所 昭': '別所 毅彦',
  '真田 重男': '真田 重蔵',
  '土屋 五郎': '土屋 雅敬',
  '江藤 正': '江藤 晴康',
  '大友 工': '大友 工司',
  '山内 和弘': '山内 一弘',
  '森永 勝治': '森永 勝也',
  '加藤 秀司': '加藤 英司',
  '長池 徳二': '長池 徳士',
  '有藤 通世': '有藤 道世',
  '津田 恒美': '津田 恒実',
  '新浦 寿夫': '新浦 壽夫',
  '皆川 睦男': '皆川 睦雄',
  '高橋 善正': '高橋 良昌',
  '与田 剛': '与田 剛士',
  '山本 昌広': '山本昌',
  '斉藤 明雄': '斉藤 明夫',
  '角 三男': '角 盈男',
  '高村 祐': '髙村 祐',
  '大石 第二朗': '大石 大二郎',
  '藪 恵市': '藪 恵壹',
  '矢野 輝弘': '矢野 燿大',
  '川崎 宗則': '川﨑 宗則',
  '中島 裕之': '中島 宏之',
  '今江 敏晃': '今江 年晶',
  '亀井 義行': '亀井 善行',
  '高橋 信二': '髙橋 信二',
};

async function readJson(filePath, fallback) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function removeFileIfExists(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
}

function createSeasonKey(year, team) {
  return `${year}:${team}`;
}

function uniqueRows(rows) {
  const seen = new Set();

  return rows.filter((row) => {
    const key = `${row.playerId}:${row.year}:${row.team}:${row.award}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeAwardName(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\s*\.\s*/g, '.')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeRawTeamLabel(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .trim();
}

function canonicalizeAwardName(value) {
  const normalized = normalizeAwardName(value);
  return AWARD_NAME_ALIASES[normalized] ?? normalized;
}

function deriveNameAliases(value) {
  const normalized = normalizeAwardName(value);
  const aliases = new Set([normalized]);
  const withoutInitial = normalized.replace(/^[A-ZＡ-Ｚ]\.\s*/u, '').trim();

  if (withoutInitial && withoutInitial !== normalized) {
    aliases.add(withoutInitial);
  }

  if (normalized.includes('・')) {
    aliases.add(normalized.split('・').at(-1)?.trim() ?? normalized);
  }

  return [...aliases].filter(Boolean).map(canonicalizeAwardName);
}

function mapRawTeamLabel(rawTeam, year) {
  const normalized = normalizeRawTeamLabel(rawTeam);
  const matchedRule = TEAM_ALIAS_RULES.find((rule) => {
    const afterStart = rule.from == null || year >= rule.from;
    const beforeEnd = rule.to == null || year <= rule.to;
    return afterStart && beforeEnd && rule.aliases.includes(normalized);
  });

  return matchedRule?.team ?? null;
}

function buildSeasonIndexes(rows) {
  return rows.reduce(
    (indexes, row) => {
      if (!row.playerId || !row.year || !row.team) {
        return indexes;
      }

      if (!indexes.seasonKeysByPlayer[row.playerId]) {
        indexes.seasonKeysByPlayer[row.playerId] = new Set();
      }

      if (!indexes.teamsByPlayerYear[row.playerId]) {
        indexes.teamsByPlayerYear[row.playerId] = {};
      }

      if (!indexes.teamsByPlayerYear[row.playerId][row.year]) {
        indexes.teamsByPlayerYear[row.playerId][row.year] = new Set();
      }

      indexes.seasonKeysByPlayer[row.playerId].add(createSeasonKey(row.year, row.team));
      indexes.teamsByPlayerYear[row.playerId][row.year].add(row.team);
      return indexes;
    },
    { seasonKeysByPlayer: {}, teamsByPlayerYear: {} },
  );
}

function getTeamsForPlayerYear(playerId, year, teamsByPlayerYear) {
  return Array.from(teamsByPlayerYear[playerId]?.[year] ?? []);
}

function getCandidateIdsForAwardName(nameJapanese, idsByJapaneseName) {
  const ids = new Set();

  deriveNameAliases(nameJapanese).forEach((alias) => {
    (idsByJapaneseName[alias] ?? []).forEach((playerId) => ids.add(playerId));
  });

  return [...ids];
}

function nearlyEqual(left, right) {
  return Math.abs(left - right) < 0.001;
}

function buildSeasonRowsByYearTeam(rows) {
  return rows.reduce((index, row) => {
    if (!row.playerId || !row.year || !row.team) {
      return index;
    }

    if (!index[row.year]) {
      index[row.year] = {};
    }

    if (!index[row.year][row.team]) {
      index[row.year][row.team] = [];
    }

    index[row.year][row.team].push(row);
    return index;
  }, {});
}

function resolveAwardPlayerIdByStat(row, seasonRowsByYearTeam) {
  if (row.statValue == null) {
    return null;
  }

  const mappedTeam = mapRawTeamLabel(row.rawTeam, row.year);

  if (!mappedTeam) {
    return null;
  }

  const statConfig = {
    'Batting Champion': { rowsByYearTeam: seasonRowsByYearTeam.batting, field: 'avg' },
    'Home Run Leader': { rowsByYearTeam: seasonRowsByYearTeam.batting, field: 'homeRuns' },
    'RBI Leader': { rowsByYearTeam: seasonRowsByYearTeam.batting, field: 'runsBattedIn' },
    'Stolen Base Leader': { rowsByYearTeam: seasonRowsByYearTeam.batting, field: 'stolenBases' },
    'ERA Leader': { rowsByYearTeam: seasonRowsByYearTeam.pitching, field: 'era' },
    'Wins Leader': { rowsByYearTeam: seasonRowsByYearTeam.pitching, field: 'wins' },
    'Strikeout Leader': { rowsByYearTeam: seasonRowsByYearTeam.pitching, field: 'strikeouts' },
  }[row.award];

  if (!statConfig) {
    return null;
  }

  const rows = statConfig.rowsByYearTeam[row.year]?.[mappedTeam] ?? [];
  const matches = rows.filter((seasonRow) => {
    const value = seasonRow[statConfig.field];
    return typeof value === 'number' && nearlyEqual(value, row.statValue);
  });
  const uniquePlayerIds = [...new Set(matches.map((seasonRow) => seasonRow.playerId))];

  return uniquePlayerIds.length === 1 ? uniquePlayerIds[0] : null;
}

function resolveAwardPlayerId(
  row,
  idsByJapaneseName,
  seasonKeysByPlayer,
  teamsByPlayerYear,
  players,
  seasonRowsByYearTeam,
) {
  const candidateIds = getCandidateIdsForAwardName(row.nameJapanese, idsByJapaneseName);

  if (candidateIds.length === 0) {
    return resolveAwardPlayerIdByStat(row, seasonRowsByYearTeam);
  }

  if (candidateIds.length === 1) {
    return candidateIds[0];
  }

  const candidatesInYear = candidateIds.filter(
    (playerId) => getTeamsForPlayerYear(playerId, row.year, teamsByPlayerYear).length > 0,
  );
  const narrowedCandidates = candidatesInYear.length > 0 ? candidatesInYear : candidateIds;

  if (narrowedCandidates.length === 1) {
    return narrowedCandidates[0];
  }

  const mappedTeam = mapRawTeamLabel(row.rawTeam, row.year);

  if (mappedTeam) {
    const seasonKey = createSeasonKey(row.year, mappedTeam);
    const seasonMatches = narrowedCandidates.filter((playerId) =>
      seasonKeysByPlayer[playerId]?.has(seasonKey),
    );

    if (seasonMatches.length === 1) {
      return seasonMatches[0];
    }

    const yearTeamMatches = narrowedCandidates.filter((playerId) =>
      getTeamsForPlayerYear(playerId, row.year, teamsByPlayerYear).includes(mappedTeam),
    );

    if (yearTeamMatches.length === 1) {
      return yearTeamMatches[0];
    }

    const careerMatches = narrowedCandidates.filter((playerId) =>
      (players[playerId]?.teams ?? []).includes(mappedTeam),
    );

    if (careerMatches.length === 1) {
      return careerMatches[0];
    }
  }

  return resolveAwardPlayerIdByStat(row, seasonRowsByYearTeam) ?? narrowedCandidates[0];
}

function resolveAwardTeam(row, playerId, teamsByPlayerYear) {
  const teams = getTeamsForPlayerYear(playerId, row.year, teamsByPlayerYear);

  if (teams.length === 1) {
    return teams[0];
  }

  const mappedTeam = mapRawTeamLabel(row.rawTeam, row.year);

  if (mappedTeam && teams.includes(mappedTeam)) {
    return mappedTeam;
  }

  if (mappedTeam) {
    return mappedTeam;
  }

  return teams[0] ?? null;
}

async function main() {
  const players = await readJson(path.join(processedRoot, 'players.json'), {});
  const battingSeasons = await readJson(path.join(processedRoot, 'battingSeasons.json'), []);
  const pitchingSeasons = await readJson(path.join(processedRoot, 'pitchingSeasons.json'), []);
  const fieldingSeasons = await readJson(path.join(processedRoot, 'fieldingSeasons.json'), []);
  const cachedAwards = await readJson(path.join(rawRoot, 'awards', RAW_AWARDS_FILENAME), []);

  const idsByJapaneseName = Object.values(players).reduce((map, player) => {
    if (!player.nameJapanese) {
      return map;
    }

    deriveNameAliases(player.nameJapanese).forEach((normalizedName) => {
      if (!map[normalizedName]) {
        map[normalizedName] = [];
      }

      map[normalizedName].push(player.id);
    });
    return map;
  }, {});

  const seasonIndexes = buildSeasonIndexes([
    ...battingSeasons,
    ...pitchingSeasons,
    ...fieldingSeasons,
  ]);
  const seasonRowsByYearTeam = {
    batting: buildSeasonRowsByYearTeam(battingSeasons),
    pitching: buildSeasonRowsByYearTeam(pitchingSeasons),
  };

  const unresolved = [];
  const rows = cachedAwards.flatMap((row) => {
    const playerId = resolveAwardPlayerId(
      row,
      idsByJapaneseName,
      seasonIndexes.seasonKeysByPlayer,
      seasonIndexes.teamsByPlayerYear,
      players,
      seasonRowsByYearTeam,
    );

    if (!playerId) {
      unresolved.push({ ...row, reason: 'player-not-found' });
      return [];
    }

    const team = resolveAwardTeam(row, playerId, seasonIndexes.teamsByPlayerYear);

    if (!team) {
      unresolved.push({ ...row, playerId, reason: 'team-not-found' });
      return [];
    }

    const player = players[playerId];
    return [
      {
        playerId,
        award: row.award,
        year: row.year,
        team,
        nameJapanese: row.nameJapanese,
        name: player?.name ?? '',
      },
    ];
  });

  const uniqueAwardRows = uniqueRows(rows);
  await writeJson(path.join(processedRoot, 'playerAwards.json'), uniqueAwardRows);
  const unresolvedPath = path.join(processedRoot, 'unresolvedAwardRows.json');

  if (unresolved.length > 0) {
    await writeJson(unresolvedPath, unresolved);
    console.warn(`WARN: Could not resolve ${unresolved.length} cached award rows.`);
  } else {
    await removeFileIfExists(unresolvedPath);
  }

  console.log(`Wrote ${uniqueAwardRows.length} official historical award rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
