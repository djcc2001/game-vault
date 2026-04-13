/**
 * game.js
 * Stickman Fight Legends Pro
 *
 * Core game loop: arena rendering, round management,
 * fighter updates, collision, HUD updates.
 */

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    // Layout
    this.W = 0; this.H = 0; this.groundY = 0;

    // Game objects
    this.p1 = null; this.p2 = null;
    this.particles  = new ParticleSystem();
    this.projectiles = new ProjectileManager();
    this.ai         = null; // set when mode is PvC

    // Config (set before start)
    this.mode       = 'pvp';
    this.difficulty = 'normal';
    this.arenaKey   = 'neon';
    this.p1Char     = 'thunder';
    this.p2Char     = 'blaze';

    // Round tracking
    this.round      = 1;
    this.maxRounds  = 3;
    this.p1Rounds   = 0;
    this.p2Rounds   = 0;
    this.roundTimer = 60; // seconds
    this.roundActive = false;
    this.paused      = false;

    // Hitstop (brief pause on impact)
    this.hitstopTimer = 0;

    // RAF
    this._rafId   = null;
    this._lastTs  = null;

    // Pause listener
    this._pauseHandler = () => this.togglePause();
    window.addEventListener('game:togglePause', this._pauseHandler);

    // Callbacks set by main.js
    this.onRoundEnd  = null;
    this.onMatchEnd  = null;

    this._resize();
    this._resizeHandler = () => this._resize();
    window.addEventListener('resize', this._resizeHandler);
  }

  _resize() {
    this.W = this.canvas.clientWidth  || window.innerWidth;
    this.H = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width  = this.W;
    this.canvas.height = this.H;
    this.groundY = this.H * 0.78;
  }

  /** Configure and start a new match */
  async startMatch(cfg) {
    this.mode       = cfg.mode;
    this.difficulty = cfg.difficulty || 'normal';
    this.arenaKey   = cfg.arenaKey;
    this.p1Char     = cfg.p1Char;
    this.p2Char     = cfg.p2Char;
    this.p1Rounds = 0;
    this.p2Rounds = 0;
    this.round    = 1;
    this._setupRound();
    this._startLoop();
    await this._announceRound();
    this.roundActive = true;
    this.paused      = false;
  }

  _setupRound() {
    this._resize();
    const gY = this.groundY;

    // Create fighters
    this.p1 = new Fighter('p1', this.p1Char, this.W * 0.28, gY, true);
    this.p2 = new Fighter('p2', this.p2Char, this.W * 0.72, gY, false);

    // AI
    if (this.mode === 'pvc') {
      this.ai = new AIController(this.p2, this.p1, this.difficulty);
    } else {
      this.ai = null;
    }

    this.particles.clear();
    this.projectiles.clear();
    this.roundTimer  = 60;
    this.roundActive = false;
    this.hitstopTimer = 0;
  }

  _startLoop() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._lastTs = null;
    const loop = (ts) => {
      if (this._lastTs === null) this._lastTs = ts;
      let dt = (ts - this._lastTs) / 1000;
      this._lastTs = ts;
      dt = Math.min(dt, 0.05); // cap delta time

      this._update(dt);
      this._draw();

      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    window.removeEventListener('game:togglePause', this._pauseHandler);
    window.removeEventListener('resize', this._resizeHandler);
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  togglePause() {
    if (!this.roundActive) return;
    this.paused = !this.paused;
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.classList.toggle('hidden', !this.paused);
  }

  /** Called by resume button */
  resume() {
    if (!this.paused) return;
    this.paused = false;
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  // ─── UPDATE ──────────────────────────────────────────────────

  _update(dt) {
    // Hitstop
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      InputHandler.endFrame();
      return;
    }

    if (!this.roundActive) {
      InputHandler.endFrame();
      return;
    }

    if (this.paused) {
      InputHandler.endFrame();
      return;
    }

    // Round timer
    this.roundTimer -= dt;
    if (this.roundTimer <= 0) {
      this.roundTimer = 0;
      this._endRound(this._timerWinner());
      return;
    }

    // ── FACE EACH OTHER ──────────────────────────────────────────
    // Update facing BEFORE processing attack inputs so punch/kick always
    // faces the opponent. Only skip when already committed to an action.
    if (!this.p1.sm.is('attack', 'kick', 'special', 'hit', 'ko')) {
      this.p1.facingRight = this.p2.pos.x > this.p1.pos.x;
    }
    if (!this.p2.sm.is('attack', 'kick', 'special', 'hit', 'ko')) {
      this.p2.facingRight = this.p1.pos.x > this.p2.pos.x;
    }

    // ── P1 INPUT ──────────────────────────────────────────────
    const p1In = InputHandler.p1();
    if (p1In.left)    this.p1.walkLeft(dt);
    if (p1In.right)   this.p1.walkRight(dt);
    if (p1In.jump)    this.p1.jump();
    if (p1In.attack)  this.p1.attack();
    if (p1In.kick)    this.p1.kick();
    if (p1In.special) this.p1.useSpecial(this.projectiles);
    if (p1In.defend)  this.p1.startDefend();
    else              this.p1.stopDefend();

    // ── P2 INPUT / AI ─────────────────────────────────────────
    if (this.mode === 'pvc' && this.ai) {
      const aiActions = this.ai.update(dt, this.projectiles);
      this.ai.applyActions(aiActions, dt, this.projectiles);
    } else {
      const p2In = InputHandler.p2();
      if (p2In.left)    this.p2.walkLeft(dt);
      if (p2In.right)   this.p2.walkRight(dt);
      if (p2In.jump)    this.p2.jump();
      if (p2In.attack)  this.p2.attack();
      if (p2In.kick)    this.p2.kick();
      if (p2In.special) this.p2.useSpecial(this.projectiles);
      if (p2In.defend)  this.p2.startDefend();
      else              this.p2.stopDefend();
    }

    // ── PHYSICS & STATE ───────────────────────────────────────
    this.p1.update(dt, this.W, this.particles);
    this.p2.update(dt, this.W, this.particles);

    // Separate overlapping fighters
    Collision.separateFighters(this.p1, this.p2);

    // ── COLLISION ─────────────────────────────────────────────
    const p1Hit = Collision.checkMeleeHit(this.p1, this.p2, this.particles);
    const p2Hit = Collision.checkMeleeHit(this.p2, this.p1, this.particles);
    if (p1Hit || p2Hit) this._hitstop(0.07);

    Collision.checkProjectileHits(this.projectiles, [this.p1, this.p2], this.particles);

    // Projectile update
    this.projectiles.update(dt, this.particles);

    // Particles
    this.particles.update(dt);

    // ── HUD ───────────────────────────────────────────────────
    UIManager.updateHUD(this.p1, this.p2, this.round, this.roundTimer, this.mode, this.p1Rounds, this.p2Rounds);

    // ── KO CHECK ─────────────────────────────────────────────
    if (!this.roundActive) return; // already ended this frame
    if (this.p1.isKO) { this._endRound('p2'); return; }
    if (this.p2.isKO) { this._endRound('p1'); return; }

    InputHandler.endFrame();
  }

  _hitstop(dur) {
    this.hitstopTimer = dur;
    UIManager.screenShake();
  }

  _timerWinner() {
    if (this.p1.hp > this.p2.hp) return 'p1';
    if (this.p2.hp > this.p1.hp) return 'p2';
    return 'draw';
  }

  async _endRound(winner) {
    this.roundActive = false;
    // Do NOT set paused=true here — that triggers the pause overlay

    // Determine if it was a PERFECT (loser had full HP, winner took 0 damage)
    const loser = winner === 'p1' ? this.p2 : this.p1;
    const winnerFighter = winner === 'p1' ? this.p1 : this.p2;
    const isPerfect = winner !== 'draw' && loser.hp < loser.maxHp && winnerFighter.hp >= winnerFighter.maxHp;

    // Score
    if (winner === 'p1')      this.p1Rounds++;
    else if (winner === 'p2') this.p2Rounds++;

    // Show KO / PERFECT announcement on canvas (not DOM screen)
    if (winner !== 'draw') {
      const msg = isPerfect ? 'PERFECT!' : 'K.O!';
      AudioManager.play('ko');
      await UIManager.showRoundAnnounce(msg, 1.8);
    } else {
      await UIManager.showRoundAnnounce('DRAW', 1.5);
    }

    // Check if match is over: best of 3 (first to 2 wins)
    const matchDone = this.p1Rounds >= 2 || this.p2Rounds >= 2;

    if (matchDone) {
      await sleep(400);
      if (this.onMatchEnd) this.onMatchEnd(winner, this.p1Rounds, this.p2Rounds);
    } else {
      // Auto-start next round
      await sleep(600);
      this.round++;
      this._setupRound();
      await this._announceRound();
      this.roundActive = true;
    }
  }

  /** Re-start full match (rematch) */
  async rematch() {
    this.p1Rounds = 0;
    this.p2Rounds = 0;
    this.round    = 1;
    this._setupRound();
    await this._announceRound();
    this.roundActive = true;
  }

  async _announceRound() {
    AudioManager.play('roundStart');
    await UIManager.showRoundAnnounce(`ROUND ${this.round}`, 1.2);
    await sleep(200);
    await UIManager.showRoundAnnounce('¡PELEA!', 0.9);
  }

  // ─── DRAW ────────────────────────────────────────────────────

  _draw() {
    const ctx = this.ctx;
    const W = this.W; const H = this.H;

    ctx.clearRect(0, 0, W, H);
    this._drawArena(ctx, W, H);
    this.particles.draw(ctx);
    this.projectiles.draw(ctx);
    if (this.p1) this.p1.draw(ctx);
    if (this.p2) this.p2.draw(ctx);
  }

  // ─── ARENA BACKGROUNDS ───────────────────────────────────────

  _drawArena(ctx, W, H) {
    switch (this.arenaKey) {
      case 'lava':   this._drawLavaArena(ctx, W, H);   break;
      case 'neon':   this._drawNeonArena(ctx, W, H);   break;
      case 'temple': this._drawTempleArena(ctx, W, H); break;
      case 'space':  this._drawSpaceArena(ctx, W, H);  break;
      default:       this._drawNeonArena(ctx, W, H);
    }
  }

  _drawLavaArena(ctx, W, H) {
    const gY = this.groundY;

    // Sky
    const skyGrd = ctx.createLinearGradient(0, 0, 0, gY);
    skyGrd.addColorStop(0, '#0d0000');
    skyGrd.addColorStop(0.5, '#2a0500');
    skyGrd.addColorStop(1, '#5a1000');
    ctx.fillStyle = skyGrd; ctx.fillRect(0, 0, W, gY);

    // Lava glow on ceiling
    ctx.fillStyle = 'rgba(255,100,0,0.05)';
    ctx.fillRect(0, 0, W, H * 0.25);

    // Background rocks
    ctx.fillStyle = '#1a0000';
    for (let i = 0; i < 6; i++) {
      const rx = W * (0.05 + i * 0.18);
      const ry = gY * 0.5;
      const rw = W * (0.06 + Math.sin(i * 2.3) * 0.03);
      const rh = gY * (0.25 + Math.sin(i * 1.7) * 0.1);
      ctx.beginPath();
      ctx.moveTo(rx, ry + rh);
      ctx.lineTo(rx - rw, ry + rh);
      ctx.lineTo(rx - rw * 0.3, ry);
      ctx.lineTo(rx + rw * 0.3, ry);
      ctx.lineTo(rx + rw, ry + rh);
      ctx.closePath(); ctx.fill();
    }

    // Lava floor
    const t = Date.now() * 0.001;
    const lavaGrd = ctx.createLinearGradient(0, gY, 0, H);
    lavaGrd.addColorStop(0, '#ff4500');
    lavaGrd.addColorStop(0.3, '#cc2200');
    lavaGrd.addColorStop(1, '#440000');
    ctx.fillStyle = lavaGrd;
    ctx.fillRect(0, gY, W, H - gY);

    // Lava bubbles
    ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 20;
    for (let i = 0; i < 5; i++) {
      const bx = W * (0.1 + i * 0.2) + Math.sin(t * 0.7 + i) * 20;
      const by = gY + 15 + Math.sin(t + i * 1.3) * 8;
      ctx.fillStyle = '#ff6600';
      ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Platform surface line
    ctx.strokeStyle = '#ff4500'; ctx.lineWidth = 3;
    ctx.shadowColor = '#ff4500'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.moveTo(0, gY); ctx.lineTo(W, gY); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _drawNeonArena(ctx, W, H) {
    const gY = this.groundY;
    const t  = Date.now() * 0.001;

    // Dark background
    ctx.fillStyle = '#050010'; ctx.fillRect(0, 0, W, H);

    // Grid lines (perspective)
    ctx.strokeStyle = 'rgba(247,37,133,0.15)'; ctx.lineWidth = 1;
    const VP = { x: W * 0.5, y: gY * 0.6 };
    for (let i = 0; i <= 12; i++) {
      const gx = W * (i / 12);
      ctx.beginPath(); ctx.moveTo(VP.x, VP.y); ctx.lineTo(gx, gY); ctx.stroke();
    }
    for (let i = 0; i <= 6; i++) {
      const t2 = i / 6;
      const lx = VP.x + (0 - VP.x) * t2;
      const rx = VP.x + (W - VP.x) * t2;
      const ly = VP.y + (gY - VP.y) * t2;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ly); ctx.stroke();
    }

    // Neon signs (decorative)
    const signs = [
      { x: W*0.1, y: gY*0.3, text: 'FIGHT', color: '#f72585' },
      { x: W*0.88, y: gY*0.35, text: 'NEON', color: '#4cc9f0' },
    ];
    signs.forEach(s => {
      ctx.font = `bold ${W * 0.04}px 'Bebas Neue', Impact, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color; ctx.shadowBlur = 20;
      ctx.globalAlpha = 0.7 + Math.sin(t * 2 + s.x) * 0.3;
      ctx.fillText(s.text, s.x, s.y);
    });
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;

    // Floor
    const floorGrd = ctx.createLinearGradient(0, gY, 0, H);
    floorGrd.addColorStop(0, '#1a0030');
    floorGrd.addColorStop(1, '#050010');
    ctx.fillStyle = floorGrd; ctx.fillRect(0, gY, W, H - gY);

    // Floor neon line
    ctx.strokeStyle = '#f72585'; ctx.lineWidth = 3;
    ctx.shadowColor = '#f72585'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.moveTo(0, gY); ctx.lineTo(W, gY); ctx.stroke();
    ctx.shadowBlur = 0; ctx.textAlign = 'left';
  }

  _drawTempleArena(ctx, W, H) {
    const gY = this.groundY;

    // Sky gradient — jungle twilight
    const sky = ctx.createLinearGradient(0, 0, 0, gY);
    sky.addColorStop(0, '#030f0a');
    sky.addColorStop(0.6, '#062b1a');
    sky.addColorStop(1, '#0a3d25');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, gY);

    // Temple pillars
    const pillarColor = '#0a2a18';
    const pillarHL    = '#0d3d22';
    const pillars = [W*0.05, W*0.2, W*0.78, W*0.93];
    pillars.forEach(px => {
      const pw = W * 0.06;
      ctx.fillStyle = pillarColor;
      ctx.fillRect(px - pw/2, gY*0.2, pw, gY*0.8);
      // capital
      ctx.fillStyle = pillarHL;
      ctx.fillRect(px - pw*0.7, gY*0.2, pw*1.4, gY*0.05);
    });

    // Temple arch
    ctx.strokeStyle = '#0d3d22'; ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(W*0.5, gY*0.35, W*0.22, Math.PI, 0);
    ctx.stroke();

    // Stone floor texture
    const stoneGrd = ctx.createLinearGradient(0, gY, 0, H);
    stoneGrd.addColorStop(0, '#1a3325');
    stoneGrd.addColorStop(1, '#0a1a10');
    ctx.fillStyle = stoneGrd; ctx.fillRect(0, gY, W, H - gY);

    // Stone tiles
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2;
    const tileW = W / 8;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo(i * tileW, gY); ctx.lineTo(i * tileW, H); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(0, gY + 20); ctx.lineTo(W, gY + 20); ctx.stroke();

    // Floor line
    ctx.strokeStyle = '#52b788'; ctx.lineWidth = 3;
    ctx.shadowColor = '#52b788'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(0, gY); ctx.lineTo(W, gY); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _drawSpaceArena(ctx, W, H) {
    const gY = this.groundY;
    const t  = Date.now() * 0.0005;

    // Space bg
    ctx.fillStyle = '#00000a'; ctx.fillRect(0, 0, W, H);

    // Stars
    if (!this._starCache) {
      this._starCache = Array.from({ length: 120 }, () => ({
        x: Math.random(), y: Math.random(),
        r: Math.random() * 1.5 + 0.3,
        twinkle: Math.random() * Math.PI * 2,
        speed: Math.random() * 3 + 1,
      }));
    }
    this._starCache.forEach(s => {
      const alpha = 0.5 + Math.sin(t * s.speed + s.twinkle) * 0.4;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(s.x * W, s.y * gY, s.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Nebula glow
    const neb = ctx.createRadialGradient(W*0.5, gY*0.3, 10, W*0.5, gY*0.3, W*0.4);
    neb.addColorStop(0, 'rgba(76,201,240,0.08)');
    neb.addColorStop(0.5, 'rgba(114,9,183,0.05)');
    neb.addColorStop(1, 'transparent');
    ctx.fillStyle = neb; ctx.fillRect(0, 0, W, gY);

    // Planet
    ctx.shadowColor = '#4cc9f0'; ctx.shadowBlur = 30;
    const pg = ctx.createRadialGradient(W*0.85, gY*0.15, 10, W*0.85, gY*0.15, W*0.1);
    pg.addColorStop(0, '#7209b7');
    pg.addColorStop(0.6, '#3a0464');
    pg.addColorStop(1, '#0d0020');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(W*0.85, gY*0.15, W*0.09, 0, Math.PI*2); ctx.fill();
    // Planet ring
    ctx.strokeStyle = 'rgba(76,201,240,0.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(W*0.85, gY*0.15, W*0.14, W*0.03, -0.3, 0, Math.PI*2); ctx.stroke();
    ctx.shadowBlur = 0;

    // Space platform
    const platGrd = ctx.createLinearGradient(0, gY, 0, H);
    platGrd.addColorStop(0, '#0a0a2a');
    platGrd.addColorStop(1, '#020210');
    ctx.fillStyle = platGrd; ctx.fillRect(0, gY, W, H - gY);

    // Metal grid floor
    ctx.strokeStyle = 'rgba(76,201,240,0.12)'; ctx.lineWidth = 1;
    const gridSize = 40;
    for (let gx = 0; gx < W; gx += gridSize) {
      ctx.beginPath(); ctx.moveTo(gx, gY); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = gY; gy < H; gy += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    // Glowing floor line
    ctx.strokeStyle = '#4cc9f0'; ctx.lineWidth = 3;
    ctx.shadowColor = '#4cc9f0'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.moveTo(0, gY); ctx.lineTo(W, gY); ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

// Utility
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
