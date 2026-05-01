# NPB Immaculate Grid MVP

Simple React + Vite prototype for an NPB daily grid game.

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Main files

- `src/data/players.js`: local sample NPB player dataset
- `src/data/grids.js`: row/column category definitions and sample grid rotation
- `src/game/validation.js`: reusable answer checking and duplicate-player logic
- `src/App.jsx`: main game state and interactions
- `src/components/GridBoard.jsx`: 3x3 board rendering
