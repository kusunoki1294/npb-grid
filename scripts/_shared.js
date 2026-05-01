import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeTeamName } from '../src/data/teamAliases.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const projectRoot = path.resolve(__dirname, '..');
export const rawRoot = path.join(projectRoot, 'data', 'raw');
export const processedRoot = path.join(projectRoot, 'data', 'processed');

export async function ensureDir(directory) {
  await fs.mkdir(directory, { recursive: true });
}

export async function ensureBaseDataDirs() {
  await Promise.all(
    [
      path.join(rawRoot, 'batting'),
      path.join(rawRoot, 'pitching'),
      path.join(rawRoot, 'fielding'),
      path.join(rawRoot, 'awards'),
      path.join(rawRoot, 'registry'),
      processedRoot,
    ].map(ensureDir),
  );
}

export async function listCsvFiles(directory) {
  let entries = [];

  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return listCsvFiles(fullPath);
      }

      return entry.name.toLowerCase().endsWith('.csv') ? [fullPath] : [];
    }),
  );

  return nested.flat().sort();
}

export function parseCsv(text) {
  const rows = [];
  let value = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      row.push(value);
      value = '';

      if (row.some((cell) => cell !== '')) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    if (row.some((cell) => cell !== '')) {
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    return [];
  }

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((header) => header.trim());

  return dataRows.map((dataRow) =>
    Object.fromEntries(
      headers.map((header, index) => [header, (dataRow[index] ?? '').trim()]),
    ),
  );
}

export async function readCsvDirectory(directory) {
  const files = await listCsvFiles(directory);
  const fileRows = await Promise.all(
    files.map(async (file) => {
      const text = await fs.readFile(file, 'utf8');
      return parseCsv(text).map((row) => ({ ...row, __sourceFile: path.basename(file) }));
    }),
  );

  return fileRows.flat();
}

export function normalizeName(value) {
  return value
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugify(value) {
  return normalizeName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function hashString(value) {
  let hash = 0;

  for (const char of value) {
    hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  }

  return hash.toString(16);
}

export function createStablePlayerId(nameEn, nameJa) {
  const englishSlug = slugify(nameEn ?? '');

  if (englishSlug) {
    return englishSlug;
  }

  const japaneseName = normalizeName(nameJa ?? '');
  return japaneseName ? `jp-${hashString(japaneseName)}` : `player-${hashString('unknown')}`;
}

export function getFirstValue(row, candidates) {
  for (const candidate of candidates) {
    if (row[candidate] && row[candidate].trim() !== '') {
      return row[candidate].trim();
    }
  }

  return '';
}

export function toNumber(value) {
  if (value === '' || value == null) {
    return null;
  }

  const normalized = String(value).replace(/,/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function normalizePosition(value) {
  const normalized = normalizeName(value);
  const aliases = {
    P: 'Pitcher',
    Pitcher: 'Pitcher',
    C: 'Catcher',
    Catcher: 'Catcher',
    '1B': 'First Baseman',
    'First Base': 'First Baseman',
    'First Baseman': 'First Baseman',
    '2B': 'Second Baseman',
    'Second Base': 'Second Baseman',
    'Second Baseman': 'Second Baseman',
    '3B': 'Third Baseman',
    'Third Base': 'Third Baseman',
    'Third Baseman': 'Third Baseman',
    SS: 'Shortstop',
    Shortstop: 'Shortstop',
    LF: 'Left Fielder',
    'Left Field': 'Left Fielder',
    'Left Fielder': 'Left Fielder',
    CF: 'Center Fielder',
    'Center Field': 'Center Fielder',
    'Center Fielder': 'Center Fielder',
    RF: 'Right Fielder',
    'Right Field': 'Right Fielder',
    'Right Fielder': 'Right Fielder',
    DH: 'Designated Hitter',
    'Designated Hitter': 'Designated Hitter',
    IF: 'Infielder',
    OF: 'Outfielder',
  };

  return aliases[normalized] ?? normalized;
}

export function normalizeTeam(value) {
  return normalizeTeamName(normalizeName(value));
}

export async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
