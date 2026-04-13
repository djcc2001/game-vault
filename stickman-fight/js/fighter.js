/**
 * fighter.js
 * Stickman Fight Legends Pro
 *
 * Fighter class — handles movement, animation, drawing (stickman),
 * state transitions, health, and energy.
 */

// ── CHARACTER DEFINITIONS ─────────────────────────────────────
const CHARACTERS = {
  shadow: {
    name:        'Shadow',
    color:       '#9b5de5',
    glowColor:   '#9b5de5',
    speed:       1.3,
    power:       0.9,
    defense:     0.9,
    reach:       65,
    maxHp:       100,
    maxEnergy:   100,
    special: {
      type:  'slash',
      color: '#9b5de5',
      colors: ['#9b5de5','#c77dff','#ffffff'],
      damage: 28,
      speed:  700,
      life:   1.2,
      radius: 16,
    },
    description: 'Veloz y evasivo. Especialidad: Corte de Energía.',
    stats: [8,7,6,9],
  },
  blaze: {
    name:        'Blaze',
    color:       '#f4a261',
    glowColor:   '#e63946',
    speed:       1.0,
    power:       1.2,
    defense:     0.8,
    reach:       70,
    maxHp:       110,
    maxEnergy:   100,
    special: {
      type:  'fireball',
      color: '#f4a261',
      colors: ['#f4a261','#e63946','#ffd60a'],
      damage: 35,
      speed:  550,
      life:   1.5,
      radius: 18,
    },
    description: 'Alta potencia. Especialidad: Bola de Fuego.',
    stats: [9,5,8,7],
  },
  thunder: {
    name:        'Thunder',
    color:       '#4cc9f0',
    glowColor:   '#4cc9f0',
    speed:       1.1,
    power:       1.0,
    defense:     1.0,
    reach:       75,
    maxHp:       105,
    maxEnergy:   100,
    special: {
      type:  'lightning',
      color: '#4cc9f0',
      colors: ['#4cc9f0','#7209b7','#ffffff'],
      damage: 30,
      speed:  800,
      life:   0.9,
      radius: 14,
    },
    description: 'Equilibrado. Especialidad: Rayo Eléctrico.',
    stats: [7,7,7,7],
  },
  phantom: {
    name:        'Phantom',
    color:       '#00f5d4',
    glowColor:   '#00f5d4',
    speed:       1.4,
    power:       0.8,
    defense:     1.1,
    reach:       60,
    maxHp:       95,
    maxEnergy:   100,
    special: {
      type:  'energyBall',
      color: '#00f5d4',
      colors: ['#00f5d4','#7209b7','#4cc9f0'],
      damage: 25,
      speed:  650,
      life:   1.4,
      radius: 15,
    },
    description: 'Ultra rápido. Especialidad: Bola de Energía.',
    stats: [6,9,5,10],
  },
  titan: {
    name:        'Titan',
    color:       '#e63946',
    glowColor:   '#e63946',
    speed:       0.75,
    power:       1.5,
    defense:     1.3,
    reach:       80,
    maxHp:       140,
    maxEnergy:   100,
    special: {
      type:  'wave',
      color: '#e63946',
      colors: ['#e63946','#f4a261','#ffd60a'],
      damage: 40,
      speed:  400,
      life:   1.8,
      radius: 22,
    },
    description: 'Lento pero demoledor. Especialidad: Onda Expansiva.',
    stats: [10,3,10,4],
  },
};

const CHARACTER_KEYS = Object.keys(CHARACTERS);

// ── FIGHTER CLASS ─────────────────────────────────────────────
class Fighter {
  /**
   * @param {string} id        — 'p1' | 'p2'
   * @param {string} charKey   — key into CHARACTERS
   * @param {number} startX
   * @param {number} groundY
   * @param {boolean} facingRight
   */
  constructor(id, charKey, startX, groundY, facingRight = true) {
    this.id           = id;
    this.charKey      = charKey;
    this.stats        = { ...CHARACTERS[charKey] };

    // Position & physics
    this.pos     = { x: startX, y: groundY };
    this.vel     = { x: 0, y: 0 };
    this.groundY = groundY;
    this.grounded = true;
    this.facingRight = facingRight;

    // Dimensions (logical)
    this.width  = 40;
    this.height = 100;

    // Health & energy
    this.hp        = this.stats.maxHp;
    this.energy    = 0;
    this.maxHp     = this.stats.maxHp;
    this.maxEnergy = this.stats.maxEnergy;

    // State machine
    this.sm = createFighterSM();

    // Attack timing
    this.attackFrame  = 0;   // 0–1 normalised progress (punch or kick)
    this.attackDur    = 0.35; // seconds for punch
    this.kickDur      = 0.40; // seconds for kick (slightly slower, more power)
    this.currentMove  = 'punch'; // 'punch' | 'kick' — which move is active
    this.hitConnectedThisSwing = false;

    // Hit stun
    this.hitStunTimer = 0;

    // Special cooldown
    this.specialCooldown = 0;
    this.SPECIAL_CD      = 3.0;

    // KO
    this.isKO = false;

    // Jump tracking (double jump)
    this.jumpsLeft   = 2;  // reset to 2 on landing
    this.doubleJumpFlash = 0; // visual burst timer

    // Visual effects
    this.shieldAlpha    = 0;
    this.impactFlash    = 0;  // white flash timer
    this.shakeTimer     = 0;

    // Animation
    this.animAngle = 0;   // walk cycle angle
    this.jumpSquish = 1;

    // Energy regen
    this.energyRegenTimer = 0;
  }

  // ─── ACTIONS (called by input / AI) ─────────────────────────

  walkLeft(dt) {
    if (this.sm.is('hit', 'ko', 'attack', 'kick', 'defend', 'special')) return;
    const spd = Physics.WALK_SPEED * this.stats.speed;
    this.vel.x = -spd;
    this.facingRight = false;
    if (this.grounded) this.sm.transition('run');
  }

  walkRight(dt) {
    if (this.sm.is('hit', 'ko', 'attack', 'kick', 'defend', 'special')) return;
    const spd = Physics.WALK_SPEED * this.stats.speed;
    this.vel.x = spd;
    this.facingRight = true;
    if (this.grounded) this.sm.transition('run');
  }

  jump() {
    if (this.sm.is('hit', 'ko', 'defend')) return;

    const isDoubleJump = !this.grounded && this.jumpsLeft > 0;
    const isFirstJump  = this.grounded && this.jumpsLeft > 0;

    if (!isFirstJump && !isDoubleJump) return;

    // Double jump has slightly less power so it feels distinct
    const power = isDoubleJump ? Physics.JUMP_VELOCITY * 0.82 : Physics.JUMP_VELOCITY;
    this.vel.y    = power;
    this.grounded = false;
    this.jumpsLeft--;

    this.sm.force('jump');
    AudioManager.play('jump');

    // Spawn a visual burst on double jump
    if (isDoubleJump) {
      this.doubleJumpFlash = 0.18;
    }
  }

  startDefend() {
    if (this.sm.is('attack', 'special', 'ko', 'hit')) return;
    if (!this.grounded) return;
    // Stop horizontal movement when defending
    this.vel.x = 0;
    if (!this.sm.is('defend')) {
      this.sm.force('defend');
      AudioManager.play('shield');
      this.shieldAlpha = 1;
    }
  }

  stopDefend() {
    if (this.sm.is('defend')) {
      this.sm.force('idle');
      this.shieldAlpha = 0;
    }
  }

  attack() {
    if (!this.sm.is('idle', 'run', 'jump')) return;
    this.sm.force('attack');
    this.attackFrame = 0;
    this.currentMove = 'punch';
    this.hitConnectedThisSwing = false;
    AudioManager.play('hit');
  }

  kick() {
    if (!this.sm.is('idle', 'run', 'jump')) return;
    this.sm.force('kick');
    this.attackFrame = 0;
    this.currentMove = 'kick';
    this.hitConnectedThisSwing = false;
    AudioManager.play('hit');
  }

  useSpecial(projectileManager) {
    if (this.energy < this.maxEnergy) return;
    if (this.specialCooldown > 0) return;
    if (!this.sm.is('idle', 'run')) return;

    this.energy = 0;
    this.specialCooldown = this.SPECIAL_CD;
    this.sm.force('special');

    const cfg = { ...this.stats.special };
    projectileManager.fire(this, cfg);

    AudioManager.play('special');
  }

  /**
   * Apply damage + knockback from an attacker (or null for projectile).
   * @param {number}  dmg
   * @param {Fighter|null} attacker
   * @param {boolean} doKnockback
   * @param {boolean} heavy
   */
  applyHit(dmg, attacker, doKnockback, heavy = false) {
    if (this.sm.is('ko')) return;

    this.hp -= dmg;
    this.energy = Math.min(this.maxEnergy, this.energy + dmg * 0.8);
    this.impactFlash = 0.18;

    if (doKnockback) {
      const dir = attacker
        ? (this.pos.x >= attacker.pos.x ? 1 : -1)
        : (this.facingRight ? -1 : 1);
      const kb = Physics.knockback(dir, heavy);
      this.vel.x = kb.x;
      this.vel.y = kb.y;
      this.grounded = false;
      this.jumpsLeft = 0; // can't double-jump while being knocked back
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this._goKO();
      return;
    }

    this.sm.force('hit');
    this.hitStunTimer = 0.35;
    AudioManager.play(heavy ? 'heavyHit' : 'hit');
  }

  _goKO() {
    this.hp = 0;
    this.vel.x = (this.facingRight ? -1 : 1) * 300;
    this.vel.y = -400;
    this.isKO = true;
    this.sm.force('ko');
    AudioManager.play('ko');
  }

  // ─── UPDATE ──────────────────────────────────────────────────

  update(dt, stageW, particles) {
    if (this.sm.is('ko')) {
      // just fall and stop
      Physics.applyGravity(this.vel, dt);
      Physics.integrate(this.pos, this.vel, dt);
      const grounded = Physics.resolveGround(this.pos, this.vel, this.groundY);
      if (grounded) this.vel.x *= 0.7;
      Physics.clampToStage(this.pos, this.width * 0.5, stageW);
      return;
    }

    // Hit stun
    if (this.hitStunTimer > 0) {
      this.hitStunTimer -= dt;
      if (this.hitStunTimer <= 0) {
        this.sm.force('idle');
      }
    }

    // Attack animation (punch)
    if (this.sm.is('attack')) {
      this.attackFrame += dt / this.attackDur;
      if (this.attackFrame >= 1) {
        this.attackFrame = 0;
        this.sm.force('idle');
      }
    }

    // Kick animation
    if (this.sm.is('kick')) {
      this.attackFrame += dt / this.kickDur;
      if (this.attackFrame >= 1) {
        this.attackFrame = 0;
        this.sm.force('idle');
      }
    }

    // Special animation — brief pose then idle
    if (this.sm.is('special')) {
      this.attackFrame += dt / 0.4;
      if (this.attackFrame >= 1) {
        this.attackFrame = 0;
        this.sm.force('idle');
      }
    }

    // Cooldown
    if (this.specialCooldown > 0) {
      this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    }

    // Energy regen (passive, slow)
    this.energyRegenTimer += dt;
    if (this.energyRegenTimer >= 0.5) {
      this.energyRegenTimer = 0;
      const wasMax = this.energy >= this.maxEnergy;
      this.energy = Math.min(this.maxEnergy, this.energy + 2);
      if (!wasMax && this.energy >= this.maxEnergy) AudioManager.play('energyFull');
    }

    // Physics
    Physics.applyGravity(this.vel, dt);
    Physics.applyFriction(this.vel, this.grounded);
    Physics.integrate(this.pos, this.vel, dt);

    const wasGrounded = this.grounded;
    this.grounded = Physics.resolveGround(this.pos, this.vel, this.groundY);
    Physics.clampToStage(this.pos, this.width * 0.5, stageW);

    // Landing
    if (!wasGrounded && this.grounded) {
      this.jumpSquish = 0.7;
      this.jumpsLeft  = 2;   // restore double jump on landing
      particles.dust(this.pos.x, this.pos.y);
      AudioManager.play('land');
    }
    this.jumpSquish += (1 - this.jumpSquish) * 8 * dt;

    // Double jump flash decay + particle burst on first frame
    if (this.doubleJumpFlash > 0.15) {
      // First frame of double jump — emit energy ring
      particles.emit({
        x: this.pos.x, y: this.pos.y - 50,
        count: 16, color: this.stats.color,
        colors: [this.stats.color, '#ffffff'],
        speed: 180, speedVar: 60,
        size: 5, sizeVar: 3,
        life: 0.35, lifeVar: 0.1,
        gravity: -80, glow: true,
      });
    }
    this.doubleJumpFlash = Math.max(0, this.doubleJumpFlash - dt * 6);

    // State updates — don't override active attack states
    if (this.grounded && !this.sm.is('attack', 'kick', 'defend', 'special', 'hit', 'ko')) {
      if (Math.abs(this.vel.x) < 5) {
        if (!this.sm.is('idle')) this.sm.transition('idle') || this.sm.force('idle');
      } else {
        if (!this.sm.is('run')) this.sm.transition('run') || this.sm.force('run');
      }
    } else if (!this.grounded && this.sm.is('run', 'idle')) {
      this.sm.force(this.vel.y < 0 ? 'jump' : 'fall');
    } else if (!this.grounded && this.sm.is('jump') && this.vel.y > 0) {
      this.sm.force('fall');
    }

    // Walk animation
    if (this.sm.is('run')) this.animAngle += dt * 12;

    // Visual timers
    this.impactFlash = Math.max(0, this.impactFlash - dt * 5);
    if (this.sm.is('defend')) {
      this.shieldAlpha = Math.min(1, this.shieldAlpha + dt * 8); // fade in fast
    } else if (this.shieldAlpha > 0) {
      this.shieldAlpha = Math.max(0, this.shieldAlpha - dt * 5); // fade out
    }
  }

  // ─── DRAWING ─────────────────────────────────────────────────

  /**
   * Draw the fighter on canvas with rich character art.
   * Each character has unique costume, proportions and accessories.
   * @param {CanvasRenderingContext2D} ctx
   * @param {boolean} [preview=false]  — true when drawn in char-select preview
   */
  draw(ctx, preview = false) {
    const { x, y } = this.pos;
    const state = this.sm.getState();

    ctx.save();

    // Landing squish
    ctx.translate(x, y);
    ctx.scale(
      this.jumpSquish < 1 ? this.jumpSquish : 1,
      this.jumpSquish < 1 ? 1 / this.jumpSquish : 1
    );
    ctx.translate(-x, -y);

    // Mirror for facing direction
    ctx.save();
    const dir = this.facingRight ? 1 : -1;
    ctx.translate(x, 0);
    ctx.scale(dir, 1);
    ctx.translate(-x, 0);

    // Dispatch to per-character draw
    switch (this.charKey) {
      case 'shadow':  this._drawShadow(ctx, x, y, state);  break;
      case 'blaze':   this._drawBlaze(ctx, x, y, state);   break;
      case 'thunder': this._drawThunder(ctx, x, y, state); break;
      case 'phantom': this._drawPhantom(ctx, x, y, state); break;
      case 'titan':   this._drawTitan(ctx, x, y, state);   break;
      default:        this._drawShadow(ctx, x, y, state);
    }

    ctx.restore(); // undo mirror

    // ── SHIELD EFFECT ──
    if (this.shieldAlpha > 0.05) {
      ctx.save();
      ctx.globalAlpha = this.shieldAlpha * 0.45;
      ctx.strokeStyle = '#4cc9f0';
      ctx.lineWidth = 5;
      ctx.shadowColor = '#4cc9f0'; ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(x, y - this.height * 0.5, this.width * 1.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = this.shieldAlpha * 0.12;
      ctx.fillStyle = '#4cc9f0';
      ctx.fill();
      ctx.restore();
    }

    // ── DOUBLE JUMP RING ──
    if (this.doubleJumpFlash > 0) {
      ctx.save();
      ctx.globalAlpha = this.doubleJumpFlash * 3; // fades fast
      ctx.strokeStyle = this.stats.color;
      ctx.lineWidth = 4;
      ctx.shadowColor = this.stats.color; ctx.shadowBlur = 20;
      const ringR = this.width * 1.6 * (1.2 - this.doubleJumpFlash * 5);
      ctx.beginPath();
      ctx.ellipse(x, y - 30, Math.max(8, ringR), Math.max(4, ringR * 0.4), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // undo squish
  }

  // ─── SHARED DRAW HELPERS ──────────────────────────────────────

  /**
   * Returns limb angles in LOCAL character space.
   * Canvas is already mirrored so +X = toward opponent, +Y = down.
   * Angle 0   = pointing forward (toward opponent)
   * Angle PI/2  = pointing straight down
   * Angle PI    = pointing backward
   * Angle -PI/2 = pointing straight up
   */
  _getLimbAngles(state) {
    const t    = this.attackFrame;
    const walk = Math.sin(this.animAngle);

    // ── IDLE defaults ──────────────────────────────────────────
    // Arms in guard position (always ready)
    let rUA = 0.3;
    let rLA = -0.75;
    let lUA = 0.5;
    let lLA = 0.25;

    // Legs: straight down, tiny natural knee bend
    let fUL = Math.PI / 2;
    let fLL = Math.PI / 2 + 0.10;
    let bUL = Math.PI / 2;
    let bLL = Math.PI / 2 + 0.10;

    // ── RUN ────────────────────────────────────────────────────
    if (state === 'run') {
      const sw = walk * 0.55;
      fUL = Math.PI / 2 - sw * 1.1;
      fLL = fUL + 0.25 + Math.abs(sw) * 0.45;
      bUL = Math.PI / 2 + sw * 1.1;
      bLL = bUL - 0.25 - Math.abs(sw) * 0.45;
      // Arms swing counter to legs
      rUA = Math.PI / 2 + 0.25 - sw * 1.0;
      rLA = rUA + 0.35;
      lUA = Math.PI / 2 - 0.15 + sw * 1.0;
      lLA = lUA - 0.35;
    }

    // ── JUMP ───────────────────────────────────────────────────
    if (state === 'jump') {
      fUL = Math.PI / 2 - 0.5; fLL = fUL + 0.6;
      bUL = Math.PI / 2 + 0.4; bLL = bUL - 0.5;
      // Arms raise up to about 45° above horizontal
      rUA = Math.PI / 2 - 0.7; rLA = rUA + 0.5;
      lUA = Math.PI / 2 + 0.5; lLA = lUA - 0.5;
    }

    // ── FALL ───────────────────────────────────────────────────
    if (state === 'fall') {
      fUL = Math.PI / 2 - 0.2; fLL = fUL + 0.4;
      bUL = Math.PI / 2 + 0.2; bLL = bUL - 0.4;
      rUA = Math.PI / 2 - 0.3; rLA = rUA + 0.4;
      lUA = Math.PI / 2 + 0.3; lLA = lUA - 0.4;
    }

    // ── PUNCH ──────────────────────────────────────────────────
    // Simple punch - arm extends forward
    if (state === 'attack') {
      rUA = 0.1;   // upper arm forward
      rLA = 0.1;  // forearm straight, same direction
      lUA = Math.PI / 2 - 0.4;
      lLA = lUA - 0.3;
    }

    // ── KICK ───────────────────────────────────────────────────
    if (state === 'kick') {
      // Arms in guard position
      rUA = 0.3;
      rLA = -0.75;
      lUA = 0.5;
      lLA = 0.25;
      // Front leg kicks
      fUL = Math.PI / 2 - 0.8;
      fLL = fUL + 0.3;
      bUL = Math.PI / 2 + 0.3;
      bLL = bUL + 0.2;
    }

    // ── DEFEND ─────────────────────────────────────────────────
    // Arms crossed in X position for blocking
    if (state === 'defend') {
      rUA = 0.8;   // upper arm down
      rLA = -15; // forearm crossing up
      lUA = 1.4;  // upper arm back
      lLA = -1; // forearm crossing over
    }

    // ── SPECIAL ────────────────────────────────────────────────
    if (state === 'special') {
      // Both arms thrust forward then spread
      rUA = Math.PI / 2 - 0.9 - t * 1.3; rLA = rUA + 0.4;
      lUA = Math.PI / 2 + 0.7 + t * 0.9; lLA = lUA - 0.4;
    }

    // ── HIT ────────────────────────────────────────────────────
    if (state === 'hit') {
      // Arms flung back/up by impact
      rUA = Math.PI / 2 + 0.7; rLA = rUA + 0.8;
      lUA = Math.PI / 2 + 0.5; lLA = lUA + 0.7;
    }

    // ── KO ─────────────────────────────────────────────────────
    if (state === 'ko') {
      rUA = Math.PI / 2 + 1.0; rLA = rUA + 1.0;
      lUA = Math.PI / 2 + 0.8; lLA = lUA + 0.9;
      fUL = Math.PI / 2 + 0.5; fLL = fUL + 0.6;
      bUL = Math.PI / 2 - 0.3; bLL = bUL + 0.4;
    }

    return { rUA, rLA, lUA, lLA, fUL, fLL, bUL, bLL };
  }

  /**
   * Draw a two-segment limb with proper articulation.
   * The joint is shown by slightly widening the stroke at the bend point.
   * No separate circle — just the natural thickening at the elbow/knee.
   *
   * @param {number} upperAngle  absolute angle of upper arm/thigh (radians, 0=right)
   * @param {number} lowerAngle  absolute angle of forearm/shin  (radians, 0=right)
   *                             This is ABSOLUTE, not relative — cleaner math.
   */
  _drawLimb(ctx, sx, sy, upperLen, lowerLen, upperAngle, lowerAngle) {
    // Joint (elbow / knee)
    const jx = sx + Math.cos(upperAngle) * upperLen;
    const jy = sy + Math.sin(upperAngle) * upperLen;
    // End (hand / foot)
    const ex = jx + Math.cos(lowerAngle) * lowerLen;
    const ey = jy + Math.sin(lowerAngle) * lowerLen;

    const lw = ctx.lineWidth;

    // Upper segment — slightly tapered toward joint
    ctx.beginPath();
    ctx.lineWidth = lw;
    ctx.moveTo(sx, sy);
    ctx.lineTo(jx, jy);
    ctx.stroke();

    // Joint accent — 1px thicker at the bend, same color
    ctx.beginPath();
    ctx.lineWidth = lw + 1.5;
    ctx.arc(jx, jy, lw * 0.55, 0, Math.PI * 2);
    ctx.stroke();

    // Lower segment
    ctx.beginPath();
    ctx.lineWidth = lw;
    ctx.moveTo(jx, jy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.lineWidth = lw; // restore
    return { jx, jy, ex, ey };
  }

  /** Draw filled rounded rectangle */
  _roundRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill)   { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  /** Draw KO stars above head */
  _drawKOStars(ctx, x, headY) {
    const t = Date.now() * 0.003;
    for (let i = 0; i < 3; i++) {
      const a = t + (i * Math.PI * 2) / 3;
      const sx = x + Math.cos(a) * 22;
      const sy = headY - 18 + Math.sin(a * 2) * 5;
      ctx.save();
      ctx.fillStyle = '#ffd60a';
      ctx.shadowColor = '#ffd60a'; ctx.shadowBlur = 10;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', sx, sy);
      ctx.restore();
    }
  }

  /**
   * Draw both legs using absolute FK angles.
   * fUL/fLL = front leg upper/lower absolute angles
   * bUL/bLL = back  leg upper/lower absolute angles
   */
  _drawLegsGeneric(ctx, x, hipY,
                   fUL, fLL, bUL, bLL,
                   upperLen, lowerLen, lineW,
                   colorBack, colorFront,
                   bootColorBack, bootColorFront, bootRx, bootRy, state) {

    // ── BACK LEG (drawn first, behind body) ──
    ctx.lineWidth = lineW;
    ctx.strokeStyle = colorBack;
    const bLeg = this._drawLimb(ctx, x - 3, hipY, upperLen, lowerLen, bUL, bLL);
    ctx.fillStyle = bootColorBack;
    ctx.beginPath(); ctx.ellipse(bLeg.ex - 2, bLeg.ey + 3, bootRx, bootRy, 0, 0, Math.PI * 2); ctx.fill();

    // ── FRONT LEG ──
    ctx.lineWidth = lineW + 2;
    ctx.strokeStyle = colorFront;
    const fLeg = this._drawLimb(ctx, x + 3, hipY, upperLen, lowerLen, fUL, fLL);
    ctx.fillStyle = bootColorFront;
    ctx.beginPath(); ctx.ellipse(fLeg.ex + 2, fLeg.ey + 3, bootRx + 1, bootRy, 0, 0, Math.PI * 2); ctx.fill();

    // Impact glow at foot during kick peak
    if (state === 'kick' && this.attackFrame > 0.25 && this.attackFrame < 0.75) {
      ctx.save();
      ctx.shadowColor = colorFront; ctx.shadowBlur = 28;
      ctx.fillStyle = colorFront; ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.arc(fLeg.ex, fLeg.ey, bootRx * 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    return { bLeg, fLeg };
  }

  // ─── SHADOW — Dark ninja assassin ────────────────────────────
  _drawShadow(ctx, x, y, state) {
    const flash = this.impactFlash > 0;
    const C    = flash ? '#fff' : '#9b5de5';
    const DARK = flash ? '#fff' : '#5a1f9e';
    const SKIN = flash ? '#fff' : '#c9a96e';
    const { rUA, rLA, lUA, lLA, fUL, fLL, bUL, bLL } = this._getLimbAngles(state);

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = '#9b5de5'; ctx.shadowBlur = 16;

    const headY  = y - 100;
    const neckY  = y - 85;
    const chestY = y - 68;
    const hipY   = y - 40;

    // LEGS (back first)
    this._drawLegsGeneric(ctx, x, hipY, fUL, fLL, bUL, bLL,
      24, 22, 9, DARK, C, '#2a0a5a', '#3d0d80', 12, 5, state);

    // TORSO
    ctx.shadowBlur = 0;
    ctx.fillStyle = DARK;
    this._roundRect(ctx, x-12, chestY, 24, hipY-chestY+8, 5, DARK);
    ctx.fillStyle = C;
    ctx.fillRect(x-3, chestY+4, 6, hipY-chestY);

    // BACK ARM
    ctx.lineWidth = 7; ctx.strokeStyle = DARK;
    this._drawLimb(ctx, x-5, chestY+4, 18, 16, lUA, lLA);

    // FRONT ARM
    ctx.lineWidth = 8; ctx.strokeStyle = C;
    const fArm = this._drawLimb(ctx, x+5, chestY+4, 18, 16, rUA, rLA);
    ctx.fillStyle = SKIN;
    ctx.beginPath(); ctx.arc(fArm.ex, fArm.ey, 5, 0, Math.PI*2); ctx.fill();

    // HEAD — ninja hood
    ctx.shadowColor = '#9b5de5'; ctx.shadowBlur = 14;
    ctx.fillStyle = DARK;
    ctx.beginPath(); ctx.arc(x, headY, 13, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = SKIN;
    ctx.beginPath(); ctx.arc(x+3, headY, 9, -0.6, 0.6); ctx.fill();
    ctx.fillStyle = '#c77dff';
    ctx.beginPath(); ctx.arc(x+6, headY-1, 2.5, 0, Math.PI*2); ctx.fill();
    // scarf
    ctx.strokeStyle = C; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x-10, neckY+2);
    ctx.quadraticCurveTo(x+15, neckY+8, x+10, chestY+2);
    ctx.stroke();

    if (state === 'ko') this._drawKOStars(ctx, x, headY);
  }

  // ─── BLAZE — Fire brawler ─────────────────────────────────────
  _drawBlaze(ctx, x, y, state) {
    const flash = this.impactFlash > 0;
    const C    = flash ? '#fff' : '#f4a261';
    const RED  = flash ? '#fff' : '#e63946';
    const SKIN = flash ? '#fff' : '#d4845a';
    const { rUA, rLA, lUA, lLA, fUL, fLL, bUL, bLL } = this._getLimbAngles(state);

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = '#f4a261'; ctx.shadowBlur = 18;

    const headY  = y - 102;
    const chestY = y - 70;
    const hipY   = y - 42;

    // LEGS
    this._drawLegsGeneric(ctx, x, hipY, fUL, fLL, bUL, bLL,
      26, 24, 12, '#7b2d00', C, '#5a1a00', '#7b2d00', 14, 6, state);

    // TORSO
    ctx.fillStyle = RED;
    this._roundRect(ctx, x-16, chestY, 32, hipY-chestY+10, 6, RED);
    ctx.fillStyle = '#3a0a00';
    ctx.fillRect(x-16, hipY-4, 32, 8);
    ctx.fillStyle = '#ffd60a';
    this._roundRect(ctx, x-5, hipY-2, 10, 7, 2, '#ffd60a');

    // BACK ARM
    ctx.lineWidth = 10; ctx.strokeStyle = SKIN;
    this._drawLimb(ctx, x-10, chestY+6, 20, 17, lUA, lLA);

    // FRONT ARM
    ctx.lineWidth = 11; ctx.strokeStyle = SKIN;
    const fArm = this._drawLimb(ctx, x+10, chestY+6, 20, 17, rUA, rLA);
    ctx.fillStyle = RED;
    ctx.beginPath(); ctx.arc(fArm.ex, fArm.ey, 7, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#3a0000'; ctx.lineWidth = 2; ctx.stroke();

    // HEAD
    ctx.shadowColor = '#f4a261'; ctx.shadowBlur = 20;
    ctx.fillStyle = SKIN;
    ctx.beginPath(); ctx.arc(x, headY, 15, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.arc(x, headY+5, 12, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#3a0000'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x+1,headY-6); ctx.lineTo(x+9,headY-8); ctx.stroke();
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath(); ctx.arc(x+6, headY-3, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(x+7, headY-3, 1.5, 0, Math.PI*2); ctx.fill();
    // flame hair
    const ft = Date.now() * 0.004;
    [[-4,0],[-1,-5],[3,-3],[7,-1]].forEach(([dx,dy], i) => {
      const flicker = Math.sin(ft + i) * 3;
      const grad = ctx.createLinearGradient(x+dx, headY-14+dy, x+dx, headY-26+dy+flicker);
      grad.addColorStop(0, '#f4a261'); grad.addColorStop(1, 'rgba(255,50,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(x+dx, headY-18+dy+flicker, 5, 10+flicker, 0.2*i, 0, Math.PI*2);
      ctx.fill();
    });

    if (state === 'ko') this._drawKOStars(ctx, x, headY);
  }

  // ─── THUNDER — Electric warrior ───────────────────────────────
  _drawThunder(ctx, x, y, state) {
    const flash  = this.impactFlash > 0;
    const C      = flash ? '#fff' : '#4cc9f0';
    const WHITE  = flash ? '#fff' : '#e0f7ff';
    const SKIN   = flash ? '#fff' : '#b8d4e8';
    const { rUA, rLA, lUA, lLA, fUL, fLL, bUL, bLL } = this._getLimbAngles(state);

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = '#4cc9f0'; ctx.shadowBlur = 16;

    const headY  = y - 100;
    const chestY = y - 68;
    const hipY   = y - 40;

    // LEGS
    this._drawLegsGeneric(ctx, x, hipY, fUL, fLL, bUL, bLL,
      25, 23, 10, '#1a4a6a', C, '#0d2a40', '#1a4a6a', 12, 5, state);

    // TORSO
    ctx.fillStyle = C;
    this._roundRect(ctx, x-13, chestY, 26, hipY-chestY+8, 5, C);
    ctx.fillStyle = '#ffd60a'; ctx.shadowColor = '#ffd60a'; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(x+2, chestY+4); ctx.lineTo(x-4, chestY+14);
    ctx.lineTo(x+1, chestY+14); ctx.lineTo(x-3, chestY+24);
    ctx.lineTo(x+6, chestY+12); ctx.lineTo(x+1, chestY+12);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 16;

    // BACK ARM
    ctx.lineWidth = 8; ctx.strokeStyle = WHITE;
    this._drawLimb(ctx, x-8, chestY+4, 18, 16, lUA, lLA);

    // FRONT ARM
    ctx.lineWidth = 9; ctx.strokeStyle = WHITE;
    const fArm = this._drawLimb(ctx, x+8, chestY+4, 18, 16, rUA, rLA);
    ctx.fillStyle = C;
    ctx.beginPath(); ctx.arc(fArm.ex, fArm.ey, 6, 0, Math.PI*2); ctx.fill();
    if (state === 'attack' && this.attackFrame > 0.3) {
      ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 2;
      ctx.shadowColor = '#ffd60a'; ctx.shadowBlur = 12;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + this.attackFrame * 10;
        ctx.beginPath(); ctx.moveTo(fArm.ex, fArm.ey);
        ctx.lineTo(fArm.ex + Math.cos(a)*10, fArm.ey + Math.sin(a)*10); ctx.stroke();
      }
      ctx.shadowBlur = 16;
    }

    // HEAD
    ctx.shadowColor = '#4cc9f0'; ctx.shadowBlur = 16;
    ctx.fillStyle = SKIN;
    ctx.beginPath(); ctx.arc(x, headY, 14, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#001a2a';
    ctx.beginPath(); ctx.roundRect(x-5, headY-5, 16, 8, 3); ctx.fill();
    ctx.fillStyle = '#4cc9f0'; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.roundRect(x-4, headY-4, 14, 6, 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = WHITE;
    [[-8,-2],[-4,-6],[0,-8],[4,-6],[8,-3]].forEach(([dx,dy]) => {
      ctx.beginPath();
      ctx.moveTo(x+dx-4, headY-12);
      ctx.lineTo(x+dx, headY-14+dy);
      ctx.lineTo(x+dx+4, headY-12);
      ctx.fill();
    });

    if (state === 'ko') this._drawKOStars(ctx, x, headY);
  }

  // ─── PHANTOM — Speedy acrobat ─────────────────────────────────
  _drawPhantom(ctx, x, y, state) {
    const flash = this.impactFlash > 0;
    const C     = flash ? '#fff' : '#00f5d4';
    const CLOAK = flash ? '#fff' : '#007a6a';
    const SKIN  = flash ? '#fff' : '#a0d4c8';
    const { rUA, rLA, lUA, lLA, fUL, fLL, bUL, bLL } = this._getLimbAngles(state);

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = '#00f5d4'; ctx.shadowBlur = 18;

    const headY  = y - 104;
    const chestY = y - 70;
    const hipY   = y - 40;

    // CLOAK background
    if (state === 'idle' || state === 'run' || state === 'defend') {
      ctx.fillStyle = CLOAK; ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(x-18, chestY-4);
      ctx.quadraticCurveTo(x-22, hipY+10, x-10, hipY+16);
      ctx.lineTo(x+10, hipY+16);
      ctx.quadraticCurveTo(x+22, hipY+10, x+18, chestY-4);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // LEGS
    this._drawLegsGeneric(ctx, x, hipY, fUL, fLL, bUL, bLL,
      24, 22, 8, '#004a40', C, '#002a22', '#004a40', 12, 4, state);

    // TORSO
    ctx.fillStyle = C;
    this._roundRect(ctx, x-11, chestY, 22, hipY-chestY+8, 4, C);

    // BACK ARM
    ctx.lineWidth = 7; ctx.strokeStyle = CLOAK;
    this._drawLimb(ctx, x-6, chestY+4, 17, 15, lUA, lLA);

    // FRONT ARM
    ctx.lineWidth = 8; ctx.strokeStyle = SKIN;
    const fArm = this._drawLimb(ctx, x+6, chestY+4, 17, 15, rUA, rLA);
    ctx.fillStyle = C;
    ctx.beginPath(); ctx.arc(fArm.ex, fArm.ey, 5, 0, Math.PI*2); ctx.fill();

    // HEAD — hood
    ctx.shadowColor = '#00f5d4'; ctx.shadowBlur = 20;
    ctx.fillStyle = CLOAK;
    ctx.beginPath(); ctx.arc(x, headY, 16, 0, Math.PI*2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x-16, headY);
    ctx.quadraticCurveTo(x-22, headY+14, x-8, chestY-2);
    ctx.lineTo(x+8, chestY-2);
    ctx.quadraticCurveTo(x+22, headY+14, x+16, headY);
    ctx.fill();
    ctx.fillStyle = '#001a16';
    ctx.beginPath(); ctx.arc(x+1, headY+1, 10, 0, Math.PI*2); ctx.fill();
    // glowing eyes
    ctx.fillStyle = C; ctx.shadowColor = C; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(x+3, headY-1, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+8, headY-1, 3, 0, Math.PI*2); ctx.fill();
    // run trail
    if (state === 'run') {
      ctx.globalAlpha = 0.25; ctx.fillStyle = C;
      ctx.beginPath(); ctx.arc(x-8, headY, 14, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (state === 'ko') this._drawKOStars(ctx, x, headY);
  }

  // ─── TITAN — Armored powerhouse ───────────────────────────────
  _drawTitan(ctx, x, y, state) {
    const flash = this.impactFlash > 0;
    const C     = flash ? '#fff' : '#e63946';
    const ARMOR = flash ? '#fff' : '#3a3a4a';
    const SKIN  = flash ? '#fff' : '#c08060';
    const { rUA, rLA, lUA, lLA, fUL, fLL, bUL, bLL } = this._getLimbAngles(state);

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = '#e63946'; ctx.shadowBlur = 20;

    const headY  = y - 106;
    const chestY = y - 72;
    const hipY   = y - 44;

    // LEGS (thick armored)
    this._drawLegsGeneric(ctx, x, hipY, fUL, fLL, bUL, bLL,
      28, 26, 15, ARMOR, C, '#1a1a22', '#1a1a22', 16, 7, state);

    // knee pad on front leg at approximate knee position
    const kpX = x + 3 + Math.cos(fUL) * 28;
    const kpY = hipY + Math.sin(fUL) * 28;
    ctx.fillStyle = C;
    ctx.beginPath(); ctx.arc(kpX, kpY, 8, 0, Math.PI*2); ctx.fill();

    // TORSO
    ctx.fillStyle = ARMOR;
    this._roundRect(ctx, x-20, chestY, 40, hipY-chestY+12, 8, ARMOR);
    ctx.fillStyle = C;
    this._roundRect(ctx, x-16, chestY+2, 32, 20, 5, C);
    ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, chestY+4); ctx.lineTo(x, chestY+20); ctx.stroke();
    [[-22, chestY], [22, chestY]].forEach(([dx, dy]) => {
      ctx.fillStyle = C; ctx.beginPath(); ctx.arc(x+dx, dy+4, 10, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = ARMOR; ctx.lineWidth = 2; ctx.stroke();
    });

    // BACK ARM
    ctx.lineWidth = 12; ctx.strokeStyle = ARMOR;
    this._drawLimb(ctx, x-14, chestY+6, 22, 18, lUA, lLA);

    // FRONT ARM
    ctx.lineWidth = 13; ctx.strokeStyle = ARMOR;
    const fArm = this._drawLimb(ctx, x+14, chestY+6, 22, 18, rUA, rLA);
    ctx.fillStyle = C;
    ctx.beginPath(); ctx.arc(fArm.ex, fArm.ey, 9, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#1a1a22'; ctx.lineWidth = 2; ctx.stroke();
    if (state === 'attack' && this.attackFrame > 0.5) {
      ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 2;
      ctx.shadowColor = '#ffd60a'; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(fArm.ex, fArm.ey); ctx.lineTo(fArm.ex+12, fArm.ey-8);
      ctx.moveTo(fArm.ex, fArm.ey); ctx.lineTo(fArm.ex+10, fArm.ey+6);
      ctx.stroke(); ctx.shadowBlur = 20;
    }

    // HEAD / HELMET
    ctx.shadowColor = '#e63946'; ctx.shadowBlur = 20;
    ctx.fillStyle = ARMOR;
    ctx.beginPath(); ctx.arc(x, headY, 18, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = C;
    ctx.beginPath();
    ctx.moveTo(x-6, headY-16); ctx.lineTo(x, headY-26); ctx.lineTo(x+6, headY-16);
    ctx.fill();
    ctx.fillStyle = '#ff0020'; ctx.shadowColor = '#ff0020'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.roundRect(x-8, headY-4, 18, 5, 2); ctx.fill();
    ctx.fillStyle = ARMOR;
    ctx.beginPath(); ctx.arc(x, headY+10, 9, 0, Math.PI); ctx.fill();

    if (state === 'ko') this._drawKOStars(ctx, x, headY);
  }

  /** Reset fighter for a new round */
  reset(startX, groundY) {
    this.pos     = { x: startX, y: groundY };
    this.vel     = { x: 0, y: 0 };
    this.grounded = true;
    this.hp      = this.maxHp;
    this.energy  = 0;
    this.isKO    = false;
    this.attackFrame = 0;
    this.hitStunTimer = 0;
    this.specialCooldown = 0;
    this.shieldAlpha = 0;
    this.impactFlash = 0;
    this.jumpsLeft   = 2;
    this.doubleJumpFlash = 0;
    this.sm.force('idle');
  }
}
