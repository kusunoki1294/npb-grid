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

If you later add real CSV files under `data/raw/`, rebuild processed data with:

```bash
npm run data:build
```

## Data pipeline

- `data/raw/`: manually downloaded batting, pitching, fielding, awards, and registry CSV files
- `data/processed/players.json`: stable player records used by the app
- `data/processed/battingSeasons.json`: normalized batting season rows
- `data/processed/pitchingSeasons.json`: normalized pitching season rows
- `data/processed/fieldingSeasons.json`: normalized fielding season rows
- `data/processed/careerStats.json`: career totals built from season rows
- `data/processed/eligibility.json`: category-to-player lookup table used for validation

## Main files

- `src/App.jsx`: main game state, bilingual UI, and interactions
- `src/components/GridBoard.jsx`: 3x3 board rendering
- `src/data/categories.js`: category definitions and random grid generation
- `src/data/teamAliases.js`: franchise normalization helpers
- `src/lib/validateAnswer.js`: processed-data validation helpers
- `scripts/importRawStats.js`: CSV importer
- `scripts/buildCareerStats.js`: career stat builder
- `scripts/buildCategoryEligibility.js`: category eligibility builder
