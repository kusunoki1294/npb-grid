import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { processedRoot } from './_shared.js';

const databasePath = path.join(processedRoot, 'npb.sqlite');

function runSql(sql) {
  return execFileSync(
    '/usr/bin/sqlite3',
    ['-header', '-column', databasePath, sql],
    { encoding: 'utf8' },
  ).trim();
}

function sqlValue(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function printUsage() {
  console.log(`Usage:
  npm run db:query -- categories [pattern]
  npm run db:query -- category <category_id> [limit]
  npm run db:query -- intersect <category_id_a> <category_id_b> [limit]
  npm run db:query -- player <player_id_or_name>

Examples:
  npm run db:query -- categories mvp
  npm run db:query -- category team:yomiuri-giants
  npm run db:query -- intersect team:yomiuri-giants award:mvp-winner
  npm run db:query -- player sadaharu-oh
  npm run db:query -- player "王 貞治"`);
}

function queryCategories(pattern) {
  const where = pattern
    ? `WHERE category_id LIKE '%' || ${sqlValue(pattern)} || '%'`
    : '';

  return runSql(`
    SELECT
      category_id,
      COUNT(*) AS eligible_players
    FROM category_eligibility
    ${where}
    GROUP BY category_id
    ORDER BY category_id;
  `);
}

function queryCategory(categoryId, limit = 25) {
  return runSql(`
    SELECT
      p.id,
      p.name_en,
      COALESCE(p.name_ja, '') AS name_ja
    FROM category_eligibility ce
    JOIN players p ON p.id = ce.player_id
    WHERE ce.category_id = ${sqlValue(categoryId)}
    ORDER BY p.name_en
    LIMIT ${Number(limit)};
  `);
}

function queryIntersection(categoryA, categoryB, limit = 25) {
  return runSql(`
    SELECT
      p.id,
      p.name_en,
      COALESCE(p.name_ja, '') AS name_ja
    FROM players p
    JOIN category_eligibility a ON a.player_id = p.id
    JOIN category_eligibility b ON b.player_id = p.id
    WHERE a.category_id = ${sqlValue(categoryA)}
      AND b.category_id = ${sqlValue(categoryB)}
    ORDER BY p.name_en
    LIMIT ${Number(limit)};
  `);
}

function queryPlayer(playerQuery) {
  return runSql(`
    SELECT
      p.id,
      p.name_en,
      COALESCE(p.name_ja, '') AS name_ja,
      p.bats,
      p.throws,
      COALESCE(p.birth_country, '') AS birth_country,
      p.played_in_mlb,
      p.hall_of_fame,
      p.meikyukai,
      p.switch_hitter
    FROM players p
    WHERE p.id = ${sqlValue(playerQuery)}
       OR p.name_en = ${sqlValue(playerQuery)}
       OR p.name_ja = ${sqlValue(playerQuery)};
  `);
}

function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  let output = '';

  switch (command) {
    case 'categories':
      output = queryCategories(args[0]);
      break;
    case 'category':
      if (!args[0]) {
        printUsage();
        process.exitCode = 1;
        return;
      }
      output = queryCategory(args[0], args[1] ?? 25);
      break;
    case 'intersect':
      if (!args[0] || !args[1]) {
        printUsage();
        process.exitCode = 1;
        return;
      }
      output = queryIntersection(args[0], args[1], args[2] ?? 25);
      break;
    case 'player':
      if (!args[0]) {
        printUsage();
        process.exitCode = 1;
        return;
      }
      output = queryPlayer(args.join(' '));
      break;
    default:
      printUsage();
      process.exitCode = 1;
      return;
  }

  console.log(output || '(no rows)');
}

main();
