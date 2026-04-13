/**
 * main.js
 * Punto de entrada de la aplicación.
 * Configura el canvas, registra todos los estados en la StateMachine,
 * y arranca el game loop principal con requestAnimationFrame.
 */

(function () {
  'use strict';

  // ─── Canvas setup ────────────────────────────────────────────
  const canvas  = document.getElementById('gameCanvas');
  const ctx     = canvas.getContext('2d');

  // Resolución base del juego (se escala con CSS)
  const BASE_W = 800;
  const BASE_H = 600;
  canvas.width  = BASE_W;
  canvas.height = BASE_H;

  // Escalar canvas para llenar la ventana manteniendo aspect ratio
  function resizeCanvas() {
    const scaleX = window.innerWidth  / BASE_W;
    const scaleY = window.innerHeight / BASE_H;
    const scale  = Math.min(scaleX, scaleY);
    canvas.style.width  = `${BASE_W * scale}px`;
    canvas.style.height = `${BASE_H * scale}px`;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // ─── Inicializar módulos ─────────────────────────────────────
  AudioManager.init();
  InputHandler.init();
  UIManager.init(canvas);
  Game.init(canvas);

  // ─── Helpers de navegación de menú ──────────────────────────
  /**
   * Crea un listener de teclado para navegar un menú con W/S y confirmar con F o Enter
   */
  function makeMenuNav(getIndex, setIndex, getLength, onConfirm, onBack) {
    return function (code, type) {
      if (type !== 'down') return;

      if (code === 'KeyW' || code === 'ArrowUp') {
        AudioManager.playMenuClick();
        setIndex((getIndex() - 1 + getLength()) % getLength());
      } else if (code === 'KeyS' || code === 'ArrowDown') {
        AudioManager.playMenuClick();
        setIndex((getIndex() + 1) % getLength());
      } else if (code === 'KeyF' || code === 'Enter') {
        AudioManager.playMenuSelect();
        onConfirm(getIndex());
      } else if (onBack && (code === 'Escape' || code === 'KeyQ')) {
        AudioManager.playMenuClick();
        onBack();
      }
    };
  }

  // ─── Registro de estados ─────────────────────────────────────

  // ── MENU PRINCIPAL ─────────────────────────────────────────
  let menuNavListener = null;
  StateMachine.register('menu', {
    enter() {
      AudioManager.startMenuMusic();
      menuNavListener = InputHandler.addMenuListener(
        makeMenuNav(
          StateMachine.getMenuSelectedIndex,
          StateMachine.setMenuSelected,
          StateMachine.getMenuLength,
          (i) => {
            const item = StateMachine.getMenuItems()[i];
            StateMachine.transition(item.state);
          }
        )
      );
    },
    exit() {
      if (menuNavListener) menuNavListener();
      menuNavListener = null;
    },
    update() {},
    render() {
      UIManager.tick();
      UIManager.drawMainMenu(
        StateMachine.getMenuSelectedIndex(),
        StateMachine.getMenuItems()
      );
    }
  });

  // ── SELECCIÓN DE MODO ───────────────────────────────────────
  let modeNavListener = null;
  StateMachine.register('modeSelect', {
    enter() {
      modeNavListener = InputHandler.addMenuListener((code, type) => {
        if (type !== 'down') return;

        if (code === 'KeyW' || code === 'ArrowUp') {
          AudioManager.playMenuClick();
          const current = StateMachine.getModeSelectedIndex();
          StateMachine.setModeSelected((current - 1 + StateMachine.getModeLength()) % StateMachine.getModeLength());
        } else if (code === 'KeyS' || code === 'ArrowDown') {
          AudioManager.playMenuClick();
          const current = StateMachine.getModeSelectedIndex();
          StateMachine.setModeSelected((current + 1) % StateMachine.getModeLength());
        } else if (code === 'KeyF' || code === 'Enter') {
          AudioManager.playMenuSelect();
          const idx = StateMachine.getModeSelectedIndex();
          if (idx === 1) {
            StateMachine.transition('mapSelect');
          } else {
            StateMachine.transition('difficultySelect');
          }
        } else if (code === 'Escape') {
          AudioManager.playMenuClick();
          StateMachine.transition('menu');
        }
      });
    },
    exit() { if (modeNavListener) modeNavListener(); modeNavListener = null; },
    update() {},
    render() {
      UIManager.tick();
      UIManager.drawModeSelect(StateMachine.getModeSelectedIndex());
    }
  });

  // ── SELECCIÓN DE DIFICULTAD ─────────────────────────────────
  let diffNavListener = null;
  StateMachine.register('difficultySelect', {
    enter() {
      diffNavListener = InputHandler.addMenuListener(
        makeMenuNav(
          StateMachine.getDiffSelectedIndex,
          StateMachine.setDiffSelected,
          StateMachine.getDiffLength,
          () => StateMachine.transition('mapSelect'),
          () => StateMachine.transition('modeSelect')
        )
      );
    },
    exit() { if (diffNavListener) diffNavListener(); diffNavListener = null; },
    update() {},
    render() {
      UIManager.tick();
      UIManager.drawDifficultySelect(StateMachine.getDiffSelectedIndex());
    }
  });

  // ── SELECCIÓN DE MAPA ───────────────────────────────────────
  let mapNavListener = null;
  StateMachine.register('mapSelect', {
    enter() {
      mapNavListener = InputHandler.addMenuListener(
        makeMenuNav(
          StateMachine.getMapSelectedIndex,
          StateMachine.setMapSelected,
          StateMachine.getMapLength,
          (i) => {
            StateMachine.setMapSelected(i);
            StateMachine.transition('countdown');
          },
          () => StateMachine.transition('difficultySelect')
        )
      );
    },
    exit() { if (mapNavListener) mapNavListener(); mapNavListener = null; },
    update() {},
    render() {
      UIManager.tick();
      UIManager.drawMapSelect(StateMachine.getMapSelectedIndex());
    }
  });

  // ── CUENTA REGRESIVA ────────────────────────────────────────
  let countdownValue = 3;
  let countdownTimer = 0;
  StateMachine.register('countdown', {
    enter() {
      countdownValue = 3;
      countdownTimer = 1.0;
      AudioManager.stopMenuMusic();
      AudioManager.stopMusic();
      // Arrancar juego (resetea estado completo)
      Game.startGame(
        StateMachine.getSelectedMode(),
        StateMachine.getSelectedMap()
      );
    },
    exit() {},
    update(dt) {
      // Seguir actualizando el juego en el fondo para que las partículas se vean
      countdownTimer -= dt;
      if (countdownTimer <= 0) {
        if (countdownValue > 1) {
          countdownTimer = 1.0;
          countdownValue--;
          AudioManager.playMenuClick();
        } else {
          // ¡YA! Pasar a playing
          StateMachine.transition('playing');
        }
      }
    },
    render() {
      // Renderizar el mapa de fondo
      Game.render();
      // Overlay semitransparente
      ctx.fillStyle = 'rgba(5,10,14,0.65)';
      ctx.fillRect(0, 0, BASE_W, BASE_H);
      // Número de cuenta atrás
      UIManager.drawCountdown(countdownValue, '#ffe600');
      // Texto preparatorio
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe60088';
      ctx.fillText('PREPARATE!', BASE_W / 2, BASE_H / 2 + 55);
    }
  });

  // ── PLAYING ─────────────────────────────────────────────────
  let pauseKeyHeld = false;
  StateMachine.register('playing', {
    enter() {
      pauseKeyHeld = true;
      AudioManager.stopMenuMusic();
      AudioManager.startMusic();
    },
    exit() {},
    update(dt) {
      // Toggle pausa con ESC o P
      if (InputHandler.Global.pause && !pauseKeyHeld) {
        pauseKeyHeld = true;
        StateMachine.transition('paused');
        return;
      }
      if (!InputHandler.Global.pause) pauseKeyHeld = false;

      Game.update(dt);
    },
    render() {
      Game.render();
    }
  });

  // ── PAUSA ───────────────────────────────────────────────────
  let pauseNavListener = null;
  StateMachine.register('paused', {
    enter() {
      AudioManager.stopMusic();
      StateMachine.setPauseSelected(0);
      pauseNavListener = InputHandler.addMenuListener((code, type) => {
        if (type !== 'down') return;
        if (code === 'KeyW' || code === 'ArrowUp') {
          AudioManager.playMenuClick();
          StateMachine.setPauseSelected(
            (StateMachine.getPauseSelectedIndex() - 1 + StateMachine.getPauseLength()) % StateMachine.getPauseLength()
          );
        } else if (code === 'KeyS' || code === 'ArrowDown') {
          AudioManager.playMenuClick();
          StateMachine.setPauseSelected(
            (StateMachine.getPauseSelectedIndex() + 1) % StateMachine.getPauseLength()
          );
        } else if (code === 'KeyF' || code === 'Enter') {
          AudioManager.playMenuSelect();
          const sel = StateMachine.getPauseSelectedIndex();
          if (sel === 0) {
            StateMachine.transition('playing'); // Continuar → reanuda música en enter de playing
          } else {
            Game.stop();
            StateMachine.transition('menu');
          }
        } else if (code === 'Escape' || code === 'KeyP') {
          // ESC de nuevo = continuar
          AudioManager.playMenuClick();
          StateMachine.transition('playing');
        }
      });
    },
    exit() {
      if (pauseNavListener) pauseNavListener();
      pauseNavListener = null;
    },
    update() {},
    render() {
      UIManager.tick();
      Game.render();
      UIManager.drawPause(StateMachine.getPauseSelectedIndex());
    }
  });

  // ── GAME OVER ───────────────────────────────────────────────
  let goNavListener = null;
  StateMachine.register('gameOver', {
    enter() {
      AudioManager.stopMusic();
      AudioManager.startMenuMusic();
      StateMachine.setGameOverSelected(0);
      goNavListener = InputHandler.addMenuListener((code, type) => {
        if (type !== 'down') return;
        if (code === 'KeyW' || code === 'ArrowUp') {
          AudioManager.playMenuClick();
          StateMachine.setGameOverSelected(0);
        } else if (code === 'KeyS' || code === 'ArrowDown') {
          AudioManager.playMenuClick();
          StateMachine.setGameOverSelected(1);
        } else if (code === 'KeyF' || code === 'Enter') {
          AudioManager.playMenuSelect();
          if (StateMachine.getGameOverSelectedIndex() === 0) {
            AudioManager.stopMenuMusic();
            StateMachine.transition('countdown');
          } else {
            Game.stop();
            AudioManager.stopMenuMusic();
            StateMachine.transition('menu');
          }
        }
      });
    },
    exit() {
      if (goNavListener) goNavListener();
      goNavListener = null;
    },
    update() {},
    render() {
      Game.render();
      UIManager.tick();
      const gd = StateMachine.getGameOverData();
      UIManager.drawGameOver(gd.winnerText, gd.winnerColor, StateMachine.getGameOverSelectedIndex());
    }
  });

  // ── INSTRUCCIONES ───────────────────────────────────────────
  let instrListener = null;
  StateMachine.register('instructions', {
    enter() {
      instrListener = InputHandler.addMenuListener((code, type) => {
        if (type !== 'down') return;
        if (['KeyF', 'Escape', 'Enter', 'Space'].includes(code)) {
          AudioManager.playMenuClick();
          StateMachine.transition('menu');
        }
      });
    },
    exit() { if (instrListener) instrListener(); instrListener = null; },
    update() {},
    render() {
      UIManager.tick();
      UIManager.drawInstructions();
    }
  });

  // ── ESTADÍSTICAS ────────────────────────────────────────────
  let statsListener = null;
  StateMachine.register('stats', {
    enter() {
      statsListener = InputHandler.addMenuListener((code, type) => {
        if (type !== 'down') return;
        if (['KeyF', 'Escape', 'Enter', 'Space'].includes(code)) {
          AudioManager.playMenuClick();
          StateMachine.transition('menu');
        }
      });
    },
    exit() { if (statsListener) statsListener(); statsListener = null; },
    update() {},
    render() {
      UIManager.tick();
      UIManager.drawStats(Game.loadStats());
    }
  });

  // ── CRÉDITOS ────────────────────────────────────────────────
  let creditsListener = null;
  StateMachine.register('credits', {
    enter() {
      creditsListener = InputHandler.addMenuListener((code, type) => {
        if (type !== 'down') return;
        if (['KeyF', 'Escape', 'Enter', 'Space'].includes(code)) {
          AudioManager.playMenuClick();
          StateMachine.transition('menu');
        }
      });
    },
    exit() { if (creditsListener) creditsListener(); creditsListener = null; },
    update() {},
    render() {
      UIManager.tick();
      UIManager.drawCredits();
    }
  });

  // ─── Game Loop ────────────────────────────────────────────────
  let lastTime = 0;
  const MAX_DT = 1 / 20; // máximo deltaTime (evita saltos grandes)

  function loop(timestamp) {
    requestAnimationFrame(loop);

    const rawDt = (timestamp - lastTime) / 1000;
    lastTime    = timestamp;
    const dt    = Math.min(rawDt, MAX_DT);

    // Limpiar canvas
    ctx.clearRect(0, 0, BASE_W, BASE_H);

    // Actualizar y renderizar estado actual
    StateMachine.update(dt);
    StateMachine.render(ctx);
  }

  // ─── Inicio ──────────────────────────────────────────────────
  // Iniciar en el menú principal
  StateMachine.transition('menu');

  // Primer frame
  requestAnimationFrame((t) => {
    lastTime = t;
    requestAnimationFrame(loop);
  });

})();
