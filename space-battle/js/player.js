/**
 * player.js
 * Player ship entity – handles movement, shooting, rendering, health.
 */

class Player {
  /**
   * @param {object} cfg
   * @param {number} cfg.x
   * @param {number} cfg.y
   * @param {1|2}    cfg.slot  - player slot
   * @param {number} [cfg.speed=280]
   * @param {number} [cfg.maxHealth=100]
   */
  constructor(cfg) {
    this.slot       = cfg.slot;
    this.x          = cfg.x;
    this.y          = cfg.y;
    this.width      = 48;
    this.height     = 48;
    this.speed      = cfg.speed ?? 280;
    this.maxHealth  = cfg.maxHealth ?? 100;
    this.health     = this.maxHealth;
    this.score      = 0;
    this.lives      = 1;
    this.active     = true;
    this.invincible = false;

    // Firing
    this._fireRate    = 0.18;   // seconds between shots
    this._fireCooldown = 0;
    this._specialCooldown = 0;
    this._specialRate = 2.5;

    // Visual
    this._engineFlare = 0;
    this._hitFlash    = 0;

    // Boundary (set by Game after canvas resize)
    this.bounds = { x: 0, y: 0, w: 1280, h: 720 };
  }

  /**
   * @param {number} dt
   * @param {{ dx:number, dy:number, fire:boolean, special:boolean }} input
   * @param {Projectile[]} projectiles
   */
  update(dt, input, projectiles) {
    if (!this.active) return;

    // Movement
    let moveX = input.dx;
    let moveY = input.dy;
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    if (len > 1) { moveX /= len; moveY /= len; }

    this.x += moveX * this.speed * dt;
    this.y += moveY * this.speed * dt;

    // Clamp to bounds
    this.x = Math.max(this.bounds.x + this.width / 2, Math.min(this.bounds.x + this.bounds.w - this.width / 2, this.x));
    this.y = Math.max(this.bounds.y + this.height / 2, Math.min(this.bounds.y + this.bounds.h - this.height / 2, this.y));

    this._engineFlare = len > 0.1 ? Math.min(1, this._engineFlare + dt * 10) : Math.max(0, this._engineFlare - dt * 8);

    // Cooldowns
    this._fireCooldown    = Math.max(0, this._fireCooldown    - dt);
    this._specialCooldown = Math.max(0, this._specialCooldown - dt);
    if (this.invincible) this._hitFlash = Math.max(0, this._hitFlash - dt);

    // Firing
    if (input.fire && this._fireCooldown <= 0) {
      this._spawnBullet(projectiles);
      this._fireCooldown = this._fireRate;
      AudioManager.playLaser(this.slot === 2 ? 660 : 880);
    }
    if (input.special && this._specialCooldown <= 0) {
      this._spawnSpecial(projectiles);
      this._specialCooldown = this._specialRate;
    }
  }

  _spawnBullet(projectiles) {
    projectiles.push(new Projectile({
      x: this.x,
      y: this.y - this.height / 2,
      vy: -700,
      damage: 10,
      owner: this.slot === 1 ? 'player1' : 'player2',
      type: 'bullet',
    }));
  }

  _spawnSpecial(projectiles) {
    // Triple spread missile
    [-1, 0, 1].forEach(offset => {
      projectiles.push(new Projectile({
        x: this.x + offset * 14,
        y: this.y - this.height / 2,
        vx: offset * 60,
        vy: -560,
        width: 8,
        height: 20,
        damage: 35,
        owner: this.slot === 1 ? 'player1' : 'player2',
        type: 'missile',
      }));
    });
    AudioManager.playLaser(this.slot === 2 ? 440 : 550);
  }

  /**
   * @param {number} dmg
   */
  takeDamage(dmg) {
    if (this.invincible || !this.active) return;
    this.health -= dmg;
    this._hitFlash = 0.8;
    this.invincible = true;
    setTimeout(() => { this.invincible = false; }, 1200);
    AudioManager.playExplosion(0.4);
    if (this.health <= 0) {
      this.lives--;
      if (this.lives <= 0) {
        this.lives = 0;
        this.health = 0;
        this.active = false;
      } else {
        this.health = this.maxHealth;
      }
    }
  }

  addScore(pts) { this.score += pts; }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    if (!this.active) return;
    ctx.save();

    // Hit flash – blink effect
    if (this._hitFlash > 0 && Math.sin(this._hitFlash * 40) < 0) {
      ctx.restore();
      return; // invisible during blink
    }

    ctx.translate(this.x, this.y);

    const isP2 = this.slot === 2;
    const bodyColor   = isP2 ? '#ff6b8a' : '#00d4ff';
    const accentColor = isP2 ? '#ff2255' : '#00ffee';
    const glowColor   = isP2 ? '#ff4d6d' : '#00d4ff';

    ctx.shadowBlur  = 18;
    ctx.shadowColor = glowColor;

    // Engine flames
    if (this._engineFlare > 0.1) {
      const flameH = 16 + this._engineFlare * 10;
      const grad = ctx.createLinearGradient(0, 8, 0, 8 + flameH);
      grad.addColorStop(0, accentColor);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.7 + Math.random() * 0.3;

      // Left engine
      ctx.beginPath();
      ctx.moveTo(-12, 10); ctx.lineTo(-8, 10); ctx.lineTo(-10, 10 + flameH); ctx.closePath(); ctx.fill();
      // Right engine
      ctx.beginPath();
      ctx.moveTo(8, 10); ctx.lineTo(12, 10); ctx.lineTo(10, 10 + flameH); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Ship hull
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(0, -22);        // nose
    ctx.lineTo(18, 12);        // right wing tip
    ctx.lineTo(10, 8);         // right wing inner
    ctx.lineTo(8, 18);         // right engine
    ctx.lineTo(-8, 18);        // left engine
    ctx.lineTo(-10, 8);        // left wing inner
    ctx.lineTo(-18, 12);       // left wing tip
    ctx.closePath();
    ctx.fill();

    // Cockpit
    const cockpitGrad = ctx.createRadialGradient(0, -6, 2, 0, -6, 10);
    cockpitGrad.addColorStop(0, '#ffffff');
    cockpitGrad.addColorStop(1, accentColor + '88');
    ctx.fillStyle = cockpitGrad;
    ctx.beginPath();
    ctx.ellipse(0, -6, 6, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing stripes
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(-2, -14, 4, 28);
    ctx.globalAlpha = 1;

    // Shield ring (invincible)
    if (this.invincible && this._hitFlash > 0) {
      ctx.strokeStyle = '#ffffff88';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  get aabb() {
    return {
      x: this.x - this.width / 2 + 6,
      y: this.y - this.height / 2 + 4,
      w: this.width - 12,
      h: this.height - 8,
    };
  }
}
