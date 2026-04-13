/* ===== AI CONTROLLER ===== */
// Heuristic weights (Dellacherie-like)
const AI_WEIGHTS = {
  aggHeight: -0.51,
  lines:      0.76,
  holes:     -0.36,
  bumpiness: -0.18
};

class AiController {
  constructor() {
    this.targetX   = 3;
    this.targetRot = 0;
    this.moveQueue = [];
    this.thinkTimer= 0;
    this.thinkDelay= 300; // ms between AI moves
    this.level     = 1;
  }

  setLevel(l) {
    this.level = l;
    this.thinkDelay = Math.max(60, 300 - (l - 1) * 18);
  }

  // Find best placement for current piece on board
  think(board, piece) {
    let bestScore = -Infinity;
    let bestX = piece.x, bestRot = 0;

    for (let rot = 0; rot < 4; rot++) {
      const testPiece = piece.clone();
      testPiece.rotation = rot;

      for (let x = -2; x < COLS + 2; x++) {
        testPiece.x = x;
        if (!board.isValid(testPiece)) continue;

        // Drop it
        const dropped = testPiece.clone();
        while (board.isValid(dropped, 0, 1)) dropped.y++;

        // Simulate lock on copy
        const boardCopy = this._copyBoard(board);
        boardCopy.lock(dropped);
        const lines = boardCopy.clearLines();
        const stats = boardCopy.getStats();

        const score =
          AI_WEIGHTS.aggHeight * stats.aggHeight +
          AI_WEIGHTS.lines     * lines +
          AI_WEIGHTS.holes     * stats.holes +
          AI_WEIGHTS.bumpiness * stats.bumpiness;

        if (score > bestScore) {
          bestScore = score;
          bestX = x;
          bestRot = rot;
        }
      }
    }

    this.targetX   = bestX;
    this.targetRot = bestRot;
    this.moveQueue = this._buildMoves(piece);
  }

  _buildMoves(piece) {
    const moves = [];
    const rotDiff = (this.targetRot - piece.rotation + 4) % 4;
    for (let i = 0; i < rotDiff; i++) moves.push('rotate');
    const xDiff = this.targetX - piece.x;
    const dir   = xDiff > 0 ? 'right' : 'left';
    for (let i = 0; i < Math.abs(xDiff); i++) moves.push(dir);
    moves.push('drop');
    return moves;
  }

  getNextMove(dt) {
    this.thinkTimer += dt;
    if (this.thinkTimer < this.thinkDelay) return null;
    this.thinkTimer = 0;
    return this.moveQueue.shift() || null;
  }

  _copyBoard(board) {
    const copy = new Board();
    copy.grid = board.grid.map(r => [...r]);
    copy.colorGrid = board.colorGrid.map(r => [...r]);
    return copy;
  }
}
