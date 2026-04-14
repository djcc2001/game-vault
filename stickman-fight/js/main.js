/**
 * main.js
 * Stickman Fight Legends Pro
 *
 * Application entry point.
 * Wires together UI screens, user choices, and the Game engine.
 * Also manages localStorage stats.
 */

// ── APP STATE ────────────────────────────────────────────────
const AppState = {
  mode:       'pvp',
  difficulty: 'normal', // 'easy' | 'normal' | 'hard'
  p1Char:     'thunder',
  p2Char:     'blaze',
  arenaKey:   'neon',
};

/** @type {Game|null} */
let activeGame = null;

// ── STATS — localStorage ──────────────────────────────────────
function loadStats() {
  try {
    return JSON.parse(localStorage.getItem('sflp_stats') || '{}');
  } catch { return {}; }
}

function saveStats(stats) {
  localStorage.setItem('sflp_stats', JSON.stringify(stats));
}

function recordWin(winner) {
  const stats = loadStats();
  if (winner === 'p1')   stats.winsPlayer1 = (stats.winsPlayer1 || 0) + 1;
  else if (winner === 'p2' && AppState.mode === 'pvc') stats.winsCPU = (stats.winsCPU || 0) + 1;
  else if (winner === 'p2') stats.winsPlayer2 = (stats.winsPlayer2 || 0) + 1;
  saveStats(stats);
}

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  AudioManager.init();
  InputHandler.init();

  // Unlock audio on first interaction
  document.addEventListener('click', () => { AudioManager.resume(); }, { once: true });
  document.addEventListener('keydown', () => { AudioManager.resume(); }, { once: true });

  // Wire up main menu buttons
  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      AudioManager.play('tick');
      const action = btn.dataset.action;
      switch (action) {
        case 'play':         UIManager.showScreen('mode');         break;
        case 'instructions': UIManager.showScreen('instructions'); break;
        case 'stats':
          UIManager.renderStats(loadStats());
          UIManager.showScreen('stats');
          break;
        case 'credits':      UIManager.showScreen('credits');      break;
      }
    });
  });

  // ── BACK BUTTONS ─────────────────────────────────────────────
  document.querySelectorAll('.btn-back, .btn-back-instr').forEach(btn => {
    btn.addEventListener('click', () => {
      AudioManager.play('tick');
      const screen = btn.closest('.screen').id.replace('screen-', '');
      const backMap = {
        'mode':         'main-menu',
        'char-select':  'mode',
        'arena-select': 'char-select',
        'instructions': 'main-menu',
        'stats':        'main-menu',
        'credits':      'main-menu',
        'match-over':   'main-menu',
      };
      const dest = backMap[screen] || 'main-menu';
      
      if (dest === 'main-menu') {
        _goMainMenu();
      } else if (dest === 'mode') {
        _refreshModeScreen();
        UIManager.showScreen(dest);
      } else {
        UIManager.showScreen(dest);
      }
    });
  });

  function _refreshModeScreen() {
    document.querySelectorAll('.mode-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.mode === AppState.mode);
    });
    const diffSection = document.getElementById('difficulty-section');
    diffSection.classList.toggle('hidden', AppState.mode !== 'pvc');
    document.getElementById('p2-label').textContent =
      AppState.mode === 'pvc' ? 'CPU' : 'Jugador 2';
  }

  // ── MODE SELECT ───────────────────────────────────────────────
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      AudioManager.play('tick');
      document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      AppState.mode = card.dataset.mode;

      // Show/hide difficulty section
      const diffSection = document.getElementById('difficulty-section');
      diffSection.classList.toggle('hidden', AppState.mode !== 'pvc');

      document.getElementById('p2-label').textContent =
        AppState.mode === 'pvc' ? 'CPU' : 'Jugador 2';
    });
  });

  // Difficulty buttons
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      AudioManager.play('tick');
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      AppState.difficulty = btn.dataset.diff;
    });
  });

  // Mode → Char select
  document.getElementById('btn-mode-next').addEventListener('click', () => {
    AudioManager.play('tick');
    
    const p2Label = document.getElementById('p2-label');
    const p2Pick = document.getElementById('p2-pick');
    
    if (AppState.mode === 'pvc') {
      const cpuChars = CHARACTER_KEYS.filter(k => k !== AppState.p1Char);
      AppState.p2Char = cpuChars[Math.floor(Math.random() * cpuChars.length)];
      p2Label.textContent = 'CPU: ' + CHARACTERS[AppState.p2Char].name;
      p2Pick.style.opacity = '0.6';
      p2Pick.style.pointerEvents = 'none';
    } else {
      p2Label.textContent = 'Jugador 2';
      p2Pick.style.opacity = '1';
      p2Pick.style.pointerEvents = 'all';
    }
    
    UIManager.buildCharSelect(
      { 1: AppState.p1Char, 2: AppState.p2Char },
      (pNum, key) => {
        if (pNum === 1) AppState.p1Char = key;
        else            AppState.p2Char = key;
      }
    );
    UIManager.showScreen('char-select');
  });

  // ── CHAR SELECT → ARENA ───────────────────────────────────────
  document.getElementById('btn-to-arena').addEventListener('click', () => {
    AudioManager.play('tick');
    
    // CPU character already randomized in btn-mode-next
    // Just update the display to show which character was selected
    
    UIManager.buildArenaGrid(AppState.arenaKey, key => { AppState.arenaKey = key; });
    UIManager.showScreen('arena-select');
  });

  // ── START FIGHT ───────────────────────────────────────────────
  document.getElementById('btn-start-fight').addEventListener('click', async () => {
    AudioManager.play('roundStart');
    UIManager.stopAllPreviews();
    _startFight();
  });

  // ── MATCH OVER — REMATCH ──────────────────────────────────────
  document.getElementById('btn-rematch').addEventListener('click', async () => {
    UIManager.showScreen('game');
    await activeGame.rematch();
  });

  // ── MATCH OVER — MAIN MENU ────────────────────────────────────
  document.getElementById('btn-main-menu-from-over').addEventListener('click', () => {
    _goMainMenu();
  });

  // ── PAUSE BUTTONS ─────────────────────────────────────────────
  document.getElementById('btn-pause-resume').addEventListener('click', () => {
    if (activeGame) activeGame.resume();
  });
  document.getElementById('btn-pause-menu').addEventListener('click', () => {
    _goMainMenu();
  });

  // ── STATS RESET ───────────────────────────────────────────────
  document.getElementById('btn-reset-stats').addEventListener('click', () => {
    saveStats({ winsPlayer1: 0, winsPlayer2: 0, winsCPU: 0 });
    UIManager.renderStats(loadStats());
  });

  // Start background music on main menu
  AudioManager.startMusic();
});

// ── HELPERS ───────────────────────────────────────────────────

function _startFight() {
  const canvas = document.getElementById('game-canvas');
  if (activeGame) activeGame.stop();
  activeGame = new Game(canvas);

  // Stop menu music, start game mp3 music
  AudioManager.stopMusic();
  AudioManager.startGameMusic();

  // Only match-end callback now (rounds auto-advance internally)
  activeGame.onMatchEnd = (winner, p1R, p2R) => {
    recordWin(winner);
    const winnerName = _winnerName(winner);
    UIManager.showMatchOver(winnerName, p1R, p2R);
    AudioManager.stopGameMusic();
    AudioManager.startMusic();
  };

  UIManager.showScreen('game');

  activeGame.startMatch({
    mode:       AppState.mode,
    difficulty: AppState.difficulty,
    arenaKey:   AppState.arenaKey,
    p1Char:     AppState.p1Char,
    p2Char:     AppState.p2Char,
  });
}

function _winnerName(winner) {
  if (winner === 'p1') return CHARACTERS[AppState.p1Char].name;
  if (winner === 'p2') {
    const name = CHARACTERS[AppState.p2Char].name;
    return AppState.mode === 'pvc' ? `CPU (${name})` : name;
  }
  return 'Empate';
}

function _goMainMenu() {
  if (activeGame) { activeGame.stop(); activeGame = null; }
  AudioManager.stopGameMusic();
  if (!AudioManager.isMenuMusicPlaying()) {
    AudioManager.stopMusic();
    AudioManager.startMusic();
  }
  UIManager.showScreen('main-menu');
}
