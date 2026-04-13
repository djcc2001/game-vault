/**
 * ui.js — Gestión de pantallas y componentes UI
 */
const UI = (() => {
  const _screens = {};
  let _currentScreen = null;

  // ── INICIALIZACIÓN ────────────────────────────────────
  const init = () => {
    document.querySelectorAll('.screen').forEach(el => {
      _screens[el.id] = el;
    });
  };

  // ── NAVEGACIÓN ─────────────────────────────────────────
  const showScreen = (id) => {
    if (_currentScreen) {
      _currentScreen.classList.remove('active');
    }
    const next = _screens[id];
    if (next) {
      next.classList.add('active');
      _currentScreen = next;
    }
  };

  // ── PAUSA (overlay sobre el juego) ─────────────────────
  const showPause = () => {
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.classList.remove('hidden');
  };

  const hidePause = () => {
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.classList.add('hidden');
  };

  // ── TURNO ──────────────────────────────────────────────
  const updateTurn = (player, name) => {
    const stone = document.getElementById('turn-stone');
    const nameEl = document.getElementById('turn-name');
    if (stone) stone.textContent = player === 1 ? '⚫' : '⚪';
    if (nameEl) nameEl.textContent = name || (player === 1 ? 'Jugador 1' : 'Jugador 2');

    const p1 = document.getElementById('info-p1');
    const p2 = document.getElementById('info-p2');
    if (p1) p1.classList.toggle('active', player === 1);
    if (p2) p2.classList.toggle('active', player === 2);
  };

  const updateMoveCount = (n) => {
    const el = document.getElementById('move-count');
    if (el) el.textContent = n;
  };

  const setPlayerNames = (p1, p2) => {
    const fp1 = document.getElementById('footer-p1-name');
    const fp2 = document.getElementById('footer-p2-name');
    if (fp1) fp1.textContent = p1;
    if (fp2) fp2.textContent = p2;
  };

  // ── PENSANDO ───────────────────────────────────────────
  const setThinking = (val) => {
    const p2 = document.getElementById('info-p2');
    const label = document.getElementById('thinking-label');
    if (p2) p2.classList.toggle('thinking-active', val);
  };

  // ── VICTORY SCREEN ─────────────────────────────────────
  const showVictory = ({ winnerName, moves, duration, isDraw }) => {
    const trophy    = document.querySelector('#screen-victory .trophy');
    const label     = document.querySelector('#screen-victory .victory-label');
    const nameEl    = document.getElementById('winner-name');
    const statsEl   = document.getElementById('victory-stats');

    if (isDraw) {
      if (trophy) trophy.textContent = '◈';
      if (label)  label.textContent  = 'EMPATE';
      if (nameEl) nameEl.textContent = 'PARTIDA IGUALADA';
    } else {
      if (trophy) trophy.textContent = '⬡';
      if (label)  label.textContent  = 'VICTORIA';
      if (nameEl) nameEl.textContent = winnerName.toUpperCase();
    }

    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    if (statsEl) statsEl.textContent = `${moves} movimientos · ${timeStr}`;

    _spawnParticles();
    showScreen('screen-victory');
  };

  const _spawnParticles = () => {
    const container = document.getElementById('victory-particles');
    if (!container) return;
    container.innerHTML = '';

    const colors = ['#ffd700','#00d4ff','#ff6b00','#00ff88','#ffffff'];
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const angle = (Math.random() * 360) * (Math.PI / 180);
      const dist  = 80 + Math.random() * 180;
      p.style.cssText = `
        left: 50%; top: 50%;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        --dx: ${Math.cos(angle) * dist}px;
        --dy: ${Math.sin(angle) * dist}px;
        animation-delay: ${Math.random() * 0.5}s;
        animation-duration: ${1.2 + Math.random() * 0.8}s;
      `;
      container.appendChild(p);
    }
  };

  // ── RANKING ────────────────────────────────────────────
  const renderRanking = (entries) => {
    const list = document.getElementById('ranking-list');
    if (!list) return;

    if (!entries || entries.length === 0) {
      list.innerHTML = '<div class="ranking-empty">SIN PARTIDAS REGISTRADAS</div>';
      return;
    }

    const medals = ['gold', 'silver', 'bronze'];
    list.innerHTML = entries.map((e, i) => {
      const cls = medals[i] || '';
      const ratio = e.games > 0 ? Math.round((e.wins / e.games) * 100) : 0;
      return `
        <div class="ranking-item">
          <div class="rank-pos ${cls}">${i === 0 ? '⬡' : i + 1}</div>
          <div class="rank-name">${_escape(e.name)}</div>
          <div>
            <div class="rank-wins">${e.wins}V · ${e.losses || 0}D</div>
            <div class="rank-detail">${e.games} partidas · ${ratio}% victorias</div>
          </div>
        </div>
      `;
    }).join('');
  };

  const _escape = (str) =>
    String(str).replace(/[&<>"']/g, m =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
    );

  // ── MODO CPU ───────────────────────────────────────────
  const setP2InputVisibility = (isPVC) => {
    const group = document.getElementById('p2-input-group');
    if (!group) return;
    const input = document.getElementById('p2-name');
    if (isPVC) {
      group.style.opacity = '0.4';
      group.style.pointerEvents = 'none';
      if (input) input.value = 'CPU';
    } else {
      group.style.opacity = '1';
      group.style.pointerEvents = '';
      if (input && input.value === 'CPU') input.value = '';
    }
  };

  return Object.freeze({
    init, showScreen,
    updateTurn, updateMoveCount, setPlayerNames,
    setThinking, showVictory, renderRanking, setP2InputVisibility,
    showPause, hidePause,
  });
})();
