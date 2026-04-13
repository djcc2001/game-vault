/**
 * bullet.js
 * Clase Bullet: proyectil disparado por un tanque.
 * - Movimiento lineal constante usando Physics.moveBullet()
 * - Rebota 1 vez contra paredes y obstáculos
 * - Desaparece tras el segundo impacto
 * - Renderiza con estela de partículas y glow neón
 */

class Bullet {
  /**
   * @param {number} x      - Posición inicial X
   * @param {number} y      - Posición inicial Y
   * @param {number} angle  - Ángulo de disparo en radianes
   * @param {string} owner  - 'player1' | 'player2' | 'cpu'
   * @param {string} color  - Color neón hexadecimal
   */
  constructor(x, y, angle, owner, color = '#00eeff') {
    this.x     = x;
    this.y     = y;
    this.angle = angle;
    this.owner = owner;
    this.color = color;

    this.speed      = Physics.BULLET_SPEED;
    this.radius     = 5;
    this.maxBounces = 1;
    this.bounces    = 0;
    this.alive      = true;

    // Estela: array de posiciones pasadas
    this.trail = [];
  }

  // ════════════════════════════════════════════════════════════
  //  UPDATE
  // ════════════════════════════════════════════════════════════

  /**
   * @param {number} dt
   * @param {Array}  obstacles  - [ { x, y, w, h } ]
   * @param {number} canvasW
   * @param {number} canvasH
   */
  update(dt, obstacles, canvasW, canvasH) {
    if (!this.alive) return;

    // Guardar punto de estela
    this.trail.push({ x: this.x, y: this.y, a: 1.0 });
    if (this.trail.length > 7) this.trail.shift();
    this.trail.forEach(p => { p.a = Math.max(0, p.a - 0.14); });

    // Mover
    const np  = Physics.moveBullet(this, dt);
    this.x    = np.x;
    this.y    = np.y;

    // ── Límites del canvas ──────────────────────────────────
    const bnd = Collision.circleVsBounds(this.x, this.y, this.radius, canvasW, canvasH);
    if (bnd.hit) {
      if (this.bounces >= this.maxBounces) { this.alive = false; return; }
      if (bnd.side === 'horizontal') {
        this.angle = Physics.bounceHorizontal(this.angle);
        this.y     = Math.max(this.radius + 1, Math.min(canvasH - this.radius - 1, this.y));
      } else {
        this.angle = Physics.bounceVertical(this.angle);
        this.x     = Math.max(this.radius + 1, Math.min(canvasW - this.radius - 1, this.x));
      }
      this.angle = Physics.normalizeAngle(this.angle);
      this.bounces++;
    }

    // ── Obstáculos ──────────────────────────────────────────
    const obs = Collision.bulletVsObstacles(this.x, this.y, this.radius, obstacles);
    if (obs.hit) {
      if (this.bounces >= this.maxBounces) { this.alive = false; return; }
      const dir = obs.direction;
      if (dir === 'horizontal') this.angle = Physics.bounceHorizontal(this.angle);
      else                       this.angle = Physics.bounceVertical(this.angle);
      this.angle = Physics.normalizeAngle(this.angle);
      this.bounces++;
    }
  }

  // ════════════════════════════════════════════════════════════
  //  DRAW
  // ════════════════════════════════════════════════════════════

  draw(ctx) {
    if (!this.alive) return;

    // Estela
    this.trail.forEach((p, i) => {
      if (p.a <= 0) return;
      const r = this.radius * (0.2 + 0.8 * (i / this.trail.length));
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = this._rgba(this.color, p.a * 0.45);
      ctx.fill();
    });

    // Halo exterior
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
    ctx.fillStyle = this._rgba(this.color, 0.18);
    ctx.fill();

    // Cuerpo neón
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Núcleo blanco
    ctx.beginPath();
    ctx.arc(this.x - 1, this.y - 1, this.radius * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  /**
   * Convierte un color hex + alpha en rgba()
   * @param {string} hex  - '#rrggbb'
   * @param {number} a    - 0-1
   */
  _rgba(hex, a) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }

  destroy() { this.alive = false; }
}
