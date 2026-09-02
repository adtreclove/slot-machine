# Lucky Spins

A slot machine web app built with React and Vite, converted from a Node.js CLI game tutorial.

## Features

Deposit money, pick paylines, spin, and win. Selectable game modes, each with its own grid size, symbols, payouts, and payline shapes (rows, diagonals, zigzags).

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`).

### Requirements

- Node.js and npm
- This project uses [Tailwind CSS v4](https://tailwindcss.com/) via `@tailwindcss/vite` — no separate PostCSS config needed.

## How it works

### Game modes

Each entry in `GAME_MODES` is a self-contained ruleset:

```js
classic: {
  name: "Classic",
  rows: 3,
  cols: 3,
  symbolCounts: { A: 2, B: 4, C: 6, D: 8 },   // how many of each symbol are in the pool
  symbolValues: { A: 5, B: 4, C: 3, D: 2 },   // payout multiplier per symbol
  symbolIcons: { A: "💎", B: "🔔", C: "🍋", D: "🍒" },
  paylines: [rowLine(1, 3), rowLine(0, 3), rowLine(2, 3)],
}
```

- **`rows` / `cols`** set the grid size. Modes can have different dimensions from each other (e.g. a wide 4×5 mode, a tall 5×3 mode).
- **`symbolCounts`** controls the odds — fewer copies of a symbol means it's rarer.
- **`symbolValues`** is the payout multiplier applied to the bet when a line matches that symbol.
- **`paylines`** is a list of paths across the grid (see below).

`GAME_MODES` are expandable, only need to add a new mode configuration. Nothing else in the code needs to change.

### Paylines

A payline is a list of `[row, col]` cells, one per column, read left to right. This is what makes non-straight lines possible — a diagonal or zigzag is just a different list of coordinates, checked by the same win logic as a straight row.

Helper functions generate common shapes for whatever grid size a mode uses:

| Helper                          | Produces                                        |
| ------------------------------- | ----------------------------------------------- |
| `rowLine(row, cols)`            | A straight horizontal line across the given row |
| `diagonalDown(rows, cols)`      | Top-left to bottom-right diagonal               |
| `diagonalUp(rows, cols)`        | Bottom-left to top-right diagonal               |
| `zigzag(cols, highRow, lowRow)` | Alternates between two rows each column         |

Custom shapes are possible — any array of `[row, col]` pairs, one per column, is valid:

```js
const customLine = [
  [0, 0],
  [2, 1],
  [1, 2],
];
```

### Core game logic

These functions are pure (no state, no side effects) and mirror the original CLI script's structure:

- **`spin(mode)`** — builds the weighted symbol pool from `symbolCounts` and randomly fills each reel.
- **`transpose(reels, mode)`** — converts column-based reels into row-based rows for display and checking.
- **`getWinningLines(rows, mode, lines)`** — checks the first N active paylines and returns which ones matched.
- **`getWinnings(rows, bet, mode, winningLines)`** — sums the payout for all matched lines.

### Payline visualization

The board overlays an SVG on top of the symbol grid. Each payline's cells are converted to pixel-space points (`linePoints`) and drawn as a `<polyline>`, so a diagonal or zigzag payline is shown as a literal line across the reels rather than a highlighted border.

- **Preview lines** (light, colored, temporary) appear for ~1.8 seconds whenever you change the line count or switch modes, or when you tap the "LINES" label. Multiple simultaneous lines get different colors so overlapping paylines stay distinguishable.
- **Winning lines** (gold, persistent until the next spin) appear after a spin resolves, showing exactly which paylines paid out.

## Known limitations

- All balance and game state live in memory — refreshing the page resets everything.
- The RNG and payout math run entirely client-side. For a real slot machine, that logic would need to move server-side so it can't be inspected or manipulated in the browser.
- On non-square grids (e.g. 4×5 or 5×3 modes), the SVG payline overlay stretches to fill the grid's aspect ratio, so stroke width can look marginally thicker on one axis than the other.
