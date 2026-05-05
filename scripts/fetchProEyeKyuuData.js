import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, rawRoot } from './_shared.js';

const CSV_INDEX_URL = 'https://proeyekyuu.com/csvs/';
const REGISTRY_URL = 'https://proeyekyuu.com/player-registry/';

const DATASET_URL_FILTERS = {
  batting: '/PlayerSLBattingEN/',
  pitching: '/PlayerSLPitchingEN/',
  fielding: '/PlayerSLFieldingEN/',
};

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function csvEscape(value) {
  const normalized = String(value ?? '');
  return `"${normalized.replace(/"/g, '""')}"`;
}

function extractCsvUrls(html, needle) {
  const matches = html.match(/https:\/\/[^"' ]+\.csv/g) ?? [];
  return [...new Set(matches.filter((url) => url.includes(needle)))].sort();
}

function extractRegistryRows(html) {
  const tableMatch = html.match(/<table[^>]*id="table_1"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);

  if (!tableMatch) {
    throw new Error('Could not locate player registry table body in ProEyeKyuu HTML.');
  }

  const rowMatches = [...tableMatch[1].matchAll(/<tr[\s\S]*?<\/tr>/gi)];

  return rowMatches
    .map((match) => {
      const cells = [...match[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) =>
        stripHtml(cell[1]),
      );

      if (cells.length < 17) {
        return null;
      }

      return {
        name: cells[0],
        status: cells[2],
        current_last_team: cells[3],
        teams_played_on: cells[4],
        bats: cells[5],
        throws: cells[6],
        most_common_positions: cells[7],
        birthdate: cells[8],
        age: cells[9],
        height_cm: cells[10],
        height_imperial: cells[11],
        weight_kg: cells[12],
        weight_lb: cells[13],
        earliest_year_with_first_team: cells[14],
        school_history: cells[15],
        player_id: cells[16],
      };
    })
    .filter(Boolean);
}

async function downloadToFile(url, destination) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const body = await response.text();
  await fs.writeFile(destination, body, 'utf8');
}

async function writeRegistryCsv(destination, rows) {
  const headers = [
    'player_id',
    'name',
    'status',
    'current_last_team',
    'teams_played_on',
    'bats',
    'throws',
    'most_common_positions',
    'birthdate',
    'age',
    'height_cm',
    'height_imperial',
    'weight_kg',
    'weight_lb',
    'earliest_year_with_first_team',
    'school_history',
  ];
  const lines = [headers.join(',')];

  rows.forEach((row) => {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  });

  await fs.writeFile(destination, `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  const indexHtml = await fetch(CSV_INDEX_URL).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to fetch ${CSV_INDEX_URL}: ${response.status} ${response.statusText}`);
    }
    return response.text();
  });

  const registryHtml = await fetch(REGISTRY_URL).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to fetch ${REGISTRY_URL}: ${response.status} ${response.statusText}`);
    }
    return response.text();
  });

  const datasets = Object.entries(DATASET_URL_FILTERS).map(([dataset, needle]) => ({
    dataset,
    urls: extractCsvUrls(indexHtml, needle),
  }));

  for (const { dataset, urls } of datasets) {
    const targetDir = path.join(rawRoot, dataset, 'proeyekyuu');
    await ensureDir(targetDir);

    for (const url of urls) {
      const destination = path.join(targetDir, path.basename(url));
      await downloadToFile(url, destination);
    }

    console.log(`Downloaded ${urls.length} ${dataset} CSV files.`);
  }

  const registryRows = extractRegistryRows(registryHtml);
  const registryDir = path.join(rawRoot, 'registry');
  await ensureDir(registryDir);
  await writeRegistryCsv(path.join(registryDir, 'proeyekyuu-player-registry.csv'), registryRows);

  console.log(`Wrote registry CSV with ${registryRows.length} players.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
