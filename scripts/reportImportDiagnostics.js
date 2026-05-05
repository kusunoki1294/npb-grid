import fs from 'node:fs/promises';
import path from 'node:path';
import { processedRoot } from './_shared.js';

function printDataset(label, reports = [], skippedRows = [], rowCount = 0) {
  console.log(`${label}: ${rowCount} imported rows`);

  if (reports.length === 0) {
    console.log('  no files');
    return;
  }

  reports.forEach((report) => {
    const requiredMissing = report.required?.missing ?? [];
    const recommendedMissing = report.recommended?.missing ?? [];

    console.log(
      `  - ${report.file}: ${report.importedRows}/${report.rowCount} rows imported` +
        (report.skippedRowCount ? `, ${report.skippedRowCount} skipped` : ''),
    );

    if (requiredMissing.length > 0) {
      console.log(`    missing required headers: ${requiredMissing.join(', ')}`);
    }

    if (recommendedMissing.length > 0) {
      console.log(`    missing recommended headers: ${recommendedMissing.join(', ')}`);
    }
  });

  if (skippedRows.length > 0) {
    console.log(`  skipped row details: ${skippedRows.length} total`);
  }
}

async function main() {
  const diagnosticsPath = path.join(processedRoot, 'importDiagnostics.json');
  const diagnostics = JSON.parse(await fs.readFile(diagnosticsPath, 'utf8'));
  const datasets = ['registry', 'batting', 'pitching', 'fielding', 'awards'];

  console.log(`Import diagnostics: ${diagnostics.generatedAt}`);
  console.log(`Players: ${diagnostics.rowCounts.players}`);

  datasets.forEach((dataset) => {
    printDataset(
      dataset,
      diagnostics.files?.[dataset] ?? [],
      diagnostics.skippedRows?.[dataset] ?? [],
      diagnostics.rowCounts?.[dataset] ?? 0,
    );
  });

  if ((diagnostics.identityCollisions ?? []).length > 0) {
    console.log(`Identity collisions: ${diagnostics.identityCollisions.length}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
