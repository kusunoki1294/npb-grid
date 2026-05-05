# NPB Grid MVP

Simple React + Vite prototype for an NPB daily grid game with a local data pipeline.

## Run locally

```bash
npm install
npm run data:bootstrap
npm run data:career
npm run data:eligibility
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Supabase auth setup

The account modal now supports real Supabase Auth.

1. Copy `.env.example` to `.env`
2. Fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Restart `npm run dev`

Without those env vars, the auth modal still opens but shows a configuration notice instead of connecting to a backend.

## Supabase daily result storage

To save each signed-in user's daily puzzle progress, run the SQL in:

- `db/supabase-daily-results.sql`

Use the Supabase SQL Editor, paste the file contents, and run it once for your project.

This creates a `daily_results` table with row-level security so each authenticated user can only read and write their own daily rows.

It also creates a `get_daily_leaderboard(date)` SQL function that powers the daily final-score leaderboard shown in the app.

If you later add real CSV files under `data/raw/`, rebuild processed data with:

```bash
npm run data:audit-raw
npm run data:build
npm run data:diagnostics
```

For the first real import pass, start with:

- [data/raw/FIRST_IMPORT_GUIDE.md](/Users/shugo/Desktop/npb/data/raw/FIRST_IMPORT_GUIDE.md)
- [data/raw/registry/registry-template.csv](/Users/shugo/Desktop/npb/data/raw/registry/registry-template.csv)
- [data/raw/batting/batting-template.csv](/Users/shugo/Desktop/npb/data/raw/batting/batting-template.csv)

`data:diagnostics` prints a compact summary from [data/processed/importDiagnostics.json](/Users/shugo/Desktop/npb/data/processed/importDiagnostics.json), including skipped rows, missing headers, and player-ID collisions.
`data:audit-raw` checks whether real historical CSVs are actually present under `data/raw/` and shows row counts plus year coverage before you import.

## Data pipeline

- `data/raw/`: manually downloaded batting, pitching, fielding, awards, and registry CSV files
- `data/processed/players.json`: stable player records used by the app
- `data/processed/battingSeasons.json`: normalized batting season rows
- `data/processed/pitchingSeasons.json`: normalized pitching season rows
- `data/processed/fieldingSeasons.json`: normalized fielding season rows
- `data/processed/careerStats.json`: career totals built from season rows
- `data/processed/eligibility.json`: category-to-player lookup table used for validation
- `data/processed/importDiagnostics.json`: import health report for skipped rows, header coverage, and identity collisions

## Main files

- `src/App.jsx`: main game state, bilingual UI, and interactions
- `src/components/GridBoard.jsx`: 3x3 board rendering
- `src/data/categories.js`: category definitions and random grid generation
- `src/data/teamAliases.js`: franchise normalization helpers
- `src/lib/validateAnswer.js`: processed-data validation helpers
- `scripts/importRawStats.js`: CSV importer
- `scripts/reportImportDiagnostics.js`: human-readable import diagnostics summary
- `scripts/buildCareerStats.js`: career stat builder
- `scripts/buildCategoryEligibility.js`: category eligibility builder
