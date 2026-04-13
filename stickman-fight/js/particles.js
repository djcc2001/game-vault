/**
 * particles.js
 * Stickman Fight Legends Pro
 *
 * Lightweight particle system for hit sparks, special effects,
 * shield aura, dust, etc. All drawn on the game canvas.
 */

class ParticleSystem {
  constructor() {
    /** @type {Particle[]} */
    this.pool = [];
  }

  /**
   * Emit a burst of particles.
   * @param {Object} opts
   */
  emit({
    x, y,
    count     = 10,
    color     = '#fff',
    colors    = null,       // array of colors (overrides color)
    speed     = 200,
    speedVar  = 100,
    angle     = 0,          // base angle in radians
    spread    = Math.PI * 2, // spread arc (full circle default)
    size      = 4,
    sizeVar   = 2,
    life      = 0.5,
    lifeVar   = 0.2,
    gravity   = 400,
    glow      = false,
    shape     = 'circle',   // 'circle' | 'star' | 'line'
  }) {
    for (let i = 0; i < count; i++) {
      const a = angle - spread / 2 + Math.random() * spread;
      const spd = speed + (Math.random() - 0.5) * speedVar * 2;
      const sz  = Math.max(1, size + (Math.random() - 0.5) * sizeVar * 2);
      const lf  = life + (Math.random() - 0.5) * lifeVar * 2;
      const col = colors ? colors[Math.floor(Math.random() * colors.length)] : color;

      this.pool.push({
        x, y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: sz,
        color: col,
        life: lf,
        maxLife: lf,
        gravity,
        glow,
        shape,
        alpha: 1,
      });
    }
  }

  /** Convenience: hit spark burst */
  hitSpark(x, y, color = '#ffaa00') {
    this.emit({
      x, y, count: 14, color,
      colors: [color, '#ffffff', '#ffee00'],
      speed: 280, speedVar: 120,
      size: 4, sizeVar: 3,
      life: 0.35, lifeVar: 0.15,
      gravity: 500, glow: true,
    });
  }

  /** Shield activation ring */
  shieldBurst(x, y, color = '#4cc9f0') {
    this.emit({
      x, y, count: 20, color,
      speed: 160, speedVar: 40,
      size: 3, sizeVar: 1,
      life: 0.4, lifeVar: 0.1,
      gravity: 0, glow: true,
    });
  }

  /** Special power release */
  specialBurst(x, y, colors) {
    this.emit({
      x, y, count: 24,
      colors: colors || ['#f72585', '#7209b7', '#4cc9f0'],
      speed: 350, speedVar: 150,
      size: 6, sizeVar: 4,
      life: 0.6, lifeVar: 0.2,
      gravity: 200, glow: true,
    });
  }

  /** Dust on landing */
  dust(x, y) {
    this.emit({
      x, y, count: 8,
      color: '#aaaaaa',
      speed: 80, speedVar: 40,
      angle: -Math.PI / 2,
      spread: Math.PI / 3,
      size: 5, sizeVar: 3,
      life: 0.35, lifeVar: 0.1,
      gravity: -50,
    });
  }

  /** KO explosion */
  koExplosion(x, y) {
    this.emit({
      x, y, count: 40,
      colors: ['#e63946', '#f4a261', '#ffd60a', '#ffffff'],
      speed: 500, speedVar: 200,
      size: 7, sizeVar: 5,
      life: 0.9, lifeVar: 0.3,
      gravity: 300, glow: true,
    });
  }

  /**
   * Update all living particles.
   * @param {number} dt
   */
  update(dt) {
    let i = this.pool.length;
    while (i--) {
      const p = this.pool[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.pool.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.alpha = p.life / p.maxLife;
    }
  }

  /**
   * Draw all particles onto the canvas context.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    for (const p of this.pool) {
      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur  = 12;
      }

      ctx.fillStyle = p.color;

      if (p.shape === 'star') {
        drawStar(ctx, p.x, p.y, 5, p.size, p.size * 0.4);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  clear() { this.pool = []; }
}

/** Utility: draw a star shape */
function drawStar(ctx, cx, cy, points, outerR, innerR) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI / points) * i - Math.PI / 2;
    if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    else          ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.closePath();
  ctx.fill();
}
