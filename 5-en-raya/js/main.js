/**
 * main.js — Orquestador principal de la aplicación
 * Inicialización y binding de eventos, sin variables globales
 */
const App = (() => {
  // ── ESTADO DE SESIÓN ───────────────────────────────────
  const _session = {
    mode:       'pvp',
    difficulty: 'medium',
    players:    { p1: 'Jugador 1', p2: 'Jugador 2' },
    aiPlayer:   2,
    startTime:  null,
    paused:     false,
    gameActive: false,
  };

  // ── BOOT ───────────────────────────────────────────────
  const start = () => {
    UI.init();
    _bindMenuEvents();
    _bindHoverEvents();
    _bindKeyboardEvents();
    UI.showScreen('screen-menu');
  };

  // ── EVENTOS DE TECLADO ────────────────────────────────
  const _bindKeyboardEvents = () => {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && _session.gameActive) {
        e.preventDefault();
        if (_session.paused) {
          _resumeGame();
        } else {
          _pauseGame();
        }
      }
    });
  };

  const _pauseGame = () => {
    _session.paused = true;
    Sounds.click();
    UI.showPause();
  };

  const _resumeGame = () => {
    _session.paused = false;
    Sounds.click();
    UI.hidePause();
  };

  // ── BINDING DE EVENTOS ─────────────────────────────────

  const _bindMenuEvents = () => {
    // Menú principal
    _on('btn-play',         () => { Sounds.click(); UI.showScreen('screen-mode'); });
    _on('btn-instructions', () => { Sounds.click(); UI.showScreen('screen-instructions'); });
    _on('btn-ranking',      () => {
      Sounds.click();
      UI.renderRanking(Storage.getRanking());
      UI.showScreen('screen-ranking');
    });

    // Instrucciones
    _on('btn-back-inst', () => { Sounds.click(); UI.showScreen('screen-menu'); });

    // Ranking
    _on('btn-back-rank', () => { Sounds.click(); UI.showScreen('screen-menu'); });
    _on('btn-clear-ranking', () => {
      Sounds.click();
      if (confirm('¿Borrar todo el historial?')) {
        Storage.clearRanking();
        UI.renderRanking([]);
      }
    });

    // Selección de modo
    _on('btn-back-menu',   () => { Sounds.click(); UI.showScreen('screen-menu'); });
    _on('btn-start-game',  () => { Sounds.select(); _startGame(); });

    _on('mode-pvp', () => {
      Sounds.select();
      _session.mode = 'pvp';
      _toggleModeCard('mode-pvp');
      UI.setP2InputVisibility(false);
    });
    _on('mode-pvc', () => {
      Sounds.select();
      _session.mode = 'pvc';
      _toggleModeCard('mode-pvc');
      UI.setP2InputVisibility(true);
    });

    // Dificultad
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        _session.difficulty = e.currentTarget.dataset.diff;
      });
    });

    // En el juego
    _on('btn-sound', () => {
      Sounds.click();
      const btn = document.getElementById('btn-sound');
      if (btn) {
        const isMuted = btn.classList.toggle('muted');
        Sounds.setEnabled(!isMuted);
      }
    });
    _on('btn-pause', () => {
      if (_session.paused) {
        _resumeGame();
      } else {
        _pauseGame();
      }
    });

    // Victoria
    _on('btn-play-again',   () => { Sounds.click(); _launchGame(); });
    _on('btn-victory-menu', () => {
      Sounds.click();
      Game.destroy();
      _session.gameActive = false;
      Sounds.stopBackground();
      UI.showScreen('screen-menu');
    });

    // Menú de pausa
    _on('btn-pause-restart', () => {
      Sounds.click();
      _session.paused = false;
      _launchGame();
    });
    _on('btn-pause-resume', () => {
      _resumeGame();
    });
    _on('btn-pause-exit', () => {
      Sounds.click();
      _session.paused = false;
      Game.destroy();
      _session.gameActive = false;
      Sounds.stopBackground();
      UI.showScreen('screen-menu');
    });
  };

  const _on = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };

  const _onHover = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('mouseenter', () => Sounds.hover());
    }
  };

  const _bindHoverEvents = () => {
    document.querySelectorAll('.nav-btn, .mode-card, .diff-btn, .pause-btn, .icon-btn').forEach(el => {
      el.addEventListener('mouseenter', () => Sounds.hover());
    });
  };

  const _toggleModeCard = (activeId) => {
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
    const el = document.getElementById(activeId);
    if (el) el.classList.add('selected');
  };

  // ── INICIO DE PARTIDA ──────────────────────────────────
  const _startGame = () => {
    const p1Input = document.getElementById('p1-name');
    const p2Input = document.getElementById('p2-name');

    _session.players.p1 = (p1Input?.value.trim() || 'Jugador 1').substring(0, 12);
    _session.players.p2 = _session.mode === 'pvc'
      ? 'CPU'
      : (p2Input?.value.trim() || 'Jugador 2').substring(0, 12);

    _launchGame();
  };

  const _launchGame = () => {
    Game.destroy();

    const canvas = document.getElementById('game-canvas');
    UI.showScreen('screen-game');
    UI.setPlayerNames(_session.players.p1, _session.players.p2);
    UI.updateTurn(1, _session.players.p1);
    UI.updateMoveCount(1);
    UI.setThinking(false);
    _session.gameActive = true;
    _session.paused = false;

    const options = {
      mode:       _session.mode,
      difficulty: _session.difficulty,
      aiPlayer:   _session.aiPlayer,
      players:    { ..._session.players },
    };

    Game.init(canvas, options, _onGameEvent);
    Sounds.startGame();
    Sounds.startBackground();

    // Si la IA juega primero (negras)
    if (_session.mode === 'pvc' && _session.aiPlayer === 1) {
      UI.setThinking(true);
    }
  };

  // ── EVENTOS DEL JUEGO ──────────────────────────────────
  const _onGameEvent = (evt) => {
    switch (evt.type) {
      case 'thinking':
        UI.setThinking(evt.value);
        break;

      case 'turn': {
        const name = evt.player === 1 ? _session.players.p1 : _session.players.p2;
        UI.updateTurn(evt.player, name);
        const state = Game.getState();
        if (state) UI.updateMoveCount(state.moves + 1);
        break;
      }

      case 'gameover':
        _handleGameOver(evt);
        break;
    }
  };

  const _handleGameOver = ({ winner, moves, duration, players, mode, aiPlayer }) => {
    UI.setThinking(false);
    _session.gameActive = false;

    const isDraw = winner === 0;
    let winnerName = '';
    let loserName  = '';

    if (!isDraw) {
      winnerName = winner === 1 ? players.p1 : players.p2;
      loserName  = winner === 1 ? players.p2 : players.p1;

      // Guardar en ranking (solo victorias reales, no CPU como ganador en perdida)
      const isCpuWin = mode === 'pvc' && winner === aiPlayer;
      if (!isCpuWin) {
        Storage.addResult({
          winner: winnerName,
          loser:  loserName,
          mode, moves, duration,
        });
      }

      // Sonido de victoria o derrota
      if (mode === 'pvc' && winner !== aiPlayer) {
        Sounds.victory(); // ¡Ganaste!
      } else if (mode === 'pvc' && winner === aiPlayer) {
        Sounds.defeat(); // Perdiste
      } else {
        Sounds.victory(); // PvP: alguien ganó
      }
    } else {
      Sounds.draw(); // Empate
    }

    setTimeout(() => {
      UI.showVictory({ winnerName, moves, duration, isDraw });
    }, 800);
  };

  return Object.freeze({ start });
})();

// ── ARRANQUE ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', App.start);
