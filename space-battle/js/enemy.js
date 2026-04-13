/**
 * enemy.js
 * Enemy ship and Boss entities.
 */

class Enemy {
  /**
   * @param {object} cfg
   * @param {number} cfg.x
   * @param {number} cfg.y
   * @param {'basic'|'fast'|'heavy'|'diagonal'} [cfg.type='basic']
   * @param {number} [cfg.health]
   * @param {number} [cfg.speed]
   * @param {number} [cfg.pointValue]
   * @param {number} [cfg.level=1]
   */
  constructor(cfg) {
    this.x      = cfg.x;
    this.y      = cfg.y;
    this.type   = cfg.type ?? 'basic';
    this.level  = cfg.level ?? 1;
    this.active = true;
    this._age   = 0;
    this._shotCooldown = 1 + Math.random() * 2;

    const speedMult = 0.35 + (this.level - 1) * 0.1;
    const healthMult = 1 + (this.level - 1) * 0.3;

    switch (this.type) {
      case 'fast':
        this.width      = 32;
        this.height     = 32;
        this.health     = (cfg.health ?? 20) * healthMult;
        this.maxHealth  = this.health;
        this.speed      = (cfg.speed ?? 200) * speedMult;
        this.pointValue = cfg.pointValue ?? 200;
        this._fireRate  = 3;
        this._pattern   = 'zigzag';
        break;
      case 'heavy':
        this.width      = 52;
        this.height     = 52;
        this.health     = (cfg.health ?? 80) * healthMult;
        this.maxHealth  = this.health;
        this.speed      = (cfg.speed ?? 60) * speedMult;
        this.pointValue = cfg.pointValue ?? 350;
        this._fireRate  = 1.5;
        this._pattern   = 'straight';
        break;
      case 'diagonal':
        this.width      = 36;
        this.height     = 36;
        this.health     = (cfg.health ?? 30) * healthMult;
        this.maxHealth  = this.health;
        this.speed      = (cfg.speed ?? 140) * speedMult;
        this.pointValue = cfg.pointValue ?? 250;
        this._fireRate  = 2.5;
        this._pattern   = 'diagonal';
        this._dir       = Math.random() < 0.5 ? 1 : -1;
        break;
      default: // basic
        this.width      = 40;
        this.height     = 40;
        this.health     = (cfg.health ?? 40) * healthMult;
        this.maxHealth  = this.health;
        this.speed      = (cfg.speed ?? 90) * speedMult;
        this.pointValue = cfg.pointValue ?? 100;
        this._fireRate  = 2;
        this._pattern   = 'sine';
    }

    this._startX = this.x;
  }

  /**
   * @param {number} dt
   * @param {number} canvasW
   * @param {number} canvasH
   * @param {Projectile[]} projectiles
   */
  update(dt, canvasW, canvasH, projectiles) {
    if (!this.active) return;
    this._age += dt;
    this._shotCooldown -= dt;

    switch (this._pattern) {
      case 'sine':
        this.y += this.speed * dt;
        this.x = this._startX + Math.sin(this._age * 1.8) * 60;
        break;
      case 'zigzag':
        this.y += this.speed * 0.7 * dt;
        this.x += Math.sin(this._age * 4) * this.speed * dt;
        break;
      case 'diagonal':
        this.y += this.speed * 0.6 * dt;
        this.x += this._dir * this.speed * 0.8 * dt;
        if (this.x < 0 || this.x > canvasW) this._dir *= -1;
        break;
      case 'straight':
      default:
        this.y += this.speed * dt;
    }

    // Fire
    if (this._shotCooldown <= 0) {
      this._fire(projectiles);
      this._shotCooldown = this._fireRate / (1 + (this.level - 1) * 0.15);
    }

    // Off-screen below
    if (this.y > canvasH + this.height) this.active = false;
  }

  _fire(projectiles) {
    projectiles.push(new Projectile({
      x: this.x,
      y: this.y + this.height / 2,
      vy: 280 + this.level * 20,
      width: 6,
      height: 14,
      damage: 12,
      owner: 'enemy',
      type: 'bullet',
    }));
  }

  /**
   * @param {number} dmg
   */
  takeDamage(dmg) {
    this.health -= dmg;
    if (this.health <= 0) {
      this.health = 0;
      this.active = false;
      AudioManager.playExplosion(0.7);
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    switch (this.type) {
      case 'fast':    this._renderFast(ctx);     break;
      case 'heavy':   this._renderHeavy(ctx);    break;
      case 'diagonal':this._renderDiagonal(ctx); break;
      default:        this._renderBasic(ctx);
    }

    // Health bar (only when damaged)
    if (this.health < this.maxHealth) {
      const bw = this.width * 1.1;
      const pct = this.health / this.maxHealth;
      ctx.fillStyle = '#333';
      ctx.fillRect(-bw / 2, -this.height / 2 - 8, bw, 4);
      ctx.fillStyle = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f9c74f' : '#ff4d6d';
      ctx.fillRect(-bw / 2, -this.height / 2 - 8, bw * pct, 4);
    }

    ctx.restore();
  }

  _renderBasic(ctx) {
    ctx.shadowBlur  = 12;
    ctx.shadowColor = '#ff4d6d';
    ctx.fillStyle   = '#cc2244';
    // Body
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(16, -14);
    ctx.lineTo(8, -10);
    ctx.lineTo(0, -20);
    ctx.lineTo(-8, -10);
    ctx.lineTo(-16, -14);
    ctx.closePath();
    ctx.fill();
    // Cockpit
    ctx.fillStyle = '#ff8fa3';
    ctx.beginPath();
    ctx.ellipse(0, -2, 5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Engine glow
    ctx.fillStyle = '#ff004088';
    ctx.beginPath();
    ctx.arc(0, 18, 5 + Math.sin(this._age * 10) * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  _renderFast(ctx) {
    ctx.shadowBlur  = 14;
    ctx.shadowColor = '#ff8800';
    ctx.fillStyle   = '#ff6600';
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.lineTo(14, -6);
    ctx.lineTo(0, -14);
    ctx.lineTo(-14, -6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  _renderHeavy(ctx) {
    ctx.shadowBlur  = 18;
    ctx.shadowColor = '#9900cc';
    ctx.fillStyle   = '#660099';
    ctx.beginPath();
    ctx.roundRect(-22, -22, 44, 44, 6);
    ctx.fill();
    ctx.fillStyle = '#cc44ff';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    // Cannons
    ctx.fillStyle = '#440066';
    [-16, 16].forEach(ox => {
      ctx.fillRect(ox - 3, 14, 6, 14);
    });
  }

  _renderDiagonal(ctx) {
    ctx.shadowBlur  = 12;
    ctx.shadowColor = '#00ff88';
    ctx.fillStyle   = '#006633';
    ctx.save();
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.roundRect(-14, -14, 28, 28, 4);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  get aabb() {
    return {
      x: this.x - this.width / 2 + 4,
      y: this.y - this.height / 2 + 4,
      w: this.width - 8,
      h: this.height - 8,
    };
  }
}

/* ─────────────────────────────────────────
   BOSS ENTITY
───────────────────────────────────────── */
class Boss {
  /**
   * @param {object} cfg
   * @param {number} cfg.x
   * @param {number} cfg.y
   * @param {number} [cfg.level=5]
   */
  constructor(cfg) {
    this.x          = cfg.x;
    this.y          = cfg.y;
    this.width      = 120;
    this.height     = 100;
    this.level      = cfg.level ?? 5;
    this.maxHealth  = 1000 + (cfg.level - 1) * 300;
    this.health     = this.maxHealth;
    this.pointValue = 5000 + (cfg.level - 1) * 1000;
    this.active     = true;
    this._age       = 0;
    this._phase     = 0;
    this._shotTimer = 0;
    this._entryDone = false;
    this._targetY   = 110;
    this._speed     = 60 + (cfg.level - 1) * 15;
    this._dir       = 1;
    this._patternTimer = 0;
    this._currentPattern = 'spread';
  }

  update(dt, canvasW, canvasH, projectiles) {
    if (!this.active) return;
    this._age += dt;

    // Entry animation
    if (!this._entryDone) {
      this.y += 180 * dt;
      if (this.y >= this._targetY) {
        this.y = this._targetY;
        this._entryDone = true;
      }
      return;
    }

    // Horizontal patrol
    this.x += this._dir * this._speed * dt;
    if (this.x > canvasW - 80 || this.x < 80) {
      this._dir *= -1;
    }

    // Phase transitions
    const hpPct = this.health / this.maxHealth;
    if (hpPct < 0.33) this._phase = 2;
    else if (hpPct < 0.66) this._phase = 1;

    // Shooting patterns
    this._shotTimer -= dt;
    this._patternTimer -= dt;

    if (this._patternTimer <= 0) {
      const patterns = ['spread', 'aimed', 'spiral'];
      this._currentPattern = patterns[Math.floor(Math.random() * patterns.length)];
      this._patternTimer = 3 + Math.random() * 2;
    }

    const rateMultiplier = 1 + this._phase * 0.6;
    const baseRate = 0.8 / rateMultiplier;

    if (this._shotTimer <= 0) {
      this._fire(projectiles, canvasW);
      this._shotTimer = baseRate;
    }
  }

  _fire(projectiles, canvasW) {
    const speed = 250 + this._phase * 60 + this.level * 20;
    const damage = 15 + this._phase * 8 + this.level * 3;
    switch (this._currentPattern) {
      case 'spread': {
        const count = 5 + this._phase * 2 + this.level;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI / (count - 1)) * i;
          projectiles.push(new Projectile({
            x: this.x,
            y: this.y + 40,
            vx: Math.cos(angle + Math.PI * 0.5) * speed * 0.8,
            vy: Math.sin(angle + Math.PI * 0.5) * speed,
            width: 14, height: 14,
            damage: damage,
            owner: 'boss',
            type: 'boss_shot',
          }));
        }
        break;
      }
      case 'aimed': {
        const aimedCount = 3 + this._phase;
        const spread = 60;
        for (let i = 0; i < aimedCount; i++) {
          const offset = (i - (aimedCount - 1) / 2) * (spread / aimedCount);
          projectiles.push(new Projectile({
            x: this.x + offset,
            y: this.y + 40,
            vx: offset * 0.5,
            vy: speed,
            width: 12, height: 12,
            damage: damage + 5,
            owner: 'boss',
            type: 'boss_shot',
          }));
        }
        break;
      }
      case 'spiral': {
        const spiralCount = 8 + this._phase * 2;
        for (let i = 0; i < spiralCount; i++) {
          const angle = (Math.PI * 2 / spiralCount) * i + this._age * 2;
          projectiles.push(new Projectile({
            x: this.x,
            y: this.y + 20,
            vx: Math.cos(angle) * speed * 0.7,
            vy: Math.sin(angle) * speed * 0.7 + speed * 0.3,
            width: 10, height: 10,
            damage: damage - 3,
            owner: 'boss',
            type: 'boss_shot',
          }));
        }
        break;
      }
    }

    if (this._phase >= 2) {
      for (let i = -1; i <= 1; i += 2) {
        projectiles.push(new Projectile({
          x: this.x + i * 50,
          y: this.y + 30,
          vx: i * 120,
          vy: speed * 1.2,
          width: 8, height: 16,
          damage: damage * 0.8,
          owner: 'boss',
          type: 'boss_shot',
        }));
      }
    }
  }

  takeDamage(dmg) {
    this.health -= dmg;
    if (this.health <= 0) {
      this.health = 0;
      this.active = false;
      AudioManager.playExplosion(3);
    }
  }

  render(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    const t = this._age;
    const phase = this._phase;

    // Pulsating aura
    ctx.globalAlpha = 0.15 + Math.sin(t * 4) * 0.05;
    ctx.fillStyle   = phase === 2 ? '#ff0040' : phase === 1 ? '#aa00ff' : '#0044ff';
    ctx.beginPath();
    ctx.arc(0, 0, 80 + Math.sin(t * 3) * 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.shadowBlur  = 30;
    ctx.shadowColor = phase === 2 ? '#ff0040' : '#8800ff';

    // Hull
    ctx.fillStyle = phase === 2 ? '#550022' : '#220044';
    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.lineTo(55, -20);
    ctx.lineTo(60, 30);
    ctx.lineTo(30, 48);
    ctx.lineTo(-30, 48);
    ctx.lineTo(-60, 30);
    ctx.lineTo(-55, -20);
    ctx.closePath();
    ctx.fill();

    // Hull stripe
    ctx.fillStyle = phase === 2 ? '#ff0040' : '#aa00ff';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(-58, -4, 116, 8);
    ctx.globalAlpha = 1;

    // Center core
    const coreGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 22);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.4, phase === 2 ? '#ff4d6d' : '#aa44ff');
    coreGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 22 + Math.sin(t * 8) * 4, 0, Math.PI * 2);
    ctx.fill();

    // Rotating ring
    ctx.save();
    ctx.rotate(t * 1.5);
    ctx.strokeStyle = phase === 2 ? '#ff4d6d88' : '#aa44ff88';
    ctx.lineWidth   = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Weapon pods
    [-40, 40].forEach(ox => {
      ctx.fillStyle = '#440066';
      ctx.beginPath();
      ctx.roundRect(ox - 8, 20, 16, 20, 3);
      ctx.fill();
      ctx.fillStyle = '#ff4d6d';
      ctx.globalAlpha = 0.5 + Math.sin(t * 10 + ox) * 0.3;
      ctx.beginPath();
      ctx.arc(ox, 38, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    ctx.restore();
  }

  get aabb() {
    return {
      x: this.x - 52,
      y: this.y - 44,
      w: 104,
      h: 88,
    };
  }
}
