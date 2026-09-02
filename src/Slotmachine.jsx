import { useState, useEffect } from "react";

// LINE-SHAPE HELPERS
// A payline is a list of [row, col] cells, one per column
const rowLine = (row, cols) => Array.from({ length: cols }, (_, c) => [row, c]);

const diagonalDown = (rows, cols) =>
  Array.from({ length: cols }, (_, c) => [
    Math.round((c / (cols - 1)) * (rows - 1)),
    c,
  ]);

const diagonalUp = (rows, cols) =>
  Array.from({ length: cols }, (_, c) => [
    rows - 1 - Math.round((c / (cols - 1)) * (rows - 1)),
    c,
  ]);

const zigzag = (cols, highRow, lowRow) =>
  Array.from({ length: cols }, (_, c) => [c % 2 === 0 ? highRow : lowRow, c]);

// --- GAME MODES ---
// Each mode is a self-contained ruleset: its own grid size, symbols, payouts, icons and paylines.
const GAME_MODES = {
  classic: {
    name: "Classic",
    rows: 3,
    cols: 3,
    symbolCounts: { A: 2, B: 4, C: 6, D: 8 },
    symbolValues: { A: 5, B: 4, C: 3, D: 2 },
    symbolIcons: {
      A: "\u{1F48E}",
      B: "\u{1F514}",
      C: "\u{1F34B}",
      D: "\u{1F352}",
    }, // diamond, bell, lemon, cherry
    paylines: [rowLine(1, 3), rowLine(0, 3), rowLine(2, 3)],
  },
  fruit: {
    name: "Fruit frenzy",
    rows: 4,
    cols: 5,
    symbolCounts: { W: 1, G: 3, O: 5, P: 6, M: 9 },
    symbolValues: { W: 10, G: 6, O: 4, P: 3, M: 2 },
    symbolIcons: {
      W: "\u{1F349}", // watermelon
      G: "\u{1F347}", // grapes
      O: "\u{1F34A}", // orange
      P: "\u{1F350}", // pear
      M: "\u{1F353}", // strawberry
    },
    // wider than tall (5 cols, 4 rows) — diagonals and zigzag stretch across the extra columns
    paylines: [
      rowLine(1, 5),
      rowLine(2, 5),
      rowLine(0, 5),
      rowLine(3, 5),
      diagonalDown(4, 5),
      diagonalUp(4, 5),
      zigzag(5, 0, 3),
    ],
  },
  space: {
    name: "Space odyssey",
    rows: 5,
    cols: 3,
    symbolCounts: { S: 1, R: 3, P: 5, C: 6, A: 9 },
    symbolValues: { S: 12, R: 6, P: 4, C: 3, A: 2 },
    symbolIcons: {
      S: "\u{1F6F8}", // ufo (jackpot)
      R: "\u{1F680}", // rocket
      P: "\u{1FA90}", // ringed planet
      C: "\u2604\uFE0F", // comet
      A: "\u2B50", // star
    },
    // taller than wide (5 rows, 3 cols)
    paylines: [
      rowLine(2, 3),
      rowLine(1, 3),
      rowLine(3, 3),
      rowLine(0, 3),
      rowLine(4, 3),
      diagonalDown(5, 3),
      diagonalUp(5, 3),
    ],
  },
};

// PURE GAME LOGIC

const spin = (mode) => {
  const symbols = [];
  for (const [symbol, count] of Object.entries(mode.symbolCounts)) {
    for (let i = 0; i < count; i++) symbols.push(symbol);
  }

  const reels = [];
  for (let i = 0; i < mode.cols; i++) {
    const reelSymbols = [...symbols];
    const reel = [];
    for (let j = 0; j < mode.rows; j++) {
      const randomIndex = Math.floor(Math.random() * reelSymbols.length);
      reel.push(reelSymbols[randomIndex]);
      reelSymbols.splice(randomIndex, 1);
    }
    reels.push(reel);
  }
  return reels;
};

// make the reels into rows for UI
const transpose = (reels, mode) => {
  const rows = [];
  for (let i = 0; i < mode.rows; i++) {
    rows.push([]);
    for (let j = 0; j < mode.cols; j++) rows[i].push(reels[j][i]);
  }
  return rows;
};

const getWinningLines = (rows, mode, lines) => {
  const activeLines = mode.paylines.slice(0, lines);
  const winners = [];
  for (const line of activeLines) {
    const cellValues = line.map(([r, c]) => rows[r][c]);
    const allSame = cellValues.every((s) => s === cellValues[0]);
    if (allSame) winners.push(line);
  }
  return winners;
};

const getWinnings = (rows, bet, mode, winningLines) => {
  let winnings = 0;
  for (const line of winningLines) {
    const [r, c] = line[0];
    winnings += bet * mode.symbolValues[rows[r][c]];
  }
  return winnings;
};

const randomSymbol = (mode) => {
  const all = Object.keys(mode.symbolIcons);
  return all[Math.floor(Math.random() * all.length)];
};

const blankGrid = (mode) =>
  Array.from({ length: mode.rows }, () =>
    Array.from({ length: mode.cols }, () => randomSymbol(mode)),
  );

const LINE_COLORS = [
  "#4fc3f7",
  "#ff8a65",
  "#ba68c8",
  "#81c784",
  "#fff176",
  "#f06292",
  "#a1887f",
];
const WIN_COLOR = "#ffd54f";

const linePoints = (line) =>
  line.map(([r, c]) => `${c + 0.5},${r + 0.5}`).join(" ");

export default function SlotMachine() {
  const [modeKey, setModeKey] = useState("classic");
  const mode = GAME_MODES[modeKey];

  const [balance, setBalance] = useState(0);
  const [depositInput, setDepositInput] = useState("");
  const [hasDeposited, setHasDeposited] = useState(false);

  const [lines, setLines] = useState(GAME_MODES.classic.paylines.length);
  const [bet, setBet] = useState(1);

  const [grid, setGrid] = useState(blankGrid(GAME_MODES.classic));
  const [winningLines, setWinningLines] = useState([]); // array of payline cell-arrays, drawn as lines
  const [previewLines, setPreviewLines] = useState([]); // array of payline cell-arrays, briefly shown on change
  const [message, setMessage] = useState("Deposit to start playing.");
  const [spinning, setSpinning] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const maxBetPerLine =
    lines > 0 ? Math.floor((balance / lines) * 100) / 100 : 0;
  const maxLines = mode.paylines.length;

  const showLinePreview = () => {
    setPreviewLines(mode.paylines.slice(0, lines));
    setTimeout(() => setPreviewLines([]), 1800);
  };

  // Show the active paylines on the board for a couple seconds whenever the
  // player changes how many lines they're betting on, or switches modes.
  useEffect(() => {
    if (!hasDeposited) return;
    showLinePreview();
  }, [lines, modeKey, hasDeposited]);

  const handleModeChange = (key) => {
    if (spinning) return;
    setModeKey(key);
    const newMode = GAME_MODES[key];
    setLines(newMode.paylines.length);
    setGrid(blankGrid(newMode));
    setWinningLines([]);
    setMessage(`Switched to ${newMode.name}.`);
  };

  const handleDeposit = () => {
    const amount = parseFloat(depositInput);
    if (isNaN(amount) || amount <= 0) {
      setMessage("Enter a valid deposit amount.");
      return;
    }
    setBalance(amount);
    setHasDeposited(true);
    setGameOver(false);
    setMessage("Choose your lines and bet, then spin.");
  };

  const changeLines = (delta) => {
    setLines((l) => Math.min(maxLines, Math.max(1, l + delta)));
  };

  const changeBet = (delta) => {
    setBet((b) => {
      const next = Math.max(0.5, Math.round((b + delta) * 100) / 100);
      return next;
    });
  };

  const handleSpin = () => {
    const totalBet = bet * lines;

    if (spinning || gameOver) return;
    if (isNaN(bet) || bet <= 0) {
      setMessage("Enter a valid bet.");
      return;
    }
    if (totalBet > balance) {
      setMessage("You can't bet more than your balance.");
      return;
    }

    setSpinning(true);
    setWinningLines([]);
    setPreviewLines([]);
    setMessage("Spinning...");
    setBalance((b) => b - totalBet);

    // spin animation
    let ticks = 0;
    const interval = setInterval(() => {
      setGrid(blankGrid(mode));
      ticks += 1;
      if (ticks >= 8) {
        clearInterval(interval);

        const reels = spin(mode);
        const rows = transpose(reels, mode);
        const winners = getWinningLines(rows, mode, lines);
        const winnings = getWinnings(rows, bet, mode, winners);

        setGrid(rows);
        setWinningLines(winners);
        setBalance((b) => {
          const newBalance = b + winnings;
          if (newBalance <= 0) {
            setGameOver(true);
            setMessage("You ran out of money! Deposit again to keep playing.");
          } else {
            setMessage(
              winnings > 0
                ? `You won $${winnings.toFixed(2)}!`
                : "No win this spin.",
            );
          }
          return newBalance;
        });
        setSpinning(false);
      }
    }, 80);
  };

  const handleNewDeposit = () => {
    setHasDeposited(false);
    setDepositInput("");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-neutral-900 p-6">
      <div
        className="w-full max-w-md rounded-3xl p-6 shadow-2xl"
        style={{
          background: "linear-gradient(180deg, #3b2418 0%, #241209 100%)",
          border: "6px solid #b8862f",
        }}
      >
        {/* Nameplate */}
        <div className="text-center mb-4">
          <div
            className="inline-block px-4 py-1 rounded-full text-sm tracking-wide font-bold"
            style={{ background: "#b8862f", color: "#241209" }}
          >
            LUCKY SPINS
          </div>
        </div>

        {/* Balance readout */}
        <div
          className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between font-mono"
          style={{ background: "#0d0d0d", border: "2px solid #b8862f" }}
        >
          <span className="text-amber-400 text-xs">BALANCE</span>
          <span className="text-amber-300 text-2xl font-bold">
            ${balance.toFixed(2)}
          </span>
        </div>

        {/* Mode picker */}
        <div className="flex gap-2 mb-4">
          {Object.entries(GAME_MODES).map(([key, m]) => (
            <button
              key={key}
              onClick={() => handleModeChange(key)}
              disabled={spinning}
              className="flex-1 rounded-lg py-2 text-xs font-bold"
              style={{
                background: modeKey === key ? "#c98a2b" : "#241209",
                color: modeKey === key ? "#241209" : "#c98a2b",
                border: "2px solid #b8862f",
              }}
            >
              {m.name}
            </button>
          ))}
        </div>

        {!hasDeposited ? (
          <div className="space-y-3">
            <input
              type="number"
              value={depositInput}
              onChange={(e) => setDepositInput(e.target.value)}
              placeholder="Deposit amount"
              className="w-full rounded-lg px-3 py-2 text-center font-mono"
              style={{ background: "#f4e9d8", border: "2px solid #b8862f" }}
            />
            <button
              onClick={handleDeposit}
              className="w-full rounded-lg py-2 font-bold text-lg"
              style={{ background: "#c98a2b", color: "#241209" }}
            >
              Deposit
            </button>
            <p className="text-center text-amber-200 text-sm">{message}</p>
          </div>
        ) : (
          <>
            {/* Reel window */}
            <div
              className="relative rounded-xl p-3 mb-4"
              style={{ background: "#0f3d2e", border: "3px solid #0a2a20" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${mode.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${mode.rows}, 1fr)`,
                }}
              >
                {grid.map((row, r) =>
                  row.map((symbol, c) => {
                    const symbolSize = mode.cols > 3 ? "text-2xl" : "text-4xl";
                    return (
                      <div
                        key={`${r}-${c}`}
                        className="flex items-center justify-center py-1"
                      >
                        <span className={`${symbolSize} leading-none`}>
                          {mode.symbolIcons[symbol]}
                        </span>
                      </div>
                    );
                  }),
                )}
              </div>

              {/* Payline overlay: real lines drawn through each cell's center, not cell borders */}
              <svg
                viewBox={`0 0 ${mode.cols} ${mode.rows}`}
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none"
              >
                {previewLines.map((line, i) => (
                  <polyline
                    key={`preview-${i}`}
                    points={linePoints(line)}
                    fill="none"
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={0.06}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.85}
                    style={{ transition: "opacity 0.4s" }}
                  />
                ))}
                {winningLines.map((line, i) => (
                  <polyline
                    key={`win-${i}`}
                    points={linePoints(line)}
                    fill="none"
                    stroke={WIN_COLOR}
                    strokeWidth={0.08}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.95}
                  />
                ))}
              </svg>
            </div>

            {/* Message */}
            <p className="text-center text-amber-200 text-sm mb-4 h-5">
              {message}
            </p>

            {/* Controls */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div
                className="rounded-lg px-3 py-2 flex items-center justify-between"
                style={{ background: "#f4e9d8", border: "2px solid #b8862f" }}
              >
                <button
                  onClick={() => changeLines(-1)}
                  disabled={spinning}
                  className="font-bold px-2"
                >
                  -
                </button>
                <div
                  className="text-center cursor-pointer"
                  onClick={showLinePreview}
                >
                  <div className="text-[10px] text-neutral-500">
                    LINES (tap to preview)
                  </div>
                  <div className="font-mono font-bold">
                    {lines} / {maxLines}
                  </div>
                </div>
                <button
                  onClick={() => changeLines(1)}
                  disabled={spinning}
                  className="font-bold px-2"
                >
                  +
                </button>
              </div>

              <div
                className="rounded-lg px-3 py-2 flex items-center justify-between"
                style={{ background: "#f4e9d8", border: "2px solid #b8862f" }}
              >
                <button
                  onClick={() => changeBet(-0.5)}
                  disabled={spinning}
                  className="font-bold px-2"
                >
                  -
                </button>
                <div className="text-center">
                  <div className="text-[10px] text-neutral-500">BET / LINE</div>
                  <div className="font-mono font-bold">${bet.toFixed(2)}</div>
                </div>
                <button
                  onClick={() => changeBet(0.5)}
                  disabled={spinning}
                  className="font-bold px-2"
                >
                  +
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-amber-200/70 mb-3">
              Total bet: ${(bet * lines).toFixed(2)} &middot; Max bet/line: $
              {maxBetPerLine.toFixed(2)}
            </p>

            {!gameOver ? (
              <button
                onClick={handleSpin}
                disabled={spinning}
                className="w-full rounded-full py-3 font-bold text-lg disabled:opacity-60"
                style={{ background: "#c98a2b", color: "#241209" }}
              >
                {spinning ? "Spinning..." : "SPIN"}
              </button>
            ) : (
              <button
                onClick={handleNewDeposit}
                className="w-full rounded-full py-3 font-bold text-lg"
                style={{ background: "#c98a2b", color: "#241209" }}
              >
                Deposit again
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
