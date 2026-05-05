import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, rawRoot } from './_shared.js';

const CSV_INDEX_URL = 'https://proeyekyuu.com/csvs/';
const REGISTRY_URL = 'https://proeyekyuu.com/player-registry/';
const REGISTRY_JA_URL = 'https://proeyekyuu.com/ja/player-registry-jp/';

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

function extractRegistryTableMeta(html, tableIdLabel) {
  const tableConfigMatch = html.match(/<input type="hidden" id="table_1_desc"[\s\S]*?value='([\s\S]*?)'/i);
  const nonceRegex = new RegExp(
    `<input type="hidden" id="wdtNonceFrontendServerSide_${tableIdLabel}"[^>]*value="([^"]+)"`,
    'i',
  );
  const nonceMatch = html.match(nonceRegex);

  if (!tableConfigMatch || !nonceMatch) {
    throw new Error(`Could not locate wpDataTables metadata for registry table ${tableIdLabel}.`);
  }

  const config = JSON.parse(tableConfigMatch[1]);

  return {
    nonce: nonceMatch[1],
    tableId: config.tableWpId,
  };
}

async function fetchRegistryTableRows({ tableId, nonce }) {
  const endpoint = `https://proeyekyuu.com/wp-admin/admin-ajax.php?action=get_wdtable&table_id=${tableId}`;
  const allRows = [];
  let draw = 1;
  let start = 0;
  const length = 1000;
  let recordsTotal = null;

  while (recordsTotal === null || start < recordsTotal) {
    const body = new URLSearchParams({
      draw: String(draw),
      start: String(start),
      length: String(length),
      wdtNonce: nonce,
    });
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch registry table ${tableId}: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload.data) ? payload.data : [];

    if (recordsTotal === null) {
      recordsTotal = Number(payload.recordsTotal ?? rows.length);
    }

    if (rows.length === 0) {
      break;
    }

    allRows.push(...rows);
    start += rows.length;
    draw += 1;
  }

  return allRows;
}

function mapEnglishRegistryRows(rows) {
  return rows
    .map((cells) => {
      if (!Array.isArray(cells) || cells.length < 17) {
        return null;
      }

      return {
        name: stripHtml(cells[0]),
        status: stripHtml(cells[2]),
        current_last_team: stripHtml(cells[3]),
        teams_played_on: stripHtml(cells[4]),
        bats: stripHtml(cells[5]),
        throws: stripHtml(cells[6]),
        most_common_positions: stripHtml(cells[7]),
        birthdate: stripHtml(cells[8]),
        age: stripHtml(cells[9]),
        height_cm: stripHtml(cells[10]),
        height_imperial: stripHtml(cells[11]),
        weight_kg: stripHtml(cells[12]),
        weight_lb: stripHtml(cells[13]),
        earliest_year_with_first_team: stripHtml(cells[14]),
        school_history: stripHtml(cells[15]),
        player_id: stripHtml(cells[16]),
      };
    })
    .filter(Boolean);
}

function mapJapaneseRegistryRows(rows) {
  return rows
    .map((cells) => {
      if (!Array.isArray(cells) || cells.length < 19) {
        return null;
      }

      return {
        player_id: stripHtml(cells[18]),
        name_japanese: stripHtml(cells[0]),
        name_furigana: stripHtml(cells[2]),
      };
    })
    .filter(Boolean);
}

function mergeRegistryRows(englishRows, japaneseRows) {
  const japaneseRowsByPlayerId = new Map(
    japaneseRows
      .filter((row) => row.player_id)
      .map((row) => [row.player_id, row]),
  );

  return englishRows.map((row) => {
    const japaneseRow = japaneseRowsByPlayerId.get(row.player_id);

    return {
      ...row,
      name_japanese: japaneseRow?.name_japanese ?? '',
      name_furigana: japaneseRow?.name_furigana ?? '',
    };
  });
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
    'name_japanese',
    'name_furigana',
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
  const registryJaHtml = await fetch(REGISTRY_JA_URL).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to fetch ${REGISTRY_JA_URL}: ${response.status} ${response.statusText}`);
    }
    return response.text();
  });
  const englishRegistryMeta = extractRegistryTableMeta(registryHtml, 42);
  const japaneseRegistryMeta = extractRegistryTableMeta(registryJaHtml, 43);

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

  const [englishRegistryRows, japaneseRegistryRows] = await Promise.all([
    fetchRegistryTableRows(englishRegistryMeta).then(mapEnglishRegistryRows),
    fetchRegistryTableRows(japaneseRegistryMeta).then(mapJapaneseRegistryRows),
  ]);

  const registryRows = mergeRegistryRows(englishRegistryRows, japaneseRegistryRows);
  const registryDir = path.join(rawRoot, 'registry');
  await ensureDir(registryDir);
  await writeRegistryCsv(path.join(registryDir, 'proeyekyuu-player-registry.csv'), registryRows);

  console.log(`Wrote registry CSV with ${registryRows.length} players.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
