import fs from 'node:fs/promises';
import path from 'node:path';
import { categories } from '../src/data/categories.js';
import { normalizeTeamName } from '../src/data/teamAliases.js';
import { processedRoot, writeJson } from './_shared.js';

function parseThreshold(label, suffix) {
  const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = label.match(new RegExp(`^([0-9.]+)\\+ ${escaped}$`));
  return match ? Number(match[1].replace(/,/g, '')) : null;
}

function parseLessThanThreshold(label, prefix, suffix) {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = label.match(
    new RegExp(`^${escapedPrefix}([0-9.]+) ${escapedSuffix}$`),
  );
  return match ? Number(match[1]) : null;
}

async function readJson(fileName, fallback) {
  try {
    const text = await fs.readFile(path.join(processedRoot, fileName), 'utf8');
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function byPlayer(rows) {
  return rows.reduce((groups, row) => {
    if (!groups[row.playerId]) {
      groups[row.playerId] = [];
    }
    groups[row.playerId].push(row);
    return groups;
  }, {});
}

function setFromFilter(players, predicate) {
  return Object.values(players)
    .filter(predicate)
    .map((player) => player.id)
    .sort();
}

function getSeasonStatIds(rowsByPlayer, predicate) {
  return Object.entries(rowsByPlayer)
    .filter(([, rows]) => rows.some(predicate))
    .map(([playerId]) => playerId)
    .sort();
}

function getCareerStatIds(careerStats, predicate) {
  return Object.entries(careerStats)
    .filter(([, stats]) => predicate(stats))
    .map(([playerId]) => playerId)
    .sort();
}

function unique(array) {
  return [...new Set(array)].sort();
}

function getTaggedIds(players, field, value) {
  return Object.values(players)
    .filter((player) => (player[field] ?? []).includes(value))
    .map((player) => player.id)
    .sort();
}

function mergeEligibility(...collections) {
  return unique(collections.flat().filter(Boolean));
}

async function main() {
  const players = await readJson('players.json', {});
  const battingSeasons = await readJson('battingSeasons.json', []);
  const pitchingSeasons = await readJson('pitchingSeasons.json', []);
  const fieldingSeasons = await readJson('fieldingSeasons.json', []);
  const playerAwards = await readJson('playerAwards.json', []);
  const careerStats = await readJson('careerStats.json', {});

  const battingByPlayer = byPlayer(battingSeasons);
  const pitchingByPlayer = byPlayer(pitchingSeasons);
  const awardsByPlayer = byPlayer(playerAwards);

  const positionsByPlayer = Object.entries(players).reduce((map, [playerId, player]) => {
    map[playerId] = new Set(player.positions ?? []);
    fieldingSeasons
      .filter((row) => row.playerId === playerId && row.position)
      .forEach((row) => map[playerId].add(row.position));
    return map;
  }, {});

  const eligibility = {};

  categories.forEach((category) => {
    switch (category.type) {
      case 'team':
        eligibility[category.id] = setFromFilter(
          players,
          (player) => (player.teams ?? []).includes(normalizeTeamName(category.value)),
        );
        break;
      case 'position':
        eligibility[category.id] = mergeEligibility(
          Object.entries(positionsByPlayer)
            .filter(([, positions]) => positions.has(category.value))
            .map(([playerId]) => playerId)
            .sort(),
          getTaggedIds(players, 'positions', category.value),
        );
        break;
      case 'award':
        eligibility[category.id] = mergeEligibility(
          Object.entries(awardsByPlayer)
            .filter(([, awards]) => awards.some((award) => award.award === category.value))
            .map(([playerId]) => playerId)
            .sort(),
          getTaggedIds(players, 'awards', category.value),
        );
        break;
      case 'battingSeasonMilestone': {
        if (category.value === 'Triple Crown Season') {
          eligibility[category.id] = mergeEligibility(
            setFromFilter(
              players,
              (player) =>
                (player.battingSeasonMilestones ?? []).includes('Triple Crown Season') ||
                (player.specialCategories ?? []).includes('Triple Crown Season'),
            ),
            getSeasonStatIds(
              battingByPlayer,
              (season) => season.tripleCrown === true,
            ),
          );
          break;
        }

        const avgThreshold = parseThreshold(category.value, 'AVG Season');
        const hrThreshold = parseThreshold(category.value, 'HR Season');
        const rbiThreshold = parseThreshold(category.value, 'RBI Season');
        const runsThreshold = parseThreshold(category.value, 'Runs Season');
        const hitsThreshold = parseThreshold(category.value, 'Hits Season');
        const sbThreshold = parseThreshold(category.value, 'SB Season');

        if (category.value.includes('HR /') && category.value.includes('SB Season')) {
          const [homeRuns, stolenBases] = category.value
            .match(/(\d+)\+ HR \/ (\d+)\+ SB Season/)
            .slice(1)
            .map(Number);
          eligibility[category.id] = mergeEligibility(
            getSeasonStatIds(
              battingByPlayer,
              (season) =>
                (season.homeRuns ?? 0) >= homeRuns && (season.stolenBases ?? 0) >= stolenBases,
            ),
            getTaggedIds(players, 'battingSeasonMilestones', category.value),
          );
        } else if (avgThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getSeasonStatIds(
              battingByPlayer,
              (season) => (season.avg ?? 0) >= avgThreshold,
            ),
            getTaggedIds(players, 'battingSeasonMilestones', category.value),
          );
        } else if (hrThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getSeasonStatIds(
              battingByPlayer,
              (season) => (season.homeRuns ?? 0) >= hrThreshold,
            ),
            getTaggedIds(players, 'battingSeasonMilestones', category.value),
          );
        } else if (rbiThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getSeasonStatIds(
              battingByPlayer,
              (season) => (season.runsBattedIn ?? 0) >= rbiThreshold,
            ),
            getTaggedIds(players, 'battingSeasonMilestones', category.value),
          );
        } else if (runsThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getSeasonStatIds(
              battingByPlayer,
              (season) => (season.runs ?? 0) >= runsThreshold,
            ),
            getTaggedIds(players, 'battingSeasonMilestones', category.value),
          );
        } else if (hitsThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getSeasonStatIds(
              battingByPlayer,
              (season) => (season.hits ?? 0) >= hitsThreshold,
            ),
            getTaggedIds(players, 'battingSeasonMilestones', category.value),
          );
        } else if (sbThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getSeasonStatIds(
              battingByPlayer,
              (season) => (season.stolenBases ?? 0) >= sbThreshold,
            ),
            getTaggedIds(players, 'battingSeasonMilestones', category.value),
          );
        } else {
          eligibility[category.id] = [];
        }
        break;
      }
      case 'battingCareerMilestone': {
        const hitsThreshold = parseThreshold(category.value, 'Career Hits');
        const hrThreshold = parseThreshold(category.value, 'Career HR');
        const rbiThreshold = parseThreshold(category.value, 'Career RBI');
        const runsThreshold = parseThreshold(category.value, 'Career Runs');
        const sbThreshold = parseThreshold(category.value, 'Career SB');
        const avgThreshold = parseThreshold(category.value, 'Career AVG');
        const obpThreshold = parseThreshold(category.value, 'Career OBP');
        const slgThreshold = parseThreshold(category.value, 'Career SLG');

        if (hitsThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getCareerStatIds(careerStats, (stats) => (stats.batting?.hits ?? 0) >= hitsThreshold),
            getTaggedIds(players, 'battingCareerMilestones', category.value),
          );
        } else if (hrThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getCareerStatIds(
              careerStats,
              (stats) => (stats.batting?.homeRuns ?? 0) >= hrThreshold,
            ),
            getTaggedIds(players, 'battingCareerMilestones', category.value),
          );
        } else if (rbiThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getCareerStatIds(
              careerStats,
              (stats) => (stats.batting?.runsBattedIn ?? 0) >= rbiThreshold,
            ),
            getTaggedIds(players, 'battingCareerMilestones', category.value),
          );
        } else if (runsThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getCareerStatIds(careerStats, (stats) => (stats.batting?.runs ?? 0) >= runsThreshold),
            getTaggedIds(players, 'battingCareerMilestones', category.value),
          );
        } else if (sbThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getCareerStatIds(
              careerStats,
              (stats) => (stats.batting?.stolenBases ?? 0) >= sbThreshold,
            ),
            getTaggedIds(players, 'battingCareerMilestones', category.value),
          );
        } else if (avgThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getCareerStatIds(careerStats, (stats) => (stats.batting?.avg ?? 0) >= avgThreshold),
            getTaggedIds(players, 'battingCareerMilestones', category.value),
          );
        } else if (obpThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getCareerStatIds(careerStats, (stats) => (stats.batting?.obp ?? 0) >= obpThreshold),
            getTaggedIds(players, 'battingCareerMilestones', category.value),
          );
        } else if (slgThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getCareerStatIds(careerStats, (stats) => (stats.batting?.slg ?? 0) >= slgThreshold),
            getTaggedIds(players, 'battingCareerMilestones', category.value),
          );
        } else {
          eligibility[category.id] = [];
        }
        break;
      }
      case 'pitchingSeasonMilestone': {
        const winsThreshold = parseThreshold(category.value, 'Win Season');
        const strikeoutThreshold = parseThreshold(category.value, 'Strikeout Season');
        const saveThreshold = parseThreshold(category.value, 'Save Season');
        const holdThreshold = parseThreshold(category.value, 'Hold Season');
        const inningsThreshold = parseThreshold(category.value, 'IP Season');
        const eraThreshold = parseLessThanThreshold(category.value, '<=', 'ERA Season');

        if (winsThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getSeasonStatIds(
              pitchingByPlayer,
              (season) => (season.wins ?? 0) >= winsThreshold,
            ),
            getTaggedIds(players, 'pitchingSeasonMilestones', category.value),
          );
        } else if (strikeoutThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getSeasonStatIds(
              pitchingByPlayer,
              (season) => (season.strikeouts ?? 0) >= strikeoutThreshold,
            ),
            getTaggedIds(players, 'pitchingSeasonMilestones', category.value),
          );
        } else if (saveThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getSeasonStatIds(
              pitchingByPlayer,
              (season) => (season.saves ?? 0) >= saveThreshold,
            ),
            getTaggedIds(players, 'pitchingSeasonMilestones', category.value),
          );
        } else if (holdThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getSeasonStatIds(
              pitchingByPlayer,
              (season) => (season.holds ?? 0) >= holdThreshold,
            ),
            getTaggedIds(players, 'pitchingSeasonMilestones', category.value),
          );
        } else if (inningsThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getSeasonStatIds(
              pitchingByPlayer,
              (season) => (season.inningsPitched ?? 0) >= inningsThreshold,
            ),
            getTaggedIds(players, 'pitchingSeasonMilestones', category.value),
          );
        } else if (eraThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getSeasonStatIds(
              pitchingByPlayer,
              (season) => season.era != null && season.era <= eraThreshold,
            ),
            getTaggedIds(players, 'pitchingSeasonMilestones', category.value),
          );
        } else {
          eligibility[category.id] = [];
        }
        break;
      }
      case 'pitchingCareerMilestone': {
        const winsThreshold = parseThreshold(category.value, 'Career Wins');
        const strikeoutThreshold = parseThreshold(category.value, 'Career Strikeouts');
        const saveThreshold = parseThreshold(category.value, 'Career Saves');
        const holdThreshold = parseThreshold(category.value, 'Career Holds');
        const gamesThreshold = parseThreshold(category.value, 'Games Pitched');
        const inningsThreshold = parseThreshold(category.value, 'Career IP');
        const completeGamesThreshold = parseThreshold(category.value, 'Career Complete Games');
        const shutoutsThreshold = parseThreshold(category.value, 'Career Shutouts');
        const eraThreshold = parseLessThanThreshold(category.value, 'Sub-', 'Career ERA');

        if (winsThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getCareerStatIds(careerStats, (stats) => (stats.pitching?.wins ?? 0) >= winsThreshold),
            getTaggedIds(players, 'pitchingCareerMilestones', category.value),
          );
        } else if (strikeoutThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getCareerStatIds(
              careerStats,
              (stats) => (stats.pitching?.strikeouts ?? 0) >= strikeoutThreshold,
            ),
            getTaggedIds(players, 'pitchingCareerMilestones', category.value),
          );
        } else if (saveThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getCareerStatIds(careerStats, (stats) => (stats.pitching?.saves ?? 0) >= saveThreshold),
            getTaggedIds(players, 'pitchingCareerMilestones', category.value),
          );
        } else if (holdThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getCareerStatIds(careerStats, (stats) => (stats.pitching?.holds ?? 0) >= holdThreshold),
            getTaggedIds(players, 'pitchingCareerMilestones', category.value),
          );
        } else if (gamesThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getCareerStatIds(
              careerStats,
              (stats) => (stats.pitching?.gamesPitched ?? 0) >= gamesThreshold,
            ),
            getTaggedIds(players, 'pitchingCareerMilestones', category.value),
          );
        } else if (inningsThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getCareerStatIds(
              careerStats,
              (stats) => (stats.pitching?.inningsPitched ?? 0) >= inningsThreshold,
            ),
            getTaggedIds(players, 'pitchingCareerMilestones', category.value),
          );
        } else if (completeGamesThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getCareerStatIds(
              careerStats,
              (stats) => (stats.pitching?.completeGames ?? 0) >= completeGamesThreshold,
            ),
            getTaggedIds(players, 'pitchingCareerMilestones', category.value),
          );
        } else if (shutoutsThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getCareerStatIds(
              careerStats,
              (stats) => (stats.pitching?.shutouts ?? 0) >= shutoutsThreshold,
            ),
            getTaggedIds(players, 'pitchingCareerMilestones', category.value),
          );
        } else if (eraThreshold != null) {
          eligibility[category.id] = mergeEligibility(
            getCareerStatIds(
              careerStats,
              (stats) => stats.pitching?.era != null && stats.pitching.era < eraThreshold,
            ),
            getTaggedIds(players, 'pitchingCareerMilestones', category.value),
          );
        } else {
          eligibility[category.id] = [];
        }
        break;
      }
      case 'specialCategory': {
        switch (category.value) {
          case 'Played for Only One NPB Franchise':
            eligibility[category.id] = setFromFilter(
              players,
              (player) => unique(player.teams ?? []).length === 1,
            );
            break;
          case 'Played in MLB':
            eligibility[category.id] = setFromFilter(players, (player) => Boolean(player.playedInMLB));
            break;
          case 'Foreign-Born Player':
            eligibility[category.id] = setFromFilter(
              players,
              (player) => player.birthCountry && player.birthCountry !== 'Japan',
            );
            break;
          case 'Japanese-Born Player':
            eligibility[category.id] = setFromFilter(
              players,
              (player) => !player.birthCountry || player.birthCountry === 'Japan',
            );
            break;
          case 'Switch Hitter':
            eligibility[category.id] = setFromFilter(players, (player) => player.bats === 'S' || player.switchHitter);
            break;
          case 'No-Hitter':
            eligibility[category.id] = mergeEligibility(
              getSeasonStatIds(pitchingByPlayer, (season) => season.noHitter === true),
              getTaggedIds(players, 'specialCategories', category.value),
            );
            break;
          case 'Perfect Game':
            eligibility[category.id] = mergeEligibility(
              getSeasonStatIds(pitchingByPlayer, (season) => season.perfectGame === true),
              getTaggedIds(players, 'specialCategories', category.value),
            );
            break;
          case 'Japan Baseball Hall of Fame':
            eligibility[category.id] = setFromFilter(players, (player) => Boolean(player.hallOfFame));
            break;
          case 'Meikyukai Member':
            eligibility[category.id] = setFromFilter(players, (player) => Boolean(player.meikyukai));
            break;
          default:
            eligibility[category.id] = [];
        }
        break;
      }
      default:
        eligibility[category.id] = [];
    }
  });

  await writeJson(path.join(processedRoot, 'eligibility.json'), eligibility);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
