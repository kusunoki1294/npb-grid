import fs from 'node:fs/promises';
import path from 'node:path';
import { players as legacyPlayers } from '../src/data/players.js';
import { sampleJapaneseNames } from './_sampleJapaneseNames.js';
import { ensureBaseDataDirs, rawRoot } from './_shared.js';

function escapeCsv(value) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, headers) {
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((header) => escapeCsv(row[header] ?? '')).join(','));
  });
  return `${lines.join('\n')}\n`;
}

function createRegistryRow(player) {
  const specialCategories = player.specialCategories ?? [];

  return {
    name: player.name,
    name_japanese: player.nameJapanese ?? sampleJapaneseNames[player.name] ?? '',
    bats: specialCategories.includes('Switch Hitter') ? 'S' : '',
    throws: '',
    birth_country: specialCategories.includes('Foreign-Born Player') ? 'Foreign-born' : 'Japan',
    team: player.teams?.[0] ?? '',
    position: player.positions?.[0] ?? '',
    played_in_mlb: specialCategories.includes('Played in MLB') ? 1 : 0,
    hall_of_fame: specialCategories.includes('Japan Baseball Hall of Fame') ? 1 : 0,
    meikyukai: specialCategories.includes('Meikyukai Member') ? 1 : 0,
  };
}

function numericPrefix(label, suffix) {
  const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = label.match(new RegExp(`^([0-9.]+)\\+ ${escaped}$`));
  return match ? Number(match[1].replace(/,/g, '')) : null;
}

function maxMetric(labels, suffix) {
  const values = labels
    .map((label) => numericPrefix(label, suffix))
    .filter((value) => value != null);
  return values.length > 0 ? Math.max(...values) : '';
}

function maxEra(labels) {
  const values = labels
    .map((label) => label.match(/^<=([0-9.]+) ERA Season$/))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  return values.length > 0 ? Math.min(...values) : '';
}

function buildBattingRow(player) {
  const seasonLabels = player.battingSeasonMilestones ?? [];
  const careerLabels = player.battingCareerMilestones ?? [];
  const comboLabel = seasonLabels.find((label) => label.includes('HR /') && label.includes('SB Season'));
  const comboMatch = comboLabel?.match(/(\d+)\+ HR \/ (\d+)\+ SB Season/);

  if (seasonLabels.length === 0 && careerLabels.length === 0) {
    return null;
  }

  return {
    name: player.name,
    name_japanese: player.nameJapanese ?? sampleJapaneseNames[player.name] ?? '',
    team: player.teams?.[0] ?? '',
    year: 2024,
    games: '',
    avg: maxMetric([...seasonLabels, ...careerLabels], 'AVG Season') || maxMetric(careerLabels, 'Career AVG'),
    obp: maxMetric(careerLabels, 'Career OBP'),
    slg: maxMetric(careerLabels, 'Career SLG'),
    hits: maxMetric([...seasonLabels, ...careerLabels], 'Hits Season') || maxMetric(careerLabels, 'Career Hits'),
    hr: Math.max(
      comboMatch ? Number(comboMatch[1]) : 0,
      maxMetric([...seasonLabels, ...careerLabels], 'HR Season') || 0,
      maxMetric(careerLabels, 'Career HR') || 0,
    ) || '',
    rbi:
      maxMetric([...seasonLabels, ...careerLabels], 'RBI Season') ||
      maxMetric(careerLabels, 'Career RBI'),
    runs:
      maxMetric([...seasonLabels, ...careerLabels], 'Runs Season') ||
      maxMetric(careerLabels, 'Career Runs'),
    sb: Math.max(
      comboMatch ? Number(comboMatch[2]) : 0,
      maxMetric([...seasonLabels, ...careerLabels], 'SB Season') || 0,
      maxMetric(careerLabels, 'Career SB') || 0,
    ) || '',
  };
}

function buildPitchingRow(player) {
  const seasonLabels = player.pitchingSeasonMilestones ?? [];
  const careerLabels = player.pitchingCareerMilestones ?? [];
  const specialCategories = player.specialCategories ?? [];

  if (seasonLabels.length === 0 && careerLabels.length === 0 && !specialCategories.includes('No-Hitter') && !specialCategories.includes('Perfect Game')) {
    return null;
  }

  return {
    name: player.name,
    name_japanese: player.nameJapanese ?? sampleJapaneseNames[player.name] ?? '',
    team: player.teams?.[0] ?? '',
    year: 2024,
    w: maxMetric([...seasonLabels, ...careerLabels], 'Win Season') || maxMetric(careerLabels, 'Career Wins'),
    l: '',
    era: maxEra(seasonLabels),
    so:
      maxMetric([...seasonLabels, ...careerLabels], 'Strikeout Season') ||
      maxMetric(careerLabels, 'Career Strikeouts'),
    sv:
      maxMetric([...seasonLabels, ...careerLabels], 'Save Season') ||
      maxMetric(careerLabels, 'Career Saves'),
    hld:
      maxMetric([...seasonLabels, ...careerLabels], 'Hold Season') ||
      maxMetric(careerLabels, 'Career Holds'),
    ip:
      maxMetric([...seasonLabels, ...careerLabels], 'IP Season') ||
      maxMetric(careerLabels, 'Career IP'),
    cg: maxMetric(careerLabels, 'Career Complete Games'),
    sho: maxMetric(careerLabels, 'Career Shutouts'),
    no_hitter: specialCategories.includes('No-Hitter') ? 1 : 0,
    perfect_game: specialCategories.includes('Perfect Game') ? 1 : 0,
  };
}

function buildFieldingRows(player) {
  return (player.positions ?? []).map((position) => ({
    name: player.name,
    name_japanese: player.nameJapanese ?? sampleJapaneseNames[player.name] ?? '',
    team: player.teams?.[0] ?? '',
    year: 2024,
    position,
    games: '',
    innings: '',
    po: '',
    a: '',
    e: '',
    fpct: '',
  }));
}

function buildAwardRows(player) {
  return (player.awards ?? []).map((award) => ({
    name: player.name,
    name_japanese: player.nameJapanese ?? sampleJapaneseNames[player.name] ?? '',
    team: player.teams?.[0] ?? '',
    year: 2024,
    award,
  }));
}

async function writeFile(relativePath, text) {
  await fs.writeFile(path.join(rawRoot, relativePath), text, 'utf8');
}

async function main() {
  await ensureBaseDataDirs();

  const registryRows = legacyPlayers.map(createRegistryRow);
  const battingRows = legacyPlayers.map(buildBattingRow).filter(Boolean);
  const pitchingRows = legacyPlayers.map(buildPitchingRow).filter(Boolean);
  const fieldingRows = legacyPlayers.flatMap(buildFieldingRows);
  const awardRows = legacyPlayers.flatMap(buildAwardRows);

  await writeFile(
    'registry/sample-registry.csv',
    toCsv(registryRows, [
      'name',
      'name_japanese',
      'bats',
      'throws',
      'birth_country',
      'team',
      'position',
      'played_in_mlb',
      'hall_of_fame',
      'meikyukai',
    ]),
  );

  await writeFile(
    'batting/sample-batting.csv',
    toCsv(battingRows, [
      'name',
      'name_japanese',
      'team',
      'year',
      'games',
      'avg',
      'obp',
      'slg',
      'hits',
      'hr',
      'rbi',
      'runs',
      'sb',
    ]),
  );

  await writeFile(
    'pitching/sample-pitching.csv',
    toCsv(pitchingRows, [
      'name',
      'name_japanese',
      'team',
      'year',
      'w',
      'l',
      'era',
      'so',
      'sv',
      'hld',
      'ip',
      'cg',
      'sho',
      'no_hitter',
      'perfect_game',
    ]),
  );

  await writeFile(
    'fielding/sample-fielding.csv',
    toCsv(fieldingRows, [
      'name',
      'name_japanese',
      'team',
      'year',
      'position',
      'games',
      'innings',
      'po',
      'a',
      'e',
      'fpct',
    ]),
  );

  await writeFile(
    'awards/sample-awards.csv',
    toCsv(awardRows, ['name', 'name_japanese', 'team', 'year', 'award']),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
