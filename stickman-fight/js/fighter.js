/**
 * fighter.js
 * Stickman Fight Legends Pro - TUNED EDITION
 *
 * Enhanced with combos, dash, counter attacks, and fluid animations.
 */

const CHARACTERS = {
  shadow: {
    name:        'Shadow',
    color:       '#9b5de5',
    glowColor:   '#9b5de5',
    speed:       1.3,
    power:       0.9,
    defense:     0.9,
    reach:       65,
    maxHp:       180,
    maxEnergy:   100,
    special: {
      type:  'slash',
      color: '#9b5de5',
      colors: ['#9b5de5','#c77dff','#ffffff'],
      damage: 20,
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
    maxHp:       200,
    maxEnergy:   100,
    special: {
      type:  'fireball',
      color: '#f4a261',
      colors: ['#f4a261','#e63946','#ffd60a'],
      damage: 25,
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
    maxHp:       190,
    maxEnergy:   100,
    special: {
      type:  'lightning',
      color: '#4cc9f0',
      colors: ['#4cc9f0','#7209b7','#ffffff'],
      damage: 22,
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
    maxHp:       170,
    maxEnergy:   100,
    special: {
      type:  'energyBall',
      color: '#00f5d4',
      colors: ['#00f5d4','#7209b7','#4cc9f0'],
      damage: 18,
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
    maxHp:       250,
    maxEnergy:   100,
    special: {
      type:  'wave',
      color: '#e63946',
      colors: ['#e63946','#f4a261','#ffd60a'],
      damage: 30,
      speed:  400,
      life:   1.8,
      radius: 22,
    },
    description: 'Lento pero demoledor. Especialidad: Onda Expansiva.',
    stats: [10,3,10,4],
  },
};

const CHARACTER_KEYS = Object.keys(CHARACTERS);

class Fighter {
  constructor(id, charKey, startX, groundY, facingRight = true) {
    this.id           = id;
    this.charKey      = charKey;
    this.stats        = { ...CHARACTERS[charKey] };

    this.pos     = { x: startX, y: groundY };
    this.vel     = { x: 0, y: 0 };
    this.groundY = groundY;
    this.grounded = true;
    this.facingRight = facingRight;

    this.width  = 40;
    this.height = 100;

    this.hp        = this.stats.maxHp;
    this.energy    = 0;
    this.maxHp     = this.stats.maxHp;
    this.maxEnergy = this.stats.maxEnergy;

    this.sm = createFighterSM();

    this.attackFrame  = 0;
    this.attackDur    = 0.28;
    this.kickDur      = 0.35;
    this.currentMove  = 'punch';
    this.hitConnectedThisSwing = false;
    this.attackChainWindow = 0;
    this.pendingChain = null;

    this.hitStunTimer = 0;

    this.specialCooldown = 0;
    this.SPECIAL_CD      = 3.0;

    this.isKO = false;

    this.jumpsLeft   = 2;
    this.doubleJumpFlash = 0;

    this.shieldAlpha    = 0;
    this.impactFlash    = 0;
    this.shakeTimer     = 0;

    this.animAngle = 0;
    this.jumpSquish = 1;

    this.energyRegenTimer = 0;

    this.comboCount = 0;
    this.comboTimer = 0;
    this.maxComboCount = 0;
    this.COMBO_WINDOW = 1.2;

    this.dashCooldown = 0;
    this.DASH_COOLDOWN = 0.8;
    this.dashDuration = 0;
    this.DASH_DURATION = 0.15;
    this.isDashing = false;
    this.dashDir = 1;

    this.counterWindow = 0;
    this.COUNTER_WINDOW = 0.3;
    this.counterActive = false;
    this.isCountering = false;
    this.counterFrame = 0;

    this.hitFreezeTimer = 0;
    this.attackTrail = [];
    this.maxTrailLength = 6;

    this.airComboCount = 0;
    this.isInCombo = false;
    this.comboHitThisSwing = false;

    this._prevState = 'idle';
  }

  walkLeft(dt) {
    if (this.sm.is('hit', 'ko', 'attack', 'kick', 'defend', 'special', 'dash', 'counter')) return;
    const spd = Physics.WALK_SPEED * this.stats.speed;
    this.vel.x = -spd;
    this.facingRight = false;
    if (this.grounded) this.sm.transition('run');
  }

  walkRight(dt) {
    if (this.sm.is('hit', 'ko', 'attack', 'kick', 'defend', 'special', 'dash', 'counter')) return;
    const spd = Physics.WALK_SPEED * this.stats.speed;
    this.vel.x = spd;
    this.facingRight = true;
    if (this.grounded) this.sm.transition('run');
  }

  jump() {
    if (this.sm.is('hit', 'ko', 'defend', 'dash', 'counter')) return;

    const isDoubleJump = !this.grounded && this.jumpsLeft > 0;
    const isFirstJump  = this.grounded && this.jumpsLeft > 0;

    if (!isFirstJump && !isDoubleJump) return;

    const power = isDoubleJump ? Physics.JUMP_VELOCITY * 0.82 : Physics.JUMP_VELOCITY;
    this.vel.y    = power;
    this.grounded = false;
    this.jumpsLeft--;

    this.sm.force('jump');
    AudioManager.play('jump');

    if (isDoubleJump) {
      this.doubleJumpFlash = 0.18;
    }
  }

  dash() {
    if (this.sm.is('hit', 'ko', 'attack', 'kick', 'defend', 'special', 'dash', 'counter')) return;
    if (this.dashCooldown > 0) return;

    this.dashCooldown = this.DASH_COOLDOWN;
    this.dashDuration = this.DASH_DURATION;
    this.isDashing = true;
    this.dashDir = this.facingRight ? 1 : -1;
    this.sm.force('dash');
    AudioManager.play('dash');

    this.attackTrail = [];
  }

  startDefend() {
    if (this.sm.is('attack', 'special', 'ko', 'hit', 'dash', 'counter')) return;
    if (!this.grounded) return;
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
    if (!this.sm.is('idle', 'run', 'jump', 'fall', 'attack', 'kick')) return;

    if (this.attackChainWindow > 0 && this.pendingChain === 'punch') {
      this.sm.force('attack');
      this.attackFrame = 0;
      this.currentMove = 'punch2';
      this.hitConnectedThisSwing = false;
      this.pendingChain = null;
      return;
    }

    this.sm.force('attack');
    this.attackFrame = 0;
    this.currentMove = 'punch';
    this.hitConnectedThisSwing = false;
    this.comboHitThisSwing = false;
    this.pendingChain = null;
  }

  kick() {
    if (!this.sm.is('idle', 'run', 'jump', 'fall', 'attack', 'kick')) return;

    if (this.attackChainWindow > 0 && this.pendingChain === 'kick') {
      this.sm.force('kick');
      this.attackFrame = 0;
      this.currentMove = 'kick2';
      this.hitConnectedThisSwing = false;
      this.pendingChain = null;
      return;
    }

    this.sm.force('kick');
    this.attackFrame = 0;
    this.currentMove = 'kick';
    this.hitConnectedThisSwing = false;
    this.comboHitThisSwing = false;
    this.pendingChain = null;
  }

  _addComboHit() {
    this.comboCount++;
    this.comboTimer = this.COMBO_WINDOW;
    this.airComboCount = this.grounded ? 0 : this.airComboCount + 1;
    this.isInCombo = true;
    if (this.comboCount > this.maxComboCount) {
      this.maxComboCount = this.comboCount;
    }
  }

  tryCounter() {
    if (this.counterWindow > 0 && !this.isCountering) {
      this.isCountering = true;
      this.counterFrame = 0;
      this.sm.force('counter');
      this.counterWindow = 0;
      AudioManager.play('counter');
      return true;
    }
    return false;
  }

  useSpecial(projectileManager) {
    if (this.energy < this.maxEnergy) return;
    if (this.specialCooldown > 0) return;
    if (!this.sm.is('idle', 'run', 'jump', 'fall')) return;

    this.energy = 0;
    this.specialCooldown = this.SPECIAL_CD;
    this.sm.force('special');

    const cfg = { ...this.stats.special };
    projectileManager.fire(this, cfg);

    AudioManager.play('special');
    this._addComboHit();
  }

  applyHit(dmg, attacker, doKnockback, heavy = false) {
    if (this.sm.is('ko')) return;

    if (this.isCountering && !heavy) {
      this._onSuccessfulCounter(attacker);
      return;
    }

    this.hp -= dmg;
    this.energy = Math.min(this.maxEnergy, this.energy + dmg * 0.8);
    this.impactFlash = 0.18;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.isInCombo = false;
    this.pendingChain = null;
    this.attackChainWindow = 0;

    if (doKnockback) {
      const dir = attacker
        ? (this.pos.x >= attacker.pos.x ? 1 : -1)
        : (this.facingRight ? -1 : 1);
      const kb = Physics.knockback(dir, heavy);
      this.vel.x = kb.x;
      this.vel.y = kb.y;
      this.grounded = false;
      this.jumpsLeft = 0;
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this._goKO();
      return;
    }

    this.sm.force('hit');
    this.hitStunTimer = heavy ? 0.45 : 0.25;
    AudioManager.play(heavy ? 'heavyHit' : 'hit');
  }

  _onSuccessfulCounter(attacker) {
    this.counterWindow = 0;
    this.isCountering = false;
    this.counterFrame = 0;
    this.comboCount += 3;
    this.comboTimer = this.COMBO_WINDOW;
    this.isInCombo = true;
    this.sm.force('idle');

    if (attacker) {
      const dir = this.pos.x >= attacker.pos.x ? 1 : -1;
      attacker.applyHit(attacker.stats.power * 18, this, true, true);
    }
    AudioManager.play('counter');
  }

  _goKO() {
    this.hp = 0;
    this.vel.x = (this.facingRight ? -1 : 1) * 300;
    this.vel.y = -400;
    this.isKO = true;
    this.sm.force('ko');
    AudioManager.play('ko');
  }

  update(dt, stageW, particles) {
    if (this.sm.is('ko')) {
      Physics.applyGravity(this.vel, dt);
      Physics.integrate(this.pos, this.vel, dt);
      const grounded = Physics.resolveGround(this.pos, this.vel, this.groundY);
      if (grounded) this.vel.x *= 0.7;
      Physics.clampToStage(this.pos, this.width * 0.5, stageW);
      return;
    }

    if (this.hitFreezeTimer > 0) {
      this.hitFreezeTimer -= dt;
      return;
    }

    if (this.hitStunTimer > 0) {
      this.hitStunTimer -= dt;
      if (this.hitStunTimer <= 0) {
        this.sm.force('idle');
      }
    }

    if (this.sm.is('dash')) {
      this.dashDuration -= dt;
      if (this.dashDuration <= 0) {
        this.isDashing = false;
        this.sm.force('idle');
      } else {
        this.vel.x = this.dashDir * Physics.WALK_SPEED * 4;
        this.vel.y *= 0.5;
      }
    }

    if (this.sm.is('counter')) {
      this.counterFrame += dt / 0.25;
      if (this.counterFrame >= 1) {
        this.isCountering = false;
        this.counterFrame = 0;
        this.sm.force('idle');
      }
    }

    if (this.sm.is('attack')) {
      this.attackFrame += dt / this.attackDur;
      this.attackChainWindow = this.attackFrame > 0.4 ? 0.2 : 0;
      
      if (this.attackFrame >= 1) {
        this.attackFrame = 0;
        this.hitConnectedThisSwing = false;
        this.comboHitThisSwing = false;
        this.pendingChain = 'punch';
        this.sm.force('idle');
        this.attackChainWindow = 0.2;
      }
    }

    if (this.sm.is('kick')) {
      this.attackFrame += dt / this.kickDur;
      this.attackChainWindow = this.attackFrame > 0.4 ? 0.2 : 0;
      
      if (this.attackFrame >= 1) {
        this.attackFrame = 0;
        this.hitConnectedThisSwing = false;
        this.comboHitThisSwing = false;
        this.pendingChain = 'kick';
        this.sm.force('idle');
        this.attackChainWindow = 0.2;
      }
    }

    if (this.sm.is('special')) {
      this.attackFrame += dt / 0.35;
      if (this.attackFrame >= 1) {
        this.attackFrame = 0;
        this.hitConnectedThisSwing = false;
        this.comboHitThisSwing = false;
        this.sm.force('idle');
      }
    }

    if (this.attackChainWindow > 0) {
      this.attackChainWindow -= dt;
    }

    if (this.specialCooldown > 0) {
      this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    }

    if (this.dashCooldown > 0) {
      this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
        this.isInCombo = false;
        this.airComboCount = 0;
      }
    }

    this.counterWindow = Math.max(0, this.counterWindow - dt);

    this.energyRegenTimer += dt;
    if (this.energyRegenTimer >= 0.5) {
      this.energyRegenTimer = 0;
      const wasMax = this.energy >= this.maxEnergy;
      this.energy = Math.min(this.maxEnergy, this.energy + 2);
      if (!wasMax && this.energy >= this.maxEnergy) AudioManager.play('energyFull');
    }

    if (!this.isDashing && !this.sm.is('counter')) {
      Physics.applyGravity(this.vel, dt);
    }
    Physics.applyFriction(this.vel, this.grounded && !this.isDashing);
    Physics.integrate(this.pos, this.vel, dt);

    const wasGrounded = this.grounded;
    this.grounded = Physics.resolveGround(this.pos, this.vel, this.groundY);
    Physics.clampToStage(this.pos, this.width * 0.5, stageW);

    if (!wasGrounded && this.grounded) {
      this.jumpSquish = 0.7;
      this.jumpsLeft  = 2;
      particles.dust(this.pos.x, this.pos.y);
      AudioManager.play('land');
      
      if (this.airComboCount >= 3 && this.isInCombo) {
        particles.airComboBurst(this.pos.x, this.pos.y - 30, this.stats.color);
      }
      this.airComboCount = 0;
    }
    this.jumpSquish += (1 - this.jumpSquish) * 8 * dt;

    if (this.doubleJumpFlash > 0.15) {
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

    if (this.grounded && !this.sm.is('attack', 'kick', 'defend', 'special', 'hit', 'ko', 'dash', 'counter')) {
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

    if (this.sm.is('run')) this.animAngle += dt * 12;

    this.impactFlash = Math.max(0, this.impactFlash - dt * 5);
    if (this.sm.is('defend')) {
      this.shieldAlpha = Math.min(1, this.shieldAlpha + dt * 8);
    } else if (this.shieldAlpha > 0) {
      this.shieldAlpha = Math.max(0, this.shieldAlpha - dt * 5);
    }

    this._prevState = this.sm.getState();
  }

  draw(ctx, preview = false) {
    const { x, y } = this.pos;
    const state = this.sm.getState();

    ctx.save();

    ctx.translate(x, y);
    ctx.scale(
      this.jumpSquish < 1 ? this.jumpSquish : 1,
      this.jumpSquish < 1 ? 1 / this.jumpSquish : 1
    );
    ctx.translate(-x, -y);

    ctx.save();
    const dir = this.facingRight ? 1 : -1;
    ctx.translate(x, 0);
    ctx.scale(dir, 1);
    ctx.translate(-x, 0);

    switch (this.charKey) {
      case 'shadow':  this._drawShadow(ctx, x, y, state);  break;
      case 'blaze':   this._drawBlaze(ctx, x, y, state);   break;
      case 'thunder': this._drawThunder(ctx, x, y, state); break;
      case 'phantom': this._drawPhantom(ctx, x, y, state); break;
      case 'titan':   this._drawTitan(ctx, x, y, state);   break;
      default:        this._drawShadow(ctx, x, y, state);
    }

    ctx.restore();

    if (this.sm.is('counter') && this.counterFrame > 0.2 && this.counterFrame < 0.8) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(x, y - 50, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.shieldAlpha > 0.05) {
      ctx.save();
      ctx.globalAlpha = this.shieldAlpha * 0.45;
      ctx.strokeStyle = '#4cc9f0';
      ctx.lineWidth = 5;
      ctx.shadowColor = '#4cc9f0';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(x, y - this.height * 0.5, this.width * 1.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = this.shieldAlpha * 0.12;
      ctx.fillStyle = '#4cc9f0';
      ctx.fill();
      ctx.restore();
    }

    if (this.doubleJumpFlash > 0) {
      ctx.save();
      ctx.globalAlpha = this.doubleJumpFlash * 3;
      ctx.strokeStyle = this.stats.color;
      ctx.lineWidth = 4;
      ctx.shadowColor = this.stats.color;
      ctx.shadowBlur = 20;
      const ringR = this.width * 1.6 * (1.2 - this.doubleJumpFlash * 5);
      ctx.beginPath();
      ctx.ellipse(x, y - 30, Math.max(8, ringR), Math.max(4, ringR * 0.4), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.isDashing) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = this.stats.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = this.stats.color;
      ctx.shadowBlur = 15;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x - this.dashDir * (i + 1) * 15, y - 80);
        ctx.lineTo(x - this.dashDir * (i + 1) * 15, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  _getLimbAngles(state) {
    const t    = this.attackFrame;
    const walk = Math.sin(this.animAngle);

    let rUA = 0.3;
    let rLA = -0.75;
    let lUA = 0.5;
    let lLA = 0.25;

    let fUL = Math.PI / 2;
    let fLL = Math.PI / 2 + 0.10;
    let bUL = Math.PI / 2;
    let bLL = Math.PI / 2 + 0.10;

    if (state === 'run') {
      const sw = walk * 0.55;
      fUL = Math.PI / 2 - sw * 1.1;
      fLL = fUL + 0.25 + Math.abs(sw) * 0.45;
      bUL = Math.PI / 2 + sw * 1.1;
      bLL = bUL - 0.25 - Math.abs(sw) * 0.45;
      rUA = Math.PI / 2 + 0.25 - sw * 1.0;
      rLA = rUA + 0.35;
      lUA = Math.PI / 2 - 0.15 + sw * 1.0;
      lLA = lUA - 0.35;
    }

    if (state === 'jump') {
      fUL = Math.PI / 2 - 0.5; fLL = fUL + 0.6;
      bUL = Math.PI / 2 + 0.4; bLL = bUL - 0.5;
      rUA = Math.PI / 2 - 0.7; rLA = rUA + 0.5;
      lUA = Math.PI / 2 + 0.5; lLA = lUA - 0.5;
    }

    if (state === 'fall') {
      fUL = Math.PI / 2 - 0.2; fLL = fUL + 0.4;
      bUL = Math.PI / 2 + 0.2; bLL = bUL - 0.4;
      rUA = Math.PI / 2 - 0.3; rLA = rUA + 0.4;
      lUA = Math.PI / 2 + 0.3; lLA = lUA - 0.4;
    }

    if (state === 'dash') {
      fUL = Math.PI / 2 - 0.3; fLL = fUL + 0.2;
      bUL = Math.PI / 2 + 0.3; bLL = bUL - 0.2;
      rUA = -0.5; rLA = -0.3;
      lUA = Math.PI + 0.5; lLA = Math.PI + 0.3;
    }

    if (state === 'attack') {
      const punchPhase = Math.sin(t * Math.PI);
      rUA = -0.3 + punchPhase * 0.5;
      rLA = rUA - 0.1 + punchPhase * 0.2;
      lUA = Math.PI / 2 - 0.4;
      lLA = lUA - 0.3;
    }

    if (state === 'kick') {
      rUA = 0.3; rLA = -0.75;
      lUA = 0.5; lLA = 0.25;
      const kickPhase = Math.sin(t * Math.PI);
      fUL = Math.PI / 2 - 0.8 - kickPhase * 0.3;
      fLL = fUL + 0.3 + kickPhase * 0.2;
      bUL = Math.PI / 2 + 0.3;
      bLL = bUL + 0.2;
    }

    if (state === 'defend') {
      rUA = 0.8; rLA = -15;
      lUA = 1.4; lLA = -1;
    }

    if (state === 'special') {
      rUA = Math.PI / 2 - 0.9 - t * 1.3; rLA = rUA + 0.4;
      lUA = Math.PI / 2 + 0.7 + t * 0.9; lLA = lUA - 0.4;
    }

    if (state === 'counter') {
      const cf = this.counterFrame;
      rUA = Math.PI / 2 - 0.6 + cf * 0.8; rLA = rUA + 0.3;
      lUA = -0.3 - cf * 0.5; lLA = lUA - 0.2;
      fUL = Math.PI / 2 + 0.2; fLL = fUL + 0.3;
      bUL = Math.PI / 2 - 0.2; bLL = bUL + 0.2;
    }

    if (state === 'hit') {
      rUA = Math.PI / 2 + 0.7; rLA = rUA + 0.8;
      lUA = Math.PI / 2 + 0.5; lLA = lUA + 0.7;
    }

    if (state === 'ko') {
      rUA = Math.PI / 2 + 1.0; rLA = rUA + 1.0;
      lUA = Math.PI / 2 + 0.8; lLA = lUA + 0.9;
      fUL = Math.PI / 2 + 0.5; fLL = fUL + 0.6;
      bUL = Math.PI / 2 - 0.3; bLL = bUL + 0.4;
    }

    return { rUA, rLA, lUA, lLA, fUL, fLL, bUL, bLL };
  }

  _drawLimb(ctx, sx, sy, upperLen, lowerLen, upperAngle, lowerAngle) {
    const jx = sx + Math.cos(upperAngle) * upperLen;
    const jy = sy + Math.sin(upperAngle) * upperLen;
    const ex = jx + Math.cos(lowerAngle) * lowerLen;
    const ey = jy + Math.sin(lowerAngle) * lowerLen;

    const lw = ctx.lineWidth;

    ctx.beginPath();
    ctx.lineWidth = lw;
    ctx.moveTo(sx, sy);
    ctx.lineTo(jx, jy);
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = lw + 1.5;
    ctx.arc(jx, jy, lw * 0.55, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = lw;
    ctx.moveTo(jx, jy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.lineWidth = lw;
    return { jx, jy, ex, ey };
  }

  _roundRect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill)   { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  _drawKOStars(ctx, x, headY) {
    const t = Date.now() * 0.003;
    for (let i = 0; i < 3; i++) {
      const a = t + (i * Math.PI * 2) / 3;
      const sx = x + Math.cos(a) * 22;
      const sy = headY - 18 + Math.sin(a * 2) * 5;
      ctx.save();
      ctx.fillStyle = '#ffd60a';
      ctx.shadowColor = '#ffd60a';
      ctx.shadowBlur = 10;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', sx, sy);
      ctx.restore();
    }
  }

  _drawLegsGeneric(ctx, x, hipY,
                   fUL, fLL, bUL, bLL,
                   upperLen, lowerLen, lineW,
                   colorBack, colorFront,
                   bootColorBack, bootColorFront, bootRx, bootRy, state) {

    ctx.lineWidth = lineW;
    ctx.strokeStyle = colorBack;
    const bLeg = this._drawLimb(ctx, x - 3, hipY, upperLen, lowerLen, bUL, bLL);
    ctx.fillStyle = bootColorBack;
    ctx.beginPath(); ctx.ellipse(bLeg.ex - 2, bLeg.ey + 3, bootRx, bootRy, 0, 0, Math.PI * 2); ctx.fill();

    ctx.lineWidth = lineW + 2;
    ctx.strokeStyle = colorFront;
    const fLeg = this._drawLimb(ctx, x + 3, hipY, upperLen, lowerLen, fUL, fLL);
    ctx.fillStyle = bootColorFront;
    ctx.beginPath(); ctx.ellipse(fLeg.ex + 2, fLeg.ey + 3, bootRx + 1, bootRy, 0, 0, Math.PI * 2); ctx.fill();

    if (state === 'kick' && this.attackFrame > 0.25 && this.attackFrame < 0.75) {
      ctx.save();
      ctx.shadowColor = colorFront;
      ctx.shadowBlur = 28;
      ctx.fillStyle = colorFront;
      ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.arc(fLeg.ex, fLeg.ey, bootRx * 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    return { bLeg, fLeg };
  }

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

    this._drawLegsGeneric(ctx, x, hipY, fUL, fLL, bUL, bLL,
      24, 22, 9, DARK, C, '#2a0a5a', '#3d0d80', 12, 5, state);

    ctx.shadowBlur = 0;
    ctx.fillStyle = DARK;
    this._roundRect(ctx, x-12, chestY, 24, hipY-chestY+8, 5, DARK);
    ctx.fillStyle = C;
    ctx.fillRect(x-3, chestY+4, 6, hipY-chestY);

    ctx.lineWidth = 7; ctx.strokeStyle = DARK;
    this._drawLimb(ctx, x-5, chestY+4, 18, 16, lUA, lLA);

    ctx.lineWidth = 8; ctx.strokeStyle = C;
    const fArm = this._drawLimb(ctx, x+5, chestY+4, 18, 16, rUA, rLA);
    ctx.fillStyle = SKIN;
    ctx.beginPath(); ctx.arc(fArm.ex, fArm.ey, 5, 0, Math.PI*2); ctx.fill();

    ctx.shadowColor = '#9b5de5'; ctx.shadowBlur = 14;
    ctx.fillStyle = DARK;
    ctx.beginPath(); ctx.arc(x, headY, 13, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = SKIN;
    ctx.beginPath(); ctx.arc(x+3, headY, 9, -0.6, 0.6); ctx.fill();
    ctx.fillStyle = '#c77dff';
    ctx.beginPath(); ctx.arc(x+6, headY-1, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = C; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x-10, neckY+2);
    ctx.quadraticCurveTo(x+15, neckY+8, x+10, chestY+2);
    ctx.stroke();

    if (state === 'ko') this._drawKOStars(ctx, x, headY);
  }

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

    this._drawLegsGeneric(ctx, x, hipY, fUL, fLL, bUL, bLL,
      26, 24, 12, '#7b2d00', C, '#5a1a00', '#7b2d00', 14, 6, state);

    ctx.fillStyle = RED;
    this._roundRect(ctx, x-16, chestY, 32, hipY-chestY+10, 6, RED);
    ctx.fillStyle = '#3a0a00';
    ctx.fillRect(x-16, hipY-4, 32, 8);
    ctx.fillStyle = '#ffd60a';
    this._roundRect(ctx, x-5, hipY-2, 10, 7, 2, '#ffd60a');

    ctx.lineWidth = 10; ctx.strokeStyle = SKIN;
    this._drawLimb(ctx, x-10, chestY+6, 20, 17, lUA, lLA);

    ctx.lineWidth = 11; ctx.strokeStyle = SKIN;
    const fArm = this._drawLimb(ctx, x+10, chestY+6, 20, 17, rUA, rLA);
    ctx.fillStyle = RED;
    ctx.beginPath(); ctx.arc(fArm.ex, fArm.ey, 7, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#3a0000'; ctx.lineWidth = 2; ctx.stroke();

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

    this._drawLegsGeneric(ctx, x, hipY, fUL, fLL, bUL, bLL,
      25, 23, 10, '#1a4a6a', C, '#0d2a40', '#1a4a6a', 12, 5, state);

    ctx.fillStyle = C;
    this._roundRect(ctx, x-13, chestY, 26, hipY-chestY+8, 5, C);
    ctx.fillStyle = '#ffd60a'; ctx.shadowColor = '#ffd60a'; ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(x+2, chestY+4); ctx.lineTo(x-4, chestY+14);
    ctx.lineTo(x+1, chestY+14); ctx.lineTo(x-3, chestY+24);
    ctx.lineTo(x+6, chestY+12); ctx.lineTo(x+1, chestY+12);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 16;

    ctx.lineWidth = 8; ctx.strokeStyle = WHITE;
    this._drawLimb(ctx, x-8, chestY+4, 18, 16, lUA, lLA);

    ctx.lineWidth = 9; ctx.strokeStyle = WHITE;
    const fArm = this._drawLimb(ctx, x+8, chestY+4, 18, 16, rUA, rLA);
    ctx.fillStyle = C;
    ctx.beginPath(); ctx.arc(fArm.ex, fArm.ey, 6, 0, Math.PI*2); ctx.fill();
    if ((state === 'attack' || state === 'counter') && this.attackFrame > 0.3) {
      ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 2;
      ctx.shadowColor = '#ffd60a'; ctx.shadowBlur = 12;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + this.attackFrame * 10;
        ctx.beginPath(); ctx.moveTo(fArm.ex, fArm.ey);
        ctx.lineTo(fArm.ex + Math.cos(a)*10, fArm.ey + Math.sin(a)*10); ctx.stroke();
      }
      ctx.shadowBlur = 16;
    }

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

    this._drawLegsGeneric(ctx, x, hipY, fUL, fLL, bUL, bLL,
      24, 22, 8, '#004a40', C, '#002a22', '#004a40', 12, 4, state);

    ctx.fillStyle = C;
    this._roundRect(ctx, x-11, chestY, 22, hipY-chestY+8, 4, C);

    ctx.lineWidth = 7; ctx.strokeStyle = CLOAK;
    this._drawLimb(ctx, x-6, chestY+4, 17, 15, lUA, lLA);

    ctx.lineWidth = 8; ctx.strokeStyle = SKIN;
    const fArm = this._drawLimb(ctx, x+6, chestY+4, 17, 15, rUA, rLA);
    ctx.fillStyle = C;
    ctx.beginPath(); ctx.arc(fArm.ex, fArm.ey, 5, 0, Math.PI*2); ctx.fill();

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
    ctx.fillStyle = C; ctx.shadowColor = C; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(x+3, headY-1, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+8, headY-1, 3, 0, Math.PI*2); ctx.fill();
    if (state === 'run') {
      ctx.globalAlpha = 0.25; ctx.fillStyle = C;
      ctx.beginPath(); ctx.arc(x-8, headY, 14, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (state === 'ko') this._drawKOStars(ctx, x, headY);
  }

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

    this._drawLegsGeneric(ctx, x, hipY, fUL, fLL, bUL, bLL,
      28, 26, 15, ARMOR, C, '#1a1a22', '#1a1a22', 16, 7, state);

    const kpX = x + 3 + Math.cos(fUL) * 28;
    const kpY = hipY + Math.sin(fUL) * 28;
    ctx.fillStyle = C;
    ctx.beginPath(); ctx.arc(kpX, kpY, 8, 0, Math.PI*2); ctx.fill();

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

    ctx.lineWidth = 12; ctx.strokeStyle = ARMOR;
    this._drawLimb(ctx, x-14, chestY+6, 22, 18, lUA, lLA);

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
    this.comboCount = 0;
    this.comboTimer = 0;
    this.airComboCount = 0;
    this.isInCombo = false;
    this.dashCooldown = 0;
    this.isDashing = false;
    this.counterWindow = 0;
    this.isCountering = false;
    this.attackChainWindow = 0;
    this.pendingChain = null;
    this.attackTrail = [];
    this.sm.force('idle');
  }
}
