/* ===== GAME ENGINE ===== */

const CELL = 30;  // pixels per cell (full board)
const CELL_VS = 24; // for versus mode smaller boards

// ──────────────────────────────────────────
//  RENDERER — draws a board on a canvas
// ──────────────────────────────────────────
class Renderer {
  constructor(canvas, cellSize) {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext('2d');
    this.cellSize = cellSize || CELL;
    this.cols     = COLS;
    this.rows     = ROWS;
  }

  clear() {
    const ctx = this.ctx;
    ctx.fillStyle = '#020408';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this._drawGrid();
  }

  _drawGrid() {
    const ctx = this.ctx; const cs = this.cellSize;
    ctx.strokeStyle = 'rgba(0,255,255,0.05)';
    ctx.lineWidth = .5;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        ctx.strokeRect(c * cs, r * cs, cs, cs);
      }
    }
  }

  drawBoard(board) {
    const ctx = this.ctx; const cs = this.cellSize;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!board.grid[r][c]) continue;
        this._drawCell(ctx, c, r, board.colorGrid[r][c] || '#888', cs);
      }
    }
  }

  drawGhost(piece, board) {
    const ghost = piece.clone();
    while (board.isValid(ghost, 0, 1)) ghost.y++;
    const shape = ghost.getShape();
    const ctx = this.ctx; const cs = this.cellSize;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        this._drawCell(ctx, ghost.x + c, ghost.y + r, piece.color, cs, true);
      }
    }
  }

  drawPiece(piece) {
    const shape = piece.getShape();
    const ctx = this.ctx; const cs = this.cellSize;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        this._drawCell(ctx, piece.x + c, piece.y + r, piece.color, cs);
      }
    }
  }

_drawCell(ctx, col, row, color, cs, isGhost) {
    if (row < 0) return;
    const x = col * cs, y = row * cs;
    const ghostAlpha = isGhost ? 0.15 : 1;
    ctx.globalAlpha = ghostAlpha;
    // Main fill
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
    // Highlight
    ctx.globalAlpha = ghostAlpha * 0.4;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(x + 2, y + 2, cs - 4, 4);
    ctx.fillRect(x + 2, y + 2, 4, cs - 4);
    // Shadow edge
    ctx.globalAlpha = ghostAlpha * 0.5;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x + cs - 5, y + 3, 3, cs - 4);
    ctx.fillRect(x + 3, y + cs - 5, cs - 4, 3);
    // Glow outline
    ctx.globalAlpha = ghostAlpha * 0.7;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x + 1, y + 1, cs - 2, cs - 2);
    ctx.globalAlpha = 1;
  }

  // Draw preview (next/hold) canvas
  drawPreview(canvas, pieces, cellSize) {
    const cs  = cellSize || 24;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!pieces || !pieces.length) return;
    const arr = Array.isArray(pieces) ? pieces : [pieces];
    let offsetY = 0;
    if (arr.length === 1 && canvas.id.includes('hold')) {
      const piece = arr[0];
      if (!piece) return;
      const shape = piece.getShape();
      const pw = shape[0].length, ph = shape.length;
      const startX = Math.floor((canvas.width / cs - pw) / 2);
      offsetY = Math.floor((canvas.height / cs - ph) / 2);
      for (let r = 0; r < ph; r++) {
        for (let c = 0; c < pw; c++) {
          if (!shape[r][c]) continue;
          this._drawCell(ctx, startX + c, offsetY + r, piece.color, cs);
        }
      }
    } else {
      offsetY = 4;
      arr.forEach(piece => {
        if (!piece) return;
        const shape = piece.getShape();
        const pw = shape[0].length, ph = shape.length;
        const startX = Math.floor((canvas.width / cs - pw) / 2);
        for (let r = 0; r < ph; r++) {
          for (let c = 0; c < pw; c++) {
            if (!shape[r][c]) continue;
            this._drawCell(ctx, startX + c, offsetY + r, piece.color, cs);
          }
        }
        offsetY += 4;
      });
    }
  }
}

// ──────────────────────────────────────────
//  PLAYER STATE
// ──────────────────────────────────────────
class PlayerState {
  constructor(id, canvasId, nextCanvasId, holdCanvasId, cellSize) {
    this.id          = id;
    this.canvas      = document.getElementById(canvasId);
    this.renderer    = new Renderer(this.canvas, cellSize);
    this.nextCanvas  = nextCanvasId ? document.getElementById(nextCanvasId) : null;
    this.holdCanvas  = holdCanvasId ? document.getElementById(holdCanvasId) : null;
    this.board       = new Board();
    this.bag         = new PieceBag();
    this.piece       = null;
    this.holdPiece   = null;
    this.canHold     = true;
    this.score       = 0;
    this.lines       = 0;
    this.level       = 1;
    this.combo       = 0;
    this.isGameOver  = false;
    this.dropTimer   = 0;
    this.lockTimer   = 0;
    this.lockDelay   = 500;
    this.cellSize    = cellSize || CELL;
    this.pendingGarbage = 0;
  }

  spawn() {
    this.piece = this.bag.next();
    this.piece.x = Math.floor((COLS - this.piece.getShape()[0].length) / 2);
    this.piece.y = 0;
    if (!this.board.isValid(this.piece)) {
      this.isGameOver = true;
    }
    this.canHold = true;
  }

  hold() {
    if (!this.canHold) return;
    if (!this.holdPiece) {
      this.holdPiece = this.piece;
      this.holdPiece.rotation = 0;
      this.spawn();
    } else {
      const tmp = this.holdPiece;
      this.holdPiece = this.piece;
      this.holdPiece.rotation = 0;
      this.piece = tmp;
      this.piece.x = Math.floor((COLS - this.piece.getShape()[0].length) / 2);
      this.piece.y = 0;
    }
    this.canHold = false;
  }

  tryMove(dx, dy) {
    if (!this.piece) return false;
    if (this.board.isValid(this.piece, dx, dy)) {
      this.piece.x += dx;
      this.piece.y += dy;
      if (dy === 0) this.lockTimer = 0; // reset lock on horizontal move
      return true;
    }
    return false;
  }

  tryRotate(dir) {
    if (!this.piece) return false;
    const rotated = this.piece.rotated(dir);
    const fromRot = this.piece.rotation;
    const kicks   = this.piece.getKickOffsets(fromRot);
    for (const [kx, ky] of kicks) {
      rotated.x = this.piece.x + kx;
      rotated.y = this.piece.y - ky;
      if (this.board.isValid(rotated)) {
        this.piece = rotated;
        this.lockTimer = 0;
        return true;
      }
    }
    return false;
  }

  hardDrop() {
    if (!this.piece) return 0;
    let dropped = 0;
    while (this.board.isValid(this.piece, 0, 1)) {
      this.piece.y++;
      dropped++;
    }
    this.score += dropped * 2;
    return dropped;
  }

  // Returns lines cleared
  lock() {
    const overflow = this.board.lock(this.piece);
    if (overflow) { this.isGameOver = true; return 0; }

    // Add pending garbage if any (versus mode)
    if (this.pendingGarbage > 0) {
      this.board.addGarbage(this.pendingGarbage);
      this.pendingGarbage = 0;
    }

    const cleared = this.board.clearLines();
    if (cleared > 0) {
      this.combo++;
      const pts = ScoreManager.calcScore(cleared, this.level, this.combo);
      this.score += pts;
      this.lines += cleared;
      const newLevel = LevelManager.calcLevel(this.lines);
      const levelUp = newLevel > this.level;
      this.level = newLevel;
      this.spawn();
      return { cleared, levelUp, combo: this.combo };
    } else {
      this.combo = 0;
      this.spawn();
      return { cleared: 0, levelUp: false, combo: 0 };
    }
  }

  draw() {
    this.renderer.clear();
    this.renderer.drawBoard(this.board);
    if (this.piece && !this.isGameOver) {
      this.renderer.drawGhost(this.piece, this.board);
      this.renderer.drawPiece(this.piece);
    }
    // Next pieces
    if (this.nextCanvas) {
      const next = this.bag.peek(3);
      this.renderer.drawPreview(this.nextCanvas, next, this.cellSize * 0.8);
    }
    // Hold piece
    if (this.holdCanvas) {
      this.renderer.drawPreview(this.holdCanvas, this.holdPiece ? [this.holdPiece] : [], this.cellSize * 0.8);
    }
  }

  reset() {
    this.board.reset();
    this.bag       = new PieceBag();
    this.piece     = null;
    this.holdPiece = null;
    this.canHold   = true;
    this.score     = 0;
    this.lines     = 0;
    this.level     = 1;
    this.combo     = 0;
    this.isGameOver= false;
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.pendingGarbage = 0;
    this.spawn();
  }
}

// ──────────────────────────────────────────
//  GAME CONTROLLER (single/cpu/versus)
// ──────────────────────────────────────────
class GameController {
  constructor() {
    this.mode      = 'single';
    this.running   = false;
    this.paused    = false;
    this.rafId     = null;
    this.lastTime  = 0;
    this.das       = new DASHandler();
    this.ai        = new AiController();
    this.p1        = null;
    this.p2        = null;
    this.aiThought = false;
    this.gameOverTriggered = false;
  }

  init(mode) {
    this.mode = mode;
    InputHandler.clear();
    UIManager.clearCache();

    if (mode === 'versus') {
      this.p1 = new PlayerState('p1', 'vs-p1-canvas', 'vs-p1-next', null, CELL_VS);
      this.p2 = new PlayerState('p2', 'vs-p2-canvas', 'vs-p2-next', null, CELL_VS);
      this.p1.reset(); this.p2.reset();
      UIManager.show('versus');
      this._setupVersusInput();
      this._bindPause();
    } else {
      this.p1 = new PlayerState('p1', 'p1-canvas', 'p1-next-canvas', 'p1-hold-canvas', CELL);
      this.p1.reset();
      UIManager.show('game');
      this._setupSingleInput();
    }

    if (mode === 'cpu') {
      this._initCpuCanvas();
    }

    this._bindPause();
    this.aiThought = false;
    this.start();
  }

  _initCpuCanvas() {
    // Mostrar la sección CPU (está oculta por defecto)
    const section = document.getElementById('cpu-section');
    if (section) section.style.display = '';

    this.p2 = new PlayerState('cpu', 'cpu-canvas', null, null, 20);
    this.p2.reset();
    this.ai.setLevel(1);
    this.ai.think(this.p2.board, this.p2.piece);
    this.aiThought = true;
  }

  _hideCpuCanvas() {
    const section = document.getElementById('cpu-section');
    if (section) section.style.display = 'none';
  }

  _setupSingleInput() {
    InputHandler.on('ArrowUp',  () => { if (this.p1 && !this.paused) { this.p1.tryRotate(1); AudioManager.play('rotate'); }});
    InputHandler.on('Space',    () => { if (this.p1 && !this.paused) { this.p1.hardDrop(); this._lockPiece(this.p1); AudioManager.play('drop'); }});
    InputHandler.on('KeyC',     () => { if (this.p1 && !this.paused) this.p1.hold(); });
    InputHandler.on('ShiftLeft',() => { if (this.p1 && !this.paused) this.p1.hold(); });
    InputHandler.on('KeyS',     () => { if (this.p1 && !this.paused && this.p1.piece) { this.p1.tryMove(0, 1); this.p1.score++; }});
  }

  _setupVersusInput() {
    // P1 — WASD (tablero izquierdo)
    InputHandler.on('KeyW',     () => { if (!this.paused) { this.p1.tryRotate(1); AudioManager.play('rotate'); }});
    InputHandler.on('KeyG',     () => { if (!this.paused) { this.p1.hardDrop(); this._lockPieceVs(this.p1, this.p2); AudioManager.play('drop'); }});
    // P2 — Flechas (tablero derecho)
    InputHandler.on('ArrowUp',  () => { if (!this.paused) { this.p2.tryRotate(1); AudioManager.play('rotate'); }});
    InputHandler.on('KeyK',    () => { if (!this.paused) { this.p2.hardDrop(); this._lockPieceVs(this.p2, this.p1); AudioManager.play('drop'); }});
  }

  _bindPause() {
    InputHandler.on('KeyP', () => this.togglePause());
    InputHandler.on('Escape', () => this.togglePause());
    const resume = document.getElementById('btn-resume');
    const quit   = document.getElementById('btn-quit-game');
    if (resume) resume.onclick = () => this.togglePause();
    if (quit)   quit.onclick   = () => this.quitToMenu();
  }

  togglePause() {
    if (!this.running) return;
    this.paused = !this.paused;
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.classList.toggle('hidden', !this.paused);
    if (this.paused) {
      AudioManager.pauseBg();
    } else {
      AudioManager.resumeBg();
    }
  }

  quitToMenu() {
    this.stop();
    AudioManager.stopBg();
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.classList.add('hidden');
    this._hideCpuCanvas();
    UIManager.show('main');
  }

  start() {
    this.running = true;
    this.paused  = false;
    this.gameOverTriggered = false;
    this.lastTime= performance.now();
    AudioManager.stopMenuBg();
    AudioManager.startBg();
    this._loop(this.lastTime);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  _loop(ts) {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(t => this._loop(t));
    const dt = Math.min(ts - this.lastTime, 50); // cap dt
    this.lastTime = ts;
    if (this.paused) return;
    this._update(dt);
    this._render();
  }

  _update(dt) {
    if (this.mode === 'versus') {
      this._updatePlayer(this.p1, dt, null);
      this._updatePlayer(this.p2, dt, null);
      // DAS: p1Callback(flechas)→p2 tablero derecho, p2Callback(WASD)→p1 tablero izquierdo
      this.das.update(dt,
        a => this._dasAction(this.p1, a),   // flechas → p1 (izquierda)
        a => this._dasAction(this.p2, a)    // WASD    → p2 (derecha)
      );
      this._checkVersusOver();
    } else {
      this._updatePlayer(this.p1, dt, null);
      this.das.update(dt, a => this._dasAction(this.p1, a), null);
      if (this.mode === 'cpu') {
        this._updateCPU(dt);
      }
      if (this.p1.isGameOver) this._triggerGameOver();
    }
  }

  _updatePlayer(player, dt, _unused) {
    if (!player || player.isGameOver || !player.piece) return;
    const speed = LevelManager.getSpeed(player.level);

    player.dropTimer += dt;
    if (player.dropTimer >= speed) {
      player.dropTimer = 0;
      if (!player.tryMove(0, 1)) {
        // Start lock delay
        player.lockTimer += dt;
        if (player.lockTimer >= player.lockDelay) {
          player.lockTimer = 0;
          this._lockPiece(player);
        }
      }
    } else if (!player.board.isValid(player.piece, 0, 1)) {
      player.lockTimer += dt;
      if (player.lockTimer >= player.lockDelay) {
        player.lockTimer = 0;
        this._lockPiece(player);
      }
    } else {
      player.lockTimer = 0;
    }
  }

  _updateCPU(dt) {
    if (!this.p2 || this.p2.isGameOver) return;
    const speed = LevelManager.getSpeed(this.p2.level);
    this.ai.setLevel(this.p2.level);

    if (!this.aiThought && this.p2.piece) {
      this.ai.think(this.p2.board, this.p2.piece);
      this.aiThought = true;
    }

    const move = this.ai.getNextMove(dt);
    if (move) {
      if (move === 'rotate') { this.p2.tryRotate(1); }
      else if (move === 'left')  { this.p2.tryMove(-1, 0); }
      else if (move === 'right') { this.p2.tryMove(1, 0); }
      else if (move === 'drop')  {
        this.p2.hardDrop();
        this._lockPiece(this.p2);
        this.aiThought = false;
        return;
      }
    }

    // Normal gravity for CPU
    this.p2.dropTimer += dt;
    if (this.p2.dropTimer >= speed) {
      this.p2.dropTimer = 0;
      if (!this.p2.tryMove(0, 1)) {
        this.p2.lockTimer += dt;
        if (this.p2.lockTimer >= 300) {
          this.p2.lockTimer = 0;
          this._lockPiece(this.p2);
          this.aiThought = false;
        }
      }
    }

    // CPU game over
    if (this.p2.isGameOver) {
      // CPU lost, player wins
      this._showResult('¡GANASTE! CPU fue derrotada.', this.p1.score, 'cpu');
    }
  }

  _lockPiece(player) {
    const result = player.lock();
    if (player.isGameOver) { if (this.mode !== 'versus') this._triggerGameOver(); return; }
    if (result.cleared > 0) {
      AudioManager.play(result.cleared >= 4 ? 'combo' : 'line_clear');
      if (result.combo > 1) UIManager.showCombo(result.combo);
      if (result.levelUp) {
        AudioManager.play('level_up');
        AudioManager.setLevel(player.level);
        if (this.mode === 'cpu' && player === this.p2) {
          this.ai.setLevel(this.p2.level);
        }
      }
    }
    this._updateHUD(player);
  }

  _lockPieceVs(player, opponent) {
    const result = player.lock();
    if (player.isGameOver) return;
    if (result.cleared > 1) {
      const garbage = result.cleared - 1 + opponent.pendingGarbage;
      opponent.pendingGarbage = garbage;
      AudioManager.play(result.cleared >= 4 ? 'combo' : 'line_clear');
    } else if (opponent.pendingGarbage > 0) {
      opponent.pendingGarbage = 0;
    }
    if (result.levelUp) AudioManager.play('level_up');
    this._updateHUD(player);
  }

  _dasAction(player, action) {
    if (!player || player.isGameOver) return;
    let moved = false;
    if (action === 'left')     moved = player.tryMove(-1, 0);
    if (action === 'right')    moved = player.tryMove(1, 0);
    if (action === 'softDrop') { moved = player.tryMove(0, 1); player.score++; this._updateHUD(player); }
    if (moved) AudioManager.play('move');
  }

  _updateHUD(player) {
    if (this.mode === 'versus') {
      const pfx = player.id === 'p1' ? 'vs-p1' : 'vs-p2';
      UIManager.setVal(pfx + '-score', player.score.toLocaleString());
      UIManager.setVal(pfx + '-level', player.level);
      UIManager.setVal(pfx + '-combo', '×' + player.combo);
    } else {
      UIManager.setVal('p1-score', player.score.toLocaleString());
      UIManager.setVal('p1-level', player.level);
      UIManager.setVal('p1-lines', player.lines);
      UIManager.setVal('p1-combo', '×' + player.combo);
      UIManager.setVal('p1-record', ScoreManager.getRecord(this.mode).toLocaleString());
      // CPU HUD
      if (this.mode === 'cpu' && this.p2) {
        UIManager.setVal('cpu-level-val', this.p2.level);
        UIManager.setVal('cpu-lines-val', this.p2.lines);
      }
    }
  }

  _checkVersusOver() {
    if (this.p1 && this.p1.isGameOver) {
      this._showVersusResult('p2');
    } else if (this.p2 && this.p2.isGameOver) {
      this._showVersusResult('p1');
    }
  }

  _showVersusResult(winner) {
    this.stop();
    AudioManager.stopBg();
    AudioManager.play('game_over');
    const title = winner === 'p1' ? '¡JUGADOR 1 GANA!' : '¡JUGADOR 2 GANA!';
    const score = winner === 'p1' ? this.p1.score : this.p2.score;
    UIManager.showGameOver({
      title,
      mode: 'versus',
      score,
      results: `
        <b>Jugador 1:</b> ${this.p1.score.toLocaleString()} pts — Nivel ${this.p1.level}<br>
        <b>Jugador 2:</b> ${this.p2.score.toLocaleString()} pts — Nivel ${this.p2.level}
      `
    });
  }

  _showResult(msg, score, mode) {
    this.stop();
    AudioManager.stopBg();
    AudioManager.play('game_over');
    UIManager.showGameOver({
      title: 'GAME OVER',
      mode,
      score,
      results: msg + `<br>Puntuación: ${score.toLocaleString()}`
    });
  }

  _triggerGameOver() {
    if (this.gameOverTriggered) return;
    this.gameOverTriggered = true;
    this.stop();
    AudioManager.stopBg();
    AudioManager.play('game_over');
    const p = this.p1;
    UIManager.showGameOver({
      title: 'GAME OVER',
      mode: this.mode,
      score: p.score,
      results: `
        Puntuación: <b>${p.score.toLocaleString()}</b><br>
        Líneas: ${p.lines} &nbsp;|&nbsp; Nivel: ${p.level}
      `
    });
  }

  _render() {
    if (this.mode === 'versus') {
      if (this.p1) this.p1.draw();
      if (this.p2) this.p2.draw();
    } else {
      if (this.p1) this.p1.draw();
      if (this.mode === 'cpu' && this.p2) this.p2.draw();
    }
  }
}

// Singleton
const Game = new GameController();
