import path from 'node:path';
import { ensureDir, rawRoot, writeJson } from './_shared.js';

const AWARD_PAGE_START_YEAR = 2002;
const YEARLY_ARCHIVE_START_YEAR = 1950;
const END_YEAR = 2025;
const OUTPUT_FILENAME = 'npb-awards-historical.json';

const JAPAN_BASEBALL_LEAGUE_ARCHIVES = [
  { year: 1936, sourceId: 'bis-yakyuremmei-1936s', url: 'https://npb.jp/bis/yearly/yakyuremmei_1936s.html' },
  { year: 1936, sourceId: 'bis-yakyuremmei-1936f', url: 'https://npb.jp/bis/yearly/yakyuremmei_1936f.html' },
  { year: 1937, sourceId: 'bis-yakyuremmei-1937s', url: 'https://npb.jp/bis/yearly/yakyuremmei_1937s.html' },
  { year: 1937, sourceId: 'bis-yakyuremmei-1937f', url: 'https://npb.jp/bis/yearly/yakyuremmei_1937f.html' },
  { year: 1938, sourceId: 'bis-yakyuremmei-1938s', url: 'https://npb.jp/bis/yearly/yakyuremmei_1938s.html' },
  { year: 1938, sourceId: 'bis-yakyuremmei-1938f', url: 'https://npb.jp/bis/yearly/yakyuremmei_1938f.html' },
  { year: 1939, sourceId: 'bis-yakyuremmei-1939', url: 'https://npb.jp/bis/yearly/yakyuremmei_1939.html' },
  { year: 1940, sourceId: 'bis-yakyuremmei-1940', url: 'https://npb.jp/bis/yearly/yakyuremmei_1940.html' },
  { year: 1941, sourceId: 'bis-yakyuremmei-1941', url: 'https://npb.jp/bis/yearly/yakyuremmei_1941.html' },
  { year: 1942, sourceId: 'bis-yakyuremmei-1942', url: 'https://npb.jp/bis/yearly/yakyuremmei_1942.html' },
  { year: 1943, sourceId: 'bis-yakyuremmei-1943', url: 'https://npb.jp/bis/yearly/yakyuremmei_1943.html' },
  { year: 1944, sourceId: 'bis-yakyuremmei-1944', url: 'https://npb.jp/bis/yearly/yakyuremmei_1944.html' },
  { year: 1946, sourceId: 'bis-yakyuremmei-1946', url: 'https://npb.jp/bis/yearly/yakyuremmei_1946.html' },
  { year: 1947, sourceId: 'bis-yakyuremmei-1947', url: 'https://npb.jp/bis/yearly/yakyuremmei_1947.html' },
  { year: 1948, sourceId: 'bis-yakyuremmei-1948', url: 'https://npb.jp/bis/yearly/yakyuremmei_1948.html' },
  { year: 1949, sourceId: 'bis-yakyuremmei-1949', url: 'https://npb.jp/bis/yearly/yakyuremmei_1949.html' },
];

const YEARLY_LEAGUE_AWARDS = [
  { label: '最優秀選手', award: 'MVP Winner' },
  { label: '最優秀新人', award: 'Rookie of the Year' },
  { label: '首位打者', award: 'Batting Champion' },
  { label: '最多本塁打', award: 'Home Run Leader' },
  { label: '最多打点', award: 'RBI Leader' },
  { label: '最多盗塁', award: 'Stolen Base Leader' },
  { label: '最優秀防御率', award: 'ERA Leader' },
  { label: '最多勝利', award: 'Wins Leader' },
  { label: '最多奪三振', award: 'Strikeout Leader' },
];

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

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeRawTeam(value) {
  return normalizeName(value).replace(/\s+/g, '');
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value ?? '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function sliceSection(text, startMarker, endMarker) {
  const startIndex = text.indexOf(startMarker);

  if (startIndex === -1) {
    return '';
  }

  const endIndex = endMarker ? text.indexOf(endMarker, startIndex + startMarker.length) : -1;
  return endIndex === -1 ? text.slice(startIndex) : text.slice(startIndex, endIndex);
}

function collectAwardMatches(section, awardName, regex, sourceId) {
  return [...section.matchAll(regex)].map((match) => ({
    award: awardName,
    nameJapanese: normalizeName(match[1]),
    rawTeam: normalizeRawTeam(match[2]),
    sourceId,
  }));
}

function parseLeagueAwards(text, year, leagueLabel, sourceId) {
  const startMarker = `${year}年度 表彰選手（${leagueLabel}）`;
  const endMarker = `${year - 1}年`;
  const section = sliceSection(text, startMarker, endMarker);

  if (!section) {
    return [];
  }

  return [
    ...collectAwardMatches(section, 'MVP Winner', /最優秀選手賞\s+([^（）]+?)\s+（([^）]+)）/g, sourceId),
    ...collectAwardMatches(section, 'Rookie of the Year', /最優秀新人賞\s+([^（）]+?)\s+（([^）]+)）/g, sourceId),
    ...collectAwardMatches(section, 'Best Nine', /ベストナイン賞(?:（[^）]+）)?\s+([^（）]+?)\s+（([^）]+)）/g, sourceId),
    ...collectAwardMatches(section, 'Batting Champion', /首位打者賞\s+([^（）]+?)\s+（([^）]+)）/g, sourceId),
    ...collectAwardMatches(section, 'Home Run Leader', /最多本塁打者賞\s+([^（）]+?)\s+（([^）]+)）/g, sourceId),
    ...collectAwardMatches(section, 'RBI Leader', /最多打点者賞\s+([^（）]+?)\s+（([^）]+)）/g, sourceId),
    ...collectAwardMatches(section, 'Stolen Base Leader', /最多盗塁者賞\s+([^（）]+?)\s+（([^）]+)）/g, sourceId),
    ...collectAwardMatches(section, 'ERA Leader', /最優秀防御率投手賞\s+([^（）]+?)\s+（([^）]+)）/g, sourceId),
    ...collectAwardMatches(section, 'Wins Leader', /最多勝利投手賞\s+([^（）]+?)\s+（([^）]+)）/g, sourceId),
    ...collectAwardMatches(section, 'Strikeout Leader', /最多三振奪取投手賞\s+([^（）]+?)\s+（([^）]+)）/g, sourceId),
    ...collectAwardMatches(section, 'Saves Leader', /最多セーブ投手賞\s+([^（）]+?)\s+（([^）]+)）/g, sourceId),
    ...collectAwardMatches(section, 'Holds Leader', /最優秀中継ぎ投手賞\s+([^（）]+?)\s+（([^）]+)）/g, sourceId),
  ].map((row) => ({ ...row, year }));
}

function parseGoldenGloveAwards(text, year, sourceId) {
  const pageSection = sliceSection(text, `${year}年度 三井ゴールデン・グラブ賞`, `${year - 1}年`);
  const centralSection = sliceSection(pageSection, 'セントラル・リーグ', 'パシフィック・リーグ');
  const pacificSection = sliceSection(pageSection, 'パシフィック・リーグ', '');
  const regex = /(?:投手|捕手|一塁手|二塁手|三塁手|遊撃手|外野手)\s+([^（）]+?)\s+（([^）]+)）/g;

  return [
    ...collectAwardMatches(centralSection, 'Golden Glove', regex, sourceId),
    ...collectAwardMatches(pacificSection, 'Golden Glove', regex, sourceId),
  ].map((row) => ({ ...row, year }));
}

function parseSawamuraAwards(text, year, sourceId) {
  const section = sliceSection(text, `${year}年度 正力賞・沢村賞`, `${year - 1}年`);

  return collectAwardMatches(
    section,
    'Sawamura Award Winner',
    /(?:沢村栄治賞\s+)+([^（）]+?)\s+（([^）]+)）/g,
    sourceId,
  ).map((row) => ({ ...row, year }));
}

function sanitizeWinnerName(value) {
  return normalizeName(value)
    .replace(/^(?:(?:初|\(\d+\)|[0-9.]+|最高勝率)\s+)+/u, '')
    .replace(/^(?:初|\(\d+\)|[0-9.]+|最高勝率)+/u, '')
    .trim();
}

function parseStatValue(value) {
  if (!value) {
    return null;
  }

  const normalized = value.startsWith('.') ? `0${value}` : value;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function extractWinners(segment) {
  return [...segment.matchAll(/([^()（）]+?)\s*[（(]([^()（）]+)[）)]\s*(?:初|\(\d+\))?\s*([0-9.]+)?/g)]
    .map((match) => ({
      nameJapanese: sanitizeWinnerName(match[1]),
      rawTeam: normalizeRawTeam(match[2]),
      statValue: parseStatValue(match[3]),
    }))
    .filter((row) => row.nameJapanese && row.rawTeam);
}

function parseYearlyLeagueAwards(text, year, sourceId) {
  const section = sliceSection(
    text,
    '■ リーグ・リーダーズ',
    '(注)：実際の表彰の有無、名称とは異なる場合があります。',
  );

  if (!section) {
    return [];
  }

  const markers = YEARLY_LEAGUE_AWARDS.map((definition) => ({
    ...definition,
    index: section.indexOf(definition.label),
  }))
    .filter((definition) => definition.index !== -1)
    .sort((left, right) => left.index - right.index);

  return markers.flatMap((definition, index) => {
    const startIndex = definition.index + definition.label.length;
    const endIndex = markers[index + 1]?.index ?? section.length;
    const winnerSegment = section
      .slice(startIndex, endIndex)
      .replace(/最高勝率[\s\S]*$/u, '');

    return extractWinners(winnerSegment).map((winner) => ({
      ...winner,
      award: definition.award,
      year,
      sourceId,
    }));
  });
}

function uniqueRows(rows) {
  const seen = new Set();

  return rows.filter((row) => {
    const key = [row.year, row.award, row.nameJapanese, row.rawTeam, row.sourceId].join('|');

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function fetchPage(url, { allowMissing = false } = {}) {
  const response = await fetch(url);

  if (allowMissing && response.status === 404) {
    return '';
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return stripHtml(await response.text());
}

async function fetchBacknumberAwardRows() {
  const rows = [];

  for (let year = AWARD_PAGE_START_YEAR; year <= END_YEAR; year += 1) {
    const [centralText, pacificText, gloveText, sawamuraText] = await Promise.all([
      fetchPage(`https://npb.jp/award/${year}/cl.html`),
      fetchPage(`https://npb.jp/award/${year}/pl.html`),
      fetchPage(`https://npb.jp/award/${year}/glove.html`, { allowMissing: true }),
      fetchPage(`https://npb.jp/award/${year}/shosawa.html`),
    ]);

    rows.push(
      ...parseLeagueAwards(centralText, year, 'セントラル・リーグ', 'award-centralleague'),
      ...parseLeagueAwards(pacificText, year, 'パシフィック・リーグ', 'award-pacificleague'),
      ...parseGoldenGloveAwards(gloveText, year, 'award-goldenglove'),
      ...parseSawamuraAwards(sawamuraText, year, 'award-sawamura'),
    );
  }

  return rows;
}

async function fetchYearlyArchiveRows() {
  const yearlyRows = [];

  for (let year = YEARLY_ARCHIVE_START_YEAR; year < AWARD_PAGE_START_YEAR; year += 1) {
    const [centralText, pacificText] = await Promise.all([
      fetchPage(`https://npb.jp/bis/yearly/centralleague_${year}.html`),
      fetchPage(`https://npb.jp/bis/yearly/pacificleague_${year}.html`),
    ]);

    yearlyRows.push(
      ...parseYearlyLeagueAwards(centralText, year, 'bis-centralleague'),
      ...parseYearlyLeagueAwards(pacificText, year, 'bis-pacificleague'),
    );
  }

  const japanBaseballLeagueRows = await Promise.all(
    JAPAN_BASEBALL_LEAGUE_ARCHIVES.map(async (archive) =>
      parseYearlyLeagueAwards(await fetchPage(archive.url), archive.year, archive.sourceId),
    ),
  );

  return yearlyRows.concat(japanBaseballLeagueRows.flat());
}

async function main() {
  const [yearlyArchiveRows, backnumberRows] = await Promise.all([
    fetchYearlyArchiveRows(),
    fetchBacknumberAwardRows(),
  ]);

  const rows = uniqueRows([...yearlyArchiveRows, ...backnumberRows]).sort((left, right) => {
    if (left.year !== right.year) {
      return left.year - right.year;
    }

    return `${left.award}:${left.nameJapanese}:${left.rawTeam}`.localeCompare(
      `${right.award}:${right.nameJapanese}:${right.rawTeam}`,
      'ja',
    );
  });

  const destinationDir = path.join(rawRoot, 'awards');
  await ensureDir(destinationDir);
  await writeJson(path.join(destinationDir, OUTPUT_FILENAME), rows);
  console.log(`Wrote ${rows.length} cached NPB award rows to ${OUTPUT_FILENAME}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
