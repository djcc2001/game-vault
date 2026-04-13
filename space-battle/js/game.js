/**
 * game.js
 * Core game loop, state machine, and render coordinator.
 */

class Game {
  constructor(canvas) {
    this._canvas   = canvas;
    this._ctx      = canvas.getContext('2d');
    this._rafId    = null;
    this._lastTime = 0;

    // State
    this._state    = 'menu'; // 'menu' | 'playing' | 'paused' | 'levelup' | 'gameover' | 'victory'
    this._mode     = 'single';

    // Entities
    this._players     = [];
    this._enemies     = [];
    this._boss        = null;
    this._projectiles = [];
    this._particles   = [];
    this._aiController = null;

    // Timers
    this._waveTimer       = 0;
    this._levelUpTimer    = 0;
    this._bossSpawned     = false;
    this._betweenWaves    = false;

    // Background
    this._stars           = [];
    this._bgScrollY       = 0;
    this._nebulaOffset    = 0;

    this._resize();
    window.addEventListener('resize', () => this._resize());

    this._generateStars(200);
    this._loop(0);
  }

  // ────────────────────────────────────────────
  //  Public API
  // ────────────────────────────────────────────

  startGame(mode) {
    AudioManager.resume();
    AudioManager.stopBGM();
    this._mode = mode;
    this._resetGame();
    this._state = 'playing';
    UIManager.showHUD(mode === 'two-player' || mode === 'vs-cpu');
    AudioManager.playBGM(false, 1);
  }

  pause() {
    if (this._state !== 'playing') return;
    this._state = 'paused';
    UIManager.showScreen('screen-pause');
    AudioManager.stopBGM();
  }

  resume() {
    if (this._state !== 'paused') return;
    this._state = 'playing';
    UIManager.showHUD(this._mode === 'two-player' || this._mode === 'vs-cpu');
    AudioManager.playBGM(this._boss !== null);
  }

  restart() {
    this.startGame(this._mode);
  }

  returnToMenu() {
    this._state = 'menu';
    this._players = [];
    this._enemies = [];
    this._boss    = null;
    this._projectiles = [];
    this._particles   = [];
    AudioManager.stopBGM();
    AudioManager.playMenuBGM();
  }

  saveScore(name) {
    const totalScore = this._players.reduce((sum, p) => sum + p.score, 0);
    const level = LevelManager.getCurrentLevel();
    ScoreManager.addEntry(name, totalScore, level, this._mode);
  }

  // ────────────────────────────────────────────
  //  Init helpers
  // ────────────────────────────────────────────

  _resetGame() {
    this._players     = [];
    this._enemies     = [];
    this._boss        = null;
    this._projectiles = [];
    this._particles   = [];
    this._bossSpawned = false;
    this._betweenWaves = false;
    this._waveTimer   = 0;
    this._p1RespawnPending = false;
    this._p2RespawnPending = false;
    LevelManager.reset();

    const W = this._canvas.width;
    const H = this._canvas.height;
    const bounds = { x: 0, y: 0, w: W, h: H };

    // Player 1 always exists
    const p1 = new Player({ x: W / 2, y: H - 90, slot: 1 });
    p1.bounds = bounds;
    this._players.push(p1);

    if (this._mode === 'two-player') {
      const p2 = new Player({ x: W * 0.65, y: H - 90, slot: 2 });
      p2.bounds = bounds;
      this._players.push(p2);
    } else if (this._mode === 'vs-cpu') {
      const p2 = new Player({ x: W * 0.65, y: H - 90, slot: 2, speed: 260 });
      p2.bounds = bounds;
      this._players.push(p2);
      this._aiController = new AIController(p2);
    }

    // Spawn first wave
    LevelManager.advanceWave(); // sets wave to 1
    this._spawnCurrentWave();
    UIManager.updateLevel(LevelManager.getCurrentLevel());
  }

  _spawnCurrentWave() {
    const newEnemies = LevelManager.spawnWave(this._canvas.width);
    this._enemies.push(...newEnemies);
  }

  _generateStars(count) {
    const W = this._canvas.width || 1280;
    const H = this._canvas.height || 720;
    this._stars = [];
    for (let i = 0; i < count; i++) {
      this._stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.5 + 0.3,
        speed: Math.random() * 40 + 10,
        brightness: Math.random() * 0.6 + 0.4,
      });
    }
  }

  _resize() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    this._canvas.width  = W;
    this._canvas.height = H;
    this._players.forEach(p => { p.bounds = { x: 0, y: 0, w: W, h: H }; });
    if (this._stars.length === 0) this._generateStars(200);
  }

  // ────────────────────────────────────────────
  //  Game Loop
  // ────────────────────────────────────────────

  _loop(timestamp) {
    this._rafId = requestAnimationFrame(t => this._loop(t));
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
    this._lastTime = timestamp;

    if (this._state === 'playing') {
      this._update(dt);
    }

    if (this._state === 'playing' || this._state === 'paused') {
      const totalScore = this._mode === 'vs-cpu'
        ? this._players.reduce((sum, p) => sum + p.score, 0)
        : 0;
      this._players.forEach(p => {
        UIManager.updateHealth(p.slot, p.health / p.maxHealth);
        UIManager.updateScore(p.slot, this._mode === 'vs-cpu' ? totalScore : p.score);
      });
    }

    this._render();
    InputHandler.flush();
  }

  // ────────────────────────────────────────────
  //  Update
  // ────────────────────────────────────────────

  _update(dt) {
    const W = this._canvas.width;
    const H = this._canvas.height;

    if (InputHandler.wasPressed('Escape')) { this.pause(); return; }

    this._bgScrollY    = (this._bgScrollY + 30 * dt) % H;
    this._nebulaOffset = (this._nebulaOffset + 8 * dt) % H;

    this._stars.forEach(s => {
      s.y += s.speed * dt;
      if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
    });

    // Between-waves timer
    if (this._betweenWaves) {
      this._waveTimer -= dt;
      if (this._waveTimer <= 0) {
        this._betweenWaves = false;

        const cfg = LevelManager.getCurrentConfig();
        if (cfg.isBossLevel && this._bossSpawned && !this._boss) {
          // Spawn boss
          this._boss = LevelManager.spawnBoss(W);
          UIManager.showBossBar(true);
          AudioManager.stopBGM();
          AudioManager.playBGM(true, LevelManager.getCurrentLevel());
        } else {
          const { nextLevel } = LevelManager.advanceWave();
          
          if (nextLevel) {
            const scoreForCheck = this._mode === 'vs-cpu' 
              ? this._players.reduce((sum, p) => sum + p.score, 0)
              : Math.max(...this._players.map(p => p.score));
            if (!LevelManager.checkScoreRequirement(scoreForCheck)) {
              LevelManager.repeatLevel();
              this._showScoreWarning(LevelManager.getMinScore());
              this._betweenWaves = true;
              this._waveTimer = 3;
              return;
            }
            AudioManager.playLevelUp();
            UIManager.showLevelUp(LevelManager.getCurrentLevel());
            AudioManager.stopBGM();
            AudioManager.playBGM(false, LevelManager.getCurrentLevel());
            if (this._mode === 'two-player') {
              this._tryRespawnP1();
              this._tryRespawnP2();
            }
          }
          
          if (LevelManager.isMaxLevel()) {
            this._onVictory();
            return;
          }
          UIManager.updateLevel(LevelManager.getCurrentLevel());
          this._spawnCurrentWave();
        }
      }
      // Still update other things during transition
    }

    // Players
    this._players.forEach(p => {
      let input;
      if (this._mode === 'vs-cpu' && p.slot === 2) {
        input = this._aiController.getInput(dt, this._enemies, this._boss, this._projectiles, W, H);
      } else {
        input = InputHandler.getPlayerInput(p.slot);
      }
      p.update(dt, input, this._projectiles);
    });

    this._enemies.forEach(e => e.update(dt, W, H, this._projectiles));
    this._enemies = this._enemies.filter(e => e.active);

    if (this._boss) {
      this._boss.update(dt, W, H, this._projectiles);
      UIManager.updateBossHealth(this._boss.health / this._boss.maxHealth);
      if (!this._boss.active) {
        this._onVictory();
        return;
      }
    }

    this._projectiles.forEach(p => p.update(dt, H, W));
    this._projectiles = this._projectiles.filter(p => p.active);

    this._particles.forEach(p => p.update(dt));
    this._particles = this._particles.filter(p => p.life > 0);

    Collision.process(
      this._players, this._enemies, this._boss, this._projectiles,
      (enemy, scorer) => {
        this._spawnExplosion(enemy.x, enemy.y, enemy.width);
        if (scorer) scorer.addScore(enemy.pointValue);
      },
      (boss, scorer) => {
        this._spawnExplosion(boss.x, boss.y, 120, 40);
        if (scorer) scorer.addScore(boss.pointValue);
      }
    );

    // ── Game-over conditions per mode ──────────────────────────────
    const p1 = this._players.find(p => p.slot === 1);
    const p2 = this._players.find(p => p.slot === 2);

    if (this._mode === 'single' || this._mode === 'vs-cpu') {
      if (p1 && p1.lives <= 0) { this._onGameOver(); return; }
    } else if (this._mode === 'two-player') {
      const p1Dead = p1 && p1.lives <= 0;
      const p2Dead = p2 && p2.lives <= 0;
      if (p1Dead && p2Dead) { this._onGameOver(); return; }

      if (p1 && !p1.active && p1.lives <= 0 && p2 && p2.active) {
        if (!this._p1RespawnPending) this._p1RespawnPending = true;
      }
      if (p2 && !p2.active && p2.lives <= 0 && p1 && p1.active) {
        if (!this._p2RespawnPending) this._p2RespawnPending = true;
      }
    }

    // ── Wave check ──────────────────────────────────────────────────
    if (!this._betweenWaves && !this._boss && this._enemies.length === 0) {
      const cfg = LevelManager.getCurrentConfig();
      if (cfg.isBossLevel && LevelManager.getCurrentWave() >= cfg.wavesCount && !this._bossSpawned) {
        this._bossSpawned = true;
        this._betweenWaves = true;
        this._waveTimer = 1.8;
      } else if (!(cfg.isBossLevel && this._bossSpawned)) {
        this._betweenWaves = true;
        this._waveTimer = 2.2;
      }
    }
  }

  _showScoreWarning(required) {
    const msg = document.getElementById('score-warning');
    if (msg) {
      msg.textContent = `¡PUNTUACIÓN MÍNIMA: ${required.toLocaleString()}!`;
      msg.style.display = 'block';
      msg.style.opacity = '1';
      setTimeout(() => {
        if (msg) msg.style.opacity = '0';
      }, 2500);
      setTimeout(() => {
        if (msg) msg.style.display = 'none';
      }, 3000);
    }
  }

  /** Respawn P1 mid-game for 2-player co-op on level advance */
  _tryRespawnP1() {
    if (!this._p1RespawnPending) return;
    const p1 = this._players.find(p => p.slot === 1);
    if (!p1) return;
    p1.lives  = 1;
    p1.health = p1.maxHealth;
    p1.active = true;
    p1.x = this._canvas.width  * 0.35;
    p1.y = this._canvas.height - 90;
    this._p1RespawnPending = false;
    UIManager.updateHealth(1, 1);
  }

  /** Respawn P2 mid-game for 2-player co-op on level advance */
  _tryRespawnP2() {
    if (!this._p2RespawnPending) return;
    const p2 = this._players.find(p => p.slot === 2);
    if (!p2) return;
    p2.lives  = 1;
    p2.health = p2.maxHealth;
    p2.active = true;
    p2.x = this._canvas.width  * 0.65;
    p2.y = this._canvas.height - 90;
    this._p2RespawnPending = false;
    UIManager.updateHealth(2, 1);
  }

  // ────────────────────────────────────────────
  //  State transitions
  // ────────────────────────────────────────────

  _onGameOver() {
    this._state = 'gameover';
    AudioManager.stopBGM();
    AudioManager.playGameOver();
    const totalScore = this._players.reduce((sum, p) => sum + p.score, 0);
    UIManager.showGameOver({
      score: totalScore,
      level: LevelManager.getCurrentLevel(),
      mode:  this._mode,
    });
  }

  _onVictory() {
    this._state = 'victory';
    AudioManager.stopBGM();
    AudioManager.playVictory();
    const totalScore = this._players.reduce((sum, p) => sum + p.score, 0);
    UIManager.showVictory({
      score: totalScore,
      level: LevelManager.getCurrentLevel(),
      mode:  this._mode,
    });
  }

  // ────────────────────────────────────────────
  //  Particles
  // ────────────────────────────────────────────

  _spawnExplosion(x, y, size = 40, extra = 0) {
    const count = Math.floor(size / 4) + extra;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * size * 3 + 30;
      this._particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.5,
        maxLife: 0.6 + Math.random() * 0.5,
        r: Math.random() * 4 + 1,
        color: `hsl(${20 + Math.random() * 40},100%,${50 + Math.random() * 30}%)`,
        update(dt) {
          this.x += this.vx * dt;
          this.y += this.vy * dt;
          this.vx *= 0.92;
          this.vy *= 0.92;
          this.life -= dt;
        },
      });
    }
  }

  // ────────────────────────────────────────────
  //  Render
  // ────────────────────────────────────────────

  _render() {
    const ctx = this._ctx;
    const W   = this._canvas.width;
    const H   = this._canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Background
    this._renderBackground(ctx, W, H);

    if (this._state === 'playing' || this._state === 'paused') {
      this._renderGame(ctx, W, H);
    }
  }

  _renderBackground(ctx, W, H) {
    // Sky gradient
    const cfg = LevelManager.getCurrentConfig?.() ?? { bgColor: '#020510', nebulaColor: '#001a44' };
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, cfg.bgColor ?? '#020510');
    grad.addColorStop(1, '#000005');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Nebula blob
    ctx.save();
    ctx.globalAlpha = 0.12;
    const ngrad = ctx.createRadialGradient(W * 0.6, (this._nebulaOffset % H) - H * 0.3, 0, W * 0.6, H * 0.3, W * 0.6);
    ngrad.addColorStop(0, cfg.nebulaColor ?? '#001a44');
    ngrad.addColorStop(1, 'transparent');
    ctx.fillStyle = ngrad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Stars
    this._stars.forEach(s => {
      ctx.globalAlpha = s.brightness * (0.7 + 0.3 * Math.sin(Date.now() * 0.001 + s.x));
      ctx.fillStyle   = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  _renderGame(ctx, W, H) {
    // Projectiles (behind ships)
    this._projectiles.forEach(p => p.render(ctx));

    // Enemies
    this._enemies.forEach(e => e.render(ctx));

    // Boss
    if (this._boss) this._boss.render(ctx);

    // Players
    this._players.forEach(p => p.render(ctx));

    // Particles
    ctx.save();
    this._particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle   = p.color;
      ctx.shadowBlur  = 6;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
    ctx.restore();

    // Pause overlay
    if (this._state === 'paused') {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, W, H);
    }
  }
}
