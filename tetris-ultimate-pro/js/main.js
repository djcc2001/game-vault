/* ===== MAIN — Menu wiring & entry point ===== */

window.addEventListener('DOMContentLoaded', () => {

  // ── MAIN MENU ──
  document.getElementById('btn-play').onclick = () => UIManager.show('mode');
  document.getElementById('btn-instructions').onclick = () => UIManager.show('instructions');
  document.getElementById('btn-ranking').onclick = () => {
    UIManager.renderRanking('single');
    UIManager.show('ranking');
  };

  // ── MODE SELECT ──
  document.querySelectorAll('.mode-card').forEach(card => {
    card.onclick = () => {
      const mode = card.dataset.mode;
      _startCountdown(mode);
    };
  });
  document.getElementById('btn-mode-back').onclick = () => UIManager.show('main');

  // ── INSTRUCTIONS ──
  document.getElementById('btn-instr-back').onclick = () => UIManager.show('main');

  // ── RANKING TABS ──
  document.querySelectorAll('.rank-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.rank-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      UIManager.renderRanking(tab.dataset.rmode);
    };
  });
  document.getElementById('btn-rank-back').onclick = () => UIManager.show('main');

  // ── VERSUS QUIT ──
  const vsQuit = document.getElementById('btn-vs-quit');
  if (vsQuit) vsQuit.onclick = () => Game.quitToMenu();

  // ── GAME OVER BUTTONS ──
  let _lastMode = 'single';
  let _lastScore = 0;

  document.getElementById('btn-go-save').onclick = () => {
    const name = document.getElementById('go-name-input').value || 'PLAYER';
    const p = Game.p1 || {};
    ScoreManager.saveScore(_lastMode, name, _lastScore, p.level || 1, p.lines || 0);
    document.getElementById('btn-go-save').textContent = '✓ GUARDADO';
    document.getElementById('btn-go-save').disabled = true;
  };

  document.getElementById('btn-go-retry').onclick = () => {
    document.getElementById('btn-go-save').textContent = '💾 GUARDAR';
    document.getElementById('btn-go-save').disabled = false;
    Game.init(_lastMode);
  };

  document.getElementById('btn-go-menu').onclick = () => {
    document.getElementById('btn-go-save').textContent = '💾 GUARDAR';
    document.getElementById('btn-go-save').disabled = false;
    UIManager.show('main');
  };

  // Patch UIManager.showGameOver to capture mode/score
  const _origShowGO = UIManager.showGameOver.bind(UIManager);
  UIManager.showGameOver = function(data) {
    _lastMode  = data.mode  || 'single';
    _lastScore = data.score || 0;
    _origShowGO(data);
  };

  // ── COUNTDOWN BEFORE GAME ──
  function _startCountdown(mode) {
    UIManager.show(mode === 'versus' ? 'versus' : 'game');
    // Quick pre-init so canvas is visible
    Game.init(mode);
    // Show overlay countdown
    const overlayId = mode === 'versus' ? 'vs-p1-overlay' : 'p1-overlay';
    let count = 3;
    UIManager.setOverlay(overlayId, count, true);
    Game.paused = true;
    const tick = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(tick);
        UIManager.setOverlay(overlayId, '', false);
        Game.paused = false;
      } else {
        UIManager.setOverlay(overlayId, count, true);
      }
    }, 800);
  }

  // ── KEYBOARD shortcut: M = mute ──
  document.addEventListener('keydown', e => {
    if (e.code === 'KeyM') AudioManager.toggleMute();
  });

  // ── BUTTON EFFECTS ──
  function addButtonSounds(selector, isModeCard = false) {
    const els = document.querySelectorAll(selector);
    els.forEach(el => {
      el.addEventListener('mouseenter', () => AudioManager.playHover());
      el.addEventListener('click', () => AudioManager.playClick());
    });
  }
  addButtonSounds('.nav-btn');
  addButtonSounds('.mode-card');
  addButtonSounds('.rank-tab');
  addButtonSounds('.pause-box .nav-btn');

  // ── Initial screen ──
  UIManager.show('main');
});
