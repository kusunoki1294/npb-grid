Place manually downloaded CSV files in these folders:

- `data/raw/batting/`: batting season CSVs
- `data/raw/pitching/`: pitching season CSVs
- `data/raw/fielding/`: fielding season CSVs
- `data/raw/awards/`: awards and title CSVs
- `data/raw/registry/`: player registry / bio CSVs

The import scripts are intentionally flexible about column names. If your CSVs use
different headers, update the candidate column lists inside `scripts/importRawStats.js`.
