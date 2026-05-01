import path from 'node:path';
import { players as legacyPlayers } from '../src/data/players.js';
import {
  createStablePlayerId,
  normalizePosition,
  normalizeTeam,
  processedRoot,
  writeJson,
} from './_shared.js';

// Temporary bootstrap so the app can run on processed JSON before you add real
// CSV exports under data/raw. Once real CSVs exist, use the import/build steps.

const japaneseNameByEnglish = {
  'Sadaharu Oh': '王 貞治',
  'Shigeo Nagashima': '長嶋 茂雄',
  'Hayato Sakamoto': '坂本 勇人',
  'Kazuma Okamoto': '岡本 和真',
  'Koji Uehara': '上原 浩治',
  'Tomoyuki Sugano': '菅野 智之',
  'Munetaka Murakami': '村上 宗隆',
  'Tetsuto Yamada': '山田 哲人',
  'Atsuya Furuta': '古田 敦也',
  'Tsuyoshi Wada': '和田 毅',
  'Kodai Senga': '千賀 滉大',
  'Yuki Yanagita': '柳田 悠岐',
  'Katsuya Nomura': '野村 克也',
  'Yoshinobu Yamamoto': '山本 由伸',
  'Masataka Yoshida': '吉田 正尚',
  'Masahiro Tanaka': '田中 将大',
  'Kazuo Matsui': '松井 稼頭央',
  'Shohei Ohtani': '大谷 翔平',
  'Yu Darvish': 'ダルビッシュ 有',
  'Atsunori Inaba': '稲葉 篤紀',
};

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseThreshold(label, suffix) {
  const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = label.match(new RegExp(`^([0-9.]+)\\+ ${escaped}$`));
  return match ? Number(match[1].replace(/,/g, '')) : null;
}

function parseLessOrEqualThreshold(label, suffix) {
  const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = label.match(new RegExp(`^<=([0-9.]+) ${escaped}$`));
  return match ? Number(match[1]) : null;
}

function synthesizeBattingSeason(playerId, player) {
  const milestones = player.battingSeasonMilestones ?? [];
  const careerMilestones = player.battingCareerMilestones ?? [];

  if (milestones.length === 0 && careerMilestones.length === 0) {
    return null;
  }

  const averageThresholds = [
    ...milestones
      .map((label) => parseThreshold(label, 'AVG Season'))
      .filter((value) => value != null),
    ...careerMilestones
      .map((label) => parseThreshold(label, 'Career AVG'))
      .filter((value) => value != null),
  ];
  const obpThresholds = careerMilestones
    .map((label) => parseThreshold(label, 'Career OBP'))
    .filter((value) => value != null);
  const slgThresholds = careerMilestones
    .map((label) => parseThreshold(label, 'Career SLG'))
    .filter((value) => value != null);
  const homeRunThresholds = [
    ...milestones
      .map((label) => parseThreshold(label, 'HR Season'))
      .filter((value) => value != null),
    ...careerMilestones
      .map((label) => parseThreshold(label, 'Career HR'))
      .filter((value) => value != null),
  ];
  const rbiThresholds = [
    ...milestones
      .map((label) => parseThreshold(label, 'RBI Season'))
      .filter((value) => value != null),
    ...careerMilestones
      .map((label) => parseThreshold(label, 'Career RBI'))
      .filter((value) => value != null),
  ];
  const runThresholds = [
    ...milestones
      .map((label) => parseThreshold(label, 'Runs Season'))
      .filter((value) => value != null),
    ...careerMilestones
      .map((label) => parseThreshold(label, 'Career Runs'))
      .filter((value) => value != null),
  ];
  const hitThresholds = [
    ...milestones
      .map((label) => parseThreshold(label, 'Hits Season'))
      .filter((value) => value != null),
    ...careerMilestones
      .map((label) => parseThreshold(label, 'Career Hits'))
      .filter((value) => value != null),
  ];
  const stolenBaseThresholds = [
    ...milestones
      .map((label) => parseThreshold(label, 'SB Season'))
      .filter((value) => value != null),
    ...careerMilestones
      .map((label) => parseThreshold(label, 'Career SB'))
      .filter((value) => value != null),
  ];

  const comboSeason = milestones.find((label) => label.includes('HR /') && label.includes('SB Season'));
  const comboMatch = comboSeason?.match(/(\d+)\+ HR \/ (\d+)\+ SB Season/);

  return {
    playerId,
    year: null,
    team: player.teams[0] ?? '',
    games: null,
    avg: averageThresholds.length > 0 ? Math.max(...averageThresholds) : null,
    obp: obpThresholds.length > 0 ? Math.max(...obpThresholds) : null,
    slg: slgThresholds.length > 0 ? Math.max(...slgThresholds) : null,
    hits: hitThresholds.length > 0 ? Math.max(...hitThresholds) : null,
    homeRuns: Math.max(
      comboMatch ? Number(comboMatch[1]) : 0,
      homeRunThresholds.length > 0 ? Math.max(...homeRunThresholds) : 0,
    ) || null,
    runsBattedIn: rbiThresholds.length > 0 ? Math.max(...rbiThresholds) : null,
    runs: runThresholds.length > 0 ? Math.max(...runThresholds) : null,
    stolenBases: Math.max(
      comboMatch ? Number(comboMatch[2]) : 0,
      stolenBaseThresholds.length > 0 ? Math.max(...stolenBaseThresholds) : 0,
    ) || null,
    tripleCrown: milestones.includes('Triple Crown Season'),
  };
}

function synthesizePitchingSeason(playerId, player) {
  const milestones = player.pitchingSeasonMilestones ?? [];
  const careerMilestones = player.pitchingCareerMilestones ?? [];
  const specialCategories = player.specialCategories ?? [];

  if (
    milestones.length === 0 &&
    careerMilestones.length === 0 &&
    !specialCategories.includes('No-Hitter') &&
    !specialCategories.includes('Perfect Game')
  ) {
    return null;
  }

  const winThresholds = [
    ...milestones
      .map((label) => parseThreshold(label, 'Win Season'))
      .filter((value) => value != null),
    ...careerMilestones
      .map((label) => parseThreshold(label, 'Career Wins'))
      .filter((value) => value != null),
  ];
  const strikeoutThresholds = [
    ...milestones
      .map((label) => parseThreshold(label, 'Strikeout Season'))
      .filter((value) => value != null),
    ...careerMilestones
      .map((label) => parseThreshold(label, 'Career Strikeouts'))
      .filter((value) => value != null),
  ];
  const saveThresholds = [
    ...milestones
      .map((label) => parseThreshold(label, 'Save Season'))
      .filter((value) => value != null),
    ...careerMilestones
      .map((label) => parseThreshold(label, 'Career Saves'))
      .filter((value) => value != null),
  ];
  const holdThresholds = [
    ...milestones
      .map((label) => parseThreshold(label, 'Hold Season'))
      .filter((value) => value != null),
    ...careerMilestones
      .map((label) => parseThreshold(label, 'Career Holds'))
      .filter((value) => value != null),
  ];
  const inningsThresholds = [
    ...milestones
      .map((label) => parseThreshold(label, 'IP Season'))
      .filter((value) => value != null),
    ...careerMilestones
      .map((label) => parseThreshold(label, 'Career IP'))
      .filter((value) => value != null),
  ];
  const completeGameThresholds = careerMilestones
    .map((label) => parseThreshold(label, 'Career Complete Games'))
    .filter((value) => value != null);
  const shutoutThresholds = careerMilestones
    .map((label) => parseThreshold(label, 'Career Shutouts'))
    .filter((value) => value != null);
  const eraThresholds = [
    ...milestones
      .map((label) => parseLessOrEqualThreshold(label, 'ERA Season'))
      .filter((value) => value != null),
    ...careerMilestones
      .map((label) => label.match(/^Sub-([0-9.]+) Career ERA$/))
      .filter(Boolean)
      .map((match) => Number(match[1])),
  ];

  return {
    playerId,
    year: null,
    team: player.teams[0] ?? '',
    wins: winThresholds.length > 0 ? Math.max(...winThresholds) : null,
    losses: null,
    era: eraThresholds.length > 0 ? Math.min(...eraThresholds) : null,
    strikeouts: strikeoutThresholds.length > 0 ? Math.max(...strikeoutThresholds) : null,
    saves: saveThresholds.length > 0 ? Math.max(...saveThresholds) : null,
    holds: holdThresholds.length > 0 ? Math.max(...holdThresholds) : null,
    inningsPitched: inningsThresholds.length > 0 ? Math.max(...inningsThresholds) : null,
    completeGames:
      completeGameThresholds.length > 0 ? Math.max(...completeGameThresholds) : null,
    shutouts: shutoutThresholds.length > 0 ? Math.max(...shutoutThresholds) : null,
    noHitter: specialCategories.includes('No-Hitter'),
    perfectGame: specialCategories.includes('Perfect Game'),
  };
}

function synthesizeFieldingRows(playerId, player) {
  return (player.positions ?? []).map((position) => ({
    playerId,
    year: null,
    team: player.teams[0] ?? '',
    position,
    games: null,
    innings: null,
    putouts: null,
    assists: null,
    errors: null,
    fieldingPct: null,
  }));
}

async function main() {
  const players = {};
  const battingSeasons = [];
  const pitchingSeasons = [];
  const fieldingSeasons = [];
  const playerAwards = [];

  legacyPlayers.forEach((legacyPlayer) => {
    const id = createStablePlayerId(legacyPlayer.name, legacyPlayer.nameJapanese);
    const specialCategories = unique(legacyPlayer.specialCategories ?? []);
    const teams = unique((legacyPlayer.teams ?? []).map(normalizeTeam));
    const positions = unique((legacyPlayer.positions ?? []).map(normalizePosition));

    players[id] = {
      id,
      name: legacyPlayer.name,
      nameJapanese: legacyPlayer.nameJapanese ?? japaneseNameByEnglish[legacyPlayer.name] ?? '',
      teams,
      positions,
      bats: specialCategories.includes('Switch Hitter') ? 'S' : '',
      throws: '',
      birthCountry: specialCategories.includes('Foreign-Born Player') ? 'Foreign-born' : 'Japan',
      awards: unique(legacyPlayer.awards ?? []),
      battingSeasonMilestones: unique(legacyPlayer.battingSeasonMilestones ?? []),
      battingCareerMilestones: unique(legacyPlayer.battingCareerMilestones ?? []),
      pitchingSeasonMilestones: unique(legacyPlayer.pitchingSeasonMilestones ?? []),
      pitchingCareerMilestones: unique(legacyPlayer.pitchingCareerMilestones ?? []),
      specialCategories,
      playedInMLB: specialCategories.includes('Played in MLB'),
      hallOfFame: specialCategories.includes('Japan Baseball Hall of Fame'),
      meikyukai: specialCategories.includes('Meikyukai Member'),
      switchHitter: specialCategories.includes('Switch Hitter'),
    };

    players[id].awards.forEach((award) => {
      playerAwards.push({
        playerId: id,
        award,
        year: null,
        team: teams[0] ?? '',
      });
    });

    const battingSeason = synthesizeBattingSeason(id, players[id]);
    if (battingSeason) {
      battingSeasons.push(battingSeason);
    }

    const pitchingSeason = synthesizePitchingSeason(id, players[id]);
    if (pitchingSeason) {
      pitchingSeasons.push(pitchingSeason);
    }

    fieldingSeasons.push(...synthesizeFieldingRows(id, players[id]));
  });

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
