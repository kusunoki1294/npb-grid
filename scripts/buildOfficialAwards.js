import fs from 'node:fs/promises';
import path from 'node:path';
import { processedRoot, rawRoot, writeJson } from './_shared.js';

const RAW_TEAM_TO_CANONICAL = {
  '阪神': 'Hanshin Tigers',
  '読売': 'Yomiuri Giants',
  '巨人': 'Yomiuri Giants',
  '中日': 'Chunichi Dragons',
  '広島東洋': 'Hiroshima Toyo Carp',
  '広島': 'Hiroshima Toyo Carp',
  '東京ヤクルト': 'Yakult Swallows',
  'ヤクルト': 'Yakult Swallows',
  '横浜': 'Yokohama DeNA BayStars',
  '横浜DeNA': 'Yokohama DeNA BayStars',
  'ＤｅＮＡ': 'Yokohama DeNA BayStars',
  '福岡ソフトバンク': 'SoftBank Hawks',
  'ソフトバンク': 'SoftBank Hawks',
  '福岡ダイエー': 'SoftBank Hawks',
  'ダイエー': 'SoftBank Hawks',
  '北海道日本ハム': 'Nippon-Ham Fighters',
  '日本ハム': 'Nippon-Ham Fighters',
  'オリックス': 'Orix Buffaloes',
  '大阪近鉄': 'Orix Buffaloes',
  '近鉄': 'Orix Buffaloes',
  '東北楽天': 'Rakuten Eagles',
  '楽天': 'Rakuten Eagles',
  '埼玉西武': 'Seibu Lions',
  '西武': 'Seibu Lions',
  '千葉ロッテ': 'Chiba Lotte Marines',
  'ロッテ': 'Chiba Lotte Marines',
};

const AWARD_NAME_ALIASES = {
  SHINJO: '新庄 剛志',
  TSUYOSHI: '西岡 剛',
  サブロー: '大村 三郎',
  英智: '蔵本 英智',
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

function normalizeTeamLabel(value) {
  return RAW_TEAM_TO_CANONICAL[value] ?? value;
}

function normalizeAwardName(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\s*\.\s*/g, '.')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalizeAwardName(value) {
  const normalized = normalizeAwardName(value);
  return AWARD_NAME_ALIASES[normalized] ?? normalized;
}

function buildSeasonKeys(rows) {
  return rows.reduce((map, row) => {
    if (!row.playerId || !row.year || !row.team) {
      return map;
    }

    if (!map[row.playerId]) {
      map[row.playerId] = new Set();
    }

    map[row.playerId].add(createSeasonKey(row.year, row.team));
    return map;
  }, {});
}

function resolveAwardPlayerId(row, idsByJapaneseName, seasonKeysByPlayer, players) {
  const candidateIds = idsByJapaneseName[canonicalizeAwardName(row.nameJapanese)] ?? [];

  if (candidateIds.length === 0) {
    return null;
  }

  if (candidateIds.length === 1) {
    return candidateIds[0];
  }

  const team = normalizeTeamLabel(row.rawTeam);
  const seasonKey = createSeasonKey(row.year, team);
  const seasonMatches = candidateIds.filter((playerId) =>
    seasonKeysByPlayer[playerId]?.has(seasonKey),
  );

  if (seasonMatches.length === 1) {
    return seasonMatches[0];
  }

  const teamMatches = candidateIds.filter((playerId) =>
    (players[playerId]?.teams ?? []).includes(team),
  );

  if (teamMatches.length === 1) {
    return teamMatches[0];
  }

  return seasonMatches[0] ?? teamMatches[0] ?? candidateIds[0];
}

async function main() {
  const players = await readJson(path.join(processedRoot, 'players.json'), {});
  const battingSeasons = await readJson(path.join(processedRoot, 'battingSeasons.json'), []);
  const pitchingSeasons = await readJson(path.join(processedRoot, 'pitchingSeasons.json'), []);
  const fieldingSeasons = await readJson(path.join(processedRoot, 'fieldingSeasons.json'), []);
  const cachedAwards = await readJson(
    path.join(rawRoot, 'awards', 'npb-awards-2002-2025.json'),
    [],
  );

  const idsByJapaneseName = Object.values(players).reduce((map, player) => {
    if (!player.nameJapanese) {
      return map;
    }

    const normalizedName = canonicalizeAwardName(player.nameJapanese);

    if (!map[normalizedName]) {
      map[normalizedName] = [];
    }

    map[normalizedName].push(player.id);
    return map;
  }, {});

  const seasonKeysByPlayer = buildSeasonKeys([
    ...battingSeasons,
    ...pitchingSeasons,
    ...fieldingSeasons,
  ]);

  const unresolved = [];
  const rows = cachedAwards.flatMap((row) => {
    const playerId = resolveAwardPlayerId(row, idsByJapaneseName, seasonKeysByPlayer, players);

    if (!playerId) {
      unresolved.push(row);
      return [];
    }

    const player = players[playerId];

    return [
      {
        playerId,
        award: row.award,
        year: row.year,
        team: normalizeTeamLabel(row.rawTeam),
        nameJapanese: row.nameJapanese,
        name: player?.name ?? '',
      },
    ];
  });

  await writeJson(path.join(processedRoot, 'playerAwards.json'), uniqueRows(rows));
  const unresolvedPath = path.join(processedRoot, 'unresolvedAwardRows.json');

  if (unresolved.length > 0) {
    await writeJson(unresolvedPath, unresolved);
    console.warn(`WARN: Could not resolve ${unresolved.length} cached award rows.`);
  } else {
    await removeFileIfExists(unresolvedPath);
  }

  console.log(`Wrote ${rows.length} official historical award rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
