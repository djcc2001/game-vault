/**
 * projectile.js
 * Represents a single bullet or missile fired by player or enemy.
 */

class Projectile {
  /**
   * @param {object} cfg
   * @param {number} cfg.x
   * @param {number} cfg.y
   * @param {number} cfg.vx  - velocity x
   * @param {number} cfg.vy  - velocity y
   * @param {number} [cfg.width=6]
   * @param {number} [cfg.height=18]
   * @param {number} [cfg.damage=10]
   * @param {'player1'|'player2'|'enemy'|'boss'} cfg.owner
   * @param {'bullet'|'missile'|'boss_shot'} [cfg.type='bullet']
   */
  constructor(cfg) {
    this.x      = cfg.x;
    this.y      = cfg.y;
    this.vx     = cfg.vx ?? 0;
    this.vy     = cfg.vy;
    this.width  = cfg.width  ?? 6;
    this.height = cfg.height ?? 18;
    this.damage = cfg.damage ?? 10;
    this.owner  = cfg.owner;
    this.type   = cfg.type ?? 'bullet';
    this.active = true;
    this._age   = 0;
  }

  /**
   * @param {number} dt  - seconds since last frame
   * @param {number} canvasH
   * @param {number} canvasW
   */
  update(dt, canvasH, canvasW) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this._age += dt;
    // Deactivate when off-screen
    if (this.y + this.height < 0 || this.y > canvasH ||
        this.x + this.width < 0  || this.x > canvasW) {
      this.active = false;
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    ctx.save();
    if (this.type === 'missile') {
      this._renderMissile(ctx);
    } else if (this.type === 'boss_shot') {
      this._renderBossShot(ctx);
    } else {
      this._renderBullet(ctx);
    }
    ctx.restore();
  }

  _renderBullet(ctx) {
    const isEnemy = this.owner === 'enemy' || this.owner === 'boss';
    const color   = isEnemy ? '#ff4d6d' : (this.owner === 'player2' ? '#ff8fa3' : '#00d4ff');
    const glow    = isEnemy ? '#ff000088' : '#00d4ff88';

    ctx.shadowBlur  = 12;
    ctx.shadowColor = glow;
    ctx.fillStyle   = color;

    // Elongated capsule
    ctx.beginPath();
    ctx.roundRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height, this.width / 2);
    ctx.fill();

    // Core highlight
    ctx.fillStyle = '#ffffff88';
    ctx.fillRect(this.x - 1, this.y - this.height / 2 + 2, 2, this.height * 0.5);
  }

  _renderMissile(ctx) {
    const color = this.owner === 'player2' ? '#ff8fa3' : '#f9c74f';
    ctx.shadowBlur  = 16;
    ctx.shadowColor = color;

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(this.x - 4, this.y - 12, 8, 24, 3);
    ctx.fill();

    // Exhaust flame
    ctx.fillStyle = '#ff4d6d';
    ctx.beginPath();
    ctx.moveTo(this.x - 3, this.y + 12);
    ctx.lineTo(this.x,     this.y + 20 + Math.sin(this._age * 30) * 4);
    ctx.lineTo(this.x + 3, this.y + 12);
    ctx.closePath();
    ctx.fill();
  }

  _renderBossShot(ctx) {
    const t = this._age;
    const r = this.width / 2;
    ctx.shadowBlur  = 20;
    ctx.shadowColor = '#ff0040';

    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#ff4d6d');
    grad.addColorStop(1, '#ff004088');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.arc(this.x, this.y, r + Math.sin(t * 10) * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Axis-aligned bounding box for collision */
  get aabb() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      w: this.width,
      h: this.height,
    };
  }
}
