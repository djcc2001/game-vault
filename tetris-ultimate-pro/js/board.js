/* ===== BOARD ===== */
const COLS = 10;
const ROWS = 20;

class Board {
  constructor() {
    this.grid = this._empty();
    this.colorGrid = this._emptyColor();
  }

  _empty() {
    return Array.from({length: ROWS}, () => new Array(COLS).fill(0));
  }
  _emptyColor() {
    return Array.from({length: ROWS}, () => new Array(COLS).fill(null));
  }

  reset() {
    this.grid = this._empty();
    this.colorGrid = this._emptyColor();
  }

  isValid(piece, dx = 0, dy = 0) {
    const shape = piece.getShape();
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = piece.x + c + dx;
        const ny = piece.y + r + dy;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
        if (ny >= 0 && this.grid[ny][nx]) return false;
      }
    }
    return true;
  }

  lock(piece) {
    const shape = piece.getShape();
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const ny = piece.y + r;
        const nx = piece.x + c;
        if (ny < 0) return true; // game over
        this.grid[ny][nx] = 1;
        this.colorGrid[ny][nx] = piece.color;
      }
    }
    return false;
  }

  clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.grid[r].every(v => v)) {
        this.grid.splice(r, 1);
        this.colorGrid.splice(r, 1);
        this.grid.unshift(new Array(COLS).fill(0));
        this.colorGrid.unshift(new Array(COLS).fill(null));
        cleared++;
        r++; // recheck same row index
      }
    }
    return cleared;
  }

  // For AI: count holes, aggregate height, bumpiness
  getStats() {
    let holes = 0, aggHeight = 0, bumpiness = 0;
    const colHeights = new Array(COLS).fill(0);
    for (let c = 0; c < COLS; c++) {
      let foundBlock = false;
      for (let r = 0; r < ROWS; r++) {
        if (this.grid[r][c]) {
          if (!foundBlock) { colHeights[c] = ROWS - r; foundBlock = true; }
        } else if (foundBlock) { holes++; }
      }
    }
    aggHeight = colHeights.reduce((a, b) => a + b, 0);
    for (let c = 0; c < COLS - 1; c++) {
      bumpiness += Math.abs(colHeights[c] - colHeights[c+1]);
    }
    return { holes, aggHeight, bumpiness, colHeights };
  }

  // Add garbage lines from opponent
  addGarbage(lines) {
    for (let i = 0; i < lines; i++) {
      this.grid.shift();
      this.colorGrid.shift();
      const gapCol = Math.floor(Math.random() * COLS);
      const row = new Array(COLS).fill(1);
      const colorRow = new Array(COLS).fill('#444');
      row[gapCol] = 0;
      colorRow[gapCol] = null;
      this.grid.push(row);
      this.colorGrid.push(colorRow);
    }
  }
}
