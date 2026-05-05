import fs from 'node:fs/promises';
import path from 'node:path';
import { listCsvFiles, parseCsv, rawRoot, toNumber } from './_shared.js';

const DATASETS = [
  { key: 'registry', hasYear: false },
  { key: 'batting', hasYear: true },
  { key: 'pitching', hasYear: true },
  { key: 'fielding', hasYear: true },
  { key: 'awards', hasYear: true },
];

function isSampleFile(filePath) {
  const name = path.basename(filePath).toLowerCase();
  return name.startsWith('sample-') || name.endsWith('-template.csv') || name === '.gitkeep';
}

function formatCoverage(years) {
  if (years.length === 0) {
    return 'n/a';
  }

  return `${Math.min(...years)}-${Math.max(...years)}`;
}

async function inspectDataset({ key, hasYear }) {
  const directory = path.join(rawRoot, key);
  const files = await listCsvFiles(directory);
  const realFiles = files.filter((file) => !isSampleFile(file));
  const sampleFiles = files.filter((file) => isSampleFile(file));
  const reports = [];

  for (const file of realFiles) {
    const text = await fs.readFile(file, 'utf8');
    const rows = parseCsv(text);
    const headers = rows[0] ? Object.keys(rows[0]) : [];
    const years = hasYear
      ? rows
          .map((row) => toNumber(row.year ?? row.season ?? row.season_year ?? row.year_id ?? row.season_id))
          .filter((value) => Number.isInteger(value))
      : [];

    reports.push({
      file: path.relative(rawRoot, file),
      rowCount: rows.length,
      headers: headers.length,
      yearCoverage: formatCoverage(years),
    });
  }

  return {
    key,
    totalCsvFiles: files.length,
    realFileCount: realFiles.length,
    sampleFileCount: sampleFiles.length,
    reports,
  };
}

async function main() {
  console.log('Raw data audit');

  const datasets = await Promise.all(DATASETS.map(inspectDataset));
  const realFileTotal = datasets.reduce((sum, dataset) => sum + dataset.realFileCount, 0);

  datasets.forEach((dataset) => {
    console.log(`${dataset.key}: ${dataset.realFileCount} real file(s), ${dataset.sampleFileCount} sample/template file(s)`);

    if (dataset.reports.length === 0) {
      console.log('  no real historical CSVs detected');
      return;
    }

    dataset.reports.forEach((report) => {
      console.log(
        `  - ${report.file}: ${report.rowCount} rows, ${report.headers} headers` +
          (report.yearCoverage !== 'n/a' ? `, years ${report.yearCoverage}` : ''),
      );
    });
  });

  if (realFileTotal === 0) {
    console.log('No real historical raw files are present yet. The pipeline is still running on sample data only.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
