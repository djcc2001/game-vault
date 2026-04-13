/**
 * game.js
 * Núcleo del juego. Gestiona el loop de gameplay, entidades,
 * colisiones, oleadas de supervivencia y efectos de pantalla.
 * Se comunica con StateMachine para transiciones de estado.
 */

const Game = (() => {

  // ─── Referencias canvas ───────────────────────────────────────
  let canvas = null, ctx = null;
  let canvasW = 0,   canvasH = 0;

  // ─── Entidades activas ────────────────────────────────────────
  let player1      = null;   // Tank jugador 1 (siempre presente)
  let player2      = null;   // Tank jugador 2 (modo vs_player)
  let cpuTanks     = [];     // Tanques CPU
  let aiControllers = [];    // AIController por cada CPU

  // ─── Modo y mapa ──────────────────────────────────────────────
  let gameMode   = 'vs_cpu';
  let currentMap = null;

  // ─── Supervivencia ────────────────────────────────────────────
  let survivalTime   = 0;
  let waveNumber     = 1;
  let waveSpawnTimer = 0;   // cuenta atrás hasta próxima oleada
  let wavePending    = false;

  // ─── Efectos de pantalla ──────────────────────────────────────
  let screenShake = 0;   // píxeles de vibración, decae con dt
  let screenFlash = 0;   // opacidad 0-1 del flash blanco

  // ─── Control de ronda ─────────────────────────────────────────
  let roundOver  = false;
  let roundTimer = 0;    // tiempo hasta transición automática a gameOver

  // ═══════════════════════════════════════════════════════════════
  //  INICIALIZACIÓN
  // ═══════════════════════════════════════════════════════════════

  function init(c) {
    canvas  = c;
    ctx     = c.getContext('2d');
    canvasW = c.width;
    canvasH = c.height;
  }

  /**
   * Arranca una nueva partida completa.
   * Llama a esto desde countdown.enter() cada vez.
   */
  function startGame(mode, mapIdx) {
    gameMode       = mode;
    roundOver      = false;
    roundTimer     = 0;
    survivalTime   = 0;
    waveNumber     = 1;
    waveSpawnTimer = 0;
    wavePending    = false;
    screenShake    = 0;
    screenFlash    = 0;

    currentMap = MapManager.loadMap(mapIdx, canvasW, canvasH);

    _spawnPlayers();
    _spawnEnemies();
  }

  // ─── Spawn de jugadores ───────────────────────────────────────
  function _spawnPlayers() {
    const sp = currentMap.spawns;

    player1 = new Tank(
      sp[0].x, sp[0].y, sp[0].angle,
      'player1', '#00ff41', '#009922', '#00eeff'
    );

    player2 = (gameMode === 'vs_player')
      ? new Tank(sp[1].x, sp[1].y, sp[1].angle,
                 'player2', '#00eeff', '#0088aa', '#ff4081')
      : null;
  }

  // ─── Spawn de CPUs ────────────────────────────────────────────
  function _spawnEnemies() {
    cpuTanks      = [];
    aiControllers = [];

    if (gameMode === 'vs_player') return;

    const diff   = DifficultyManager.getParams();
    const sp     = currentMap.spawns;

    // En supervivencia la cantidad escala con la oleada (máx 4 o spawns disponibles)
    let count = 1;
    if (gameMode === 'survival') {
      count = Math.min(
        diff.waveEnemies + Math.floor((waveNumber - 1) / 2),
        4,
        sp.length - 1
      );
    }
    count = Math.max(1, count);

    const PALETTE = [
      ['#ff1744','#aa0022','#ff6600'],
      ['#e040fb','#8800bb','#ff80ff'],
      ['#ff6600','#bb3300','#ffcc00'],
      ['#ff4081','#aa0055','#ff00cc']
    ];

    for (let i = 0; i < count; i++) {
      const spIndex = (i + 1) % sp.length;
      const [bodyC, barrelC, bulletC] = PALETTE[i % PALETTE.length];
      const cpu = new Tank(
        sp[spIndex].x, sp[spIndex].y, sp[spIndex].angle,
        'cpu', bodyC, barrelC, bulletC
      );
      cpu.shootCooldownMax = diff.cpuShootCooldown;

      const ai = new AIController(cpu, diff);
      cpuTanks.push(cpu);
      aiControllers.push(ai);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════════════════════════════

  function update(dt) {
    // Si la ronda ya terminó, esperar y transicionar
    if (roundOver) {
      roundTimer -= dt;
      if (roundTimer <= 0) _triggerGameOver();
      // Seguir actualizando partículas
      _updateParticlesOnly(dt);
      return;
    }

    // Decaer efectos de pantalla
    screenShake = Math.max(0, screenShake - dt * 10);
    screenFlash = Math.max(0, screenFlash - dt * 5);

    const obs = currentMap.obstacles;

    // ── Jugador 1 ───────────────────────────────────────────────
    if (player1) {
      if (player1.alive) player1.update(dt, InputHandler.P1, obs, canvasW, canvasH);
      else               player1.updateParticles(dt);
    }

    // ── Jugador 2 ───────────────────────────────────────────────
    if (player2) {
      if (player2.alive) player2.update(dt, InputHandler.P2, obs, canvasW, canvasH);
      else               player2.updateParticles(dt);
    }

    // ── CPUs ────────────────────────────────────────────────────
    cpuTanks.forEach((cpu, i) => {
      if (!cpu.alive) { cpu.updateParticles(dt); return; }
      const ai       = aiControllers[i];
      const target   = _getBestTarget();
      // Pasamos TODAS las balas del jugador principal como amenaza para la IA
      const threats  = _getAllPlayerBullets();
      ai.update(target, threats, obs, canvasW, canvasH, dt);
      cpu.update(dt, ai.input, obs, canvasW, canvasH);
    });

    // ── Colisiones bala ↔ tanque ────────────────────────────────
    _processBulletCollisions();

    // ── Supervivencia: oleadas ──────────────────────────────────
    if (gameMode === 'survival' && player1 && player1.alive && StateMachine.getState() === 'playing') {
      survivalTime += dt;
      _manageWaves(dt);
    }

    // ── Comprobar fin de ronda ──────────────────────────────────
    _checkRoundEnd();
  }

  /** Actualiza solo partículas de tanques muertos (frame de round-over). */
  function _updateParticlesOnly(dt) {
    if (player1 && !player1.alive) player1.updateParticles(dt);
    if (player2 && !player2.alive) player2.updateParticles(dt);
    cpuTanks.forEach(c => { if (!c.alive) c.updateParticles(dt); });
  }

  /** Devuelve el primer jugador vivo (objetivo principal de la IA). */
  function _getBestTarget() {
    if (player1 && player1.alive) return player1;
    if (player2 && player2.alive) return player2;
    return null;
  }

  /** Recopila todas las balas activas de los jugadores. */
  function _getAllPlayerBullets() {
    const bullets = [];
    if (player1 && player1.alive) bullets.push(...player1.getActiveBullets());
    if (player2 && player2.alive) bullets.push(...player2.getActiveBullets());
    return bullets;
  }

  // ─── Colisiones bala ↔ tanque ─────────────────────────────────
  function _processBulletCollisions() {
    // Balas de P1 → CPUs y P2
    if (player1 && player1.alive) {
      for (const b of player1.getActiveBullets()) {
        if (!b.alive) continue;
        for (const cpu of cpuTanks) {
          if (!cpu.alive || !b.alive) continue;
          if (Collision.bulletVsTank(b.x, b.y, b.radius, cpu.x, cpu.y, cpu.hitRadius)) {
            b.destroy(); cpu.hit(); _onKill('cpu'); break;
          }
        }
        if (!b.alive) continue;
        if (player2 && player2.alive &&
            Collision.bulletVsTank(b.x, b.y, b.radius, player2.x, player2.y, player2.hitRadius)) {
          b.destroy(); player2.hit(); _onKill('player2');
        }
      }
    }

    // Balas de P2 → CPUs y P1
    if (player2 && player2.alive) {
      for (const b of player2.getActiveBullets()) {
        if (!b.alive) continue;
        for (const cpu of cpuTanks) {
          if (!cpu.alive || !b.alive) continue;
          if (Collision.bulletVsTank(b.x, b.y, b.radius, cpu.x, cpu.y, cpu.hitRadius)) {
            b.destroy(); cpu.hit(); _onKill('cpu'); break;
          }
        }
        if (!b.alive) continue;
        if (player1 && player1.alive &&
            Collision.bulletVsTank(b.x, b.y, b.radius, player1.x, player1.y, player1.hitRadius)) {
          b.destroy(); player1.hit(); _onKill('player1');
        }
      }
    }

    // Balas de CPUs → jugadores (los CPUs no se dañan entre sí)
    for (const cpu of cpuTanks) {
      if (!cpu.alive) continue;
      for (const b of cpu.getActiveBullets()) {
        if (!b.alive) continue;
        if (player1 && player1.alive &&
            Collision.bulletVsTank(b.x, b.y, b.radius, player1.x, player1.y, player1.hitRadius)) {
          b.destroy(); player1.hit(); _onKill('player1'); continue;
        }
        if (!b.alive) continue;
        if (player2 && player2.alive &&
            Collision.bulletVsTank(b.x, b.y, b.radius, player2.x, player2.y, player2.hitRadius)) {
          b.destroy(); player2.hit(); _onKill('player2');
        }
      }
    }
  }

  /** Efectos al destruir un tanque. */
  function _onKill(type) {
    screenShake = 12;
    screenFlash = 0.7;
    AudioManager.playExplosion();
  }

  // ─── Gestión de oleadas (supervivencia) ───────────────────────
  function _manageWaves(dt) {
    const allCpuDead = cpuTanks.length > 0 && cpuTanks.every(c => !c.alive);
    if (!allCpuDead) return;

    if (!wavePending) {
      waveSpawnTimer = DifficultyManager.getParams().waveDelay;
      wavePending    = true;
    }

    waveSpawnTimer -= dt;
    if (waveSpawnTimer <= 0) {
      waveNumber++;
      wavePending = false;
      _spawnEnemies();
    }
  }

  // ─── Fin de ronda ─────────────────────────────────────────────
  function _checkRoundEnd() {
    if (roundOver) return;

    const p1Dead  = !player1 || !player1.alive;
    const p2Dead  = !player2 || !player2.alive;
    const cpuDead = cpuTanks.length > 0 && cpuTanks.every(c => !c.alive);

    if (gameMode === 'vs_cpu') {
      if (cpuDead) {
        _endRound('JUGADOR 1 GANA!', '#00ff41');
        _saveWin('winsPlayer1');
        AudioManager.playVictory();
      } else if (p1Dead) {
        _endRound('CPU GANA!', '#ff1744');
        _saveWin('winsCPU');
        AudioManager.playDefeat();
      }
    } else if (gameMode === 'vs_player') {
      if (p1Dead && !p2Dead) {
        _endRound('JUGADOR 2 GANA!', '#00eeff');
        _saveWin('winsPlayer2');
        AudioManager.playVictory();
      } else if (p2Dead && !p1Dead) {
        _endRound('JUGADOR 1 GANA!', '#00ff41');
        _saveWin('winsPlayer1');
        AudioManager.playVictory();
      } else if (p1Dead && p2Dead) {
        _endRound('EMPATE!', '#ffe600');
        AudioManager.playDefeat();
      }
    } else if (gameMode === 'survival') {
      if (p1Dead) {
        _saveSurvivalTime(survivalTime);
        const timeStr = UIManager.formatTime(survivalTime);
        _endRound(`OLEADA ${waveNumber}  •  ${timeStr}`, '#ff4081');
        AudioManager.playDefeat();
      }
    }
  }

  function _endRound(text, color) {
    roundOver  = true;
    roundTimer = 2.8;
    StateMachine.setGameOverData({ winnerText: text, winnerColor: color });
  }

  function _triggerGameOver() {
    AudioManager.stopMusic();
    StateMachine.transition('gameOver');
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════

  function render() {
    ctx.save();

    // Vibración de pantalla
    if (screenShake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * screenShake * 2,
        (Math.random() - 0.5) * screenShake * 2
      );
    }

    // Mapa
    MapManager.draw(ctx);

    // Tanques (partículas + sprite)
    if (player1)  player1.draw(ctx);
    if (player2)  player2.draw(ctx);
    cpuTanks.forEach(c => c.draw(ctx));

    ctx.restore();

    // Flash blanco (sin shake para que cubra todo)
    if (screenFlash > 0) {
      UIManager.drawScreenFlash(screenFlash * 0.35);
    }

    // HUD
    UIManager.drawHUD({
      mode:          gameMode,
      p1:            player1,
      p2:            player2,
      cpus:          cpuTanks,
      survivalTime,
      wave:          waveNumber,
      mapName:       currentMap ? currentMap.name : '',
      waveCountdown: wavePending ? waveSpawnTimer : 0
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  PERSISTENCIA  (localStorage)
  // ═══════════════════════════════════════════════════════════════

  const STORAGE_KEY = 'tankBattleStats';

  function _loadStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const def = { winsPlayer1:0, winsPlayer2:0, winsCPU:0, highestSurvivalTime:0 };
      return raw ? Object.assign(def, JSON.parse(raw)) : def;
    } catch { return { winsPlayer1:0, winsPlayer2:0, winsCPU:0, highestSurvivalTime:0 }; }
  }

  function _saveWin(key) {
    try {
      const s = _loadStats();
      s[key] = (s[key] || 0) + 1;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {}
  }

  function _saveSurvivalTime(t) {
    try {
      const s = _loadStats();
      if (t > (s.highestSurvivalTime || 0)) {
        s.highestSurvivalTime = t;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      }
    } catch {}
  }

  function loadStats() { return _loadStats(); }

  // ═══════════════════════════════════════════════════════════════
  //  LIMPIEZA
  // ═══════════════════════════════════════════════════════════════

  function stop() {
    AudioManager.stopMusic();
    player1 = player2 = null;
    cpuTanks = []; aiControllers = [];
    roundOver = false;
  }

  // ─── API pública ──────────────────────────────────────────────
  return { init, startGame, update, render, stop, loadStats };

})();
