import path from 'node:path';
import { ensureDir, rawRoot, writeJson } from './_shared.js';

const START_YEAR = 2002;
const END_YEAR = 2025;

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

function collectAwardMatches(section, awardName, regex) {
  return [...section.matchAll(regex)].map((match) => ({
    award: awardName,
    nameJapanese: match[1].trim(),
    rawTeam: match[2].trim(),
  }));
}

function parseLeagueAwards(text, year, leagueLabel) {
  const startMarker = `${year}年度 表彰選手（${leagueLabel}）`;
  const endMarker = `${year - 1}年`;
  const section = sliceSection(text, startMarker, endMarker);

  if (!section) {
    return [];
  }

  return [
    ...collectAwardMatches(section, 'MVP Winner', /最優秀選手賞\s+([^（）]+?)\s+（([^）]+)）/g),
    ...collectAwardMatches(section, 'Rookie of the Year', /最優秀新人賞\s+([^（）]+?)\s+（([^）]+)）/g),
    ...collectAwardMatches(section, 'Best Nine', /ベストナイン賞(?:（[^）]+）)?\s+([^（）]+?)\s+（([^）]+)）/g),
    ...collectAwardMatches(section, 'Batting Champion', /首位打者賞\s+([^（）]+?)\s+（([^）]+)）/g),
    ...collectAwardMatches(section, 'Home Run Leader', /最多本塁打者賞\s+([^（）]+?)\s+（([^）]+)）/g),
    ...collectAwardMatches(section, 'RBI Leader', /最多打点者賞\s+([^（）]+?)\s+（([^）]+)）/g),
    ...collectAwardMatches(section, 'Stolen Base Leader', /最多盗塁者賞\s+([^（）]+?)\s+（([^）]+)）/g),
    ...collectAwardMatches(section, 'ERA Leader', /最優秀防御率投手賞\s+([^（）]+?)\s+（([^）]+)）/g),
    ...collectAwardMatches(section, 'Wins Leader', /最多勝利投手賞\s+([^（）]+?)\s+（([^）]+)）/g),
    ...collectAwardMatches(section, 'Strikeout Leader', /最多三振奪取投手賞\s+([^（）]+?)\s+（([^）]+)）/g),
    ...collectAwardMatches(section, 'Saves Leader', /最多セーブ投手賞\s+([^（）]+?)\s+（([^）]+)）/g),
    ...collectAwardMatches(section, 'Holds Leader', /最優秀中継ぎ投手賞\s+([^（）]+?)\s+（([^）]+)）/g),
  ].map((row) => ({ ...row, year }));
}

function parseGoldenGloveAwards(text, year) {
  const pageSection = sliceSection(text, `${year}年度 三井ゴールデン・グラブ賞`, `${year - 1}年`);
  const centralSection = sliceSection(pageSection, 'セントラル・リーグ', 'パシフィック・リーグ');
  const pacificSection = sliceSection(pageSection, 'パシフィック・リーグ', '');
  const regex = /(?:投手|捕手|一塁手|二塁手|三塁手|遊撃手|外野手)\s+([^（）]+?)\s+（([^）]+)）/g;

  return [
    ...collectAwardMatches(centralSection, 'Golden Glove', regex),
    ...collectAwardMatches(pacificSection, 'Golden Glove', regex),
  ].map((row) => ({ ...row, year }));
}

function parseSawamuraAwards(text, year) {
  const section = sliceSection(text, `${year}年度 正力賞・沢村賞`, `${year - 1}年`);

  return collectAwardMatches(
    section,
    'Sawamura Award Winner',
    /(?:沢村栄治賞\s+)+([^（）]+?)\s+（([^）]+)）/g,
  ).map((row) => ({ ...row, year }));
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

async function main() {
  const rows = [];

  for (let year = START_YEAR; year <= END_YEAR; year += 1) {
    const [centralText, pacificText, gloveText, sawamuraText] = await Promise.all([
      fetchPage(`https://npb.jp/award/${year}/cl.html`),
      fetchPage(`https://npb.jp/award/${year}/pl.html`),
      fetchPage(`https://npb.jp/award/${year}/glove.html`, { allowMissing: true }),
      fetchPage(`https://npb.jp/award/${year}/shosawa.html`),
    ]);

    rows.push(
      ...parseLeagueAwards(centralText, year, 'セントラル・リーグ'),
      ...parseLeagueAwards(pacificText, year, 'パシフィック・リーグ'),
      ...parseGoldenGloveAwards(gloveText, year),
      ...parseSawamuraAwards(sawamuraText, year),
    );
  }

  const destinationDir = path.join(rawRoot, 'awards');
  await ensureDir(destinationDir);
  await writeJson(path.join(destinationDir, 'npb-awards-2002-2025.json'), rows);
  console.log(`Wrote ${rows.length} cached NPB award rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
