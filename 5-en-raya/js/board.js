/**
 * board.js — Lógica del tablero 15×15
 * Detección eficiente de 5 en línea
 */
const Board = (() => {
  const SIZE = 15;
  const EMPTY = 0;
  const DIRS = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal ↘
    [1, -1],  // diagonal ↙
  ];

  // ── CREACIÓN ──────────────────────────────────────────
  const create = () => Array.from({ length: SIZE }, () => new Array(SIZE).fill(EMPTY));

  const clone = (grid) => grid.map(row => [...row]);

  // ── UTILIDADES ──────────────────────────────────────
  const inBounds = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

  const isEmpty = (grid, r, c) => inBounds(r, c) && grid[r][c] === EMPTY;

  const place = (grid, r, c, player) => {
    if (!isEmpty(grid, r, c)) return false;
    grid[r][c] = player;
    return true;
  };

  // ── DETECCIÓN DE VICTORIA ────────────────────────────
  /**
   * Retorna null si no hay ganador,
   * o { player, cells: [[r,c],...] } con las 5 celdas ganadoras.
   */
  const checkWin = (grid, lastR, lastC) => {
    const player = grid[lastR][lastC];
    if (player === EMPTY) return null;

    for (const [dr, dc] of DIRS) {
      const cells = [[lastR, lastC]];

      // Extender en dirección positiva
      for (let i = 1; i < 5; i++) {
        const r = lastR + dr * i;
        const c = lastC + dc * i;
        if (inBounds(r, c) && grid[r][c] === player) cells.push([r, c]);
        else break;
      }
      // Extender en dirección negativa
      for (let i = 1; i < 5; i++) {
        const r = lastR - dr * i;
        const c = lastC - dc * i;
        if (inBounds(r, c) && grid[r][c] === player) cells.unshift([r, c]);
        else break;
      }

      if (cells.length >= 5) {
        return { player, cells: cells.slice(0, 5) };
      }
    }
    return null;
  };

  const isFull = (grid) => grid.every(row => row.every(cell => cell !== EMPTY));

  // ── MOVIMIENTOS DISPONIBLES ──────────────────────────
  /**
   * Genera celdas candidatas: celdas vacías adyacentes a fichas existentes.
   * Mucho más eficiente que iterar todo el tablero.
   */
  const getCandidates = (grid, radius = 2) => {
    const candidates = new Set();
    let hasStones = false;

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] !== EMPTY) {
          hasStones = true;
          for (let dr = -radius; dr <= radius; dr++) {
            for (let dc = -radius; dc <= radius; dc++) {
              const nr = r + dr;
              const nc = c + dc;
              if (inBounds(nr, nc) && grid[nr][nc] === EMPTY) {
                candidates.add(nr * SIZE + nc);
              }
            }
          }
        }
      }
    }

    if (!hasStones) {
      // Tablero vacío: devolver centro
      const mid = Math.floor(SIZE / 2);
      candidates.add(mid * SIZE + mid);
    }

    return [...candidates].map(k => [Math.floor(k / SIZE), k % SIZE]);
  };

  // ── EVALUACIÓN HEURÍSTICA ────────────────────────────
  const PATTERNS = {
    FIVE:        100000,
    OPEN_FOUR:    10000,
    BLOCKED_FOUR:  1000,
    OPEN_THREE:     500,
    BLOCKED_THREE:   50,
    OPEN_TWO:        10,
  };

  /**
   * Evalúa una línea de celdas para un jugador dado.
   */
  const evaluateLine = (line, player) => {
    const opp = player === 1 ? 2 : 1;
    let score = 0;
    const len = line.length;

    for (let i = 0; i < len; i++) {
      if (line[i] !== player) continue;

      // Contar consecutivos
      let count = 1;
      while (i + count < len && line[i + count] === player) count++;

      // Comprobar extremos
      const leftOpen  = i > 0 && line[i - 1] === EMPTY;
      const rightOpen = i + count < len && line[i + count] === EMPTY;
      const blocked   = !leftOpen && !rightOpen;

      if (count >= 5) score += PATTERNS.FIVE;
      else if (count === 4) {
        if (leftOpen && rightOpen) score += PATTERNS.OPEN_FOUR;
        else if (!blocked)         score += PATTERNS.BLOCKED_FOUR;
      } else if (count === 3) {
        if (leftOpen && rightOpen) score += PATTERNS.OPEN_THREE;
        else if (!blocked)         score += PATTERNS.BLOCKED_THREE;
      } else if (count === 2) {
        if (leftOpen && rightOpen) score += PATTERNS.OPEN_TWO;
      }

      i += count - 1;
    }
    return score;
  };

  /**
   * Evalúa todo el tablero para el jugador dado.
   */
  const evaluate = (grid, player) => {
    const opp = player === 1 ? 2 : 1;
    let score = 0;

    // Filas
    for (let r = 0; r < SIZE; r++) {
      score += evaluateLine(grid[r], player);
      score -= evaluateLine(grid[r], opp);
    }

    // Columnas
    for (let c = 0; c < SIZE; c++) {
      const col = grid.map(row => row[c]);
      score += evaluateLine(col, player);
      score -= evaluateLine(col, opp);
    }

    // Diagonales ↘
    for (let s = -(SIZE - 5); s <= SIZE - 5; s++) {
      const diag = [];
      for (let r = 0; r < SIZE; r++) {
        const c = r - s;
        if (inBounds(r, c)) diag.push(grid[r][c]);
      }
      if (diag.length >= 5) {
        score += evaluateLine(diag, player);
        score -= evaluateLine(diag, opp);
      }
    }

    // Diagonales ↙
    for (let s = 4; s < SIZE * 2 - 5; s++) {
      const diag = [];
      for (let r = 0; r < SIZE; r++) {
        const c = s - r;
        if (inBounds(r, c)) diag.push(grid[r][c]);
      }
      if (diag.length >= 5) {
        score += evaluateLine(diag, player);
        score -= evaluateLine(diag, opp);
      }
    }

    return score;
  };

  return Object.freeze({
    SIZE, EMPTY,
    create, clone,
    inBounds, isEmpty, place,
    checkWin, isFull,
    getCandidates, evaluate,
  });
})();
