import fs from 'node:fs/promises';
import path from 'node:path';
import { processedRoot, writeJson } from './_shared.js';

function sum(target, key, value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    target[key] = (target[key] ?? 0) + value;
  }
}

async function readJson(fileName, fallback) {
  try {
    const text = await fs.readFile(path.join(processedRoot, fileName), 'utf8');
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function main() {
  const battingSeasons = await readJson('battingSeasons.json', []);
  const pitchingSeasons = await readJson('pitchingSeasons.json', []);
  const careerStats = {};

  battingSeasons.forEach((season) => {
    const stats = (careerStats[season.playerId] ??= {
      batting: {},
      pitching: {},
    });

    ['hits', 'homeRuns', 'runsBattedIn', 'runs', 'stolenBases'].forEach((key) =>
      sum(stats.batting, key, season[key]),
    );

    if (typeof season.avg === 'number') {
      stats.batting.avgSeasons = [...(stats.batting.avgSeasons ?? []), season.avg];
    }
    if (typeof season.obp === 'number') {
      stats.batting.obpSeasons = [...(stats.batting.obpSeasons ?? []), season.obp];
    }
    if (typeof season.slg === 'number') {
      stats.batting.slgSeasons = [...(stats.batting.slgSeasons ?? []), season.slg];
    }
  });

  pitchingSeasons.forEach((season) => {
    const stats = (careerStats[season.playerId] ??= {
      batting: {},
      pitching: {},
    });

    [
      'wins',
      'strikeouts',
      'saves',
      'holds',
      'inningsPitched',
      'completeGames',
      'shutouts',
    ].forEach((key) => sum(stats.pitching, key, season[key]));

    if (typeof season.era === 'number') {
      stats.pitching.eraSeasons = [...(stats.pitching.eraSeasons ?? []), season.era];
    }

    stats.pitching.gamesPitched = (stats.pitching.gamesPitched ?? 0) + 1;
  });

  Object.values(careerStats).forEach((stats) => {
    if (stats.batting.avgSeasons?.length) {
      stats.batting.avg = Math.max(...stats.batting.avgSeasons);
    }
    if (stats.batting.obpSeasons?.length) {
      stats.batting.obp = Math.max(...stats.batting.obpSeasons);
    }
    if (stats.batting.slgSeasons?.length) {
      stats.batting.slg = Math.max(...stats.batting.slgSeasons);
    }
    if (stats.pitching.eraSeasons?.length) {
      stats.pitching.era = Math.min(...stats.pitching.eraSeasons);
    }
    delete stats.batting.avgSeasons;
    delete stats.batting.obpSeasons;
    delete stats.batting.slgSeasons;
    delete stats.pitching.eraSeasons;
  });

  await writeJson(path.join(processedRoot, 'careerStats.json'), careerStats);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
