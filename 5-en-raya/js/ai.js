/**
 * ai.js — IA con Minimax + poda alfa-beta
 * Optimizada con candidatos y evaluación heurística
 */
const AI = (() => {
  const DIFFICULTY = {
    easy:   { depth: 1, randomness: 0.35 },
    medium: { depth: 2, randomness: 0.05 },
    hard:   { depth: 2, randomness: 0.00 },
  };

  // Valor de victoria terminal
  const WIN_SCORE  = 1_000_000;
  const LOSS_SCORE = -1_000_000;

  /**
   * Minimax con poda alfa-beta.
   * @param {number[][]} grid    - Estado del tablero
   * @param {number}     depth   - Profundidad restante
   * @param {number}     alpha   - Mejor para maximizer
   * @param {number}     beta    - Mejor para minimizer
   * @param {boolean}    isMax   - ¿Es turno del maximizer?
   * @param {number}     aiP     - Jugador de la IA (1 o 2)
   * @param {number}     humanP  - Jugador humano
   * @returns {number} Puntuación heurística
   */
  const minimax = (grid, depth, alpha, beta, isMax, aiP, humanP) => {
    if (depth === 0) {
      return Board.evaluate(grid, aiP);
    }

    const moves = Board.getCandidates(grid, 2);
    if (moves.length === 0) return 0;

    if (isMax) {
      let best = -Infinity;
      for (const [r, c] of moves) {
        grid[r][c] = aiP;
        const win = Board.checkWin(grid, r, c);
        let score;
        if (win) {
          score = WIN_SCORE + depth; // Ganar antes es mejor
        } else {
          score = minimax(Board.clone(grid), depth - 1, alpha, beta, false, aiP, humanP);
        }
        grid[r][c] = Board.EMPTY;
        best = Math.max(best, score);
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break; // Poda
        if (win) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const [r, c] of moves) {
        grid[r][c] = humanP;
        const win = Board.checkWin(grid, r, c);
        let score;
        if (win) {
          score = LOSS_SCORE - depth;
        } else {
          score = minimax(Board.clone(grid), depth - 1, alpha, beta, true, aiP, humanP);
        }
        grid[r][c] = Board.EMPTY;
        best = Math.min(best, score);
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
        if (win) break;
      }
      return best;
    }
  };

  /**
   * Obtiene el mejor movimiento para la IA.
   * @param {number[][]} grid       - Estado actual
   * @param {number}     aiPlayer   - 1 o 2
   * @param {string}     difficulty - 'easy'|'medium'|'hard'
   * @returns {[number, number]} [row, col]
   */
  const getBestMove = (grid, aiPlayer, difficulty = 'hard') => {
    const cfg = DIFFICULTY[difficulty] || DIFFICULTY.hard;
    const humanPlayer = aiPlayer === 1 ? 2 : 1;
    const moves = Board.getCandidates(grid, 2);

    if (moves.length === 0) {
      const mid = Math.floor(Board.SIZE / 2);
      return [mid, mid];
    }

    // Nivel fácil: a veces movimiento aleatorio
    if (cfg.randomness > 0 && Math.random() < cfg.randomness) {
      return moves[Math.floor(Math.random() * moves.length)];
    }

    // Prioridad 1: ¿Puede ganar en un movimiento?
    for (const [r, c] of moves) {
      grid[r][c] = aiPlayer;
      if (Board.checkWin(grid, r, c)) {
        grid[r][c] = Board.EMPTY;
        return [r, c];
      }
      grid[r][c] = Board.EMPTY;
    }

    // Prioridad 2: ¿Debe bloquear al humano?
    for (const [r, c] of moves) {
      grid[r][c] = humanPlayer;
      if (Board.checkWin(grid, r, c)) {
        grid[r][c] = Board.EMPTY;
        return [r, c];
      }
      grid[r][c] = Board.EMPTY;
    }

    // Ordenar movimientos por puntuación heurística para mejor poda
    const scoredMoves = moves.map(([r, c]) => {
      grid[r][c] = aiPlayer;
      const score = Board.evaluate(grid, aiPlayer);
      grid[r][c] = Board.EMPTY;
      return { r, c, score };
    });
    scoredMoves.sort((a, b) => b.score - a.score);

    // Tomar solo los mejores N movimientos para limitar el tiempo
    const maxCandidates = Math.min(scoredMoves.length, 10);
    const topMoves = scoredMoves.slice(0, maxCandidates);

    if (topMoves.length === 0) {
      const mid = Math.floor(Board.SIZE / 2);
      return [mid, mid];
    }

    // Minimax completo
    let bestScore = -Infinity;
    let bestMove = topMoves[0];

    for (const { r, c } of topMoves) {
      grid[r][c] = aiPlayer;
      const win = Board.checkWin(grid, r, c);
      let score;
      if (win) {
        score = WIN_SCORE;
      } else {
        score = minimax(
          Board.clone(grid),
          cfg.depth - 1,
          -Infinity, Infinity,
          false,
          aiPlayer, humanPlayer
        );
      }
      grid[r][c] = Board.EMPTY;

      if (score > bestScore) {
        bestScore = score;
        bestMove = [r, c];
      }
      if (score >= WIN_SCORE) break; // Ya encontramos victoria
    }

    return bestMove;
  };

  return Object.freeze({ getBestMove });
})();
