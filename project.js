const prompt = require("prompt-sync")();

// --- GLOBALS ---

// rows and cols
const ROWS = 3;
const COLS = 3;
// different symbols and their occurences in each wheel
const SYMBOLS_COUNT = {
  A: 2,
  B: 4,
  C: 6,
  D: 8,
};
// symbols and their multiplier values
const SYMBOL_VALUES = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
};

const deposit = () => {
  const depositAmount = prompt("Enter a deposit amount: ");
  // default return value from prompt is string
  const numberDepositAmount = parseFloat(depositAmount);

  if (isNaN(numberDepositAmount) || numberDepositAmount <= 0) {
    console.log("Invalid deposit amount, try again.");
    return deposit();
  }

  return numberDepositAmount;
};

const getNumberOfLines = () => {
  const numOflines = prompt("Enter the number of lines to bet on (1-3): ");
  const lines = parseFloat(numOflines);

  if (isNaN(lines) || lines <= 0 || lines > 3) {
    console.log("Invalid number of lines, enter again.");
    return getNumberOfLines();
  }

  return lines;
};

const getBet = (balance, lines) => {
  const bet = prompt("Enter the total bet per line: ");
  const numberBet = parseFloat(bet);

  if (isNaN(numberBet) || numberBet <= 0 || numberBet > balance / lines) {
    console.log("Invalid bet amount, enter again.");
    return getBet(balance, lines);
  }

  return numberBet;
};

const spin = () => {
  // generate reels
  const symbols = [];

  for (const [symbol, count] of Object.entries(SYMBOLS_COUNT)) {
    for (let i = 0; i < count; i++) {
      symbols.push(symbol);
    }
  }
  // each array is a column inside the slot machine
  const reels = [[], [], []];

  for (let i = 0; i < COLS; i++) {
    // loop through each column
    const reelSymbols = [...symbols]; // copy of symbols array - each reel has their own symbols
    for (let j = 0; j < ROWS; j++) {
      // loop through each row
      const randomIndex = Math.floor(Math.random() * reelSymbols.length);
      const selectedSymbol = symbols[randomIndex];
      reels[i].push(selectedSymbol);
      reelSymbols.splice(randomIndex, 1); // remove the selected symbol from the reelSymbols array
    }
  }
  return reels;
};

const transpose = (reels) => {
  const rows = [];

  for (let i = 0; i < ROWS; i++) {
    rows.push([]);

    for (let j = 0; j < COLS; j++) {
      rows[i].push(reels[j][i]);
    }
  }

  return rows;
};

const printRows = (rows) => {
  for (const row of rows) {
    let rowString = "";
    for (const [i, symbol] of row.entries()) {
      rowString += symbol;
      if (i != row.length - 1) {
        rowString += " | ";
      }
    }
    console.log(rowString);
  }
};

const getWinnings = (rows, bet, lines) => {
  let winnings = 0;
  for (let row = 0; row < lines; row++) {
    // Check for winning combinations in each row
    const symbols = rows[row];
    let allSame = true;
    for (const symbol of symbols) {
      if (symbol !== symbols[0]) {
        allSame = false;
        break;
      }
    }
    if (allSame) {
      winnings += bet * SYMBOL_VALUES[symbols[0]];
    }
  }
  return winnings;
};

const game = () => {
  let balance = deposit();

  while (true) {
    console.log("Your balance is: $" + balance);
    const lines = getNumberOfLines();
    const bet = getBet(balance, lines);

    balance -= bet * lines;

    const reels = spin();
    const rows = transpose(reels);
    printRows(rows);
    const winnings = getWinnings(rows, bet, lines);
    balance += winnings;
    console.log(`You won $${winnings}.`);

    if (balance <= 0) {
      console.log("You ran out of money!");
      break;
    }

    const playAgain = prompt("Do you want to play again (y/n)? ");
    if (playAgain != "y") break;
  }
};

game();
