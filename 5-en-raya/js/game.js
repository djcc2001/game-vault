/**
 * game.js — Motor del juego y renderizado Canvas
 * Estado encapsulado, sin variables globales
 */
const Game = (() => {
  // ── CONFIGURACIÓN VISUAL ─────────────────────────────
  const COLORS = {
    bg:          '#deb887',
    gridLine:    '#8b6914',
    gridLineSub: '#a07828',
    star:        '#6b5010',
    p1Stone:     '#1a1a1a',
    p1High:      '#444444',
    p2Stone:     '#f5f5f0',
    p2High:      '#ffffff',
    winGlow:     '#c9a84c',
    lastMove:    '#2c5f2d',
    hover:       'rgba(44,95,45,0.2)',
    hoverBorder: 'rgba(44,95,45,0.5)',
  };

  const STAR_POINTS = [
    [3,3],[3,7],[3,11],
    [7,3],[7,7],[7,11],
    [11,3],[11,7],[11,11],
  ];

  // ── ESTADO INTERNO ────────────────────────────────────
  let _state = null;
  let _canvas = null;
  let _ctx = null;
  let _cellSize = 0;
  let _margin = 0;
  let _animFrame = null;
  let _winAnimProgress = 0;
  let _winAnimDir = 1;
  let _onGameOver = null;
  let _hoverCell = null;
  let _hoverTarget = null;
  let _hoverCurrent = null;
  let _mouseCanvasX = 0;
  let _mouseCanvasY = 0;
  let _hasMouse = false;
  let _placedStones = [];
  const _easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const _lerp = (a, b, t) => a + (b - a) * t;
  const _updateHoverAnimation = () => {
    if (!_hoverTarget) return;
    if (!_hoverCurrent) {
      _hoverCurrent = { row: _hoverTarget.row, col: _hoverTarget.col };
      return;
    }
    const speed = 0.18;
    const t = _easeOutCubic(speed);
    _hoverCurrent.row = _lerp(_hoverCurrent.row, _hoverTarget.row, t);
    _hoverCurrent.col = _lerp(_hoverCurrent.col, _hoverTarget.col, t);
  };

  const _getHoverCell = () => {
    if (!_hoverTarget) return null;
    const row = Math.round(_hoverTarget.row);
    const col = Math.round(_hoverTarget.col);
    if (!Board.inBounds(row, col)) return null;
    return { row, col };
  };
  const _dropStone = (row, col, player) => {
    _placedStones.push({
      row, col, player,
      y: -_cellSize * 2,
      scale: 0.3,
      velocity: 0,
      landed: false,
      startY: -_cellSize * 2,
      targetY: 0,
    });
  };
  const _updatePlacedStones = () => {
    for (const s of _placedStones) {
      if (s.landed) continue;
      const gravity = _cellSize * 0.08;
      s.velocity += gravity;
      s.y += s.velocity;
      s.scale += 0.015;
      if (s.scale > 1) s.scale = 1;
      if (s.y >= 0) {
        s.y = 0;
        s.landed = true;
        s.velocity = -s.velocity * 0.3;
        if (Math.abs(s.velocity) < 0.5) {
          s.landed = true;
          s.velocity = 0;
          s.y = 0;
        }
      }
    }
  };

  // ── INICIALIZACIÓN ────────────────────────────────────
  const init = (canvas, options, onGameOverCb) => {
    _canvas = canvas;
    _ctx = canvas.getContext('2d');
    _onGameOver = onGameOverCb;

    _state = {
      grid:       Board.create(),
      current:    1,               // 1 = negro, 2 = blanco
      mode:       options.mode,    // 'pvp' | 'pvc'
      aiPlayer:   options.aiPlayer || 2,
      difficulty: options.difficulty || 'hard',
      players:    options.players,
      moves:      0,
      startTime:  Date.now(),
      winner:     null,
      winCells:   null,
      lastMove:   null,
      gameOver:   false,
    };

    _winAnimProgress = 0;
    _winAnimDir = 1;

    _resize();
    _bindEvents();
    _loop();
  };

  // ── RESIZE ────────────────────────────────────────────
  const _resize = () => {
    if (!_canvas) return;
    const container = _canvas.parentElement;
    const maxSize = Math.min(container.clientWidth, container.clientHeight) - 16;
    const size = Math.max(450, maxSize);

    _canvas.width  = size;
    _canvas.height = size;

    // Cell size: divide canvas into Board.SIZE cells with margin on each side
    _cellSize = size / (Board.SIZE + 2);
    _margin   = _cellSize;
  };

  // ── EVENTOS ───────────────────────────────────────────
  const _bindEvents = () => {
    _canvas.addEventListener('click', _handleClick);
    _canvas.addEventListener('mousemove', _handleHover);
    _canvas.addEventListener('mouseleave', () => {
      _hasMouse = false;
    });
    window.addEventListener('resize', _resize);
    // Custom cursor: hide default, draw at hover position
    _canvas.style.cursor = 'none';
  };

  const _unbindEvents = () => {
    if (!_canvas) return;
    _canvas.removeEventListener('click', _handleClick);
    _canvas.removeEventListener('mousemove', _handleHover);
    window.removeEventListener('resize', _resize);
  };

  const _cellFromEvent = (e) => {
    const rect = _canvas.getBoundingClientRect();
    const scaleX = _canvas.width  / rect.width;
    const scaleY = _canvas.height / rect.height;
    const px = (e.clientX - rect.left)  * scaleX;
    const py = (e.clientY - rect.top)   * scaleY;
    // Map to cell centers: each cell occupies a square region
    const col = Math.floor((px - _margin / 2) / _cellSize);
    const row = Math.floor((py - _margin / 2) / _cellSize);
    return { row, col };
  };

  const _handleHover = (e) => {
    if (!_state || _state.gameOver) return;
    if (_state.mode === 'pvc' && _state.current === _state.aiPlayer) return;
    const { row, col } = _cellFromEvent(e);
    
    if (Board.inBounds(row, col)) {
      _hoverTarget = { row, col };
      if (!_hoverCurrent) {
        _hoverCurrent = { row: row, col: col };
      }
    } else {
      _hoverTarget = null;
    }
    
    const rect = _canvas.getBoundingClientRect();
    const scaleX = _canvas.width  / rect.width;
    const scaleY = _canvas.height / rect.height;
    _mouseCanvasX = (e.clientX - rect.left) * scaleX;
    _mouseCanvasY = (e.clientY - rect.top)  * scaleY;
    _hasMouse = true;
  };

  const _handleClick = (e) => {
    if (!_state || _state.gameOver) return;
    if (_state.mode === 'pvc' && _state.current === _state.aiPlayer) return;
    const { row, col } = _cellFromEvent(e);
    _makeMove(row, col);
  };

  // ── LÓGICA DE MOVIMIENTO ──────────────────────────────
  const _makeMove = (row, col, isAI = false) => {
    if (!Board.isEmpty(_state.grid, row, col)) return false;
    Board.place(_state.grid, row, col, _state.current);
    _state.moves++;
    _state.lastMove = { row, col };
    _hoverTarget = null;
    _hoverCurrent = null;

    _dropStone(row, col, _state.current);

    if (isAI) {
      Sounds.aiPlaceStone();
    } else {
      Sounds.placeStone();
    }

    const win = Board.checkWin(_state.grid, row, col);
    if (win) {
      _state.winner   = _state.current;
      _state.winCells = win.cells;
      _state.gameOver = true;
      _finishGame();
      return true;
    }

    if (Board.isFull(_state.grid)) {
      _state.winner   = 0; // empate
      _state.gameOver = true;
      _finishGame();
      return true;
    }

    // Cambiar turno
    _state.current = _state.current === 1 ? 2 : 1;
    if (_onGameOver) _onGameOver({ type: 'turn', player: _state.current });

    // Turno de la IA
    if (_state.mode === 'pvc' && _state.current === _state.aiPlayer) {
      _scheduleAI();
    }

    return true;
  };

  const _scheduleAI = () => {
    if (!_state) return;
    
    const moves = _state.moves;
    let minTime, maxTime;
    
    if (moves < 20) {
      minTime = 1000;
      maxTime = 3000;
    } else {
      minTime = 5000;
      maxTime = 8000;
    }
    
    const thinkTime = minTime + Math.random() * (maxTime - minTime);
    let thinkingShown = false;
    
    const showThinking = () => {
      if (_onGameOver) _onGameOver({ type: 'thinking', value: true });
      thinkingShown = true;
    };
    
    const thinkingTimer = setTimeout(showThinking, 300);
    
    setTimeout(() => {
      clearTimeout(thinkingTimer);
      if (!_state || _state.gameOver) return;
      
      if (thinkingShown && _onGameOver) {
        _onGameOver({ type: 'thinking', value: false });
      }
      
      const [r, c] = AI.getBestMove(
        Board.clone(_state.grid),
        _state.aiPlayer,
        _state.difficulty
      );
      _makeMove(r, c, true);
    }, thinkTime);
  };

  const _finishGame = () => {
    const duration = Math.floor((Date.now() - _state.startTime) / 1000);
    if (_onGameOver) {
      _onGameOver({
        type:     'gameover',
        winner:   _state.winner,
        moves:    _state.moves,
        duration,
        players:  _state.players,
        mode:     _state.mode,
        aiPlayer: _state.aiPlayer,
      });
    }
  };

  // ── RENDER LOOP ───────────────────────────────────────
  const _loop = () => {
    _render();
    _animFrame = requestAnimationFrame(_loop);
  };

  const _render = () => {
    if (!_ctx || !_state) return;
    _updateHoverAnimation();
    const { width: W, height: H } = _canvas;
    _ctx.clearRect(0, 0, W, H);

    _drawBackground();
    _drawGrid();
    _drawHover();
    _drawStones();
    _drawLastMove();
    if (_state.winCells) _drawWinHighlight();
    _drawCustomCursor();
  };

  const _drawBackground = () => {
    // Wooden board gradient
    const grad = _ctx.createLinearGradient(0, 0, _canvas.width, _canvas.height);
    grad.addColorStop(0, '#deb887');
    grad.addColorStop(0.5, '#d2a86e');
    grad.addColorStop(1, '#c89e5e');
    _ctx.fillStyle = grad;
    _ctx.fillRect(0, 0, _canvas.width, _canvas.height);
  };

  const _drawGrid = () => {
    const boardSize = Board.SIZE;
    const cellHalf = _cellSize / 2;

    // Draw cell backgrounds
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        const x = _margin + c * _cellSize;
        const y = _margin + r * _cellSize;
        _ctx.fillStyle = (r + c) % 2 === 0 ? '#f0e0c0' : '#e8d4a8';
        _ctx.fillRect(x, y, _cellSize, _cellSize);
      }
    }

    // Draw grid lines
    _ctx.strokeStyle = COLORS.gridLine;
    _ctx.lineWidth = 1;

    for (let i = 0; i <= boardSize; i++) {
      const x = _margin + i * _cellSize;
      const y = _margin + i * _cellSize;
      const end = _margin + boardSize * _cellSize;

      // Vertical line
      _ctx.beginPath();
      _ctx.moveTo(x, _margin);
      _ctx.lineTo(x, end);
      _ctx.stroke();

      // Horizontal line
      _ctx.beginPath();
      _ctx.moveTo(_margin, y);
      _ctx.lineTo(end, y);
      _ctx.stroke();
    }

    // Outer border
    _ctx.strokeStyle = '#5a4010';
    _ctx.lineWidth = 2;
    _ctx.strokeRect(_margin, _margin, boardSize * _cellSize, boardSize * _cellSize);
  };

  const _drawHover = () => {
    if (!_hoverCurrent) return;
    const cell = _getHoverCell();
    if (!cell) return;
    const { row, col } = cell;
    const isEmpty = Board.isEmpty(_state.grid, row, col);
    const x = _margin + col * _cellSize + _cellSize / 2;
    const y = _margin + row * _cellSize + _cellSize / 2;
    const r = _cellSize * 0.42;

    _ctx.save();
    _ctx.globalAlpha = isEmpty ? 0.4 : 0.3;
    _ctx.fillStyle = isEmpty ? COLORS.hover : 'rgba(0, 0, 0, 0.2)';
    _ctx.beginPath();
    _ctx.arc(x, y, r, 0, Math.PI * 2);
    _ctx.fill();

    _ctx.strokeStyle = isEmpty ? COLORS.hoverBorder : 'rgba(0, 0, 0, 0.4)';
    _ctx.lineWidth = 2;
    _ctx.stroke();
    _ctx.restore();
  };

  const _drawStones = () => {
    for (let r = 0; r < Board.SIZE; r++) {
      for (let c = 0; c < Board.SIZE; c++) {
        const p = _state.grid[r][c];
        if (p === Board.EMPTY) continue;

        const anim = _placedStones.find(s => s.row === r && s.col === c);
        const scale = anim && !anim.landed ? anim.scale : 1;
        const offsetY = anim && !anim.landed ? anim.y : 0;

        const x = _margin + c * _cellSize + _cellSize / 2;
        const y = _margin + r * _cellSize + _cellSize / 2 + offsetY;
        const radius = _cellSize * 0.44 * scale;

        _drawStone(x, y, radius, p);
      }
    }
    _updatePlacedStones();
  };

  const _drawStone = (x, y, radius, player) => {
    const isP1 = player === 1;

    // Sombra
    _ctx.save();
    _ctx.shadowColor = isP1 ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)';
    _ctx.shadowBlur  = radius * 0.8;
    _ctx.shadowOffsetX = radius * 0.15;
    _ctx.shadowOffsetY = radius * 0.15;

    // Degradado radial
    const grad = _ctx.createRadialGradient(
      x - radius * 0.3, y - radius * 0.3, radius * 0.05,
      x, y, radius
    );

    if (isP1) {
      grad.addColorStop(0, '#444444');
      grad.addColorStop(0.4, '#1a1a1a');
      grad.addColorStop(1, '#000000');
    } else {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, '#d8d8d8');
      grad.addColorStop(1, '#a0a0a0');
    }

    _ctx.fillStyle = grad;
    _ctx.beginPath();
    _ctx.arc(x, y, radius, 0, Math.PI * 2);
    _ctx.fill();
    _ctx.restore();
  };

  const _drawLastMove = () => {
    if (!_state.lastMove) return;
    const { row, col } = _state.lastMove;
    const x = _margin + col * _cellSize + _cellSize / 2;
    const y = _margin + row * _cellSize + _cellSize / 2;
    const r = _cellSize * 0.12;

    _ctx.fillStyle = _state.grid[row][col] === 1 ? '#ffffff' : '#333333';
    _ctx.beginPath();
    _ctx.arc(x, y, r, 0, Math.PI * 2);
    _ctx.fill();
  };

  const _drawWinHighlight = () => {
    if (!_state.winCells || _state.winCells.length < 2) return;

    // Pulsar la animación
    _winAnimProgress += 0.04 * _winAnimDir;
    if (_winAnimProgress >= 1) { _winAnimProgress = 1; _winAnimDir = -1; }
    if (_winAnimProgress <= 0.3) { _winAnimProgress = 0.3; _winAnimDir = 1; }

    const cells = _state.winCells;

    // Línea de victoria
    const x0 = _margin + cells[0][1] * _cellSize + _cellSize / 2;
    const y0 = _margin + cells[0][0] * _cellSize + _cellSize / 2;
    const x1 = _margin + cells[cells.length - 1][1] * _cellSize + _cellSize / 2;
    const y1 = _margin + cells[cells.length - 1][0] * _cellSize + _cellSize / 2;

    _ctx.save();
    _ctx.strokeStyle = COLORS.winGlow;
    _ctx.lineWidth = _cellSize * 0.1;
    _ctx.globalAlpha = _winAnimProgress * 0.7;
    _ctx.shadowColor = COLORS.winGlow;
    _ctx.shadowBlur  = 15;
    _ctx.beginPath();
    _ctx.moveTo(x0, y0);
    _ctx.lineTo(x1, y1);
    _ctx.stroke();

    // Halos en cada ficha ganadora
    for (const [r, c] of cells) {
      const x = _margin + c * _cellSize + _cellSize / 2;
      const y = _margin + r * _cellSize + _cellSize / 2;
      _ctx.globalAlpha = _winAnimProgress * 0.5;
      _ctx.strokeStyle = COLORS.winGlow;
      _ctx.lineWidth = _cellSize * 0.06;
      _ctx.beginPath();
      _ctx.arc(x, y, _cellSize * 0.42, 0, Math.PI * 2);
      _ctx.stroke();
    }

    _ctx.restore();
  };

  const _drawCustomCursor = () => {
    if (!_hasMouse || !_hoverCurrent) return;
    if (_state.mode === 'pvc' && _state.current === _state.aiPlayer) return;

    const cell = _getHoverCell();
    if (!cell) return;
    const { row, col } = cell;
    const isEmpty = Board.isEmpty(_state.grid, row, col);
    const cx = _margin + col * _cellSize + _cellSize / 2;
    const cy = _margin + row * _cellSize + _cellSize / 2;
    const r = _cellSize * 0.35;

    _ctx.save();
    _ctx.globalAlpha = isEmpty ? 0.3 : 0.2;
    _ctx.strokeStyle = '#000000';
    _ctx.lineWidth = 1.5;
    _ctx.shadowColor = '#000000';
    _ctx.shadowBlur = 4;

    // Circle at cell center
    _ctx.beginPath();
    _ctx.arc(cx, cy, r, 0, Math.PI * 2);
    _ctx.stroke();

    // Small cross
    const s = r * 0.4;
    _ctx.beginPath();
    _ctx.moveTo(cx - s, cy);
    _ctx.lineTo(cx + s, cy);
    _ctx.moveTo(cx, cy - s);
    _ctx.lineTo(cx, cy + s);
    _ctx.stroke();

    _ctx.restore();
  };

  // ── API PÚBLICA ───────────────────────────────────────
  const destroy = () => {
    if (_animFrame) cancelAnimationFrame(_animFrame);
    _unbindEvents();
    _state = null;
    _placedStones = [];
  };

  const getState = () => _state ? { ...(_state), grid: Board.clone(_state.grid) } : null;

  const getCurrentPlayer = () => _state ? _state.current : null;

  return Object.freeze({ init, destroy, getState, getCurrentPlayer });
})();
