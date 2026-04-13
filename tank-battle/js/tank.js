/**
 * tank.js
 * Clase Tank: representa a un tanque (jugador o CPU).
 * Gestiona movimiento, disparo, salud, partículas y renderizado.
 */

class Tank {
  /**
   * @param {number} x @param {number} y - posición inicial
   * @param {number} angle - ángulo inicial en radianes
   * @param {string} type  - 'player1'|'player2'|'cpu'
   * @param {string} bodyColor  - color principal del tanque
   * @param {string} barrelColor
   * @param {string} bulletColor
   */
  constructor(x, y, angle, type, bodyColor, barrelColor, bulletColor) {
    this.x      = x;
    this.y      = y;
    this.angle  = angle;
    this.type   = type;

    // Colores
    this.bodyColor   = bodyColor   || '#00ff41';
    this.barrelColor = barrelColor || '#00cc33';
    this.bulletColor = bulletColor || '#00eeff';

    // Dimensiones (hitbox)
    this.width  = 26;
    this.height = 26;
    this.hitRadius = 13; // para colisión con balas

    // Estado
    this.alive    = true;
    this.health   = 1;  // muere con 1 impacto
    this.bullets  = []; // balas activas
    this.maxBullets = 3;

    // Cooldown de disparo (segundos)
    this.shootCooldown    = 0;
    this.shootCooldownMax = 0.5; // tiempo entre disparos

    // Motor de sonido
    this._engineStop = null;
    this._engineOn   = false;

    // Partículas de explosión
    this.particles = [];

    // Posición anterior (para resolución de colisiones)
    this.prevX = x;
    this.prevY = y;

    // Flash de impacto
    this.flashTimer = 0;

    // Último disparo (para no disparar continuamente con F/K)
    this._shootHeld = false;
  }

  /**
   * Actualiza el tanque cada frame
   * @param {number} dt
   * @param {Object} input - { forward, backward, left, right, shoot }
   * @param {Array}  obstacles
   * @param {number} canvasW @param {number} canvasH
   */
  update(dt, input, obstacles, canvasW, canvasH) {
    if (!this.alive) {
      this.updateParticles(dt);
      return;
    }

    // Guardar posición anterior
    this.prevX = this.x;
    this.prevY = this.y;

    // Cooldown disparo
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    // Flash timer
    if (this.flashTimer > 0) this.flashTimer -= dt;

    // ── Rotación ───────────────────────────────────────────────
    if (input.left)  this.angle = Physics.rotate(this, -1, Physics.TANK_ROT_SPEED, dt);
    if (input.right) this.angle = Physics.rotate(this,  1, Physics.TANK_ROT_SPEED, dt);

    // ── Movimiento ─────────────────────────────────────────────
    let moved = false;
    if (input.forward || input.backward) {
      const dir = input.forward ? 1 : -1;
      const newPos = Physics.moveForward(this, dir, Physics.TANK_SPEED, dt);
      this.x = newPos.x;
      this.y = newPos.y;
      moved = true;

      // Resolver colisiones con obstáculos
      if (Collision.tankVsObstacles(this.x, this.y, this.width, this.height, obstacles)) {
        const resolved = Collision.resolveTankObstacle(
          this.x, this.y, this.width, this.height,
          this.prevX, this.prevY, obstacles
        );
        this.x = resolved.x;
        this.y = resolved.y;
      }

      // Límites del canvas
      this.x = Math.max(this.width / 2, Math.min(canvasW - this.width / 2, this.x));
      this.y = Math.max(this.height / 2, Math.min(canvasH - this.height / 2, this.y));
    }

    // ── Disparo ────────────────────────────────────────────────
    if (input.shoot && !this._shootHeld) {
      this.tryShoot();
      this._shootHeld = true;
    }
    if (!input.shoot) this._shootHeld = false;

    // ── Actualizar balas ───────────────────────────────────────
    this.bullets = this.bullets.filter(b => b.alive);
    this.bullets.forEach(b => b.update(dt, obstacles, canvasW, canvasH));
  }

  /**
   * Intenta disparar una bala si hay cooldown y espacio
   */
  tryShoot() {
    if (!this.alive) return;
    if (this.shootCooldown > 0) return;
    if (this.bullets.filter(b => b.alive).length >= this.maxBullets) return;

    // Punta del cañón: avanza hw+8 píxeles en dirección del ángulo
    const barrelLen = this.width / 2 + 8;
    const bx = this.x + Math.cos(this.angle) * barrelLen;
    const by = this.y + Math.sin(this.angle) * barrelLen;

    const bullet = new Bullet(bx, by, this.angle, this.type, this.bulletColor);
    this.bullets.push(bullet);
    this.shootCooldown = this.shootCooldownMax;

    AudioManager.playShoot();
  }

  /**
   * Recibe daño; destruye el tanque
   */
  hit() {
    if (!this.alive) return;
    this.flashTimer = 0.15;
    this.alive = false;
    this.health = 0;
    if (this._engineStop) this._engineStop();
    this._engineOn = false;
    this._spawnParticles();
  }

  /**
   * Genera partículas de explosión
   */
  _spawnParticles() {
    const colors = [this.bodyColor, '#ff6600', '#ffe600', '#ff1744', '#ffffff'];
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 160;
      this.particles.push({
        x: this.x, y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.8 + Math.random() * 0.8,
        size: 2 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  /**
   * Actualiza partículas de explosión
   * @param {number} dt
   */
  updateParticles(dt) {
    this.particles = this.particles.filter(p => p.life > 0);
    this.particles.forEach(p => {
      p.x    += p.vx * dt;
      p.y    += p.vy * dt;
      p.vx   *= 0.92;
      p.vy   *= 0.92;
      p.life -= p.decay * dt;
    });
  }

  /**
   * Dibuja el tanque (pixel art procedural) en el canvas
   * El tanque apunta hacia +X local (angle=0 → derecha en canvas)
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    // Dibujar partículas siempre
    this._drawParticles(ctx);

    if (!this.alive) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const flash  = this.flashTimer > 0;
    const bodyC  = flash ? '#ffffff' : this.bodyColor;
    const barrelC = flash ? '#cccccc' : this.barrelColor;

    const hw = this.width  / 2;  // 16
    const hh = this.height / 2;  // 16

    // ── Sombra neón ────────────────────────────────────────────
    ctx.shadowColor = this.bodyColor;
    ctx.shadowBlur  = flash ? 20 : 10;

    // ── Orugas laterales (arriba y abajo en espacio local) ─────
    // El frente es +X; las orugas van a lo largo del eje X, bordeando en Y
    ctx.fillStyle = barrelC;
    ctx.fillRect(-hw, -hh,      this.width, 5);  // oruga superior
    ctx.fillRect(-hw,  hh - 5,  this.width, 5);  // oruga inferior

    // Dientes de oruga (detalles pixel)
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 5; i++) {
      const xx = -hw + 3 + i * 6;
      ctx.fillRect(xx, -hh + 1, 4, 3);
      ctx.fillRect(xx,  hh - 4, 4, 3);
    }

    // ── Cuerpo central ─────────────────────────────────────────
    ctx.fillStyle = bodyC;
    ctx.fillRect(-hw + 1, -hh + 5, this.width - 2, this.height - 10);

    // Detalles laterales del cuerpo
    ctx.fillStyle = barrelC;
    ctx.fillRect(-hw + 2, -hh + 7,  4, 4);   // esquina TL
    ctx.fillRect( hw - 6, -hh + 7,  4, 4);   // esquina TR
    ctx.fillRect(-hw + 2,  hh - 11, 4, 4);   // esquina BL
    ctx.fillRect( hw - 6,  hh - 11, 4, 4);   // esquina BR

    // ── Torreta (cuadrado centrado) ────────────────────────────
    ctx.fillStyle = bodyC;
    ctx.fillRect(-7, -7, 14, 14);

    ctx.strokeStyle = barrelC;
    ctx.lineWidth   = 2;
    ctx.strokeRect(-7, -7, 14, 14);

    // Punto central de la torreta
    ctx.fillStyle = barrelC;
    ctx.fillRect(-2, -2, 4, 4);

    // ── Cañón (apunta hacia +X = frente del tanque) ────────────
    // El cañón es un rectángulo fino que sobresale por el lado +X
    ctx.fillStyle = barrelC;
    ctx.fillRect(6, -3, hw + 4, 6);  // desde torreta hasta la punta

    // Punta del cañón (más oscura)
    ctx.fillStyle = '#000000';
    ctx.fillRect(hw + 4, -3, 4, 6);

    // Anillo de la base del cañón
    ctx.fillStyle = bodyC;
    ctx.fillRect(4, -2, 6, 4);

    ctx.shadowBlur = 0;
    ctx.restore();

    // Dibujar balas del tanque
    this.bullets.forEach(b => b.draw(ctx));
  }

  /**
   * Dibuja partículas de explosión
   * @param {CanvasRenderingContext2D} ctx
   */
  _drawParticles(ctx) {
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.fillRect(
        Math.round(p.x - p.size / 2),
        Math.round(p.y - p.size / 2),
        Math.round(p.size),
        Math.round(p.size)
      );
      ctx.restore();
    });
  }

  /**
   * Obtiene todas las balas vivas de este tanque
   * @returns {Bullet[]}
   */
  getActiveBullets() {
    return this.bullets.filter(b => b.alive);
  }

  /**
   * Reinicia el tanque a una posición/ángulo dado
   */
  reset(x, y, angle) {
    this.x      = x;
    this.y      = y;
    this.angle  = angle;
    this.alive  = true;
    this.health = 1;
    this.bullets = [];
    this.particles = [];
    this.shootCooldown = 0;
    this.flashTimer = 0;
    this._shootHeld = false;
    this._engineOn = false;
    this._engineStop = null;
  }
}
