/**
 * uiManager.js
 * Controls screen visibility and DOM updates for all UI panels.
 */
const UIManager = (() => {
  const _screens = {};

  function init() {
    document.querySelectorAll('.screen').forEach(el => {
      _screens[el.id] = el;
    });
    _bindMenuButtons();
  }

  /** Show a screen by id, hide all others */
  function showScreen(id) {
    Object.values(_screens).forEach(s => s.classList.remove('active'));
    if (_screens[id]) _screens[id].classList.add('active');
    
    const menuScreens = ['screen-main-menu', 'screen-mode-select', 'screen-instructions', 'screen-ranking'];
    if (menuScreens.includes(id)) {
      AudioManager.stopBGM();
      AudioManager.playMenuBGM();
    }
  }

  /** Show HUD alongside the canvas (non-exclusive) */
  function showHUD(twoPlayer) {
    Object.values(_screens).forEach(s => {
      if (s.id !== 'screen-hud') s.classList.remove('active');
    });
    _screens['screen-hud']?.classList.add('active');
    const p2 = document.getElementById('hud-p2');
    if (p2) p2.style.display = twoPlayer ? 'flex' : 'none';
    
    const menuScreens = ['screen-main-menu', 'screen-mode-select', 'screen-instructions', 'screen-ranking'];
    const hasActiveMenu = Object.values(_screens).some(s => 
      s.classList.contains('active') && menuScreens.includes(s.id)
    );
    if (!hasActiveMenu) {
    }
  }

  function hideAll() {
    Object.values(_screens).forEach(s => s.classList.remove('active'));
  }

  // ── HUD updates ──

  function updateHealth(slot, pct) {
    const el = document.getElementById(`hud-p${slot}-health`);
    if (el) el.style.width = `${Math.max(0, Math.min(100, pct * 100))}%`;
  }

  function updateScore(slot, score) {
    const el = document.getElementById(`hud-p${slot}-score`);
    if (el) el.textContent = score.toLocaleString();
  }

  function updateLevel(level) {
    const el = document.getElementById('hud-level');
    if (el) el.textContent = level;
  }

  function showBossBar(visible) {
    const el = document.getElementById('hud-boss-bar');
    if (el) el.style.display = visible ? 'block' : 'none';
  }

  function updateBossHealth(pct) {
    const el = document.getElementById('hud-boss-health');
    if (el) el.style.width = `${Math.max(0, Math.min(100, pct * 100))}%`;
  }

  // ── Level-up banner ──

  let _levelUpTimeout = null;
  function showLevelUp(levelNumber) {
    const screen = _screens['screen-levelup'];
    const text   = document.getElementById('levelup-text');
    if (!screen) return;
    if (text) text.textContent = levelNumber <= LevelManager.MAX_LEVELS ? `NIVEL ${levelNumber}` : '¡VICTORIA!';
    screen.classList.add('active');
    if (_levelUpTimeout) clearTimeout(_levelUpTimeout);
    _levelUpTimeout = setTimeout(() => screen.classList.remove('active'), 2600);
  }

  // ── Game Over ──

  function showGameOver(stats) {
    _screens['screen-gameover']?.classList.add('active');
    const el = document.getElementById('gameover-stats');
    if (el) {
      el.innerHTML = `
        PUNTUACIÓN: <span>${stats.score.toLocaleString()}</span><br>
        NIVEL ALCANZADO: <span>${stats.level}</span><br>
        MODO: <span>${_modeLabel(stats.mode)}</span>
      `;
    }
    const saved = document.getElementById('name-entry-area');
    if (saved) saved.style.display = ScoreManager.qualifies(stats.score) ? 'flex' : 'none';
  }

  // ── Victory ──

  function showVictory(stats) {
    _screens['screen-victory']?.classList.add('active');
    const el = document.getElementById('victory-stats');
    if (el) {
      el.innerHTML = `
        PUNTUACIÓN FINAL: <span>${stats.score.toLocaleString()}</span><br>
        MODO: <span>${_modeLabel(stats.mode)}</span>
      `;
    }
  }

  // ── Ranking ──

  function renderRanking() {
    const list = document.getElementById('ranking-list');
    if (!list) return;
    const scores = ScoreManager.getTopScores();
    if (scores.length === 0) {
      list.innerHTML = '<div class="ranking-empty">Sin puntuaciones aún. ¡Juega para aparecer aquí!</div>';
      return;
    }
    list.innerHTML = scores.map((entry, i) => {
      const rank   = i + 1;
      const cls    = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
      const medal  = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
      return `
        <div class="ranking-entry">
          <span class="rank-pos ${cls}">${medal}</span>
          <span class="rank-name">${_esc(entry.name)}</span>
          <span class="rank-score">${entry.score.toLocaleString()}</span>
          <span class="rank-mode">Nv.${entry.level} · ${_modeLabel(entry.mode)}</span>
        </div>
      `;
    }).join('');
  }

  // ── Private helpers ──

  function _esc(s) {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function _modeLabel(mode) {
    return mode === 'single' ? '1P' : mode === 'two-player' ? '2P' : 'VS CPU';
  }

  function _bindMenuButtons() {
    document.addEventListener('click', (e) => {
      const btn    = e.target.closest('[data-action]');
      const modBtn = e.target.closest('[data-mode]');

      if (modBtn) {
        AudioManager.playMenuSelect();
        const mode = modBtn.dataset.mode;
        window._gameInstance?.startGame(mode);
        return;
      }

      if (!btn) return;
      AudioManager.playMenuSelect();
      const action = btn.dataset.action;

      switch (action) {
        case 'goto-main-menu':
          window._gameInstance?.returnToMenu();
          showScreen('screen-main-menu');
          break;
        case 'goto-mode-select':
          AudioManager.playMenuOpen();
          showScreen('screen-mode-select');
          break;
        case 'goto-instructions':
          AudioManager.playMenuOpen();
          showScreen('screen-instructions');
          break;
        case 'goto-ranking':
          renderRanking();
          AudioManager.playMenuOpen();
          showScreen('screen-ranking');
          break;
        case 'resume':
          AudioManager.playMenuSelect();
          window._gameInstance?.resume();
          break;
        case 'restart':
          window._gameInstance?.restart();
          break;
        case 'save-score': {
          const name  = document.getElementById('player-name-input')?.value ?? '';
          window._gameInstance?.saveScore(name);
          document.getElementById('name-entry-area').style.display = 'none';
          break;
        }
        case 'save-score-victory': {
          const name = document.getElementById('victory-name-input')?.value ?? '';
          window._gameInstance?.saveScore(name);
          document.getElementById('victory-name-entry').style.display = 'none';
          break;
        }
      }
    });

    // Hover sounds for interactive elements
    document.addEventListener('mouseover', (e) => {
      const btn = e.target.closest('.btn-menu, .btn-mode, .btn-back, .btn-pause');
      if (btn) AudioManager.playMenuHover();
    });

    // Pause button
    document.getElementById('btn-pause')?.addEventListener('click', () => {
      AudioManager.playMenuOpen();
      window._gameInstance?.pause();
    });
  }

  return {
    init, showScreen, showHUD, hideAll,
    updateHealth, updateScore, updateLevel,
    showBossBar, updateBossHealth,
    showLevelUp, showGameOver, showVictory, renderRanking,
  };
})();
