/* ===== UI MANAGER ===== */
const UIManager = (() => {
  let _currentScreen = 'main';

  const screens = {
    main:         document.getElementById('screen-main'),
    mode:         document.getElementById('screen-mode'),
    instructions: document.getElementById('screen-instructions'),
    ranking:      document.getElementById('screen-ranking'),
    game:         document.getElementById('screen-game'),
    versus:       document.getElementById('screen-versus'),
    gameover:     document.getElementById('screen-gameover')
  };

  function show(name) {
    Object.entries(screens).forEach(([k, el]) => {
      if (el) el.classList.toggle('active', k === name);
    });
    _currentScreen = name;
    if (name === 'main') {
      AudioManager.stopBg();
      AudioManager.startMenuBg();
    }
  }

  function current() { return _currentScreen; }

  // Update HUD values (only when changed)
  const _cache = {};
  function setVal(id, val) {
    const s = String(val);
    if (_cache[id] === s) return;
    _cache[id] = s;
    const el = document.getElementById(id);
    if (el) el.textContent = s;
  }

  // Ranking list render
  function renderRanking(mode) {
    const list = document.getElementById('ranking-list');
    if (!list) return;
    const data = ScoreManager.getScores(mode);
    if (!data.length) {
      list.innerHTML = '<div class="rank-empty">SIN ENTRADAS AÚN</div>';
      return;
    }
    const medals = ['rank-gold','rank-silver','rank-bronze'];
    list.innerHTML = data.map((e, i) => `
      <div class="rank-row ${medals[i] || ''}">
        <div class="rank-pos">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i+1)}</div>
        <div class="rank-name">${e.name}</div>
        <div class="rank-score">${e.score.toLocaleString()}</div>
        <div class="rank-date">${e.date || ''}</div>
      </div>`).join('');
  }

  // Game over screen setup
  function showGameOver(data) {
    const titleEl   = document.getElementById('go-title');
    const resultsEl = document.getElementById('go-results');
    const nameWrap  = document.getElementById('go-name-wrap');
    const nameInput = document.getElementById('go-name-input');

    if (titleEl)   titleEl.textContent   = data.title || 'GAME OVER';
    if (resultsEl) resultsEl.innerHTML   = data.results || '';
    if (nameInput) nameInput.value = '';

    const canSave = ScoreManager.isHighScore(data.mode, data.score);
    if (nameWrap) nameWrap.style.display = '';
    if (nameInput) {
      nameInput.disabled = !canSave;
      nameInput.placeholder = canSave ? 'Tu nombre' : 'Puntuación no en top 10';
    }

    show('gameover');
  }

  // Combo splash
  function showCombo(combo, x, y) {
    if (combo < 2) return;
    const el = document.createElement('div');
    el.className = 'combo-flash';
    el.textContent = `×${combo} COMBO!`;
    el.style.left = (x || window.innerWidth / 2 - 80) + 'px';
    el.style.top  = (y || window.innerHeight / 2) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  // Board overlay (PAUSA / COUNTDOWN etc)
  function setOverlay(id, text, visible) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('visible', !!visible);
  }

  function clearCache() { Object.keys(_cache).forEach(k => delete _cache[k]); }

  return { show, current, setVal, renderRanking, showGameOver, showCombo, setOverlay, clearCache };
})();
