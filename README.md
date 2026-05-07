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

## Deployment note

The app now supports shareable archive URLs through query parameters instead of path-based routing.

- Daily board URL: `?date=YYYY-MM-DD`
- Archive view URL: `?view=archive`
- English locale URL: `?lang=en`

This is intentional for a future Vercel deployment: query-string navigation works on a static Vite deploy without adding SPA rewrite rules.
If you later switch the archive to path-based routes, add a Vercel rewrite so all app routes fall back to `index.html`.

## Deploy on Vercel

This project is ready to deploy to Vercel as a static Vite app.

1. Import the GitHub repo into Vercel.
2. Let Vercel detect the framework as `Vite`.
3. Use the default build settings:
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add these project environment variables in Vercel if you want Supabase auth and synced daily history:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

Because archive sharing uses query parameters like `?date=2026-05-05&lang=en`, no Vercel SPA rewrite is required for the current app.

If Supabase auth is enabled for the deployed site:

- Set Supabase `Site URL` to your production Vercel domain.
- Add local and preview redirect URLs in Supabase, especially if you later add OAuth or passwordless flows.
- For Vercel previews, a wildcard like `https://*-<your-team-or-account>.vercel.app/**` is the standard pattern in Supabase docs.

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

It also creates a `get_daily_leaderboard(date)` SQL function for future leaderboard use.
The public leaderboard is currently disabled in the app until server-side result verification is added.

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

## Historical data status

- Imported players now include Japanese names from the ProEyeKyuu registry, so Japanese mode no longer falls back to English-only imported names for those players.

- Historical awards are written to `data/processed/playerAwards.json`.
  Coverage now reaches the official yearly archive back to 1936 for MVP, Rookie of the Year, and the major batting/pitching title categories.
  Best Nine, Golden Glove, Sawamura, Saves, and Holds still depend on the newer 2002+ award pages, and the current backfill leaves 2 archive rows unresolved because those players do not match the imported player records yet.

## Next TODO

- Backfill the remaining pre-2002 award types that are not present in the yearly archive pages.
  The current pipeline now handles older league-leader pages, but pre-2002 Best Nine, Golden Glove, Sawamura, Saves, and Holds are still incomplete.
  Future work: find authoritative older sources for those award pages and close the last 2 unresolved yearly-archive player matches.

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
