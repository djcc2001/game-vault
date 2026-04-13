/**
 * projectile.js
 * Stickman Fight Legends Pro
 *
 * Manages all active projectiles on the stage.
 * Each character fires a visually distinct projectile.
 */

class Projectile {
  /**
   * @param {Object} cfg
   */
  constructor({
    x, y,
    vx, vy = 0,
    ownerId,       // 'p1' or 'p2'
    type,          // 'energyBall' | 'lightning' | 'slash' | 'fireball' | 'wave'
    damage   = 20,
    knockback = true,
    color    = '#fff',
    colors   = null,
    radius   = 14,
    life     = 2.0, // seconds before self-destruction
    speed    = 600,
  }) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.ownerId  = ownerId;
    this.type     = type;
    this.damage   = damage;
    this.knockback = knockback;
    this.color    = color;
    this.colors   = colors;
    this.radius   = radius;
    this.life     = life;
    this.maxLife  = life;
    this.speed    = speed;
    this.dead     = false;
    this.age      = 0;        // seconds alive — used for animation
    this.hitbox   = { w: radius * 2, h: radius * 2 };
  }

  update(dt) {
    this.x   += this.vx * dt;
    this.y   += this.vy * dt;
    this.life -= dt;
    this.age  += dt;
    if (this.life <= 0) this.dead = true;
  }

  /** Draw this projectile using the provided canvas context */
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.life * 4);

    switch (this.type) {
      case 'energyBall': this._drawEnergyBall(ctx); break;
      case 'lightning':  this._drawLightning(ctx);  break;
      case 'slash':      this._drawSlash(ctx);       break;
      case 'fireball':   this._drawFireball(ctx);    break;
      case 'wave':       this._drawWave(ctx);        break;
      default:           this._drawEnergyBall(ctx);
    }

    ctx.restore();
  }

  _drawEnergyBall(ctx) {
    const pulse = 1 + Math.sin(this.age * 20) * 0.15;
    const r = this.radius * pulse;
    // outer glow
    const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r * 2.5);
    grd.addColorStop(0, this.color);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(this.x, this.y, r * 2.5, 0, Math.PI * 2); ctx.fill();
    // core
    ctx.shadowColor = this.color; ctx.shadowBlur = 20;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(this.x, this.y, r * 0.5, 0, Math.PI * 2); ctx.fill();
  }

  _drawLightning(ctx) {
    // Jagged line + ball
    ctx.strokeStyle = this.color; ctx.lineWidth = 4;
    ctx.shadowColor = this.color; ctx.shadowBlur = 16;
    ctx.beginPath();
    const segments = 6;
    const len = this.radius * 3;
    const dir = this.vx > 0 ? 1 : -1;
    let lx = this.x - dir * len;
    let ly = this.y;
    ctx.moveTo(lx, ly);
    for (let i = 1; i <= segments; i++) {
      const nx = lx + dir * (len / segments);
      const ny = ly + (Math.random() - 0.5) * 18;
      ctx.lineTo(nx, ny);
      lx = nx; ly = ny;
    }
    ctx.stroke();
    // ball at tip
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2); ctx.fill();
  }

  _drawSlash(ctx) {
    // Elongated arc shape
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = 5;
    ctx.shadowColor = this.color; ctx.shadowBlur = 20;
    const dir = this.vx > 0 ? 1 : -1;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.radius * 2.5, this.radius * 0.7, dir > 0 ? 0.2 : -0.2, 0, Math.PI * 2);
    ctx.stroke();
    // inner bright line
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x - dir * this.radius * 2, this.y);
    ctx.lineTo(this.x + dir * this.radius * 2, this.y);
    ctx.stroke();
  }

  _drawFireball(ctx) {
    const flicker = 1 + Math.sin(this.age * 30) * 0.2;
    const r = this.radius * flicker;
    // flames layers
    const cols = ['#ffd60a', '#f4a261', '#e63946', '#7b2d00'];
    cols.forEach((c, i) => {
      const fr = r * (1 - i * 0.2);
      const grd = ctx.createRadialGradient(this.x, this.y - fr * 0.3, 0, this.x, this.y, fr);
      grd.addColorStop(0, '#fff');
      grd.addColorStop(0.3, c);
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(this.x, this.y, fr, 0, Math.PI * 2); ctx.fill();
    });
    ctx.shadowColor = '#f4a261'; ctx.shadowBlur = 24;
  }

  _drawWave(ctx) {
    // Expanding ring + inner ripples
    ctx.shadowColor = this.color; ctx.shadowBlur = 18;
    const progress = 1 - this.life / this.maxLife;
    [1, 0.65, 0.3].forEach((scale, i) => {
      const alpha = (1 - i * 0.3) * (this.life / this.maxLife);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = this.color;
      ctx.lineWidth   = 3 - i;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.radius * scale * 1.8, this.radius * scale * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
}

/** Manages the pool of active projectiles */
class ProjectileManager {
  constructor() {
    /** @type {Projectile[]} */
    this.list = [];
  }

  /**
   * Fire a projectile.
   * @param {Fighter} shooter
   * @param {Object}  cfg   — character-specific config
   * @param {number}  canvasW
   */
  fire(shooter, cfg, canvasW) {
    const dir = shooter.facingRight ? 1 : -1;
    const px  = shooter.pos.x + dir * 30;
    const py  = shooter.pos.y - 60; // roughly chest height

    this.list.push(new Projectile({
      x: px, y: py,
      vx: dir * (cfg.speed || 600),
      ownerId: shooter.id,
      ...cfg,
    }));
  }

  /**
   * Update all projectiles; remove dead ones.
   * @param {number} dt
   * @param {ParticleSystem} particles
   */
  update(dt, particles) {
    let i = this.list.length;
    while (i--) {
      const p = this.list[i];
      p.update(dt);

      // trailing particles
      if (!p.dead && Math.random() < 0.4) {
        particles.emit({
          x: p.x - p.vx * dt * 0.5,
          y: p.y - p.vy * dt * 0.5,
          count: 1,
          color: p.color,
          speed: 30, speedVar: 20,
          size: p.radius * 0.4, sizeVar: 2,
          life: 0.2, lifeVar: 0.1,
          gravity: 50, glow: true,
        });
      }

      if (p.dead) this.list.splice(i, 1);
    }
  }

  /**
   * Draw all projectiles.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    for (const p of this.list) p.draw(ctx);
  }

  /** Remove all projectiles belonging to an owner */
  clearOwner(id) {
    this.list = this.list.filter(p => p.ownerId !== id);
  }

  clear() { this.list = []; }
}
