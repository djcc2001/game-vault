/**
 * aiController.js
 * AI brain that drives a Player ship in VS-CPU mode.
 * Implements a simple decision tree: evade bullets, chase enemies, fire.
 */
class AIController {
  /**
   * @param {Player} player  - the AI-controlled ship
   */
  constructor(player) {
    this._player     = player;
    this._thinkTimer = 0;
    this._targetX    = player.x;
    this._targetY    = player.y + 80;
    this._thinkRate  = 0.08;  // re-evaluate every 80ms
    this._evadeDir   = 0;
    this._fireCooldown = 0;
    this._fireRate = 0.18;
  }

  /**
   * Returns a synthetic input object identical to what InputHandler provides.
   * @param {number} dt
   * @param {Enemy[]} enemies
   * @param {Boss|null} boss
   * @param {Projectile[]} projectiles
   * @param {number} canvasW
   * @param {number} canvasH
   * @returns {{ dx:number, dy:number, fire:boolean, special:boolean }}
   */
  getInput(dt, enemies, boss, projectiles, canvasW, canvasH) {
    this._thinkTimer -= dt;

    if (this._thinkTimer <= 0) {
      this._thinkTimer = this._thinkRate;
      this._think(enemies, boss, projectiles, canvasW, canvasH);
    }

    const p    = this._player;
    const dx   = this._targetX - p.x;
    const dy   = this._targetY - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const norm  = dist > 1 ? dist : 1;
    const inDx  = dist > 10 ? dx / norm : 0;
    const inDy  = dist > 10 ? dy / norm : 0;

    this._fireCooldown = Math.max(0, this._fireCooldown - dt);

    // Fire whenever an enemy is roughly above
    const hasTarget = (enemies.length > 0 || boss !== null);
    const canFire = hasTarget && this._fireCooldown <= 0;

    if (canFire) {
      this._fireCooldown = this._fireRate;
    }

    // Rarely use special
    const useSpecial = hasTarget && Math.random() < 0.005;

    return { dx: inDx, dy: inDy, fire: canFire, special: useSpecial };
  }

  _think(enemies, boss, projectiles, canvasW, canvasH) {
    const p = this._player;

    // 1. Find nearest threat (bullet aimed at AI side of screen)
    const dangerBullet = projectiles
      .filter(b => b.owner !== (p.slot === 1 ? 'player1' : 'player2') &&
                   b.owner !== 'enemy' && // only worry about enemy/boss bullets
                   Math.abs(b.x - p.x) < 60 && b.y < p.y && b.vy > 0)
      .sort((a, b2) => Math.abs(a.x - p.x) - Math.abs(b2.x - p.x))[0];

    if (dangerBullet) {
      // Dodge sideways
      this._evadeDir = dangerBullet.x < p.x ? 1 : -1;
      this._targetX  = p.x + this._evadeDir * 80;
      this._targetY  = p.y - 30;
      return;
    }

    // 2. Target nearest enemy
    const allTargets = boss ? [boss, ...enemies] : enemies;
    if (allTargets.length === 0) {
      // Hover at safe position
      this._targetX = canvasW / 2;
      this._targetY = canvasH * 0.75;
      return;
    }

    const nearest = allTargets.reduce((best, e) => {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      return d < Math.hypot(best.x - p.x, best.y - p.y) ? e : best;
    });

    // Align x with target, stay at 70% screen height
    this._targetX = nearest.x + (Math.random() - 0.5) * 20;
    this._targetY = canvasH * 0.72;

    // Keep within bounds
    this._targetX = Math.max(50, Math.min(canvasW - 50, this._targetX));
  }
}
